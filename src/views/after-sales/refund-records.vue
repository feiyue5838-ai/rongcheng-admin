<template>
  <div class="page-container">
    <!-- 筛选区 -->
    <el-card shadow="never" class="filter-card">
      <el-form :inline="true" :model="query">
        <el-form-item label="模块">
          <el-select v-model="query.module" placeholder="全部模块" clearable style="width: 140px" @change="fetchRecords">
            <el-option label="刻章" value="seal" />
            <el-option label="登报" value="newspaper" />
            <el-option label="代理记账" value="bookkeeping" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部状态" clearable style="width: 140px" @change="fetchRecords">
            <el-option label="退款中" :value="8" />
            <el-option label="已退款" :value="9" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期范围">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 240px"
            @change="onDateChange"
          />
        </el-form-item>
        <el-form-item label=" ">
          <el-button type="primary" @click="fetchRecords">查询</el-button>
          <el-button @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 列表 -->
    <el-card shadow="never" class="table-card">
      <el-table :data="records" v-loading="loading" stripe>
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
            <span style="text-decoration:line-through;color:#999">¥{{ row.payPrice || row.totalPrice }}</span>
          </template>
        </el-table-column>
        <el-table-column label="退款金额" width="110" align="right">
          <template #default="{ row }">
            <span style="color:#E6A23C;font-weight:600">¥{{ getRefundFee(row) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="退款ID" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">
            <span style="font-size:12px;color:#666">{{ getRefundId(row) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">{{ statusName(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="退款时间" width="160">
          <template #default="{ row }">
            {{ getRefundTime(row) }}
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
        @size-change="fetchRecords"
        @current-change="fetchRecords"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getRefundRecords } from '@/api'

const loading = ref(false)
const records = ref<any[]>([])
const total = ref(0)
const dateRange = ref<string[]>([])

const query = reactive({ module: '', status: '', startDate: '', endDate: '', page: 1, pageSize: 20 })

async function fetchRecords() {
  loading.value = true
  try {
    const params: any = { page: query.page, pageSize: query.pageSize }
    if (query.module) params.module = query.module
    if (query.status) params.status = query.status
    if (query.startDate) params.startDate = query.startDate
    if (query.endDate) params.endDate = query.endDate
    const res = await getRefundRecords(params)
    records.value = res.rows || []
    total.value = res.total || 0
  } catch (e: any) {
    ElMessage.error(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function resetQuery() {
  query.module = ''
  query.status = ''
  query.startDate = ''
  query.endDate = ''
  dateRange.value = []
  query.page = 1
  fetchRecords()
}

function onDateChange(val: string[]) {
  query.startDate = val?.[0] || ''
  query.endDate = val?.[1] || ''
}

function getRefundFee(row: any) {
  try {
    const r = JSON.parse(row.remark || '{}')
    if (r.refund?.refundFee) return (r.refund.refundFee / 100).toFixed(2)
  } catch {}
  return (row.payPrice || row.totalPrice || 0).toFixed(2)
}

function getRefundId(row: any) {
  try {
    const r = JSON.parse(row.remark || '{}')
    return r.refund?.refundId || '-'
  } catch { return '-' }
}

function getRefundTime(row: any) {
  try {
    const r = JSON.parse(row.remark || '{}')
    if (r.refund?.refundedAt) return r.refund.refundedAt.slice(0, 16).replace('T', ' ')
  } catch {}
  return formatDate(row.createdAt)
}

function formatDate(d: string) { return d ? d.slice(0, 16).replace('T', ' ') : '-' }

function moduleName(m: string) { return { seal: '刻章', newspaper: '登报', bookkeeping: '代理记账' }[m] || m }
function moduleType(m: string) { return { seal: '', newspaper: 'success', bookkeeping: 'warning' }[m] || '' }
function statusName(s: number) { return { 8: '退款中', 9: '已退款' }[s] || s }
function statusType(s: number) { return { 8: 'danger', 9: 'info' }[s] || '' }

onMounted(() => fetchRecords())
</script>

<style scoped>
.page-container { padding: 20px; }
.filter-card { margin-bottom: 16px; }
</style>
