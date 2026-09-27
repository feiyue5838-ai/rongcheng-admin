<template>
  <div>
    <div class="page-header"><h2>操作日志</h2></div>
    <div class="page-card">
      <el-form inline :model="query" class="search-form">
        <el-form-item label="操作模块">
          <el-select v-model="query.module" clearable placeholder="全部" style="width: 140px" :loading="modulesLoading" @visible-change="loadModules">
            <el-option v-for="m in moduleOptions" :key="m" :label="operationLogModuleText(m)" :value="m" />
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
        <el-table-column prop="id" label="日志编号" width="220" show-overflow-tooltip />
        <el-table-column label="操作人" width="110">
          <template #default="{ row }">{{ operationLogOperatorText(row) }}</template>
        </el-table-column>
        <el-table-column label="模块" width="100">
          <template #default="{ row }">{{ operationLogModuleText(row.module) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">{{ operationLogActionText(row.action) }}</template>
        </el-table-column>
        <el-table-column label="操作对象" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">{{ operationLogTargetText(row.target) }}</template>
        </el-table-column>
        <el-table-column prop="ip" label="来源地址" width="140" show-overflow-tooltip />
        <el-table-column label="详情" min-width="180">
          <template #default="{ row }">
            <span class="detail-summary" title="点击查看详情" @click="openDetail(row)">{{ operationLogSummary(row.detail, row.action) }}</span>
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
        @current-change="fetchLogs"
        @size-change="handleSizeChange"
      />
    </div>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="日志详情" width="680px">
      <div v-if="currentLog" class="log-detail">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="操作人">{{ operationLogOperatorText(currentLog) }}</el-descriptions-item>
          <el-descriptions-item label="时间">{{ formatDate(currentLog.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="模块">{{ operationLogModuleText(currentLog.module) }}</el-descriptions-item>
          <el-descriptions-item label="操作">{{ operationLogActionText(currentLog.action) }}</el-descriptions-item>
          <el-descriptions-item label="来源地址" :span="2">{{ currentLog.ip || '未记录' }}</el-descriptions-item>
          <el-descriptions-item label="操作对象" :span="2">{{ operationLogTargetText(currentLog.target) }}</el-descriptions-item>
        </el-descriptions>
        <div style="margin-top: 16px">
          <div style="font-weight: 600; margin-bottom: 8px">操作明细</div>
          <el-tabs>
            <el-tab-pane label="请求体">
              <pre class="json-pre">{{ formatOperationLogDetail(currentLog._parsedDetail?.body) }}</pre>
            </el-tab-pane>
            <el-tab-pane label="路由参数">
              <pre class="json-pre">{{ formatOperationLogDetail(currentLog._parsedDetail?.params) }}</pre>
            </el-tab-pane>
            <el-tab-pane label="响应结果">
              <pre class="json-pre">{{ formatOperationLogDetail(currentLog._parsedDetail?.result) }}</pre>
            </el-tab-pane>
            <el-tab-pane v-if="currentLog._parsedDetail?.error" label="失败原因">
              <pre class="json-pre">{{ formatOperationLogDetail(currentLog._parsedDetail.error) }}</pre>
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
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'
import {
  formatOperationLogDetail,
  operationLogActionText,
  operationLogModuleText,
  operationLogOperatorText,
  operationLogSummary,
  operationLogTargetText,
  parseOperationLogDetail,
} from '@/utils/operation-log'

const loading = ref(false)
const logs = ref<any[]>([])
const pagination = ref({ total: 0 })
const query = reactive({ module: '', startDate: '', endDate: '', page: 1, pageSize: 20 })
const dateRange = ref<string[]>([])

// 模块下拉：动态加载
const moduleOptions = ref<string[]>([])
const modulesLoading = ref(false)

// 详情弹窗
const detailVisible = ref(false)
const currentLog = ref<any>(null)

function formatDate(d: string) {
  if (!d) return '-'
  const v = dayjs(d)
  return v.isValid() ? v.format('YYYY-MM-DD HH:mm:ss') : String(d)
}

async function loadModules(visible?: boolean) {
  if (visible === false) return
  if (moduleOptions.value.length > 0) return
  modulesLoading.value = true
  try {
    const res = await getLogModules()
    moduleOptions.value = Array.isArray(res) ? res : (Array.isArray((res as any)?.data) ? (res as any).data : [])
  } catch (e: any) {
    // 降级：不阻塞表格，静默失败仅提示
    console.warn('[logs] loadModules failed', e?.message || e)
  } finally {
    modulesLoading.value = false
  }
}

function openDetail(row: any) {
  const parsed = parseOperationLogDetail(row.detail)
  // 不直接变异表格行，避免污染列表响应式
  currentLog.value = { ...row, _parsedDetail: parsed }
  detailVisible.value = true
}

async function fetchLogs() {
  loading.value = true
  query.startDate = dateRange.value?.[0] || ''
  query.endDate = dateRange.value?.[1] || ''
  try {
    const res: any = await getLogs({ ...query })
    logs.value = Array.isArray(res?.list) ? res.list : []
    const pg = res?.pagination
    pagination.value.total = Number(pg?.total ?? 0)
    // 服务端可能纠正页码/页大小，保持前端一致但不触发二次请求
    if (pg?.page && pg.page !== query.page) query.page = pg.page
    if (pg?.pageSize && pg.pageSize !== query.pageSize) query.pageSize = pg.pageSize
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || e?.message || '加载日志失败')
    logs.value = []
    pagination.value.total = 0
  } finally {
    loading.value = false
  }
}

function handleSizeChange(size: number) {
  query.pageSize = size
  query.page = 1
  fetchLogs()
}

function search() { query.page = 1; fetchLogs() }
function reset() { query.module = ''; dateRange.value = []; search() }
onMounted(() => {
  fetchLogs()
  loadModules(true)
})
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
