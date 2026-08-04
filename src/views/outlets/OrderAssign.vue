<template>
  <div class="page-wrapper">
    <div class="page-header">
      <h2>订单分配管理</h2>
    </div>

    <div class="page-card">

      <!-- tab 切换 -->
      <el-tabs v-model="activeTab" @tab-change="loadData" class="assign-tabs">
        <el-tab-pane label="待分配订单" name="pending">
          <template #label>
            待分配 <el-badge :value="pendingCount" :hidden="!pendingCount" type="warning" />
          </template>
        </el-tab-pane>
        <el-tab-pane label="已分配订单" name="assigned" />
      </el-tabs>

      <!-- 统计行（渐变背景） -->
      <div class="stats-row">
        <div class="stat-card stat-orange">
          <div class="stat-icon">📋</div>
          <div class="stat-info">
            <span class="stat-num">{{ pendingCount }}</span>
            <span class="stat-label">待分配订单</span>
          </div>
        </div>
        <div class="stat-card stat-green">
          <div class="stat-icon">✓</div>
          <div class="stat-info">
            <span class="stat-num">{{ assignedCount }}</span>
            <span class="stat-label">已分配订单</span>
          </div>
        </div>
        <div class="stat-card stat-blue-seal">
          <div class="stat-icon">🔏</div>
          <div class="stat-info">
            <span class="stat-num">{{ pendingSealCount }}</span>
            <span class="stat-label">待分配刻章</span>
          </div>
        </div>
        <div class="stat-card stat-blue">
          <div class="stat-icon">📰</div>
          <div class="stat-info">
            <span class="stat-num">{{ pendingNewspaperCount }}</span>
            <span class="stat-label">待分配登报</span>
          </div>
        </div>
        <div class="stat-card stat-blue">
          <div class="stat-icon">📊</div>
          <div class="stat-info">
            <span class="stat-num">{{ pendingBookkeepingCount }}</span>
            <span class="stat-label">待分配代理记账</span>
          </div>
        </div>
      </div>

      <div v-if="statsLoading || statsError" class="stats-status">
        <span v-if="statsLoading">统计加载中…</span>
        <span v-else-if="statsError" class="stats-error">
          统计加载失败
          <el-button link type="primary" size="small" @click="loadStats">重试</el-button>
        </span>
      </div>

      <!-- 工具栏 -->
      <div class="toolbar-row">
        <el-input
          v-model="keyword"
          placeholder="搜索订单号/公司名称..."
          clearable
          prefix-icon="Search"
          style="width:240px"
          @keyup.enter="loadData"
        />
        <el-select v-model="module" placeholder="全部模块" clearable style="width:140px" @change="loadData">
          <el-option label="刻章" value="seal" />
          <el-option label="登报" value="newspaper" />
          <el-option label="代理记账" value="bookkeeping" />
        </el-select>
        <el-button type="primary" @click="loadData">
          <el-icon style="margin-right:4px"><Search /></el-icon>搜索
        </el-button>
        <el-button @click="keyword=''; module=''; loadData()">重置</el-button>
      </div>

      <!-- 待分配订单 -->
      <div v-if="activeTab === 'pending'">
        <div v-if="loading" v-loading="loading" style="min-height:200px" />
        <el-empty v-else-if="tableData.length === 0" description="暂无待分配订单" />
        <el-table v-else :data="tableData" stripe>
          <el-table-column prop="orderNo" label="订单编号" width="190" />
          <el-table-column label="模块" width="100">
            <template #default="{ row }">
              <el-tag :type="getModuleTagType(row.module)" size="small">{{ getModuleLabel(row.module) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="companyName" label="公司名称" min-width="160" show-overflow-tooltip />
          <el-table-column prop="type" label="印章类型" width="130" show-overflow-tooltip />
          <el-table-column prop="contactPhone" label="联系电话" width="130" />
          <el-table-column label="服务区域" min-width="140" show-overflow-tooltip>
            <template #default="{ row }">{{ row.serviceRegion || formatAddress(row.addressJson) || '-' }}</template>
          </el-table-column>
          <el-table-column label="订单金额" width="110">
            <template #default="{ row }">
              <span class="price-cell">¥{{ row.payPrice || row.totalPrice }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="下单时间" width="170">
            <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="100" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" size="small" @click="openAssignDialog(row)">分配网点</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 已分配订单 -->
      <div v-else>
        <el-table :data="tableData" v-loading="loading" stripe>
          <el-table-column prop="orderNo" label="订单编号" width="170" />
          <el-table-column label="模块" width="100">
            <template #default="{ row }">
              <el-tag :type="getModuleTagType(row.module)" size="small">{{ getModuleLabel(row.module) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="companyName" label="公司名称" min-width="160" show-overflow-tooltip />
          <el-table-column prop="contactPhone" label="联系电话" width="130" />
          <el-table-column label="服务区域" min-width="140" show-overflow-tooltip>
            <template #default="{ row }">{{ row.serviceRegion || formatAddress(row.addressJson) || '-' }}</template>
          </el-table-column>
          <el-table-column label="分配网点" min-width="140" show-overflow-tooltip>
            <template #default="{ row }">
              <span v-if="row.assignment?.outlet">{{ row.assignment.outlet.name }}</span>
              <span v-else class="text-gray">-</span>
            </template>
          </el-table-column>
          <el-table-column label="分配状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getAssignmentTagType(row.assignmentStatus)" size="small">
                {{ getAssignmentText(row.assignmentStatus) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="订单金额" width="110">
            <template #default="{ row }">
              <span class="price-cell">¥{{ row.payPrice || row.totalPrice }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="下单时间" width="170">
            <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 分页 -->
      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @change="loadData"
        />
      </div>

    </div>

    <!-- 分配网点弹窗 -->
    <el-dialog v-model="assignDialogVisible" title="分配网点" width="600px" class="assign-dialog">
      <div style="margin-bottom:12px;color:#666;font-size:13px">
        订单号：<b style="color:#333">{{ currentOrder?.orderNo }}</b>
        &nbsp;&nbsp;|&nbsp;&nbsp;
        已选：<b style="color:#5B6FE8">{{ currentOutletName || '—' }}</b>
      </div>
      <div style="margin-bottom:8px">
        <el-input v-model="outletKeyword" placeholder="搜索网点名称/城市/电话" clearable size="small" autofocus>
          <template #prefix><span style="color:#909399">🔍</span></template>
        </el-input>
      </div>
      <el-table
        :data="filteredOutlets"
        height="360"
        highlight-current-row
        :row-class-name="tableRowClassName"
        @row-click="onOutletRowClick"
        style="cursor:pointer"
      >
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="name" label="网点名称" min-width="160">
          <template #default="{ row }">
            <span v-html="highlight(row.name)" />
          </template>
        </el-table-column>
        <el-table-column label="城市" width="110">
          <template #default="{ row }">
            <span v-html="highlight(row.city)" />
          </template>
        </el-table-column>
        <el-table-column label="联系电话" width="130">
          <template #default="{ row }">
            <span v-html="highlight(row.phone)" />
          </template>
        </el-table-column>
        <el-table-column prop="address" label="地址" min-width="200" show-overflow-tooltip />
      </el-table>
      <div style="margin-top:12px">
        <el-input v-model="assignForm.remark" type="textarea" placeholder="分配备注（可选）" :rows="2" />
      </div>
      <template #footer>
        <el-button @click="assignDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="onConfirmAssign" :disabled="!assignForm.outletId">
          确认分配
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getUnassignedOrdersAPI, getAssignedOrdersAPI, assignOrderAPI, getOutletsAPI, getOrderStatistics } from '@/api'
import { formatDate } from '@/utils/format'

const activeTab = ref('pending')
const loading = ref(false)
const tableData = ref([])
const pendingCount = ref(0)
const assignedCount = ref(0)
const pendingSealCount = ref(0)
const pendingNewspaperCount = ref(0)
const pendingBookkeepingCount = ref(0)
const statsLoading = ref(false)
const statsError = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const keyword = ref('')
const module = ref('')

const assignDialogVisible = ref(false)
const submitting = ref(false)
const outlets = ref([])
const currentOrder = ref(null)
const outletKeyword = ref('')

const assignForm = reactive({ outletId: '', remark: '' })
const currentOutletName = ref('')

function tableRowClassName({ row }) {
  return row.id === assignForm.outletId ? 'current-row' : ''
}


function getAssignmentText(status) {
  const map = { 0: '未分配', 1: '已分配', 2: '制作中', 3: '已完成' }
  return map[status] || '未知'
}
function getAssignmentTagType(status) {
  const map = { 0: 'info', 1: 'primary', 2: 'warning', 3: 'success' }
  return map[status] || 'info'
}
function getModuleLabel(m) {
  const map = { seal: '刻章', newspaper: '登报', bookkeeping: '代理记账' }
  return map[m] || m
}
function getModuleTagType(m) {
  const map = { seal: '', newspaper: 'success', bookkeeping: 'warning' }
  return map[m] || 'info'
}
function formatAddress(addressJson) {
  if (!addressJson) return '-'
  try {
    const addr = typeof addressJson === 'string' ? JSON.parse(addressJson) : addressJson
    if (addr.province && addr.city) return `${addr.province} ${addr.city}`
    if (addr.province) return addr.province
    if (addr.city) return addr.city
    if (addr.detail) return addr.detail.substring(0, 20)
    return '-'
  } catch {
    return '-'
  }
}

async function loadData() {
  loading.value = true
  try {
    if (activeTab.value === 'pending') {
      const [resAll, resFiltered] = await Promise.all([
        getUnassignedOrdersAPI({ page: 1, pageSize: 1, keyword: keyword.value }),
        getUnassignedOrdersAPI({ page: page.value, pageSize: pageSize.value, keyword: keyword.value, module: module.value }),
      ])
      pendingCount.value = resAll.pagination.total
      tableData.value = resFiltered.list
      total.value = resFiltered.pagination.total
    } else {
      const res = await getAssignedOrdersAPI({ page: page.value, pageSize: pageSize.value, keyword: keyword.value, module: module.value })
      tableData.value = res.list
      total.value = res.pagination.total
    }
  } catch (err) {
    tableData.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
  // 统计卡独立加载：列表接口失败不应阻断 stats 错误态的展示
  loadStats()
}

async function loadStats() {
  statsLoading.value = true
  try {
    const stats = await getOrderStatistics()
    pendingCount.value = stats.pending ?? stats.pendingOrders ?? pendingCount.value
    assignedCount.value = stats.assigned ?? stats.assignedOrders ?? 0
    pendingSealCount.value = stats.pendingSeal ?? 0
    pendingNewspaperCount.value = stats.pendingNewspaper ?? 0
    pendingBookkeepingCount.value = stats.pendingBookkeeping ?? 0
    statsError.value = false
  } catch (e) {
    statsError.value = true
    console.warn('[stats] load failed:', e?.message || e)
  } finally {
    statsLoading.value = false
  }
}

async function openAssignDialog(order) {
  currentOrder.value = order
  assignForm.outletId = ''
  assignForm.remark = ''
  currentOutletName.value = ''
  try {
    const res = await getOutletsAPI({ page: 1, pageSize: 100, status: 1 })
    const all = res.list || []
    const recommendedIds = new Set((order.recommendedOutlets || []).map((o) => o.id))
    const recommended = all.filter((o) => recommendedIds.has(o.id))
    const others = all.filter((o) => !recommendedIds.has(o.id))
    outlets.value = [...recommended, ...others]
    outletKeyword.value = ''
  } catch {
    ElMessage.error('加载网点列表失败')
  }
  assignDialogVisible.value = true
}

const filteredOutlets = computed(() => {
  const kw = outletKeyword.value.trim().toLowerCase()
  if (!kw) return outlets.value
  return outlets.value.filter((o) => {
    const name = (o.name || '').toLowerCase()
    const city = (o.city || '').toLowerCase()
    const phone = (o.phone || '').toLowerCase()
    return name.includes(kw) || city.includes(kw) || phone.includes(kw)
  })
})

function highlight(val) {
  const text = val == null ? '' : String(val)
  const kw = outletKeyword.value.trim()
  if (!kw) return escapeHtml(text)
  const idx = text.toLowerCase().indexOf(kw.toLowerCase())
  if (idx < 0) return escapeHtml(text)
  const before = text.slice(0, idx)
  const hit = text.slice(idx, idx + kw.length)
  const after = text.slice(idx + kw.length)
  return `${escapeHtml(before)}<mark style="background:#FFF3A0;color:inherit;padding:0 2px;border-radius:2px">${escapeHtml(hit)}</mark>${escapeHtml(after)}`
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

function onOutletRowClick(row) {
  assignForm.outletId = row.id
  currentOutletName.value = row.name || ''
}

async function onConfirmAssign() {
  if (!assignForm.outletId) { ElMessage.warning('请选择网点'); return }
  submitting.value = true
  try {
    await assignOrderAPI(currentOrder.value.id, assignForm)
    ElMessage.success('分配成功')
    assignDialogVisible.value = false
    loadData()
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '分配失败')
  } finally {
    submitting.value = false
  }
}

onMounted(loadData)
</script>

<style scoped lang="scss">
.page-wrapper { padding: 0; }

.page-header {
  margin-bottom: 16px;
  h2 {
    font-size: 16px;
    font-weight: 600;
    color: #1f1f1f;
    margin: 0;
  }
}

.page-card {
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
}

/* tab 定制 */
:deep(.assign-tabs > .el-tabs__header) {
  margin-bottom: 0;
  padding: 0 16px;
}
:deep(.assign-tabs .el-tabs__item) {
  font-size: 14px;
  height: 48px;
  line-height: 48px;
}

/* 统计行 */
.stats-row {
  display: flex;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid #f0f0f0;
}

.stat-card {
  flex: 1;
  background: #fff;
  border-radius: 16px;
  padding: 18px 20px;
  display: flex;
  align-items: center;
  gap: 18px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  }
}

.stat-icon {
  width: 52px;
  height: 52px;
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}

.stat-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.stat-num {
  font-size: 28px;
  font-weight: 800;
  line-height: 1;
}

.stat-label {
  font-size: 13px;
  margin-top: 4px;
}

// 待分配 — 警示红（对待接单）
.stat-orange {
  background: linear-gradient(135deg, #fff1f0 0%, #ffccc7 100%);
  border: 1px solid rgba(245, 34, 45, 0.15);
  .stat-icon { background: rgba(245, 34, 45, 0.12); color: #f5222d; }
  .stat-num { color: #cf1322; }
  .stat-label { color: #888; }
}
// 已分配 — 清新绿（对已完成）
.stat-green {
  background: linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%);
  border: 1px solid rgba(82, 196, 26, 0.15);
  .stat-icon { background: rgba(82, 196, 26, 0.12); color: #52c41a; }
  .stat-num { color: #389e0d; }
  .stat-label { color: #888; }
}
// 待分配刻章 — 清爽蓝（对制作中）
.stat-blue-seal {
  background: linear-gradient(135deg, #e6f4ff 0%, #cce8ff 100%);
  border: 1px solid rgba(24, 144, 255, 0.15);
  .stat-icon { background: rgba(24, 144, 255, 0.12); color: #1890ff; }
  .stat-num { color: #096dd9; }
  .stat-label { color: #888; }
}
// 待分配登报 / 代理记账 — 活力橙
.stat-blue {
  background: linear-gradient(135deg, #fff7e6 0%, #ffe8c2 100%);
  border: 1px solid rgba(250, 140, 22, 0.15);
  .stat-icon { background: rgba(250, 140, 22, 0.12); color: #fa8c16; }
  .stat-num { color: #c87619; }
  .stat-label { color: #888; }
}

/* 工具栏 */
.toolbar-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  flex-wrap: wrap;
}

/* 金额单元格 */
.price-cell {
  color: #5B6FE8;
  font-weight: 600;
}

/* 分页居中 */
.pagination-wrap {
  display: flex;
  justify-content: center;
  padding: 16px 0 8px;
}

/* 弹窗 */
:deep(.assign-dialog .el-dialog__header) {
  border-bottom: 1px solid #f0f0f0;
  padding: 16px 20px;
  margin-right: 0;
}
:deep(.assign-dialog .el-dialog__title) {
  font-weight: 600;
  font-size: 15px;
}
:deep(.assign-dialog .el-dialog__body) {
  padding: 16px 20px 20px;
}

/* 表格行高亮 */
:deep(.current-row td) {
  background-color: #EBF5FF !important;
  color: #5B6FE8;
  font-weight: 600;
}

/* 空白 */
:deep(.el-empty) { padding: 40px 0; }
/* 统计状态条 */
.stats-status {
  padding: 6px 16px;
  font-size: 12px;
  color: #909399;
  border-bottom: 1px solid #f0f0f0;
  background: #fafbfc;
  display: flex;
  align-items: center;
  gap: 8px;
}
.stats-error { color: #f56c6c; }
</style>
