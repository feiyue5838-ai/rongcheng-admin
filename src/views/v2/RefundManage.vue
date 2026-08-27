<template>
  <div>
    <div class="page-header">
      <h2>退款管理</h2>
      <div>
        <el-radio-group v-model="statusFilter" size="small" @change="() => { page = 1; load() }">
          <el-radio-button label="">全部</el-radio-button>
          <el-radio-button label="applying">待审核</el-radio-button>
          <el-radio-button label="processing">退款中</el-radio-button>
          <el-radio-button label="completed">已完成</el-radio-button>
          <el-radio-button label="rejected">已驳回</el-radio-button>
        </el-radio-group>
        <el-button style="margin-left: 12px" @click="load">刷新</el-button>
      </div>
    </div>

    <el-card shadow="never">
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="refundNo" label="退款单号" width="190" show-overflow-tooltip />
        <el-table-column prop="orderNo" label="订单号" width="190" show-overflow-tooltip />
        <el-table-column prop="module" label="业务" width="90" align="center">
          <template #default="{ row }">{{ moduleMap[row.module] || row.module || '—' }}</template>
        </el-table-column>
        <el-table-column prop="refundType" label="类型" width="80" align="center">
          <template #default="{ row }">{{ row.refundType === 'partial' ? '部分' : '全额' }}</template>
        </el-table-column>
        <el-table-column prop="amount" label="退款金额" width="110" align="right">
          <template #default="{ row }">¥{{ row.amount }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="statusTag(row.status)">{{ statusMap[row.status] || row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="reason" label="申请原因" min-width="160" show-overflow-tooltip />
        <el-table-column prop="appliedAt" label="申请时间" width="165">
          <template #default="{ row }">{{ fmt(row.appliedAt || row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 'applying'" link type="success" size="small" @click="approve(row)">通过</el-button>
            <el-button v-if="row.status === 'applying'" link type="danger" size="small" @click="openReject(row)">驳回</el-button>
            <el-button link size="small" @click="viewOrder(row)">订单</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        style="margin-top: 16px; justify-content: flex-end"
        @change="load"
      />
    </el-card>

    <!-- 驳回弹窗 -->
    <el-dialog v-model="rejectDialogVisible" title="驳回退款申请" width="440px">
      <el-form label-width="80px">
        <el-form-item label="退款单">
          <span>{{ current?.refundNo }}</span>
        </el-form-item>
        <el-form-item label="驳回原因" required>
          <el-input v-model="rejectRemark" type="textarea" :rows="3" placeholder="填写驳回原因（将展示给用户）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rejectDialogVisible = false">取消</el-button>
        <el-button type="danger" :loading="submitting" @click="doReject">确认驳回</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { v2GetRefunds, v2ApproveRefund, v2RejectRefund } from '@/api'

const list = ref<any[]>([])
const loading = ref(false)
const submitting = ref(false)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const statusFilter = ref('')

const current = ref<any>(null)
const rejectDialogVisible = ref(false)
const rejectRemark = ref('')

const statusMap: Record<string, string> = {
  applying: '待审核',
  processing: '退款中',
  completed: '已完成',
  rejected: '已驳回',
  failed: '退款失败',
}
const moduleMap: Record<string, string> = {
  seal: '刻章',
  newspaper: '登报',
  bookkeeping: '记账',
}

const statusTag = (s: string) => {
  const map: Record<string, string> = {
    applying: 'warning',
    processing: 'primary',
    completed: 'success',
    rejected: 'info',
    failed: 'danger',
  }
  return map[s] || 'info'
}

// 后端时间为「本地时间 + Z 后缀」格式（非真实 UTC），直接截取字符串避免 new Date 解析产生 +8h 偏移
const fmt = (v?: string) => (v ? v.slice(0, 16).replace('T', ' ') : '—')

async function load() {
  loading.value = true
  try {
    const res: any = await v2GetRefunds({
      status: statusFilter.value || undefined,
      page: page.value,
      pageSize: pageSize.value,
    })
    list.value = res?.list || []
    total.value = res?.total || 0
  } catch (e: any) {
    ElMessage.error(e?.message || '加载退款单失败')
  } finally {
    loading.value = false
  }
}

async function approve(row: any) {
  try {
    await ElMessageBox.confirm(`确认通过退款单 ${row.refundNo}？通过后将进入退款处理流程。`, '审核通过', {
      type: 'warning',
      confirmButtonText: '通过',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  submitting.value = true
  try {
    await v2ApproveRefund(row.id, { remark: '管理端审核通过' })
    ElMessage.success('已通过，等待微信退款回调')
    load()
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

function openReject(row: any) {
  current.value = row
  rejectRemark.value = ''
  rejectDialogVisible.value = true
}

async function doReject() {
  if (!rejectRemark.value.trim()) {
    ElMessage.warning('请填写驳回原因')
    return
  }
  submitting.value = true
  try {
    await v2RejectRefund(current.value.id, { remark: rejectRemark.value })
    ElMessage.success('已驳回')
    rejectDialogVisible.value = false
    load()
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

function viewOrder(row: any) {
  if (row.orderNo) {
    window.open(`/v2/orders/detail?orderNo=${encodeURIComponent(row.orderNo)}`, '_blank')
  }
}

onMounted(load)
</script>
