<template>
  <div class="page-container">
    <!-- 左侧分类列表 -->
    <div class="left-sidebar">
      <div class="sidebar-title">分类</div>
      <el-menu :default-active="activeCategory" @select="onCategorySelect">
        <el-menu-item index="">
          <span class="menu-item-text">全部</span>
          <span class="count-badge">{{ templates.length > 99 ? '99+' : templates.length }}</span>
        </el-menu-item>
        <el-menu-item v-for="c in categoryList" :key="c.id" :index="c.id">
          <span class="menu-item-text">{{ c.name }}</span>
          <span class="count-badge" :style="{ color: templates.filter(t => t.categoryId === c.id).length > 0 ? '#5B6FE8' : '#ccc' }">
            {{ templates.filter(t => t.categoryId === c.id).length > 99 ? '99+' : templates.filter(t => t.categoryId === c.id).length }}
          </span>
        </el-menu-item>
      </el-menu>
    </div>

    <!-- 右侧模板列表 -->
    <div class="right-content">
      <div class="page-header">
        <h2>公告模板管理</h2>
        <el-button type="primary" @click="showDialog('add')">添加模板</el-button>
      </div>

      <div class="page-card">
        <el-row :gutter="16" style="margin-bottom: 16px">
          <el-col :span="8">
            <el-input
              v-model="filterText"
              placeholder="按模板名称搜索"
              clearable
              prefix-icon="Search"
            />
          </el-col>
        </el-row>

        <el-table :data="displayedTemplates" v-loading="loading" stripe>
          <!-- 模板名称 -->
          <el-table-column prop="name" label="模板名称" min-width="180" />

          <!-- 所属分类（与小程序对齐） -->
          <el-table-column label="所属分类" width="140">
            <template #default="{ row }">
              <template v-if="row.categoryId && row.category">
                <el-tag size="small" type="info">{{ row.category.name }}</el-tag>
              </template>
              <template v-else>
                <el-tag size="small" type="danger">未分类</el-tag>
              </template>
            </template>
          </el-table-column>

          <!-- 子分组（与小程序对齐） -->
          <el-table-column label="子分组" width="120">
            <template #default="{ row }">
              <span v-if="row.templateType" style="color: #888; font-size: 13px">{{ row.templateType }}</span>
              <span v-else style="color: #ccc">—</span>
            </template>
          </el-table-column>

          <!-- 内容预览 -->
          <el-table-column label="内容预览" min-width="260">
            <template #default="{ row }">
              <el-tooltip :content="row.content || '（空）'" placement="top" :show-after="300" raw-content>
                <span class="preview-text">{{ row.content || '（空）' }}</span>
              </el-tooltip>
            </template>
          </el-table-column>

          <!-- 所属报纸（部分模板关联） -->
          <el-table-column label="所属报纸" width="140">
            <template #default="{ row }">
              <span v-if="row.newspaperId && row.newspaper">{{ row.newspaper.name }}</span>
              <span v-else style="color: #ccc">—</span>
            </template>
          </el-table-column>

          <!-- 排序 -->
          <el-table-column prop="sort" label="排序" width="70" />

          <!-- 状态 -->
          <el-table-column label="状态" width="70">
            <template #default="{ row }">
              <el-switch
                v-model="row.status"
                @change="updateStatus(row)"
                :active-value="1"
                :inactive-value="0"
              />
            </template>
          </el-table-column>

          <!-- 操作 -->
          <el-table-column label="操作" width="100" fixed="right">
            <template #default="{ row }">
              <div class="action-btns">
                <el-button type="primary" link size="small" @click="showDialog('edit', row)">编辑</el-button>
                <el-button type="danger" link size="small" @click="doDelete(row)">删除</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <el-empty v-if="!loading && displayedTemplates.length === 0" description="该分类暂无模板" />
      </div>
    </div>
  </div>

  <!-- 添加/编辑对话框 -->
  <el-dialog
    v-model="dialogVisible"
    :title="isEdit ? '编辑模板' : '添加模板'"
    width="720px"
  >
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="submitForm" :loading="submitting">保存</el-button>
    </template>
    <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">

      <!-- 所属分类（必选，与小程序 categoryId 对齐） -->
      <el-form-item label="所属分类" prop="categoryId">
        <el-select v-model="form.categoryId" placeholder="选择所属分类" style="width: 100%" @change="onCategoryChange">
          <el-option v-for="c in categoryList" :key="c.id" :label="c.name" :value="c.id" />
        </el-select>
      </el-form-item>

      <!-- 模板名称 -->
      <el-form-item label="模板名称" prop="name">
        <el-input v-model="form.name" placeholder="如：减资公告、发票领购簿" />
      </el-form-item>

      <!-- 子分组（templateType，与小程序 sub-group 对齐） -->
      <el-form-item label="子分组">
        <el-input v-model="form.templateType" placeholder="如：company、seal、debt 等（留空则不分组）" />
      </el-form-item>

      <!-- 所属报纸（非必选） -->
      <el-form-item label="所属报纸">
        <el-select v-model="form.newspaperId" placeholder="不关联报纸" style="width: 100%" filterable clearable>
          <el-option v-for="n in newspapers" :key="n.id" :label="n.name" :value="n.id" />
        </el-select>
      </el-form-item>

      <el-form-item label="简短描述">
        <el-input v-model="form.desc" placeholder="如：基础个人信息" />
      </el-form-item>

      <el-form-item label="配色">
        <el-color-picker v-model="form.color" />
        <span style="margin-left: 8px; color: #999; font-size: 13px">{{ form.color || '#5B6FE8' }}</span>
      </el-form-item>

      <el-form-item label="模板内容" prop="content">
        <el-input
          v-model="form.content"
          type="textarea"
          :rows="6"
          placeholder="填写模板正文，占位符用 {{name}}、{{date}} 等格式"
        />
      </el-form-item>

      <el-form-item label="示例数据">
        <el-input
          v-model="form.sampleData"
          type="textarea"
          :rows="2"
          placeholder='JSON 格式，如 {"name":"示例公司","date":"2024-01-01"}'
        />
      </el-form-item>

      <el-form-item label="排序">
        <el-input-number v-model="form.sort" :min="0" />
      </el-form-item>
    </el-form>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getNewspapers,
  getTemplates,
  getNewspaperCategories,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from '@/api'

const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()
const activeCategory = ref('')
const filterText = ref('')
const newspapers = ref<any[]>([])
const templates = ref<any[]>([])
const categoryList = ref<any[]>([]) // 16 个分类（来自 newspaperCategory 表）

// 身份证挂失分类 UUID
const IDCARD_CATEGORY_ID = '036611a0-2e96-43f7-b2fc-f4271651db97'

const isIdcardCategory = computed(() => form.value.categoryId === IDCARD_CATEGORY_ID)

const form = ref({
  id: '',
  name: '',
  templateType: '',
  newspaperId: '',
  categoryId: '',
  content: '',
  sampleData: '',
  desc: '',
  color: '#5B6FE8',
  sort: 0,
})

const rules = {
  name: [{ required: true, message: '请填写模板名称', trigger: 'blur' }],
  categoryId: [{ required: true, message: '请选择所属分类', trigger: 'change' }],
}

const displayedTemplates = computed(() => {
  let list = templates.value
  if (activeCategory.value) {
    list = list.filter(t => t.categoryId === activeCategory.value)
  }
  if (filterText.value.trim()) {
    const kw = filterText.value.trim().toLowerCase()
    list = list.filter(t => (t.name || '').toLowerCase().includes(kw))
  }
  return list
})

function onCategorySelect(id: string) {
  activeCategory.value = id
}

onMounted(async () => {
  loading.value = true
  try {
    const [nRes, tRes, cRes] = await Promise.all([
      getNewspapers(),
      getTemplates(),
      getNewspaperCategories(),
    ])
    newspapers.value = Array.isArray(nRes) ? nRes : (nRes?.data || [])
    templates.value = Array.isArray(tRes) ? tRes : (tRes?.data || [])
    categoryList.value = Array.isArray(cRes) ? cRes : (cRes?.data || [])
  } finally {
    loading.value = false
  }
})

function showDialog(mode: 'add' | 'edit', row?: any) {
  isEdit.value = mode === 'edit'
  if (mode === 'edit' && row) {
    Object.assign(form.value, {
      id: row.id,
      name: row.name || '',
      templateType: row.templateType || '',
      newspaperId: row.newspaperId || '',
      categoryId: row.categoryId || '',
      content: row.content || '',
      sampleData: row.sampleData || '',
      desc: row.desc || '',
      color: row.color || '#5B6FE8',
      sort: row.sort ?? 0,
    })
  } else {
    form.value = {
      id: '',
      name: '',
      templateType: '',
      newspaperId: '',
      categoryId: '',
      content: '',
      sampleData: '',
      desc: '',
      color: '#5B6FE8',
      sort: 0,
    }
  }
  dialogVisible.value = true
}

// 切换分类时重置子分组
function onCategoryChange() {
  form.value.templateType = ''
}

async function submitForm() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  submitting.value = true
  try {
    const category = categoryList.value.find(c => c.id === form.value.categoryId)
    const payload = {
      name: form.value.name,
      templateType: form.value.templateType || null,
      newspaperId: form.value.newspaperId || null,
      categoryId: form.value.categoryId,
      content: form.value.content || null,
      sampleData: form.value.sampleData || null,
      desc: form.value.desc || null,
      color: form.value.color || null,
      sort: form.value.sort ?? 0,
    }
    if (isEdit.value) {
      await updateTemplate(form.value.id, payload)
      ElMessage.success('保存成功')
    } else {
      await createTemplate(payload)
      ElMessage.success('保存成功')
    }
    dialogVisible.value = false
    await loadTemplates()
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  } finally {
    submitting.value = false
  }
}

async function doDelete(row: any) {
  await ElMessageBox.confirm(`确认删除模板「${row.name}」？`, '提示')
  await deleteTemplate(row.id)
  ElMessage.success('删除成功')
  await loadTemplates()
}

async function updateStatus(row: any) {
  await updateTemplate(row.id, { status: row.status })
  ElMessage.success('状态已更新')
}

async function loadTemplates() {
  const res = await getTemplates()
  templates.value = Array.isArray(res) ? res : (res?.data || [])
}
</script>

<style scoped lang="scss">
.page-container {
  display: flex;
  gap: 20px;
  min-height: 100%;
}

.left-sidebar {
  width: 220px;
  flex-shrink: 0;
  background: #fff;
  border-radius: 8px;
  padding: 16px 0;
  height: fit-content;
}

.sidebar-title {
  padding: 0 20px 8px;
  font-size: 12px;
  color: #999;
  border-bottom: 1px solid #eee;
  margin-bottom: 8px;
}

.menu-item-text {
  flex: 1;
}

.count-badge {
  margin-left: 8px;
  font-size: 13px;
}

.right-content {
  flex: 1;
  min-width: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  h2 {
    font-size: 18px;
    font-weight: 600;
    color: #333;
    margin: 0;
  }
}

.action-btns {
  display: flex;
  gap: 4px;
}

.preview-text {
  display: block;
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
