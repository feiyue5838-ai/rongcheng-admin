<template>
  <div>
    <div class="page-header"><h2>用户管理</h2></div>
    <div class="page-card">
      <el-form inline :model="query" class="search-form">
        <el-form-item label="关键词"><el-input v-model="query.keyword" placeholder="昵称/手机号/姓名" clearable style="width: 200px" /></el-form-item>
        <el-form-item><el-button type="primary" @click="search">搜索</el-button><el-button @click="reset">重置</el-button></el-form-item>
      </el-form>
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="id" label="用户ID" width="300" />
        <el-table-column prop="nickname" label="昵称" />
        <el-table-column prop="phone" label="手机号" width="130" />
        <el-table-column prop="realname" label="真实姓名" width="120" />
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }"><el-tag :type="row.status===1?'success':'danger'" size="small">{{ row.status===1?'正常':'禁用' }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="lastLoginAt" label="最近登录" width="170">
          <template #default="{ row }">{{ row.lastLoginAt ? formatDate(row.lastLoginAt) : '-' }}</template>
        </el-table-column>
        <el-table-column prop="createdAt" label="注册时间" width="170">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button type="primary" link @click="$router.push(`/orders/seal?keyword=${row.phone}`)">订单</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination style="margin-top: 20px; justify-content: flex-end" v-model:current-page="query.page" v-model:page-size="query.pageSize" :total="pagination.total" :page-sizes="[20, 50, 100]" layout="total, sizes, prev, pager, next" @change="fetchUsers" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { getUsers } from '@/api'
import dayjs from 'dayjs'

const loading = ref(false)
const list = ref<any[]>([])
const pagination = ref({ page: 1, pageSize: 20, total: 0 })
const query = reactive({ keyword: '', page: 1, pageSize: 20 })

function formatDate(d: string) { return dayjs(d).format('YYYY-MM-DD HH:mm') }
async function fetchUsers() { loading.value = true; try { const res: any = await getUsers(query); list.value = res.list; pagination.value = res.pagination } finally { loading.value = false } }
function search() { query.page = 1; fetchUsers() }
function reset() { query.keyword = ''; search() }
onMounted(fetchUsers)
</script>
