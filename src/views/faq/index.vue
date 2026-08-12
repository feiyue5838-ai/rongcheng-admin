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
          <el-table :data="categories" v-loading="loading" stripe border>
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
                <el-button size="small" :type="row.status === 1 ? 'warning' : 'success'" @click="toggleCat(row)">{{ row.status === 1 ? '禁用' : '启用' }}</el-button>
                <el-button size="small" type="danger" @click="delCat(row)">删除</el-button>
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
            <el-button type="primary" @click="openFaqDialog()">新增问答</el-button>
          </div>
          <el-table :data="filteredFaqs" v-loading="loading" stripe border>
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
                <el-button size="small" :type="row.status === 1 ? 'warning' : 'success'" @click="toggleFaq(row)">{{ row.status === 1 ? '禁用' : '启用' }}</el-button>
                <el-button size="small" type="danger" @click="delFaq(row)">删除</el-button>
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

const loading = ref(false)
const saving = ref(false)
const phoneSaving = ref(false)
const phone = ref('')
const categories = ref<any[]>([])
const filterCat = ref<number | undefined>()
const activeTab = ref('category')

const allFaqs = ref<any[]>([])
const filteredFaqs = computed(() => {
  if (!filterCat.value) return allFaqs.value
  return allFaqs.value.filter((f) => f.categoryId === filterCat.value)
})

function filterFaqs() {
  // 纯前端筛选，不需要重新请求
}

const catVisible = ref(false)
const catForm = ref<any>({ id: null, name: '', icon: '', sort: 0 })
const faqVisible = ref(false)
const faqForm = ref<any>({ id: null, categoryId: undefined, question: '', answer: '', sort: 0 })

function catName(id: number) {
  const c = categories.value.find((x) => x.id === id)
  return c ? c.name : '-'
}

async function load() {
  loading.value = true
  try {
    const data: any = await getFaqAdminList()
    categories.value = data.categories || []
    allFaqs.value = categories.value.flatMap((c: any) => c.faqs || [])
    phone.value = data.phone || ''
  } finally {
    loading.value = false
  }
}

function openCatDialog(row?: any) {
  catForm.value = row ? { ...row } : { id: null, name: '', icon: '', sort: 0 }
  catVisible.value = true
}
async function saveCat() {
  if (!catForm.value.name) return ElMessage.warning('请输入分类名称')
  saving.value = true
  try {
    if (catForm.value.id) await updateFaqCategory(catForm.value.id, { name: catForm.value.name, icon: catForm.value.icon, sort: catForm.value.sort })
    else await addFaqCategory({ name: catForm.value.name, icon: catForm.value.icon, sort: catForm.value.sort })
    ElMessage.success('保存成功')
    catVisible.value = false
    load()
  } finally { saving.value = false }
}
async function toggleCat(row: any) {
  await updateFaqCategoryStatus(row.id, row.status === 1 ? 0 : 1)
  load()
}
async function delCat(row: any) {
  await ElMessageBox.confirm('删除分类将同时删除其下所有问答，确定？', '提示', { type: 'warning' })
  await deleteFaqCategory(row.id)
  ElMessage.success('已删除')
  load()
}

function openFaqDialog(row?: any) {
  faqForm.value = row ? { ...row } : { id: null, categoryId: categories.value[0]?.id, question: '', answer: '', sort: 0 }
  faqVisible.value = true
}
async function saveFaq() {
  if (!faqForm.value.categoryId) return ElMessage.warning('请选择分类')
  if (!faqForm.value.question) return ElMessage.warning('请输入问题')
  if (!faqForm.value.answer) return ElMessage.warning('请输入答案')
  saving.value = true
  try {
    if (faqForm.value.id) await updateFaq(faqForm.value.id, { categoryId: faqForm.value.categoryId, question: faqForm.value.question, answer: faqForm.value.answer, sort: faqForm.value.sort })
    else await addFaq({ categoryId: faqForm.value.categoryId, question: faqForm.value.question, answer: faqForm.value.answer, sort: faqForm.value.sort })
    ElMessage.success('保存成功')
    faqVisible.value = false
    load()
  } finally { saving.value = false }
}
async function toggleFaq(row: any) {
  await updateFaqStatus(row.id, row.status === 1 ? 0 : 1)
  load()
}
async function delFaq(row: any) {
  await ElMessageBox.confirm('确定删除该问答？', '提示', { type: 'warning' })
  await deleteFaq(row.id)
  ElMessage.success('已删除')
  load()
}

async function savePhone() {
  if (!phone.value) return ElMessage.warning('请输入电话')
  phoneSaving.value = true
  try {
    await setFaqPhone(phone.value)
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
