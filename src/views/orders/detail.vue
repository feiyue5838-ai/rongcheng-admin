<template>
  <div>
    <div class="page-header">
      <h2>订单详情</h2>
      <div>
        <el-button @click="$router.push('/orders/seal')">返回列表</el-button>
        <el-button type="primary" @click="refresh">刷新</el-button>
      </div>
    </div>

    <div v-loading="loading" style="min-height: 200px">
      <div v-if="order" class="order-detail">
      <!-- 基本信息 -->
      <el-card shadow="hover" style="margin-bottom: 16px">
        <template #header><span>基本信息</span></template>
        <el-descriptions :column="3" border>
          <el-descriptions-item label="订单号">{{ order.orderNo }}</el-descriptions-item>
          <el-descriptions-item label="订单类型">{{ order.type || order.module }}</el-descriptions-item>
          <el-descriptions-item label="订单状态">
            <el-tag :type="statusType(order.status)">{{ order.statusText }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="下单时间">{{ formatDate(order.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="支付时间">{{ order.payTime ? formatDate(order.payTime) : '-' }}</el-descriptions-item>
          <el-descriptions-item label="订单金额">¥{{ order.totalPrice }}</el-descriptions-item>
          <el-descriptions-item label="用户昵称">{{ order.user?.nickname || '-' }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ order.contactPhone || '-' }}</el-descriptions-item>
          <el-descriptions-item label="实付金额" v-if="order.payPrice">
            <span style="color: #5B6FE8; font-weight: 600">¥{{ order.payPrice }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="支付方式">{{ order.payMethod || '-' }}</el-descriptions-item>
          <el-descriptions-item label="微信交易号">{{ order.transactionId || '-' }}</el-descriptions-item>
          <el-descriptions-item label="用户备注" :span="showParsedRemark ? 3 : 1">
            <template v-if="showParsedRemark">
              <div class="remark-json">
                <div v-for="(val, key) in parsedRemark" :key="key" class="remark-item">
                  <span class="remark-key">{{ remarkLabel(String(key)) }}:</span>
                  <span class="remark-val">{{ formatRemarkValue(String(key), val) }}</span>
                </div>
              </div>
            </template>
            <template v-else>{{ order.remark || '-' }}</template>
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- 办理信息（刻章订单） -->
      <el-card shadow="hover" style="margin-bottom: 16px" v-if="order.module === 'seal'">
        <template #header><span>办理信息</span></template>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="公司名称">{{ order.companyName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="执照地区">{{ order.licenseRegion || '-' }}</el-descriptions-item>
          <el-descriptions-item label="刻章原因">{{ order.sealReason || '-' }}</el-descriptions-item>
          <el-descriptions-item label="法人电话">{{ order.legalPhone || '-' }}</el-descriptions-item>
          <el-descriptions-item label="地址">{{ order.addressJson ? formattedAddress : order.addressJson || '-' }}</el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- 订单明细 -->
      <el-card shadow="hover" style="margin-bottom: 16px">
        <template #header><span>订单明细</span></template>
        <el-table v-if="order.orderItems?.length" :data="order.orderItems" stripe>
          <el-table-column prop="name" label="商品名称" min-width="160" />
          <el-table-column prop="price" label="单价" width="100">
            <template #default="{ row }">¥{{ row.price }}</template>
          </el-table-column>
          <el-table-column prop="quantity" label="数量" width="80" />
          <el-table-column label="小计" width="100">
            <template #default="{ row }">¥{{ (Number(row.price) * row.quantity).toFixed(2) }}</template>
          </el-table-column>
        </el-table>
        <div v-else style="color: #999; padding: 16px 0; text-align: center">该订单未生成商品明细（可能是历史遗留数据）</div>
        <div style="text-align: right; margin-top: 16px; font-size: 16px">
          合计：<span style="font-weight: 600">¥{{ order.totalPrice }}</span>
          <span v-if="order.payPrice" style="margin-left: 20px; color: #5B6FE8">
            实付：<span style="font-weight: 600">¥{{ order.payPrice }}</span>
          </span>
        </div>
      </el-card>

      <!-- 材料上传 -->
      <el-card shadow="hover" style="margin-bottom: 16px" v-if="order.materials?.length">
        <template #header><span>材料上传</span></template>
        <div v-for="m in order.materials" :key="m.id" style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px">
          <span style="min-width: 120px">{{ MATERIAL_LABEL[m.type] || m.type }}</span>
          <el-image :src="m.url" style="width: 100px; height: 100px; border-radius: 8px; object-fit: cover" preview-teleported :preview-src-list="[m.url]" />
          <el-tag :type="m.status === 1 ? 'success' : m.status === 2 ? 'danger' : 'warning'">
            {{ m.status === 1 ? '已通过' : m.status === 2 ? '已驳回' : '待审核' }}
          </el-tag>
          <el-select v-if="m.status === 0" v-model="m._auditStatus" size="small" style="width: 100px" @change="doAuditMaterial(m)">
            <el-option label="通过" :value="1" />
            <el-option label="驳回" :value="2" />
          </el-select>
        </div>
      </el-card>

      <!-- 分配信息 -->
      <el-card shadow="hover" style="margin-bottom: 16px">
        <template #header><span>网点分配</span></template>
        <template v-if="order.assignment">
          <el-descriptions :column="3" border>
            <el-descriptions-item label="分配网点">{{ order.assignment.outlet?.name || '-' }}</el-descriptions-item>
            <el-descriptions-item label="分配状态">
              <el-tag :type="assignStatusType(order.assignment.status)">{{ order.assignment.statusText }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="分配时间">{{ formatDate(order.assignment.assignedAt) }}</el-descriptions-item>
            <el-descriptions-item label="接单时间">{{ order.assignment.acceptedAt ? formatDate(order.assignment.acceptedAt) : '-' }}</el-descriptions-item>
            <el-descriptions-item label="完成时间">{{ order.assignment.completedAt ? formatDate(order.assignment.completedAt) : '-' }}</el-descriptions-item>
            <el-descriptions-item label="分配备注">{{ order.assignment.remark || '-' }}</el-descriptions-item>
          </el-descriptions>
        </template>
        <div v-else style="color: #999">
          未分配网点
          <el-button type="primary" link @click="showAssignDialog">去分配</el-button>
        </div>
      </el-card>

      <!-- 物流信息 -->
      <el-card shadow="hover" style="margin-bottom: 16px" v-if="order.expressCompany || order.expressNo">
        <template #header><span>物流信息</span></template>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="快递公司">{{ order.expressCompany }}</el-descriptions-item>
          <el-descriptions-item label="快递单号">{{ order.expressNo }}</el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- 交付回执 -->
      <el-card shadow="hover" style="margin-bottom: 16px" v-if="order.receipts?.length">
        <template #header><span>交付回执</span></template>
        <div style="display: flex; gap: 16px; flex-wrap: wrap">
          <div v-for="r in order.receipts" :key="r.id" style="text-align: center">
            <el-image :src="r.url" style="width: 140px; height: 140px; border-radius: 8px; object-fit: cover; border: 1px solid #eee" preview-teleported :preview-src-list="[r.url]" />
            <div style="font-size: 12px; color: #999; margin-top: 4px">{{ r.type === 'certificate' ? '备案证明' : r.type === 'signature' ? '盖章文件' : r.type }}</div>
          </div>
        </div>
      </el-card>

      <!-- 管理员操作 -->
      <el-card shadow="hover" v-if="order.status !== 6 && order.status !== 9">
        <template #header><span>管理操作</span></template>
        <el-form inline label-width="100px">
          <el-form-item label="订单状态">
            <el-select v-model="newStatus" style="width: 140px">
              <el-option v-for="s in statusOptions" :key="s.value" :label="s.label" :value="s.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="管理员备注">
            <el-input v-model="adminRemark" placeholder="可选" style="width: 300px" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="saveChanges">保存</el-button>
          </el-form-item>
        </el-form>
        <!-- 退款 / 售后按钮 -->
        <el-divider v-if="[2,3,4,5,7,8,9].includes(order.status)" />
        <div v-if="[2,3,4].includes(order.status)" style="margin-top: 12px">
          <el-button type="danger" @click="showRefundDialog">申请退款</el-button>
          <span style="margin-left: 12px; color: #999; font-size: 13px">订单状态为已支付/制作中/已发货时可退款</span>
        </div>
        <div v-if="order.status === 5" style="margin-top: 12px">
          <el-button type="warning" @click="afterSalesVisible = true">申请售后</el-button>
          <span style="margin-left: 12px; color: #999; font-size: 13px">订单已完成，进入售后流程后再退款</span>
        </div>
        <div v-if="order.status === 7" style="margin-top: 12px">
          <el-button type="danger" @click="showRefundDialog">确认退款</el-button>
          <span style="margin-left: 12px; color: #999; font-size: 13px">售后已申请，确认无误后执行退款</span>
        </div>
        <div v-if="order.status === 8" style="margin-top: 12px">
          <el-tag type="danger">退款中</el-tag>
          <span style="margin-left: 12px; color: #999; font-size: 13px">退款已发起，等待微信退款完成（通常 1-3 个工作日）</span>
        </div>
        <div v-if="order.status === 9" style="margin-top: 12px">
          <el-tag type="info">已退款</el-tag>
          <span style="margin-left: 12px; color: #999; font-size: 13px">退款已完成</span>
        </div>
      </el-card>
    </div>
    </div>

    <!-- 退款对话框 -->
    <el-dialog v-model="refundVisible" title="订单退款" width="480px">
      <el-form label-width="100px">
        <el-form-item label="退款金额">
          <el-input-number v-model="refundForm.amount" :min="0.01" :max="order?.payPrice || order?.totalPrice || 0" :precision="2" style="width: 200px" />
          <span style="margin-left: 12px; color: #999">最多 ¥{{ order?.payPrice || order?.totalPrice || 0 }}</span>
        </el-form-item>
        <el-form-item label="退款原因">
          <el-input v-model="refundForm.reason" type="textarea" placeholder="请输入退款原因（必填）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="refundVisible = false">取消</el-button>
        <el-button type="danger" @click="confirmRefund" :loading="refunding">确认退款</el-button>
      </template>
    </el-dialog>

    <!-- 申请售后对话框 -->
    <el-dialog v-model="afterSalesVisible" title="申请售后" width="480px">
      <el-form label-width="100px">
        <el-form-item label="售后原因">
          <el-input v-model="afterSalesForm.reason" type="textarea" :rows="3" placeholder="请输入申请售后的原因（必填）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="afterSalesVisible = false">取消</el-button>
        <el-button type="warning" @click="confirmAfterSales" :loading="afterSalesLoading">确认提交</el-button>
      </template>
    </el-dialog>

    <!-- 分配网点对话框 -->
    <el-dialog v-model="assignVisible" title="分配网点" width="480px">
      <el-form label-width="100px">
        <el-form-item label="选择网点">
          <el-select v-model="assignForm.outletId" filterable placeholder="请选择网点" style="width: 100%">
            <el-option v-for="s in outletList" :key="s.id" :label="`${s.name}（${s.phone}）`" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="assignForm.remark" type="textarea" placeholder="可选" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="assignVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmAssign" :loading="assigning">确认分配</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { getOrderDetail, updateOrder, assignOrderAPI, getOutletsAPI, auditMaterial, refundOrder } from '@/api'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'

const MATERIAL_LABEL: Record<string, string> = {
  id_card_front: '身份证人像面',
  id_card_back: '身份证国徽面',
  business_license: '营业执照',
  license: '营业执照',
  additional: '其他材料',
  seal_photo: '印章照片',
  signature: '电子签名',
  power_of_attorney: '委托书',
  cert_no: '证件号码页',
  cert_front: '证件正面',
  cert_back: '证件反面',
  receipt: '回执凭证',
}

const route = useRoute()
const loading = ref(true)
const order = ref<any>(null)
const newStatus = ref(1)
const adminRemark = ref('')

const assignVisible = ref(false)
const assigning = ref(false)
const outletList = ref<any[]>([])
const assignForm = ref({ outletId: '', remark: '' })

// 退款相关
const refundVisible = ref(false)
const refunding = ref(false)
const refundForm = ref({ amount: 0, reason: '' })

function showRefundDialog() {
  refundForm.value = {
    amount: Number(order.value?.payPrice || order.value?.totalPrice || 0),
    reason: ''
  }
  refundVisible.value = true
}

async function confirmRefund() {
  if (!refundForm.value.amount || refundForm.value.amount <= 0) {
    ElMessage.warning('请输入退款金额')
    return
  }
  if (!refundForm.value.reason.trim()) {
    ElMessage.warning('请填写退款原因')
    return
  }
  refunding.value = true
  try {
    // amount 单位：元，后端 order.controller 收到后自行 *100 转分
    await refundOrder(order.value.id, {
      amount: refundForm.value.amount,
      reason: refundForm.value.reason
    })
    ElMessage.success('退款已发起')
    refundVisible.value = false
    fetchDetail()
  } catch (err: any) {
    ElMessage.error(err?.message || '退款失败')
  } finally {
    refunding.value = false
  }
}

// 售后相关
const afterSalesVisible = ref(false)
const afterSalesLoading = ref(false)
const afterSalesForm = ref({ reason: '' })

async function confirmAfterSales() {
  if (!afterSalesForm.value.reason.trim()) {
    ElMessage.warning('请填写售后原因')
    return
  }
  afterSalesLoading.value = true
  try {
    await updateOrder(order.value.id, {
      status: 7,
      statusText: '售后中',
      remark: order.value.remark
        ? (() => {
            try {
              const r = JSON.parse(order.value.remark)
              r.afterSales = {
                reason: afterSalesForm.value.reason,
                appliedAt: new Date().toISOString()
              }
              return JSON.stringify(r)
            } catch {
              return JSON.stringify({ afterSales: { reason: afterSalesForm.value.reason, appliedAt: new Date().toISOString() } })
            }
          })()
        : JSON.stringify({ afterSales: { reason: afterSalesForm.value.reason, appliedAt: new Date().toISOString() } })
    })
    ElMessage.success('已进入售后流程')
    afterSalesVisible.value = false
    fetchDetail()
  } catch (err: any) {
    ElMessage.error(err?.message || '操作失败')
  } finally {
    afterSalesLoading.value = false
  }
}

const statusOptions = [
  { value: 1, label: '待支付' }, { value: 2, label: '已支付' },
  { value: 3, label: '制作中' }, { value: 4, label: '已发货' },
  { value: 5, label: '已完成' }, { value: 6, label: '已取消' },
  { value: 7, label: '售后中' }, { value: 8, label: '退款中' }, { value: 9, label: '已退款' },
]

const statusMap: Record<number, string> = {
  1: '待支付', 2: '已支付', 3: '制作中', 4: '已发货',
  5: '已完成', 6: '已取消', 7: '售后中', 8: '退款中', 9: '已退款',
}

function statusType(status: number) {
  const map: Record<number, string> = { 1: 'warning', 2: 'primary', 3: '', 4: 'success', 5: 'success', 6: 'info', 7: 'warning', 8: 'danger', 9: 'info' }
  return map[status] || ''
}

function assignStatusType(status: number) {
  const map: Record<number, string> = { 1: 'warning', 2: 'primary', 3: 'success' }
  return map[status] || ''
}

function formatDate(d: string) { return d ? dayjs(d).format('YYYY-MM-DD HH:mm') : '-' }

const parsedRemark = computed(() => {
  if (!order.value?.remark) return {}
  try {
    return JSON.parse(order.value.remark)
  } catch {
    return {}
  }
})

// 判断remark是否为JSON对象（可解析且是对象），而非普通文本
const showParsedRemark = computed(() => {
  const parsed = parsedRemark.value
  return parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0
})

function remarkLabel(key: string) {
  const map: Record<string, string> = {
    taxpayerType: '纳税人类型',
    cycle: '服务周期',
    invoice: '开票服务',
    social: '社保服务',
    fund: '公积金服务',
    phone: '联系电话',
    refund: '退款记录'
  }
  return map[key] || key
}

function formatRemarkValue(key: string, val: any) {
  if (key === 'refund' && val && typeof val === 'object') {
    return `¥${(val.refundFee / 100).toFixed(2)} (${dayjs(val.refundedAt).format('MM-DD HH:mm')})`
  }
  const maps: Record<string, Record<string, string>> = {
    taxpayerType: { small: '小规模纳税人', general: '一般纳税人' },
    cycle: { year: '全年', half: '半年', preorder: '预售' },
    invoice: { none: '无', within5: '开票≤5万/月', normal: '开票>5万/月' },
    social: { none: '无', with: '包含' },
    fund: { none: '无', with: '包含' }
  }
  if (maps[key] && maps[key][val]) return maps[key][val]
  return val
}

const formattedAddress = computed(() => {
  if (!order.value?.addressJson) return '-'
  try {
    const a = JSON.parse(order.value.addressJson)
    if (a && typeof a === 'object') {
      return [a.province, a.city, a.detail].filter(Boolean).join(' ') || order.value.addressJson
    }
    return order.value.addressJson
  } catch {
    return order.value.addressJson
  }
})

async function fetchDetail() {
  loading.value = true
  try {
    order.value = await getOrderDetail(route.params.id as string)
    newStatus.value = order.value.status
    adminRemark.value = order.value.adminRemark || ''
    // 材料审核的临时变量
    if (order.value.materials) {
      order.value.materials.forEach((m: any) => { m._auditStatus = 1 })
    }
  } finally {
    loading.value = false
  }
}

async function saveChanges() {
  await updateOrder(order.value.id, {
    status: newStatus.value,
    statusText: statusMap[newStatus.value] || order.value.statusText,
    adminRemark: adminRemark.value,
  })
  ElMessage.success('保存成功')
  fetchDetail()
}

async function doAuditMaterial(m: any) {
  try {
    await auditMaterial(m.id, { status: m._auditStatus })
    ElMessage.success(m._auditStatus === 1 ? '已通过' : '已驳回')
    fetchDetail()
  } catch {
    ElMessage.error('审核失败')
  }
}

async function showAssignDialog() {
  assignForm.value = { outletId: '', remark: '' }
  assignVisible.value = true
  try {
    const res: any = await getOutletsAPI({ page: 1, pageSize: 100 })
    outletList.value = res.list || []
  } catch { /* ignore */ }
}

async function confirmAssign() {
  if (!assignForm.value.outletId) { ElMessage.warning('请选择网点'); return }
  assigning.value = true
  try {
    await assignOrderAPI(order.value.id, assignForm.value)
    ElMessage.success('分配成功')
    assignVisible.value = false
    fetchDetail()
  } finally {
    assigning.value = false
  }
}

function refresh() { fetchDetail() }

onMounted(fetchDetail)
</script>

<style scoped>
.remark-json {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 300px;
}
.remark-item {
  display: flex;
  gap: 8px;
  font-size: 13px;
}
.remark-key {
  color: #666;
  min-width: 70px;
}
.remark-val {
  color: #333;
  font-weight: 500;
}
</style>
