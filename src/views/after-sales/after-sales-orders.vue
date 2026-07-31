<template>
  <div class="page-container">
    <!-- 筛选区 -->
    <el-card shadow="never" class="filter-card">
      <el-form :inline="true" :model="query">
        <el-form-item label="模块">
          <el-select v-model="query.module" placeholder="全部模块" clearable style="width: 140px" @change="fetchOrders">
            <el-option label="刻章" value="seal" />
            <el-option label="登报" value="newspaper" />
            <el-option label="代理记账" value="bookkeeping" />
          </el-select>
        </el-form-item>
        <el-form-item label=" ">
          <el-button type="primary" @click="fetchOrders">查询</el-button>
          <el-button @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 列表 -->
    <el-card shadow="never" class="table-card">
      <el-table :data="orders" v-loading="loading" stripe>
        <el-table-column prop="orderNo" label="订单号" min-width="170" />
        <el-table-column label="用户" min-width="120">
          <template #default="{ row }">
            <div>{{ row.user?.nickname || '-' }}</div>
            <div style="font-size:12px;color:#999">{{ row.user?.phone || '-' }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="module" label="模块" width="100">
          <template #default="{ row }">
            <el-tag :type="moduleType(row.module)" size="small">{{ moduleName(row.module) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="实付金额" width="110" align="right">
          <template #default="{ row }">
            <span style="color:#E6A23C;font-weight:600">¥{{ row.payPrice || row.totalPrice }}</span>
          </template>
        </el-table-column>
        <el-table-column label="订单内容" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            <span>{{ getOrderContent(row) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="下单时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag type="warning" size="small">售后中</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="success" size="small" link @click="confirmRefund(row)">确认退款</el-button>
            <el-divider direction="vertical" />
            <el-button type="danger" size="small" link @click="rejectDialog(row)">拒绝</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="query.page"
        v-model:page-size="query.pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        style="margin-top: 16px; justify-content: flex-end"
        @size-change="fetchOrders"
        @current-change="fetchOrders"
      />
    </el-card>

    <!-- 确认退款弹窗 -->
    <el-dialog v-model="refundVisible" title="确认退款" width="420px">
      <div v-if="refundTarget" class="refund-box">
        <p>订单号：<b>{{ refundTarget.orderNo }}</b></p>
        <p>退款金额：<b style="color:#E6A23C">¥{{ refundTarget.payPrice || refundTarget.totalPrice }}</b></p>
        <p style="color:#999;font-size:13px">确认后订单将进入「退款中」状态，款项将原路退回用户。</p>
      </div>
      <template #footer>
        <el-button @click="refundVisible = false">取消</el-button>
        <el-button type="success" :loading="refundLoading" @click="doConfirmRefund">确认退款</el-button>
      </template>
    </el-dialog>

    <!-- 拒绝售后弹窗 -->
    <el-dialog v-model="rejectVisible" title="拒绝售后" width="420px">
      <div v-if="rejectTarget">
        <p style="margin-bottom:12px">订单号：<b>{{ rejectTarget.orderNo }}</b></p>
        <el-form label-width="80px">
          <el-form-item label="拒绝原因" required>
            <el-input v-model="rejectReason" type="textarea" :rows="3" maxlength="200" show-word-limit placeholder="请输入拒绝原因" />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="rejectVisible = false">取消</el-button>
        <el-button type="danger" :loading="rejectLoading" :disabled="!rejectReason.trim()" @click="doReject">确认拒绝</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getAfterSalesOrders, confirmAfterSalesRefund, rejectAfterSales } from '@/api'

const loading = ref(false)
const orders = ref<any[]>([])
const total = ref(0)

const query = reactive({ module: '', page: 1, pageSize: 20 })

// ---- 确认退款 ----
const refundVisible = ref(false)
const refundTarget = ref<any>(null)
const refundLoading = ref(false)

function confirmRefund(row: any) {
  refundTarget.value = row
  refundVisible.value = true
}

async function doConfirmRefund() {
  if (!refundTarget.value) return
  refundLoading.value = true
  try {
    const amount = Number(refundTarget.value.payPrice || refundTarget.value.totalPrice)
    await confirmAfterSalesRefund(refundTarget.value.id, amount)
    ElMessage.success('退款已发起，订单进入「退款中」')
    refundVisible.value = false
    fetchOrders()
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败')
  } finally {
    refundLoading.value = false
  }
}

// ---- 拒绝售后 ----
const rejectVisible = ref(false)
const rejectTarget = ref<any>(null)
const rejectReason = ref('')
const rejectLoading = ref(false)

function rejectDialog(row: any) {
  rejectTarget.value = row
  rejectReason.value = ''
  rejectVisible.value = true
}

async function doReject() {
  if (!rejectTarget.value || !rejectReason.value.trim()) return
  rejectLoading.value = true
  try {
    await rejectAfterSales(rejectTarget.value.id, rejectReason.value.trim())
    ElMessage.success('已拒绝售后，订单恢复为「已完成」')
    rejectVisible.value = false
    fetchOrders()
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败')
  } finally {
    rejectLoading.value = false
  }
}

// ---- 数据 ----
async function fetchOrders() {
  loading.value = true
  try {
    const params: any = { page: query.page, pageSize: query.pageSize }
    if (query.module) params.module = query.module
    const res: any = await getAfterSalesOrders(params)
    orders.value = res.list || res.rows || []
    total.value = res.total || 0
  } catch (e: any) {
    ElMessage.error(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function resetQuery() {
  query.module = ''
  query.page = 1
  fetchOrders()
}

function formatDate(d: string) { return d ? d.slice(0, 16).replace('T', ' ') : '-' }

function moduleName(m: string) { return { seal: '刻章', newspaper: '登报', bookkeeping: '代理记账' }[m] || m }
function moduleType(m: string) { return { seal: '', newspaper: 'success', bookkeeping: 'warning' }[m] || '' }

function getOrderContent(row: any) {
  if (row.module === 'bookkeeping') {
    try {
      const r = JSON.parse(row.remark || '{}')
      if (r.taxpayerType) return `${r.taxpayerType === 'small' ? '小规模' : '一般纳税人'} / ${r.cycle || ''}`
    } catch {}
    return '代理记账'
  }
  return row.title || row.productName || row.remark || '-'
}

onMounted(() => fetchOrders())
</script>

<style scoped>
.page-container { padding: 20px; }
.filter-card { margin-bottom: 16px; }
.refund-box p { margin: 6px 0; }
</style>
