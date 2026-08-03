<template>
  <div class="order-assign">
    <div class="page-header">
      <h2>订单分配管理</h2>
    </div>

    <!-- tab 切换 -->
    <el-tabs v-model="activeTab" @tab-change="loadData">
      <el-tab-pane label="待分配订单" name="pending">
        <template #label>
          待分配 <el-badge :value="pendingCount" :hidden="!pendingCount" type="warning" />
        </template>
      </el-tab-pane>
      <el-tab-pane label="已分配订单" name="assigned" />
    </el-tabs>

    <!-- 筛选栏（白色卡片） -->
    <div class="filter-card">
      <div class="filter-bar">
        <el-input v-model="keyword" placeholder="搜索订单号/公司名称" style="width:240px" clearable @keyup.enter="loadData">
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-select v-model="module" placeholder="全部模块" style="width:140px" clearable @change="loadData">
          <el-option label="刻章" value="seal" />
          <el-option label="登报" value="newspaper" />
          <el-option label="代理记账" value="bookkeeping" />
        </el-select>
        <el-button type="primary" @click="loadData">
          <el-icon style="margin-right:4px"><Search /></el-icon>搜索
        </el-button>
        <el-button @click="keyword=''; module=''; loadData()">重置</el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stat-cards">
      <div class="stat-card stat-card--warning">
        <div class="stat-icon">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="#E6A23C" stroke-width="1.8" stroke-linecap="round"/><path d="M9 12h6M9 16h4" stroke="#E6A23C" stroke-width="1.8" stroke-linecap="round"/></svg>
        </div>
        <div class="stat-body">
          <div class="stat-value" style="color:#E6A23C">{{ pendingCount }}</div>
          <div class="stat-label">待分配订单</div>
        </div>
      </div>
      <div class="stat-card stat-card--success">
        <div class="stat-icon">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="#67C23A" stroke-width="1.8"/><path d="M8.5 12.5l2.5 2.5 4.5-5" stroke="#67C23A" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <div class="stat-body">
          <div class="stat-value" style="color:#67C23A">{{ assignedCount }}</div>
          <div class="stat-label">已分配订单</div>
        </div>
      </div>
      <div class="stat-card stat-card--gray">
        <div class="stat-icon">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#909399" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <div class="stat-body">
          <div class="stat-value">{{ pendingSealCount }}</div>
          <div class="stat-label">刻章</div>
        </div>
      </div>
      <div class="stat-card stat-card--gray">
        <div class="stat-icon">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 4h16v16H4z" stroke="#909399" stroke-width="1.8" rx="2"/><path d="M8 8h8M8 12h5M8 16h3" stroke="#909399" stroke-width="1.8" stroke-linecap="round"/></svg>
        </div>
        <div class="stat-body">
          <div class="stat-value">{{ pendingNewspaperCount }}</div>
          <div class="stat-label">登报</div>
        </div>
      </div>
      <div class="stat-card stat-card--gray">
        <div class="stat-icon">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 7h6M9 11h6M9 15h4M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" stroke="#909399" stroke-width="1.8" stroke-linecap="round"/></svg>
        </div>
        <div class="stat-body">
          <div class="stat-value">{{ pendingBookkeepingCount }}</div>
          <div class="stat-label">代理记账</div>
        </div>
      </div>
    </div>

    <!-- 表格区域（白色卡片） -->
    <div class="table-card">
      <!-- 待分配订单（表格） -->
      <div v-if="activeTab === 'pending'">
        <div v-if="loading" v-loading="loading" style="min-height:200px" />
        <el-empty v-else-if="tableData.length === 0" description="暂无待分配订单" />
        <el-table v-else :data="tableData" stripe class="assign-table">
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
              <span style="color:#5B6FE8;font-weight:600">¥{{ row.payPrice || row.totalPrice }}</span>
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
        <el-table-column prop="companyName" label="公司名称" min-width="160" />
        <el-table-column prop="type" label="印章类型" width="120" />
        <el-table-column label="分配状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getAssignmentTagType(row.assignmentStatus)" size="small">
              {{ getAssignmentText(row.assignmentStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="下单时间" width="170">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
      </el-table>
      </div>
    </div>

    <!-- 分页 -->
    <div class="pagination">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        @change="loadData"
      />
    </div>

    <!-- 分配弹窗 -->
    <el-dialog v-model="assignDialogVisible" title="分配网点" width="560px" class="assign-dialog">
      <el-form ref="assignFormRef" :model="assignForm" :rules="assignRules" label-width="90px">
        <el-form-item label="选择网点">
          <el-select
            v-model="assignForm.outletId"
            placeholder="请选择网点"
            filterable
            style="width:100%"
          >
            <el-option
              v-for="s in outlets"
              :key="s.id"
              :label="`${s.name}（${s.province || ''}${s.city || ''}，累计${s.totalOrders}单）`"
              :value="s.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="分配备注">
          <el-input v-model="assignForm.remark" type="textarea" :rows="3" placeholder="选填，可填写客户特殊要求" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="assignDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="onConfirmAssign">确认分配</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getUnassignedOrdersAPI, assignOrderAPI, getOutletsAPI, getOrderStatistics } from '@/api'
import { formatDate } from '@/utils/format'

const activeTab = ref('pending')
const loading = ref(false)
const tableData = ref([])
const pendingCount = ref(0)
const assignedCount = ref(0)
const pendingSealCount = ref(0)
const pendingNewspaperCount = ref(0)
const pendingBookkeepingCount = ref(0)
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const keyword = ref('')
const module = ref('')

const assignDialogVisible = ref(false)
const submitting = ref(false)
const assignFormRef = ref(null)
const outlets = ref([])
const currentOrder = ref(null)

const assignForm = reactive({ outletId: '', remark: '' })
const assignRules = { outletId: [{ required: true, message: '请选择网点', trigger: 'change' }] }

function getAssignmentTagType(status) {
  const map = { 0: 'info', 1: 'warning', 2: '', 3: 'success' }
  return map[status] || 'info'
}
function getAssignmentText(status) {
  const map = { 0: '未分配', 1: '已分配', 2: '制作中', 3: '已完成' }
  return map[status] || '未知'
}
function getModuleLabel(module) {
  const map = { seal: '刻章', newspaper: '登报', bookkeeping: '代理记账' }
  return map[module] || module
}
function getModuleTagType(module) {
  const map = { seal: '', newspaper: 'success', bookkeeping: 'warning' }
  return map[module] || 'info'
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
      // 先拉模块分布（不带 module 过滤的全量，待分配口径）
      const [resAll, resFiltered] = await Promise.all([
        getUnassignedOrdersAPI({ page: 1, pageSize: 1, keyword: keyword.value }),
        getUnassignedOrdersAPI({ page: page.value, pageSize: pageSize.value, keyword: keyword.value, module: module.value }),
      ])
      pendingCount.value = resAll.pagination.total
      tableData.value = resFiltered.list
      total.value = resFiltered.pagination.total
      // 模块分布：全量列表中按 module 统计（仅当前筛选结果内）
      const list = resFiltered.list || []
      pendingSealCount.value = list.filter(i => i.module === 'seal').length
      pendingNewspaperCount.value = list.filter(i => i.module === 'newspaper').length
      pendingBookkeepingCount.value = list.filter(i => i.module === 'bookkeeping').length
      // 已分配数从统计接口取
      if (assignedCount.value === 0) {
        try {
          const stats = await getOrderStatistics()
          assignedCount.value = stats.assigned || stats.assignedCount || 0
        } catch { /* ignore */ }
      }
    } else {
      tableData.value = []
    }
  } catch (err) {
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

async function openAssignDialog(order) {
  currentOrder.value = order
  assignForm.outletId = ''
  assignForm.remark = ''
  try {
    const res = await getOutletsAPI({ page: 1, pageSize: 100, status: 1 })
    const all = res.list || []
    // 推荐网点排前面
    const recommendedIds = new Set((order.recommendedOutlets || []).map(o => o.id))
    const recommended = all.filter(o => recommendedIds.has(o.id))
    const others = all.filter(o => !recommendedIds.has(o.id))
    outlets.value = [...recommended, ...others]
  } catch {
    ElMessage.error('加载网点列表失败')
  }
  assignDialogVisible.value = true
}

async function onConfirmAssign() {
  const valid = await assignFormRef.value.validate().catch(() => false)
  if (!valid) return

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

<style scoped>
.order-assign { padding: 24px; }
.page-header { margin-bottom: 20px; }
.page-header h2 { margin: 0; font-size: 18px; font-weight: 600; }

/* 筛选栏白色卡片 */
.filter-card {
  background: #fff;
  border-radius: 10px;
  padding: 16px 20px;
  box-shadow: 0 1px 6px rgba(0,0,0,0.06);
  margin-bottom: 16px;
}
.filter-bar {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

/* 统计卡片 */
.stat-cards { display: flex; gap: 12px; margin-bottom: 16px; }
.stat-card {
  flex: 1;
  background: #fff;
  border-radius: 10px;
  padding: 16px 14px 14px;
  box-shadow: 0 1px 6px rgba(0,0,0,0.06);
  display: flex;
  align-items: center;
  gap: 14px;
  border-top: 3px solid transparent;
  transition: box-shadow 0.2s, transform 0.2s;
  cursor: default;
  min-width: 0;
}
.stat-card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  transform: translateY(-1px);
}
.stat-card--warning { border-top-color: #E6A23C; }
.stat-card--success { border-top-color: #67C23A; }
.stat-card--gray    { border-top-color: #909399; }
.stat-icon { flex-shrink: 0; }
.stat-icon svg { width: 28px; height: 28px; display: block; }
.stat-body { min-width: 0; }
.stat-value {
  font-size: 26px;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
}
.stat-label {
  font-size: 12px;
  color: #909399;
  margin-top: 3px;
  white-space: nowrap;
}

/* 表格白色卡片 */
.table-card {
  background: #fff;
  border-radius: 10px;
  padding: 0;
  box-shadow: 0 1px 6px rgba(0,0,0,0.06);
  overflow: hidden;
}
:deep(.assign-table .el-table__header th) {
  background: #f5f7fa !important;
  color: #606266;
  font-weight: 600;
  font-size: 13px;
}
:deep(.assign-table .el-table__row) {
  transition: background 0.15s;
}
:deep(.assign-table .el-table__row:hover > td) {
  background: #f0f4ff !important;
}
:deep(.assign-table .el-table__cell) {
  font-size: 13px;
}
:deep(.assign-table .el-button--primary) {
  background: #5B6FE8;
  border-color: #5B6FE8;
}
:deep(.assign-table .el-button--primary:hover) {
  background: #4a5fd4;
  border-color: #4a5fd4;
}

/* 分页 */
.pagination { display: flex; justify-content: flex-end; margin-top: 16px; }

/* 分配弹窗 */
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
  padding: 24px 20px;
}

/* 空白状态 */
:deep(.el-empty) { padding: 40px 0; }
</style>
