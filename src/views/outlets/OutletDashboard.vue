<template>
  <div class="Outlet-dashboard">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>网点控制台</h2>
      <div class="header-actions">
        <el-select v-model="selectedOutlet" placeholder="选择网点" filterable style="width:240px" @change="loadData">
          <el-option v-for="s in outlets" :key="s.id" :label="s.name" :value="s.id">
            <span>{{ s.name }}</span>
            <span style="float:right;color:#999;font-size:12px">{{ s.province }}{{ s.city }}</span>
          </el-option>
        </el-select>
        <el-button :icon="Refresh" @click="loadData">刷新</el-button>
      </div>
    </div>

    <!-- 无网点时 -->
    <div v-if="!selectedOutlet" class="empty-state">
      <el-empty description="请先选择网点查看控制台">
        <el-select v-model="selectedOutlet" placeholder="选择网点" filterable style="width:260px" size="large">
          <el-option v-for="s in outlets" :key="s.id" :label="s.name" :value="s.id" />
        </el-select>
      </el-empty>
    </div>

    <template v-else>
      <!-- 统计卡片 -->
      <div class="stats-grid">
        <div class="stat-card stat-pending">
          <div class="stat-icon"><el-icon><Clock /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.pending }}</div>
            <div class="stat-label">待接单</div>
          </div>
        </div>
        <div class="stat-card stat-processing">
          <div class="stat-icon"><el-icon><Tools /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.processing }}</div>
            <div class="stat-label">制作中</div>
          </div>
        </div>
        <div class="stat-card stat-completed">
          <div class="stat-icon"><el-icon><CircleCheck /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.completed }}</div>
            <div class="stat-label">已完成</div>
          </div>
        </div>
        <div class="stat-card stat-today">
          <div class="stat-icon"><el-icon><Calendar /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.todayTotal }}</div>
            <div class="stat-label">今日新增</div>
          </div>
        </div>
      </div>

      <!-- 快捷操作 + 网点信息 -->
      <div class="content-grid">
        <div class="panel Outlet-info-panel">
          <div class="panel-header">
            <span class="panel-title">网点信息</span>
          </div>
          <div class="Outlet-detail" v-if="currentOutlet">
            <div class="detail-row"><span class="label">网点名称</span><span>{{ currentOutlet.name }}</span></div>
            <div class="detail-row"><span class="label">联系人</span><span>{{ currentOutlet.contact }}</span></div>
            <div class="detail-row"><span class="label">联系电话</span><span>{{ currentOutlet.phone }}</span></div>
            <div class="detail-row"><span class="label">所在地区</span><span>{{ currentOutlet.province }} {{ currentOutlet.city }}</span></div>
            <div class="detail-row"><span class="label">详细地址</span><span>{{ currentOutlet.address || '-' }}</span></div>
            <div class="detail-row">
              <span class="label">状态</span>
              <el-tag :type="currentOutlet.status === 1 ? 'success' : 'danger'" size="small">
                {{ currentOutlet.status === 1 ? '正常' : '已禁用' }}
              </el-tag>
            </div>
            <div class="detail-row"><span class="label">累计订单</span><span style="color:#5B6FE8;font-weight:600">{{ currentOutlet.totalOrders }} 单</span></div>
          </div>
        </div>

        <div class="panel actions-panel">
          <div class="panel-header">
            <span class="panel-title">快捷操作</span>
          </div>
          <div class="quick-actions">
            <button class="quick-btn" @click="loadData">
              <el-icon><Refresh /></el-icon> 刷新数据
            </button>
            <button class="quick-btn" @click="goToOutletOrders">
              <el-icon><List /></el-icon> 查看全部订单
            </button>
            <button class="quick-btn" @click="goToDeliveryReceipts">
              <el-icon><Tickets /></el-icon> 查看交付回执
            </button>
            <button class="quick-btn" @click="goToOutletList">
              <el-icon><OfficeBuilding /></el-icon> 网点列表
            </button>
          </div>
        </div>
      </div>

      <!-- 最近订单 -->
      <div class="panel">
        <div class="panel-header">
          <span class="panel-title">最近订单</span>
          <el-button type="primary" link size="small" @click="goToOutletOrders">查看更多 &raquo;</el-button>
        </div>
        <el-table :data="recentOrders" v-loading="loading" stripe>
          <el-table-column prop="orderNo" label="订单编号" width="180" />
          <el-table-column prop="companyName" label="公司名称" min-width="160" show-overflow-tooltip />
          <el-table-column prop="type" label="印章类型" width="120" />
          <el-table-column label="分配状态" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="getStatusTag(row.status)" size="small">
                {{ row.statusText }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="assignedAt" label="分配时间" width="170">
            <template #default="{ row }">{{ formatDate(row.assignedAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="160" align="center">
            <template #default="{ row }">
              <template v-if="row.status === 1">
                <el-button type="success" size="small" @click="onAccept(row)">接单</el-button>
              </template>
              <template v-else-if="row.status === 2">
                <el-button type="warning" size="small" @click="onComplete(row)">完成制作</el-button>
              </template>
              <template v-else>
                <span style="color:#999">—</span>
              </template>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </template>

    <!-- 接单确认 -->
    <el-dialog v-model="acceptDialogVisible" title="接单确认" width="420px">
      <p>确定接受订单 <strong>{{ currentOrder?.orderNo }}</strong> 吗？</p>
      <p style="color:#666;margin-top:8px">接单后请尽快开始制作，完成后点击「完成制作」提交交货。</p>
      <template #footer>
        <el-button @click="acceptDialogVisible = false">取消</el-button>
        <el-button type="success" :loading="actionLoading" @click="onConfirmAccept">确认接单</el-button>
      </template>
    </el-dialog>

    <!-- 完成制作 -->
    <el-dialog v-model="completeDialogVisible" title="完成制作" width="500px">
      <el-form ref="completeFormRef" :model="completeForm" :rules="completeRules" label-width="100px">
        <el-form-item label="快递公司" prop="expressCompany">
          <el-input v-model="completeForm.expressCompany" placeholder="如：顺丰速运、圆通快递" />
        </el-form-item>
        <el-form-item label="快递单号" prop="expressNo">
          <el-input v-model="completeForm.expressNo" placeholder="请输入快递单号" />
        </el-form-item>
        <el-form-item label="交货备注">
          <el-input v-model="completeForm.remark" type="textarea" :rows="2" placeholder="选填" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="completeDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="actionLoading" @click="onConfirmComplete">提交交货</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getOutletsAPI, getOutletAPI, getOutletOrdersAPI } from '@/api'
import { acceptOrderAPI, completeOrderAPI } from '@/api/outlet'
import { formatDate } from '@/utils/format'
import { Refresh, Clock, Tools, CircleCheck, Calendar, List, Tickets, OfficeBuilding } from '@element-plus/icons-vue'

const loading = ref(false)
const outlets = ref<any[]>([])
const selectedOutlet = ref('')
const currentOutlet = ref<any>(null)
const stats = ref<any>({ pending: 0, processing: 0, completed: 0, todayTotal: 0 })
const recentOrders = ref<any[]>([])
const currentOrder = ref<any>(null)
const acceptDialogVisible = ref(false)
const completeDialogVisible = ref(false)
const actionLoading = ref(false)
const completeFormRef = ref<any>(null)

const completeForm = reactive({ expressCompany: '', expressNo: '', remark: '' })
const completeRules = {
  expressCompany: [{ required: true, message: '请输入快递公司', trigger: 'blur' }],
  expressNo: [{ required: true, message: '请输入快递单号', trigger: 'blur' }],
}

function getStatusTag(status: any) {
  const map: Record<number,string> = { 1: 'warning', 2: '', 3: 'success' }
  return map[status] || 'info'
}

async function loadOutlets() {
  loading.value = true
  try {
    const res: any = await getOutletsAPI({ page: 1, pageSize: 100, status: 1 })
    outlets.value = (res as any).data?.list ?? (res as any).list ?? []
    if (outlets.value.length > 0 && !selectedOutlet.value) {
      selectedOutlet.value = outlets.value[0].id
      await loadData()
    }
  } catch { /* ignore */ } finally {
    loading.value = false
  }
}

async function loadData() {
  if (!selectedOutlet.value) return
  loading.value = true
  try {
    const [outletRes, ordersRes]: any[] = await Promise.all([
      getOutletAPI(selectedOutlet.value),
      getOutletOrdersAPI(selectedOutlet.value, { page: 1, pageSize: 100 }),
    ])
    currentOutlet.value = (outletRes as any)
    recentOrders.value = ((ordersRes as any).data?.list ?? (ordersRes as any).list ?? []).slice(0, 10)
    // 从全部订单计算统计数据（取 100 条近似）
    const allOrders = (ordersRes as any).data?.list ?? (ordersRes as any).list ?? []
    stats.value = {
      pending: allOrders.filter((o: any) => (o as any).status === 1).length,
      processing: allOrders.filter((o: any) => (o as any).status === 2).length,
      completed: allOrders.filter((o: any) => (o as any).status === 3).length,
      todayTotal: allOrders.length,
    }
  } catch (err: any) { /* ignore */ } finally {
    loading.value = false
  }
}

function onAccept(order: any) {
  currentOrder.value = order
  acceptDialogVisible.value = true
}

async function onConfirmAccept() {
  // 前端状态校验：只有 status === 1 才能接单
  if (currentOrder.value?.status !== 1) {
    ElMessage.warning('该订单当前状态不允许接单，请刷新页面后重试')
    return
  }
  actionLoading.value = true
  try {
    await acceptOrderAPI((currentOrder.value as any)?.orderId)
    ElMessage.success('接单成功')
    acceptDialogVisible.value = false
    loadData()
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || err?.message || '接单失败')
  } finally {
    actionLoading.value = false
  }
}

function onComplete(order: any) {
  currentOrder.value = order
  Object.assign(completeForm, { expressCompany: '', expressNo: '', remark: '' })
  completeDialogVisible.value = true
}

async function onConfirmComplete() {
  // 前端状态校验：只有 status === 2 才能完成交货
  if (currentOrder.value?.status !== 2) {
    ElMessage.warning('该订单当前状态不允许交货，请刷新页面后重试')
    return
  }
  const valid = await completeFormRef.value?.validate().catch(() => false)
  if (!valid) return
  actionLoading.value = true
  try {
    await completeOrderAPI((currentOrder.value as any)?.orderId, {
      expressCompany: completeForm.expressCompany,
      expressNo: completeForm.expressNo,
      remark: completeForm.remark,
    })
    ElMessage.success('交货成功')
    completeDialogVisible.value = false
    loadData()
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || err?.message || '交货失败')
  } finally {
    actionLoading.value = false
  }
}

function goToOutletOrders() {
  window.location.href = `/outlets/assign?outletId=${selectedOutlet.value}`
}

function goToDeliveryReceipts() {
  window.location.href = `/outlets/receipts?outletId=${selectedOutlet.value}`
}

function goToOutletList() {
  window.location.href = '/outlets'
}

onMounted(async () => {
  await loadOutlets()
  if (selectedOutlet.value) loadData()
})
</script>

<style lang="scss" scoped>
.Outlet-dashboard { }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.page-header h2 { margin: 0; font-size: 22px; font-weight: 600; line-height: 1.4; padding-bottom: 4px; }
.header-actions { display: flex; gap: 12px; align-items: center; }
.empty-state { padding: 80px 0; }
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
.stat-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px 24px;
  display: flex;
  align-items: center;
  gap: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
  &:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1); }
}
.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  flex-shrink: 0;
}
.stat-value { font-size: 30px; font-weight: 800; line-height: 1; }
.stat-label { font-size: 13px; color: #888; margin-top: 4px; }

// 待接单 — 暖橙
.stat-pending { background: linear-gradient(135deg, #fff7e6 0%, #ffe8c2 100%); border: 1px solid rgba(250, 140, 22, 0.15); .stat-icon { background: rgba(250, 140, 22, 0.12); color: #e69138; } .stat-value { color: #c87619; } }
// 制作中 — 清爽蓝
.stat-processing { background: linear-gradient(135deg, #e6f4ff 0%, #cce8ff 100%); border: 1px solid rgba(24, 144, 255, 0.15); .stat-icon { background: rgba(24, 144, 255, 0.12); color: #1890ff; } .stat-value { color: #096dd9; } }
// 已完成 — 清新绿
.stat-completed { background: linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%); border: 1px solid rgba(82, 196, 26, 0.15); .stat-icon { background: rgba(82, 196, 26, 0.12); color: #52c41a; } .stat-value { color: #389e0d; } }
// 今日新增 — 紫蓝
.stat-today { background: linear-gradient(135deg, #eef2ff 0%, #dde4ff 100%); border: 1px solid rgba(91, 111, 232, 0.15); .stat-icon { background: rgba(91, 111, 232, 0.12); color: #5B6FE8; } .stat-value { color: #3d4fc4; } }
.content-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
.panel { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
.panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.panel-title { font-size: 15px; font-weight: 600; color: #333; }
.Outlet-detail { }
.detail-row { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid #f5f5f5; font-size: 14px; }
.detail-row:last-child { border-bottom: none; }
.detail-row .label { color: #999; min-width: 80px; }
.quick-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.quick-btn {
  width: 100%;
  padding: 9px 12px;
  background: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  color: #606266;
  font-size: 14px;
  cursor: pointer;
  text-align: center;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.quick-btn:hover {
  color: #409eff;
  border-color: #c6e2ff;
  background: #ecf5ff;
}
</style>
