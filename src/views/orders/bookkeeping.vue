<template>
  <div>
    <div class="page-header">
      <h2>代理记账订单</h2>
      <div>
        <el-button type="primary" @click="fetchOrders">刷新</el-button>
      </div>
    </div>
    <div class="page-card">
      <!-- 搜索 -->
      <el-form inline :model="query" class="search-form">
        <el-form-item label="关键词">
          <el-input v-model="query.keyword" placeholder="订单号" clearable style="width: 200px" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部" clearable style="width: 140px">
            <el-option v-for="s in statusOptions" :key="s.value" :label="s.label" :value="s.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="纳税人类型">
          <el-select v-model="query.taxpayerType" placeholder="全部" clearable style="width: 140px">
            <el-option label="小规模" value="small" />
            <el-option label="一般纳税人" value="general" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期">
          <el-date-picker v-model="dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" style="width: 260px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="search">搜索</el-button>
          <el-button @click="reset">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 表格 -->
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="orderNo" label="订单号" width="220" />
        <el-table-column label="纳税人类型" width="110">
          <template #default="{ row }">
            <el-tag :type="row.taxpayerType === 'general' ? 'warning' : 'info'" size="small">
              {{ row.taxpayerTypeText }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="cycleText" label="会计期间" width="100" />
        <el-table-column label="附加服务" min-width="220">
          <template #default="{ row }">
            <el-tag v-if="row.addons.invoice" type="success" size="small" style="margin-right: 4px">开票</el-tag>
            <el-tag v-if="row.addons.social" type="success" size="small" style="margin-right: 4px">社保</el-tag>
            <el-tag v-if="row.addons.fund" type="success" size="small" style="margin-right: 4px">公积金</el-tag>
            <span v-if="!row.addons.invoice && !row.addons.social && !row.addons.fund" class="text-muted">无</span>
          </template>
        </el-table-column>
        <el-table-column prop="contactPhone" label="联系电话" width="130" />
        <el-table-column prop="totalPrice" label="金额" width="110">
          <template #default="{ row }">¥{{ row.totalPrice }}</template>
        </el-table-column>
        <el-table-column prop="statusText" label="状态" width="100">
          <template #default="{ row }"><el-tag :type="statusType(row.status)">{{ row.statusText }}</el-tag></template>
        </el-table-column>
        <el-table-column label="分配状态" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.assignmentStatus === 1 || row.assignmentStatus === 2 || row.assignmentStatus === 3" type="success" size="small">已分配</el-tag>
            <el-tag v-else type="info" size="small">未分配</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="下单时间" width="170">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="$router.push(`/orders/${row.id}`)">详情</el-button>
            <el-button type="primary" link v-if="row.status === 1" @click="handleMarkPaid(row)">确认付款</el-button>
            <el-button type="primary" link v-if="row.status === 2" @click="handleComplete(row)">完成</el-button>
            <el-button type="warning" link v-if="row.assignmentStatus === 0 && row.status >= 2" @click="showAssignDialog(row)">分配</el-button>
            <el-button type="danger" link v-if="[2,3,4,7].includes(row.status)" @click="openRefund(row)">退款</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 退款弹窗 -->
      <el-dialog v-model="refundVisible" title="订单退款" width="420px">
        <div v-if="refundTarget" class="refund-box">
          <p>订单号:<b>{{ refundTarget.orderNo }}</b></p>
          <p>实付金额：<b>￥{{ refundTarget.payPrice || refundTarget.totalPrice }}</b></p>
          <el-form label-width="80px">
            <el-form-item label="退款金额">
              <el-input-number v-model="refundAmount" :min="0.01" :max="refundTarget.payPrice || refundTarget.totalPrice" :precision="2" style="width: 160px" />
            </el-form-item>
            <el-form-item label="退款原因">
              <el-input v-model="refundReason" type="textarea" placeholder="请输入退款原因" />
            </el-form-item>
          </el-form>
        </div>
        <template #footer>
          <el-button @click="refundVisible = false">取消</el-button>
          <el-button type="danger" @click="confirmRefund" :loading="refundLoading">确认退款</el-button>
        </template>
      </el-dialog>

      <!-- 分配网点弹窗 -->
      <el-dialog v-model="assignVisible" title="分配网点" width="600px">
        <div style="margin-bottom:12px;color:#666;font-size:13px">
          订单号：<b style="color:#333">{{ assignTarget?.orderNo }}</b>
          &nbsp;&nbsp;|&nbsp;&nbsp;
          已选：<b style="color:#5B6FE8">{{ currentOutletName || '—' }}</b>
        </div>
        <el-table
          :data="outletList"
          height="360"
          highlight-current-row
          :row-class-name="tableRowClassName"
          @row-click="onOutletRowClick"
          style="cursor:pointer"
        >
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column prop="name" label="网点名称" min-width="160" />
          <el-table-column prop="phone" label="联系电话" width="130" />
          <el-table-column prop="address" label="地址" min-width="200" show-overflow-tooltip />
        </el-table>
        <div style="margin-top:12px">
          <el-input v-model="assignForm.remark" type="textarea" placeholder="分配备注（可选）" :rows="2" />
        </div>
        <template #footer>
          <el-button @click="assignVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmAssign" :loading="assigning" :disabled="!assignForm.outletId">
            确认分配
          </el-button>
        </template>
      </el-dialog>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { assignOrderAPI, getOutletsAPI } from '@/api'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'

const statusOptions = [
  { value: 1, label: '待支付' }, { value: 2, label: '已支付' },
  { value: 3, label: '制作中' }, { value: 4, label: '已发货' },
  { value: 5, label: '已完成' }, { value: 6, label: '已取消' },
  { value: 7, label: '售后中' }, { value: 8, label: '退款中' }, { value: 9, label: '已退款' },
]

const loading = ref(false)
const list = ref<any[]>([])
const query = reactive({ page: 1, pageSize: 20, keyword: '', status: '', taxpayerType: '' })
const dateRange = ref<string[]>([])
const total = ref(0)

function statusType(status: number) {
  const map: Record<number, string> = { 1: 'warning', 2: 'primary', 3: '', 4: 'success', 5: 'success', 6: 'info', 7: 'warning', 8: 'danger', 9: 'info' }
  return map[status] || ''
}

function formatDate(d: string) { return d ? dayjs(d).format('YYYY-MM-DD HH:mm') : '-' }

// 退款
const refundVisible = ref(false)
const refundLoading = ref(false)
const refundTarget = ref<any>(null)
const refundAmount = ref(0)
const refundReason = ref('客户申请退款')

function openRefund(row: any) {
  refundTarget.value = row
  refundAmount.value = row.payPrice || row.totalPrice || 0
  refundReason.value = '客户申请退款'
  refundVisible.value = true
}

async function confirmRefund() {
  if (!refundTarget.value) return
  if (!refundReason.value.trim()) { ElMessage.warning('请填写退款原因'); return }
  refundLoading.value = true
  try {
    await fetch(`/api/orders/${refundTarget.value.id}/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: refundAmount.value, reason: refundReason.value })
    }).then(r => r.json()).then(r => { if (!r.success) throw new Error(r.message) })
    ElMessage.success('退款申请已提交')
    refundVisible.value = false
    fetchOrders()
  } catch (e: any) {
    ElMessage.error(e?.message || '退款失败')
  } finally {
    refundLoading.value = false
  }
}

// 分配
const assignVisible = ref(false)
const assigning = ref(false)
const outletList = ref<any[]>([])
const assignTarget = ref<any>(null)
const assignForm = ref({ outletId: '', remark: '' })
const currentOutletName = ref('')

function tableRowClassName({ row }: { row: any }) {
  return row.id === assignForm.value.outletId ? 'current-row' : ''
}

async function showAssignDialog(row: any) {
  assignTarget.value = row
  assignForm.value = { outletId: '', remark: '' }
  currentOutletName.value = ''
  assignVisible.value = true
  try {
    const res: any = await getOutletsAPI({ page: 1, pageSize: 100 })
    outletList.value = res.list || []
  } catch { /* ignore */ }
}

function onOutletRowClick(row: any) {
  assignForm.value.outletId = row.id
  currentOutletName.value = row.name
}

async function confirmAssign() {
  if (!assignForm.value.outletId) { ElMessage.warning('请选择网点'); return }
  assigning.value = true
  try {
    await assignOrderAPI(assignTarget.value.id, assignForm.value)
    ElMessage.success('分配成功')
    assignVisible.value = false
    fetchOrders()
  } catch (e: any) {
    ElMessage.error(e?.message || '分配失败')
  } finally {
    assigning.value = false
  }
}

// 确认付款 / 完成
async function handleMarkPaid(order: any) {
  try {
    await fetch(`/api/orders/admin/${order.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 2, statusText: '已支付' })
    }).then(r => r.json()).then(r => { if (!r.success) throw new Error(r.message) })
    ElMessage.success('已标记为已支付')
    fetchOrders()
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败')
  }
}

async function handleComplete(order: any) {
  try {
    await fetch(`/api/orders/admin/${order.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 5, statusText: '已完成' })
    }).then(r => r.json()).then(r => { if (!r.success) throw new Error(r.message) })
    ElMessage.success('已标记为已完成')
    fetchOrders()
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败')
  }
}

async function fetchOrders() {
  loading.value = true
  try {
    const params: any = {
      page: query.page,
      pageSize: query.pageSize,
      module: 'bookkeeping'
    }
    if (query.keyword) params.keyword = query.keyword
    if (query.status) params.status = query.status
    if (query.taxpayerType) params.taxpayerType = query.taxpayerType
    if (dateRange.value?.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    const res: any = await fetch('/api/orders/admin/list?' + new URLSearchParams(params).toString()).then(r => r.json())
    list.value = res.list || []
    total.value = res.total || 0
  } catch (e) {
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

function search() { query.page = 1; fetchOrders() }
function reset() {
  query.keyword = ''; query.status = ''; query.taxpayerType = ''
  dateRange.value = []
  search()
}

onMounted(fetchOrders)
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h2 { margin: 0; font-size: 20px; }
.page-card { background: #fff; padding: 20px; border-radius: 4px; box-shadow: 0 1px 4px rgba(0,21,41,.08); }
.search-form { margin-bottom: 16px; }
.text-muted { color: #999; font-size: 12px; }
::v-deep .current-row td { background-color: #EBF5FF !important; color: #5B6FE8; font-weight: 600; }
</style>
