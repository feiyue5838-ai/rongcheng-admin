<template>
  <div>
    <div class="page-header"><h2>问答管理</h2></div>
    <div class="page-card">
      <!-- 筛选区域 -->
      <div class="filter-bar">
        <el-tabs v-model="activeStatus" @tab-change="handleStatusChange" style="margin-bottom: 16px">
          <el-tab-pane label="待审核" name="pending" />
          <el-tab-pane label="已发布" name="published" />
          <el-tab-pane label="已驳回" name="rejected" />
          <el-tab-pane label="全部" name="" />
        </el-tabs>

        <div class="filter-row">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索问题内容"
            clearable
            style="width: 280px"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          >
            <template #append>
              <el-button :icon="Search" @click="handleSearch" />
            </template>
          </el-input>

          <el-select
            v-model="selectedModule"
            placeholder="模块筛选"
            clearable
            style="width: 140px; margin-left: 12px"
            @change="handleSearch"
          >
            <el-option label="企业刻章" value="seal_enterprise" />
            <el-option label="个人刻章" value="seal_personal" />
            <el-option label="登报" value="newspaper" />
          </el-select>
        </div>
      </div>

      <!-- 表格 -->
      <el-table :data="questions" v-loading="loading" stripe>
        <el-table-column type="index" label="序号" width="60" :index="indexMethod" />
        <el-table-column prop="content" label="问题内容" min-width="250" show-overflow-tooltip>
          <template #default="{ row }">
            <span>{{ truncateText(row.content, 50) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="module" label="模块" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="getModuleTagType(row.module)">
              {{ getModuleName(row.module) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="author" label="提问者" width="120" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.author?.nickname || row.author?.phone || '匿名用户' }}
          </template>
        </el-table-column>
        <el-table-column prop="replyCount" label="回复数" width="80" align="center">
          <template #default="{ row }">
            <el-badge :value="row.question_replies?.length || 0" :hidden="!row.question_replies?.length" type="primary">
              <span>{{ row.question_replies?.length || 0 }}</span>
            </el-badge>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.status === 'pending'" type="warning" size="small">待审核</el-tag>
            <el-tag v-else-if="row.status === 'published'" type="success" size="small">已发布</el-tag>
            <el-tag v-else-if="row.status === 'rejected'" type="danger" size="small">已驳回</el-tag>
            <el-tag v-else type="info" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="发布时间" width="170">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="{ row }">
            <!-- 审核按钮：仅在待审核状态显示 -->
            <template v-if="row.status === 'pending'">
              <el-button type="success" link @click="handleAudit(row, 'published')">通过</el-button>
              <el-button type="danger" link @click="handleAudit(row, 'rejected')">驳回</el-button>
            </template>
            <el-button type="primary" link @click="showReplyDialog(row)">回复</el-button>
            <el-button type="info" link @click="showDetailDialog(row)">详情</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <el-pagination
        style="margin-top: 20px; justify-content: flex-end"
        v-model:current-page="query.page"
        v-model:page-size="query.pageSize"
        :total="pagination.total"
        :page-sizes="[20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        @change="fetchQuestions"
      />
    </div>

    <!-- 回复对话框 -->
    <el-dialog v-model="replyVisible" title="回复问答" width="600px">
      <div class="question-preview" style="background: #f5f7fa; padding: 16px; border-radius: 8px; margin-bottom: 16px">
        <div style="font-size: 13px; color: #666; margin-bottom: 8px">问题内容：</div>
        <div style="color: #333">{{ currentQuestion?.content }}</div>
      </div>

      <!-- 已有回复列表 -->
      <div v-if="currentQuestion?.question_replies?.length" style="margin-bottom: 16px">
        <div style="font-size: 14px; font-weight: 500; margin-bottom: 12px">已有回复：</div>
        <div v-for="(reply, index) in currentQuestion.question_replies" :key="index" class="reply-item">
          <div class="reply-header">
            <span class="reply-author">{{ reply.author_name || '管理员' }}</span>
            <span class="reply-time">{{ formatDate(reply.created_at) }}</span>
            <el-button type="danger" link size="small" @click="handleDeleteReply(reply.id)">删除</el-button>
          </div>
          <div class="reply-content">{{ reply.content }}</div>
        </div>
      </div>

      <el-input
        v-model="replyText"
        type="textarea"
        :rows="4"
        placeholder="请输入回复内容"
        maxlength="500"
        show-word-limit
      />
      <template #footer>
        <el-button @click="replyVisible = false">取消</el-button>
        <el-button type="primary" @click="submitReply" :loading="submitting">提交回复</el-button>
      </template>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog v-model="detailVisible" title="问答详情" width="600px">
      <el-descriptions :column="1" border>
        <el-descriptions-item label="问题内容">{{ currentQuestion?.content }}</el-descriptions-item>
        <el-descriptions-item label="所属模块">{{ getModuleName(currentQuestion?.module) }}</el-descriptions-item>
        <el-descriptions-item label="提问者">{{ currentQuestion?.author?.nickname || currentQuestion?.author?.phone || '匿名用户' }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag v-if="currentQuestion?.status === 'pending'" type="warning" size="small">待审核</el-tag>
          <el-tag v-else-if="currentQuestion?.status === 'published'" type="success" size="small">已发布</el-tag>
          <el-tag v-else-if="currentQuestion?.status === 'rejected'" type="danger" size="small">已驳回</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="发布时间">{{ formatDate(currentQuestion?.createdAt) }}</el-descriptions-item>
      </el-descriptions>

      <div v-if="currentQuestion?.question_replies?.length" style="margin-top: 20px">
        <div style="font-size: 14px; font-weight: 500; margin-bottom: 12px">回复记录：</div>
        <div v-for="(reply, index) in currentQuestion.question_replies" :key="index" class="reply-item">
          <div class="reply-header">
            <span class="reply-author">{{ reply.author_name || '管理员' }}</span>
            <span class="reply-time">{{ formatDate(reply.created_at) }}</span>
          </div>
          <div class="reply-content">{{ reply.content }}</div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { getQuestions, updateQuestionStatus, replyQuestion, deleteQuestion, deleteQuestionReply } from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'

const loading = ref(false)
const submitting = ref(false)
const questions = ref<any[]>([])
const pagination = ref({ page: 1, pageSize: 20, total: 0 })

const activeStatus = ref('pending') // 默认显示待审核
const searchKeyword = ref('')
const selectedModule = ref('')

const query = reactive({
  page: 1,
  pageSize: 20,
  status: 'pending' as string,
  keyword: '',
  module: '',
})

const replyVisible = ref(false)
const replyText = ref('')
const currentQuestion = ref<any>({})

const detailVisible = ref(false)

function formatDate(d: string) {
  return dayjs(d).format('YYYY-MM-DD HH:mm')
}

function truncateText(text: string, maxLen: number) {
  if (!text) return ''
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text
}

function getModuleName(module: string) {
  const map: Record<string, string> = {
    seal_enterprise: '企业刻章',
    seal_personal: '个人刻章',
    newspaper: '登报',
  }
  return map[module] || module || '未知'
}

function getModuleTagType(module: string) {
  const map: Record<string, string> = {
    seal_enterprise: 'primary',
    seal_personal: 'success',
    newspaper: 'warning',
  }
  return map[module] || 'info'
}

function indexMethod(index: number) {
  return (query.page - 1) * query.pageSize + index + 1
}

// 状态 Tab 切换
function handleStatusChange(tabName: string) {
  query.status = tabName
  query.page = 1
  fetchQuestions()
}

// 搜索
function handleSearch() {
  query.keyword = searchKeyword.value
  query.module = selectedModule.value
  query.page = 1
  fetchQuestions()
}

async function fetchQuestions() {
  loading.value = true
  try {
    const params: any = { page: query.page, pageSize: query.pageSize }
    if (query.status) {
      params.status = query.status
    }
    if (query.keyword) {
      params.keyword = query.keyword
    }
    if (query.module) {
      params.module = query.module
    }
    const res: any = await getQuestions(params)
    questions.value = res.list || res.data?.list || []
    pagination.value = res.pagination || res.data?.pagination || { page: 1, pageSize: 20, total: 0 }
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '获取列表失败')
  } finally {
    loading.value = false
  }
}

// 审核问答
async function handleAudit(row: any, status: 'published' | 'rejected') {
  const actionText = status === 'published' ? '通过' : '驳回'
  try {
    await ElMessageBox.confirm(`确认${actionText}该问答？`, '审核确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await updateQuestionStatus(row.id, status)
    ElMessage.success(`已${actionText}`)
    fetchQuestions()
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error(e?.response?.data?.message || '操作失败')
    }
  }
}

function showReplyDialog(row: any) {
  currentQuestion.value = row
  replyText.value = ''
  replyVisible.value = true
}

function showDetailDialog(row: any) {
  currentQuestion.value = row
  detailVisible.value = true
}

async function submitReply() {
  if (!replyText.value.trim()) {
    ElMessage.warning('请输入回复内容')
    return
  }
  submitting.value = true
  try {
    await replyQuestion(currentQuestion.value.id, replyText.value)
    ElMessage.success('回复成功')
    replyVisible.value = false
    fetchQuestions()
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '回复失败')
  } finally {
    submitting.value = false
  }
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm('确认删除该问答？删除后不可恢复。', '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await deleteQuestion(row.id)
    ElMessage.success('删除成功')
    fetchQuestions()
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error(e?.response?.data?.message || '删除失败')
    }
  }
}

async function handleDeleteReply(replyId: string) {
  try {
    await ElMessageBox.confirm('确认删除该回复？', '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await deleteQuestionReply(replyId)
    ElMessage.success('删除成功')
    // 刷新当前问答详情
    fetchQuestions()
    // 更新对话框中的数据
    if (currentQuestion.value.question_replies) {
      currentQuestion.value.question_replies = currentQuestion.value.question_replies.filter((r: any) => r.id !== replyId)
    }
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error(e?.response?.data?.message || '删除失败')
    }
  }
}

onMounted(fetchQuestions)
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
.filter-bar {
  margin-bottom: 20px;
}
.filter-row {
  display: flex;
  align-items: center;
}
.reply-item {
  background: #fafafa;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 8px;
}
.reply-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}
.reply-author {
  font-size: 13px;
  font-weight: 500;
  color: #333;
}
.reply-time {
  font-size: 12px;
  color: #999;
}
.reply-content {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
}
</style>
