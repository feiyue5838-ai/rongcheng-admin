<template>
  <div>
    <div class="page-header"><h2>投诉管理</h2></div>
    <div class="page-card">
      <el-form inline :model="query" class="search-form">
        <el-form-item label="关键词">
          <el-input v-model="query.keyword" placeholder="手机号/订单号/描述" clearable style="width: 220px" @keyup.enter="search" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" clearable placeholder="全部" style="width: 140px" @change="search">
            <el-option label="待处理" value="pending" />
            <el-option label="已处理" value="resolved" />
            <el-option label="已关闭" value="closed" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="search">搜索</el-button>
          <el-button @click="reset">重置</el-button>
          <el-button type="success" :disabled="selected.length === 0" @click="handleBatch('resolved')">批量已处理 ({{ selected.length }})</el-button>
          <el-button type="info" :disabled="selected.length === 0" @click="handleBatch('closed')">批量关闭 ({{ selected.length }})</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="list" v-loading="loading" stripe @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="45" />
        <el-table-column prop="id" label="ID" width="200" show-overflow-tooltip />
        <el-table-column prop="type" label="类型" width="110" />
        <el-table-column prop="orderNo" label="订单号" width="180" show-overflow-tooltip />
        <el-table-column prop="description" label="描述" min-width="240" show-overflow-tooltip />
        <el-table-column prop="phone" label="手机号" width="130" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'pending' ? 'warning' : 'success'" size="small">{{ row.status === 'pending' ? '待处理' : row.status === 'resolved' ? '已处理' : '已关闭' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="提交时间" width="170">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleView(row)">查看</el-button>
            <el-button v-if="row.status === 'pending'" type="success" link size="small" @click="handleResolve(row)">标记已处理</el-button>
            <el-button v-if="row.status === 'pending'" type="info" link size="small" @click="handleClose(row)">关闭</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination style="margin-top: 20px; justify-content: flex-end" v-model:current-page="query.page" v-model:page-size="query.pageSize" :total="pagination.total" :page-sizes="[20, 50, 100]" layout="total, sizes, prev, pager, next" @current-change="fetchData" @size-change="handleSizeChange" />
    </div>

    <el-dialog v-model="detailVisible" title="投诉详情" width="560px">
      <el-descriptions v-if="detailRow" :column="2" border>
        <el-descriptions-item label="ID" :span="2">{{ detailRow.id }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ detailRow.type }}</el-descriptions-item>
        <el-descriptions-item label="状态"><el-tag :type="detailRow.status === 'pending' ? 'warning' : 'success'" size="small">{{ detailRow.status === 'pending' ? '待处理' : detailRow.status === 'resolved' ? '已处理' : '已关闭' }}</el-tag></el-descriptions-item>
        <el-descriptions-item label="订单号" :span="2">{{ detailRow.orderNo || '-' }}</el-descriptions-item>
        <el-descriptions-item label="手机号">{{ detailRow.phone }}</el-descriptions-item>
        <el-descriptions-item label="用户ID">{{ detailRow.userId || '-' }}</el-descriptions-item>
        <el-descriptions-item label="提交时间" :span="2">{{ formatDate(detailRow.createdAt) }}</el-descriptions-item>
        <el-descriptions-item label="描述" :span="2"><span style="white-space: pre-wrap; word-break: break-all">{{ detailRow.description }}</span></el-descriptions-item>
        <el-descriptions-item v-if="detailRow.reply" label="回复内容" :span="2"><span style="white-space: pre-wrap; word-break: break-all">{{ detailRow.reply }}</span></el-descriptions-item>
        <el-descriptions-item v-if="detailRow.replyAt" label="回复时间">{{ formatDate(detailRow.replyAt) }}</el-descriptions-item>
      </el-descriptions>
      <div v-if="detailRow && detailRow.status === 'pending'" style="margin-top: 12px">
        <el-input v-model="replyText" type="textarea" :rows="3" placeholder="填写回复内容（将同步给用户）" />
        <div style="margin-top: 8px; text-align: right">
          <el-button @click="detailVisible = false">取消</el-button>
          <el-button type="primary" :loading="replying" @click="handleReply">回复并标记已处理</el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'
import { getComplaints, updateComplaintStatus, batchComplaintStatus } from '@/api'
import { toPaged, unwrapV1 } from '@/api/unwrap'

type ComplaintStatus = 'pending' | 'resolved' | 'closed'
type BatchComplaintStatus = Exclude<ComplaintStatus, 'pending'>

interface ComplaintItem {
  id: string
  type: string
  orderNo?: string | null
  description: string
  phone: string
  userId?: string | null
  status: ComplaintStatus
  createdAt?: string | null
  reply?: string | null
  replyAt?: string | null
}

interface ComplaintQuery {
  keyword: string
  status: string
  page: number
  pageSize: number
}

interface ComplaintPagination {
  page?: number
  pageSize?: number
  total?: number
}

interface ComplaintPageResponse {
  list?: ComplaintItem[]
  pagination?: ComplaintPagination
  total?: number
}

interface BatchComplaintResult {
  successCount?: number
  failedCount?: number
}

const loading = ref(false)
const list = ref<ComplaintItem[]>([])
const pagination = ref({ page: 1, pageSize: 20, total: 0 })
const query = reactive<ComplaintQuery>({ keyword: '', status: '', page: 1, pageSize: 20 })

function formatDate(d?: string | null) { return d ? dayjs(d).format('YYYY-MM-DD HH:mm') : '-' }

const detailVisible = ref(false)
const detailRow = ref<ComplaintItem | null>(null)
const replyText = ref('')
const replying = ref(false)
const selected = ref<ComplaintItem[]>([])

async function handleBatch(status: BatchComplaintStatus) {
  const ids = selected.value.map(r => r.id).filter(Boolean)
  if (ids.length === 0) return
  try {
    await ElMessageBox.confirm(`确认批量${status === 'resolved' ? '标记已处理' : '关闭'} ${ids.length} 条投诉？`, '提示', { type: status === 'resolved' ? 'success' : 'warning' })
    const response: unknown = await batchComplaintStatus(ids, status)
    const result = unwrapV1<BatchComplaintResult>(response)
    const ok = result?.successCount ?? 0
    const fail = result?.failedCount ?? 0
    ElMessage[fail > 0 ? 'warning' : 'success'](fail > 0 ? `成功 ${ok} 条，失败 ${fail} 条` : `批量处理成功 ${ok} 条`)
    selected.value = []
    fetchData()
  } catch (error: unknown) {
    if (!isDialogCancellation(error)) ElMessage.error(getApiErrorMessage(error) || '操作失败')
  }
}

function handleSelectionChange(rows: ComplaintItem[]) {
  selected.value = rows
}

function handleView(row: ComplaintItem) {
  detailRow.value = row
  replyText.value = row.reply || ''
  detailVisible.value = true
}

async function handleReply() {
  if (!detailRow.value) return
  if (!replyText.value.trim()) { ElMessage.warning('请先填写回复内容'); return }
  replying.value = true
  try {
    await updateComplaintStatus(detailRow.value.id, 'resolved', replyText.value.trim())
    ElMessage.success('已回复并标记为已处理')
    detailVisible.value = false
    fetchData()
  } catch (error: unknown) {
    ElMessage.error(getApiErrorMessage(error) || '操作失败')
  } finally {
    replying.value = false
  }
}

async function fetchData() {
  loading.value = true
  try {
    const response: unknown = await getComplaints({ ...query })
    const result = toPaged<ComplaintItem>(response)
    const pageResponse = unwrapV1<ComplaintPageResponse>(response)
    const responsePage = pageResponse?.pagination?.page
    const responsePageSize = pageResponse?.pagination?.pageSize
    list.value = result.list
    pagination.value = {
      page: responsePage ?? query.page,
      pageSize: responsePageSize ?? query.pageSize,
      total: result.total,
    }
    if (responsePage) query.page = responsePage
  } catch (error: unknown) {
    ElMessage.error(getApiErrorMessage(error) || '加载失败')
    list.value = []
  } finally { loading.value = false }
}
function search() { query.page = 1; fetchData() }
function reset() { query.keyword = ''; query.status = ''; search() }
function handleSizeChange() { query.page = 1; fetchData() }

async function handleResolve(row: ComplaintItem) {
  try {
    await ElMessageBox.confirm(`确认将投诉 ${row.id.slice(0,8)} 标记为已处理？`, '提示', { type: 'info' })
    await updateComplaintStatus(row.id, 'resolved')
    ElMessage.success('已标记为已处理')
    fetchData()
  } catch (error: unknown) {
    if (!isDialogCancellation(error)) ElMessage.error(getApiErrorMessage(error) || '操作失败')
  }
}
async function handleClose(row: ComplaintItem) {
  try {
    await ElMessageBox.confirm(`确认关闭投诉 ${row.id.slice(0,8)}？`, '提示', { type: 'warning' })
    await updateComplaintStatus(row.id, 'closed')
    ElMessage.success('已关闭')
    fetchData()
  } catch (error: unknown) {
    if (!isDialogCancellation(error)) ElMessage.error(getApiErrorMessage(error) || '操作失败')
  }
}

function getApiErrorMessage(error: unknown): string | undefined {
  if (axios.isAxiosError<{ message?: unknown }>(error)) {
    const message = error.response?.data?.message
    if (message) return Array.isArray(message) ? message.join('；') : String(message)
  }
  return error instanceof Error ? error.message : undefined
}

function isDialogCancellation(error: unknown): boolean {
  return error === 'cancel' || error === 'close'
}

onMounted(fetchData)
</script>
