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
import { getSealOrders, updateOrder, assignOrderAPI, getAvailableOutlets } from '@/api'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'

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

onMounted(fetchOrders)
</script>

<style scoped>
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
