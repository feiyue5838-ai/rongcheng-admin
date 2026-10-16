<template>
  <div>
    <div class="page-header"><h2>工商注册</h2></div>
    <div class="page-card">
      <el-form inline :model="query" class="search-form">
        <el-form-item label="关键词">
          <el-input v-model="query.keyword" placeholder="手机号 / 注册地区" clearable style="width: 200px" @keyup.enter="search" />
        </el-form-item>
        <el-form-item label="办理类型">
          <el-select v-model="query.kind" clearable placeholder="全部" style="width: 130px" @change="search">
            <el-option label="企业注册" value="enterprise" />
            <el-option label="个体户" value="individual" />
            <el-option label="代理记账" value="bookkeeping" />
          </el-select>
        </el-form-item>
        <el-form-item label="跟进状态">
          <el-select v-model="query.status" clearable placeholder="全部" style="width: 130px" @change="search">
            <el-option v-for="(text, value) in STATUS_TEXT" :key="value" :label="text" :value="value" />
          </el-select>
        </el-form-item>
        <el-form-item label="跟进人">
          <el-select
            v-model="query.owner"
            clearable
            filterable
            allow-create
            default-first-option
            placeholder="全部（可输入姓名）"
            style="width: 150px"
            @change="search"
          >
            <el-option label="未分配" value="unassigned" />
            <el-option v-if="myName" :label="`我（${myName}）`" :value="myName" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="search">搜索</el-button>
          <el-button @click="reset">重置</el-button>
        </el-form-item>
      </el-form>

      <div v-if="canFollowUp" class="batch-bar">
        <el-button type="primary" plain :disabled="selected.length === 0" @click="openBatchFollowUp">
          批量跟进{{ selected.length ? `（已选 ${selected.length} 条）` : '' }}
        </el-button>
        <span class="batch-tip">勾选左侧多行后可批量改状态 / 分配跟进人</span>
      </div>

      <el-table v-loading="loading" :data="list" stripe @selection-change="handleSelectionChange">
        <el-table-column v-if="canFollowUp" type="selection" width="44" />
        <el-table-column prop="createdAt" label="提交时间" width="160">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="办理类型" width="100">
          <template #default="{ row }">{{ kindLabel(row.kind) }}</template>
        </el-table-column>
        <el-table-column label="企业类型 / 公司名称" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.kind === 'bookkeeping' ? row.companyName || '-' : row.enterpriseType || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="注册地区" min-width="170" show-overflow-tooltip>
          <template #default="{ row }">{{ [row.province, row.city, row.district].filter(Boolean).join(' ') }}</template>
        </el-table-column>
        <el-table-column prop="phone" label="联系电话" width="125" />
        <el-table-column label="跟进状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.status)" size="small">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="跟进人" width="110" align="center">
          <template #default="{ row }">{{ row.owner || '未分配' }}</template>
        </el-table-column>
        <el-table-column label="最近跟进" width="150">
          <template #default="{ row }">{{ row.followedAt ? formatDate(row.followedAt) : '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="130" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="showDetail(row.id)">查看</el-button>
            <el-button v-if="canFollowUp" type="primary" link @click="openFollowUp(row)">跟进</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="query.page"
        v-model:page-size="query.pageSize"
        :total="pagination.total"
        :page-sizes="[20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        style="margin-top: 20px; justify-content: flex-end"
        @current-change="fetchData"
        @size-change="onSizeChange"
      />
    </div>

    <!-- 跟进弹窗：单条 / 批量共用 -->
    <el-dialog
      v-model="followUpVisible"
      :title="followUpMode === 'batch' ? `批量跟进（${selected.length} 条）` : '跟进这条需求'"
      width="520px"
    >
      <el-form :model="followUpForm" label-width="86px">
        <el-form-item v-if="followUpMode === 'single' && followUpRow" label="需求编号">
          <span class="mono">{{ followUpRow.id }}</span>
        </el-form-item>
        <el-form-item v-if="followUpMode === 'single' && followUpRow" label="当前状态">
          <el-tag :type="statusTag(followUpRow.status)" size="small">{{ statusText(followUpRow.status) }}</el-tag>
        </el-form-item>
        <el-form-item label="跟进状态" required>
          <el-select v-model="followUpForm.status" placeholder="请选择" style="width: 100%">
            <el-option v-for="(text, value) in STATUS_TEXT" :key="value" :label="text" :value="value" />
          </el-select>
        </el-form-item>
        <el-form-item label="跟进人">
          <el-input v-model="followUpForm.owner" :placeholder="`留空则记到我自己（${myName || '当前账号'}）`" clearable />
        </el-form-item>
        <el-form-item label="跟进备注">
          <el-input
            v-model="followUpForm.remark"
            type="textarea"
            :rows="3"
            maxlength="500"
            show-word-limit
            placeholder="例如：已电话联系，客户想按小规模办，明天上午回电"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="followUpVisible = false">取消</el-button>
        <el-button type="primary" :loading="followUpSubmitting" @click="submitFollowUp">提交跟进</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailVisible" title="工商注册详情" width="720px">
      <div v-loading="detailLoading">
        <el-descriptions v-if="detail" :column="2" border>
          <el-descriptions-item label="需求编号" :span="2">{{ detail.id }}</el-descriptions-item>
          <el-descriptions-item label="办理类型">{{ kindLabel(detail.kind) }}</el-descriptions-item>
          <el-descriptions-item label="提交时间">{{ formatDate(detail.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="注册地区" :span="2">{{ [detail.province, detail.city, detail.district].filter(Boolean).join(' ') }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.kind === 'bookkeeping'" label="公司名称">{{ detail.companyName || '-' }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.kind === 'enterprise'" label="企业类型">{{ detail.enterpriseType || '-' }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.kind !== 'bookkeeping'" label="组织 / 组成形式">{{ detail.organizationForm || '-' }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.kind !== 'bookkeeping'" label="已有地址">{{ detail.hasAddress ? '有地址' : '无地址' }}</el-descriptions-item>
          <el-descriptions-item label="纳税类型意向">{{ taxLabel(detail.taxType) }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.kind === 'bookkeeping'" label="服务周期意向">{{ extraLabel('cycle', detail) }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.kind === 'bookkeeping'" label="开票需求">{{ extraLabel('invoice', detail) }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.kind === 'bookkeeping'" label="社保 / 公积金">{{ extraLabel('socialFund', detail) }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.kind === 'bookkeeping'" label="账务情况">{{ extraLabel('accountHistory', detail) }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ detail.phone }}</el-descriptions-item>
          <el-descriptions-item label="用户ID">{{ detail.userId || '-' }}</el-descriptions-item>
          <el-descriptions-item label="跟进状态">
            <el-tag :type="statusTag(detail.status)" size="small">{{ statusText(detail.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="跟进人">{{ detail.owner || '未分配' }}</el-descriptions-item>
          <el-descriptions-item label="最近跟进">{{ detail.followedAt ? formatDate(detail.followedAt) : '-' }}</el-descriptions-item>
          <el-descriptions-item label="最近跟进备注" :span="2">
            <span class="remark">{{ detail.followUpRemark || '无' }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="客户留言" :span="2"><span class="remark">{{ detail.remark || '无' }}</span></el-descriptions-item>
        </el-descriptions>

        <div class="timeline-block">
          <div class="timeline-title">跟进记录</div>
          <el-empty v-if="!followUps.length" description="还没有跟进记录" :image-size="60" />
          <el-timeline v-else>
            <el-timeline-item
              v-for="item in followUps"
              :key="item.id"
              :timestamp="formatDate(item.createdAt)"
              placement="top"
            >
              <div class="timeline-line">
                <span class="timeline-operator">{{ item.operator || '未知操作人' }}</span>
                <span class="timeline-arrow">
                  {{ item.fromStatus ? statusText(item.fromStatus) : '—' }} → {{ statusText(item.toStatus) }}
                </span>
                <span v-if="item.owner" class="timeline-owner">跟进人：{{ item.owner }}</span>
              </div>
              <div v-if="item.remark" class="timeline-remark">{{ item.remark }}</div>
            </el-timeline-item>
          </el-timeline>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'
import {
  batchFollowUpRegistrationRequests,
  followUpRegistrationRequest,
  getRegistrationRequestDetail,
  getRegistrationRequestFollowUps,
  getRegistrationRequests,
} from '@/api'
import { toArray, toPaged, unwrapV1 } from '@/api/unwrap'
import { useAuthStore } from '@/stores/auth'

type RegistrationRequest = {
  id: string
  userId: string
  kind: 'enterprise' | 'individual' | 'bookkeeping'
  enterpriseType: string | null
  organizationForm: string | null
  province: string
  city: string
  district: string
  hasAddress: boolean
  taxType: 'small' | 'general'
  phone: string
  remark: string | null
  status: string
  owner: string | null
  followUpRemark: string | null
  followedAt: string | null
  companyName?: string | null
  extra?: Record<string, string> | null
  createdAt: string
}

type FollowUpRecord = {
  id: string
  operator: string | null
  fromStatus: string | null
  toStatus: string
  owner: string | null
  remark: string | null
  createdAt: string
}

type BatchFollowUpResult = {
  successCount?: number
  failedCount?: number
  failed?: { id: string; reason: string }[]
}

// 与后端 Dicts.FOLLOW_UP_STATUS_TEXT 同一口径（状态闭集见 common/Dicts.java）
const STATUS_TEXT: Record<string, string> = {
  pending: '待跟进',
  contacted: '已联系',
  quoted: '已报价',
  converted: '已成交',
  invalid: '无效线索',
}
const STATUS_TAG: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'primary'> = {
  pending: 'info',
  contacted: 'warning',
  quoted: 'primary',
  converted: 'success',
  invalid: 'danger',
}

const authStore = useAuthStore()
const canFollowUp = computed(() => authStore.canPerform('/registration-requests/follow-up'))
const myName = computed(() => authStore.adminInfo?.username || '')

const loading = ref(false)
const list = ref<RegistrationRequest[]>([])
const query = reactive({ keyword: '', kind: '', status: '', owner: '', page: 1, pageSize: 20 })
const pagination = ref({ total: 0 })
const selected = ref<RegistrationRequest[]>([])

const detailVisible = ref(false)
const detailLoading = ref(false)
const detail = ref<RegistrationRequest | null>(null)
const followUps = ref<FollowUpRecord[]>([])

const followUpVisible = ref(false)
const followUpMode = ref<'single' | 'batch'>('single')
const followUpRow = ref<RegistrationRequest | null>(null)
const followUpSubmitting = ref(false)
const followUpForm = reactive({ status: '', owner: '', remark: '' })

const formatDate = (date?: string | null) => (date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-')
const KIND_TEXT: Record<string, string> = {
  enterprise: '企业注册',
  individual: '个体户',
  bookkeeping: '代理记账',
}
const kindLabel = (kind: string) => KIND_TEXT[kind] || kind
// 代账需求字段文案：取值与后端 common/Dicts.java 的 BOOKKEEPING_EXTRA_VALUES 一一对应
const EXTRA_TEXT: Record<string, Record<string, string>> = {
  cycle: { half: '半年', year: '全年', unsure: '暂不确定' },
  invoice: { none: '不开票', within5: '5 张内', normal: '正常开票', unsure: '暂不确定' },
  socialFund: {
    none: '都不缴',
    social: '只缴社保',
    fund: '只缴公积金',
    social_fund: '社保 + 公积金',
    unsure: '暂不确定',
  },
  accountHistory: { new: '新办公司，还没开始记账', handover: '有历史账，需要交接', unsure: '暂不确定' },
}
const extraLabel = (key: string, row: RegistrationRequest) => {
  const value = row.extra ? row.extra[key] : ''
  return value ? EXTRA_TEXT[key]?.[value] || value : '-'
}
const taxLabel = (tax: string) => (tax === 'general' ? '一般纳税人' : '小规模纳税人')
const statusText = (status?: string | null) => (status ? STATUS_TEXT[status] || status : '-')
const statusTag = (status?: string | null) => (status ? STATUS_TAG[status] || 'info' : 'info')

async function fetchData() {
  loading.value = true
  try {
    const response: unknown = await getRegistrationRequests({ ...query })
    const result = toPaged<RegistrationRequest>(response)
    list.value = result.list
    pagination.value.total = result.total
  } catch (error: unknown) {
    list.value = []
    pagination.value.total = 0
    ElMessage.error(getApiErrorMessage(error, '加载工商注册失败'))
  } finally {
    loading.value = false
  }
}

function search() {
  query.page = 1
  fetchData()
}
function reset() {
  query.keyword = ''
  query.kind = ''
  query.status = ''
  query.owner = ''
  search()
}
function onSizeChange() {
  query.page = 1
  fetchData()
}
function handleSelectionChange(rows: RegistrationRequest[]) {
  selected.value = rows
}

async function showDetail(id: string) {
  detail.value = null
  followUps.value = []
  detailVisible.value = true
  detailLoading.value = true
  try {
    const detailResponse: unknown = await getRegistrationRequestDetail(id)
    detail.value = unwrapV1<RegistrationRequest>(detailResponse)
    const timelineResponse: unknown = await getRegistrationRequestFollowUps(id)
    followUps.value = toArray<FollowUpRecord>(timelineResponse)
  } catch (error: unknown) {
    detailVisible.value = false
    ElMessage.error(getApiErrorMessage(error, '加载需求详情失败'))
  } finally {
    detailLoading.value = false
  }
}

function openFollowUp(row: RegistrationRequest) {
  followUpMode.value = 'single'
  followUpRow.value = row
  followUpForm.status = row.status || 'pending'
  followUpForm.owner = row.owner || ''
  followUpForm.remark = ''
  followUpVisible.value = true
}

function openBatchFollowUp() {
  if (selected.value.length === 0) return
  followUpMode.value = 'batch'
  followUpRow.value = null
  followUpForm.status = ''
  followUpForm.owner = ''
  followUpForm.remark = ''
  followUpVisible.value = true
}

async function submitFollowUp() {
  if (!followUpForm.status) {
    ElMessage.warning('请选择跟进状态')
    return
  }
  followUpSubmitting.value = true
  try {
    if (followUpMode.value === 'single') {
      const row = followUpRow.value
      if (!row) return
      await followUpRegistrationRequest(row.id, {
        fromStatus: row.status,
        status: followUpForm.status,
        owner: followUpForm.owner,
        remark: followUpForm.remark,
      })
      ElMessage.success('已记录跟进')
    } else {
      const ids = selected.value.map((r) => r.id).filter(Boolean)
      await ElMessageBox.confirm(`确认对这 ${ids.length} 条需求执行跟进？`, '提示', { type: 'warning' })
      const response: unknown = await batchFollowUpRegistrationRequests({
        ids,
        status: followUpForm.status,
        owner: followUpForm.owner,
        remark: followUpForm.remark,
      })
      const result = unwrapV1<BatchFollowUpResult>(response)
      const ok = result?.successCount ?? 0
      const fail = result?.failedCount ?? 0
      const firstReason = result?.failed?.[0]?.reason
      if (fail > 0) {
        ElMessage.warning(`成功 ${ok} 条，失败 ${fail} 条${firstReason ? `（${firstReason}）` : ''}`)
      } else {
        ElMessage.success(`批量跟进成功 ${ok} 条`)
      }
      selected.value = []
    }
    followUpVisible.value = false
    fetchData()
  } catch (error: unknown) {
    if (error === 'cancel' || error === 'close') return
    // 409 = 期间被别人改过：提示后刷新，不静默覆盖别人的跟进结果
    ElMessage.error(getApiErrorMessage(error, '跟进失败'))
    fetchData()
  } finally {
    followUpSubmitting.value = false
  }
}

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<{ message?: unknown }>(error)) {
    const message = error.response?.data?.message
    if (Array.isArray(message)) return message.join('；')
    if (typeof message === 'string' && message) return message
  }
  return error instanceof Error && error.message ? error.message : fallback
}

onMounted(fetchData)
</script>

<style scoped>
.remark {
  white-space: pre-wrap;
  word-break: break-word;
}
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
}
.batch-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.batch-tip {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.timeline-block {
  margin-top: 18px;
}
.timeline-title {
  font-weight: 600;
  margin-bottom: 12px;
}
.timeline-line {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.timeline-operator {
  font-weight: 500;
}
.timeline-arrow {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.timeline-owner {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.timeline-remark {
  margin-top: 4px;
  color: var(--el-text-color-regular);
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
