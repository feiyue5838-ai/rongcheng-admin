<template>
  <div class="dashboard">
    <div class="page-header">
      <h2 class="page-title">工作台</h2>
      <el-button text @click="refresh" :loading="loading">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>
    </div>

    <el-row :gutter="20" class="hero-row">
      <el-col :xs="24" :md="16">
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
                  <div class="rb-value">¥0.00</div>
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
                  points="0,60 53,55 107,50 160,42 213,35 267,28 320,20"
                  fill="none"
                  stroke="rgba(255,255,255,0.9)"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <polygon
                  points="0,60 53,55 107,50 160,42 213,35 267,28 320,20 320,80 0,80"
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
      <el-col :xs="24" :md="8">
        <el-card shadow="hover" class="stack-card" @click="$router.push('/orders/seal')">
          <div class="stack-head">
            <span class="stack-label">待处理订单</span>
            <el-icon class="stack-arrow"><ArrowRight /></el-icon>
          </div>
          <div class="stack-value">{{ stats.pendingOrders.value }}</div>
          <div class="stack-bar">
            <div class="stack-bar-fill warning" :style="{ width: pendingPercent + '%' }"></div>
          </div>
          <div class="stack-foot">占总订单 {{ pendingPercent }}%</div>
        </el-card>
        <el-card shadow="hover" class="stack-card" style="margin-top: 12px" @click="$router.push('/reviews')">
          <div class="stack-head">
            <span class="stack-label">待回复评价</span>
            <el-icon class="stack-arrow"><ArrowRight /></el-icon>
          </div>
          <div class="stack-value">{{ stats.pendingReviews.value }}</div>
          <div class="stack-bar">
            <div class="stack-bar-fill" :class="stats.pendingReviews.value > 0 ? 'danger' : 'idle'" :style="{ width: reviewPercent + '%' }"></div>
          </div>
          <div class="stack-foot">{{ stats.pendingReviews.value > 0 ? '需要关注' : '暂无待回' }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="aux-cards">
      <el-col :xs="12" :sm="6" v-for="k in auxKeys" :key="k">
        <div class="aux-card">
          <div class="aux-bar" :style="{ background: stats[k].accent }"></div>
          <el-icon :size="18" :color="stats[k].accent">
            <component :is="stats[k].icon" />
          </el-icon>
          <div class="aux-info">
            <div class="aux-value">{{ stats[k].value }}</div>
            <div class="aux-label">{{ stats[k].label }}</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="16">
        <el-card shadow="hover" class="chart-card">
          <template #header>
            <div class="card-header">
              <span>订单趋势（近7天）</span>
              <el-radio-group v-model="chartType" size="small">
                <el-radio-button value="order">订单量</el-radio-button>
                <el-radio-button value="amount">金额</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div ref="chartRef" style="height: 300px"></div>
        </el-card>
      </el-col>
      <el-col :span="8" style="align-self: flex-start">
        <el-card shadow="hover">
          <template #header><span>快捷操作</span></template>
          <div class="quick-actions">
            <button class="quick-btn" @click="$router.push('/products/seals')">添加印章</button>
            <button class="quick-btn" @click="$router.push('/orders/seal')">刻章订单</button>
            <button class="quick-btn" @click="$router.push('/orders/newspaper')">登报订单</button>
            <button class="quick-btn" @click="$router.push('/reviews')">评价管理</button>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive, watch } from 'vue'
import { getDashboard, getDashboardTrend } from '@/api'
import * as echarts from 'echarts'
import { Refresh, ArrowRight, User, UserFilled, CircleCheck, ChatDotRound } from '@element-plus/icons-vue'

type StatConfig = {
  label: string
  value: number
  icon: string
  accent: string
}

const stats = reactive({
  totalUsers:     { label: '用户总数',   value: 0, icon: 'User',         accent: '#64748b' },
  todayUsers:     { label: '今日新增',   value: 0, icon: 'UserFilled',   accent: '#64748b' },
  completedOrders:{ label: '已完成订单', value: 0, icon: 'CircleCheck',  accent: '#10b981' },
  pendingReviews: { label: '待回复评价', value: 0, icon: 'ChatDotRound', accent: '#ef4444' },
  totalOrders:    { label: '订单总数',   value: 0, icon: 'Document',     accent: '#3b82f6' },
  pendingOrders:  { label: '待处理订单', value: 0, icon: 'Clock',        accent: '#f59e0b' },
  totalRevenue:   { label: '总营收(元)', value: 0, icon: 'Money',        accent: '#10b981' },
  todayOrders:    { label: '今日订单',   value: 0, icon: 'TrendCharts',  accent: '#8b5cf6' },
} as Record<string, StatConfig>)

const revenueBreakdown = reactive({ sealRevenue: 0, newspaperRevenue: 0 })

const auxKeys = ['totalUsers', 'todayUsers', 'completedOrders', 'pendingReviews']

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

function formatMoney(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function animateValue(key: string, target: number, duration = 1100) {
  const start = performance.now()
  const startVal = 0
  function step(now: number) {
    const t = Math.min(1, (now - start) / duration)
    const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
    stats[key].value = Math.round(startVal + (target - startVal) * eased)
    if (t < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

const loading = ref(false)
const chartType = ref<'order' | 'amount'>('order')
const chartRef = ref<HTMLElement>()
let chart: echarts.ECharts | null = null
const trendData = reactive({
  dates: [] as string[],
  seal: [] as number[],
  newspaper: [] as number[],
})

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
  } catch (e) {
    console.error('获取统计数据失败', e)
  } finally {
    setTimeout(() => { loading.value = false }, 300)
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
    legend: { data: ['刻章订单', '登报订单'], right: 0, top: 0 },
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
      { name: '刻章订单', type: 'bar', data: trendData.seal.length ? trendData.seal : [0,0,0,0,0,0,0], itemStyle: { color: '#3b82f6', borderRadius: [6, 6, 0, 0] }, barWidth: 18 },
      { name: '登报订单', type: 'bar', data: trendData.newspaper.length ? trendData.newspaper : [0,0,0,0,0,0,0], itemStyle: { color: '#8b5cf6', borderRadius: [6, 6, 0, 0] }, barWidth: 18 },
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
  background: linear-gradient(135deg, #409eff 0%, #66b1ff 50%, #a0cfff 100%);
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
    background: rgba(134, 239, 172, 0.15);
    color: #86efac;
  }
  &.low {
    background: rgba(251, 191, 36, 0.15);
    color: #fbbf24;
  }
  &.neutral {
    background: rgba(148, 163, 184, 0.2);
    color: #cbd5e1;
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
    &.normal { color: #86efac; }
    &.low { color: #fbbf24; }
    &.neutral { color: #cbd5e1; }
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
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  :deep(.el-card__body) {
    padding: 20px 22px;
  }
  &:hover {
    .stack-arrow { color: #3b82f6; transform: translateX(2px); }
  }
  .stack-head { display: flex; justify-content: space-between; align-items: center; }
  .stack-label { font-size: 13px; color: #64748b; }
  .stack-arrow { color: #cbd5e1; transition: all 0.2s; }
  .stack-value {
    font-size: 38px;
    font-weight: 700;
    color: #0f172a;
    margin-top: 8px;
    line-height: 1;
    letter-spacing: -1px;
    font-feature-settings: "tnum";
    font-variant-numeric: tabular-nums;
  }
  .stack-bar {
    height: 4px;
    background: #f1f5f9;
    border-radius: 2px;
    margin-top: 16px;
    overflow: hidden;
  }
  .stack-bar-fill {
    height: 100%;
    border-radius: 2px;
    transition: width 1.1s ease-out;
    &.warning { background: linear-gradient(90deg, #fbbf24, #f59e0b); }
    &.danger  { background: linear-gradient(90deg, #f87171, #ef4444); }
    &.idle    { background: #e2e8f0; }
  }
  .stack-foot { font-size: 12px; color: #94a3b8; margin-top: 8px; }
}

.aux-cards { margin-bottom: 0; }
.aux-card {
  position: relative;
  background: #fff;
  border: 1px solid #f1f5f9;
  border-radius: 10px;
  padding: 14px 18px 14px 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  overflow: hidden;
  transition: all 0.2s;
  &:hover { border-color: #cbd5e1; box-shadow: 0 4px 12px rgba(0,0,0,0.04); }
  .aux-bar {
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 3px;
  }
  .aux-value {
    font-size: 22px;
    font-weight: 700;
    color: #0f172a;
    line-height: 1.2;
    font-feature-settings: "tnum";
    font-variant-numeric: tabular-nums;
  }
  .aux-label { font-size: 12px; color: #94a3b8; margin-top: 2px; }
}

.chart-card .card-header { display: flex; justify-content: space-between; align-items: center; }

.quick-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  .quick-btn {
    width: 100%;
    padding: 9px 12px;
    background: #fff;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    color: #606266;
    font-size: 14px;
    cursor: pointer;
    text-align: center;
    transition: all 0.2s;
    &:hover {
      color: #409eff;
      border-color: #c6e2ff;
      background: #ecf5ff;
    }
  }
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
</style>
