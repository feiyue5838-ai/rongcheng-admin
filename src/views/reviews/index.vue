<template>
  <div>
    <div class="page-header"><h2>评价管理</h2></div>
    <div class="page-card">
      <!-- 状态筛选 Tabs -->
      <el-tabs v-model="activeStatus" @tab-change="handleStatusChange" style="margin-bottom: 20px">
        <el-tab-pane label="待审核" name="pending" />
        <el-tab-pane label="已通过" name="approved" />
        <el-tab-pane label="已驳回" name="rejected" />
        <el-tab-pane label="全部" name="" />
      </el-tabs>

      <el-form inline :model="query" class="search-form">
        <el-form-item label="关键词">
          <el-input v-model="query.keyword" placeholder="评价内容/订单号" clearable style="width: 220px" @keyup.enter="search" />
        </el-form-item>
        <el-form-item label="业务类型">
          <el-select v-model="query.module" placeholder="全部" clearable style="width: 130px">
            <el-option label="刻章" value="seal" />
            <el-option label="登报" value="newspaper" />
            <el-option label="代理记账" value="bookkeeping" />
          </el-select>
        </el-form-item>
        <el-form-item label="评分">
          <el-select v-model="query.rating" placeholder="全部" clearable style="width: 110px">
            <el-option v-for="score in 5" :key="score" :label="`${score} 星`" :value="score" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="search">搜索</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="reviews" v-loading="loading" stripe empty-text="暂无评价数据">
        <el-table-column prop="id" label="评价ID" min-width="150" show-overflow-tooltip />
        <el-table-column label="用户" min-width="120">
          <template #default="{ row }">{{ row.user?.nickname || `微信用户 ${shortId(row.userId)}` }}</template>
        </el-table-column>
        <el-table-column label="订单号" min-width="170" show-overflow-tooltip>
          <template #default="{ row }">{{ row.sealOrders?.orderNo || '-' }}</template>
        </el-table-column>
        <el-table-column label="评分" width="120">
          <template #default="{ row }">
            <el-rate :model-value="row.rating" disabled text-color="#ff9900" />
          </template>
        </el-table-column>
        <el-table-column prop="content" label="评价内容" min-width="200" show-overflow-tooltip />
        <el-table-column prop="images" label="图片" width="100">
          <template #default="{ row }">
            <el-image v-if="row.images?.length" :src="row.images[0]" style="width: 40px; height: 40px; border-radius: 4px" :preview-src-list="row.images" />
          </template>
        </el-table-column>
        <el-table-column prop="module" label="模块" width="80">
          <template #default="{ row }">{{ moduleLabel(row.module) }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.status === 'pending'" type="warning" size="small">待审核</el-tag>
            <el-tag v-else-if="row.status === 'approved'" type="success" size="small">已通过</el-tag>
            <el-tag v-else-if="row.status === 'rejected'" type="danger" size="small">已驳回</el-tag>
            <el-tag v-else type="info" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="reply" label="回复状态" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.reply" type="success" size="small">已回复</el-tag>
            <el-tag v-else type="warning" size="small">待回复</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="评价时间" width="170">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <!-- 审核按钮：仅在待审核状态显示 -->
            <template v-if="row.status === 'pending'">
              <el-button type="success" link @click="handleAudit(row, 'approved')">通过</el-button>
              <el-button type="danger" link @click="handleAudit(row, 'rejected')">驳回</el-button>
            </template>
            <el-button type="primary" link @click="showReplyDialog(row)">{{ row.reply ? '查看回复' : '回复' }}</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        style="margin-top: 20px; justify-content: flex-end"
        v-model:current-page="query.page"
        v-model:page-size="query.pageSize"
        :total="pagination.total"
        :page-sizes="[20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        @current-change="fetchReviews"
        @size-change="handleSizeChange"
      />
    </div>

    <!-- 回复对话框 -->
    <el-dialog v-model="replyVisible" :title="currentReview?.reply ? '编辑回复' : '回复评价'" width="500px">
      <div v-if="currentReview?.reply" style="background: #f5f7fa; padding: 16px; border-radius: 8px; margin-bottom: 16px">
        <div style="font-size: 13px; color: #666">商家回复：</div>
        <div style="margin-top: 8px; color: #333">{{ currentReview.reply }}</div>
      </div>
      <el-input v-model="replyText" type="textarea" :rows="4" placeholder="请输入回复内容" />
      <template #footer>
        <el-button @click="replyVisible = false">取消</el-button>
        <el-button type="primary" @click="submitReply" :loading="submitting">提交回复</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { getReviews, replyReview, deleteReview, updateReviewStatus } from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'

const loading = ref(false)
const submitting = ref(false)
const reviews = ref<any[]>([])
const pagination = ref({ page: 1, pageSize: 20, total: 0 })
const activeStatus = ref('pending') // 默认显示待审核
const query = reactive({
  page: 1,
  pageSize: 20,
  status: 'pending' as string,
  keyword: '',
  module: '',
  rating: undefined as number | undefined,
})
const replyVisible = ref(false)
const replyText = ref('')
const currentReview = ref<any>({})

function formatDate(d?: string | null) { return d ? dayjs(d).format('YYYY-MM-DD HH:mm') : '-' }
function shortId(id?: string) { return id ? id.slice(0, 8) : '未知' }
function moduleLabel(module?: string) {
  return ({ seal: '刻章', newspaper: '登报', bookkeeping: '代理记账' } as Record<string, string>)[module || ''] || module || '-'
}

// 状态 Tab 切换
function handleStatusChange(tabName: string) {
  query.status = tabName
  query.page = 1
  fetchReviews()
}

async function fetchReviews() {
  loading.value = true
  try {
    const params: any = {
      page: query.page,
      pageSize: query.pageSize,
      ...(query.status ? { status: query.status } : {}),
      ...(query.keyword.trim() ? { keyword: query.keyword.trim() } : {}),
      ...(query.module ? { module: query.module } : {}),
      ...(query.rating ? { rating: query.rating } : {}),
    }
    const res: any = await getReviews(params)
    reviews.value = Array.isArray(res?.list) ? res.list : []
    pagination.value = res?.pagination ?? { page: query.page, pageSize: query.pageSize, total: 0 }
    if (res?.pagination?.page) query.page = res.pagination.page
  } catch {
    reviews.value = []
    pagination.value = { page: query.page, pageSize: query.pageSize, total: 0 }
  } finally {
    loading.value = false
  }
}

// 审核评价
async function handleAudit(row: any, status: 'approved' | 'rejected') {
  const actionText = status === 'approved' ? '通过' : '驳回'
  try {
    await ElMessageBox.confirm(`确认${actionText}该评价？`, '审核确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await updateReviewStatus(row.id, status)
    ElMessage.success(`已${actionText}`)
    fetchReviews()
  } catch (e: any) {
    if (e !== 'cancel' && e !== 'close') {
      ElMessage.error(e?.response?.data?.message || '操作失败')
    }
  }
}

function showReplyDialog(row: any) {
  currentReview.value = row
  replyText.value = row.reply || ''
  replyVisible.value = true
}

async function submitReply() {
  if (!replyText.value.trim()) {
    ElMessage.warning('请输入回复内容')
    return
  }
  submitting.value = true
  try {
    await replyReview(currentReview.value.id, replyText.value.trim())
    ElMessage.success('回复成功')
    replyVisible.value = false
    fetchReviews()
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '回复失败')
  } finally {
    submitting.value = false
  }
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm('确认删除该评价？', '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await deleteReview(row.id)
    ElMessage.success('删除成功')
    fetchReviews()
  } catch (e: any) {
    if (e !== 'cancel' && e !== 'close') {
      ElMessage.error(e?.response?.data?.message || '删除失败')
    }
  }
}

function search() {
  query.page = 1
  fetchReviews()
}

function resetFilters() {
  query.keyword = ''
  query.module = ''
  query.rating = undefined
  search()
}

function handleSizeChange() {
  query.page = 1
  fetchReviews()
}

onMounted(fetchReviews)
</script>

<style scoped>
.page-header {
  margin-bottom: 20px;
}
.page-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}
.page-card {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
}
</style>
