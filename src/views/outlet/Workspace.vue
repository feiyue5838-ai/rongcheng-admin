<template>
  <div class="Outlet-workspace">
    <!-- 欢迎条 -->
    <div class="welcome-bar">
      <div>
        <h2>您好，{{ outletStore.outletInfo?.contact || '网点' }}</h2>
        <p class="subtitle">{{ greetingText }}</p>
      </div>
      <div class="welcome-actions">
        <!-- 通知铃铛 -->
        <el-badge :value="unreadCount" :hidden="unreadCount === 0" :max="99" class="notify-bell">
          <el-button :icon="Bell" circle @click="openNotifyDrawer" />
        </el-badge>
        <el-button :icon="Refresh" @click="loadData" :loading="loading">刷新数据</el-button>
      </div>
    </div>

    <!-- 通知抽屉 -->
    <el-drawer v-model="notifyDrawer" title="消息通知" size="380px" @open="onDrawerOpen">
      <template #header>
        <div class="drawer-header">
          <span>消息通知</span>
          <el-button v-if="unreadCount > 0" link type="primary" size="small" @click="onMarkAllRead">全部已读</el-button>
        </div>
      </template>
      <div v-loading="notifyLoading" class="notify-list">
        <el-empty v-if="notifyList.length === 0" description="暂无通知" />
        <div
          v-for="item in notifyList"
          :key="item.id"
          class="notify-item"
          :class="{ unread: !item.isRead }"
          @click="onNotifyClick(item)"
        >
          <div class="notify-item-head">
            <span class="notify-title">{{ item.title }}</span>
            <span v-if="!item.isRead" class="unread-dot" />
          </div>
          <div class="notify-content">{{ item.content }}</div>
          <div class="notify-time">{{ formatDate(item.createdAt) }}</div>
        </div>
      </div>
    </el-drawer>

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
      <div class="stat-card stat-shipped">
        <div class="stat-icon"><el-icon><Van /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.shipped }}</div>
          <div class="stat-label">已发货</div>
        </div>
      </div>
      <div class="stat-card stat-completed">
        <div class="stat-icon"><el-icon><CircleCheck /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.completed }}</div>
          <div class="stat-label">已完成</div>
        </div>
      </div>
    </div>

    <!-- 状态切换 Tabs -->
    <div class="panel">
      <el-tabs v-model="activeTab" @tab-change="loadOrders">
        <el-tab-pane name="pending">
          <template #label>
            <span><el-icon><Clock /></el-icon> 待接单 ({{ stats.pending }})</span>
          </template>
        </el-tab-pane>
        <el-tab-pane name="processing">
          <template #label>
            <span><el-icon><Tools /></el-icon> 制作中 ({{ stats.processing }})</span>
          </template>
        </el-tab-pane>
        <el-tab-pane name="shipped">
          <template #label>
            <span><el-icon><Van /></el-icon> 已发货 ({{ stats.shipped }})</span>
          </template>
        </el-tab-pane>
        <el-tab-pane name="completed">
          <template #label>
            <span><el-icon><CircleCheck /></el-icon> 已完成 ({{ stats.completed }})</span>
          </template>
        </el-tab-pane>
      </el-tabs>

      <el-table :data="orderList" v-loading="loading" stripe empty-text="暂无订单">
        <el-table-column prop="orderNo" label="订单号" width="170" />
        <el-table-column label="印章类型" width="110">
          <template #default="{ row }">
            <el-tag size="small" type="info">{{ row.type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="companyName" label="客户名称" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ row.companyName || '(个人)' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusTag(row.status)" size="small">{{ row.statusText }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="分配时间" width="160">
          <template #default="{ row }">{{ formatDate(row.assignedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="240" align="center" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 1" type="success" size="small" @click="onAccept(row)">
              <el-icon><Check /></el-icon>接单
            </el-button>
            <el-button v-if="row.status === 2" type="primary" size="small" @click="onComplete(row)">
              <el-icon><Box /></el-icon>完成制作
            </el-button>
            <el-button v-if="row.status === 3 || row.status === 4" type="info" size="small" plain @click="onView(row)">
              <el-icon><View /></el-icon>查看
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 接单确认 -->
    <el-dialog v-model="acceptDialog" title="确认接单" width="420px">
      <p>确定接受订单 <strong>{{ currentOrder?.orderNo }}</strong> 吗？</p>
      <p style="color:#666;margin-top:8px">接单后请尽快开始制作，完成后点击「完成制作」提交。</p>
      <template #footer>
        <el-button @click="acceptDialog = false">取消</el-button>
        <el-button type="success" :loading="actionLoading" @click="onConfirmAccept">确认接单</el-button>
      </template>
    </el-dialog>

    <!-- 完成制作 -->
    <el-dialog v-model="completeDialog" title="提交交付" width="500px">
      <el-form ref="completeFormRef" :model="completeForm" :rules="completeRules" label-width="100px">
        <el-form-item label="快递公司" prop="expressCompany">
          <el-input v-model="completeForm.expressCompany" placeholder="如：顺丰速运" />
        </el-form-item>
        <el-form-item label="快递单号" prop="expressNo">
          <el-input v-model="completeForm.expressNo" placeholder="请输入快递单号" />
        </el-form-item>
        <el-form-item label="印章照片" required>
          <el-upload
            v-model:file-list="sealFiles"
            list-type="picture-card"
            :auto-upload="true"
            :http-request="uploadSeal"
            :limit="6"
            multiple
          >
            <el-icon><Plus /></el-icon>
          </el-upload>
          <div style="font-size:12px;color:#999;margin-top:4px">上传制作完成的印章照片，最多 6 张</div>
        </el-form-item>
        <el-form-item label="交付凭证">
          <el-upload
            v-model:file-list="receiptFiles"
            list-type="picture-card"
            :auto-upload="true"
            :http-request="uploadReceipt"
            :limit="6"
            multiple
          >
            <el-icon><Plus /></el-icon>
          </el-upload>
          <div style="font-size:12px;color:#999;margin-top:4px">盖章文件/备案证明等，最多 6 张</div>
        </el-form-item>
        <el-form-item label="交付备注">
          <el-input v-model="completeForm.remark" type="textarea" :rows="2" placeholder="选填" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="completeDialog = false">取消</el-button>
        <el-button type="primary" :loading="actionLoading" @click="onConfirmComplete">提交交付</el-button>
      </template>
    </el-dialog>

    <!-- 订单详情 -->
    <el-dialog v-model="detailDialog" :title="`订单详情 - ${detailOrder?.orderNo || ''}`" width="600px">
      <div v-if="detailLoading" style="text-align:center;padding:40px">
        <el-icon class="is-loading" style="font-size:24px"><Loading /></el-icon>
      </div>
      <div v-else-if="detailOrder" class="order-detail">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="订单号">{{ detailOrder.orderNo }}</el-descriptions-item>
          <el-descriptions-item label="印章类型">{{ detailOrder.type }}</el-descriptions-item>
          <el-descriptions-item label="客户名称">{{ detailOrder.companyName || '(个人)' }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ detailOrder.user?.phone || '-' }}</el-descriptions-item>
          <el-descriptions-item label="订单状态">
            <el-tag :type="getStatusTag(detailOrder.status)" size="small">{{ detailOrder.statusText }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="分配时间">{{ formatDate(detailOrder.assignedAt) }}</el-descriptions-item>
          <el-descriptions-item label="接单时间" :span="2">{{ formatDate(detailOrder.acceptedAt) || '-' }}</el-descriptions-item>
          <el-descriptions-item label="发货时间" :span="2">{{ formatDate(detailOrder.completedAt) || '-' }}</el-descriptions-item>
        </el-descriptions>

        <!-- 客户上传材料 -->
        <div v-if="detailOrder.materials?.length > 0" class="materials-info">
          <div class="section-title"><el-icon><Picture /></el-icon> 客户上传材料</div>
          <el-table :data="detailOrder.materials" size="small" border>
            <el-table-column prop="type" label="类型" width="140">
              <template #default="{ row }">
                {{ typeLabel[row.type] || row.type }}
              </template>
            </el-table-column>
            <el-table-column label="缩略图" width="80" align="center">
              <template #default="{ row }">
                <el-image
                  v-if="isImageUrl(row.url)"
                  :src="getMaterialThumb(row.url)"
                  :preview-src-list="[getMaterialUrl(row.url)]"
                  fit="cover"
                  style="width:48px;height:48px;border-radius:4px;cursor:pointer"
                  preview-teleported
                />
                <span v-else style="font-size:12px;color:#999">-</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" align="center" width="80">
              <template #default="{ row }">
                <el-button type="primary" size="small" link @click="previewMaterial(row.url)">
                  <el-icon><View /></el-icon> 查看
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 快递信息 -->
        <div v-if="detailOrder.expressCompany || detailOrder.expressNo" class="express-info">
          <div class="section-title"><el-icon><Van /></el-icon> 快递信息</div>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="快递公司">{{ detailOrder.expressCompany || '-' }}</el-descriptions-item>
            <el-descriptions-item label="快递单号">{{ detailOrder.expressNo || '-' }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- 印章照片（刻章订单才显示）-->
        <div v-if="detailOrder.type !== '登报声明' && sealImageList.length > 0" class="receipt-info">
          <div class="section-title"><el-icon><Picture /></el-icon> 印章照片</div>
          <div class="receipt-images">
            <el-image
              v-for="r in sealImageList"
              :key="r.id"
              :src="r.url"
              :preview-src-list="sealImageList.map(x=>x.url)"
              fit="cover"
              style="width:80px;height:80px;border-radius:6px;margin-right:8px"
              @error="onImageError(r)"
            >
              <template #error>
                <div class="image-error">
                  <el-icon><Picture /></el-icon>
                  <span>加载失败</span>
                </div>
              </template>
            </el-image>
          </div>
        </div>

        <!-- 报纸样张（登报订单专属）-->
        <div v-if="detailOrder.type === '登报声明' && sealImageList.length > 0" class="receipt-info">
          <div class="section-title"><el-icon><Document /></el-icon> 报纸样张</div>
          <div class="receipt-images">
            <el-image
              v-for="r in sealImageList"
              :key="r.id"
              :src="r.url"
              :preview-src-list="sealImageList.map(x=>x.url)"
              fit="cover"
              style="width:80px;height:80px;border-radius:6px;margin-right:8px"
              @error="onImageError(r)"
            >
              <template #error>
                <div class="image-error">
                  <el-icon><Picture /></el-icon>
                  <span>加载失败</span>
                </div>
              </template>
            </el-image>
          </div>
        </div>

        <!-- 交付凭证 -->
        <div v-if="receiptList.length > 0" class="receipt-info">
          <div class="section-title"><el-icon><Postcard /></el-icon> 交付凭证</div>
          <div class="receipt-images">
            <el-image
              v-for="r in receiptList"
              :key="r.id"
              :src="r.url"
              :preview-src-list="receiptList.map(x=>x.url)"
              fit="cover"
              style="width:80px;height:80px;border-radius:6px;margin-right:8px"
              @error="onImageError(r)"
            >
              <template #error>
                <div class="image-error">
                  <el-icon><Picture /></el-icon>
                  <span>加载失败</span>
                </div>
              </template>
            </el-image>
          </div>
        </div>

        <!-- 订单明细（根据 item_type 动态切换标题）-->
        <div v-if="detailOrder.orderItems?.length > 0" class="items-info">
          <div class="section-title">
            <el-icon><Postcard /></el-icon>
            {{ detailOrder.type === '登报声明' ? '登报明细' : (detailOrder.type === '代理记账' ? '服务明细' : '印章明细') }}
          </div>
          <el-table :data="detailOrder.orderItems" size="small" border>
            <el-table-column prop="name" label="名称" />
            <el-table-column prop="price" label="价格" align="right">
              <template #default="{ row }">¥{{ row.price }}</template>
            </el-table-column>
            <el-table-column prop="quantity" label="数量" align="center" />
          </el-table>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useOutletStore } from '@/stores/outlet'
import {
  getMyOutletOrdersAPI,
  acceptOrderAPI,
  completeOrderAPI,
  uploadImage,
  getOrderDetailAPI,
  getDeliveryReceiptsAPI,
  getMyNotificationsAPI,
  markAllReadAPI,
  markReadAPI,
} from '@/api/outlet'
import { formatDate } from '@/utils/format'
import {
  Refresh, Clock, Tools, CircleCheck, DataLine,
  Check, Box, View, Plus, Shop, Van, Picture, Postcard, Loading, Bell, Document,
} from '@element-plus/icons-vue'

const outletStore = useOutletStore()
const loading = ref(false)
const actionLoading = ref(false)
const orderList = ref([])
const stats = ref({ pending: 0, processing: 0, shipped: 0, completed: 0 })
const activeTab = ref('pending')

const acceptDialog = ref(false)
const completeDialog = ref(false)
const detailDialog = ref(false)
const currentOrder = ref(null)
const detailOrder = ref(null)
const detailLoading = ref(false)
const receiptList = ref([])
const sealImageList = ref([])
const materialsList = ref([])

// 材料类型中文映射
const typeLabel = {
  license: '营业执照',
  id_card_front: '身份证正面',
  id_card_back: '身份证背面',
  id_card: '身份证',
  legal_person_id: '法人身份证',
  proxy_id: '代理人身份证',
  other: '其他材料',
}

// 预览材料图片（新窗口打开）
const previewMaterial = (url) => {
  window.open(window.location.origin + url, '_blank')
}

// 材料完整地址
const getMaterialUrl = (url) => window.location.origin + url

// 判断是否为图片
const isImageUrl = (url) => /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(url)

// 缩略图地址（同域名访问）
const getMaterialThumb = (url) => getMaterialUrl(url)

// 图片加载失败处理（置标记，避免重复显示）
const failedImages = ref(new Set())
function onImageError(img) {
  failedImages.value.add(img.id)
}
const completeFormRef = ref(null)
const completeForm = reactive({ expressCompany: '', expressNo: '', remark: '' })
const receiptFiles = ref([])
const sealFiles = ref([])

// ==================== 通知相关 ====================
const notifyDrawer = ref(false)
const notifyList = ref([])
const unreadCount = ref(0)
const notifyLoading = ref(false)
let pollTimer = null
let lastUnread = 0

const completeRules = {
  expressCompany: [{ required: true, message: '请输入快递公司', trigger: 'blur' }],
  expressNo: [{ required: true, message: '请输入快递单号', trigger: 'blur' }],
}

const greetingText = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return '夜深了，注意休息～'
  if (h < 12) return '早上好，新的一天开始啦'
  if (h < 18) return '下午好，继续加油'
  return '晚上好，辛苦了'
})

function getStatusTag(s) {
  return { 1: 'warning', 2: '', 3: 'primary', 4: 'success' }[s] || 'info'
}

// 按网点授权的业务类型过滤订单（orderItems.itemType 匹配 businessTypes.code）
function getAuthorizedOrders(allOrders) {
  const codes = outletStore.outletInfo?.businessTypes?.map(b => b.code) ?? []
  if (!codes.length) return []
  return allOrders.filter(o => {
    if (!o.orderItems || o.orderItems.length === 0) return true
    return o.orderItems.some(item => codes.includes(item.itemType))
  })
}

async function loadData() {
  loading.value = true
  try {
    const res = await getMyOutletOrdersAPI({ page: 1, pageSize: 100 })
    const all = res?.data?.list ?? []
    outletStore.allOrders = all
    const authorized = getAuthorizedOrders(all)
    stats.value = {
      pending: authorized.filter(o => o.status === 1).length,
      processing: authorized.filter(o => o.status === 2).length,
      shipped: authorized.filter(o => o.status === 3).length,
      completed: authorized.filter(o => o.status === 4).length,
    }
    loadOrders()
  } catch (err) {
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

function loadOrders() {
  const statusMap = { pending: 1, processing: 2, shipped: 3, completed: 4 }
  const authorized = getAuthorizedOrders(outletStore.allOrders)
  orderList.value = authorized.filter(o => o.status === statusMap[activeTab.value])
}

function onAccept(order) {
  currentOrder.value = order
  acceptDialog.value = true
}

async function onConfirmAccept() {
  actionLoading.value = true
  try {
    await acceptOrderAPI(currentOrder.value.orderId)
    ElMessage.success('接单成功')
    acceptDialog.value = false
    loadData()
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '接单失败')
  } finally {
    actionLoading.value = false
  }
}

function onComplete(order) {
  currentOrder.value = order
  Object.assign(completeForm, { expressCompany: '', expressNo: '', remark: '' })
  receiptFiles.value = []
  sealFiles.value = []
  completeDialog.value = true
}

async function uploadReceipt(option) {
  try {
    const res = await uploadImage(option.file)
    option.onSuccess(res, option.file)
  } catch (err) {
    option.onError(err)
  }
}
async function uploadSeal(option) {
  try {
    const res = await uploadImage(option.file)
    option.onSuccess(res, option.file)
  } catch (err) {
    option.onError(err)
  }
}

async function onConfirmComplete() {
  const valid = await completeFormRef.value.validate().catch(() => false)
  if (!valid) return
  actionLoading.value = true
  try {
    const sealImages = sealFiles.value
      .filter(f => f.response?.url)
      .map(f => ({ url: f.response.url, type: 'seal' }))
    const receipts = receiptFiles.value
      .filter(f => f.response?.url)
      .map(f => ({ url: f.response.url, type: 'certificate' }))

    await completeOrderAPI(currentOrder.value.orderId, {
      expressCompany: completeForm.expressCompany,
      expressNo: completeForm.expressNo,
      remark: completeForm.remark,
      receipts,
      sealImages,
    })
    ElMessage.success('交付成功')
    completeDialog.value = false
    loadData()
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '交付失败')
  } finally {
    actionLoading.value = false
  }
}

async function onView(order) {
  detailOrder.value = null
  receiptList.value = []
    sealImageList.value = []
  detailDialog.value = true
  detailLoading.value = true

  try {
    // 并行获取订单详情和交付凭证
    const [orderRes, receiptRes] = await Promise.all([
      getOrderDetailAPI(order.orderId).catch(() => null),
      getDeliveryReceiptsAPI({ orderId: order.orderId }).catch(() => null),
    ])

    // 合并数据
    detailOrder.value = {
      ...order,
      expressCompany: orderRes?.expressCompany,
      expressNo: orderRes?.expressNo,
      acceptedAt: orderRes?.acceptedAt || order.acceptedAt,
      completedAt: orderRes?.completedAt || order.completedAt,
      orderItems: orderRes?.orderItems || order.orderItems || [],
      materials: orderRes?.materials || order.materials || [],
    }

    // 凭证优先用 orderRes，其次用 receiptRes
    const allReceipts = orderRes?.receipts?.length > 0
      ? orderRes.receipts
      : receiptRes?.list || []
    sealImageList.value = allReceipts.filter(r => r.type === 'seal')
    receiptList.value = allReceipts.filter(r => r.type !== 'seal')
  } catch (err) {
    ElMessage.error('加载详情失败')
  } finally {
    detailLoading.value = false
  }
}

function startPolling() {
  // 立即拉一次，然后每 20 秒轮询
  loadNotifications(false)
  pollTimer = setInterval(() => loadNotifications(false), 20000)
}

async function loadNotifications(showToast = true) {
  try {
    const res = await getMyNotificationsAPI()
    const list = res?.data?.list ?? []
    notifyList.value = list
    unreadCount.value = list.filter((n) => !n.isRead).length
    // 有新未读消息时弹出提示
    if (showToast && unreadCount.value > lastUnread && lastUnread > 0) {
      const latest = list.find((n) => !n.isRead)
      if (latest) {
        ElMessage({
          message: `新通知：${latest.title}`,
          type: 'warning',
          duration: 3000,
        })
      }
    }
    lastUnread = unreadCount.value
  } catch (err) {
    // 轮询失败静默处理
  }
}

function openNotifyDrawer() {
  notifyDrawer.value = true
}

async function onDrawerOpen() {
  notifyLoading.value = true
  await loadNotifications(false)
  notifyLoading.value = false
}

async function onMarkAllRead() {
  try {
    await markAllReadAPI()
    notifyList.value.forEach((n) => (n.isRead = true))
    unreadCount.value = 0
    lastUnread = 0
  } catch (err) {
    ElMessage.error('操作失败')
  }
}

async function onNotifyClick(item) {
  if (!item.isRead) {
    try {
      await markReadAPI(item.id)
      item.isRead = true
      unreadCount.value = Math.max(0, unreadCount.value - 1)
      lastUnread = unreadCount.value
    } catch (err) {
      // ignore
    }
  }
  // 点击订单类通知跳转到待接单
  if (item.orderId && activeTab.value !== 'pending') {
    activeTab.value = 'pending'
    loadOrders()
  }
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

onMounted(() => {
  loadData()
  startPolling()
})

onUnmounted(() => {
  stopPolling()
})
</script>

<style lang="scss" scoped>
.welcome-bar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 24px 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);

  h2 { margin: 0; font-size: 22px; font-weight: 600; color: #fff; }
  .subtitle { margin: 4px 0 0; color: rgba(255,255,255,0.75); font-size: 13px; }

  .welcome-actions {
    display: flex;
    align-items: center;
    gap: 12px;
    .el-button {
      background: rgba(255,255,255,0.18);
      border: 1px solid rgba(255,255,255,0.35);
      color: #fff;
      backdrop-filter: blur(6px);
      &:hover {
        background: rgba(255,255,255,0.28);
      }
    }
  }
  .notify-bell {
    :deep(.el-badge__content) { border: none; }
    :deep(.el-button) {
      background: rgba(255,255,255,0.18);
      border: 1px solid rgba(255,255,255,0.35);
      color: #fff;
      backdrop-filter: blur(6px);
    }
  }
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  font-weight: 600;
}

.notify-list {
  min-height: 200px;
}

.notify-item {
  padding: 14px 16px;
  border-radius: 10px;
  background: #fafafa;
  margin-bottom: 12px;
  cursor: pointer;
  transition: background 0.2s;
  border-left: 3px solid transparent;
  &:hover { background: #f0f7ff; }
  &.unread { background: #fff7e6; border-left-color: #fa8c16; }
  .notify-item-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    .notify-title { font-size: 14px; font-weight: 600; color: #333; }
    .unread-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #fa8c16;
    }
  }
  .notify-content { font-size: 13px; color: #666; margin: 6px 0; line-height: 1.5; }
  .notify-time { font-size: 12px; color: #bbb; }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px 24px;
  display: flex;
  align-items: center;
  gap: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
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
}

// 待接单 — 暖橙
.stat-pending {
  background: linear-gradient(135deg, #fff7e6 0%, #ffe8c2 100%);
  border: 1px solid rgba(250, 140, 22, 0.15);
  .stat-icon { background: rgba(250, 140, 22, 0.12); color: #e69138; }
  .stat-value { color: #c87619; }
}

// 制作中 — 清爽蓝
.stat-processing {
  background: linear-gradient(135deg, #e6f4ff 0%, #cce8ff 100%);
  border: 1px solid rgba(24, 144, 255, 0.15);
  .stat-icon { background: rgba(24, 144, 255, 0.12); color: #1890ff; }
  .stat-value { color: #096dd9; }
}

// 已发货 — 活力红
.stat-shipped {
  background: linear-gradient(135deg, #fff1f0 0%, #ffccc7 100%);
  border: 1px solid rgba(255, 77, 79, 0.15);
  .stat-icon { background: rgba(255, 77, 79, 0.12); color: #ff4d4f; }
  .stat-value { color: #cf1322; }
}

// 已完成 — 清新绿
.stat-completed {
  background: linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%);
  border: 1px solid rgba(82, 196, 26, 0.15);
  .stat-icon { background: rgba(82, 196, 26, 0.12); color: #52c41a; }
  .stat-value { color: #389e0d; }
}

.stat-value {
  font-size: 30px;
  font-weight: 800;
  line-height: 1;
  transition: color 0.2s;
}

.stat-label {
  font-size: 13px;
  color: #888;
  margin-top: 4px;
}

.panel {
  background: #fff;
  border-radius: 16px;
  padding: 20px 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.04);
}

.order-detail {
  .section-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    font-weight: 600;
    color: #333;
    margin: 16px 0 10px;
    &::before { content: ''; }
  }

  .express-info, .receipt-info, .items-info, .materials-info {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #f0f0f0;
  }

  .receipt-images {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .image-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 80px;
    height: 80px;
    background: #fafafa;
    border: 1px dashed #d9d9d9;
    border-radius: 6px;
    color: #999;
    font-size: 12px;
    gap: 4px;
    .el-icon { font-size: 20px; }
  }
}
</style>
