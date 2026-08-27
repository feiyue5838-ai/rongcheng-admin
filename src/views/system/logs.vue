<template>
  <div>
    <div class="page-header"><h2>操作日志</h2></div>
    <div class="page-card">
      <el-form inline :model="query" class="search-form">
        <el-form-item label="操作模块">
          <el-select v-model="query.module" clearable placeholder="全部" style="width: 140px" :loading="modulesLoading" @visible-change="loadModules">
            <el-option v-for="m in moduleOptions" :key="m" :label="m" :value="m" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期">
          <el-date-picker v-model="dateRange" type="daterange" range-separator="至" start-placeholder="开始" end-placeholder="结束" value-format="YYYY-MM-DD" style="width: 260px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="search">搜索</el-button>
          <el-button @click="reset">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="logs" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="220" show-overflow-tooltip />
        <el-table-column label="操作人" width="110">
          <template #default="{ row }">{{ row.admin?.nickname || '系统' }}</template>
        </el-table-column>
        <el-table-column prop="module" label="模块" width="100" />
        <el-table-column prop="action" label="操作" width="110" />
        <el-table-column prop="target" label="操作对象" min-width="180" show-overflow-tooltip />
        <el-table-column prop="ip" label="IP" width="120" show-overflow-tooltip />
        <el-table-column label="详情" min-width="180">
          <template #default="{ row }">
            <span class="detail-summary" :title="row.detail" @click="openDetail(row)">{{ parseDetailSummary(row.detail, row.action) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="时间" width="160">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
      </el-table>

      <el-pagination
        style="margin-top: 20px; justify-content: flex-end"
        v-model:current-page="query.page"
        v-model:page-size="query.pageSize"
        :total="pagination.total"
        :page-sizes="[20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        @change="fetchLogs"
      />
    </div>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="日志详情" width="680px">
      <div v-if="currentLog" class="log-detail">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="操作人">{{ currentLog.admin?.nickname || '系统' }}</el-descriptions-item>
          <el-descriptions-item label="时间">{{ formatDate(currentLog.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="模块">{{ currentLog.module }}</el-descriptions-item>
          <el-descriptions-item label="操作">{{ currentLog.action }}</el-descriptions-item>
          <el-descriptions-item label="IP" :span="2">{{ currentLog.ip || '-' }}</el-descriptions-item>
          <el-descriptions-item label="操作对象" :span="2">{{ currentLog.target }}</el-descriptions-item>
        </el-descriptions>
        <div style="margin-top: 16px">
          <div style="font-weight: 600; margin-bottom: 8px">请求 / 响应</div>
          <el-tabs>
            <el-tab-pane label="请求体">
              <pre class="json-pre">{{ formatJson(currentLog._parsedDetail?.body) }}</pre>
            </el-tab-pane>
            <el-tab-pane label="路由参数">
              <pre class="json-pre">{{ formatJson(currentLog._parsedDetail?.params) }}</pre>
            </el-tab-pane>
            <el-tab-pane label="响应结果">
              <pre class="json-pre">{{ formatJson(currentLog._parsedDetail?.result) }}</pre>
            </el-tab-pane>
          </el-tabs>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { getLogs, getLogModules } from '@/api'
import dayjs from 'dayjs'

const loading = ref(false)
const logs = ref<any[]>([])
const pagination = ref({ page: 1, pageSize: 20, total: 0 })
const query = reactive({ module: '', startDate: '', endDate: '', page: 1, pageSize: 20 })
const dateRange = ref<string[]>([])

// 模块下拉：动态加载
const moduleOptions = ref<string[]>([])
const modulesLoading = ref(false)

// 详情弹窗
const detailVisible = ref(false)
const currentLog = ref<any>(null)

function formatDate(d: string) { return dayjs(d).format('YYYY-MM-DD HH:mm') }

// 解析 detail JSON，缓存到 _parsedDetail 避免重复解析
function parseDetail(detail: string): any {
  if (!detail) return null
  try { return JSON.parse(detail) } catch { return null }
}

// 从 result 对象提取显示摘要
function extractSummary(result: any, action: string): string {
  if (!result) return '-'
  // 新增类
  if (action?.includes('创建') || action?.includes('新增') || action?.includes('添加')) {
    return result.name || result.username || result.nickname || result.title || result.id?.substring(0, 8) || '新增成功'
  }
  // 删除类
  if (action?.includes('删除')) return '已删除'
  // 登录类
  if (action?.includes('登录')) return result.username || '-'
  // 更新/状态类：显示关键字段变化
  const fields = ['status', 'role', 'nickname', 'name', 'phone', 'contact']
  const changed = fields
    .filter(f => result[f] !== undefined)
    .map(f => {
      const val = result[f]
      if (f === 'status') return '状态:' + (val === 1 ? '正常' : '禁用')
      return f + ':' + String(val)
    })
  if (changed.length) return changed.join(' | ')
  // fallback: 取 id / name
  return result.name || result.username || result.nickname || result.id?.substring(0, 12) || '-'
}

function parseDetailSummary(detail: string, action: string): string {
  const parsed = parseDetail(detail)
  return extractSummary(parsed?.result, action)
}

async function loadModules() {
  if (moduleOptions.value.length > 0) return
  modulesLoading.value = true
  try {
    const res = await getLogModules()
    moduleOptions.value = Array.isArray(res) ? res : []
  } finally {
    modulesLoading.value = false
  }
}

function openDetail(row: any) {
  row._parsedDetail = parseDetail(row.detail)
  currentLog.value = row
  detailVisible.value = true
}

function formatJson(obj: any): string {
  if (!obj) return '(空)'
  // 后端对超长日志按分区返回字符串预览，直接展示以避免二次 JSON 转义。
  if (typeof obj === 'string') return obj
  return JSON.stringify(obj, null, 2)
}

async function fetchLogs() {
  loading.value = true
  query.startDate = dateRange.value?.[0] || ''
  query.endDate = dateRange.value?.[1] || ''
  try {
    const res: any = await getLogs(query)
    logs.value = res.list
    pagination.value = res.pagination
  } finally {
    loading.value = false
  }
}

function search() { query.page = 1; fetchLogs() }
function reset() { query.module = ''; dateRange.value = []; search() }
onMounted(fetchLogs)
</script>

<style scoped>
.detail-summary {
  cursor: pointer;
  color: #409eff;
  font-size: 13px;
}
.detail-summary:hover {
  text-decoration: underline;
}
.json-pre {
  background: #f5f7fa;
  padding: 12px;
  border-radius: 4px;
  font-size: 12px;
  max-height: 320px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
}
</style>
