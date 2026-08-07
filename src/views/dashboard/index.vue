<template>
  <div class="dashboard">
    <div class="page-header">
      <h2 class="page-title">工作台</h2>
      <el-button text @click="refresh" :loading="loading">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>
    </div>

    <!-- 待办条 -->
    <div class="todo-strip">
      <div class="ts-icon"><el-icon><Lightning /></el-icon></div>
      <div class="ts-label">待办</div>
      <div class="ts-chips">
        <span class="chip orange">📋 待处理 <b>{{ stats.pendingOrders.value }}</b></span>
        <span class="chip green">💰 待结算 <b>{{ pendingSettleCount }}</b></span>
        <span class="chip purple">💬 待回复 <b>{{ stats.pendingReviews.value }}</b></span>
      </div>
      <div class="ts-total">共 {{ todoTotal }} 件</div>
    </div>

    <el-row :gutter="14" class="row1">
      <el-col :xs="24" :lg="16">
        <div class="hero-card">
          <div class="hero-grid">
            <div class="hero-text">
              <div class="hero-label">总营收（元）</div>
              <div class="hero-value">
                <span class="currency">¥</span>{{ formatMoney(stats.totalRevenue.value) }}
              </div>
              <el-tooltip content="今日订单数 / 总订单数" placement="top">
                <div class="hero-trend" :class="trendClass">
                  今日已接 {{ stats.todayOrders.value }} 单
                </div>
              </el-tooltip>
              <div class="revenue-breakdown">
                <div class="rb-item">
                  <div class="rb-label">刻章收入</div>
                  <div class="rb-value">¥{{ formatMoney(revenueBreakdown.sealRevenue) }}</div>
                </div>
                <div class="rb-sep"></div>
                <div class="rb-item">
                  <div class="rb-label">登报收入</div>
                  <div class="rb-value">¥{{ formatMoney(revenueBreakdown.newspaperRevenue) }}</div>
                </div>
                <div class="rb-sep"></div>
                <div class="rb-item">
                  <div class="rb-label">代理记账</div>
                  <div class="rb-value">¥{{ formatMoney(revenueBreakdown.bookkeepingRevenue) }}</div>
                </div>
              </div>
            </div>
            <div class="hero-chart">
              <div class="hero-chart-head">
                <span>近 7 天营收</span>
                <span class="hero-chart-delta" :class="trendClass">+{{ trendPercent }}%</span>
              </div>
              <svg class="hero-spark" viewBox="0 0 320 80" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="rgba(255,255,255,0.25)" />
                    <stop offset="100%" stop-color="rgba(255,255,255,0)" />
                  </linearGradient>
                </defs>
                <polyline
                  points="{{ sparklinePoints.poly }}"
                  fill="none"
                  stroke="rgba(255,255,255,0.9)"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <polygon
                  points="{{ sparklinePoints.fill }}"
                  fill="url(#sparkFill)"
                />
              </svg>
            </div>
          </div>
          <div class="hero-subs">
            <div class="hero-sub">
              <div class="hero-sub-value">{{ stats.totalOrders.value }}</div>
              <div class="hero-sub-label">订单总数</div>
            </div>
            <div class="hero-sub">
              <div class="hero-sub-value">{{ stats.todayOrders.value }}</div>
              <div class="hero-sub-label">今日订单</div>
            </div>
            <div class="hero-sub">
              <div class="hero-sub-value">{{ stats.completedOrders.value }}</div>
              <div class="hero-sub-label">已完成</div>
            </div>
            <div class="hero-sub">
              <div class="hero-sub-value">¥{{ avgOrderValue }}</div>
              <div class="hero-sub-label">客单价</div>
            </div>
          </div>
        </div>
      </el-col>
      <el-col :xs="24" :lg="8">
        <el-card shadow="hover" class="today-card-panel">
          <template #header><span>今日要事</span></template>
          <div class="today-grid">
            <div class="today-cell orange" @click="$router.push('/orders/seal')">
              <div class="tc-label">待处理</div>
              <div class="tc-val tv-o">{{ stats.pendingOrders.value }}</div>
              <div class="tc-sub">待分配订单</div>
            </div>
            <div class="today-cell green" @click="$router.push('/finance?tab=settlement')">
              <div class="tc-label">待结算</div>
              <div class="tc-val tv-g">{{ pendingSettleCount }}</div>
              <div class="tc-sub">¥{{ formatMoney(pendingSettleAmount) }}</div>
            </div>
            <div class="today-cell purple" @click="$router.push('/reviews')">
              <div class="tc-label">待回复</div>
              <div class="tc-val tv-p">{{ stats.pendingReviews.value }}</div>
              <div class="tc-sub">待回复评价</div>
            </div>
            <div class="today-cell blue" @click="$router.push('/orders/seal')">
              <div class="tc-label">今日订单</div>
              <div class="tc-val tv-b">{{ stats.todayOrders.value }}</div>
              <div class="tc-sub">今日新增</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Row2: 服务商状态 + 服务商排行 + 快捷操作 -->
    <el-row :gutter="12" class="row2">
      <!-- 服务商状态 -->
      <el-col :xs="24" :lg="8">
        <el-card shadow="hover" class="outlet-panel">
          <template #header>
            <div class="panel-head">
              <span>服务商状态</span>
              <span v-if="outletAlertCount" class="head-badge">{{ outletAlertCount }}</span>
              <span class="head-more" @click="$router.push('/outlets/list')">全部 ›</span>
            </div>
          </template>
          <div class="outlet-list">
            <div
              v-for="o in outletsWithAlert"
              :key="o.id"
              class="outlet-row has-alert"
              @click="$router.push('/finance?tab=settlement')"
            >
              <div class="outlet-row-top">
                <div class="outlet-avatar">{{ o.avatarText }}</div>
                <div class="outlet-name">{{ o.name }}</div>
                <div class="outlet-status" :class="o.status === 1 ? 'on' : 'off'">{{ o.status === 1 ? '●营业' : '○休息' }}</div>
              </div>
              <div class="outlet-meta">
                <span class="outlet-bt" v-for="(b, i) in o.bizList" :key="i">{{ bizLabel(b) }}</span>
              </div>
              <div class="outlet-stats">
                <div class="os">
                  <div class="os-lbl">订单</div>
                  <div class="os-val ok">{{ o.totalOrders }}</div>
                </div>
                <div class="os">
                  <div class="os-lbl">待结算</div>
                  <div class="os-val alert">¥{{ formatMoney(o.pendingAmount) }}</div>
                </div>
              </div>
              <div class="outlet-alert">
                <el-icon><WarningFilled /></el-icon>
                待确认结算
              </div>
            </div>
            <div v-if="!outletsWithAlert.length" class="outlet-empty">暂无待办网点</div>
          </div>
        </el-card>
      </el-col>

      <!-- 服务商订单排行 -->
      <el-col :xs="24" :lg="8">
        <el-card shadow="hover" class="rank-panel">
          <template #header>
            <div class="panel-head">
              <span>服务商排行</span>
              <span class="head-more" @click="$router.push('/outlets/list')">本月 ›</span>
            </div>
          </template>
          <div class="rank-list">
            <div v-for="(r, i) in outletRanking" :key="r.id" class="rank-item">
              <div class="rank-num" :class="i < 3 ? 'rank-' + (i + 1) : 'rank-default'">{{ i + 1 }}</div>
              <div class="rank-info">
                <div class="rank-name">{{ r.name }}</div>
                <div class="rank-meta">{{ r.bizText }}</div>
              </div>
              <div class="rank-value">
                <div class="rank-orders">{{ r.totalOrders }}</div>
                <div class="rank-label">订单</div>
              </div>
            </div>
            <div v-if="!outletRanking.length" class="outlet-empty">暂无网点数据</div>
          </div>
        </el-card>
      </el-col>

      <!-- 快捷操作 -->
      <el-col :xs="24" :lg="8">
        <el-card shadow="hover" class="quick-card">
          <template #header><span>快捷操作</span></template>
          <div class="quick-actions">
            <button class="quick-btn qa-seal" @click="$router.push('/finance?tab=settlement')">
              <span class="qa-icon"><el-icon><Money /></el-icon></span><span class="qa-label">确认结算</span>
            </button>
            <button class="quick-btn qa-order" @click="$router.push('/products/seals')">
              <span class="qa-icon">+</span><span class="qa-label">添加印章</span>
            </button>
            <button class="quick-btn qa-news" @click="$router.push('/orders/seal')">
              <span class="qa-icon">▤</span><span class="qa-label">刻章订单</span>
            </button>
            <button class="quick-btn qa-review" @click="$router.push('/orders/newspaper')">
              <span class="qa-icon">▤</span><span class="qa-label">登报订单</span>
            </button>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Row3: Stack卡 + Aux卡 -->
    <el-row :gutter="12" class="row3">
      <el-col :xs="24" :lg="8">
        <div class="stack-card" @click="$router.push('/orders/seal')">
          <div class="stack-icon">
            <el-icon><Clock /></el-icon>
          </div>
          <div class="stack-body">
            <div class="stack-label">待处理订单</div>
            <div class="stack-value">{{ stats.pendingOrders.value }}</div>
            <div class="stack-bar">
              <div class="stack-bar-fill warning" :style="{ width: pendingPercent + '%' }"></div>
            </div>
            <div class="stack-foot">占总订单 {{ pendingPercent }}%</div>
          </div>
          <el-icon class="stack-arrow"><ArrowRight /></el-icon>
        </div>
        <div class="stack-card" style="margin-top: 12px" @click="$router.push('/reviews')">
          <div class="stack-icon danger">
            <el-icon><ChatDotRound /></el-icon>
          </div>
          <div class="stack-body">
            <div class="stack-label">待回复评价</div>
            <div class="stack-value">{{ stats.pendingReviews.value }}</div>
            <div class="stack-bar">
              <div class="stack-bar-fill" :class="stats.pendingReviews.value > 0 ? 'danger' : 'idle'" :style="{ width: reviewPercent + '%' }"></div>
            </div>
            <div class="stack-foot">{{ stats.pendingReviews.value > 0 ? '需要关注' : '暂无待回' }}</div>
          </div>
          <el-icon class="stack-arrow"><ArrowRight /></el-icon>
        </div>
      </el-col>
      <el-col :xs="24" :lg="16">
        <el-card shadow="hover" class="aux-panel">
          <div class="aux-grid">
            <div v-for="k in auxKeys" :key="k" class="aux-card" :style="{ background: 'linear-gradient(135deg, ' + stats[k].bgLight + ' 0%, ' + stats[k].bgDark + ' 100%)', border: '1px solid ' + stats[k].bgBorder }">
              <div class="aux-icon" :style="{ background: 'linear-gradient(135deg, ' + stats[k].accent + ', ' + stats[k].accentEnd + ')' }">
                <el-icon :size="16" color="#fff">
                  <component :is="stats[k].icon" />
                </el-icon>
              </div>
              <div class="aux-info">
                <div class="aux-value">{{ stats[k].value }}</div>
                <div class="aux-label">{{ stats[k].label }}</div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Row4: 趋势图 -->
    <el-row class="row4">
      <el-col :span="24">
        <el-card shadow="hover" class="chart-card">
          <template #header>
            <div class="chart-header">
              <span class="chart-title">近 7 天趋势</span>
              <el-radio-group v-model="chartType" size="small">
                <el-radio-button value="order">订单量</el-radio-button>
                <el-radio-button value="amount">营收</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div ref="chartRef" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive, watch } from 'vue'
import { getDashboard, getDashboardTrend, getOutletsAPI, getSettlementRecords } from '@/api'
import * as echarts from 'echarts'
import { Refresh, ArrowRight, User, UserFilled, CircleCheck, ChatDotRound, Clock, Money, Document, Lightning, WarningFilled } from '@element-plus/icons-vue'

type StatConfig = {
  label: string
  value: number
  icon: string
  accent: string
  accentEnd: string
  bgLight: string
  bgDark: string
  bgBorder: string
}
const stats = reactive({
  totalUsers:     { label: '用户总数',   value: 0, icon: 'User',         accent: '#5B6FE8', accentEnd: '#7B8FF8', bgLight: '#eef2ff', bgDark: '#dde4ff', bgBorder: 'rgba(91,111,232,.15)' },
  todayUsers:     { label: '今日新增',   value: 0, icon: 'UserFilled',   accent: '#13c2c2', accentEnd: '#36cfc9', bgLight: '#e6fffb', bgDark: '#b5f5ec', bgBorder: 'rgba(19,194,194,.15)' },
  completedOrders:{ label: '已完成订单', value: 0, icon: 'CircleCheck',  accent: '#52c41a', accentEnd: '#73d13d', bgLight: '#f6ffed', bgDark: '#d9f7be', bgBorder: 'rgba(82,196,26,.15)' },
  pendingReviews: { label: '待回复评价', value: 0, icon: 'ChatDotRound', accent: '#f5222d', accentEnd: '#ff4d4f', bgLight: '#fff1f0', bgDark: '#ffccc7', bgBorder: 'rgba(245,34,45,.15)' },
  totalOrders:    { label: '订单总数',   value: 0, icon: 'Document',     accent: '#5B6FE8', accentEnd: '#7B8FF8', bgLight: '#eef2ff', bgDark: '#dde4ff', bgBorder: 'rgba(91,111,232,.15)' },
  pendingOrders:  { label: '待处理订单', value: 0, icon: 'Clock',        accent: '#f5222d', accentEnd: '#ff4d4f', bgLight: '#fff1f0', bgDark: '#ffccc7', bgBorder: 'rgba(245,34,45,.15)' },
  totalRevenue:   { label: '总营收(元)', value: 0, icon: 'Money',        accent: '#5B6FE8', accentEnd: '#7B8FF8', bgLight: '#eef2ff', bgDark: '#dde4ff', bgBorder: 'rgba(91,111,232,.15)' },
  todayOrders:    { label: '今日订单',   value: 0, icon: 'Document',     accent: '#52c41a', accentEnd: '#73d13d', bgLight: '#f6ffed', bgDark: '#d9f7be', bgBorder: 'rgba(82,196,26,.15)' },
})
const revenueBreakdown = reactive({
  sealRevenue: 0,
  newspaperRevenue: 0,
  bookkeepingRevenue: 0,
})

const auxKeys = ['totalUsers', 'todayUsers', 'completedOrders', 'pendingReviews'] as const

const pendingPercent = computed(() => {
  const t = stats.totalOrders.value || 1
  return Math.min(100, Math.round((stats.pendingOrders.value / t) * 100))
})

const reviewPercent = computed(() => {
  if (stats.pendingReviews.value === 0) return 0
  return Math.min(100, stats.pendingReviews.value * 15)
})

const trendPercent = computed(() => {
  if (stats.totalOrders.value === 0) return 0
  return Math.round((stats.todayOrders.value / stats.totalOrders.value) * 100)
})

const trendClass = computed(() => {
  const p = trendPercent.value
  if (p === 0) return 'neutral'
  if (p < 5) return 'low'
  return 'normal'
})

const avgOrderValue = computed(() => {
  if (stats.totalOrders.value === 0) return '0.00'
  return formatMoney(stats.totalRevenue.value / stats.totalOrders.value)
})

const loading = ref(false)
const chartType = ref<'order' | 'amount'>('order')
const chartRef = ref<HTMLElement>()
let chart: echarts.ECharts | null = null
const trendData = reactive({
  dates: [] as string[],
  seal: [] as number[],
  newspaper: [] as number[],
  bookkeeping: [] as number[],
})

// ── 服务商监控（网点 + 待结算） ──
const outletList = ref<any[]>([])
const pendingSettlements = ref<any[]>([])

const pendingSettleCount = computed(() => pendingSettlements.value.length)
const pendingSettleAmount = computed(() =>
  pendingSettlements.value.reduce((s: number, r: any) => s + (Number(r.outletAmount ?? r.outlet_amount ?? 0)), 0)
)
const outletsWithAlert = computed(() => {
  const ids = new Set(pendingSettlements.value.map((r: any) => r.outletId))
  return outletList.value
    .filter((o: any) => ids.has(o.id))
    .map((o: any) => ({
      id: o.id,
      name: o.name,
      avatarText: (o.name || '').replace('蓉城刻章', '').slice(0, 1) || '店',
      status: o.status,
      totalOrders: o.totalOrders || 0,
      pendingAmount: pendingSettlements.value
        .filter((r: any) => r.outletId === o.id)
        .reduce((s: number, r: any) => s + (Number(r.outletAmount ?? r.outlet_amount ?? 0)), 0),
      bizList: o.businessTypes || [],
    }))
})
const outletAlertCount = computed(() => outletsWithAlert.value.length)
const outletRanking = computed(() => {
  return [...outletList.value]
    .sort((a: any, b: any) => (b.totalOrders || 0) - (a.totalOrders || 0))
    .slice(0, 3)
    .map((o: any) => ({
      id: o.id,
      name: o.name,
      totalOrders: o.totalOrders || 0,
      bizText: (o.businessTypes || []).map((b: string) => bizLabel(b)).join('·'),
    }))
})
const todoTotal = computed(
  () => stats.pendingOrders.value + pendingSettleCount.value + stats.pendingReviews.value
)

function bizLabel(b: any) {
  const map: Record<string, string> = { seal: '刻章', newspaper: '登报', bookkeeping: '记账' }
  if (typeof b === 'string') return map[b] || b
  if (b && typeof b === 'object') return b.name || map[b.code] || b.code || '业务'
  return '业务'
}

// 动态生成 hero sparkline SVG points（基于后端 /dashboard/trend 返回的 trendData.seal）
const sparklinePoints = computed(() => {
  const raw = trendData.seal
  if (!raw || raw.length === 0) {
    const flat = '0,40 53,40 107,40 160,40 213,40 267,40 320,40'
    return { poly: flat, fill: flat + ' 320,80 0,80' }
  }
  const max = Math.max(...raw, 1)
  const W = 320, H = 60, n = raw.length
  const pts = raw.map((v, i) => {
    const x = (i * W / Math.max(n - 1, 1)).toFixed(1)
    const y = (H - (v / max) * H).toFixed(1)
    return x + ',' + y
  })
  const poly = pts.join(' ')
  return { poly: poly, fill: poly + ' ' + W + ',' + H + ' 0,' + H }
})

function formatMoney(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function animateValue(key: string, target: number, duration = 1100) {
  const start = performance.now()
  const startVal = 0
  function step(now: number) {
    const t = Math.min(1, (now - start) / duration)
    const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
    ;(stats as any)[key].value = Math.round(startVal + (target - startVal) * eased)
    if (t < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

async function fetchData() {
  loading.value = true
  try {
    const res: any = await getDashboard()
    const data = res.data ?? res
    animateValue('totalRevenue', data.totalRevenue ?? 0, 1300)
    animateValue('totalOrders', data.totalOrders ?? 0)
    animateValue('pendingOrders', data.pendingOrders ?? 0)
    animateValue('todayOrders', data.todayOrders ?? 0)
    animateValue('completedOrders', data.completedOrders ?? 0)
    stats.totalUsers.value = data.totalUsers ?? 0
    stats.todayUsers.value = data.todayUsers ?? 0
    stats.pendingReviews.value = data.pendingReviews ?? 0
    revenueBreakdown.sealRevenue = data._detail?.sealRevenue ?? 0
    revenueBreakdown.newspaperRevenue = data._detail?.newspaperRevenue ?? 0
    revenueBreakdown.bookkeepingRevenue = data._detail?.bookkeepingRevenue ?? 0
    await loadOutlets()
  } catch (e) {
    console.error('获取统计数据失败', e)
  } finally {
    setTimeout(() => { loading.value = false }, 300)
  }
}

async function loadOutlets() {
  try {
    const oRes: any = await getOutletsAPI({ page: 1, pageSize: 100 })
    const oData = oRes.data ?? oRes
    outletList.value = oData.list || []
    const sRes: any = await getSettlementRecords({ status: 1, pageSize: 100 })
    const sData = sRes.data ?? sRes
    pendingSettlements.value = sData.items || []
  } catch (e) {
    console.error('获取网点/结算数据失败', e)
  }
}

function refresh() {
  fetchData()
  fetchTrend()
}

async function fetchTrend() {
  try {
    const res: any = await getDashboardTrend(chartType.value, 7)
    const data = res.data ?? res
    trendData.dates = data.dates || []
    trendData.seal = data.seal || []
    trendData.newspaper = data.newspaper || []
    trendData.bookkeeping = data.bookkeeping || []
    updateChart()
  } catch (e) {
    console.error('获取趋势数据失败', e)
  }
}

function initChart() {
  if (!chartRef.value) return
  chart = echarts.init(chartRef.value)
  updateChart()
}

function updateChart() {
  if (!chart) return
  const isAmount = chartType.value === 'amount'
  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        let html = params[0]?.axisValue + '<br/>'
        params.forEach((p: any) => {
          const val = isAmount ? '¥' + p.value.toFixed(2) : p.value
          html += `${p.marker} ${p.seriesName}: ${val}<br/>`
        })
        return html
      },
    },
    legend: { data: ['刻章订单', '登报订单', '代理记账'], right: 0, top: 0 },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: trendData.dates.length ? trendData.dates : ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#94a3b8' },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
      axisLabel: {
        color: '#94a3b8',
        formatter: (v: number) => isAmount ? '¥' + (v >= 1000 ? (v/1000).toFixed(1) + 'k' : v) : v,
      },
    },
    series: [
      { name: '刻章订单', type: 'bar', data: trendData.seal.length ? trendData.seal : [0,0,0,0,0,0,0], itemStyle: { color: '#5B6FE8', borderRadius: [6, 6, 0, 0] }, barWidth: 14 },
      { name: '登报订单', type: 'bar', data: trendData.newspaper.length ? trendData.newspaper : [0,0,0,0,0,0,0], itemStyle: { color: '#52c41a', borderRadius: [6, 6, 0, 0] }, barWidth: 14 },
      { name: '代理记账', type: 'bar', data: trendData.bookkeeping.length ? trendData.bookkeeping : [0,0,0,0,0,0,0], itemStyle: { color: '#fa8c16', borderRadius: [6, 6, 0, 0] }, barWidth: 14 },
    ],
  }
  chart.setOption(option, true)
}

watch(chartType, () => {
  fetchTrend()
})

onMounted(() => {
  fetchData()
  initChart()
  fetchTrend()
})
</script>

<style lang="scss" scoped>
.dashboard { padding: 0; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-title { font-size: 22px; font-weight: 600; color: #0f172a; margin: 0; letter-spacing: -0.3px; }

.hero-row { margin-bottom: 16px; }
.hero-card {
  position: relative;
  overflow: hidden;
  border-radius: 16px;
  padding: 28px 32px;
  background: linear-gradient(135deg, #5B6FE8 0%, #7986f5 50%, #a0adff 100%);
  color: #fff;
  box-shadow: 0 4px 20px rgba(30, 41, 59, 0.15);
  transition: transform 0.3s, box-shadow 0.3s;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(30, 41, 59, 0.22);
  }
  &::after {
    content: '';
    position: absolute;
    top: 0; left: -75%;
    width: 50%; height: 100%;
    background: linear-gradient(120deg, transparent, rgba(255,255,255,0.1), transparent);
    transform: skewX(-20deg);
    transition: left 0.9s;
    pointer-events: none;
  }
  &:hover::after { left: 125%; }
}
.hero-grid {
  display: grid;
  grid-template-columns: 1fr 1.3fr;
  gap: 24px;
  align-items: center;
  position: relative;
  z-index: 1;
}
.hero-text { min-width: 0; }
.hero-label { font-size: 13px; opacity: 0.7; letter-spacing: 0.3px; }
.hero-value {
  font-size: 56px;
  font-weight: 700;
  line-height: 1.05;
  margin-top: 8px;
  letter-spacing: -1.5px;
  font-feature-settings: "tnum";
  font-variant-numeric: tabular-nums;
  .currency {
    font-size: 32px;
    margin-right: 4px;
    opacity: 0.85;
  }
}
.hero-trend {
  display: inline-block;
  margin-top: 12px;
  padding: 5px 12px;
  font-size: 12px;
  border-radius: 999px;
  cursor: help;
  &.normal {
    background: rgba(82, 196, 26, 0.15);
    color: #52c41a;
  }
  &.low {
    background: rgba(245, 34, 45, 0.15);
    color: #f5222d;
  }
  &.neutral {
    background: rgba(19, 194, 194, 0.15);
    color: #13c2c2;
  }
}
.hero-chart {
  padding-left: 24px;
  border-left: 1px solid rgba(255,255,255,0.1);
  &-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    opacity: 0.6;
    margin-bottom: 8px;
  }
  &-delta {
    opacity: 1;
    font-weight: 500;
    &.normal { color: #52c41a; }
    &.low { color: #f5222d; }
    &.neutral { color: #13c2c2; }
  }
}
.hero-spark {
  width: 100%;
  height: 80px;
  display: block;
}
.hero-subs {
  display: flex;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid rgba(255,255,255,0.1);
  position: relative;
  z-index: 1;
}
.hero-sub {
  flex: 1;
  padding: 0 20px;
  border-right: 1px solid rgba(255,255,255,0.08);
  &:first-child { padding-left: 0; }
  &:last-child { border-right: none; padding-right: 0; }
  &-value {
    font-size: 22px;
    font-weight: 600;
    line-height: 1.2;
    font-feature-settings: "tnum";
    font-variant-numeric: tabular-nums;
  }
  &-label { font-size: 12px; opacity: 0.6; margin-top: 4px; }
}

.stack-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  border-radius: 16px;
  cursor: pointer;
  transition: transform .2s, box-shadow .2s;
  background: linear-gradient(135deg, #fff1f0 0%, #ffccc7 100%);
  border: 1px solid rgba(245,34,45,.15);
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 6px 20px rgba(0,0,0,.1);
  }
  .stack-icon {
    width: 46px;
    height: 46px;
    border-radius: 12px;
    background: linear-gradient(135deg, #f5222d, #ff4d4f);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    :deep(.el-icon) { font-size: 20px; color: #fff; }
  }
  .stack-icon.danger {
    background: linear-gradient(135deg, #f5222d, #ff4d4f);
  }
  .stack-body { flex: 1; min-width: 0; }
  .stack-label { font-size: 13px; color: #666; }
  .stack-value {
    font-size: 32px;
    font-weight: 700;
    color: #303133;
    margin-top: 4px;
    line-height: 1;
    letter-spacing: -1px;
    font-feature-settings: "tnum";
    font-variant-numeric: tabular-nums;
  }
  .stack-bar {
    height: 4px;
    background: #f1f5f9;
    border-radius: 2px;
    margin-top: 10px;
    overflow: hidden;
  }
  .stack-bar-fill {
    height: 100%;
    border-radius: 2px;
    transition: width 1.1s ease-out;
    &.warning { background: linear-gradient(90deg, #f5222d, #ff4d4f); }
    &.danger  { background: linear-gradient(90deg, #f87171, #ef4444); }
    &.idle    { background: #e2e8f0; }
  }
  .stack-foot { font-size: 12px; color: #999; margin-top: 6px; }
  .stack-arrow { color: #f5222d; transition: all .2s; flex-shrink: 0; }
  &:hover .stack-arrow { transform: translateX(2px); }
}

.aux-cards { margin-bottom: 0; }
.aux-card {
  border-radius: 16px;
  padding: 16px 18px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
  transition: transform .2s, box-shadow .2s;
  overflow: hidden;
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 6px 20px rgba(0,0,0,.1);
  }
  .aux-icon {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .aux-info { flex: 1; min-width: 0; }
  .aux-value {
    font-size: 20px;
    font-weight: 700;
    color: #303133;
    line-height: 1.2;
    font-feature-settings: "tnum";
    font-variant-numeric: tabular-nums;
  }
  .aux-label { font-size: 12px; color: #666; margin-top: 2px; }
}
.revenue-breakdown {
  margin-top: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  max-width: 360px;
}

.rb-item {
  flex: 1;
  text-align: center;
  min-width: 0;
}

.rb-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 4px;
  white-space: nowrap;
}

.rb-value {
  font-size: 15px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.rb-sep {
  width: 1px;
  height: 28px;
  background: rgba(255, 255, 255, 0.2);
  flex-shrink: 0;
}


/* 待办条 */
.todo-strip {
  display: flex; align-items: center; gap: 12px; padding: 12px 16px; margin-bottom: 16px;
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
  border: 1px solid #fde68a; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,.06);
}
.ts-icon {
  width: 30px; height: 30px; background: #fff; border-radius: 8px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center; color: #d97706; font-size: 16px;
  box-shadow: 0 1px 2px rgba(0,0,0,.08);
}
.ts-label { font-size: 13px; font-weight: 600; color: #92400e; flex-shrink: 0; }
.ts-chips { display: flex; gap: 8px; flex: 1; flex-wrap: wrap; }
.chip {
  display: inline-flex; align-items: center; gap: 4px; padding: 4px 12px; border-radius: 16px;
  font-size: 12px; font-weight: 500; cursor: pointer; border: 1px solid transparent;
  transition: filter .15s, transform .15s;
}
.chip:hover { filter: brightness(.96); transform: translateY(-1px); }
.chip b { font-weight: 700; }
.chip.orange { background: #fff7ed; color: #ea580c; border-color: #fed7aa; }
.chip.green { background: #f0fdf4; color: #16a34a; border-color: #bbf7d0; }
.chip.purple { background: #f5f3ff; color: #7c3aed; border-color: #ddd6fe; }
.ts-total { font-size: 12px; color: #92400e; font-weight: 600; flex-shrink: 0; }

/* 行间距 */
.row1, .row2, .row3 { margin-bottom: 14px; }
.row4 { margin-top: 0; }

/* 今日要事 */
.today-card-panel { border-radius: 16px; }
.today-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 16px 4px 4px; }
.today-cell {
  background: #f8fafc; border: 1px solid #eef2f7; border-radius: 12px; padding: 16px;
  cursor: pointer; position: relative; overflow: hidden;
  transition: transform .18s, box-shadow .18s;
}
.today-cell:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(15,23,42,.1); }
.today-cell::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; }
.today-cell.orange::before { background: #ea580c; }
.today-cell.green::before { background: #16a34a; }
.today-cell.purple::before { background: #7c3aed; }
.today-cell.blue::before { background: #2563eb; }
.tc-label { font-size: 12px; color: #64748b; font-weight: 500; }
.tc-val { font-size: 30px; font-weight: 800; line-height: 1; margin-top: 6px; letter-spacing: -1px; font-variant-numeric: tabular-nums; }
.tv-o { color: #ea580c; } .tv-g { color: #16a34a; } .tv-p { color: #7c3aed; } .tv-b { color: #2563eb; }
.tc-sub { font-size: 11px; color: #9ca3af; margin-top: 4px; }

/* 面板头 */
.panel-head { display: flex; align-items: center; gap: 8px; width: 100%; }
.head-badge {
  display: inline-flex; align-items: center; padding: 1px 7px; border-radius: 10px;
  font-size: 10.5px; font-weight: 600; background: #fff1f0; color: #dc2626; border: 1px solid #fecaca;
}
.head-more { margin-left: auto; font-size: 12px; color: #2563eb; cursor: pointer; }
.head-more:hover { text-decoration: underline; }

/* 服务商状态 */
.outlet-panel, .rank-panel, .aux-panel { border-radius: 16px; }
.outlet-list { display: flex; flex-direction: column; gap: 8px; padding: 12px 4px 4px; }
.outlet-row {
  display: flex; flex-direction: column; gap: 6px; padding: 10px 12px;
  background: #f8fafc; border: 1px solid #eef2f7; border-radius: 10px; cursor: pointer; transition: all .15s;
}
.outlet-row:hover { border-color: #2563eb; background: #eff6ff; }
.outlet-row.has-alert { border-color: #fecaca; background: #fff8f8; }
.outlet-row.has-alert:hover { border-color: #dc2626; background: #fff5f5; }
.outlet-row-top { display: flex; align-items: center; gap: 8px; }
.outlet-avatar {
  width: 32px; height: 32px; border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex; align-items: center; justify-content: center; font-size: 12px; color: #fff; font-weight: 700; flex-shrink: 0;
}
.outlet-name { font-size: 13px; font-weight: 600; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.outlet-status { font-size: 11px; flex-shrink: 0; }
.outlet-status.on { color: #16a34a; } .outlet-status.off { color: #9ca3af; }
.outlet-meta { display: flex; gap: 4px; flex-wrap: wrap; }
.outlet-bt { padding: 1px 6px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 10px; color: #64748b; }
.outlet-stats { display: flex; gap: 12px; margin-top: 2px; }
.os { text-align: center; flex: 1; }
.os-lbl { font-size: 10px; color: #9ca3af; }
.os-val { font-size: 14px; font-weight: 700; margin-top: 2px; font-variant-numeric: tabular-nums; }
.os-val.alert { color: #dc2626; } .os-val.ok { color: #16a34a; }
.outlet-alert {
  display: flex; align-items: center; gap: 4px; padding: 3px 8px;
  background: #fff1f0; border: 1px solid #fecaca; border-radius: 6px;
  font-size: 11px; color: #dc2626; font-weight: 600;
}
.outlet-empty { text-align: center; color: #9ca3af; font-size: 12px; padding: 24px 0; }

/* 服务商排行 */
.rank-list { display: flex; flex-direction: column; gap: 8px; padding: 12px 4px 4px; }
.rank-item { display: flex; align-items: center; gap: 12px; padding: 12px; background: #f8fafc; border: 1px solid #eef2f7; border-radius: 10px; }
.rank-num { width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; color: #fff; }
.rank-1 { background: linear-gradient(135deg, #fbbf24, #f59e0b); }
.rank-2 { background: linear-gradient(135deg, #9ca3af, #6b7280); }
.rank-3 { background: linear-gradient(135deg, #f97316, #ea580c); }
.rank-default { background: #cbd5e1; }
.rank-info { flex: 1; min-width: 0; }
.rank-name { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rank-meta { font-size: 11px; color: #9ca3af; margin-top: 2px; }
.rank-value { text-align: right; flex-shrink: 0; }
.rank-orders { font-size: 20px; font-weight: 800; color: #1f2937; line-height: 1; font-variant-numeric: tabular-nums; }
.rank-label { font-size: 10px; color: #9ca3af; margin-top: 2px; }

/* Aux 网格 */
.aux-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; padding: 16px; }

</style>
<style scoped lang="css">
.quick-card { border-radius: 16px; border: 1px solid var(--app-split); }
.quick-card :deep(.el-card__header) { padding: 14px 18px; border-bottom: 1px solid var(--app-split); }
.quick-card :deep(.el-card__header span) { font-weight: 600; color: #1f2937; }
.quick-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 16px 4px 4px; }
.quick-btn {
  display: flex; align-items: center; gap: 10px; padding: 14px 16px; border: none; cursor: pointer;
  border-radius: 12px; color: #fff; font-size: 14px; font-weight: 500; letter-spacing: .3px;
  transition: transform .2s ease, box-shadow .2s ease, filter .2s ease;
}
.quick-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 18px rgba(15,23,42,.12); filter: brightness(1.05); }
.quick-btn:active { transform: translateY(0); }
.quick-btn .qa-icon { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; background: rgba(255,255,255,.22); border-radius: 8px; font-size: 16px; font-weight: 600; }
.quick-btn .qa-label { line-height: 1; }
.qa-seal   { background: linear-gradient(135deg, #5B6FE8 0%, #7B8FF8 100%); }
.qa-order  { background: linear-gradient(135deg, #13c2c2 0%, #36cfc9 100%); }
.qa-news   { background: linear-gradient(135deg, #52c41a 0%, #73d13d 100%); }
.qa-review { background: linear-gradient(135deg, #fa8c16 0%, #ffa940 100%); }

.chart-card { border-radius: 16px; }
.chart-header { display: flex; justify-content: space-between; align-items: center; }
.chart-title { font-weight: 600; font-size: 15px; color: #1f2937; }
.chart-container { height: 280px; }
</style>
