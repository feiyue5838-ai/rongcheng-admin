<template>
  <div class="finance-page">
    <div class="page-header">
      <h2>{{ mainTab === 'transaction' ? '交易流水' : '财务总览' }}</h2>
    </div>

    <!-- 财务总览统计卡 -->
    <div v-if="mainTab === 'overview'" class="stat-cards">
      <div class="stat-card income">
        <div class="stat-icon"><el-icon><Coin /></el-icon></div>
        <div class="stat-body">
          <div class="stat-label">收入</div>
          <div class="stat-value">¥{{ fmt(overview.income) }}</div>
          <div class="stat-sub">{{ overview.incomeCount }} 笔交易</div>
        </div>
      </div>
      <div class="stat-card fee">
        <div class="stat-icon"><el-icon><Setting /></el-icon></div>
        <div class="stat-body">
          <div class="stat-label">手续费</div>
          <div class="stat-value">¥{{ fmt(overview.incomeFee) }}</div>
          <div class="stat-sub">综合费率 {{ effectiveFeeRate }}</div>
        </div>
      </div>
      <div class="stat-card refund-stat">
        <div class="stat-icon"><el-icon><CloseBold /></el-icon></div>
        <div class="stat-body">
          <div class="stat-label">退款</div>
          <div class="stat-value">¥{{ fmt(overview.refund) }}</div>
          <div class="stat-sub">{{ overview.refundCount }} 笔退款</div>
        </div>
      </div>
      <div class="stat-card settle">
        <div class="stat-icon"><el-icon><Shop /></el-icon></div>
        <div class="stat-body">
          <div class="stat-label">网点分成</div>
          <div class="stat-value">¥{{ fmt(overview.outletSettle) }}</div>
          <div class="stat-sub">待确认 ¥{{ fmt(overview.pendingOutlet) }}</div>
        </div>
      </div>
      <div class="stat-card net">
        <div class="stat-icon"><el-icon><TrendCharts /></el-icon></div>
        <div class="stat-body">
          <div class="stat-label">平台净利</div>
          <div class="stat-value">¥{{ fmt(overview.platformNet) }}</div>
          <div class="stat-sub">收入-手续费-退款-分成</div>
        </div>
      </div>
    </div>

    <!-- ==================== Tab 1: 财务总览 ==================== -->
    <div v-if="mainTab === 'overview'" class="tab-panel">
      <div class="content-grid">
        <el-card shadow="never" class="panel">
          <TrendChart
            :title="'近' + trendRange + '天交易趋势'"
            v-model="trendRange"
            :data="trendData"
            @range-change="onTrendRangeChange"
          />
        </el-card>
        <el-card shadow="never" class="panel">
          <template #header><div class="panel-title">待办事项</div></template>
          <div class="todo-items">
            <div v-if="overview.pendingCount > 0" class="todo-item" @click="goV2Settlements()">
              <div class="todo-icon" style="background:#fff3e0"><span style="font-size:20px">💰</span></div>
              <div class="todo-info"><div class="todo-num">{{ overview.pendingCount }}</div><div class="todo-label">笔结算待确认</div></div>
            </div>
            <div v-if="overview.pendingRefundCount > 0" class="todo-item" @click="router.push('/v2/refunds')">
              <div class="todo-icon" style="background:#fff1f0"><span style="font-size:20px">↩️</span></div>
              <div class="todo-info"><div class="todo-num">{{ overview.pendingRefundCount }}</div><div class="todo-label">笔退款待处理</div></div>
            </div>
            <div v-for="item in outletPending" :key="item.outletId" class="todo-item" @click="goV2Settlements()">
              <div class="todo-icon" style="background:#f0f5ff"><span style="font-size:20px">🏪</span></div>
              <div class="todo-info"><div class="todo-num">¥{{ fmt(item.pendingAmount) }}</div><div class="todo-label">{{ item.outletName }} 待结算</div></div>
            </div>
            <div v-if="overview.pendingCount === 0 && overview.pendingRefundCount === 0 && outletPending.length === 0" class="todo-empty">
              <span style="font-size:40px"><el-icon><Promotion /></el-icon></span>
              <div style="margin-top:8px;color:#909399">暂无待办事项，所有业务已处理完毕</div>
            </div>
          </div>
        </el-card>
      </div>
      <el-card shadow="never" style="margin-top: 16px">
        <template #header><div class="panel-title">营收分布（本月）</div></template>
        <ModuleDonut :data="moduleMonth" :height="280" />
      </el-card>

      <el-card shadow="never" style="margin-top: 16px">
        <template #header><div class="panel-title">汇总明细</div></template>
        <el-descriptions :column="3" border>
          <el-descriptions-item label="收入">{{ overview.income ? '¥' + fmt(overview.income) : '—' }}</el-descriptions-item>
          <el-descriptions-item label="手续费">¥{{ fmt(overview.incomeFee) }}</el-descriptions-item>
          <el-descriptions-item label="退款">¥{{ fmt(overview.refund) }}</el-descriptions-item>
          <el-descriptions-item label="网点分成">¥{{ fmt(overview.outletSettle) }}</el-descriptions-item>
          <el-descriptions-item label="结算笔数">{{ overview.settleCount || 0 }}</el-descriptions-item>
          <el-descriptions-item label="平台净利"><span style="color:#52c41a;font-weight:bold">¥{{ fmt(overview.platformNet) }}</span></el-descriptions-item>
        </el-descriptions>
      </el-card>
    </div>

    <!-- ==================== Tab 2: 交易流水 ==================== -->
    <div v-if="mainTab === 'transaction'" class="tab-panel">
      <!-- 统计卡 -->
      <div class="trans-stats">
        <div class="trans-stat income"><div class="ts-icon">💰</div><div class="ts-body"><div class="ts-label">今日收入</div><div class="ts-value">¥{{ fmt(transStats.today?.income || 0) }}</div><div class="ts-sub" :class="parseFloat(transStats.today?.incomeTrend)>=0?'up':'down'">{{ parseFloat(transStats.today?.incomeTrend)>=0?'↑':'↓' }}{{ Math.abs(parseFloat(transStats.today?.incomeTrend||0)).toFixed(1) }}% 较昨日</div></div></div>
        <div class="trans-stat refund"><div class="ts-icon">↩️</div><div class="ts-body"><div class="ts-label">今日退款</div><div class="ts-value">¥{{ fmt(transStats.today?.refund || 0) }}</div><div class="ts-sub">{{ parseFloat(transStats.today?.refundTrend)>=0?'↑':'↓' }}{{ Math.abs(parseFloat(transStats.today?.refundTrend||0)).toFixed(1) }}% 较昨日</div></div></div>
        <div class="trans-stat net"><div class="ts-icon">📈</div><div class="ts-body"><div class="ts-label">今日净收</div><div class="ts-value">¥{{ fmt(transStats.today?.net || 0) }}</div><div class="ts-sub">平台实收</div></div></div>
        <div class="trans-stat count"><div class="ts-icon"><el-icon><DocumentChecked /></el-icon></div><div class="ts-body"><div class="ts-label">今日笔数</div><div class="ts-value">{{ transStats.today?.count || 0 }}</div><div class="ts-sub">交易笔数</div></div></div>
        <div class="trans-stat month"><div class="ts-icon"><el-icon><Calendar /></el-icon>️</div><div class="ts-body"><div class="ts-label">本月累计</div><div class="ts-value">¥{{ fmt(transStats.month?.income || 0) }}</div><div class="ts-sub">{{ transStats.month?.count || 0 }} 笔</div></div></div>
      </div>

      <!-- 筛选 -->
      <el-card shadow="never" style="margin-top:12px">
        <div style="display:flex;flex-direction:column;gap:10px">
          <div class="quick-range">
            <button v-for="r in quickRanges" :key="r.key" class="quick-btn" :class="{ active: quickRange === r.key }" @click="onQuickFilter(r.key)">{{ r.label }}</button>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
            <el-select v-model="filterParams.outletId" placeholder="全部合作方" clearable filterable style="width:180px" @change="onFilterChange">
              <el-option v-for="o in outletOptions" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
            <el-select v-model="filterParams.module" placeholder="全部业务" clearable style="width:140px" @change="onFilterChange">
              <el-option label="刻章" value="seal" /><el-option label="登报" value="newspaper" /><el-option label="代理记账" value="bookkeeping" />
            </el-select>
            <el-select v-model="filterParams.tradeType" placeholder="全部类型" clearable style="width:140px" @change="onFilterChange">
              <el-option label="订单支付" value="income" /><el-option label="退款" value="refund" /><el-option label="结算付款" value="expense" />
            </el-select>
            <el-select v-model="filterParams.status" placeholder="全部状态" clearable style="width:120px" @change="onFilterChange">
              <el-option label="交易成功" value="success" /><el-option label="交易失败" value="failed" />
            </el-select>
            <el-input v-model="filterParams.keyword" placeholder="订单号/交易单号/用户" style="width:180px" @keyup.enter="onFilterChange" />
            <el-date-picker v-model="dateRange2" type="daterange" range-separator="至" start-placeholder="开始" end-placeholder="结束" value-format="YYYY-MM-DD" style="width:240px" @change="onDateRangeChange" />
            <el-button type="primary" @click="loadData">查询</el-button>
            <el-button @click="onReset">重置</el-button>
            <el-button @click="onExport"><el-icon><Download /></el-icon> 导出</el-button>
          </div>
        </div>
      </el-card>

      <!-- 表格 -->
      <el-card shadow="never" style="margin-top:12px">
        <el-table :data="tableData" stripe v-loading="tableLoading">
          <el-table-column prop="createdAt" label="交易时间" width="170" sortable>
            <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column prop="transactionNo" label="交易单号" width="190" />
          <el-table-column prop="orderNo" label="关联订单" width="190" />
          <el-table-column prop="userName" label="用户" width="120" />
          <el-table-column prop="outletName" label="履约供应商" width="160" show-overflow-tooltip />
          <el-table-column prop="businessType" label="业务" width="100" />
          <el-table-column label="类型" width="100">
            <template #default="{ row }"><el-tag :type="tradeTypeTagType(row.tradeType)" size="small">{{ tradeTypeText(row.tradeType) }}</el-tag></template>
          </el-table-column>
          <el-table-column prop="payMethod" label="支付方式" width="100" />
          <el-table-column label="交易金额" width="120" align="right">
            <template #default="{ row }"><span :class="row.tradeType==='refund'?'money refund':'money'">{{ row.tradeType==='refund'?'-':'+' }}¥{{ Number(row.amount||0).toFixed(2) }}</span></template>
          </el-table-column>
          <el-table-column prop="fee" label="手续费" width="90" align="right"><template #default="{ row }">¥{{ Number(row.fee||0).toFixed(2) }}</template></el-table-column>
          <el-table-column label="实收" width="120" align="right"><template #default="{ row }"><span class="money">¥{{ Number(row.netAmount||0).toFixed(2) }}</span></template></el-table-column>
          <el-table-column label="状态" width="90">
            <template #default="{ row }"><el-tag :type="row.status==='success'?'success':'danger'" size="small">{{ row.statusText }}</el-tag></template>
          </el-table-column>
          <el-table-column label="操作" width="80" fixed="right">
            <template #default="{ row }"><el-button type="primary" link size="small" @click="viewTransDetail(row)">详情</el-button></template>
          </el-table-column>
        </el-table>
        <el-pagination v-model:current-page="transPage" v-model:page-size="transPageSize" :total="transTotal" :page-sizes="[10,20,50]"
          layout="total, sizes, prev, pager, next" style="margin-top:12px;justify-content:flex-end"
          @size-change="loadData" @current-change="loadData" />
      </el-card>
    </div>

    <!-- ============ 弹窗 ============ -->

    <!-- 交易详情 -->
    <el-dialog v-model="transDetailVisible" title="交易详情" width="560px">
      <el-descriptions :column="2" border v-if="transDetailRow">
        <el-descriptions-item label="交易单号">{{ transDetailRow.transactionNo }}</el-descriptions-item>
        <el-descriptions-item label="关联订单">{{ transDetailRow.orderNo }}</el-descriptions-item>
        <el-descriptions-item label="用户">{{ transDetailRow.userName }} {{ transDetailRow.userPhone }}</el-descriptions-item>
        <el-descriptions-item label="履约供应商">{{ transDetailRow.outletName || '—' }}</el-descriptions-item>
        <el-descriptions-item label="业务">{{ transDetailRow.businessType }}</el-descriptions-item>
        <el-descriptions-item label="交易类型">{{ tradeTypeText(transDetailRow.tradeType) }}</el-descriptions-item>
        <el-descriptions-item label="支付方式">{{ transDetailRow.payMethod }}</el-descriptions-item>
        <el-descriptions-item label="状态"><el-tag :type="transDetailRow.status==='success'?'success':'danger'">{{ transDetailRow.statusText }}</el-tag></el-descriptions-item>
        <el-descriptions-item label="交易金额" align="right"><span :class="transDetailRow.tradeType==='refund'?'money refund':'money'" style="font-size:16px;font-weight:bold">{{ transDetailRow.tradeType==='refund'?'-':'+' }}¥{{ Number(transDetailRow.amount||0).toFixed(2) }}</span></el-descriptions-item>
        <el-descriptions-item label="手续费" align="right">¥{{ Number(transDetailRow.fee||0).toFixed(2) }}</el-descriptions-item>
        <el-descriptions-item label="实收金额" align="right"><span class="money" style="font-size:16px;font-weight:bold">¥{{ Number(transDetailRow.netAmount||0).toFixed(2) }}</span></el-descriptions-item>
        <el-descriptions-item label="交易流水号" :span="2">{{ transDetailRow.transactionId || '—' }}</el-descriptions-item>
        <el-descriptions-item label="交易时间" :span="2">{{ formatDateTime(transDetailRow.createdAt) }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>

  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TrendChart from '@/components/TrendChart.vue'
import ModuleDonut from '@/components/ModuleDonut.vue'
import { ElMessage } from 'element-plus'
import { Coin, Setting, CloseBold, Shop, TrendCharts } from '@element-plus/icons-vue'
import {
  getFinanceOverview,
  getTransactionStats, getTransactionFlows,
  exportTransactionFlows,
  getOutletsWithFlows,
  getOutletPendingSummary,
} from '@/api'

// ==================== 主 Tab 控制 ====================
const mainTab = ref('overview')
const route = useRoute()
const router = useRouter()

// 结算管理已迁移至 V2 独立页面（/v2/settlements）
function goV2Settlements() {
  router.push('/v2/settlements')
}

function activateMain(tab) {
  mainTab.value = tab
  if (tab === 'overview') { loadOverview(); loadOutletPending(); loadModuleMonth() }
  else if (tab === 'transaction') {
    loadOutletOpts()
    if (dateRange2.value?.length === 2) { loadTransStats(); loadData() }
    else onQuickFilter(quickRange.value)
  }
}

// ==================== Tab 1: 财务总览 ====================
const overview = ref({})
const moduleMonth = ref([])
const trendData = ref([])
const trendRange = ref('30')
const outletPending = ref([])
const effectiveFeeRate = computed(() => {
  const income = Number(overview.value.income || 0)
  if (income <= 0) return '—'
  return `${((Number(overview.value.incomeFee || 0) / income) * 100).toFixed(2)}%`
})

async function loadOverview() {
  try {
    const res = await getFinanceOverview({ days: parseInt(trendRange.value) })
    overview.value = res || {}
    trendData.value = res?.trend || []
  } catch (e) { console.error(e) }
}

// 本月口径（自然月至今），用于营收分布环形图
async function loadModuleMonth() {
  try {
    const now = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    const startDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`
    const endDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
    const res = await getFinanceOverview({ startDate, endDate })
    moduleMonth.value = (res?.byModule || []).filter(m => m.tradeType === 'income')
  } catch (e) { console.error(e) }
}

async function loadOutletPending() {
  try {
    const res = await getOutletPendingSummary()
    const list = Array.isArray(res) ? res : []
    outletPending.value = list.filter((it) => Number(it?.pendingAmount || 0) > 0)
  } catch (e) { console.error(e) }
}

function onTrendRangeChange(days) {
  trendRange.value = String(days)
  loadOverview()
}

function fmt(v) { return Number(v || 0).toFixed(2) }

// 本地日期格式化（避免 toISOString 的 UTC 偏移）
function fmtLocalDate(d) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// CSV 下载（带 BOM，Excel 可直接打开中文）
function downloadCSV(filename, headers, rows) {
  const esc = (v) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
  }
  const csv = '\uFEFF' + [headers, ...rows].map(row => row.map(esc).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const transStats = ref({})
const filterParams = reactive({ outletId:'', module:'', tradeType:'', status:'', keyword:'' })
const quickRange = ref('today')
const dateRange2 = ref([])
const quickRanges = [
  { key:'today', label:'今日' },
  { key:'yesterday', label:'昨日' },
  { key:'week', label:'近7天' },
  { key:'month', label:'本月' },
  { key:'lastMonth', label:'上月' },
]
const outletOptions = ref([])
const tableData = ref([])
const tableLoading = ref(false)
const transPage = ref(1)
const transPageSize = ref(10)
const transTotal = ref(0)
const transDetailVisible = ref(false)
const transDetailRow = ref(null)

async function loadOutletOpts() {
  try {
    const res = await getOutletsWithFlows()
    const data = res?.data ?? res ?? {}
    const list = Array.isArray(data) ? data : (data?.items || [])
    outletOptions.value = (list || []).map((o) => ({ label: o.outletName, value: o.outletId }))
  } catch (e) { console.error(e) }
}

async function loadTransStats() {
  try {
    const params = {
      ...(dateRange2.value?.[0] && { startDate: dateRange2.value[0] }),
      ...(dateRange2.value?.[1] && { endDate: dateRange2.value[1] }),
    }
    const res = await getTransactionStats(params)
    transStats.value = (res?.data && typeof res?.data === 'object') ? res.data : (res || {})
  }
  catch (e) { console.error(e) }
}

async function loadData() {
  tableLoading.value = true
  try {
    const params = {
      page: transPage.value, pageSize: transPageSize.value,
      ...(filterParams.outletId && { outletId: filterParams.outletId }),
      ...(filterParams.module && { module: filterParams.module }),
      ...(filterParams.tradeType && { tradeType: filterParams.tradeType }),
      ...(filterParams.status && { status: filterParams.status }),
      ...(filterParams.keyword && { keyword: filterParams.keyword }),
      ...(dateRange2.value && dateRange2.value[0] && { startDate: dateRange2.value[0] }),
      ...(dateRange2.value && dateRange2.value[1] && { endDate: dateRange2.value[1] }),
    }
    const res = await getTransactionFlows(params)
    const data = res?.data ?? res ?? {}
    tableData.value = data?.items || (Array.isArray(data) ? data : [])
    transTotal.value = data?.total || 0
  } catch (e) { console.error(e) }
  finally { tableLoading.value = false }
}

function onQuickFilter(key) {
  quickRange.value = key
  const now = new Date()
  let start, end = fmtLocalDate(now)
  if (key === 'today') start = end
  else if (key === 'yesterday') { const y = new Date(now); y.setDate(y.getDate()-1); start = fmtLocalDate(y); end = start }
  else if (key === 'week') { const w = new Date(now); w.setDate(w.getDate()-6); start = fmtLocalDate(w) }
  else if (key === 'month') start = fmtLocalDate(new Date(now.getFullYear(), now.getMonth(), 1))
  else if (key === 'lastMonth') {
    const lm = new Date(now.getFullYear(), now.getMonth()-1, 1)
    const lmEnd = new Date(now.getFullYear(), now.getMonth(), 0)
    start = fmtLocalDate(lm); end = fmtLocalDate(lmEnd)
  }
  dateRange2.value = [start, end]
  filterParams.outletId = ''
  loadData()
  loadTransStats()
}

function onFilterChange() { transPage.value = 1; loadData() }
function onDateRangeChange() { transPage.value = 1; loadData(); loadTransStats() }

function onReset() {
  filterParams.outletId = ''; filterParams.module = ''; filterParams.tradeType = ''; filterParams.status = ''; filterParams.keyword = ''
  transPage.value = 1
  onQuickFilter('today')
}

async function onExport() {
  try {
    const params = {
      page: 1, pageSize: 10000,
      ...(filterParams.outletId && { outletId: filterParams.outletId }),
      ...(filterParams.module && { module: filterParams.module }),
      ...(filterParams.tradeType && { tradeType: filterParams.tradeType }),
      ...(filterParams.status && { status: filterParams.status }),
      ...(filterParams.keyword && { keyword: filterParams.keyword }),
      ...(dateRange2.value && dateRange2.value[0] && { startDate: dateRange2.value[0] }),
      ...(dateRange2.value && dateRange2.value[1] && { endDate: dateRange2.value[1] }),
    }
    const res = await exportTransactionFlows(params)
    const data = res?.data ?? res ?? []
    const list = Array.isArray(data) ? data : (data?.items || [])
    if (!list.length) { ElMessage.info('暂无数据可导出'); return }
    const headers = ['交易时间', '交易单号', '关联订单', '用户', '履约供应商', '业务', '类型', '支付方式', '交易金额', '手续费', '实收', '状态']
    const rows = list.map(r => [
      r.createdAt || '', r.transactionNo || '', r.orderNo || '', r.userName || '', r.outletName || '',
      r.businessType || '', tradeTypeText(r.tradeType), r.payMethod || '',
      r.amount, r.fee, r.netAmount, r.statusText || r.status || '',
    ])
    downloadCSV('交易流水_' + fmtLocalDate(new Date()) + '.csv', headers, rows)
    ElMessage.success('导出成功')
  } catch (e) { console.error(e); ElMessage.error('导出失败') }
}

function viewTransDetail(row) { transDetailRow.value = row; transDetailVisible.value = true }

function tradeTypeTagType(type) { return { income:'success', refund:'danger', expense:'warning' }[type] || '' }
function tradeTypeText(type) { return { income:'订单支付', refund:'退款', expense:'结算付款' }[type] || type }

// ==================== 公共工具 ====================
function formatDateTime(date) {
  if (!date) return '—'
  var d = new Date(date)
  if (isNaN(d.getTime())) return '—'
  var y = d.getFullYear()
  var m = String(d.getMonth()+1).padStart(2,'0')
  var day = String(d.getDate()).padStart(2,'0')
  var h = String(d.getHours()).padStart(2,'0')
  var min = String(d.getMinutes()).padStart(2,'0')
  var s = String(d.getSeconds()).padStart(2,'0')
  return y+'-'+m+'-'+day+' '+h+':'+min+':'+s
}

// 同一路由下监听 tab 查询参数，确保侧边栏切换时内容同步更新
watch(() => String(route.query.tab || ''), (tab) => {
  // 结算管理已迁移至 V2 独立页面：来自仪表盘等入口的 ?tab=settlement 直接中转
  if (tab === 'settlement') { goV2Settlements(); return }
  if (tab === 'refund') { router.replace('/v2/refunds'); return }
  if (tab === 'transaction') {
    activateMain('transaction')
  } else {
    activateMain('overview')
  }
}, { immediate: true })
</script>

<style scoped>
.finance-page { padding: 20px; background: #f5f7fa; min-height: 100vh; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h2 { margin: 0; font-size: 18px; color: #303133; font-weight: 600; }

.stat-cards { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; margin-bottom: 16px; }
.stat-card { border-radius: 16px; padding: 20px 18px; display: flex; align-items: center; gap: 14px; box-shadow: 0 1px 4px rgba(0,0,0,.06); transition: transform .2s, box-shadow .2s; }
.stat-card:hover { transform: translateY(-3px); box-shadow: 0 6px 20px rgba(0,0,0,.1); }
.stat-icon { width: 46px; height: 46px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; color: #fff; }
.stat-body { flex: 1; min-width: 0; }
.stat-label { font-size: 13px; color: #666; margin-bottom: 4px; }
.stat-value { font-size: 20px; font-weight: 700; color: #303133; line-height: 1.2; }
.stat-sub { font-size: 12px; color: #999; margin-top: 2px; }
.stat-card.income { background: linear-gradient(135deg, #eef2ff 0%, #dde4ff 100%); border: 1px solid rgba(91,111,232,.15); }
.stat-card.income .stat-icon { background: linear-gradient(135deg, #5B6FE8, #7B8FF8); }
.stat-card.fee { background: linear-gradient(135deg, #fff7e6 0%, #ffe8c2 100%); border: 1px solid rgba(250,140,22,.15); }
.stat-card.fee .stat-icon { background: linear-gradient(135deg, #fa8c16, #ffa940); }
.stat-card.refund-stat { background: linear-gradient(135deg, #fff1f0 0%, #ffccc7 100%); border: 1px solid rgba(245,34,45,.15); }
.stat-card.refund-stat .stat-icon { background: linear-gradient(135deg, #f5222d, #ff4d4f); }
.stat-card.settle { background: linear-gradient(135deg, #e6fffb 0%, #b5f5ec 100%); border: 1px solid rgba(19,194,194,.15); }
.stat-card.settle .stat-icon { background: linear-gradient(135deg, #13c2c2, #36cfc9); }
.stat-card.net { background: linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%); border: 1px solid rgba(82,196,26,.15); }
.stat-card.net .stat-icon { background: linear-gradient(135deg, #52c41a, #73d13d); }

.tab-panel { animation: fadeIn 0.2s; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.content-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.panel-title { font-size: 14px; font-weight: 600; color: #303133; }

.todo-items { display: flex; gap: 16px; }
.todo-item { display: flex; align-items: center; gap: 12px; background: #fafafa; border: 1px solid #f0f0f0; border-radius: 8px; padding: 12px 16px; cursor: pointer; transition: all 0.2s; flex: 1; }
.todo-item:hover { border-color: #5B6FE8; background: #f0f5ff; }
.todo-icon { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.todo-info { display: flex; flex-direction: column; }
.todo-num { font-size: 22px; font-weight: 700; color: #303133; line-height: 1.2; }
.todo-label { font-size: 13px; color: #909399; margin-top: 2px; }
.todo-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px; color: #909399; background: #fafafa; border-radius: 8px; width: 100%; }

.quick-range { display: flex; gap: 8px; }
.quick-btn { padding: 5px 14px; border: 1px solid #dcdfe6; background: #fff; border-radius: 4px; cursor: pointer; font-size: 13px; color: #606266; }
.quick-btn:hover { border-color: #5B6FE8; color: #5B6FE8; }
.quick-btn.active { background: #ecf5ff; border-color: #5B6FE8; color: #5B6FE8; font-weight: 600; }

.trans-stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; margin-bottom: 0; }
.trans-stat { border-radius: 16px; padding: 18px 16px; display: flex; align-items: center; gap: 12px; box-shadow: 0 1px 4px rgba(0,0,0,.06); transition: transform .2s, box-shadow .2s; }
.trans-stat:hover { transform: translateY(-3px); box-shadow: 0 6px 20px rgba(0,0,0,.1); }
.ts-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; color: #fff; }
.ts-body { flex: 1; min-width: 0; }
.ts-label { font-size: 12px; color: #666; margin-bottom: 4px; }
.ts-value { font-size: 18px; font-weight: 700; color: #303133; line-height: 1.2; }
.ts-sub { font-size: 11px; margin-top: 2px; }
.ts-sub.up { color: #52c41a; }
.ts-sub.down { color: #f5222d; }
.trans-stat.income { background: linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%); border: 1px solid rgba(82,196,26,.15); }
.trans-stat.income .ts-icon { background: linear-gradient(135deg, #52c41a, #73d13d); }
.trans-stat.refund { background: linear-gradient(135deg, #fff1f0 0%, #ffccc7 100%); border: 1px solid rgba(245,34,45,.15); }
.trans-stat.refund .ts-icon { background: linear-gradient(135deg, #f5222d, #ff4d4f); }
.trans-stat.net { background: linear-gradient(135deg, #eef2ff 0%, #dde4ff 100%); border: 1px solid rgba(91,111,232,.15); }
.trans-stat.net .ts-icon { background: linear-gradient(135deg, #5B6FE8, #7B8FF8); }
.trans-stat.count { background: linear-gradient(135deg, #e6fffb 0%, #b5f5ec 100%); border: 1px solid rgba(19,194,194,.15); }
.trans-stat.count .ts-icon { background: linear-gradient(135deg, #13c2c2, #36cfc9); }
.trans-stat.month { background: linear-gradient(135deg, #fff7e6 0%, #ffe8c2 100%); border: 1px solid rgba(250,140,22,.15); }
.trans-stat.month .ts-icon { background: linear-gradient(135deg, #fa8c16, #ffa940); }

.money { color: #303133; }
.money.refund { color: #f5222d; }

.dialog-tip { color: #909399; font-size: 13px; margin-top: 8px; }
</style>
