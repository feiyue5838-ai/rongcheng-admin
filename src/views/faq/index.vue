<template>
  <div>
    <div class="page-header"><h2>帮助中心管理</h2></div>

    <!-- 客服电话 -->
    <div class="page-card" style="margin-bottom:16px">
      <h3>客服电话</h3>
      <el-input v-model="phone" style="width:260px;margin-right:12px" placeholder="请输入客服电话" />
      <el-button type="primary" :loading="phoneSaving" @click="savePhone">保存</el-button>
    </div>

    <!-- 分类管理与问答管理 -->
    <div class="page-card">
      <el-tabs v-model="activeTab" class="faq-tabs">
        <!-- 分类管理 -->
        <el-tab-pane label="分类管理" name="category">
          <div class="filter-bar" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <span />
            <el-button type="primary" @click="openCatDialog()">新增分类</el-button>
          </div>
          <el-table :data="categories" v-loading="loading" stripe border empty-text="暂无分类">
            <el-table-column prop="name" label="分类名称" min-width="140" />
            <el-table-column prop="icon" label="图标" min-width="200" show-overflow-tooltip />
            <el-table-column prop="sort" label="排序" width="80" />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '启用' : '禁用' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="240" fixed="right">
              <template #default="{ row }">
                <el-button size="small" @click="openCatDialog(row)">编辑</el-button>
                <el-button size="small" :loading="actionKey === `category-status-${row.id}`" :type="row.status === 1 ? 'warning' : 'success'" @click="toggleCat(row)">{{ row.status === 1 ? '禁用' : '启用' }}</el-button>
                <el-button size="small" type="danger" :loading="actionKey === `category-delete-${row.id}`" @click="delCat(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- 问答管理 -->
        <el-tab-pane label="问答管理" name="faq">
          <div class="filter-bar" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <div>
              <el-select v-model="filterCat" placeholder="全部分类" clearable style="width:160px;margin-right:12px" @change="filterFaqs">
                <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
              </el-select>
            </div>
            <el-button type="primary" :disabled="categories.length === 0" @click="openFaqDialog()">新增问答</el-button>
          </div>
          <el-table :data="filteredFaqs" v-loading="loading" stripe border empty-text="暂无问答">
            <el-table-column prop="question" label="问题" min-width="220" show-overflow-tooltip />
            <el-table-column prop="answer" label="答案" min-width="320" show-overflow-tooltip />
            <el-table-column label="分类" width="120">
              <template #default="{ row }">{{ catName(row.categoryId) }}</template>
            </el-table-column>
            <el-table-column prop="sort" label="排序" width="70" />
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '启用' : '禁用' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="230" fixed="right">
              <template #default="{ row }">
                <el-button size="small" @click="openFaqDialog(row)">编辑</el-button>
                <el-button size="small" :loading="actionKey === `faq-status-${row.id}`" :type="row.status === 1 ? 'warning' : 'success'" @click="toggleFaq(row)">{{ row.status === 1 ? '禁用' : '启用' }}</el-button>
                <el-button size="small" type="danger" :loading="actionKey === `faq-delete-${row.id}`" @click="delFaq(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 分类弹窗 -->
    <el-dialog v-model="catVisible" :title="catForm.id ? '编辑分类' : '新增分类'">
      <el-form :model="catForm" label-width="80px">
        <el-form-item label="名称"><el-input v-model="catForm.name" /></el-form-item>
        <el-form-item label="图标"><el-input v-model="catForm.icon" placeholder="图标路径" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="catForm.sort" :min="0" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="catVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveCat">保存</el-button>
      </template>
    </el-dialog>

    <!-- 问答弹窗 -->
    <el-dialog v-model="faqVisible" :title="faqForm.id ? '编辑问答' : '新增问答'" width="640px">
      <el-form :model="faqForm" label-width="80px">
        <el-form-item label="分类">
          <el-select v-model="faqForm.categoryId" placeholder="选择分类">
            <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="问题"><el-input v-model="faqForm.question" /></el-form-item>
        <el-form-item label="答案"><el-input v-model="faqForm.answer" type="textarea" :rows="4" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="faqForm.sort" :min="0" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="faqVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveFaq">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getFaqAdminList, addFaqCategory, updateFaqCategory, deleteFaqCategory,
  addFaq, updateFaq, deleteFaq, updateFaqStatus, updateFaqCategoryStatus,
  setFaqPhone,
} from '@/api'

type FaqItem = {
  id: number
  categoryId: number
  question: string
  answer: string
  sort: number
  status: number
}

type FaqCategory = {
  id: number
  name: string
  icon: string
  sort: number
  status: number
  faqs?: FaqItem[]
}

type FaqAdminResponse = {
  categories?: FaqCategory[]
  phone?: string
}

const loading = ref(false)
const saving = ref(false)
const phoneSaving = ref(false)
const actionKey = ref('')
const phone = ref('')
const categories = ref<FaqCategory[]>([])
const filterCat = ref<number | undefined>()
const activeTab = ref('category')

const allFaqs = ref<FaqItem[]>([])
const filteredFaqs = computed(() => {
  if (!filterCat.value) return allFaqs.value
  return allFaqs.value.filter((f) => f.categoryId === filterCat.value)
})

function filterFaqs() { /* computed 会自动完成前端筛选 */ }

const catVisible = ref(false)
const catForm = ref<{ id: number | null; name: string; icon: string; sort: number }>({ id: null, name: '', icon: '', sort: 0 })
const faqVisible = ref(false)
const faqForm = ref<{ id: number | null; categoryId?: number; question: string; answer: string; sort: number }>({ id: null, categoryId: undefined, question: '', answer: '', sort: 0 })

function catName(id: number) {
  const c = categories.value.find((x) => x.id === id)
  return c ? c.name : '-'
}

async function load() {
  loading.value = true
  try {
    const data = await getFaqAdminList() as unknown as FaqAdminResponse
    categories.value = Array.isArray(data?.categories) ? data.categories : []
    allFaqs.value = categories.value.flatMap((category) => Array.isArray(category.faqs) ? category.faqs : [])
    phone.value = typeof data?.phone === 'string' ? data.phone : ''
    if (filterCat.value && !categories.value.some((category) => category.id === filterCat.value)) {
      filterCat.value = undefined
    }
  } finally {
    loading.value = false
  }
}

function openCatDialog(row?: FaqCategory) {
  catForm.value = row ? { ...row } : { id: null, name: '', icon: '', sort: 0 }
  catVisible.value = true
}
async function saveCat() {
  const name = catForm.value.name.trim()
  if (!name) return ElMessage.warning('请输入分类名称')
  saving.value = true
  try {
    const payload = { name, icon: catForm.value.icon.trim(), sort: catForm.value.sort }
    if (catForm.value.id) await updateFaqCategory(String(catForm.value.id), payload)
    else await addFaqCategory(payload)
    ElMessage.success('保存成功')
    catVisible.value = false
    await load()
  } finally { saving.value = false }
}
async function toggleCat(row: FaqCategory) {
  const nextStatus = row.status === 1 ? 0 : 1
  actionKey.value = `category-status-${row.id}`
  try {
    await updateFaqCategoryStatus(String(row.id), nextStatus)
    ElMessage.success(nextStatus === 1 ? '分类已启用' : '分类已禁用')
    await load()
  } finally { actionKey.value = '' }
}
async function delCat(row: FaqCategory) {
  const confirmed = await ElMessageBox.confirm(
    `删除分类「${row.name}」将同时删除其下 ${row.faqs?.length || 0} 条问答，确定继续？`,
    '删除分类', { type: 'warning', confirmButtonText: '确定删除' }
  ).then(() => true).catch(() => false)
  if (!confirmed) return
  actionKey.value = `category-delete-${row.id}`
  try {
    await deleteFaqCategory(String(row.id))
    ElMessage.success('分类已删除')
    await load()
  } finally { actionKey.value = '' }
}

function openFaqDialog(row?: FaqItem) {
  faqForm.value = row ? { ...row } : { id: null, categoryId: categories.value[0]?.id, question: '', answer: '', sort: 0 }
  faqVisible.value = true
}
async function saveFaq() {
  if (!faqForm.value.categoryId) return ElMessage.warning('请选择分类')
  const question = faqForm.value.question.trim()
  const answer = faqForm.value.answer.trim()
  if (!question) return ElMessage.warning('请输入问题')
  if (!answer) return ElMessage.warning('请输入答案')
  saving.value = true
  try {
    const payload = { categoryId: faqForm.value.categoryId, question, answer, sort: faqForm.value.sort }
    if (faqForm.value.id) await updateFaq(String(faqForm.value.id), payload)
    else await addFaq(payload)
    ElMessage.success('保存成功')
    faqVisible.value = false
    await load()
  } finally { saving.value = false }
}
async function toggleFaq(row: FaqItem) {
  const nextStatus = row.status === 1 ? 0 : 1
  actionKey.value = `faq-status-${row.id}`
  try {
    await updateFaqStatus(String(row.id), nextStatus)
    ElMessage.success(nextStatus === 1 ? '问答已启用' : '问答已禁用')
    await load()
  } finally { actionKey.value = '' }
}
async function delFaq(row: FaqItem) {
  const confirmed = await ElMessageBox.confirm(`确定删除问答「${row.question}」？`, '删除问答', {
    type: 'warning', confirmButtonText: '确定删除'
  }).then(() => true).catch(() => false)
  if (!confirmed) return
  actionKey.value = `faq-delete-${row.id}`
  try {
    await deleteFaq(String(row.id))
    ElMessage.success('问答已删除')
    await load()
  } finally { actionKey.value = '' }
}

async function savePhone() {
  const normalizedPhone = phone.value.trim()
  if (!normalizedPhone) return ElMessage.warning('请输入电话')
  if (!/^[0-9+()\-\s]{5,30}$/.test(normalizedPhone)) return ElMessage.warning('请输入有效的电话号码')
  phoneSaving.value = true
  try {
    await setFaqPhone(normalizedPhone)
    phone.value = normalizedPhone
    ElMessage.success('电话已保存')
  } finally { phoneSaving.value = false }
}

onMounted(load)
</script>

<style scoped>
.page-header { margin-bottom: 16px; }
.page-card { background: #fff; border-radius: 8px; padding: 16px; }
.faq-tabs { margin-top: 4px; }
.filter-bar { margin-bottom: 8px; }
</style>
