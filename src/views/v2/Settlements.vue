<template>
  <div>
    <div class="page-header">
      <h2>V2.0 结算管理</h2>
      <div>
        <el-button type="primary" @click="generateDialogVisible = true">生成结算单</el-button>
        <el-button @click="load">刷新</el-button>
      </div>
    </div>

    <el-card shadow="never">
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="settlementNo" label="结算单号" width="200" show-overflow-tooltip />
        <el-table-column prop="supplierName" label="供应商" width="160" show-overflow-tooltip />
        <el-table-column label="结算周期" width="220">
          <template #default="{ row }">{{ fmt(row.periodStart) }} ~ {{ fmt(row.periodEnd) }}</template>
        </el-table-column>
        <el-table-column prop="totalAmount" label="总金额" width="110" align="right">
          <template #default="{ row }">¥{{ row.totalAmount }}</template>
        </el-table-column>
        <el-table-column prop="orderCount" label="订单数" width="90" align="center" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="statusTag(row.status)">{{ statusMap[row.status] || row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="170">
          <template #default="{ row }">{{ fmt(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 'pending'" link type="primary" size="small" @click="confirm(row)">确认</el-button>
            <el-button v-if="row.status === 'confirmed'" link type="success" size="small" @click="pay(row)">付款</el-button>
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

    <!-- 结算明细 -->
    <el-dialog v-model="itemsDialogVisible" title="结算明细" width="700px">
      <el-table :data="currentItems" stripe size="small">
        <el-table-column prop="orderNo" label="订单号" width="180" />
        <el-table-column prop="module" label="类型" width="80" />
        <el-table-column prop="amount" label="金额" align="right" />
        <el-table-column prop="status" label="状态" width="100" />
      </el-table>
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

const statusMap: Record<string, string> = { pending: '待确认', confirmed: '已确认', paid: '已付款', cancelled: '已取消' }
const statusTag = (s: string) => ({ pending: 'warning', confirmed: 'primary', paid: 'success', cancelled: 'danger' } as any)[s] || 'info'
const fmt = (d?: string) => (d ? new Date(d).toLocaleString('zh-CN', { hour12: false }) : '-')

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
    suppliers.value = res.list || []
  } catch { /* 忽略 */ }
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
    await v2ConfirmSettlement(row.id)
    ElMessage.success('已确认')
    load()
  } catch (e: any) {
    ElMessage.error(e?.message || '确认失败')
  }
}
async function pay(row: any) {
  try {
    await ElMessageBox.confirm(`确认对结算单 ${row.settlementNo} 付款 ¥${row.totalAmount}？`, '付款确认', { type: 'warning' })
    await v2PaySettlement(row.id)
    ElMessage.success('已付款')
    load()
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e?.message || '付款失败')
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
