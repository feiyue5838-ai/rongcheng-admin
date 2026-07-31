<template>
  <div>
    <div class="page-header">
      <h2>代理记账订单</h2>
      <div>
        <el-button type="primary" @click="fetchOrders">刷新</el-button>
      </div>
    </div>
    <div class="page-card">
      <!-- 搜索 -->
      <el-form inline :model="query" class="search-form">
        <el-form-item label="关键词">
          <el-input v-model="query.keyword" placeholder="订单号" clearable style="width: 200px" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部" clearable style="width: 140px">
            <el-option v-for="s in statusOptions" :key="s.value" :label="s.label" :value="s.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="纳税人类型">
          <el-select v-model="query.taxpayerType" placeholder="全部" clearable style="width: 140px">
            <el-option label="小规模" value="small" />
            <el-option label="一般纳税人" value="general" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期">
          <el-date-picker v-model="dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" style="width: 260px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="search">搜索</el-button>
          <el-button @click="reset">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 表格 -->
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="orderNo" label="订单号" width="220" />
        <el-table-column label="纳税人类型" width="110">
          <template #default="{ row }">
            <el-tag :type="row.taxpayerType === 'general' ? 'warning' : 'info'" size="small">
              {{ row.taxpayerTypeText }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="cycleText" label="会计期间" width="100" />
        <el-table-column label="附加服务" min-width="220">
          <template #default="{ row }">
            <el-tag v-if="row.addons.invoice" type="success" size="small" style="margin-right: 4px">开票</el-tag>
            <el-tag v-if="row.addons.social" type="success" size="small" style="margin-right: 4px">社保</el-tag>
            <el-tag v-if="row.addons.fund" type="success" size="small" style="margin-right: 4px">公积金</el-tag>
            <span v-if="!row.addons.invoice && !row.addons.social && !row.addons.fund" class="text-muted">无</span>
          </template>
        </el-table-column>
        <el-table-column prop="contactPhone" label="联系电话" width="130" />
        <el-table-column prop="totalPrice" label="金额" width="110">
          <template #default="{ row }">¥{{ row.totalPrice }}</template>
        </el-table-column>
        <el-table-column prop="statusText" label="状态" width="100">
          <template #default="{ row }"><el-tag :type="statusType(row.status)">{{ row.statusText }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="createdAt" label="下单时间" width="170">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="$router.push(`/orders/${row.id}`)">详情</el-button>
            <el-button type="primary" link v-if="row.status === 1" @click="handleMarkPaid(row)">确认付款</el-button>
            <el-button type="primary" link v-if="row.status === 2" @click="handleComplete(row)">完成</el-button>
            <el-button type="danger" link v-if="[2,3,4,7].includes(row.status)" @click="openRefund(row)">退款</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 退款弹窗 -->
      <el-dialog v-model="refundVisible" title="订单退款" width="420px">
        <div v-if="refundTarget" class="refund-box">
          <p>订单号:<b>{{ refundTarget.orderNo }}</b></p>
          <p>实付金额：<b>￥{{ refundTarget.payPrice || refundTarget.totalPrice }}</b></p>
          <el-form label-width="80px">
            <el-form-item label="退款金额">
              <el-input-number v-model="refundAmount" :min="0.01" :precision="2" :step="1" />
            </el-form-item>
            <el-form-item label="退款原因">
              <el-input v-model="refundReason" placeholder="客户申请退款" />
            </el-form-item>
          </el-form>
        </div>
        <template #footer>
          <el-button @click="refundVisible = false">取消</el-button>
          <el-button type="danger" :loading="refundLoading" @click="confirmRefund">确认退款</el-button>
        </template>
      </el-dialog>

      <!-- 分页 -->
      <el-pagination style="margin-top: 20px; justify-content: flex-end"
        v-model:current-page="query.page" v-model:page-size="query.pageSize"
        :total="pagination.total" :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next" @change="fetchOrders" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { getBookkeepingOrders, updateOrder, refundOrder } from '@/api'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'

const loading = ref(false)
const list = ref<any[]>([])
const refundVisible = ref(false)
const refundLoading = ref(false)
const refundTarget = ref<any>(null)
const refundAmount = ref(0)
const refundReason = ref('客户申请退款')
const pagination = ref({ page: 1, pageSize: 20, total: 0 })
const dateRange = ref<string[]>([])
const query = reactive({ keyword: '', status: '', taxpayerType: '', startDate: '', endDate: '', page: 1, pageSize: 20 })

const statusOptions = [
  { value: 1, label: '待支付' }, { value: 2, label: '已支付' },
  { value: 5, label: '已完成' }, { value: 6, label: '已取消' },
  { value: 7, label: '售后中' }, { value: 8, label: '退款中' }, { value: 9, label: '已退款' },
]

const taxpayerTypeMap: Record<string, string> = { small: '小规模', general: '一般纳税人' }
const cycleMap: Record<string, string> = {
  yearly_small: '全年(小规模)',
  half_yearly_small: '半年(小规模)',
  yearly_general: '全年(一般)',
  half_yearly_general: '半年(一般)',
  reserved_general: '预定(一般)',
}

function statusType(s: number) {
  const m: Record<number, string> = { 1: 'warning', 2: 'primary', 5: 'success', 6: 'info', 7: 'warning', 8: 'danger', 9: 'info' }
  return m[s] || ''
}

function formatDate(d: string) { return d ? dayjs(d).format('YYYY-MM-DD HH:mm') : '-' }

async function fetchOrders() {
  loading.value = true
  try {
    query.startDate = dateRange.value?.[0] || ''
    query.endDate = dateRange.value?.[1] || ''
    const res: any = await getBookkeepingOrders(query)
    list.value = (res.list || []).map((o: any) => {
      const extra = o.extra || {}
      return {
        ...o,
        orderNo: o.orderNo || '',
        contactPhone: o.contactPhone || '',
        totalPrice: o.totalPrice || 0,
        payPrice: o.payPrice || 0,
        statusText: o.statusText || '',
        createdAt: o.createdAt || '',
        taxpayerType: extra.taxpayerType || '',
        taxpayerTypeText: taxpayerTypeMap[extra.taxpayerType] || extra.taxpayerType || '-',
        cycle: extra.cycle || '',
        cycleText: cycleMap[extra.cycle] || extra.cycle || '-',
        addons: {
          invoice: !!extra.invoice,
          social: !!extra.social,
          fund: !!extra.fund,
        },
      }
    })
    pagination.value = { total: res.pagination?.total || 0, page: res.pagination?.page || 1, pageSize: res.pagination?.pageSize || 20 }
  } finally { loading.value = false }
}

async function handleMarkPaid(order: any) {
  try {
    await updateOrder(order.id, { status: 2, statusText: '已支付' })
    ElMessage.success('已标记为已支付')
    fetchOrders()
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败')
  }
}

async function handleComplete(order: any) {
  try {
    await updateOrder(order.id, { status: 5, statusText: '已完成' })
    ElMessage.success('已标记为已完成')
    fetchOrders()
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败')
  }
}

function openRefund(row: any) {
  refundTarget.value = row
  refundAmount.value = row.totalPrice
  refundReason.value = '客户申请退款'
  refundVisible.value = true
}

async function confirmRefund() {
  if (!refundTarget.value) return
  refundLoading.value = true
  try {
    await refundOrder(refundTarget.value.id, { amount: refundAmount.value, reason: refundReason.value })
    ElMessage.success('退款申请已提交,订单进入退款处理中')
    refundVisible.value = false
    fetchOrders()
  } catch (e: any) {
    ElMessage.error(e?.message || '退款失败')
  } finally {
    refundLoading.value = false
  }
}

function search() { query.page = 1; fetchOrders() }
function reset() {
  query.keyword = ''; query.status = ''; query.taxpayerType = ''
  dateRange.value = []
  search()
}

onMounted(fetchOrders)
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h2 { margin: 0; font-size: 20px; }
.page-card { background: #fff; padding: 20px; border-radius: 4px; box-shadow: 0 1px 4px rgba(0,21,41,.08); }
.search-form { margin-bottom: 16px; }
.text-muted { color: #999; font-size: 12px; }
</style>
