<template>
  <div class="module-donut-wrapper">
    <div ref="chartRef" class="echarts-container"></div>
    <div v-if="!data.length" class="empty-tip">暂无数据</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick, onUnmounted } from 'vue'
import type { ECharts, EChartsOption } from 'echarts'

interface ModuleItem {
  module?: string
  businessType?: string
  count?: number
  amount?: number
}

interface Props {
  height?: number
  data?: ModuleItem[]
}

const props = withDefaults(defineProps<Props>(), {
  height: 280,
  data: () => []
})

const PALETTE = ['#5B6FE8', '#52c41a', '#fa8c16', '#f5222d', '#13c2c2', '#722ed1', '#eb2f96', '#faad14']

const MODULE_LABELS: Record<string, string> = {
  bookkeeping: '代理记账',
  seal: '刻章',
  newspaper: '登报'
}

// 按 module 合并（刻章订单/刻章、登报订单/登报 都属于同一板块）
function aggregateByModule(items: ModuleItem[]) {
  const map: Record<string, { module: string; name: string; count: number; amount: number }> = {}
  for (const it of items) {
    const key = it.module || it.businessType || 'other'
    if (!map[key]) {
      map[key] = { module: key, name: MODULE_LABELS[key] || it.businessType || key, count: 0, amount: 0 }
    }
    map[key].count += Number(it.count) || 0
    map[key].amount += Number(it.amount) || 0
  }
  return Object.values(map)
}

const chartRef = ref<HTMLElement>()
let chartInstance: ECharts | null = null
let isEchartsReady = false

async function loadEchartsInit() {
  const ec = await import('echarts')
  const fn: any = (ec as any).default?.init
    ?? (ec as any).default?.default?.init
    ?? (ec as any).init
  if (typeof fn === 'function') return fn
  const keys = Object.keys(ec as object)
  for (const k of keys) {
    const v = (ec as any)[k]
    if (v && typeof v.init === 'function') return v.init
    if (v && typeof v.default?.init === 'function') return v.default.init
  }
  throw new Error('[ModuleDonut] cannot find echarts init in: ' + keys.join(', '))
}

function totalAmount() {
  return (props.data || []).reduce((s, d) => s + (Number(d.amount) || 0), 0)
}

async function initChart() {
  if (!chartRef.value) {
    await new Promise(r => setTimeout(r, 200))
    if (!chartRef.value) return
  }
  if (!isEchartsReady) {
    try {
      const initFn = await loadEchartsInit()
      chartInstance = (initFn as any).call(null, chartRef.value)
      isEchartsReady = true
    } catch (e) {
      console.error('[ModuleDonut] echarts load error:', e)
      return
    }
  }
  if (!chartInstance) return
  renderChart()
}

function renderChart() {
  if (!chartInstance || !props.data?.length) return

  const merged = aggregateByModule(props.data)
  const total = merged.reduce((s, d) => s + (Number(d.amount) || 0), 0)
  const seriesData = merged.map((d, i) => ({
    name: d.name,
    value: Number(d.amount) || 0,
    count: d.count,
    itemStyle: { color: PALETTE[i % PALETTE.length] }
  }))

  const option: EChartsOption = {
    tooltip: {
      trigger: 'item',
      formatter: (p: any) => {
        const pct = total > 0 ? ((p.value / total) * 100).toFixed(1) : '0.0'
        return `${p.marker} ${p.name}<br/>¥${p.value.toFixed(2)} (${pct}%)<br/>${p.data?.count ?? ''} 笔`
      }
    },
    legend: {
      type: 'scroll',
      orient: 'vertical',
      right: '2%',
      top: 'middle',
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: '#64748b', fontSize: 12 },
      formatter: (name: string) => {
        const item = merged.find(d => d.name === name)
        if (!item) return name
        const pct = total > 0 ? ((Number(item.amount) || 0) / total * 100).toFixed(0) : '0'
        return `${name}  ${pct}%`
      }
    },
    series: [
      {
        type: 'pie',
        radius: ['38%', '62%'],
        center: ['48%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderColor: '#fff',
          borderWidth: 2,
          borderRadius: 4
        },
        label: {
          show: true,
          position: 'center',
          formatter: () => `{a|总收入}\n{b|¥${total.toFixed(0)}}`,
          rich: {
            a: { color: '#94a3b8', fontSize: 12, lineHeight: 20 },
            b: { color: '#1e293b', fontSize: 18, fontWeight: 'bold', lineHeight: 26 }
          }
        },
        emphasis: {
          label: {
            show: true,
            formatter: () => `{a|总收入}\n{b|¥${total.toFixed(0)}}`,
            rich: {
              a: { color: '#94a3b8', fontSize: 12, lineHeight: 20 },
              b: { color: '#1e293b', fontSize: 18, fontWeight: 'bold', lineHeight: 26 }
            }
          }
        },
        labelLine: { show: false },
        data: seriesData
      }
    ]
  }

  chartInstance.setOption(option, true)
}

function resizeChart() {
  if (chartInstance) chartInstance.resize()
}

watch(() => props.data, () => {
  nextTick(() => renderChart())
}, { deep: true })

onMounted(() => {
  initChart()
  window.addEventListener('resize', resizeChart)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeChart)
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
})
</script>

<style scoped lang="scss">
.module-donut-wrapper {
  position: relative;
  width: 100%;

  .echarts-container {
    width: 100%;
    height: v-bind('props.height + "px"');
    min-height: 200px;
  }

  .empty-tip {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #94a3b8;
    font-size: 13px;
  }
}
</style>
