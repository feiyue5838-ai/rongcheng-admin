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
      <!-- ① 状态轨：客服/运营一眼定生死 -->
      <el-card shadow="hover" style="margin-bottom: 16px">
        <template #header>
          <span>订单状态</span>
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
          <el-descriptions-item label="履约状态">
            <el-tag :type="fulfillmentTag(detail.order.fulfillmentStatus)">{{ fulfillmentStatusMap[detail.order.fulfillmentStatus] || detail.order.fulfillmentStatus }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="退款状态">{{ refundStatusMap[detail.order.refundStatus] || detail.order.refundStatus || '-' }}</el-descriptions-item>
          <el-descriptions-item label="用户备注" :span="2">{{ detail.order.customerRemark || '-' }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.order.adminRemark" label="管理员备注">{{ detail.order.adminRemark }}</el-descriptions-item>
        </el-descriptions>
        <el-steps :active="trackActive" finish-status="success" style="margin-top: 16px">
          <el-step title="下单" :description="fmt(detail.order.createdAt)" />
          <el-step title="支付" :description="fmt(detail.order.paidAt)" />
          <el-step title="派单" :description="fmt(firstAssignedAt)" />
          <el-step title="完成" :description="fmt(detail.order.completedAt)" />
        </el-steps>
      </el-card>

      <!-- ② 订单金额：财务对账 -->
      <el-card shadow="hover" style="margin-bottom: 16px">
        <template #header><span>订单金额</span></template>
        <el-descriptions :column="4" border>
          <el-descriptions-item label="总金额">¥{{ Number(detail.order.totalAmount || 0).toFixed(2) }}</el-descriptions-item>
          <el-descriptions-item label="实付金额">¥{{ Number(detail.order.payAmount || 0).toFixed(2) }}</el-descriptions-item>
          <el-descriptions-item label="已付金额">¥{{ Number(detail.order.paidAmount || 0).toFixed(2) }}</el-descriptions-item>
          <el-descriptions-item label="支付方式">{{ detail.order.payMethod || '-' }}</el-descriptions-item>
          <el-descriptions-item label="交易流水号" :span="2">{{ detail.order.transactionId || '-' }}</el-descriptions-item>
          <el-descriptions-item label="支付时间">{{ fmt(detail.order.paidAt) }}</el-descriptions-item>
          <el-descriptions-item label="完成时间">{{ fmt(detail.order.completedAt) }}</el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- ③ 企业与执照：企业章独有，执照过期是驳回主因 -->
      <el-card v-if="detail.sealDetails" shadow="hover" style="margin-bottom: 16px">
        <template #header><span>企业与执照</span></template>
        <el-descriptions :column="3" border>
          <el-descriptions-item label="企业名称">{{ detail.sealDetails.companyName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="法人电话">{{ detail.sealDetails.legalPhone || '-' }}</el-descriptions-item>
          <el-descriptions-item label="执照归属地">{{ detail.sealDetails.licenseRegion || '-' }}</el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- ④ 印章明细 -->
      <el-card v-if="detail.sealDetails" shadow="hover" style="margin-bottom: 16px">
        <template #header><span>印章明细</span></template>
        <el-descriptions :column="3" border>
          <el-descriptions-item label="印章类型">
            <el-tag size="small" type="primary">{{ sealRouteTypeLabel(detail.sealDetails.routeType) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="套系">{{ detail.sealDetails.sealPackageName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="印章数量">{{ detail.sealDetails.sealCount ?? '-' }}</el-descriptions-item>
          <el-descriptions-item label="印章类型明细" :span="2">{{ (detail.sealDetails.sealTypes || []).join('、') || '-' }}</el-descriptions-item>
          <el-descriptions-item label="是否备案">{{ detail.sealDetails.filingRequired ? '是' : '否' }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.sealDetails.filingRequired" label="备案地">{{ detail.sealDetails.filingRegion || '-' }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.sealDetails.filingRequired" label="备案号">{{ detail.sealDetails.filingNo || '-' }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.sealDetails.filingRequired && detail.sealDetails.filedAt" label="备案时间">{{ fmt(detail.sealDetails.filedAt) }}</el-descriptions-item>
          <el-descriptions-item label="制作要求" :span="3">{{ detail.sealDetails.productionRequirement || '-' }}</el-descriptions-item>
          <el-descriptions-item label="交付要求" :span="3">{{ detail.sealDetails.deliveryRequirement || '-' }}</el-descriptions-item>
        </el-descriptions>

        <!-- 收货地址：交付相关，归印章明细 -->
        <el-descriptions v-if="detail.order.addressSnapshot" :column="3" border style="margin-top: 12px" title="收货地址">
          <el-descriptions-item label="收货人">{{ detail.order.addressSnapshot.receiver_name || detail.order.addressSnapshot.name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="电话">{{ detail.order.addressSnapshot.receiver_phone || detail.order.addressSnapshot.phone || '-' }}</el-descriptions-item>
          <el-descriptions-item label="地址">
            {{ [detail.order.addressSnapshot.province, detail.order.addressSnapshot.city, detail.order.addressSnapshot.district, detail.order.addressSnapshot.address || detail.order.addressSnapshot.detail].filter(Boolean).join(' ') }}
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- 办理内容（登报/记账：保持原样） -->
      <el-card v-if="detail.newspaperDetails || detail.bookkeepingDetails" shadow="hover" style="margin-bottom: 16px">
        <template #header><span>办理内容</span></template>
        <el-descriptions v-if="detail.newspaperDetails" :column="2" border>
          <el-descriptions-item label="报纸">{{ detail.newspaperDetails.newspaperName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="字数">{{ detail.newspaperDetails.contentCharCount ?? '-' }}</el-descriptions-item>
          <el-descriptions-item label="公告内容" :span="2">{{ detail.newspaperDetails.content || '-' }}</el-descriptions-item>
        </el-descriptions>
        <!-- 记账办理内容（2026-09-06：补齐，字段与网点端/小程序统一口径） -->
        <el-descriptions v-if="detail.bookkeepingDetails" :column="2" border>
          <el-descriptions-item label="企业名称">{{ detail.bookkeepingDetails.companyName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="服务套餐">{{ detail.bookkeepingDetails.packageName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="纳税人类型">{{ taxpayerTypeLabel(detail.bookkeepingDetails.taxpayerType) }}</el-descriptions-item>
          <el-descriptions-item label="服务周期">{{ servicePeriodLabel(detail.bookkeepingDetails.servicePeriod) }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.bookkeepingDetails.currentPeriod || detail.bookkeepingDetails.periodsCompleted" label="账期进度">
            当前第 {{ detail.bookkeepingDetails.currentPeriod || '-' }} 期 · 已完成 {{ detail.bookkeepingDetails.periodsCompleted || 0 }} 期
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- 客户上传资质证件（materials，2026-09-06：V2 详情补回，对齐 V1 管理端可见性） -->
      <el-card v-if="detail.materials && detail.materials.length > 0" shadow="hover" style="margin-bottom: 16px">
        <template #header><span>⑤ 上传资质证件（{{ detail.materials.length }}）</span></template>
        <div class="material-grid">
          <div v-for="mt in sortedMaterials" :key="mt.id" class="material-item">
            <el-image
              :src="mt.url"
              :preview-src-list="[mt.url]"
              preview-teleported
              fit="cover"
              class="material-img"
            />
            <div class="material-meta">
              <el-tag size="small" type="info">{{ mt.typeLabel }}</el-tag>
              <a :href="mt.url" :download="materialFileName(mt)" class="material-download">下载</a>
            </div>
          </div>
        </div>
      </el-card>

      <!-- 供应链：派单链/履约时间线 -->
      <el-card shadow="hover" style="margin-bottom: 16px">
        <template #header>
          <span>⑥ 供应链履约</span>
          <el-button
            v-if="detail.order.orderStatus === 'paid' && detail.order.paymentStatus === 'paid' && detail.order.fulfillmentStatus === 'pending_assignment'"
            type="primary" size="small" style="margin-left: 8px"
            @click="assignDialogVisible = true"
          >
            派单
          </el-button>
          <el-button
            v-if="detail.order.fulfillmentStatus === 'assigned'"
            type="warning" size="small" style="margin-left: 8px"
            @click="reassignDialogVisible = true"
          >
            改派
          </el-button>
        </template>

        <el-empty v-if="!detail.fulfillments || detail.fulfillments.length === 0" description="暂无履约记录" />
        <el-timeline v-else>
          <el-timeline-item
            v-for="f in detail.fulfillments"
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
              <!-- 回执照片：供应商端上传的制作/备案/质检照片 -->
              <template v-if="f.productionPhotos?.length || f.filingPhotos?.length || f.qualityCheckPhotos?.length">
                <div style="margin-top: 8px">
                  <div
                    v-for="g in receiptPhotoGroups(f)"
                    :key="g.label"
                    style="display:inline-flex; flex-direction:column; align-items:flex-start; margin-right:16px; margin-bottom:4px"
                  >
                    <div>
                      <el-image
                        v-for="(p, pi) in g.list"
                        :key="pi"
                        :src="p"
                        :preview-src-list="g.list"
                        :initial-index="pi"
                        style="width:56px; height:56px; border-radius:4px; margin:0 6px 6px 0; cursor:zoom-in; vertical-align:top"
                        fit="cover"
                      />
                    </div>
                    <span style="color:#999; font-size:12px; line-height:1">{{ g.label }}（{{ g.list.length }}）</span>
                  </div>
                </div>
              </template>
              <div v-else-if="f.status === 'completed'" style="margin-top:4px; color:#bbb; font-size:12px">（无回执照片）</div>
            </div>
          </el-timeline-item>
        </el-timeline>
      </el-card>

      <!-- 事件时间线 -->
      <el-card shadow="hover" style="margin-bottom: 16px">
        <template #header><span>⑦ 订单事件</span></template>
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
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute } from 'vue-router'
import { v2GetOrderDetail, v2AssignOrder, v2ReassignOrder, v2GetSuppliers } from '@/api'
import { toArray } from '@/api/unwrap'
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
// 2026-09-06：记账纳税人类型/服务周期文案（与小程序/网点端统一口径）
const taxpayerTypeLabel = (t: string) =>
  ({ small: '小规模纳税人', general: '一般纳税人', individual: '个体户' } as any)[t] || t || '-'
const servicePeriodLabel = (s: string) =>
  ({ year: '全年', half: '半年', preorder: '9.9 预定' } as any)[s] || s || '-'
// 印章三类隔离：enterprise=企业刻章 / personal=个人印章 / electronic=电子印章
const sealRouteTypeLabel = (t: string) =>
  ({ enterprise: '企业刻章', personal: '个人印章', electronic: '电子印章' } as any)[t] || t || '-'
const statusTag = (s: string) => ({ pending_payment: 'warning', paid: 'success', completed: 'info', cancelled: 'danger', processing: 'primary' } as any)[s] || 'info'
const fulfillmentTag = (s: string) => fulfillmentStatusTag(s)
// 材料下载文件名：类型_订单号_ID.扩展名（取 URL 后缀，默认 jpg）
const materialFileName = (mt: any) => {
  const m = String(mt?.url || '').split('?')[0].match(/\.([a-zA-Z0-9]+)$/)
  const ext = m ? m[1] : 'jpg'
  return `${mt?.typeLabel || '证件'}_${detail.value?.order?.orderNo || ''}_${mt?.id || ''}.${ext}`
}
// 后端时间为「本地时间 + Z 后缀」格式（非真实 UTC），直接截取字符串避免 new Date 解析产生 +8h 偏移
const fmt = (d?: string) => (d ? d.slice(0, 16).replace('T', ' ') : '-')
// 状态轨进度：完成4 > 已派单3 > 已支付2 > 已下单1
const firstAssignedAt = computed(() =>
  detail.value?.fulfillments && detail.value.fulfillments.length > 0
    ? detail.value.fulfillments[0].assignedAt : null)
const trackActive = computed(() => {
  const o = detail.value?.order
  if (!o) return 0
  if (o.completedAt) return 4
  if (firstAssignedAt.value) return 3
  if (o.paidAt) return 2
  if (o.createdAt) return 1
  return 0
})

/** ⑤区证件排序：法人身份证正/反 → 执照正本 → 执照副本 → 法人白底照 → 手持身份证 → 补充材料（未知类型沉底，同序按上传时间） */
const MATERIAL_ORDER: Record<string, number> = {
  id_card_front: 1, id_card_back: 2,
  license: 3, license_original: 4, license_copy: 5,
  photo: 6, legal_photo: 6,
  handheld_id_photo: 7, handheld_id: 7,
  professional_cert: 8, signature: 8, newspaper_proof: 8,
  additional: 99,
}
const sortedMaterials = computed(() => {
  const list = detail.value?.materials || []
  return [...list].sort((a: any, b: any) => {
    const oa = MATERIAL_ORDER[a?.type] ?? 50
    const ob = MATERIAL_ORDER[b?.type] ?? 50
    if (oa !== ob) return oa - ob
    return String(a?.createdAt || '').localeCompare(String(b?.createdAt || ''))
  })
})
/** 履约回执照片分组（仅返回非空组） */
function receiptPhotoGroups(f: any) {
  const groups = [
    { label: '制作/成品', list: f?.productionPhotos || [] },
    { label: '备案', list: f?.filingPhotos || [] },
    { label: '质检', list: f?.qualityCheckPhotos || [] },
  ]
  return groups.filter(g => g.list.length > 0)
}

async function load() {
  loading.value = true
  try {
    detail.value = await v2GetOrderDetail(orderNo.value) as any
    // 详情已拿到 module 后按品类重拉供应商，避免首屏 module=undefined 的全量/错类
    if (detail.value?.order?.module) {
      await loadSuppliers()
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

async function loadSuppliers() {
  try {
    // 按订单业务类型过滤：仅返回能承接该业务的供应商（刻章/登报/记账不混交）
    const module = detail.value?.order?.module
    const res: any = await v2GetSuppliers({ pageSize: 100, module: module || undefined })
    // 仅启用供应商可派单/改派（停用的选了也会被后端拒绝，直接不展示）
    suppliers.value = toArray(res).filter((s: any) => s.status === 1)
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
/* 上传资质证件网格（2026-09-06） */
.material-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
.material-item {
  width: 148px;
}
.material-img {
  width: 148px;
  height: 148px;
  border-radius: 6px;
  border: 1px solid var(--el-border-color-lighter);
  cursor: zoom-in;
  display: block;
}
.material-meta {
  display: flex;
  gap: 4px;
  align-items: center;
  margin-top: 4px;
}
.material-download {
  margin-left: auto;
  font-size: 12px;
  color: var(--el-color-primary);
  margin-top: 6px;
}
</style>
