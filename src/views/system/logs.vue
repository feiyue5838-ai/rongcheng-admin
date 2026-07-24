<template>
  <div>
    <div class="page-header"><h2>操作日志</h2></div>
    <div class="page-card">
      <el-form inline :model="query" class="search-form">
        <el-form-item label="操作模块"><el-select v-model="query.module" clearable placeholder="全部" style="width: 140px">
          <el-option v-for="m in modules" :key="m" :label="m" :value="m" />
        </el-select></el-form-item>
        <el-form-item label="日期"><el-date-picker v-model="dateRange" type="daterange" range-separator="至" start-placeholder="开始" end-placeholder="结束" value-format="YYYY-MM-DD" style="width: 260px" /></el-form-item>
        <el-form-item><el-button type="primary" @click="search">搜索</el-button><el-button @click="reset">重置</el-button></el-form-item>
      </el-form>
      <el-table :data="logs" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="220" show-overflow-tooltip />
        <el-table-column prop="admin" label="操作人" width="120">
          <template #default="{ row }">{{ row.admin?.nickname || '系统' }}</template>
        </el-table-column>
        <el-table-column prop="module" label="模块" width="100" />
        <el-table-column prop="action" label="操作" width="100" />
        <el-table-column prop="target" label="操作对象" min-width="200" show-overflow-tooltip />
        <el-table-column prop="ip" label="IP" width="130" show-overflow-tooltip />
        <el-table-column prop="detail" label="详情" min-width="200" show-overflow-tooltip />
        <el-table-column prop="createdAt" label="时间" width="170"><template #default="{ row }">{{ formatDate(row.createdAt) }}</template></el-table-column>
      </el-table>
      <el-pagination style="margin-top: 20px; justify-content: flex-end" v-model:current-page="query.page" v-model:page-size="query.pageSize" :total="pagination.total" :page-sizes="[20, 50, 100]" layout="total, sizes, prev, pager, next" @change="fetchLogs" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { getLogs } from '@/api'
import dayjs from 'dayjs'

const loading = ref(false), logs = ref<any[]>([])
const pagination = ref({ page: 1, pageSize: 20, total: 0 })
const query = reactive({ module: '', startDate: '', endDate: '', page: 1, pageSize: 20 })
const dateRange = ref<string[]>([])
const modules = ['管理员', '订单', '印章', '报纸', '用户', '评价', '问答', '系统']

function formatDate(d: string) { return dayjs(d).format('YYYY-MM-DD HH:mm') }
async function fetchLogs() { loading.value = true; query.startDate = dateRange.value?.[0]||''; query.endDate = dateRange.value?.[1]||''; try { const res: any = await getLogs(query); logs.value = res.list; pagination.value = res.pagination } finally { loading.value = false } }
function search() { query.page = 1; fetchLogs() }
function reset() { query.module = ''; dateRange.value = []; search() }
onMounted(fetchLogs)
</script>
