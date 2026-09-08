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
        </el-form-item>
      </el-form>

      <el-table :data="list" v-loading="loading" stripe>
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
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'
import { getComplaints, updateComplaintStatus } from '@/api'

const loading = ref(false)
const list = ref<any[]>([])
const pagination = ref({ page: 1, pageSize: 20, total: 0 })
const query = reactive({ keyword: '', status: '', page: 1, pageSize: 20 })

function formatDate(d?: string | null) { return d ? dayjs(d).format('YYYY-MM-DD HH:mm') : '-' }

const detailVisible = ref(false)
const detailRow = ref<any>(null)
function handleView(row: any) { detailRow.value = row; detailVisible.value = true }

async function fetchData() {
  loading.value = true
  try {
    const res: any = await getComplaints({ ...query })
    list.value = Array.isArray(res?.list) ? res.list : []
    pagination.value = res?.pagination ?? { page: query.page, pageSize: query.pageSize, total: 0 }
    if (res?.pagination?.page) query.page = res.pagination.page
  } catch (e: any) {
    ElMessage.error(e?.message || '加载失败')
    list.value = []
  } finally { loading.value = false }
}
function search() { query.page = 1; fetchData() }
function reset() { query.keyword = ''; query.status = ''; search() }
function handleSizeChange() { query.page = 1; fetchData() }

async function handleResolve(row: any) {
  try {
    await ElMessageBox.confirm(`确认将投诉 ${row.id.slice(0,8)} 标记为已处理？`, '提示', { type: 'info' })
    await updateComplaintStatus(row.id, 'resolved')
    ElMessage.success('已标记为已处理')
    fetchData()
  } catch (e: any) { if (e !== 'cancel' && e !== 'close') ElMessage.error(e?.message || '操作失败') }
}
async function handleClose(row: any) {
  try {
    await ElMessageBox.confirm(`确认关闭投诉 ${row.id.slice(0,8)}？`, '提示', { type: 'warning' })
    await updateComplaintStatus(row.id, 'closed')
    ElMessage.success('已关闭')
    fetchData()
  } catch (e: any) { if (e !== 'cancel' && e !== 'close') ElMessage.error(e?.message || '操作失败') }
}

onMounted(fetchData)
</script>
