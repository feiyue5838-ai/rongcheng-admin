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
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import type { TooltipComponentFormatterCallbackParams } from 'echarts'
import { initECharts, type ECharts, type EChartsOption } from '@/utils/echarts'

interface TrendItem {
  day: string
  income: number
  refund: number
  expense?: number
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

type AxisTooltipItem = Exclude<TooltipComponentFormatterCallbackParams, readonly unknown[]> & {
  axisValue?: string | number
}

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  })[character] || character)
}

function formatCurrency(value: unknown): string {
  const values: unknown[] = Array.isArray(value) ? value : [value]
  const rawValue = values[values.length - 1]
  const amount = typeof rawValue === 'number' ? rawValue : Number(rawValue)
  return Number.isFinite(amount) ? amount.toFixed(2) : '0.00'
}

function formatTooltip(params: AxisTooltipItem | AxisTooltipItem[]): string {
  if (!Array.isArray(params)) return ''
  const first = params[0]
  if (!first) return ''
  let html = `<b>${escapeHtml(first.axisValue ?? first.name)}</b><br/>`
  params.forEach((item) => {
    html += `${item.marker || ''} ${escapeHtml(item.seriesName || item.name)}: ¥${formatCurrency(item.value)}<br/>`
  })
  return html
}

async function initChart() {
  if (!chartRef.value) {
    await new Promise(r => setTimeout(r, 200))
    if (!chartRef.value) {
      return
    }
  }

  if (!chartInstance) chartInstance = initECharts(chartRef.value)

  if (!chartInstance) {
    return
  }

  renderChart()
}

function renderChart() {
  if (!chartInstance) {
    return
  }
  if (!props.data?.length) {
    return
  }

  const option: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: formatTooltip
    },
    legend: {
      data: ['收入', '退款', '支出'],
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
      },
      {
        name: '支出',
        type: 'bar',
        data: props.data.map(d => d.expense || 0),
        itemStyle: { color: '#faad14', borderRadius: [4, 4, 0, 0] }
      }
    ]
  }
  chartInstance.setOption(option, true)
}

function resizeChart() {
  if (chartInstance) {
    chartInstance.resize()
  }
}

watch(() => props.data, async (val) => {
  if (val?.length && !chartInstance) {
    // 首次挂载时数据为空导致 initChart 中止，数据到达后补一次初始化
    await nextTick()
    await initChart()
    return
  }
  nextTick(() => renderChart())
}, { deep: true })

watch(selectedRange, (v) => {
  emit('update:modelValue', v)
  emit('rangeChange', parseInt(v))
})

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
