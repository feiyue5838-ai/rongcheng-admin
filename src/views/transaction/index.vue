<template>
  <div class="transaction-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2><el-icon><Coin /></el-icon> 全部交易流水</h2>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-label">今日收入</div>
        <div class="stat-value income">¥{{ formatMoney(stats.today?.income || 0) }}</div>
        <div class="stat-trend" :class="getTrendClass(stats.today?.incomeTrend)">
          <span v-if="stats.today?.incomeTrend !== null">
            {{ stats.today.incomeTrend > 0 ? '↑' : '↓' }}
            {{ Math.abs(stats.today.incomeTrend) }}% 较昨日
          </span>
          <span v-else>—</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-label">今日退款</div>
        <div class="stat-value refund">¥{{ formatMoney(stats.today?.refund || 0) }}</div>
        <div class="stat-trend">
          <span v-if="stats.today?.refundTrend !== null">
            {{ stats.today.refundTrend > 0 ? '↑' : '↓' }}
            {{ Math.abs(stats.today.refundTrend) }}% 较昨日
          </span>
          <span v-else>—</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-label">今日净收入</div>
        <div class="stat-value net">¥{{ formatMoney(stats.today?.net || 0) }}</div>
        <div class="stat-trend">平台实收</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">本月累计收入</div>
        <div class="stat-value">¥{{ formatMoney(stats.month?.income || 0) }}</div>
        <div class="stat-trend">{{ stats.month?.count || 0 }} 笔交易</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">本月退款</div>
        <div class="stat-value refund">¥{{ formatMoney(stats.month?.refund || 0) }}</div>
        <div class="stat-trend">{{ stats.month?.count || 0 }} 笔退款</div>
      </div>
    </div>

    <!-- 快捷筛选 -->
    <div class="quick-filters">
      <el-check-tag
        v-for="item in quickFilters"
        :key="item.value"
        :checked="filterParams.quickRange === item.value"
        @click="onQuickFilter(item.value)"
      >{{ item.label }}</el-check-tag>
    </div>

    <!-- 筛选栏 -->
    <el-card class="filter-card">
      <el-form :inline="true" :model="filterParams">
        <el-form-item label="交易时间">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 260px;"
            @change="onDateRangeChange"
          />
        </el-form-item>
        <el-form-item label="服务商">
          <el-select v-model="filterParams.outletId" placeholder="全部服务商" clearable filterable style="width: 180px;" @change="onFilterChange">
            <el-option label="全部服务商" value="" />
            <el-option v-for="o in outletOptions" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="业务类型">
          <el-select v-model="filterParams.module" placeholder="全部业务" clearable style="width: 140px;" @change="onFilterChange">
            <el-option label="全部业务" value="" />
            <el-option label="刻章订单" value="seal" />
            <el-option label="登报订单" value="newspaper" />
            <el-option label="代理记账" value="bookkeeping" />
          </el-select>
        </el-form-item>
        <el-form-item label="交易类型">
          <el-select v-model="filterParams.tradeType" placeholder="全部类型" clearable style="width: 140px;" @change="onFilterChange">
            <el-option label="全部类型" value="" />
            <el-option label="订单支付" value="income" />
            <el-option label="退款" value="refund" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filterParams.status" placeholder="全部状态" clearable style="width: 140px;" @change="onFilterChange">
            <el-option label="全部状态" value="" />
            <el-option label="交易成功" value="success" />
            <el-option label="交易失败" value="failed" />
            <el-option label="支付中" value="pending" />
            <el-option label="已退款" value="refunded" />
          </el-select>
        </el-form-item>
        <el-form-item label="">
          <el-input
            v-model="filterParams.keyword"
            placeholder="订单号/交易单号/用户"
            clearable
            style="width: 180px;"
            @keyup.enter="onFilterChange"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="onFilterChange">查询</el-button>
          <el-button @click="onReset">重置</el-button>
          <el-button type="success" @click="onExport"><el-icon><Download /></el-icon> 导出</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 数据表格 -->
    <el-card class="table-card">
      <template #header>
        <div class="table-header">
          <span class="table-title">交易明细</span>
          <span class="table-count">共 {{ total }} 条记录</span>
        </div>
      </template>
      <el-table :data="tableData" stripe v-loading="loading" :default-sort="{ prop: 'createdAt', order: 'descending' }">
        <el-table-column label="交易时间" prop="createdAt" width="160" sortable>
          <template #default="{ row }">
            <div class="time-cell">
              <span class="time-main">{{ formatDateTime(row.createdAt) }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="交易单号" prop="transactionNo" width="180">
          <template #default="{ row }">
            <span class="mono-text">{{ row.transactionNo }}</span>
          </template>
        </el-table-column>
        <el-table-column label="关联订单" prop="orderNo" width="180">
          <template #default="{ row }">
            <span v-if="row.orderNo" class="order-link" @click="showOrderDetail(row.orderId)">
              {{ row.orderNo }}
            </span>
            <span v-else class="text-muted">—</span>
          </template>
        </el-table-column>
        <el-table-column label="用户" prop="userName" min-width="140">
          <template #default="{ row }">
            <div class="user-cell">
              <span>{{ row.userName || '匿名用户' }}</span>
              <span class="user-phone">{{ row.userPhone || '' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="服务商" prop="outletName" min-width="140">
          <template #default="{ row }">
            <span>{{ row.outletName || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="业务" prop="businessType" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getModuleTagType(row.module)" size="small">{{ row.businessType }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="交易类型" prop="tradeType" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getTradeTagType(row.tradeType)" size="small">{{ getTradeTypeText(row.tradeType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="支付方式" prop="payMethod" width="100" align="center">
          <template #default="{ row }">
            <span>{{ getPayMethodText(row.payMethod) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="交易金额" prop="amount" width="120" align="right">
          <template #default="{ row }">
            <span class="amount-text" :class="getAmountClass(row.tradeType)">
              {{ row.tradeType === 'refund' ? '-' : '+' }}¥{{ formatMoney(row.amount) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="手续费" prop="fee" width="90" align="right">
          <template #default="{ row }">
            <span class="text-muted">{{ row.fee > 0 ? '¥' + formatMoney(row.fee) : '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="实收金额" prop="netAmount" width="120" align="right">
          <template #default="{ row }">
            <span class="amount-text" :class="getAmountClass(row.tradeType)">
              {{ row.tradeType === 'refund' ? '-' : '+' }}¥{{ formatMoney(row.netAmount) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="状态" prop="statusText" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" size="small">{{ row.statusText }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="showDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadData"
          @current-change="loadData"
        />
      </div>
    </el-card>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="交易详情" width="600px">
      <el-descriptions :column="2" border v-if="currentRow">
        <el-descriptions-item label="交易单号">{{ currentRow.transactionNo }}</el-descriptions-item>
        <el-descriptions-item label="交易时间">{{ formatDateTime(currentRow.createdAt) }}</el-descriptions-item>
        <el-descriptions-item label="关联订单">{{ currentRow.orderNo || '—' }}</el-descriptions-item>
        <el-descriptions-item label="业务类型">{{ currentRow.businessType }}</el-descriptions-item>
        <el-descriptions-item label="交易类型">{{ getTradeTypeText(currentRow.tradeType) }}</el-descriptions-item>
        <el-descriptions-item label="支付方式">{{ getPayMethodText(currentRow.payMethod) }}</el-descriptions-item>
        <el-descriptions-item label="交易金额">¥{{ formatMoney(currentRow.amount) }}</el-descriptions-item>
        <el-descriptions-item label="手续费">¥{{ formatMoney(currentRow.fee) }}</el-descriptions-item>
        <el-descriptions-item label="实收金额">¥{{ formatMoney(currentRow.netAmount) }}</el-descriptions-item>
        <el-descriptions-item label="交易状态">
          <el-tag :type="getStatusTagType(currentRow.status)" size="small">{{ currentRow.statusText }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="第三方单号">{{ currentRow.transactionId || '—' }}</el-descriptions-item>
        <el-descriptions-item label="用户">{{ currentRow.userName || '匿名用户' }}</el-descriptions-item>
        <el-descriptions-item label="用户手机">{{ currentRow.userPhone || '—' }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ currentRow.remark || '—' }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  ElCheckTag,
  ElPagination,
  ElTag,
  ElButton,
  ElCard,
  ElTable,
  ElTableColumn,
  ElDescriptions,
  ElDescriptionsItem,
  ElSelect,
  ElOption,
  ElDatePicker,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
} from 'element-plus'
import {
  getTransactionStats,
  getTransactionFlows,
  exportTransactionFlows,
  getOutletsWithFlows,
} from '@/api'

// 统计数据
const stats = ref<any>({})
const tableData = ref<any[]>([])
const total = ref(0)
const loading = ref(false)
const detailVisible = ref(false)
const currentRow = ref<any>(null)

// 日期范围
const dateRange = ref<string[]>([])

// 筛选参数
const filterParams = reactive({
  quickRange: 'today',
  module: '',
  tradeType: '',
  status: '',
  keyword: '',
  startDate: '',
  endDate: '',
  outletId: '',
})

// 服务商（网点）选项
const outletOptions = ref<any[]>([])
async function loadOutlets() {
  try {
    const resp = await getOutletsWithFlows()
    const list = resp.data || []
    outletOptions.value = list.map((o: any) => ({
      label: o.outletName || o.outlet_name || '未知',
      value: o.outletId || o.outlet_id || o.id || '',
    }))
    console.log('[outlets] loaded count=', outletOptions.value.length, outletOptions.value)
  } catch (e) {
    console.error('加载服务商列表失败', e)
  }
}

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 20,
})

// 快捷筛选
const quickFilters = [
  { label: '今日', value: 'today' },
  { label: '昨日', value: 'yesterday' },
  { label: '近7天', value: 'week' },
  { label: '近30天', value: 'month' },
]

// 加载统计数据
async function loadStats() {
  try {
    const resp = await getTransactionStats()
    stats.value = resp.data || {}
  } catch (e) {
    console.error('加载统计数据失败', e)
  }
}

// 加载列表数据
async function loadData() {
  loading.value = true
  try {
    const resp = await getTransactionFlows({
      page: pagination.page,
      pageSize: pagination.pageSize,
      module: filterParams.module || undefined,
      tradeType: filterParams.tradeType || undefined,
      status: filterParams.status || undefined,
      startDate: filterParams.startDate || undefined,
      endDate: filterParams.endDate || undefined,
      keyword: filterParams.keyword || undefined,
      outletId: filterParams.outletId || undefined,
    })
    tableData.value = resp.data?.items || []
    total.value = resp.data?.total || 0
  } catch (e: any) {
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

// 快捷筛选
function onQuickFilter(value: string) {
  filterParams.quickRange = value
  const now = new Date()
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  if (value === 'today') {
    filterParams.startDate = fmt(now)
    filterParams.endDate = fmt(now)
    dateRange.value = [fmt(now), fmt(now)]
  } else if (value === 'yesterday') {
    const y = new Date(now.getTime() - 86400000)
    filterParams.startDate = fmt(y)
    filterParams.endDate = fmt(y)
    dateRange.value = [fmt(y), fmt(y)]
  } else if (value === 'week') {
    const w = new Date(now.getTime() - 7 * 86400000)
    filterParams.startDate = fmt(w)
    filterParams.endDate = fmt(now)
    dateRange.value = [fmt(w), fmt(now)]
  } else if (value === 'month') {
    const m = new Date(now.getTime() - 30 * 86400000)
    filterParams.startDate = fmt(m)
    filterParams.endDate = fmt(now)
    dateRange.value = [fmt(m), fmt(now)]
  }
  loadData()
}

// 日期范围变化
function onDateRangeChange(val: string[]) {
  if (val && val.length === 2) {
    filterParams.startDate = val[0]
    filterParams.endDate = val[1]
    filterParams.quickRange = ''
  } else {
    filterParams.startDate = ''
    filterParams.endDate = ''
  }
}

// 筛选变化
function onFilterChange() {
  pagination.page = 1
  loadData()
}

// 重置
function onReset() {
  filterParams.module = ''
  filterParams.tradeType = ''
  filterParams.status = ''
  filterParams.keyword = ''
  filterParams.startDate = ''
  filterParams.endDate = ''
  filterParams.quickRange = 'today'
  filterParams.outletId = ''
  dateRange.value = []
  pagination.page = 1
  loadData()
}

// 导出
async function onExport() {
  try {
    const resp = await exportTransactionFlows({
      startDate: filterParams.startDate || undefined,
      endDate: filterParams.endDate || undefined,
      module: filterParams.module || undefined,
      tradeType: filterParams.tradeType || undefined,
      status: filterParams.status || undefined,
      keyword: filterParams.keyword || undefined,
      outletId: filterParams.outletId || undefined,
    })
    ElMessage.success('导出成功')
    // Blob 后续可触发下载
  } catch (e) {
    ElMessage.error('导出失败')
  }
}

// 查看详情
function showDetail(row: any) {
  currentRow.value = row
  detailVisible.value = true
}

// 查看订单详情（跳转）
function showOrderDetail(orderId: string) {
  if (!orderId) return
  // 跳转到对应订单详情页
  window.open(`/#/orders/detail/${orderId}`, '_blank')
}

// ============ 辅助函数 ============

function formatMoney(val: number | string): string {
  const num = Number(val) || 0
  return num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDateTime(date: string): string {
  if (!date) return '—'
  const d = new Date(date)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function getTrendClass(trend: number | null): string {
  if (trend === null || trend === undefined) return ''
  return trend >= 0 ? 'trend-up' : 'trend-down'
}

function getModuleTagType(module: string): any {
  const map: Record<string, string> = {
    seal: 'primary',
    newspaper: 'purple',
    bookkeeping: 'warning',
    refund: 'danger',
  }
  return map[module] || 'info'
}

function getTradeTagType(tradeType: string): any {
  return tradeType === 'income' ? 'success' : 'danger'
}

function getTradeTypeText(tradeType: string): string {
  const map: Record<string, string> = {
    income: '订单支付',
    refund: '退款',
    withdraw: '提现',
    recharge: '充值',
  }
  return map[tradeType] || tradeType
}

function getPayMethodText(method: string): string {
  const map: Record<string, string> = {
    wechat: '微信支付',
    alipay: '支付宝',
    balance: '余额',
  }
  return map[method] || method || '—'
}

function getAmountClass(tradeType: string): string {
  return tradeType === 'refund' ? 'amount-refund' : 'amount-income'
}

function getStatusTagType(status: string): any {
  const map: Record<string, string> = {
    success: 'success',
    pending: 'warning',
    failed: 'danger',
    refunded: 'info',
  }
  return map[status] || 'info'
}

// 初始化
onMounted(() => {
  loadOutlets()
  onQuickFilter('today')
  loadStats()
})
</script>

<style scoped lang="scss">
.transaction-container {
  padding: 0;
}

.page-header {
  margin-bottom: 20px;
  h2 {
    font-size: 20px;
    font-weight: 600;
    color: #303133;
  }
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}

.stat-label {
  font-size: 13px;
  color: #909399;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  &.income { color: #52c41a; }
  &.refund { color: #f5222d; }
  &.net { color: #5B6FE8; }
}

.stat-trend {
  font-size: 12px;
  color: #909399;
  margin-top: 6px;
  &.trend-up { color: #52c41a; }
  &.trend-down { color: #f5222d; }
}

.quick-filters {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.filter-card {
  margin-bottom: 16px;
}

.table-card {
  .table-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    .table-title {
      font-size: 15px;
      font-weight: 600;
      color: #303133;
    }
    .table-count {
      font-size: 13px;
      color: #909399;
    }
  }
}

.time-cell {
  .time-main {
    font-weight: 500;
    color: #303133;
    font-size: 13px;
  }
}

.mono-text {
  font-family: 'Roboto Mono', 'Consolas', monospace;
  font-size: 13px;
  color: #5B6FE8;
}

.order-link {
  color: #5B6FE8;
  cursor: pointer;
  font-size: 13px;
  &:hover { text-decoration: underline; }
}

.user-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  .user-phone {
    font-size: 12px;
    color: #909399;
  }
}

.amount-text {
  font-weight: 600;
  font-size: 14px;
  &.amount-income { color: #52c41a; }
  &.amount-refund { color: #f5222d; }
}

.text-muted {
  color: #909399;
  font-size: 13px;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}
</style>
