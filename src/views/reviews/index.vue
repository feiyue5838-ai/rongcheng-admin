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

      <el-table :data="reviews" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="评分" width="120">
          <template #default="{ row }">
            <el-rate v-model="row.rating" disabled text-color="#ff9900" />
          </template>
        </el-table-column>
        <el-table-column prop="content" label="评价内容" min-width="200" show-overflow-tooltip />
        <el-table-column prop="images" label="图片" width="100">
          <template #default="{ row }">
            <el-image v-if="row.images?.length" :src="row.images[0]" style="width: 40px; height: 40px; border-radius: 4px" :preview-src-list="row.images" />
          </template>
        </el-table-column>
        <el-table-column prop="module" label="模块" width="80">
          <template #default="{ row }">{{ row.module === 'seal' ? '刻章' : '登报' }}</template>
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
        @change="fetchReviews"
      />
    </div>

    <!-- 回复对话框 -->
    <el-dialog v-model="replyVisible" title="回复评价" width="500px">
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
const query = reactive({ page: 1, pageSize: 20, status: 'pending' as string })
const replyVisible = ref(false)
const replyText = ref('')
const currentReview = ref<any>({})

function formatDate(d: string) {
  return dayjs(d).format('YYYY-MM-DD HH:mm')
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
    const params: any = { page: query.page, pageSize: query.pageSize }
    if (query.status) {
      params.status = query.status
    }
    const res: any = await getReviews(params)
    reviews.value = res.list
    pagination.value = res.pagination
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
    if (e !== 'cancel') {
      ElMessage.error(e?.response?.data?.message || '操作失败')
    }
  }
}

function showReplyDialog(row: any) {
  currentReview.value = row
  replyText.value = ''
  replyVisible.value = true
}

async function submitReply() {
  if (!replyText.value.trim()) {
    ElMessage.warning('请输入回复内容')
    return
  }
  submitting.value = true
  try {
    await replyReview(currentReview.value.id, replyText.value)
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
    if (e !== 'cancel') {
      ElMessage.error(e?.response?.data?.message || '删除失败')
    }
  }
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
