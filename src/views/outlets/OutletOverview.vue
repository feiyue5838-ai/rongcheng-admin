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
        <div class="summary-card summary-total">
          <div class="card-icon"><el-icon><OfficeBuilding /></el-icon></div>
          <div class="card-body">
            <div class="sum-value">{{ overview.summary.totalOutlets }}</div>
            <div class="sum-label">网点总数</div>
            <div class="sum-sub">含 {{ overview.summary.inactiveOutlets }} 家停用</div>
          </div>
        </div>

        <div class="summary-card summary-active">
          <div class="card-icon"><el-icon><CircleCheck /></el-icon></div>
          <div class="card-body">
            <div class="sum-value">{{ overview.summary.activeOutlets }}</div>
            <div class="sum-label">启用网点</div>
            <div class="sum-sub">营业占比 {{ activeRatio }}%</div>
          </div>
        </div>

        <div class="summary-card summary-orders">
          <div class="card-icon"><el-icon><Document /></el-icon></div>
          <div class="card-body">
            <div class="sum-value">{{ overview.summary.totalOrders }}</div>
            <div class="sum-label">累计订单</div>
            <div class="sum-sub">已派发到店</div>
          </div>
        </div>

        <div class="summary-card summary-pending">
          <div class="card-icon"><el-icon><Bell /></el-icon></div>
          <div class="card-body">
            <div class="sum-value">{{ overview.summary.totalPending }}</div>
            <div class="sum-label">待接单</div>
            <div class="sum-sub">占累计 {{ pendingRatio }}%</div>
          </div>
        </div>

        <div class="summary-card summary-today">
          <div class="card-icon"><el-icon><TrendCharts /></el-icon></div>
          <div class="card-body">
            <div class="sum-value">{{ overview.summary.todayTotal }}</div>
            <div class="sum-label">今日新增</div>
            <div class="sum-sub">当日分配订单</div>
          </div>
        </div>
      </div>

      <!-- 第二行 4 张效率指标 -->
      <div class="kpi-grid">
        <div class="kpi-item kpi-accept">
          <div class="kpi-icon"><el-icon><DataAnalysis /></el-icon></div>
          <div>
            <div class="kpi-label">接单率</div>
            <div class="kpi-value">{{ acceptRatio }}%</div>
            <div class="kpi-foot">已接 {{ overview.summary.totalOrders - overview.summary.totalPending }} / {{ overview.summary.totalOrders }}</div>
          </div>
        </div>
        <div class="kpi-item kpi-pending">
          <div class="kpi-icon"><el-icon><Warning /></el-icon></div>
          <div>
            <div class="kpi-label">待接占比</div>
            <div class="kpi-value">{{ pendingRatio }}%</div>
            <div class="kpi-foot">{{ overview.summary.totalPending }} 单待处理</div>
          </div>
        </div>
        <div class="kpi-item kpi-done">
          <div class="kpi-icon"><el-icon><CircleCheckFilled /></el-icon></div>
          <div>
            <div class="kpi-label">完成率</div>
            <div class="kpi-value">{{ doneRatio }}%</div>
            <div class="kpi-foot">已完成 {{ overview.summary.totalCompleted }} 单</div>
          </div>
        </div>
        <div class="kpi-item kpi-orders">
          <div class="kpi-icon"><el-icon><Histogram /></el-icon></div>
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

// 后端 getOverview 混用两套命名：summary 用 camelCase，订单量字段用 snake_case（total_orders）。
// 此处统一归一化为 camelCase，避免页面各处 totalOrders 取不到值。
function normalizeOverview(raw: any): any {
  if (!raw || typeof raw !== 'object') return raw
  const pick = (v: any, key: string, alt: string) => (v?.[key] ?? v?.[alt] ?? 0)
  const normSummary = (s: any) => s ? {
    ...s,
    totalOrders: pick(s, 'totalOrders', 'total_orders'),
    totalPending: pick(s, 'totalPending', 'total_pending'),
    totalCompleted: pick(s, 'totalCompleted', 'total_completed'),
  } : s
  const normRow = (r: any) => r ? { ...r, totalOrders: pick(r, 'totalOrders', 'total_orders') } : r
  return {
    ...raw,
    summary: normSummary(raw.summary),
    regions: Array.isArray(raw.regions) ? raw.regions.map(normRow) : raw.regions,
    outlets: Array.isArray(raw.outlets) ? raw.outlets.map(normRow) : raw.outlets,
    topOutlets: Array.isArray(raw.topOutlets) ? raw.topOutlets.map(normRow) : raw.topOutlets,
  }
}

async function loadData() {
  loading.value = true
  try {
    const res: any = await getOutletOverviewAPI()
    overview.value = normalizeOverview(res)
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
    yAxis: { type: 'value', min: 0, max: (value: any) => Math.max(value.max * 1.25, 4) },
    series: [
      {
        name: '订单量',
        type: 'bar',
        barMaxWidth: 48,
        barGap: '30%',
        barCategoryGap: '50%',
        data: regions.map((r: any) => r.totalOrders),
        itemStyle: { color: '#5B6FE8', borderRadius: [4, 4, 0, 0] },
        label: { show: true, position: 'top', fontSize: 11, color: '#5B6FE8' },
      },
      {
        name: '网点数',
        type: 'bar',
        barMaxWidth: 48,
        barGap: '30%',
        barCategoryGap: '50%',
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

<style lang="scss" scoped>
.overview-page { }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
.page-header h2 { margin: 0 0 4px 0; font-size: 22px; font-weight: 600; line-height: 1.4; padding-bottom: 4px; }
.update-time { font-size: 12px; color: #999; }
.summary-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; margin-bottom: 20px; }
.summary-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px 24px;
  display: flex;
  align-items: center;
  gap: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
  &:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1); }
  .card-icon {
    width: 56px;
    height: 56px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 26px;
    flex-shrink: 0;
  }
  .card-body { flex: 1; min-width: 0; }
  .sum-value { font-size: 30px; font-weight: 800; line-height: 1; }
  .sum-label { font-size: 13px; color: #888; margin-top: 4px; }
  .sum-sub { font-size: 11px; color: #bbb; margin-top: 2px; }
}

// 网点总数 — 紫蓝
.summary-total { background: linear-gradient(135deg, #eef2ff 0%, #dde4ff 100%); border: 1px solid rgba(91, 111, 232, 0.15); .card-icon { background: rgba(91, 111, 232, 0.12); color: #5B6FE8; } .sum-value { color: #3d4fc4; } }
// 启用网点 — 清新绿
.summary-active { background: linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%); border: 1px solid rgba(82, 196, 26, 0.15); .card-icon { background: rgba(82, 196, 26, 0.12); color: #52c41a; } .sum-value { color: #389e0d; } }
// 累计订单 — 活力橙
.summary-orders { background: linear-gradient(135deg, #fff7e6 0%, #ffe8c2 100%); border: 1px solid rgba(250, 140, 22, 0.15); .card-icon { background: rgba(250, 140, 22, 0.12); color: #fa8c16; } .sum-value { color: #c87619; } }
// 待接单 — 警示红
.summary-pending { background: linear-gradient(135deg, #fff1f0 0%, #ffccc7 100%); border: 1px solid rgba(245, 34, 45, 0.15); .card-icon { background: rgba(245, 34, 45, 0.12); color: #f5222d; } .sum-value { color: #cf1322; } }
// 今日新增 — 清爽青
.summary-today { background: linear-gradient(135deg, #e6fffb 0%, #b5f5ec 100%); border: 1px solid rgba(19, 194, 194, 0.15); .card-icon { background: rgba(19, 194, 194, 0.12); color: #13c2c2; } .sum-value { color: #08979c; } }

.kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
.kpi-item {
  background: #fff;
  border-radius: 16px;
  padding: 18px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
  &:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1); }
}
.kpi-icon { font-size: 26px; }
.kpi-label { font-size: 12px; color: #999; }
.kpi-value { font-size: 22px; font-weight: 700; color: #333; line-height: 1.2; }
.kpi-foot { font-size: 11px; color: #bbb; margin-top: 2px; }

// 接单率 — 紫蓝
.kpi-accept { background: linear-gradient(135deg, #eef2ff 0%, #dde4ff 100%); border: 1px solid rgba(91, 111, 232, 0.15); .kpi-icon { color: #5B6FE8; } }
// 待接占比 — 警示红
.kpi-pending { background: linear-gradient(135deg, #fff1f0 0%, #ffccc7 100%); border: 1px solid rgba(245, 34, 45, 0.15); .kpi-icon { color: #f5222d; } }
// 完成率 — 清新绿
.kpi-done { background: linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%); border: 1px solid rgba(82, 196, 26, 0.15); .kpi-icon { color: #52c41a; } }
// 平均单店 — 活力橙
.kpi-orders { background: linear-gradient(135deg, #fff7e6 0%, #ffe8c2 100%); border: 1px solid rgba(250, 140, 22, 0.15); .kpi-icon { color: #fa8c16; } }

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
