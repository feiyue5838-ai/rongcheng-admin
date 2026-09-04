<template>
  <div v-loading="loading">
    <div class="page-header">
      <h2>供应链视图 - {{ orderNo }}</h2>
      <div>
        <el-button @click="$router.back()">返回</el-button>
        <el-button type="primary" @click="load">刷新</el-button>
      </div>
    </div>

    <template v-if="detail">
      <!-- 订单基本信息 -->
      <el-card shadow="hover" style="margin-bottom: 16px">
        <template #header>
          <span>订单基本信息</span>
          <el-tag :type="moduleType(detail.order?.module)" style="margin-left: 8px">{{ moduleLabel(detail.order?.module) }}</el-tag>
        </template>
        <el-descriptions :column="4" border>
          <el-descriptions-item label="订单号">{{ detail.order.orderNo }}</el-descriptions-item>
          <el-descriptions-item label="订单状态">
            <el-tag :type="statusTag(detail.order.orderStatus)">{{ orderStatusMap[detail.order.orderStatus] || detail.order.orderStatus }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="支付状态">
            <el-tag :type="detail.order.paymentStatus === 'paid' ? 'success' : 'info'">{{ paymentStatusMap[detail.order.paymentStatus] || detail.order.paymentStatus }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="退款状态">{{ refundStatusMap[detail.order.refundStatus] || detail.order.refundStatus || '-' }}</el-descriptions-item>
          <el-descriptions-item label="履约状态">
            <el-tag :type="fulfillmentTag(detail.order.fulfillmentStatus)">{{ fulfillmentStatusMap[detail.order.fulfillmentStatus] || detail.order.fulfillmentStatus }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="总金额">¥{{ Number(detail.order.totalAmount || 0).toFixed(2) }}</el-descriptions-item>
          <el-descriptions-item label="实付金额">¥{{ Number(detail.order.payAmount || 0).toFixed(2) }}</el-descriptions-item>
          <el-descriptions-item label="下单时间">{{ fmt(detail.order.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="支付时间">{{ fmt(detail.order.paidAt) }}</el-descriptions-item>
          <el-descriptions-item label="完成时间">{{ fmt(detail.order.completedAt) }}</el-descriptions-item>
          <el-descriptions-item label="用户备注" :span="2">{{ detail.order.customerRemark || '-' }}</el-descriptions-item>
        </el-descriptions>

        <!-- 收货地址 -->
        <el-descriptions v-if="detail.order.addressSnapshot" :column="3" border style="margin-top: 12px" title="收货地址">
          <el-descriptions-item label="收货人">{{ detail.order.addressSnapshot.receiver_name || detail.order.addressSnapshot.name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="电话">{{ detail.order.addressSnapshot.receiver_phone || detail.order.addressSnapshot.phone || '-' }}</el-descriptions-item>
          <el-descriptions-item label="地址">
            {{ [detail.order.addressSnapshot.province, detail.order.addressSnapshot.city, detail.order.addressSnapshot.district, detail.order.addressSnapshot.address || detail.order.addressSnapshot.detail].filter(Boolean).join(' ') }}
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- 办理内容 -->
      <el-card v-if="detail.sealDetails || detail.newspaperDetails" shadow="hover" style="margin-bottom: 16px">
        <template #header><span>办理内容</span></template>
        <el-descriptions v-if="detail.sealDetails" :column="3" border>
          <el-descriptions-item label="企业名称">{{ detail.sealDetails.companyName }}</el-descriptions-item>
          <el-descriptions-item label="法人">{{ detail.sealDetails.legalPerson }}</el-descriptions-item>
          <el-descriptions-item label="印章数量">{{ detail.sealDetails.sealCount }}</el-descriptions-item>
          <el-descriptions-item label="印章类型">{{ (detail.sealDetails.sealTypes || []).join('、') || '-' }}</el-descriptions-item>
          <el-descriptions-item label="套系">{{ detail.sealDetails.sealPackageName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="是否备案">{{ detail.sealDetails.filingRequired ? '是' : '否' }}</el-descriptions-item>
        </el-descriptions>
        <el-descriptions v-if="detail.newspaperDetails" :column="2" border>
          <el-descriptions-item label="报纸">{{ detail.newspaperDetails.newspaperName }}</el-descriptions-item>
          <el-descriptions-item label="字数">{{ detail.newspaperDetails.contentCharCount }}</el-descriptions-item>
          <el-descriptions-item label="公告内容" :span="2">{{ detail.newspaperDetails.content }}</el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- 供应链：派单链/履约时间线 -->
      <el-card shadow="hover" style="margin-bottom: 16px">
        <template #header>
          <span>供应链履约</span>
          <el-button
            v-if="detail.order.orderStatus === 'paid' && detail.order.paymentStatus === 'paid' && detail.order.fulfillmentStatus === 'pending_assignment'"
            type="primary" size="small" style="margin-left: 8px"
            @click="assignDialogVisible = true"
          >派单</el-button>
          <el-button
            v-if="detail.order.fulfillmentStatus === 'assigned'"
            type="warning" size="small" style="margin-left: 8px"
            @click="reassignDialogVisible = true"
          >改派</el-button>
        </template>

        <el-empty v-if="!detail.fulfillments || detail.fulfillments.length === 0" description="暂无履约记录" />
        <el-timeline v-else>
          <el-timeline-item
            v-for="(f, idx) in detail.fulfillments"
            :key="f.id"
            :type="f.status === 'cancelled' ? 'danger' : f.status === 'completed' ? 'success' : 'primary'"
            :timestamp="`${fmt(f.assignedAt)}`"
          >
            <div class="fulfillment-item">
              <div>
                <el-tag size="small" :type="fulfillmentTag(f.status)">{{ fulfillmentStatusMap[f.status] || f.status }}</el-tag>
                <span style="margin-left: 8px; font-weight: 600">{{ f.supplierName }}</span>
                <span style="margin-left: 8px; color: #999">{{ f.fulfillmentNo }}</span>
                <span v-if="f.cancelReason" style="margin-left: 8px; color: #f56c6c">（{{ f.cancelReason }}）</span>
              </div>
              <div style="margin-top: 4px; color: #888; font-size: 12px">
                派单 {{ fmt(f.assignedAt) }}
                <template v-if="f.acceptedAt"> · 接单 {{ fmt(f.acceptedAt) }}</template>
                <template v-if="f.startedAt"> · 制作 {{ fmt(f.startedAt) }}</template>
                <template v-if="f.completedAt"> · 完成 {{ fmt(f.completedAt) }}</template>
                <template v-if="f.cancelledAt"> · 取消 {{ fmt(f.cancelledAt) }}</template>
              </div>
            </div>
          </el-timeline-item>
        </el-timeline>
      </el-card>

      <!-- 事件时间线 -->
      <el-card shadow="hover" style="margin-bottom: 16px">
        <template #header><span>订单事件</span></template>
        <el-timeline v-if="detail.events && detail.events.length">
          <el-timeline-item
            v-for="(ev, i) in detail.events"
            :key="i"
            :timestamp="fmt(ev.createdAt)"
            :type="ev.eventType.includes('CANCELLED') || ev.eventType.includes('REJECTED') ? 'danger' : ev.eventType.includes('COMPLETED') || ev.eventType.includes('PAID') ? 'success' : 'primary'"
          >
            <span style="font-weight: 500">{{ ev.eventName || ev.eventType }}</span>
            <span style="margin-left: 8px; color: #999; font-size: 12px">{{ ev.eventType }}</span>
          </el-timeline-item>
        </el-timeline>
        <el-empty v-else description="暂无事件" />
      </el-card>
    </template>

    <!-- 派单对话框 -->
    <el-dialog v-model="assignDialogVisible" title="派单" width="480px">
      <el-form label-width="80px">
        <el-form-item label="供应商" required>
          <el-select v-model="assignForm.supplierId" filterable placeholder="选择供应商" style="width: 100%">
            <el-option v-for="s in suppliers" :key="s.id" :label="`${s.name}（${s.region || '未设区域'}）`" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="assignForm.remark" placeholder="派单备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="assignDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="doAssign">确认派单</el-button>
      </template>
    </el-dialog>

    <!-- 改派对话框 -->
    <el-dialog v-model="reassignDialogVisible" title="改派" width="480px">
      <el-alert type="warning" :closable="false" style="margin-bottom: 12px" title="改派将取消当前履约单并重新派单" />
      <el-form label-width="80px">
        <el-form-item label="新供应商" required>
          <el-select v-model="reassignForm.supplierId" filterable placeholder="选择供应商" style="width: 100%">
            <el-option v-for="s in suppliers" :key="s.id" :label="`${s.name}（${s.region || '未设区域'}）`" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="取消原因">
          <el-input v-model="reassignForm.cancelRemark" placeholder="改派原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reassignDialogVisible = false">取消</el-button>
        <el-button type="warning" :loading="submitting" @click="doReassign">确认改派</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute } from 'vue-router'
import { v2GetOrderDetail, v2AssignOrder, v2ReassignOrder, v2GetSuppliers } from '@/api'
import { FULFILLMENT_STATUS_TEXT, fulfillmentStatusTag } from '@/utils/fulfillment-status'

const route = useRoute()
const orderNo = ref('')
const loading = ref(false)
const submitting = ref(false)
const detail = ref<any>(null)
const suppliers = ref<any[]>([])
const assignDialogVisible = ref(false)
const reassignDialogVisible = ref(false)
const assignForm = reactive({ supplierId: '', remark: '' })
const reassignForm = reactive({ supplierId: '', cancelRemark: '' })

const orderStatusMap: Record<string, string> = {
  created: '已创建', pending_payment: '待支付', paid: '已支付',
  processing: '服务中', completed: '已完成', cancelled: '已取消', closed: '已关闭',
}
const paymentStatusMap: Record<string, string> = { unpaid: '未支付', paid: '已支付', partial_refund: '部分退款', full_refund: '已退款' }
const refundStatusMap: Record<string, string> = { none: '无', applying: '申请中', partial_refund: '部分退款', full_refund: '已退款', rejected: '已驳回' }
// 订单层履约状态字典（共享单一数据源，见 utils/fulfillment-status.ts）
const fulfillmentStatusMap: Record<string, string> = FULFILLMENT_STATUS_TEXT
const moduleLabel = (m: string) => ({ seal: '刻章', newspaper: '登报', bookkeeping: '记账' } as any)[m] || m
const moduleType = (m: string) => ({ seal: 'primary', newspaper: 'success', bookkeeping: 'warning' } as any)[m] || 'info'
const statusTag = (s: string) => ({ pending_payment: 'warning', paid: 'success', completed: 'info', cancelled: 'danger', processing: 'primary' } as any)[s] || 'info'
const fulfillmentTag = (s: string) => fulfillmentStatusTag(s)
// 后端时间为「本地时间 + Z 后缀」格式（非真实 UTC），直接截取字符串避免 new Date 解析产生 +8h 偏移
const fmt = (d?: string) => (d ? d.slice(0, 16).replace('T', ' ') : '-')

async function load() {
  loading.value = true
  try {
    detail.value = await v2GetOrderDetail(orderNo.value) as any
  } catch (e: any) {
    ElMessage.error(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

async function loadSuppliers() {
  try {
    const res: any = await v2GetSuppliers({ pageSize: 100 })
    // 仅启用供应商可派单/改派（停用的选了也会被后端拒绝，直接不展示）
    suppliers.value = (res.list || []).filter((s: any) => s.status === 1)
  } catch { /* 忽略 */ }
}

async function doAssign() {
  if (!assignForm.supplierId) { ElMessage.warning('请选择供应商'); return }
  submitting.value = true
  try {
    await v2AssignOrder(orderNo.value, { supplierId: assignForm.supplierId, remark: assignForm.remark })
    ElMessage.success('派单成功')
    assignDialogVisible.value = false
    load()
  } catch (e: any) {
    ElMessage.error(e?.message || '派单失败')
  } finally {
    submitting.value = false
  }
}

async function doReassign() {
  if (!reassignForm.supplierId) { ElMessage.warning('请选择供应商'); return }
  submitting.value = true
  try {
    await v2ReassignOrder(orderNo.value, { supplierId: reassignForm.supplierId, cancelRemark: reassignForm.cancelRemark })
    ElMessage.success('改派成功')
    reassignDialogVisible.value = false
    load()
  } catch (e: any) {
    ElMessage.error(e?.message || '改派失败')
  } finally {
    submitting.value = false
  }
}

watch(
  [() => route.query.orderNo, () => route.query.assign],
  async ([nextOrderNo, assign]) => {
    if (!nextOrderNo) {
      detail.value = null
      ElMessage.error('缺少订单号')
      return
    }
    orderNo.value = String(nextOrderNo)
    assignDialogVisible.value = false
    reassignDialogVisible.value = false
    assignForm.supplierId = ''
    assignForm.remark = ''
    reassignForm.supplierId = ''
    reassignForm.cancelRemark = ''
    await load()
    if (
      assign === '1' &&
      detail.value?.order?.orderStatus === 'paid' &&
      detail.value?.order?.paymentStatus === 'paid' &&
      detail.value?.order?.fulfillmentStatus === 'pending_assignment'
    ) {
      assignDialogVisible.value = true
    }
  },
  { immediate: true },
)

onMounted(async () => {
  await loadSuppliers()
})
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.fulfillment-item {
  padding-bottom: 4px;
}
</style>
