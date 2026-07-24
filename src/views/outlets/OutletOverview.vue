<template>
  <div class="overview-page">
    <div class="page-header">
      <div>
        <h2>全网点总览</h2>
        <div class="update-time" v-if="overview">
          数据更新于 {{ updateTime }} · 自动刷新
        </div>
      </div>
      <el-button :loading="loading" @click="loadData">
        <el-icon><Refresh /></el-icon> 刷新
      </el-button>
    </div>

    <div v-if="loading && !overview" class="empty-state">{{ L.loading }}...</div>

    <template v-else-if="overview">
      <!-- 顶部 5 张主指标卡 -->
      <div class="summary-grid">
        <div class="summary-card">
          <div class="card-icon" style="background: linear-gradient(135deg, #5B6FE8, #7B8FF8);">
            <el-icon><OfficeBuilding /></el-icon>
          </div>
          <div class="card-body">
            <div class="sum-value">{{ overview.summary.totalOutlets }}</div>
            <div class="sum-label">网点总数</div>
            <div class="sum-sub">含 {{ overview.summary.inactiveOutlets }} 家停用</div>
          </div>
        </div>

        <div class="summary-card">
          <div class="card-icon" style="background: linear-gradient(135deg, #52c41a, #73d13d);">
            <el-icon><CircleCheck /></el-icon>
          </div>
          <div class="card-body">
            <div class="sum-value">{{ overview.summary.activeOutlets }}</div>
            <div class="sum-label">启用网点</div>
            <div class="sum-sub">营业占比 {{ activeRatio }}%</div>
          </div>
        </div>

        <div class="summary-card">
          <div class="card-icon" style="background: linear-gradient(135deg, #fa8c16, #ffa940);">
            <el-icon><Document /></el-icon>
          </div>
          <div class="card-body">
            <div class="sum-value">{{ overview.summary.totalOrders }}</div>
            <div class="sum-label">累计订单</div>
            <div class="sum-sub">已派发到店</div>
          </div>
        </div>

        <div class="summary-card">
          <div class="card-icon" style="background: linear-gradient(135deg, #f5222d, #ff4d4f);">
            <el-icon><Bell /></el-icon>
          </div>
          <div class="card-body">
            <div class="sum-value">{{ overview.summary.totalPending }}</div>
            <div class="sum-label">待接单</div>
            <div class="sum-sub">占累计 {{ pendingRatio }}%</div>
          </div>
        </div>

        <div class="summary-card">
          <div class="card-icon" style="background: linear-gradient(135deg, #13c2c2, #36cfc9);">
            <el-icon><TrendCharts /></el-icon>
          </div>
          <div class="card-body">
            <div class="sum-value">{{ overview.summary.todayTotal }}</div>
            <div class="sum-label">今日新增</div>
            <div class="sum-sub">当日分配订单</div>
          </div>
        </div>
      </div>

      <!-- 第二行 4 张效率指标 -->
      <div class="kpi-grid">
        <div class="kpi-item">
          <div class="kpi-icon" style="color:#5B6FE8"><el-icon><DataAnalysis /></el-icon></div>
          <div>
            <div class="kpi-label">接单率</div>
            <div class="kpi-value">{{ acceptRatio }}%</div>
            <div class="kpi-foot">已接 {{ overview.summary.totalOrders - overview.summary.totalPending }} / {{ overview.summary.totalOrders }}</div>
          </div>
        </div>
        <div class="kpi-item">
          <div class="kpi-icon" style="color:#f5222d"><el-icon><Warning /></el-icon></div>
          <div>
            <div class="kpi-label">待接占比</div>
            <div class="kpi-value">{{ pendingRatio }}%</div>
            <div class="kpi-foot">{{ overview.summary.totalPending }} 单待处理</div>
          </div>
        </div>
        <div class="kpi-item">
          <div class="kpi-icon" style="color:#52c41a"><el-icon><CircleCheckFilled /></el-icon></div>
          <div>
            <div class="kpi-label">完成率</div>
            <div class="kpi-value">{{ doneRatio }}%</div>
            <div class="kpi-foot">已完成 {{ overview.summary.totalCompleted }} 单</div>
          </div>
        </div>
        <div class="kpi-item">
          <div class="kpi-icon" style="color:#fa8c16"><el-icon><Histogram /></el-icon></div>
          <div>
            <div class="kpi-label">平均单店</div>
            <div class="kpi-value">{{ avgPerOutlet }}</div>
            <div class="kpi-foot">单/家</div>
          </div>
        </div>
      </div>

      <!-- 大区柱状图 -->
      <el-card class="block">
        <template #header>
          <div class="card-header">
            <span>大区订单分布</span>
            <span class="card-tip">鼠标悬停查看省份明细</span>
          </div>
        </template>
        <div ref="chartRef" style="height: 340px"></div>
      </el-card>

      <div class="content-grid">
        <!-- Top 10 -->
        <el-card class="block">
          <template #header>
            <div class="card-header">
              <span>订单量 Top 10 网点</span>
              <span class="card-tip">按累计订单数排序</span>
            </div>
          </template>
          <el-table :data="overview.topOutlets" size="small" stripe>
            <el-table-column type="index" label="#" width="44" />
            <el-table-column prop="name" :label="L.name" min-width="110" />
            <el-table-column :label="L.region" width="60">
              <template #default="{ row }">
                <el-tag size="small" type="info">{{ row.region }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="totalOrders" :label="L.cumulative" width="70" sortable>
              <template #default="{ row }">
                <span class="num-strong">{{ row.totalOrders }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="pending" label="待接" width="56" sortable>
              <template #default="{ row }">
                <span :class="row.pending > 0 ? 'num-warn' : 'num-muted'">{{ row.pending }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="processing" label="制作" width="56" sortable>
              <template #default="{ row }">
                <span class="num-muted">{{ row.processing }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="completed" label="完成" width="56" sortable>
              <template #default="{ row }">
                <span class="num-success">{{ row.completed }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="today" label="今日" width="56" sortable>
              <template #default="{ row }">
                <span :class="row.today > 0 ? 'num-today' : 'num-muted'">{{ row.today }}</span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>

        <!-- 网点明细 -->
        <el-card class="block">
          <template #header>
            <div class="card-header">
              <span>网点明细</span>
              <span class="card-tip">共 {{ overview.outlets.length }} 家</span>
            </div>
          </template>
          <el-table :data="overview.outlets" size="small" stripe height="420">
            <el-table-column prop="name" :label="L.name" min-width="110" />
            <el-table-column prop="region" :label="L.region" width="60">
              <template #default="{ row }">
                <el-tag size="small" type="info">{{ row.region }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="province" :label="L.province" width="80" />
            <el-table-column prop="city" :label="L.city" width="80" />
            <el-table-column :label="L.status" width="60">
              <template #default="{ row }">
                <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">
                  {{ row.status === 1 ? '营业' : '停用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="totalOrders" :label="L.cumulative" width="70" sortable />
            <el-table-column prop="pending" :label="L.pending" width="60" sortable />
            <el-table-column prop="processing" :label="L.making" width="60" sortable />
            <el-table-column prop="completed" :label="L.done" width="60" sortable />
            <el-table-column prop="today" :label="L.today" width="56" sortable />
          </el-table>
        </el-card>
      </div>
    </template>

    <div v-else class="empty-state">{{ L.empty }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, computed } from 'vue'
import * as echarts from 'echarts'
import { Refresh, OfficeBuilding, CircleCheck, Document, Bell, TrendCharts, DataAnalysis, Warning, CircleCheckFilled, Histogram } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getOutletOverviewAPI } from '@/api'

const L = {
  name: '网点名称',
  region: '大区',
  province: '省份',
  city: '城市',
  status: '状态',
  cumulative: '累计',
  pending: '待接',
  making: '制作中',
  done: '完成',
  today: '今日',
  loading: '加载中',
  empty: '暂无数据',
}

const loading = ref(false)
const overview = ref<any>(null)
const updateTime = ref('')
const chartRef = ref<HTMLElement>()
let chart: echarts.ECharts | null = null

// 派生指标
const acceptRatio = computed(() => {
  if (!overview.value?.summary) return '0.0'
  const { totalOrders, totalPending } = overview.value.summary
  if (!totalOrders) return '0.0'
  return (((totalOrders - totalPending) / totalOrders) * 100).toFixed(1)
})
const pendingRatio = computed(() => {
  if (!overview.value?.summary) return '0.0'
  const { totalOrders, totalPending } = overview.value.summary
  if (!totalOrders) return '0.0'
  return ((totalPending / totalOrders) * 100).toFixed(1)
})
const doneRatio = computed(() => {
  if (!overview.value?.summary) return '0.0'
  const { totalOrders, totalCompleted } = overview.value.summary
  if (!totalOrders) return '0.0'
  return ((totalCompleted / totalOrders) * 100).toFixed(1)
})
const avgPerOutlet = computed(() => {
  if (!overview.value?.summary) return '0.00'
  const { totalOrders, activeOutlets } = overview.value.summary
  if (!activeOutlets) return '0.00'
  return (totalOrders / activeOutlets).toFixed(2)
})
const activeRatio = computed(() => {
  if (!overview.value?.summary) return '0.0'
  const { totalOutlets, activeOutlets } = overview.value.summary
  if (!totalOutlets) return '0.0'
  return ((activeOutlets / totalOutlets) * 100).toFixed(1)
})

async function loadData() {
  loading.value = true
  try {
    const res: any = await getOutletOverviewAPI()
    overview.value = res
    updateTime.value = new Date().toLocaleTimeString('zh-CN', { hour12: false })
    await nextTick()
    initChart()
  } catch {
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

function initChart() {
  if (!chartRef.value || !overview.value) return
  if (!chart) chart = echarts.init(chartRef.value)
  const regions = overview.value.regions || []
  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const idx = params[0].dataIndex
        const r = regions[idx]
        const provList = (r.provinces || []).join('、') || '—'
        let html = `<div style="font-weight:600;margin-bottom:6px">${r.region} 大区</div>`
        html += `<div style="color:#999;font-size:12px;margin-bottom:4px">覆盖 ${r.outletCount} 家网点 / ${(r.provinces || []).length} 个省份</div>`
        html += `<div style="color:#999;font-size:12px;margin-bottom:8px">省份：${provList}</div>`
        for (const p of params) {
          const color = p.color
          html += `<div style="display:flex;justify-content:space-between;gap:16px;margin:2px 0"><span>${p.marker}${p.seriesName}</span><span style="font-weight:600">${p.value}</span></div>`
        }
        html += `<div style="border-top:1px solid #eee;margin-top:6px;padding-top:4px;color:#999;font-size:12px">待接 ${r.pending} · 制作 ${r.processing} · 完成 ${r.completed}</div>`
        return html
      },
    },
    legend: { data: ['订单量', '网点数'], top: 8 },
    grid: { left: '3%', right: '4%', bottom: '3%', top: 50, containLabel: true },
    xAxis: { type: 'category', data: regions.map((r: any) => r.region) },
    yAxis: { type: 'value' },
    series: [
      {
        name: '订单量',
        type: 'bar',
        data: regions.map((r: any) => r.totalOrders),
        itemStyle: { color: '#5B6FE8', borderRadius: [4, 4, 0, 0] },
        label: { show: true, position: 'top', fontSize: 11, color: '#5B6FE8' },
      },
      {
        name: '网点数',
        type: 'bar',
        data: regions.map((r: any) => r.outletCount),
        itemStyle: { color: '#52c41a', borderRadius: [4, 4, 0, 0] },
        label: { show: true, position: 'top', fontSize: 11, color: '#52c41a' },
      },
    ],
  }
  chart.setOption(option)
}

onMounted(loadData)
</script>

<style scoped>
.overview-page { }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
.page-header h2 { margin: 0 0 4px 0; font-size: 22px; font-weight: 600; line-height: 1.4; padding-bottom: 4px; }
.update-time { font-size: 12px; color: #999; }
.summary-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; margin-bottom: 16px; }
.summary-card { background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); display: flex; align-items: center; gap: 12px; transition: transform .15s, box-shadow .15s; }
.summary-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
.card-icon { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 22px; flex-shrink: 0; }
.card-body { flex: 1; min-width: 0; }
.sum-value { font-size: 26px; font-weight: 700; color: #333; line-height: 1.1; }
.sum-label { font-size: 13px; color: #666; margin-top: 4px; }
.sum-sub { font-size: 11px; color: #999; margin-top: 2px; }

.kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 20px; }
.kpi-item { background: #fff; border-radius: 10px; padding: 14px 16px; display: flex; align-items: center; gap: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.kpi-icon { font-size: 24px; }
.kpi-label { font-size: 12px; color: #999; }
.kpi-value { font-size: 22px; font-weight: 700; color: #333; line-height: 1.2; }
.kpi-foot { font-size: 11px; color: #999; margin-top: 2px; }

.block { border-radius: 12px; margin-bottom: 16px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.card-tip { font-size: 12px; color: #999; font-weight: normal; }
.content-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

.num-strong { font-weight: 700; color: #333; }
.num-warn { color: #f5222d; font-weight: 600; }
.num-success { color: #52c41a; font-weight: 600; }
.num-today { color: #13c2c2; font-weight: 600; }
.num-muted { color: #bbb; }

.empty-state { padding: 80px 0; text-align: center; color: #999; }
</style>
