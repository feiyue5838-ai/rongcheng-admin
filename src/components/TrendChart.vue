<template>
  <div class="trend-chart-wrapper">
    <div class="trend-chart-header">
      <span class="trend-chart-title">{{ title }}</span>
      <el-radio-group v-if="showRangeSelector" v-model="selectedRange" size="small">
        <el-radio-button value="7">近7天</el-radio-button>
        <el-radio-button value="30">近30天</el-radio-button>
        <el-radio-button value="90">近90天</el-radio-button>
      </el-radio-group>
    </div>

    <div v-if="trendEmpty" class="empty-tip">
      <el-empty description="暂无趋势数据" :image-size="60" />
    </div>
    <div v-else ref="chartRef" class="echarts-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick, onUnmounted } from 'vue'
import type { ECharts, EChartsOption } from 'echarts'

interface TrendItem {
  day: string
  income: number
  refund: number
}

interface Props {
  title?: string
  height?: number
  showRangeSelector?: boolean
  modelValue?: string
  data?: TrendItem[]
}

const props = withDefaults(defineProps<Props>(), {
  title: '收支趋势',
  height: 300,
  showRangeSelector: true,
  modelValue: '7',
  data: () => []
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'rangeChange': [days: number]
}>()

const trendEmpty = computed(() => !props.data?.length)
const chartRef = ref<HTMLElement>()
const selectedRange = ref(props.modelValue)
let chartInstance: ECharts | null = null
let isEchartsReady = false

async function loadEchartsInit() {
  // 动态加载 echarts，找所有可能包含 init 的导出形式
  const ec = await import('echarts')
  // 可能的形态：ec.init / ec.default.init / ec.default.default.init
  const fn: any = (ec as any).default?.init
    ?? (ec as any).default?.default?.init
    ?? (ec as any).init
  if (typeof fn === 'function') {
    console.log('[TrendChart] echarts init found, type:', fn.name || 'anonymous')
    return fn
  }
  // 兜底：遍历所有导出找 init
  const keys = Object.keys(ec as object)
  console.log('[TrendChart] echarts exports:', keys.slice(0, 20))
  for (const k of keys) {
    const v = (ec as any)[k]
    if (v && typeof v.init === 'function') return v.init
    if (v && typeof v.default?.init === 'function') return v.default.init
  }
  throw new Error('[TrendChart] cannot find echarts init in: ' + keys.join(', '))
}

async function initChart() {
  console.log('[TrendChart] initChart called, ref:', !!chartRef.value)
  if (!chartRef.value) {
    console.log('[TrendChart] chartRef not ready, waiting...')
    await new Promise(r => setTimeout(r, 200))
    if (!chartRef.value) {
      console.log('[TrendChart] still no ref, abort')
      return
    }
  }

  if (!isEchartsReady) {
    console.log('[TrendChart] loading echarts...')
    try {
      const initFn = await loadEchartsInit()
      chartInstance = (initFn as any).call(null, chartRef.value)
      isEchartsReady = true
      console.log('[TrendChart] chart instance created:', !!chartInstance, 'typeof:', typeof chartInstance)
    } catch (e) {
      console.error('[TrendChart] echarts load error:', e)
      return
    }
  }

  if (!chartInstance) {
    console.log('[TrendChart] no chart instance, abort')
    return
  }

  renderChart()
}

function renderChart() {
  if (!chartInstance) {
    console.log('[TrendChart] renderChart: no instance')
    return
  }
  if (!props.data?.length) {
    console.log('[TrendChart] renderChart: no data')
    return
  }

  const option: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        if (!Array.isArray(params)) return ''
        let html = `<b>${params[0]?.axisValue}</b><br/>`
        params.forEach((p: any) => {
          html += `${p.marker} ${p.seriesName}: ¥${(p.value || 0).toFixed(2)}<br/>`
        })
        return html
      }
    },
    legend: {
      data: ['收入', '退款'],
      right: 0,
      top: 0,
      textStyle: { color: '#64748b', fontSize: 12 }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: 40,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: props.data.map(d => d.day),
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#94a3b8', fontSize: 11 }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
      axisLabel: {
        color: '#94a3b8',
        fontSize: 11,
        formatter: (v: number) => v >= 1000 ? (v / 1000).toFixed(0) + 'k' : String(v)
      }
    },
    series: [
      {
        name: '收入',
        type: 'bar',
        data: props.data.map(d => d.income),
        itemStyle: { color: '#5B6FE8', borderRadius: [4, 4, 0, 0] }
      },
      {
        name: '退款',
        type: 'bar',
        data: props.data.map(d => d.refund),
        itemStyle: { color: '#ff7875', borderRadius: [4, 4, 0, 0] }
      }
    ]
  }

  console.log('[TrendChart] setOption called, data.length:', props.data.length)
  chartInstance.setOption(option, true)
  console.log('[TrendChart] setOption done, instance:', !!chartInstance)
}

function resizeChart() {
  if (chartInstance) {
    chartInstance.resize()
  }
}

watch(() => props.data, () => {
  nextTick(() => renderChart())
}, { deep: true })

watch(selectedRange, (v) => {
  emit('update:modelValue', v)
  emit('rangeChange', parseInt(v))
})

onMounted(() => {
  console.log('[TrendChart] onMounted, chartRef:', !!chartRef.value)
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
.trend-chart-wrapper {
  width: 100%;

  .trend-chart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;

    .trend-chart-title {
      font-size: 16px;
      font-weight: 500;
      color: #1e293b;
    }
  }
}

.echarts-container {
  width: 100%;
  height: v-bind('props.height + "px"');
  min-height: 200px;
}
</style>
