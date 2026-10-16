<template>
  <div>
    <div class="page-header"><h2>用户管理</h2></div>
    <div class="page-card">
      <el-form inline :model="query" class="search-form">
        <el-form-item label="关键词"><el-input v-model="query.keyword" placeholder="昵称/手机号/姓名" clearable style="width: 200px" /></el-form-item>
        <el-form-item><el-button type="primary" @click="search">搜索</el-button><el-button @click="reset">重置</el-button></el-form-item>
      </el-form>
      <el-table :data="list" v-loading="loading" stripe empty-text="暂无用户数据">
        <el-table-column prop="id" label="用户ID" min-width="230" show-overflow-tooltip />
        <el-table-column label="昵称" min-width="140">
          <template #default="{ row }">{{ row.nickname || `微信用户 ${shortId(row.id)}` }}</template>
        </el-table-column>
        <el-table-column label="手机号" width="130">
          <template #default="{ row }">{{ row.phone || '-' }}</template>
        </el-table-column>
        <el-table-column label="真实姓名" width="120">
          <template #default="{ row }">{{ row.realname || '-' }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }"><el-tag :type="row.status===1?'success':'danger'" size="small">{{ row.status===1?'正常':'禁用' }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="lastLoginAt" label="最近登录" width="170">
          <template #default="{ row }">{{ row.lastLoginAt ? formatDate(row.lastLoginAt) : '-' }}</template>
        </el-table-column>
        <el-table-column prop="createdAt" label="注册时间" width="170">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="viewOrders(row)">订单</el-button>
            <el-button type="warning" link @click="handleToggleStatus(row)">{{ row.status === 1 ? '禁用' : '启用' }}</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination style="margin-top: 20px; justify-content: flex-end" v-model:current-page="query.page" v-model:page-size="query.pageSize" :total="pagination.total" :page-sizes="[20, 50, 100]" layout="total, sizes, prev, pager, next" @current-change="fetchUsers" @size-change="handleSizeChange" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getUsers, updateUser, deleteUser } from '@/api'
import type { UserListItem, UserStatus } from '@/api/types'
import dayjs from 'dayjs'

const loading = ref(false)
const list = ref<UserListItem[]>([])
const pagination = ref({ page: 1, pageSize: 20, total: 0 })
const query = reactive({ keyword: '', page: 1, pageSize: 20 })
const router = useRouter()

function formatDate(d?: string | null) { return d ? dayjs(d).format('YYYY-MM-DD HH:mm') : '-' }
function shortId(id?: string) { return id ? id.slice(0, 8) : '未知' }
async function fetchUsers() {
  loading.value = true
  try {
    const res = await getUsers({ ...query })
    list.value = Array.isArray(res.list) ? res.list : []
    pagination.value = res.pagination
    if (res.pagination.page > 0) query.page = res.pagination.page
  } catch {
    list.value = []
    pagination.value = { page: query.page, pageSize: query.pageSize, total: 0 }
  } finally {
    loading.value = false
  }
}
function viewOrders(row: unknown) {
  const user = row as UserListItem
  router.push({ path: '/v2/orders', query: { keyword: user.phone || user.id } })
}
async function handleToggleStatus(row: unknown) {
  // Element Plus 表格插槽未透传 data 的行类型；事件来源仅为已类型化的 list。
  const user = row as UserListItem
  const newStatus: UserStatus = user.status === 1 ? 0 : 1
  const oldStatus = user.status
  try {
    await ElMessageBox.confirm(`确定要${newStatus === 1 ? '启用' : '禁用'}该用户吗？`, '提示', { type: 'warning' })
    await updateUser(user.id, { status: newStatus })
    user.status = newStatus
    ElMessage.success(newStatus === 1 ? '已启用' : '已禁用')
  } catch (error: unknown) {
    if (error !== 'cancel' && error !== 'close') {
      user.status = oldStatus
      ElMessage.error(error instanceof Error ? error.message : '操作失败')
    }
  }
}
async function handleDelete(row: unknown) {
  const user = row as UserListItem
  try {
    await ElMessageBox.confirm('确定删除该用户？删除后不可恢复。', '危险操作', { type: 'error', confirmButtonText: '删除' })
    await deleteUser(user.id)
    ElMessage.success('删除成功')
    fetchUsers()
  } catch (error: unknown) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(error instanceof Error ? error.message : '删除失败')
    }
  }
}
function search() { query.page = 1; fetchUsers() }
function reset() { query.keyword = ''; search() }
function handleSizeChange() { query.page = 1; fetchUsers() }
onMounted(fetchUsers)
</script>
