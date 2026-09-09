<template>
  <div>
    <div class="page-header">
      <h2>供应链订单</h2>
      <div class="header-actions">
        <el-button type="primary" @click="goUnassigned">待派单池 ({{ unassignedCount }})</el-button>
        <el-button @click="load">刷新</el-button>
      </div>
    </div>

    <!-- 筛选 -->
    <el-card shadow="never" style="margin-bottom: 16px">
      <el-form inline>
        <el-form-item label="业务类型">
          <el-select v-model="filters.module" clearable placeholder="全部" style="width: 140px" @change="search">
            <el-option label="刻章" value="seal" />
            <el-option label="登报" value="newspaper" />
            <el-option label="记账" value="bookkeeping" />
          </el-select>
        </el-form-item>
        <el-form-item label="订单状态">
          <el-select v-model="filters.orderStatus" clearable placeholder="全部" style="width: 160px" @change="search">
            <el-option v-for="(label, key) in orderStatusMap" :key="key" :label="label" :value="key" />
          </el-select>
        </el-form-item>
        <el-form-item label="履约状态">
          <el-select v-model="filters.fulfillmentStatus" clearable placeholder="全部" style="width: 170px" @change="search">
            <el-option v-for="(label, key) in fulfillmentStatusMap" :key="key" :label="label" :value="key" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="filters.module === 'seal'" label="印章类型">
          <el-select v-model="filters.routeType" clearable placeholder="全部" style="width: 140px" @change="search">
            <el-option label="企业刻章" value="enterprise" />
            <el-option label="个人印章" value="personal" />
            <el-option label="电子印章" value="electronic" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="filters.keyword" placeholder="订单号/备注" clearable style="width: 180px" @keyup.enter="search" @clear="search" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="search">查询</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 订单列表 -->
    <el-card shadow="never">
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="orderNo" label="订单号" width="200" show-overflow-tooltip />
        <el-table-column label="类型" width="80">
          <template #default="{ row }">
            <el-tag size="small" :type="moduleType(row.module)">{{ moduleLabel(row.module) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column v-if="filters.module === 'seal'" label="印章类型" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="routeTypeTag(row.routeType)">{{ routeTypeLabel(row.routeType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="订单状态" width="110">
          <template #default="{ row }">
            <el-tag size="small" :type="statusTag(row.orderStatus)">{{ orderStatusMap[row.orderStatus] || row.orderStatus }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="支付" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="row.paymentStatus === 'paid' ? 'success' : 'info'">{{ paymentStatusMap[row.paymentStatus] || row.paymentStatus }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="履约" width="120">
          <template #default="{ row }">
            <el-tag size="small" :type="fulfillmentTag(row.fulfillmentStatus)">{{ fulfillmentStatusMap[row.fulfillmentStatus] || row.fulfillmentStatus }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="totalAmount" label="金额" width="100" align="right">
          <template #default="{ row }">¥{{ Number(row.totalAmount || 0).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="createdAt" label="下单时间" width="170">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="goDetail(row.orderNo)">供应链视图</el-button>
            <el-button v-if="row.orderStatus === 'paid' && row.paymentStatus === 'paid' && row.fulfillmentStatus === 'pending_assignment'" link type="warning" size="small" @click="openAssign(row)">派单</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        style="margin-top: 16px; justify-content: flex-end"
        @change="load"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import { v2GetOrders, v2GetUnassigned } from '@/api'
import { toPaged } from '@/api/unwrap'
import { useLatest } from '@/composables/useLatest'
import { FULFILLMENT_STATUS_TEXT, fulfillmentStatusTag } from '@/utils/fulfillment-status'

const router = useRouter()
const route = useRoute()

const loading = ref(false)
const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const unassignedCount = ref(0)

const filters = reactive<any>({
  module: '',
  routeType: '',
  orderStatus: '',
  fulfillmentStatus: '',
  keyword: '',
})

const orderStatusMap: Record<string, string> = {
  created: '已创建', pending_payment: '待支付', paid: '已支付',
  processing: '服务中', completed: '已完成', cancelled: '已取消', closed: '已关闭',
}
const paymentStatusMap: Record<string, string> = {
  unpaid: '未支付', paid: '已支付', partial_refund: '部分退款', full_refund: '已退款',
}
// 订单层履约状态字典（共享单一数据源，见 utils/fulfillment-status.ts）
const fulfillmentStatusMap: Record<string, string> = FULFILLMENT_STATUS_TEXT

const moduleLabel = (m: string) => ({ seal: '刻章', newspaper: '登报', bookkeeping: '记账' } as any)[m] || m
const moduleType = (m: string) => ({ seal: 'primary', newspaper: 'success', bookkeeping: 'warning' } as any)[m] || 'info'
const statusTag = (s: string) =>
  ({ pending_payment: 'warning', paid: 'success', completed: 'info', cancelled: 'danger', processing: 'primary' } as any)[s] || 'info'
const fulfillmentTag = (s: string) => fulfillmentStatusTag(s)
const routeTypeLabel = (t: string) => ({ enterprise: '企业刻章', personal: '个人印章', electronic: '电子印章' } as any)[t] || t || '-'
const routeTypeTag = (t: string) => ({ enterprise: 'primary', personal: 'success', electronic: 'warning' } as any)[t] || 'info'
// 后端时间为「本地时间 + Z 后缀」格式（非真实 UTC），直接截取字符串避免 new Date 解析产生 +8h 偏移
const formatDate = (d?: string) => (d ? d.slice(0, 16).replace('T', ' ') : '-')

/** 筛选/查询入口：重置到第 1 页，避免在高页码下改筛选导致空列表 */
function search() {
  // 切离刻章时清空印章类型，避免残留过滤条件
  if (filters.module !== 'seal') filters.routeType = ''
  page.value = 1
  load()
}

const latest = useLatest()

async function load() {
  loading.value = true
  const my = latest.next()
  try {
    const params: any = { page: page.value, pageSize: pageSize.value }
    if (filters.module) params.module = filters.module
    if (filters.module === 'seal' && filters.routeType) params.routeType = filters.routeType
    if (filters.orderStatus) params.orderStatus = filters.orderStatus
    if (filters.fulfillmentStatus) params.fulfillmentStatus = filters.fulfillmentStatus
    if (filters.keyword) params.keyword = filters.keyword
    const res: any = await v2GetOrders(params)
    if (!latest.isCurrent(my)) return // 旧请求后到，直接丢弃
    const { list: rows, total: n } = toPaged(res)
    list.value = rows
    total.value = n
  } catch (e: any) {
    ElMessage.error(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

async function loadUnassignedCount() {
  try {
    const res: any = await v2GetUnassigned({ pageSize: 1 })
    unassignedCount.value = toPaged(res).total
  } catch { /* 忽略 */ }
}

function goDetail(orderNo: string) {
  router.push({ path: '/v2/orders/detail', query: { orderNo } })
}
function goUnassigned() {
  router.push('/v2/orders/unassigned')
}
function openAssign(row: any) {
  router.push({ path: '/v2/orders/detail', query: { orderNo: row.orderNo, assign: '1' } })
}

onMounted(() => {
  // 支持 /v2/orders?module=seal|newspaper|bookkeeping（历史订单重定向入口，2026-08-29）
  const qModule = route.query.module
  if (typeof qModule === 'string' && ['seal', 'newspaper', 'bookkeeping'].includes(qModule)) {
    filters.module = qModule
  }
  load()
  loadUnassignedCount()
})
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.header-actions {
  display: flex;
  gap: 8px;
}
</style>
