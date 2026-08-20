<template>
  <div>
    <div class="page-header">
      <h2>V2.0 供应链订单</h2>
      <div class="header-actions">
        <el-button type="primary" @click="goUnassigned">待派单池 ({{ unassignedCount }})</el-button>
        <el-button @click="load">刷新</el-button>
      </div>
    </div>

    <!-- 筛选 -->
    <el-card shadow="never" style="margin-bottom: 16px">
      <el-form inline>
        <el-form-item label="业务类型">
          <el-select v-model="filters.module" clearable placeholder="全部" style="width: 140px" @change="load">
            <el-option label="刻章" value="seal" />
            <el-option label="登报" value="newspaper" />
            <el-option label="记账" value="bookkeeping" />
          </el-select>
        </el-form-item>
        <el-form-item label="订单状态">
          <el-select v-model="filters.orderStatus" clearable placeholder="全部" style="width: 160px" @change="load">
            <el-option v-for="(label, key) in orderStatusMap" :key="key" :label="label" :value="key" />
          </el-select>
        </el-form-item>
        <el-form-item label="履约状态">
          <el-select v-model="filters.fulfillmentStatus" clearable placeholder="全部" style="width: 170px" @change="load">
            <el-option v-for="(label, key) in fulfillmentStatusMap" :key="key" :label="label" :value="key" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="filters.keyword" placeholder="订单号" clearable style="width: 180px" @keyup.enter="load" @clear="load" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="load">查询</el-button>
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
          <template #default="{ row }">¥{{ row.totalAmount }}</template>
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
import { useRouter } from 'vue-router'
import { v2GetOrders, v2GetUnassigned } from '@/api'

const router = useRouter()

const loading = ref(false)
const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const unassignedCount = ref(0)

const filters = reactive<any>({
  module: '',
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
const fulfillmentStatusMap: Record<string, string> = {
  pending_assignment: '待派单', assigned: '已派单', accepted: '已接单',
  processing: '制作中', delivering: '发货中', signed: '已签收', completed: '已完成',
}

const moduleLabel = (m: string) => ({ seal: '刻章', newspaper: '登报', bookkeeping: '记账' } as any)[m] || m
const moduleType = (m: string) => ({ seal: 'primary', newspaper: 'success', bookkeeping: 'warning' } as any)[m] || 'info'
const statusTag = (s: string) =>
  ({ pending_payment: 'warning', paid: 'success', completed: 'info', cancelled: 'danger', processing: 'primary' } as any)[s] || 'info'
const fulfillmentTag = (s: string) =>
  ({ pending_assignment: 'warning', assigned: 'primary', accepted: 'primary', processing: 'primary', completed: 'success', cancelled: 'danger' } as any)[s] || 'info'
const formatDate = (d?: string) => (d ? new Date(d).toLocaleString('zh-CN', { hour12: false }) : '-')

async function load() {
  loading.value = true
  try {
    const params: any = { page: page.value, pageSize: pageSize.value }
    if (filters.module) params.module = filters.module
    if (filters.orderStatus) params.orderStatus = filters.orderStatus
    if (filters.fulfillmentStatus) params.fulfillmentStatus = filters.fulfillmentStatus
    if (filters.keyword) params.keyword = filters.keyword
    const res: any = await v2GetOrders(params)
    list.value = res.list || []
    total.value = res.total || 0
  } catch (e: any) {
    ElMessage.error(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

async function loadUnassignedCount() {
  try {
    const res: any = await v2GetUnassigned({ pageSize: 1 })
    unassignedCount.value = res.total || 0
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
