<template>
  <div class="page-wrapper">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2><el-icon><List /></el-icon> 公告模板管理</h2>
    </div>

    <div class="page-card">

      <!-- 统计卡片 -->
      <div class="summary-grid">
        <div class="summary-card summary-total">
          <div class="card-icon">📋</div>
          <div class="card-body">
            <div class="sum-value">{{ statTotal }}</div>
            <div class="sum-label">模板总数</div>
          </div>
        </div>
        <div class="summary-card summary-active">
          <div class="card-icon">✅</div>
          <div class="card-body">
            <div class="sum-value">{{ statOn }}</div>
            <div class="sum-label">启用中</div>
          </div>
        </div>
        <div class="summary-card summary-orders">
          <div class="card-icon">⏸</div>
          <div class="card-body">
            <div class="sum-value">{{ statOff }}</div>
            <div class="sum-label">已停用</div>
          </div>
        </div>
        <div class="summary-card summary-pending">
          <div class="card-icon">🆕</div>
          <div class="card-body">
            <div class="sum-value">{{ statNew }}</div>
            <div class="sum-label">本月新增</div>
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
          filterable
          :filter-method="() => {}"
          style="width: 200px"
          @change="handleSubChange"
        >
          <el-option label="全部子分组" value="" />
          <el-option
            v-for="s in currentSubOptions"
            :key="s.key"
            :label="s.label"
            :value="s.key"
          />
        </el-select>

        <div style="flex:1"></div>

        <!-- + 添加下拉 -->
        <el-dropdown trigger="click" @command="handleAddCommand">
          <el-button type="primary">
            <el-icon><Plus /></el-icon> 添加 <el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="template">
                <span><el-icon><Document /></el-icon></span> 添加模板
              </el-dropdown-item>
              <el-dropdown-item command="divider" divided disabled />
              <el-dropdown-item command="cat">
                <span><el-icon><PriceTag /></el-icon>️</span> 添加分类
              </el-dropdown-item>
              <el-dropdown-item command="subs">
                <span><el-icon><FolderOpened /></el-icon></span> 管理子分类
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

      </div>

      <!-- 批量选中条 -->
      <div class="selection-bar" v-show="selectedRows.length > 0">
        <span>已选 <strong>{{ selectedRows.length }}</strong> 条</span>
        <el-divider direction="vertical" />
        <el-button size="small" @click="openBatchCatModal"><el-icon><PriceTag /></el-icon>️ 改分类</el-button>
        <el-button size="small" type="danger" @click="batchDelete"><el-icon><Delete /></el-icon> 删除</el-button>
        <el-button size="small" text type="info" style="margin-left:auto;" @click="selectedRows = []">取消选择</el-button>
      </div>

      <!-- 筛选标签 -->
      <div class="filter-tags" v-show="filterCatId || filterSubKey || filterText">
        <span style="font-size:12px;color:#999;margin-right:6px;">当前筛选：</span>
        <el-tag v-if="filterCatId" closable size="small" @close="clearFilterCat">
          分类：{{ categoryNameMap[filterCatId] }}
        </el-tag>
        <el-tag v-if="filterSubKey" closable size="small" @close="clearFilterSub">
          子分组：{{ subTypeName(filterSubKey, categoryNameMap[filterCatId]) }}
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
            <span v-if="row.templateType" style="color:#555;font-size:13px">{{ subTypeName(row.templateType, row.newspaperCategories?.name) }}</span>
            <span v-else style="color:#ccc">—</span>
          </template>
        </el-table-column>

        <el-table-column label="内容预览" min-width="200">
          <template #default="{ row }">
            <el-tooltip :content="row.content || '（空）'" placement="top" :show-after="300">
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
        <el-icon><PriceTag /></el-icon>️ 分类
      </label>
      <label
        class="type-btn"
        :class="{ active: unifiedType === 'sub' }"
        @click="switchUnifiedType('sub')"
      >
        <input type="radio" name="unifiedType" value="sub" v-model="unifiedType" style="display:none">
        <el-icon><FolderOpened /></el-icon> 子分类
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
      <el-select v-model="batchNewCatId" placeholder="选择新分类" style="width:100%" filterable @change="batchNewSubKey = ''">
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

  <!-- ===== 子分类管理弹窗 ===== -->
  <el-dialog
    v-model="subsDialogVisible"
    width="760px"
    :close-on-click-modal="false"
  >
    <template #header>
      <div style="display:flex;align-items:center;gap:6px;font-weight:600">
        <el-icon><FolderOpened /></el-icon>
        <span>子分类管理</span>
      </div>
    </template>
    <el-form label-width="80px">
      <el-form-item label="所属分类" :required="true">
        <el-select v-model="subsCatId" placeholder="选择分类" style="width:100%" filterable @change="onSubsCatChange">
          <el-option v-for="c in categoryList" :key="c.id" :label="c.name" :value="c.id" />
        </el-select>
      </el-form-item>
    </el-form>

    <el-table :data="editSubs" border size="small" max-height="400">
      <el-table-column label="排序" width="80">
        <template #default="{ $index }">
          <el-input-number
            v-model="editSubs[$index].sort"
            :min="0" :max="999"
            size="small" controls-position="right"
            style="width:64px"
          />
        </template>
      </el-table-column>
      <el-table-column label="Key" width="170">
        <template #default="{ row }">
          <el-input v-model="row.key" size="small" placeholder="英文标识" />
        </template>
      </el-table-column>
      <el-table-column label="名称" min-width="150">
        <template #default="{ row }">
          <el-input v-model="row.name" size="small" placeholder="显示名称" />
        </template>
      </el-table-column>
      <el-table-column label="颜色" width="90">
        <template #default="{ row }">
          <el-color-picker v-model="row.color" size="small" />
        </template>
      </el-table-column>
      <el-table-column label="热门" width="60">
        <template #default="{ row }">
          <el-checkbox v-model="row.hot" />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="70" align="center">
        <template #default="{ $index }">
          <el-button type="danger" size="small" icon="el-icon-delete" @click="removeSub($index)" />
        </template>
      </el-table-column>
    </el-table>

    <div style="margin-top:12px;display:flex;align-items:center;gap:12px;">
      <el-button type="primary" plain size="small" @click="addSub">+ 添加子分类</el-button>
      <span style="font-size:12px;color:#999;">共 {{ editSubs.length }} 个子分类</span>
      <div style="flex:1"></div>
      <el-button @click="subsDialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="subsSaving" @click="saveSubs">保存修改</el-button>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ArrowDown } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getNewspapers,
  getAdminTemplates,
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
const templatesTotal = ref(0)
const subTypesMap = ref<Record<string, { key: string; name: string }[]>>({})

// templateType key → 中文标签（兜底用，subTypesMap 为空时生效）
const TEMPLATE_TYPE_LABELS: Record<string, string> = {
  company: "公司公告", idcard: "身份证类", invoice: "发票收据",
  administrative_licensing: "行政许可", land_expropriation: "土地征收",
  prosecutorial: "检察公告", tax_notice: "税务通知",
  admin_punish_gov: "政府行政处罚", customs_notice: "海关通知",
  estate: "房产公告", labor_arb: "劳动仲裁", stamp_cert: "印章证书",
  debt: "债权债务", env_acceptance: "环保验收", env_impact: "环境影响评价",
  license_qualification: "资质许可", personal: "个人证件",
  planning_permit: "规划许可", seal: "印章公告",
  admin_punishment: "行政处罚", admin_regulation: "行政监管",
  arbitration_service: "仲裁服务", bankruptcy_liquidation: "破产清算",
  civil_dispute: "民事纠纷", clean_production: "清洁生产",
  compensation_claim: "赔偿请求", contract_agreement: "合同协议",
  debt_collect: "催款公告", emission_permit: "排放许可",
  judicial_auction: "司法拍卖", lost: "遗失声明",
  notary_testament: "公证遗嘱", search_people: "寻人启事",
  vehicle: "车辆公告", corporate: "企业公告", notary: "公证公告",
  other: "其他", property: "物业公告", stock: "股权公告",
  asset: "资产公告", debt_cleanup: "债务清算", debt_transfer: "债务转让",
  employee: "员工公告", engineering_lease: "工程租赁",
  finance_release: "财务发布", general: "一般公告",
  government: "政府公告", judicial: "司法公告",
  labor_dismissal: "劳动解聘", labor_wage: "劳动工资",
  loan_default: "贷款违约", online: "网络公告",
  procurement_supplier: "采购供应", product: "产品公告",
  recruitment_general: "招聘公告", unit: "单位公告",
}

// ===== 筛选 =====
const filterText = ref('')
const filterCatId = ref('')
const filterSubKey = ref('')
const currentPage = ref(1)
const pageSize = ref(20)

// ===== 选中 =====
const selectedRows = ref<any[]>([])

// ===== 统计 =====
const statTotal = computed(() => templatesTotal.value || templates.value.length)
const statOn = computed(() => templates.value.filter(t => t.status === 1).length)
const statOff = computed(() => templates.value.filter(t => t.status === 0).length)
const statNew = computed(() => {
  const now = new Date()
  return templates.value.filter((template) => {
    if (!template.createdAt) return false
    const createdAt = new Date(template.createdAt)
    return createdAt.getFullYear() === now.getFullYear() && createdAt.getMonth() === now.getMonth()
  }).length
})

// ===== categoryNameMap =====
const categoryNameMap = computed(() => {
  const m: Record<string, string> = {}
  for (const c of categoryList.value) m[c.id] = c.name
  return m
})

// 当前分类的子分类下拉选项（工具栏用）
// 优先从 subTypesMap 取（有子分组数据时）；否则从已加载模板的 templateType 动态生成
const currentSubOptions = computed(() => {
  const catName = filterCatId.value ? (categoryNameMap.value[filterCatId.value] || '') : ''
  // 有子分组数据时走原有逻辑
  if (catName && subTypesMap.value[catName]?.length) {
    return subTypesMap.value[catName].map(s => ({ ...s, label: s.name }))
  }
  if (!filterCatId.value && Object.values(subTypesMap.value).some(a => a.length)) {
    const all = []
    const seen = new Set()
    for (const [cName, subs] of Object.entries(subTypesMap.value)) {
      for (const s of (subs as any[])) {
        if (!seen.has(s.key)) { seen.add(s.key); all.push({ ...s, label: `${s.name} (${cName})` }) }
      }
    }
    return all.sort((a, b) => a.name.localeCompare(b.name, 'zh'))
  }
  // 无子分组数据：从已加载模板动态生成（去重，带中文标签）
  const usedKeys = new Set<string>()
  const result: { key: string; name: string; label: string }[] = []
  for (const t of templates.value) {
    if (t.templateType && !usedKeys.has(t.templateType)) {
      usedKeys.add(t.templateType)
      const label = TEMPLATE_TYPE_LABELS[t.templateType] || t.templateType
      result.push({ key: t.templateType, name: label, label })
    }
  }
  return result.sort((a, b) => a.name.localeCompare(b.name, 'zh'))
})

// 模板编辑弹窗的子分类选项（优先 subTypesMap；无数据时从已加载模板动态生成）
const currentTemplateSubOptions = computed(() => {
  if (templateForm.value.categoryId) {
    const catName = categoryNameMap.value[templateForm.value.categoryId] || ''
    if (subTypesMap.value[catName]?.length) return subTypesMap.value[catName]
  }
  // 无子分组数据：动态从已加载模板生成
  const usedKeys = new Set<string>()
  const result: { key: string; name: string }[] = []
  for (const t of templates.value) {
    if (t.templateType && !usedKeys.has(t.templateType)) {
      usedKeys.add(t.templateType)
      result.push({ key: t.templateType, name: TEMPLATE_TYPE_LABELS[t.templateType] || t.templateType })
    }
  }
  return result.sort((a, b) => a.name.localeCompare(b.name, 'zh'))
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
      content: templateForm.value.content || '',
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
  } catch {
    // 接口错误由全局响应拦截器统一提示
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
  } catch {
    // 接口错误由全局响应拦截器统一提示
  } finally {
    deletingId.value = ''
  }
}

async function updateStatus(row: any) {
  try {
    await updateTemplate(row.id, { status: row.status })
    ElMessage.success('状态已更新')
  } catch {
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
        icon: unifiedForm.value.desc || null,
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
        subTypes: [...existing, newSub],
      })
      ElMessage.success('子分类添加成功')
    }
    unifiedDialogVisible.value = false
    await reloadAll()
  } catch {
    // 接口错误由全局响应拦截器统一提示
  } finally {
    unifiedSubmitting.value = false
  }
}

// ===== 子分类管理弹窗 =====
const subsDialogVisible = ref(false)
const subsCatId = ref('')
const editSubs = ref<any[]>([])
const subsSaving = ref(false)

function openSubsDialog() {
  // 默认选中当前筛选分类，否则第一个分类
  subsCatId.value = filterCatId.value || categoryList.value[0]?.id || ''
  syncEditSubs()
  subsDialogVisible.value = true
}

function syncEditSubs() {
  const cat = categoryList.value.find(c => c.id === subsCatId.value)
  editSubs.value = (cat?.subTypes || []).map((s: any) => ({ ...s }))
}

function onSubsCatChange() {
  syncEditSubs()
}

function addSub() {
  editSubs.value.push({
    key: 'new_' + Date.now(),
    name: '新子分类',
    color: '#5B6FE8',
    hot: false,
    sort: editSubs.value.length,
  })
}

function removeSub(index: number) {
  editSubs.value.splice(index, 1)
}

async function saveSubs() {
  const cat = categoryList.value.find(c => c.id === subsCatId.value)
  if (!cat) {
    ElMessage.warning('请先选择分类')
    return
  }
  const keys = editSubs.value.map(s => s.key)
  if (new Set(keys).size !== keys.length) {
    ElMessage.warning('Key 不能重复')
    return
  }
  subsSaving.value = true
  try {
    await updateNewspaperCategory(subsCatId.value, {
      name: cat.name,
      subTypes: editSubs.value,
    })
    ElMessage.success('保存成功')
    await reloadAll()
    syncEditSubs()
  } catch {
    // 接口错误由全局响应拦截器统一提示
  } finally {
    subsSaving.value = false
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
  } catch {
    // 接口错误由全局响应拦截器统一提示
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
  } catch {
    // 接口错误由全局响应拦截器统一提示
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
  } else if (cmd === 'subs') {
    openSubsDialog()
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

// ===== 子分类名称查找（按分类优先，避免跨分类同名 key 错配） =====
function subTypeName(key: string, catName?: string): string {
  if (!key) return ''
  // 1. 指定分类内精确查找
  if (catName && subTypesMap.value[catName]) {
    const found = (subTypesMap.value[catName] as any[]).find(s => s.key === key)
    if (found) return found.name
  }
  // 2. 全局兜底（兼容无分类上下文）
  for (const arr of Object.values(subTypesMap.value)) {
    const found = (arr as any[]).find(s => s.key === key)
    if (found) return found.name
  }
  // 3. 中文映射兜底
  return TEMPLATE_TYPE_LABELS[key] || key
}

// ===== 数据加载 =====
// 统一数据提取：支持数组/{list}/{data}/单个对象
function normalize(res: any): any[] {
  if (!res) return []
  if (Array.isArray(res)) return res
  return (res as any)?.list ?? (res as any)?.data ?? (res as any)?.value ?? []
}

async function reloadTemplateMeta() {
  const mRes: any = await getTemplateMeta()
  // getTemplateMeta 返回 {businessTypes, subTypes}（无包装，businessTypes 是数组字段名非分页结构）
  if (mRes && typeof mRes === 'object' && !Array.isArray(mRes)) {
    subTypesMap.value = mRes.subTypes || {}
  }
}

async function reloadCategories() {
  const res = await getNewspaperCategories()
  categoryList.value = normalize(res)
}

async function reloadNewspapers() {
  const res = await getNewspapers()
  // getNewspapers 返回 {list, total}（拦截器不剥包），取 .list
  newspapers.value = Array.isArray(res) ? res : ((res as any)?.list || [])
}

async function reloadTemplates() {
  loading.value = true
  try {
    const tRaw = await getAdminTemplates({ page: 1, pageSize: 500 })
    const list = normalize(tRaw)
    templates.value = list
    templatesTotal.value = (tRaw as any)?.total ?? list.length
  } finally {
    loading.value = false
  }
}

async function reloadAll() {
  loading.value = true
  try {
    const [nRaw, cRes, mRaw, tRaw] = await Promise.all([
      getNewspapers(),
      getNewspaperCategories(),
      getTemplateMeta(),
      getAdminTemplates({ page: 1, pageSize: 500 }),
    ])
    // getNewspapers 返回 {list,total}，getTemplateMeta 返回 {businessTypes, subTypes}（均无包装）
    const nRes = nRaw as any
    newspapers.value = Array.isArray(nRes) ? nRes : (nRes?.list || [])
    categoryList.value = normalize(cRes)
    if (mRaw && typeof mRaw === 'object' && !Array.isArray(mRaw)) {
      subTypesMap.value = (mRaw as any).subTypes || {}
    } else {
      subTypesMap.value = {}
    }
    templates.value = normalize(tRaw)
    templatesTotal.value = (tRaw as any)?.total ?? templates.value.length
  } catch (e: any) {
    console.error('reloadAll error:', e)
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

/* 统计卡片 — 与网点总览统一风格 */
.summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
.summary-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px 24px;
  display: flex;
  align-items: center;
  gap: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
  &:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1); }
  .card-icon { width: 56px; height: 56px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 26px; flex-shrink: 0; }
  .card-body { flex: 1; min-width: 0; }
  .sum-value { font-size: 30px; font-weight: 800; line-height: 1; }
  .sum-label { font-size: 13px; color: #888; margin-top: 4px; }
}
// 模板总数 — 紫蓝
.summary-total { background: linear-gradient(135deg, #eef2ff 0%, #dde4ff 100%); border: 1px solid rgba(91, 111, 232, 0.15); .card-icon { background: rgba(91, 111, 232, 0.12); color: #5B6FE8; } .sum-value { color: #3d4fc4; } }
// 启用中 — 清新绿
.summary-active { background: linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%); border: 1px solid rgba(82, 196, 26, 0.15); .card-icon { background: rgba(82, 196, 26, 0.12); color: #52c41a; } .sum-value { color: #389e0d; } }
// 已停用 — 活力橙
.summary-orders { background: linear-gradient(135deg, #fff7e6 0%, #ffe8c2 100%); border: 1px solid rgba(250, 140, 22, 0.15); .card-icon { background: rgba(250, 140, 22, 0.12); color: #fa8c16; } .sum-value { color: #c87619; } }
// 本月新增 — 警示红
.summary-pending { background: linear-gradient(135deg, #fff1f0 0%, #ffccc7 100%); border: 1px solid rgba(245, 34, 45, 0.15); .card-icon { background: rgba(245, 34, 45, 0.12); color: #f5222d; } .sum-value { color: #cf1322; } }

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
