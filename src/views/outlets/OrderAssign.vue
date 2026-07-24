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

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <el-input v-model="keyword" placeholder="搜索订单号/公司名称" style="width:260px" clearable @keyup.enter="loadData">
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
      <el-select v-model="module" placeholder="模块" style="width:140px" clearable @change="loadData">
        <el-option label="刻章" value="seal" />
        <el-option label="登报" value="newspaper" />
      </el-select>
      <el-button type="primary" @click="loadData">搜索</el-button>
    </div>

    <!-- 待分配订单 -->
    <div v-if="activeTab === 'pending'">
      <div v-if="loading" v-loading="loading" style="min-height:200px" />
      <div v-else-if="tableData.length === 0" class="empty-state">
        <el-empty description="暂无待分配订单" />
      </div>
      <div v-else class="order-cards">
        <div v-for="item in tableData" :key="item.id" class="order-card">
          <div class="card-header">
            <span class="order-no">{{ item.orderNo }}</span>
            <el-tag :type="item.module === 'seal' ? '' : 'success'" size="small">{{ item.module === 'seal' ? '刻章' : '登报' }}</el-tag>
          </div>
          <div class="card-body">
            <div class="info-row"><span class="label">公司名称：</span>{{ item.companyName || '-' }}</div>
            <div class="info-row"><span class="label">印章类型：</span>{{ item.type }}</div>
            <div class="info-row"><span class="label">联系电话：</span>{{ item.contactPhone || '-' }}</div>
            <div class="info-row"><span class="label">订单金额：</span><span style="color:#5B6FE8;font-weight:600">¥{{ item.payPrice || item.totalPrice }}</span></div>
            <div class="info-row"><span class="label">下单时间：</span>{{ formatDate(item.createdAt) }}</div>
          </div>
          <div class="card-footer">
            <el-button type="primary" size="small" @click="openAssignDialog(item)">分配网点</el-button>
          </div>
        </div>
      </div>
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
    <el-dialog v-model="assignDialogVisible" title="分配网点" width="500px">
      <el-form ref="assignFormRef" :model="assignForm" :rules="assignRules" label-width="90px">
        <el-form-item label="网点">
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
import { getUnassignedOrdersAPI, assignOrderAPI, getOutletsAPI } from '@/api'
import { formatDate } from '@/utils/format'

const activeTab = ref('pending')
const loading = ref(false)
const tableData = ref([])
const pendingCount = ref(0)
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

async function loadData() {
  loading.value = true
  try {
    if (activeTab.value === 'pending') {
      const res = await getUnassignedOrdersAPI({ page: page.value, pageSize: pageSize.value, keyword: keyword.value, module: module.value })
      tableData.value = res.list
      total.value = res.pagination.total
      pendingCount.value = res.pagination.total
    } else {
      // 已分配订单可复用 getOrdersAPI，筛选 assignmentStatus > 0
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
    outlets.value = res.list
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
.filter-bar { display: flex; gap: 12px; margin-bottom: 16px; align-items: center; }
.order-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; }
.order-card { border: 1px solid #eee; border-radius: 8px; padding: 16px; background: #fff; transition: box-shadow 0.2s; }
.order-card:hover { box-shadow: 0 2px 12px rgba(0,0,0,0.1); }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.order-no { font-weight: 600; color: #333; }
.card-body { margin-bottom: 12px; }
.info-row { font-size: 13px; color: #666; line-height: 1.8; }
.info-row .label { color: #999; }
.card-footer { display: flex; justify-content: flex-end; }
.pagination { display: flex; justify-content: flex-end; margin-top: 16px; }
.empty-state { padding: 60px 0; }
</style>
