<template>
  <div>
    <div class="page-header">
      <h2>开票管理</h2>
      <div>
        <el-radio-group v-model="statusFilter" size="small" @change="() => { page = 1; load() }">
          <el-radio-button label="">全部</el-radio-button>
          <el-radio-button label="pending">待处理</el-radio-button>
          <el-radio-button label="issued">已开票</el-radio-button>
          <el-radio-button label="rejected">已驳回</el-radio-button>
        </el-radio-group>
        <el-input
          v-model="keyword"
          placeholder="订单号 / 抬头"
          clearable
          size="small"
          style="width: 220px; margin-left: 12px"
          @change="() => { page = 1; load() }"
          @clear="() => { page = 1; load() }"
        />
        <el-button style="margin-left: 12px" @click="load">刷新</el-button>
      </div>
    </div>

    <el-card shadow="never">
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="applicationNo" label="申请单号" width="200" show-overflow-tooltip />
        <el-table-column prop="orderNo" label="订单号" width="180" show-overflow-tooltip />
        <el-table-column prop="module" label="业务" width="80" align="center">
          <template #default="{ row }">{{ moduleMap[row.module] || row.module || '—' }}</template>
        </el-table-column>
        <el-table-column prop="type" label="类型" width="80" align="center">
          <template #default="{ row }">{{ row.type === 2 ? '专票' : '普票' }}</template>
        </el-table-column>
        <el-table-column prop="title" label="抬头" min-width="160" show-overflow-tooltip />
        <el-table-column prop="taxNo" label="税号" width="160" show-overflow-tooltip />
        <el-table-column prop="amount" label="金额" width="100" align="right">
          <template #default="{ row }">¥{{ row.amount ?? '0.00' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="statusTag(row.status)">{{ statusMap[row.status] || row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="appliedAt" label="申请时间" width="160">
          <template #default="{ row }">{{ fmt(row.appliedAt || row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="210" fixed="right">
          <template #default="{ row }">
            <el-button link size="small" @click="viewDetail(row)">详情</el-button>
            <el-button v-if="row.status === 'pending'" link type="success" size="small" @click="issue(row)">开票</el-button>
            <el-button v-if="row.status === 'pending'" link type="danger" size="small" @click="openReject(row)">驳回</el-button>
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

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="开票申请详情" width="560px">
      <el-descriptions :column="2" border size="small" v-if="current">
        <el-descriptions-item label="申请单号" :span="2">{{ current.applicationNo }}</el-descriptions-item>
        <el-descriptions-item label="订单号" :span="2">{{ current.orderNo }}</el-descriptions-item>
        <el-descriptions-item label="业务">{{ moduleMap[current.module] || current.module }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ current.type === 2 ? '专票' : '普票' }}</el-descriptions-item>
        <el-descriptions-item label="抬头" :span="2">{{ current.title }}</el-descriptions-item>
        <el-descriptions-item label="抬头类型">{{ current.titleType === 'company' ? '企业' : '个人' }}</el-descriptions-item>
        <el-descriptions-item label="税号">{{ current.taxNo || '—' }}</el-descriptions-item>
        <el-descriptions-item label="金额">¥{{ current.amount ?? '0.00' }}</el-descriptions-item>
        <el-descriptions-item label="接收邮箱" :span="2">{{ current.email || '—' }}</el-descriptions-item>
        <template v-if="current.type === 2">
          <el-descriptions-item label="注册地址" :span="2">{{ current.address || '—' }}</el-descriptions-item>
          <el-descriptions-item label="注册电话">{{ current.phone || '—' }}</el-descriptions-item>
          <el-descriptions-item label="开户行">{{ current.bank || '—' }}</el-descriptions-item>
          <el-descriptions-item label="银行账号" :span="2">{{ current.bankAccount || '—' }}</el-descriptions-item>
        </template>
        <el-descriptions-item label="申请时间">{{ fmt(current.appliedAt) }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag size="small" :type="statusTag(current.status)">{{ statusMap[current.status] }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="审核备注" :span="2">{{ current.reviewRemark || '—' }}</el-descriptions-item>
        <el-descriptions-item label="审核时间">{{ fmt(current.reviewedAt || current.issuedAt) }}</el-descriptions-item>
        <el-descriptions-item label="开票时间">{{ fmt(current.issuedAt) }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>

    <!-- 驳回弹窗 -->
    <el-dialog v-model="rejectDialogVisible" title="驳回开票申请" width="440px">
      <el-form label-width="80px">
        <el-form-item label="申请单">
          <span>{{ current?.applicationNo }}</span>
        </el-form-item>
        <el-form-item label="抬头">
          <span>{{ current?.title }}</span>
        </el-form-item>
        <el-form-item label="驳回原因" required>
          <el-input v-model="rejectRemark" type="textarea" :rows="3" placeholder="填写驳回原因（将展示给用户，用户可重新申请）" />
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
import { v2GetInvoiceApplications, v2IssueInvoice, v2RejectInvoice } from '@/api'

const list = ref<any[]>([])
const loading = ref(false)
const submitting = ref(false)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const statusFilter = ref('')
const keyword = ref('')

const current = ref<any>(null)
const detailVisible = ref(false)
const rejectDialogVisible = ref(false)
const rejectRemark = ref('')

const statusMap: Record<string, string> = {
  pending: '待处理',
  issued: '已开票',
  rejected: '已驳回',
}
const moduleMap: Record<string, string> = {
  seal: '刻章',
  newspaper: '登报',
  bookkeeping: '记账',
}

const statusTag = (s: string) => {
  const map: Record<string, string> = {
    pending: 'warning',
    issued: 'success',
    rejected: 'info',
  }
  return map[s] || 'info'
}

// 后端时间为「本地时间 + Z 后缀」格式（非真实 UTC），直接截取字符串避免 new Date 解析产生 +8h 偏移
const fmt = (v?: string) => (v ? v.slice(0, 16).replace('T', ' ') : '—')

async function load() {
  loading.value = true
  try {
    const res: any = await v2GetInvoiceApplications({
      status: statusFilter.value || undefined,
      keyword: keyword.value || undefined,
      page: page.value,
      pageSize: pageSize.value,
    })
    list.value = res?.list || []
    total.value = res?.total || 0
  } catch (e: any) {
    ElMessage.error(e?.message || '加载开票申请失败')
  } finally {
    loading.value = false
  }
}

function viewDetail(row: any) {
  current.value = row
  detailVisible.value = true
}

async function issue(row: any) {
  try {
    await ElMessageBox.confirm(
      `确认为订单 ${row.orderNo} 开具发票（抬头：${row.title}）？确认后状态变为已开票。`,
      '开票确认',
      { type: 'warning', confirmButtonText: '确认开票', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  submitting.value = true
  try {
    await v2IssueInvoice(row.id, { remark: '管理端已开票' })
    ElMessage.success('已开票')
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
    await v2RejectInvoice(current.value.id, { remark: rejectRemark.value })
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
