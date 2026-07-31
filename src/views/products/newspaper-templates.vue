<template>
  <div class="page-wrapper">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>📋 公告模板管理</h2>
    </div>

    <div class="page-card">

      <!-- 统计卡片 -->
      <div class="stats-row">
        <div class="stat-card stat-blue">
          <div class="stat-icon">📋</div>
          <div class="stat-info">
            <span class="stat-label">模板总数</span>
            <span class="stat-num">{{ statTotal }}</span>
          </div>
        </div>
        <div class="stat-card stat-green">
          <div class="stat-icon">✓</div>
          <div class="stat-info">
            <span class="stat-label">启用中</span>
            <span class="stat-num">{{ statOn }}</span>
          </div>
        </div>
        <div class="stat-card stat-orange">
          <div class="stat-icon">⏸</div>
          <div class="stat-info">
            <span class="stat-label">已停用</span>
            <span class="stat-num">{{ statOff }}</span>
          </div>
        </div>
        <div class="stat-card stat-red">
          <div class="stat-icon">+</div>
          <div class="stat-info">
            <span class="stat-label">本月新增</span>
            <span class="stat-num">{{ statNew }}</span>
          </div>
        </div>
      </div>

      <!-- 工具栏 -->
      <div class="toolbar-row">
        <el-input
          v-model="filterText"
          placeholder="搜索模板名称..."
          clearable
          prefix-icon="Search"
          style="width: 200px"
          @input="handleSearch"
        />

        <el-select
          v-model="filterCatId"
          placeholder="全部分类"
          clearable
          style="width: 160px"
          @change="handleCatChange"
        >
          <el-option label="全部分类" value="" />
          <el-option
            v-for="c in categoryList"
            :key="c.id"
            :label="c.name"
            :value="c.id"
          />
        </el-select>

        <el-select
          v-model="filterSubKey"
          placeholder="全部子分组"
          clearable
          style="width: 160px"
          :disabled="!filterCatId"
          @change="handleSubChange"
        >
          <el-option label="全部子分组" value="" />
          <el-option
            v-for="s in currentSubOptions"
            :key="s.key"
            :label="s.name"
            :value="s.key"
          />
        </el-select>

        <div style="flex:1"></div>

        <!-- + 添加下拉 -->
        <el-dropdown trigger="click" @command="handleAddCommand">
          <el-button type="primary">
            ➕ 添加 <el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="template">
                <span>📄</span> 添加模板
              </el-dropdown-item>
              <el-dropdown-item command="divider" divided disabled />
              <el-dropdown-item command="cat">
                <span>🏷️</span> 添加分类
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

      </div>

      <!-- 批量选中条 -->
      <div class="selection-bar" v-show="selectedRows.length > 0">
        <span>已选 <strong>{{ selectedRows.length }}</strong> 条</span>
        <el-divider direction="vertical" />
        <el-button size="small" @click="openBatchCatModal">🏷️ 改分类</el-button>
        <el-button size="small" type="danger" @click="batchDelete">🗑 删除</el-button>
        <el-button size="small" text type="info" style="margin-left:auto;" @click="selectedRows = []">取消选择</el-button>
      </div>

      <!-- 筛选标签 -->
      <div class="filter-tags" v-show="filterCatId || filterSubKey || filterText">
        <span style="font-size:12px;color:#999;margin-right:6px;">当前筛选：</span>
        <el-tag v-if="filterCatId" closable size="small" @close="clearFilterCat">
          分类：{{ categoryNameMap[filterCatId] }}
        </el-tag>
        <el-tag v-if="filterSubKey" closable size="small" @close="clearFilterSub">
          子分组：{{ subTypeName(filterSubKey) }}
        </el-tag>
        <el-tag v-if="filterText" closable size="small" @close="clearFilterText">
          搜索：{{ filterText }}
        </el-tag>
        <el-button link type="info" size="small" @click="clearAllFilters">清除全部</el-button>
      </div>

      <!-- 表格 -->
      <el-table
        :data="paginatedTemplates"
        v-loading="loading"
        stripe
        @selection-change="onTableSelectionChange"
      >
        <el-table-column type="selection" width="45" align="center" />

        <el-table-column prop="name" label="模板名称" min-width="180">
          <template #default="{ row }">
            <span class="name-cell">
              <span class="name-dot" :style="{ background: row.color || '#5B6FE8' }"></span>
              {{ row.name }}
            </span>
          </template>
        </el-table-column>

        <el-table-column label="所属分类" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.newspaperCategories" size="small" type="info">{{ row.newspaperCategories.name }}</el-tag>
            <el-tag v-else size="small" type="danger">未分类</el-tag>
          </template>
        </el-table-column>

        <el-table-column label="子分组" width="130">
          <template #default="{ row }">
            <span v-if="row.templateType" style="color:#555;font-size:13px">{{ subTypeName(row.templateType) }}</span>
            <span v-else style="color:#ccc">—</span>
          </template>
        </el-table-column>

        <el-table-column label="内容预览" min-width="200">
          <template #default="{ row }">
            <el-tooltip :content="row.content || '（空）'" placement="top" :show-after="300" raw-content>
              <span class="preview-text">{{ row.content || '（空）' }}</span>
            </el-tooltip>
          </template>
        </el-table-column>

        <el-table-column prop="sort" label="排序" width="70" align="center" />

        <el-table-column label="状态" width="75">
          <template #default="{ row }">
            <el-switch
              v-model="row.status"
              @change="updateStatus(row)"
              :active-value="1"
              :inactive-value="0"
            />
          </template>
        </el-table-column>

        <el-table-column label="操作" width="110" fixed="right">
          <template #default="{ row }">
            <div class="action-btns">
              <el-button type="primary" link size="small" @click="openTemplateDialog('edit', row)">编辑</el-button>
              <el-button type="danger" link size="small" :disabled="deletingId === row.id" @click="doDelete(row)">删除</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!loading && displayedTemplates.length === 0" description="暂无模板" />
      <div class="pagination-wrap" v-if="displayedTemplates.length > 0">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="displayedTemplates.length"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </div>
  </div>

  <!-- ===== 模板编辑弹窗 ===== -->
  <el-dialog
    v-model="templateDialogVisible"
    :title="isTemplateEdit ? '编辑模板' : '添加模板'"
    width="760px"
    :close-on-click-modal="false"
  >
    <template #footer>
      <el-button @click="templateDialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="templateSubmitting" @click="submitTemplateForm">保存</el-button>
    </template>
    <el-form ref="templateFormRef" :model="templateForm" :rules="templateRules" label-width="100px">

      <el-form-item label="所属分类" prop="categoryId">
        <el-select v-model="templateForm.categoryId" placeholder="选择所属分类" style="width:100%" @change="onTemplateCatChange" filterable>
          <el-option v-for="c in categoryList" :key="c.id" :label="c.name" :value="c.id" />
        </el-select>
      </el-form-item>

      <el-form-item label="子分组">
        <el-select
          v-model="templateForm.templateType"
          placeholder="选择子分组（可不选）"
          style="width:100%"
          clearable
          filterable
        >
          <el-option
            v-for="s in currentTemplateSubOptions"
            :key="s.key"
            :label="s.name"
            :value="s.key"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="模板名称" prop="name">
        <el-input v-model="templateForm.name" placeholder="如：减资公告、发票领购簿遗失声明" />
      </el-form-item>

      <el-form-item label="模板内容" prop="content">
        <el-input
          v-model="templateForm.content"
          type="textarea"
          :rows="6"
          placeholder="填写模板正文，占位符用 {{name}}、{{date}} 等格式"
        />
      </el-form-item>

      <el-form-item label="所属报纸">
        <el-select v-model="templateForm.newspaperId" placeholder="不关联报纸" style="width:100%" filterable clearable>
          <el-option v-for="n in newspapers" :key="n.id" :label="n.name" :value="n.id" />
        </el-select>
      </el-form-item>

      <el-form-item label="简短描述">
        <el-input v-model="templateForm.desc" placeholder="辅助说明" />
      </el-form-item>

      <el-form-item label="配色">
        <el-color-picker v-model="templateForm.color" />
        <span style="margin-left:8px;color:#999;font-size:13px">{{ templateForm.color || '#5B6FE8' }}</span>
      </el-form-item>

      <el-form-item label="示例数据">
        <el-input
          v-model="templateForm.sampleData"
          type="textarea"
          :rows="2"
          placeholder='JSON 格式，如 {"name":"示例公司","date":"2024-01-01"}'
        />
      </el-form-item>

      <el-form-item label="排序">
        <el-input-number v-model="templateForm.sort" :min="0" />
      </el-form-item>
    </el-form>
  </el-dialog>

  <!-- ===== 统一分类/子分类编辑弹窗 ===== -->
  <el-dialog
    v-model="unifiedDialogVisible"
    :title="unifiedTitle"
    width="500px"
    :close-on-click-modal="false"
  >
    <template #footer>
      <el-button @click="unifiedDialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="unifiedSubmitting" @click="saveUnified">保存</el-button>
    </template>

    <!-- 类型切换 -->
    <div class="type-switch">
      <label
        class="type-btn"
        :class="{ active: unifiedType === 'cat' }"
        @click="switchUnifiedType('cat')"
      >
        <input type="radio" name="unifiedType" value="cat" v-model="unifiedType" style="display:none">
        🏷️ 分类
      </label>
      <label
        class="type-btn"
        :class="{ active: unifiedType === 'sub' }"
        @click="switchUnifiedType('sub')"
      >
        <input type="radio" name="unifiedType" value="sub" v-model="unifiedType" style="display:none">
        📁 子分类
      </label>
    </div>

    <el-divider style="margin: 14px 0" />

    <!-- 所属分类（子分类时显示） -->
    <el-form-item label="所属分类" v-if="unifiedType === 'sub'" :required="true">
      <el-select v-model="unifiedForm.catId" placeholder="选择分类" style="width:100%" filterable>
        <el-option v-for="c in categoryList" :key="c.id" :label="c.name" :value="c.id" />
      </el-select>
    </el-form-item>

    <el-form-item label="名称" :required="true">
      <el-input v-model="unifiedForm.name" placeholder="输入名称" />
    </el-form-item>

    <el-form-item label="描述">
      <el-input v-model="unifiedForm.desc" placeholder="简要描述用途" />
    </el-form-item>

    <el-form-item label="配色">
      <div style="display:flex;align-items:center;gap:8px;">
        <el-color-picker v-model="unifiedForm.color" />
        <el-input v-model="unifiedForm.color" style="width:90px" @change="(v:any) => unifiedForm.color = v" />
      </div>
    </el-form-item>

    <el-form-item label="排序">
      <el-input-number v-model="unifiedForm.sort" :min="0" style="width:100px" />
    </el-form-item>
  </el-dialog>

  <!-- ===== 批量改分类弹窗 ===== -->
  <el-dialog
    v-model="batchCatDialogVisible"
    title="批量修改分类"
    width="480px"
  >
    <div class="batch-tip">
      即将修改 <strong>{{ selectedRows.length }}</strong> 条模板的所属分类
    </div>
    <el-form-item label="新的所属分类" :required="true">
      <el-select v-model="batchNewCatId" placeholder="选择新分类" style="width:100%" filterable>
        <el-option v-for="c in categoryList" :key="c.id" :label="c.name" :value="c.id" />
      </el-select>
    </el-form-item>
    <el-form-item label="新的子分组">
      <el-select v-model="batchNewSubKey" placeholder="不选择（清空）" style="width:100%" clearable filterable>
        <el-option
          v-for="s in (categoryList.find(c => c.id === batchNewCatId)?.subTypes || []).map((st: any) => ({ key: st.key, name: st.name }))"
          :key="s.key"
          :label="s.name"
          :value="s.key"
        />
      </el-select>
      <span class="form-hint">选分类后自动筛选子分组</span>
    </el-form-item>
    <template #footer>
      <el-button @click="batchCatDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="confirmBatchCat">确认修改</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ArrowDown } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getNewspapers,
  getTemplates,
  getNewspaperCategories,
  getTemplateMeta,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  updateNewspaperCategory,
  createNewspaperCategory,
} from '@/api'

// ===== 状态 =====
const loading = ref(false)
const categoryList = ref<any[]>([])
const newspapers = ref<any[]>([])
const templates = ref<any[]>([])
const subTypesMap = ref<Record<string, { key: string; name: string }[]>>({})

// ===== 筛选 =====
const filterText = ref('')
const filterCatId = ref('')
const filterSubKey = ref('')
const currentPage = ref(1)
const pageSize = ref(20)

// ===== 选中 =====
const selectedRows = ref<any[]>([])

// ===== 统计 =====
const statTotal = computed(() => displayedTemplates.value.length)
const statOn = computed(() => templates.value.filter(t => t.status === 1).length)
const statOff = computed(() => templates.value.filter(t => t.status === 0).length)
const statNew = ref(0) // 暂无接口，先写死

// ===== categoryNameMap =====
const categoryNameMap = computed(() => {
  const m: Record<string, string> = {}
  for (const c of categoryList.value) m[c.id] = c.name
  return m
})

// 当前分类的子分类下拉选项（工具栏用）
const currentSubOptions = computed(() => {
  if (!filterCatId.value) return []
  const catName = categoryNameMap.value[filterCatId.value] || ''
  return subTypesMap.value[catName] || []
})

// 模板编辑弹窗的子分类选项
const currentTemplateSubOptions = computed(() => {
  if (!templateForm.value.categoryId) return []
  const catName = categoryNameMap.value[templateForm.value.categoryId] || ''
  return subTypesMap.value[catName] || []
})

// ===== 表格数据 =====
const displayedTemplates = computed(() => {
  let list = templates.value
  if (filterCatId.value) list = list.filter(t => t.categoryId === filterCatId.value)
  if (filterSubKey.value) list = list.filter(t => t.templateType === filterSubKey.value)
  if (filterText.value.trim()) {
    const kw = filterText.value.trim().toLowerCase()
    list = list.filter(t => (t.name || '').toLowerCase().includes(kw))
  }
  return list
})

const paginatedTemplates = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return displayedTemplates.value.slice(start, start + pageSize.value)
})

// ===== 模板编辑弹窗 =====
const templateDialogVisible = ref(false)
const isTemplateEdit = ref(false)
const templateFormRef = ref()
const templateSubmitting = ref(false)
const templateForm = ref({
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
const templateRules = {
  name: [{ required: true, message: '请填写模板名称', trigger: 'blur' }],
  categoryId: [{ required: true, message: '请选择所属分类', trigger: 'change' }],
}
const deletingId = ref('')

function openTemplateDialog(mode: 'add' | 'edit', row?: any) {
  isTemplateEdit.value = mode === 'edit'
  if (mode === 'edit' && row) {
    Object.assign(templateForm.value, {
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
    templateForm.value = {
      id: '', name: '', templateType: '',
      newspaperId: '', categoryId: '', content: '',
      sampleData: '', desc: '', color: '#5B6FE8', sort: 0,
    }
  }
  templateDialogVisible.value = true
}

function onTemplateCatChange() {
  templateForm.value.templateType = ''
}

async function submitTemplateForm() {
  const valid = await templateFormRef.value.validate().catch(() => false)
  if (!valid) return
  templateSubmitting.value = true
  try {
    const payload = {
      name: templateForm.value.name,
      categoryId: templateForm.value.categoryId,
      templateType: templateForm.value.templateType || null,
      newspaperId: templateForm.value.newspaperId || null,
      content: templateForm.value.content || null,
      sampleData: templateForm.value.sampleData || null,
      desc: templateForm.value.desc || null,
      color: templateForm.value.color || null,
      sort: templateForm.value.sort ?? 0,
    }
    if (isTemplateEdit.value) {
      await updateTemplate(templateForm.value.id, payload)
      ElMessage.success('保存成功')
    } else {
      await createTemplate(payload)
      ElMessage.success('添加成功')
    }
    templateDialogVisible.value = false
    await reloadTemplates()
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  } finally {
    templateSubmitting.value = false
  }
}

async function doDelete(row: any) {
  await ElMessageBox.confirm(`确认删除模板「${row.name}」？`, '提示')
  deletingId.value = row.id
  try {
    await deleteTemplate(row.id)
    ElMessage.success('删除成功')
    await reloadTemplates()
  } catch (e: any) {
    ElMessage.error(e?.data?.message || e?.message || '删除失败')
  } finally {
    deletingId.value = ''
  }
}

async function updateStatus(row: any) {
  try {
    await updateTemplate(row.id, { status: row.status })
    ElMessage.success('状态已更新')
  } catch (e: any) {
    ElMessage.error('更新失败')
    row.status = row.status === 1 ? 0 : 1 // 回滚
  }
}

// ===== 统一分类/子分类编辑弹窗 =====
const unifiedDialogVisible = ref(false)
const unifiedType = ref<'cat' | 'sub'>('cat')
const unifiedSubmitting = ref(false)
const unifiedForm = ref({
  catId: '',
  name: '',
  desc: '',
  color: '#5B6FE8',
  sort: 0,
})

const unifiedTitle = computed(() => {
  return unifiedType.value === 'cat' ? '添加分类' : '添加子分类'
})

function switchUnifiedType(type: 'cat' | 'sub') {
  unifiedType.value = type
  unifiedForm.value = { catId: '', name: '', desc: '', color: '#5B6FE8', sort: 0 }
}

async function saveUnified() {
  if (!unifiedForm.value.name.trim()) {
    ElMessage.warning('请填写名称')
    return
  }
  if (unifiedType.value === 'sub' && !unifiedForm.value.catId) {
    ElMessage.warning('请选择所属分类')
    return
  }

  unifiedSubmitting.value = true
  try {
    if (unifiedType.value === 'cat') {
      // 添加分类
      await createNewspaperCategory({
        name: unifiedForm.value.name.trim(),
        desc: unifiedForm.value.desc || null,
        color: unifiedForm.value.color || '#5B6FE8',
        sort: unifiedForm.value.sort ?? 0,
      })
      ElMessage.success('分类添加成功')
    } else {
      // 添加子分类 → 更新该分类的 subTypes
      const cat = categoryList.value.find(c => c.id === unifiedForm.value.catId)
      if (!cat) throw new Error('分类不存在')
      const existing = cat.subTypes || []
      const newSub = {
        key: 'new_' + Date.now(),
        name: unifiedForm.value.name.trim(),
        desc: unifiedForm.value.desc || null,
        color: unifiedForm.value.color || '#5B6FE8',
        sort: unifiedForm.value.sort ?? 0,
        hot: false,
      }
      await updateNewspaperCategory(unifiedForm.value.catId, {
        name: cat.name,
        sub_types: [...existing, newSub],
      })
      ElMessage.success('子分类添加成功')
    }
    unifiedDialogVisible.value = false
    await reloadAll()
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  } finally {
    unifiedSubmitting.value = false
  }
}

// ===== 批量改分类 =====
const batchCatDialogVisible = ref(false)
const batchNewCatId = ref('')
const batchNewSubKey = ref('')

function openBatchCatModal() {
  if (selectedRows.value.length === 0) return
  batchNewCatId.value = ''
  batchNewSubKey.value = ''
  batchCatDialogVisible.value = true
}

async function confirmBatchCat() {
  if (!batchNewCatId.value) {
    ElMessage.warning('请选择新分类')
    return
  }
  try {
    const promises = selectedRows.value.map(row =>
      updateTemplate(row.id, {
        categoryId: batchNewCatId.value,
        templateType: batchNewSubKey.value || null,
      })
    )
    await Promise.all(promises)
    ElMessage.success(`已修改 ${selectedRows.value.length} 条模板的分类`)
    batchCatDialogVisible.value = false
    selectedRows.value = []
    await reloadTemplates()
  } catch (e: any) {
    ElMessage.error(e?.message || '批量修改失败')
  }
}

async function batchDelete() {
  if (selectedRows.value.length === 0) return
  await ElMessageBox.confirm(`确认删除选中的 ${selectedRows.value.length} 条模板？`, '批量删除')
  try {
    const promises = selectedRows.value.map(row => deleteTemplate(row.id))
    await Promise.all(promises)
    ElMessage.success('批量删除成功')
    selectedRows.value = []
    await reloadTemplates()
  } catch (e: any) {
    ElMessage.error(e?.message || '批量删除失败')
  }
}

// ===== 事件 =====
function handleAddCommand(cmd: string) {
  if (cmd === 'template') {
    openTemplateDialog('add')
  } else if (cmd === 'cat') {
    unifiedType.value = 'cat'
    unifiedForm.value = { catId: '', name: '', desc: '', color: '#5B6FE8', sort: 0 }
    unifiedDialogVisible.value = true
  }
}

function handleSearch() {
  currentPage.value = 1
}

function handleCatChange() {
  filterSubKey.value = ''
  currentPage.value = 1
}

function handleSubChange() {
  currentPage.value = 1
}

function handlePageChange() {
  document.querySelector('.page-card')?.scrollTo({ top: 0, behavior: 'smooth' })
}

function handleSizeChange() {
  currentPage.value = 1
}

function onTableSelectionChange(rows: any[]) {
  selectedRows.value = rows
}

function clearFilterCat() { filterCatId.value = ''; filterSubKey.value = ''; currentPage.value = 1 }
function clearFilterSub() { filterSubKey.value = ''; currentPage.value = 1 }
function clearFilterText() { filterText.value = ''; currentPage.value = 1 }
function clearAllFilters() { filterCatId.value = ''; filterSubKey.value = ''; filterText.value = ''; currentPage.value = 1 }

// ===== 子分类名称查找 =====
function subTypeName(key: string): string {
  if (!key) return ''
  for (const arr of Object.values(subTypesMap.value)) {
    const found = (arr as any[]).find(s => s.key === key)
    if (found) return found.name
  }
  return key
}

// ===== 数据加载 =====
function normalize(res: any): any[] {
  if (!res) return []
  if (Array.isArray(res)) return res
  return (res as any)?.list || (res as any)?.value || (res as any)?.data || []
}

async function reloadTemplateMeta() {
  const mRes: any = await getTemplateMeta()
  if (mRes && typeof mRes === 'object') {
    subTypesMap.value = mRes.subTypes || {}
  }
}

async function reloadCategories() {
  const res = await getNewspaperCategories()
  categoryList.value = normalize(res)
}

async function reloadNewspapers() {
  const res = await getNewspapers()
  newspapers.value = normalize(res)
}

async function reloadTemplates() {
  loading.value = true
  try {
    const list = normalize(await getTemplates())
    templates.value = list
  } finally {
    loading.value = false
  }
}

async function reloadAll() {
  loading.value = true
  try {
    const [nRes, cRes, mRes, tRes] = await Promise.all([
      getNewspapers(),
      getNewspaperCategories(),
      getTemplateMeta(),
      getTemplates(),
    ])
    newspapers.value = normalize(nRes)
    categoryList.value = normalize(cRes)
    const mAny = mRes as any
    subTypesMap.value = mAny?.subTypes || {}
    templates.value = normalize(tRes)
  } finally {
    loading.value = false
  }
}

watch(filterText, () => handleSearch())

onMounted(async () => {
  await reloadAll()
})
</script>

<style scoped lang="scss">
.page-wrapper {
  padding: 0;
}

.page-header {
  margin-bottom: 16px;
  h2 {
    font-size: 16px;
    font-weight: 600;
    color: #1f1f1f;
    margin: 0;
  }
}

.page-card {
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
}

/* 统计卡片 */
.stats-row {
  display: flex;
  gap: 12px;
  padding: 14px 16px;
  background: linear-gradient(135deg, #fafbfc 0%, #f5f7fa 100%);
  border-bottom: 1px solid #f0f0f0;
}

.stat-card {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 8px;
  color: #fff;
  min-width: 0;
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: rgba(255,255,255,.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.stat-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.stat-label {
  font-size: 12px;
  opacity: .9;
  margin-bottom: 2px;
}

.stat-num {
  font-size: 24px;
  font-weight: 700;
  line-height: 1;
}

.stat-blue  { background: linear-gradient(135deg, #5B6FE8, #7B8FFF); }
.stat-green { background: linear-gradient(135deg, #52c41a, #73d13d); }
.stat-orange{ background: linear-gradient(135deg, #faad14, #ffc53d); color: #fff; }
.stat-red   { background: linear-gradient(135deg, #ff4d4f, #ff7875); }

/* 工具栏 */
.toolbar-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  flex-wrap: wrap;
}

/* 批量选中条 */
.selection-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #f0f5ff;
  border-bottom: 1px solid #e8e8ff;
  font-size: 13px;
  color: #5B6FE8;
}

/* 筛选标签 */
.filter-tags {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 16px;
  border-bottom: 1px solid #f0f0f0;
}

/* 表格 */
.name-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
}

.name-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.preview-text {
  display: block;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #999;
  font-size: 12px;
}

.action-btns { display: flex; gap: 4px; }

.pagination-wrap {
  display: flex;
  justify-content: center;
  padding: 16px 0 8px;
}

/* 统一编辑弹窗 */
.type-switch {
  display: flex;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  overflow: hidden;
  width: fit-content;
  margin-bottom: 0;
}

.type-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 18px;
  font-size: 13px;
  color: #666;
  cursor: pointer;
  transition: all .15s;
  user-select: none;

  &:hover { background: #f5f7ff; }
  &.active {
    background: #5B6FE8;
    color: #fff;
    &:hover { background: #4a5fd6; }
  }
}

/* 批量提示 */
.batch-tip {
  padding: 12px 16px;
  background: #f0f5ff;
  border-radius: 6px;
  font-size: 13px;
  color: #5B6FE8;
  margin-bottom: 16px;
}

.form-hint {
  font-size: 11px;
  color: #999;
  margin-top: 4px;
  display: block;
}
</style>
