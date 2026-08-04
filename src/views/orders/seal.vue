<template>
  <div>
    <div class="page-header">
      <h2>刻章订单</h2>
      <div>
        <el-button @click="exportOrders">导出</el-button>
        <el-button type="primary" @click="refresh">刷新</el-button>
      </div>
    </div>

    <div class="page-card">
      <!-- 统计卡片 -->
      <div class="stats-grid" v-if="!statsError || stats.seal > 0 || stats.making > 0 || stats.todaySeal > 0 || stats.assigned > 0">
        <div class="stat-card stat-primary">
          <div class="stat-icon"><el-icon><FolderOpened /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.seal }}</div>
            <div class="stat-label">刻章订单总数</div>
          </div>
        </div>
        <div class="stat-card stat-orange">
          <div class="stat-icon"><el-icon><Clock /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.assigned }}</div>
            <div class="stat-label">已分配待接单</div>
          </div>
        </div>
        <div class="stat-card stat-blue">
          <div class="stat-icon"><el-icon><Tools /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.making }}</div>
            <div class="stat-label">制作中</div>
          </div>
        </div>
        <div class="stat-card stat-green">
          <div class="stat-icon"><el-icon><Calendar /></el-icon></div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.todaySeal }}</div>
            <div class="stat-label">今日新增</div>
          </div>
        </div>
      </div>
      <div v-if="statsError" class="stats-error">
        <span>统计加载失败</span>
        <el-button size="small" @click="loadStats">重试</el-button>
      </div>

      <!-- 搜索 -->
      <el-form inline :model="query" class="search-form">
        <el-form-item label="订单号">
          <el-input v-model="query.keyword" placeholder="订单号/公司名/手机号" clearable style="width: 200px" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部状态" clearable style="width: 140px">
            <el-option v-for="s in statusOptions" :key="s.value" :label="s.label" :value="s.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期">
          <el-date-picker v-model="dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" style="width: 260px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="search">搜索</el-button>
          <el-button @click="reset">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 表格 -->
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="orderNo" label="订单号" width="200" />
        <el-table-column prop="companyName" label="公司名称" min-width="160" />
        <el-table-column prop="type" label="订单类型" width="100" />
        <el-table-column prop="totalPrice" label="订单金额" width="100">
          <template #default="{ row }">¥{{ row.totalPrice }}</template>
        </el-table-column>
        <el-table-column prop="contactPhone" label="联系电话" width="120" />
        <el-table-column prop="statusText" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)">{{ row.statusText }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="分配状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="!row.assignment" type="info" size="small">未分配</el-tag>
            <el-tag v-else :type="assignStatusType(row.assignment.status)" size="small">
              {{ row.assignment.statusText }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="下单时间" width="170">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="$router.push(`/orders/${row.id}`)">详情</el-button>
            <el-button type="primary" link v-if="row.status === 1" @click="handleStatus(row, 2, '已支付')">确认付款</el-button>
            <el-button type="primary" link v-if="!row.assignment && row.status >= 2" @click="showAssignDialog(row)">分配</el-button>
            <el-button type="primary" link v-if="row.status === 2" @click="showDeliverDialog(row)">发货</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <el-pagination
        style="margin-top: 20px; justify-content: flex-end"
        v-model:current-page="query.page"
        v-model:page-size="query.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        @change="fetchOrders"
      />
    </div>

    <!-- 发货对话框 -->
    <el-dialog v-model="deliverVisible" title="订单发货" width="500px">
      <el-form :model="deliverForm" label-width="100px">
        <el-form-item label="快递公司">
          <el-select v-model="deliverForm.expressCompany" placeholder="请选择快递公司">
            <el-option v-for="e in expressList" :key="e" :label="e" :value="e" />
          </el-select>
        </el-form-item>
        <el-form-item label="快递单号">
          <el-input v-model="deliverForm.expressNo" placeholder="请输入快递单号" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="deliverForm.adminRemark" type="textarea" placeholder="可选" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="deliverVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmDeliver">确认发货</el-button>
      </template>
    </el-dialog>
    <!-- 分配网点对话框 -->
    <el-dialog v-model="assignVisible" title="分配网点" width="640px" :close-on-click-modal="false">
      <div v-if="currentAssignOrder.address_json" class="assign-order-info">
        收货地址：{{ parseAddress(currentAssignOrder.address_json) }}
      </div>
      <el-table
        :data="outletList"
        border
        highlight-current-row
        @row-click="(row) => assignForm.outletId = row.id"
        :row-class-name="(row) => assignForm.outletId === row.id ? 'selected-row' : ''"
        v-loading="assignLoading"
        style="margin: 12px 0"
      >
        <el-table-column width="50" align="center">
          <template #default="{ row }">
            <el-radio v-model="assignForm.outletId" :value="row.id" />
          </template>
        </el-table-column>
        <el-table-column label="网点信息" min-width="180">
          <template #default="{ row }">
            <div class="outlet-name">{{ row.name }}</div>
            <div class="outlet-contact">{{ row.contact }} {{ row.phone }}</div>
          </template>
        </el-table-column>
        <el-table-column label="地区" width="130">
          <template #default="{ row }">
            <span>{{ row.province || '-' }}</span>
            <span v-if="row.city"> / {{ row.city }}</span>
          </template>
        </el-table-column>
        <el-table-column label="业务类型" width="130">
          <template #default="{ row }">
            <span v-if="row.outlet_business_types && row.outlet_business_types.length > 0">
              <el-tag v-for="b in row.outlet_business_types.slice(0,2)" :key="b.business_type?.code"
                size="small" style="margin-right: 4px">{{ b.business_type?.name || b.business_type?.code }}</el-tag>
              <span v-if="row.outlet_business_types.length > 2" style="font-size: 11px; color: #999">+{{ row.outlet_business_types.length - 2 }}</span>
            </span>
            <span v-else style="color: #999; font-size: 12px">全部</span>
          </template>
        </el-table-column>
        <el-table-column label="匹配度" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.matchScore >= 100" type="success" size="small">精确匹配</el-tag>
            <el-tag v-else-if="row.matchScore >= 50" type="warning" size="small">省级匹配</el-tag>
            <el-tag v-else-if="row.matchScore > 0" type="info" size="small">有覆盖</el-tag>
            <span v-else style="color: #bbb; font-size: 12px">无覆盖</span>
          </template>
        </el-table-column>
      </el-table>
      <div v-if="outletList.length === 0 && !assignLoading" style="text-align:center; padding: 20px; color: #999">
        暂无可用网点，请先在派单规则中配置服务区域
      </div>
      <el-form label-width="80px" style="margin-top: 8px">
        <el-form-item label="备注">
          <el-input v-model="assignForm.remark" type="textarea" placeholder="可选，填写分配说明" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="assignVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmAssign" :loading="assigning" :disabled="!assignForm.outletId">确认分配</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { getSealOrders, updateOrder, assignOrderAPI, getAvailableOutlets, getOrderStatistics } from '@/api'
import { FolderOpened, Clock, Tools, Calendar } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'

const statsError = ref(false)
const stats = reactive({ seal: 0, making: 0, todaySeal: 0, assigned: 0 })

const loadStats = async () => {
  try {
    statsError.value = false
    const res = await getOrderStatistics()
    stats.seal = res.seal ?? 0
    stats.making = res.making ?? 0
    stats.todaySeal = res.todaySeal ?? 0
    stats.assigned = res.assignedOrders ?? 0
  } catch {
    statsError.value = true
  }
}

const loading = ref(false)
const list = ref<any[]>([])
const pagination = ref({ page: 1, pageSize: 20, total: 0 })
const dateRange = ref<string[]>([])
const query = reactive({ keyword: '', status: '', startDate: '', endDate: '', page: 1, pageSize: 20 })

const statusOptions = [
  { value: 1, label: '待支付' }, { value: 2, label: '已支付' }, { value: 3, label: '制作中' },
  { value: 4, label: '已发货' }, { value: 5, label: '已完成' }, { value: 6, label: '已取消' },
  { value: 7, label: '售后中' }, { value: 8, label: '退款中' }, { value: 9, label: '已退款' },
]

const expressList = ['顺丰速运', '中通快递', '圆通速递', '韵达快递', '申通快递', '京东物流', 'EMS', '邮政包裹']

const deliverVisible = ref(false)
const currentOrder = ref<any>({})
const deliverForm = reactive({ expressCompany: '', expressNo: '', adminRemark: '' })

const assignVisible = ref(false)
const assigning = ref(false)
const assignLoading = ref(false)
const outletList = ref<any[]>([])
const currentAssignOrder = ref<any>({})
const assignForm = reactive({ outletId: '', remark: '' })

function statusType(status: number) {
  const map: Record<number, string> = { 1: 'warning', 2: 'primary', 3: '', 4: 'success', 5: 'success', 6: 'info', 7: 'warning', 8: 'danger', 9: 'info' }
  return map[status] || ''
}

function assignStatusType(status: number) {
  const map: Record<number, string> = { 1: 'warning', 2: 'primary', 3: 'success' }
  return map[status] || ''
}

function formatDate(date: string) { return dayjs(date).format('YYYY-MM-DD HH:mm') }

function parseAddress(json: string) {
  try { const a = JSON.parse(json); return [a.province, a.city, a.district, a.detail].filter(Boolean).join(''); }
  catch { return json; }
}

async function fetchOrders() {
  loading.value = true
  try {
    query.startDate = dateRange.value?.[0] || ''
    query.endDate = dateRange.value?.[1] || ''
    const res: any = await getSealOrders(query)
    list.value = res.list
    pagination.value = res.pagination
  } finally {
    loading.value = false
  }
}

function search() { query.page = 1; fetchOrders() }
function reset() { query.keyword = ''; query.status = ''; dateRange.value = []; search() }
function refresh() { fetchOrders() }

function showDeliverDialog(order: any) {
  currentOrder.value = order
  deliverForm.expressCompany = ''
  deliverForm.expressNo = ''
  deliverForm.adminRemark = ''
  deliverVisible.value = true
}

async function confirmDeliver() {
  await updateOrder(currentOrder.value.id, { status: 4, ...deliverForm })
  ElMessage.success('发货成功')
  deliverVisible.value = false
  fetchOrders()
}

async function handleStatus(order: any, status: number, statusText: string) {
  await updateOrder(order.id, { status, statusText })
  ElMessage.success(`订单已${statusText}`)
  fetchOrders()
}

async function showAssignDialog(order: any) {
  assignForm.outletId = ''
  assignForm.remark = ''
  currentAssignOrder.value = order
  assignVisible.value = true
  assignLoading.value = true
  try {
    // 优先用智能推荐接口（带匹配分），传入收货地址和业务类型
    const params: any = {}
    if (order.address_json) params.addressJson = order.address_json
    // 根据订单类型推断业务类型（seal订单→seal，newspaper订单→newspaper等）
    const bizType = order.type?.includes('刻章') ? 'seal' : order.type?.includes('登报') ? 'newspaper' : 'accounting'
    if (bizType) params.businessType = bizType
    const res: any = await getAvailableOutlets(params)
    outletList.value = res || []
  } catch {
    outletList.value = []
  } finally {
    assignLoading.value = false
  }
}

async function confirmAssign() {
  if (!assignForm.outletId) { ElMessage.warning('请选择网点'); return }
  assigning.value = true
  try {
    await assignOrderAPI(currentAssignOrder.value.id, { outletId: assignForm.outletId, remark: assignForm.remark })
    ElMessage.success('分配成功')
    assignVisible.value = false
    fetchOrders()
  } finally { assigning.value = false }
}

function exportOrders() { ElMessage.info('导出功能开发中') }

onMounted(() => {
  loadStats()
  fetchOrders()
})
</script>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 14px;
}
.stat-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px 20px 18px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
  transition: transform .2s, box-shadow .2s;
  cursor: default;
}
.stat-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(0,0,0,.1);
}
.stat-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}
.stat-info { flex: 1; }
.stat-value {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.1;
  margin-bottom: 4px;
}
.stat-label { font-size: 13px; color: #666; }

.stat-primary {
  background: linear-gradient(135deg, #eef2ff 0%, #dde4ff 100%);
  border: 1px solid rgba(91,111,232,.15);
}
.stat-primary .stat-icon { background: linear-gradient(135deg, #5B6FE8, #7B8FF8); color: #fff; }
.stat-primary .stat-value { color: #3d4fc4; }

.stat-orange {
  background: linear-gradient(135deg, #fff1f0 0%, #ffccc7 100%);
  border: 1px solid rgba(245,34,45,.15);
}
.stat-orange .stat-icon { background: linear-gradient(135deg, #f5222d, #ff4d4f); color: #fff; }
.stat-orange .stat-value { color: #cf1322; }

.stat-blue {
  background: linear-gradient(135deg, #e6f7ff 0%, #bae0ff 100%);
  border: 1px solid rgba(24,144,255,.15);
}
.stat-blue .stat-icon { background: linear-gradient(135deg, #1890ff, #69c0ff); color: #fff; }
.stat-blue .stat-value { color: #0958d9; }

.stat-green {
  background: linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%);
  border: 1px solid rgba(82,196,26,.15);
}
.stat-green .stat-icon { background: linear-gradient(135deg, #52c41a, #73d13d); color: #fff; }
.stat-green .stat-value { color: #389e0d; }

.stats-error {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #f5222d;
  font-size: 13px;
  margin-bottom: 10px;
}

.assign-order-info {
  background: #f5f7fa;
  border-radius: 6px;
  padding: 10px 14px;
  font-size: 13px;
  color: #666;
  margin-bottom: 4px;
}
.outlet-name {
  font-weight: 600;
  font-size: 14px;
  color: #333;
}
.outlet-contact {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}
:deep(.selected-row) td {
  background: #ecf5ff !important;
}
:deep(.el-table .selected-row td:first-child .el-radio__inner) {
  background: #5B6FE8;
  border-color: #5B6FE8;
}
</style>
