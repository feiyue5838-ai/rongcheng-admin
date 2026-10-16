<template>
  <div>
    <div class="page-header">
      <h2>结算管理</h2>
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
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 'pending'" link type="primary" size="small" @click="confirm(row)">确认</el-button>
            <el-button v-if="row.status === 'confirmed'" link type="success" size="small" @click="openPayDialog(row)">付款</el-button>
            <el-button v-if="row.status === 'paid'" link type="warning" size="small" @click="openInvoiceDialog(row)">进项票</el-button>
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
    <!-- 进项票登记/核销（P1：网点开票 → 平台付款后凭票登记核销，入成本凭证） -->
    <el-dialog v-model="invoiceDialogVisible" title="进项票登记/核销" width="560px">
      <template v-if="invoiceTarget">
        <el-descriptions :column="2" border size="small" style="margin-bottom: 16px">
          <el-descriptions-item label="付款单号">{{ invoiceTarget.settlementNo }}</el-descriptions-item>
          <el-descriptions-item label="供应商">{{ invoiceTarget.supplierName }}</el-descriptions-item>
          <el-descriptions-item label="付款金额">¥{{ Number(invoiceTarget.payableAmount || 0).toFixed(2) }}</el-descriptions-item>
          <el-descriptions-item label="核销状态">
            <el-tag v-if="invoicePayout?.invoiceStatus === 'verified'" size="small" type="success">已核销</el-tag>
            <el-tag v-else size="small" type="info">未登记</el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <!-- 已核销：只读展示 -->
        <el-form v-if="invoicePayout?.invoiceStatus === 'verified'" label-width="110px">
          <el-form-item label="发票号码">
            <span style="font-weight: 600">{{ invoicePayout.invoiceNo }}</span>
          </el-form-item>
          <el-form-item label="发票金额">¥{{ Number(invoicePayout.invoiceAmount || 0).toFixed(2) }}</el-form-item>
          <el-form-item label="税率">{{ invoicePayout.invoiceTaxRate != null ? invoicePayout.invoiceTaxRate + '%' : '-' }}</el-form-item>
          <el-form-item label="税额">¥{{ Number(invoicePayout.invoiceTaxAmount || 0).toFixed(2) }}</el-form-item>
          <el-form-item label="核销时间">{{ fmtTime(invoicePayout.invoiceVerifiedAt) }}</el-form-item>
        </el-form>

        <!-- 未登记：录入表单 -->
        <el-form v-else label-width="110px">
          <el-form-item label="发票号码" required>
            <el-input v-model="invoiceForm.invoiceNo" placeholder="网点开具的进项发票号" />
          </el-form-item>
          <el-form-item label="发票金额">
            <el-input-number v-model="invoiceForm.invoiceAmount" :min="0" :precision="2" :controls="false" style="width: 200px" />
            <span style="color: #909399; font-size: 12px; margin-left: 8px">留空默认按付款金额</span>
          </el-form-item>
          <el-form-item label="税率 %">
            <el-input-number v-model="invoiceForm.invoiceTaxRate" :min="0" :max="100" :precision="2" :controls="false" style="width: 200px" />
            <span style="color: #909399; font-size: 12px; margin-left: 8px">小规模默认 1%（可配置）</span>
          </el-form-item>
        </el-form>
      </template>
      <template #footer>
        <el-button @click="invoiceDialogVisible = false">关闭</el-button>
        <el-button v-if="invoicePayout?.invoiceStatus === 'verified'" type="danger" plain :loading="invoiceSaving" @click="clearInvoice">撤销核销</el-button>
        <el-button v-else type="primary" :loading="invoiceSaving" @click="saveInvoice">登记核销</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { v2GetSettlements, v2GenerateSettlement, v2ConfirmSettlement, v2PaySettlement, v2GetSettlementDetail, v2GetSuppliers, v2RegisterPayoutInvoice, v2ClearPayoutInvoice } from '@/api'
import type { SettlementV2 } from '@/api/types'
import { toArray, toPaged, unwrapV2 } from '@/api/unwrap'

type TagType = 'primary' | 'success' | 'warning' | 'info' | 'danger'

interface SupplierSummary {
  id: string
  name: string
  status: number
}

interface SettlementItem {
  orderNo: string
  module: string
  orderAmount: number
  supplierCost?: number
  refundDeduct: number
  payableAmount: number
}

interface SettlementPayout {
  payoutNo: string
  amount: number
  invoiceStatus?: string
  invoiceNo?: string
  invoiceAmount?: number
  invoiceTaxRate?: number
  invoiceTaxAmount?: number
  invoiceVerifiedAt?: string
}

interface SettlementDetail {
  items?: SettlementItem[]
  payout?: SettlementPayout
}

const loading = ref(false)
const submitting = ref(false)
const list = ref<SettlementV2[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const suppliers = ref<SupplierSummary[]>([])
const generateDialogVisible = ref(false)
const itemsDialogVisible = ref(false)
const currentItems = ref<SettlementItem[]>([])
const generateForm = reactive({ supplierId: '', periodStart: '', periodEnd: '' })

// 付款（留痕）
const payDialogVisible = ref(false)
const paying = ref(false)
const payTarget = ref<SettlementV2 | null>(null)
const payForm = reactive({ paymentMethod: 'bank_transfer', transactionNo: '', bankName: '', bankAccountName: '', bankAccountNo: '' })

// 进项票登记/核销（P1）
const invoiceDialogVisible = ref(false)
const invoiceSaving = ref(false)
const invoiceTarget = ref<SettlementV2 | null>(null)
const invoicePayout = ref<SettlementPayout | null>(null)
const invoiceForm = reactive({ invoiceNo: '', invoiceAmount: undefined as number | undefined, invoiceTaxRate: 1 })

const statusMap: Record<string, string> = { pending: '待确认', confirmed: '已确认', paid: '已付款', cancelled: '已取消' }
const statusTags: Record<string, TagType> = { pending: 'warning', confirmed: 'primary', paid: 'success', cancelled: 'danger' }
const statusTag = (status: string): TagType => statusTags[status] || 'info'
// 后端时间为「本地时间 + Z 后缀」格式（非真实 UTC），直接截取字符串避免 new Date 解析产生 +8h 偏移
const fmtDate = (d?: string) => (d ? d.slice(0, 10) : '-')
const fmtTime = (d?: string) => (d ? d.slice(0, 16).replace('T', ' ') : '-')

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

async function load() {
  loading.value = true
  try {
    const response = unwrapV2<unknown>(await v2GetSettlements({ page: page.value, pageSize: pageSize.value }))
    const result = toPaged<SettlementV2>(response)
    list.value = result.list
    total.value = result.total
  } catch (error: unknown) {
    ElMessage.error(errorMessage(error, '加载失败'))
  } finally {
    loading.value = false
  }
}
async function loadSuppliers() {
  try {
    const response = unwrapV2<unknown>(await v2GetSuppliers({ pageSize: 100 }))
    // 仅展示启用中的供应商（后端 status=1），停用供应商选了会被拒绝生成
    suppliers.value = toArray<SupplierSummary>(response).filter(supplier => supplier.status === 1)
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
  } catch (error: unknown) {
    ElMessage.error(errorMessage(error, '生成失败'))
  } finally {
    submitting.value = false
  }
}
async function confirm(row: SettlementV2) {
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
  } catch (error: unknown) {
    ElMessage.error(errorMessage(error, '确认失败'))
  }
}
function openPayDialog(row: SettlementV2) {
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
  const target = payTarget.value
  if (!target) {
    ElMessage.warning('结算单不存在，请刷新重试')
    return
  }
  paying.value = true
  try {
    await v2PaySettlement(target.id, {
      paymentMethod: payForm.paymentMethod,
      transactionNo: payForm.transactionNo || undefined,
      bankName: payForm.bankName || undefined,
      bankAccountName: payForm.bankAccountName || undefined,
      bankAccountNo: payForm.bankAccountNo || undefined,
    })
    ElMessage.success('已付款')
    payDialogVisible.value = false
    load()
  } catch (error: unknown) {
    ElMessage.error(errorMessage(error, '付款失败'))
  } finally {
    paying.value = false
  }
}
async function showItems(row: SettlementV2) {
  try {
    const detail = unwrapV2<SettlementDetail>(await v2GetSettlementDetail(row.id))
    currentItems.value = detail.items || []
    itemsDialogVisible.value = true
  } catch (error: unknown) {
    ElMessage.error(errorMessage(error, '加载明细失败'))
  }
}
async function openInvoiceDialog(row: SettlementV2) {
  invoiceTarget.value = row
  invoicePayout.value = null
  invoiceForm.invoiceNo = ''
  invoiceForm.invoiceAmount = Number(row.payableAmount || 0)
  invoiceForm.invoiceTaxRate = 1
  invoiceDialogVisible.value = true
  try {
    // 拉详情取付款单（含进项字段）
    const detail = unwrapV2<SettlementDetail>(await v2GetSettlementDetail(row.id))
    if (detail.payout) {
      invoicePayout.value = detail.payout
      if (detail.payout.invoiceStatus !== 'verified') {
        invoiceForm.invoiceAmount = Number(detail.payout.amount ?? row.payableAmount ?? 0)
      }
    }
  } catch (error: unknown) {
    ElMessage.error(errorMessage(error, '加载付款单失败'))
  }
}
async function saveInvoice() {
  const payoutNo = invoicePayout.value?.payoutNo
  if (!payoutNo) {
    ElMessage.warning('付款单不存在，请刷新重试')
    return
  }
  if (!invoiceForm.invoiceNo?.trim()) {
    ElMessage.warning('请填写发票号码')
    return
  }
  invoiceSaving.value = true
  try {
    await v2RegisterPayoutInvoice(payoutNo, {
      invoiceNo: invoiceForm.invoiceNo.trim(),
      invoiceAmount: invoiceForm.invoiceAmount != null && invoiceForm.invoiceAmount > 0 ? invoiceForm.invoiceAmount : undefined,
      invoiceTaxRate: invoiceForm.invoiceTaxRate != null ? invoiceForm.invoiceTaxRate : undefined,
    })
    ElMessage.success('进项票已登记核销')
    invoiceDialogVisible.value = false
    load()
  } catch (error: unknown) {
    ElMessage.error(errorMessage(error, '登记失败'))
  } finally {
    invoiceSaving.value = false
  }
}
async function clearInvoice() {
  try {
    await ElMessageBox.confirm('撤销进项票核销？核销信息将被清空。', '撤销核销', { type: 'warning' })
  } catch {
    return
  }
  const payoutNo = invoicePayout.value?.payoutNo
  if (!payoutNo) {
    ElMessage.warning('付款单不存在，请刷新重试')
    return
  }
  invoiceSaving.value = true
  try {
    await v2ClearPayoutInvoice(payoutNo)
    ElMessage.success('已撤销')
    invoiceDialogVisible.value = false
    load()
  } catch (error: unknown) {
    ElMessage.error(errorMessage(error, '撤销失败'))
  } finally {
    invoiceSaving.value = false
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
