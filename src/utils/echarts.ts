import { init, use } from 'echarts/core'
import { BarChart, PieChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

// 仅注册后台实际使用的图表能力，避免把 ECharts 全量打进生产包。
use([
  BarChart,
  PieChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  CanvasRenderer,
])

export const initECharts = init
export type { ECharts, EChartsCoreOption as EChartsOption } from 'echarts/core'
