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
        <div class="stat-card stat-blue">
          <div class="stat-icon">🔏</div>
          <div class="stat-info">
            <span class="stat-num">{{ pendingSealCount }}</span>
            <span class="stat-label">刻章</span>
          </div>
        </div>
        <div class="stat-card stat-blue">
          <div class="stat-icon">📰</div>
          <div class="stat-info">
            <span class="stat-num">{{ pendingNewspaperCount }}</span>
            <span class="stat-label">登报</span>
          </div>
        </div>
        <div class="stat-card stat-blue">
          <div class="stat-icon">📊</div>
          <div class="stat-info">
            <span class="stat-num">{{ pendingBookkeepingCount }}</span>
            <span class="stat-label">代理记账</span>
          </div>
        </div>
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

    <!-- 分配弹窗 -->
    <el-dialog v-model="assignDialogVisible" title="分配网点" width="560px" class="assign-dialog">
      <el-form ref="assignFormRef" :model="assignForm" :rules="assignRules" label-width="90px">
        <el-form-item label="选择网点">
          <el-select
            v-model="assignForm.outletId"
            placeholder="请选择负责承接的网点"
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
      const list = resFiltered.list || []
      pendingSealCount.value = list.filter(i => i.module === 'seal').length
      pendingNewspaperCount.value = list.filter(i => i.module === 'newspaper').length
      pendingBookkeepingCount.value = list.filter(i => i.module === 'bookkeeping').length
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
  background: linear-gradient(135deg, #fafbfc 0%, #f5f7fa 100%);
  border-bottom: 1px solid #f0f0f0;
}

.stat-card {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 8px;
  color: #fff;
  min-width: 0;
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: rgba(255,255,255,.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.stat-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.stat-num {
  font-size: 24px;
  font-weight: 700;
  line-height: 1;
}

.stat-label {
  font-size: 12px;
  opacity: .9;
  margin-top: 2px;
}

.stat-orange { background: linear-gradient(135deg, #faad14, #ffc53d); color: #fff; }
.stat-green  { background: linear-gradient(135deg, #52c41a, #73d13d); }
.stat-blue   { background: linear-gradient(135deg, #5B6FE8, #7B8FFF); }

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
  padding: 24px 20px;
}

/* 空白 */
:deep(.el-empty) { padding: 40px 0; }
</style>
