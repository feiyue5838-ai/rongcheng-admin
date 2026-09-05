<template>
  <div>
    <div class="page-header">
      <h2>V2.0 结算管理</h2>
      <div>
        <el-button type="primary" @click="openGenerate">生成结算单</el-button>
        <el-button @click="load">刷新</el-button>
      </div>
    </div>

    <el-card shadow="never">
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="settlementNo" label="结算单号" width="200" show-overflow-tooltip />
        <el-table-column prop="supplierName" label="供应商" width="160" show-overflow-tooltip />
        <el-table-column label="结算周期" width="220">
          <template #default="{ row }">{{ fmtDate(row.periodStart) }} ~ {{ fmtDate(row.periodEnd) }}</template>
        </el-table-column>
        <el-table-column prop="totalAmount" label="总金额" width="110" align="right">
          <template #default="{ row }">¥{{ Number(row.totalAmount || 0).toFixed(2) }}</template>
        </el-table-column><el-table-column prop="totalAmount" label="订单总额" width="110" align="right">
          <template #default="{ row }">¥{{ Number(row.totalAmount || 0).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="应付网点" width="120" align="right">
          <template #default="{ row }">
            <span style="font-weight: 600">￥{{ Number(row.payableAmount ?? row.totalAmount ?? 0).toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="orderCount" label="订单数" width="90" align="center" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="statusTag(row.status)">{{ statusMap[row.status] || row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="170">
          <template #default="{ row }">{{ fmtTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 'pending'" link type="primary" size="small" @click="confirm(row)">确认</el-button>
            <el-button v-if="row.status === 'confirmed'" link type="success" size="small" @click="openPayDialog(row)">付款</el-button>
            <el-button link size="small" @click="showItems(row)">明细</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        style="margin-top: 16px; justify-content: flex-end"
        @change="load"
      />
    </el-card>

    <!-- 生成结算单 -->
    <el-dialog v-model="generateDialogVisible" title="生成结算单" width="480px">
      <el-form label-width="90px">
        <el-form-item label="供应商" required>
          <el-select v-model="generateForm.supplierId" filterable placeholder="选择供应商" style="width: 100%">
            <el-option v-for="s in suppliers" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="周期开始" required>
          <el-date-picker v-model="generateForm.periodStart" type="date" value-format="YYYY-MM-DD" placeholder="开始日期" style="width: 100%" />
        </el-form-item>
        <el-form-item label="周期结束" required>
          <el-date-picker v-model="generateForm.periodEnd" type="date" value-format="YYYY-MM-DD" placeholder="结束日期" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="generateDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="doGenerate">生成</el-button>
      </template>
    </el-dialog>

    <!-- 结算明细（后端明细 DTO 无 status 字段，仅展示订单/金额） -->
    <el-dialog v-model="itemsDialogVisible" title="结算明细" width="700px">
      <el-table :data="currentItems" stripe size="small">
        <el-table-column prop="orderNo" label="订单号" width="180" />
        <el-table-column prop="module" label="类型" width="80" />
        <el-table-column label="订单金额" width="110" align="right">
          <template #default="{ row }">¥{{ Number(row.orderAmount || 0).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="供应商成本" width="110" align="right">
          <template #default="{ row }">
            <span :style="{ color: Number(row.supplierCost ?? row.orderAmount ?? 0) < Number(row.orderAmount ?? 0) ? '#e6a23c' : 'inherit' }">￥{{ Number(row.supplierCost ?? row.orderAmount ?? 0).toFixed(2) }}</span>
          </template>
        </el-table-column><el-table-column label="退款扣减" width="110" align="right">
          <template #default="{ row }">¥{{ Number(row.refundDeduct || 0).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="应付金额" align="right">
          <template #default="{ row }">¥{{ Number(row.payableAmount || 0).toFixed(2) }}</template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <!-- 确认付款（留痕） -->
    <el-dialog v-model="payDialogVisible" title="确认付款" width="500px">
      <el-form :model="payForm" label-width="90px">
        <el-form-item label="结算单号"><span>{{ payTarget ? payTarget.settlementNo : '' }}</span></el-form-item>
        <el-form-item label="供应商"><span>{{ payTarget ? payTarget.supplierName : '' }}</span></el-form-item>
        <el-form-item label="应付金额">
          <span style="font-size: 16px; font-weight: 600; color: #e6a23c">¥{{ Number(payTarget ? payTarget.payableAmount : 0).toFixed(2) }}</span>
          <span style="font-size: 12px; color: #909399; margin-left: 8px">付款前按最新退款记录自动重算</span>
        </el-form-item>
        <el-form-item label="付款方式" required>
          <el-select v-model="payForm.paymentMethod" style="width: 100%">
            <el-option label="银行转账" value="bank_transfer" />
            <el-option label="微信" value="wechat" />
            <el-option label="支付宝" value="alipay" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="交易流水号">
          <el-input v-model="payForm.transactionNo" placeholder="选填：付款交易流水号" />
        </el-form-item>
        <el-form-item label="开户行">
          <el-input v-model="payForm.bankName" placeholder="选填" />
        </el-form-item>
        <el-form-item label="银行户名">
          <el-input v-model="payForm.bankAccountName" placeholder="选填" />
        </el-form-item>
        <el-form-item label="银行账号">
          <el-input v-model="payForm.bankAccountNo" placeholder="选填" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="payDialogVisible = false">取消</el-button>
        <el-button type="warning" :loading="paying" @click="doPay">确认付款</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { v2GetSettlements, v2GenerateSettlement, v2ConfirmSettlement, v2PaySettlement, v2GetSettlementDetail, v2GetSuppliers } from '@/api'

const loading = ref(false)
const submitting = ref(false)
const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const suppliers = ref<any[]>([])
const generateDialogVisible = ref(false)
const itemsDialogVisible = ref(false)
const currentItems = ref<any[]>([])
const generateForm = reactive({ supplierId: '', periodStart: '', periodEnd: '' })

// 付款（留痕）
const payDialogVisible = ref(false)
const paying = ref(false)
const payTarget = ref<any>(null)
const payForm = reactive({ paymentMethod: 'bank_transfer', transactionNo: '', bankName: '', bankAccountName: '', bankAccountNo: '' })

const statusMap: Record<string, string> = { pending: '待确认', confirmed: '已确认', paid: '已付款', cancelled: '已取消' }
const statusTag = (s: string) => ({ pending: 'warning', confirmed: 'primary', paid: 'success', cancelled: 'danger' } as any)[s] || 'info'
// 后端时间为「本地时间 + Z 后缀」格式（非真实 UTC），直接截取字符串避免 new Date 解析产生 +8h 偏移
const fmtDate = (d?: string) => (d ? d.slice(0, 10) : '-')
const fmtTime = (d?: string) => (d ? d.slice(0, 16).replace('T', ' ') : '-')

async function load() {
  loading.value = true
  try {
    const res: any = await v2GetSettlements({ page: page.value, pageSize: pageSize.value })
    list.value = res.list || []
    total.value = res.total || 0
  } catch (e: any) {
    ElMessage.error(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}
async function loadSuppliers() {
  try {
    const res: any = await v2GetSuppliers({ pageSize: 100 })
    // 仅展示启用中的供应商（后端 status=1），停用供应商选了会被拒绝生成
    suppliers.value = (res.list || []).filter((s: any) => s.status === 1)
  } catch { /* 忽略 */ }
}
function openGenerate() {
  generateForm.supplierId = ''
  generateForm.periodStart = ''
  generateForm.periodEnd = ''
  generateDialogVisible.value = true
}
async function doGenerate() {
  if (!generateForm.supplierId || !generateForm.periodStart || !generateForm.periodEnd) {
    ElMessage.warning('请填写完整'); return
  }
  submitting.value = true
  try {
    await v2GenerateSettlement({
      supplierId: generateForm.supplierId,
      periodStart: generateForm.periodStart,
      periodEnd: generateForm.periodEnd,
    })
    ElMessage.success('结算单已生成')
    generateDialogVisible.value = false
    load()
  } catch (e: any) {
    ElMessage.error(e?.message || '生成失败')
  } finally {
    submitting.value = false
  }
}
async function confirm(row: any) {
  try {
    await ElMessageBox.confirm(
      `确认结算单 ${row.settlementNo}？\n供应商：${row.supplierName}\n结算周期：${fmtDate(row.periodStart)} ~ ${fmtDate(row.periodEnd)}\n总金额：¥${Number(row.totalAmount || 0).toFixed(2)}`,
      '确认结算',
      { type: 'warning' },
    )
  } catch {
    return
  }
  try {
    await v2ConfirmSettlement(row.id)
    ElMessage.success('已确认')
    load()
  } catch (e: any) {
    ElMessage.error(e?.message || '确认失败')
  }
}
function openPayDialog(row: any) {
  payTarget.value = row
  payForm.paymentMethod = 'bank_transfer'
  payForm.transactionNo = ''
  payForm.bankName = ''
  payForm.bankAccountName = ''
  payForm.bankAccountNo = ''
  payDialogVisible.value = true
}
async function doPay() {
  if (!payForm.paymentMethod) {
    ElMessage.warning('请选择付款方式')
    return
  }
  paying.value = true
  try {
    await v2PaySettlement(payTarget.value.id, {
      paymentMethod: payForm.paymentMethod,
      transactionNo: payForm.transactionNo || undefined,
      bankName: payForm.bankName || undefined,
      bankAccountName: payForm.bankAccountName || undefined,
      bankAccountNo: payForm.bankAccountNo || undefined,
    })
    ElMessage.success('已付款')
    payDialogVisible.value = false
    load()
  } catch (e: any) {
    ElMessage.error(e?.message || '付款失败')
  } finally {
    paying.value = false
  }
}
async function showItems(row: any) {
  try {
    const d: any = await v2GetSettlementDetail(row.id)
    currentItems.value = d.items || []
    itemsDialogVisible.value = true
  } catch (e: any) {
    ElMessage.error(e?.message || '加载明细失败')
  }
}
onMounted(() => {
  load()
  loadSuppliers()
})
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
</style>
