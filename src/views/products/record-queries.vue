<template>
  <div>
    <div class="page-header">
      <h2>刻章备案查询</h2>
      <div class="header-actions">
        <el-input
          v-model="keyword"
          placeholder="搜索省份名称"
          clearable
          style="width: 200px; margin-right: 12px"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-button type="primary" @click="showDialog('add')">添加省份</el-button>
      </div>
    </div>

    <div class="page-card">
      <el-table :data="displayRecords" v-loading="loading" stripe>
        <el-table-column prop="sort" label="排序" width="80">
          <template #default="{ row }">
            <span class="sort-badge">{{ row.sort ?? 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="省份名称" width="140">
          <template #default="{ row }">
            <span class="province-tag">{{ row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="platformName" label="平台名称" min-width="200">
          <template #default="{ row }">
            <span class="platform-text">{{ parseDesc(row.description).platformName }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="url" label="查询网址" min-width="300">
          <template #default="{ row }">
            <a
              v-if="parseDesc(row.description).url"
              :href="parseDesc(row.description).url"
              target="_blank"
              rel="noopener noreferrer"
              class="url-link"
            >
              {{ parseDesc(row.description).url }}
            </a>
            <span v-else class="empty-url">—</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="showDialog('edit', row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="table-footer">
        共 {{ records.length }} 个省份
      </div>
    </div>

    <!-- 添加/编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑省份' : '添加省份'" width="520px">
      <el-form :model="form" label-width="100px" ref="formRef" :rules="formRules">
        <el-form-item label="省份名称" prop="name" required>
          <el-input v-model="form.name" placeholder="如：四川省" />
        </el-form-item>
        <el-form-item label="平台名称" prop="platformName" required>
          <el-input v-model="form.platformName" placeholder="如：四川省印章查询平台" />
        </el-form-item>
        <el-form-item label="查询网址" prop="url" required>
          <el-input v-model="form.url" placeholder="如：https://yzcx.sczwfw.gov.cn/" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" :max="999" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { getRecordQueries, createRecordQuery, updateRecordQuery, deleteRecordQuery } from '@/api'

interface RecordQuery {
  id: string
  name: string
  description: string
  sort: number
}

const loading = ref(false)
const saving = ref(false)
const records = ref<RecordQuery[]>([])
const keyword = ref('')
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()

// 解析 description = "平台名称\nURL"
function parseDesc(desc: string): { platformName: string; url: string } {
  if (!desc) return { platformName: '', url: '' }
  const [platformName = '', ...urlParts] = desc.split('\n')
  return {
    platformName: platformName.trim(),
    url: urlParts.join('\n').trim(),
  }
}

// 构建 description
function buildDesc(platformName: string, url: string): string {
  if (!platformName && !url) return ''
  return `${platformName}\n${url}`
}

// 表单
const form = ref({
  id: '',
  name: '',
  platformName: '',
  url: '',
  sort: 0,
})

const formRules = {
  name: [{ required: true, message: '请输入省份名称', trigger: 'blur' }],
  platformName: [{ required: true, message: '请输入平台名称', trigger: 'blur' }],
  url: [
    { required: true, message: '请输入查询网址', trigger: 'blur' },
    {
      pattern: /^https?:\/\/.+/,
      message: '网址必须以 http:// 或 https:// 开头',
      trigger: 'blur',
    },
  ],
}

const displayRecords = computed(() => {
  if (!keyword.value.trim()) return records.value
  const kw = keyword.value.trim().toLowerCase()
  return records.value.filter((r) => r.name.toLowerCase().includes(kw))
})

async function fetchRecords() {
  loading.value = true
  try {
    const data = await getRecordQueries()
    records.value = Array.isArray(data) ? data : []
  } catch {
    records.value = []
  } finally {
    loading.value = false
  }
}

function showDialog(type: 'add' | 'edit', row?: RecordQuery) {
  isEdit.value = type === 'edit'
  if (type === 'edit' && row) {
    const parsed = parseDesc(row.description)
    form.value = {
      id: row.id,
      name: row.name,
      platformName: parsed.platformName,
      url: parsed.url,
      sort: row.sort ?? 0,
    }
  } else {
    form.value = { id: '', name: '', platformName: '', url: '', sort: 0 }
  }
  dialogVisible.value = true
  nextTick(() => formRef.value?.clearValidate())
}

async function handleSave() {
  form.value.name = form.value.name.trim()
  form.value.platformName = form.value.platformName.trim()
  form.value.url = form.value.url.trim()
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  const duplicate = records.value.some((record) =>
    record.id !== form.value.id && record.name.trim().toLowerCase() === form.value.name.toLowerCase()
  )
  if (duplicate) {
    ElMessage.warning('该省份已存在，请勿重复添加')
    return
  }

  saving.value = true
  try {
    const payload = {
      name: form.value.name,
      description: buildDesc(form.value.platformName, form.value.url),
      sort: form.value.sort,
    }
    if (isEdit.value) {
      await updateRecordQuery(form.value.id, payload)
      ElMessage.success('更新成功')
    } else {
      await createRecordQuery(payload)
      ElMessage.success('添加成功')
    }
    dialogVisible.value = false
    await fetchRecords()
  } catch {
    // 接口错误由全局响应拦截器统一提示
  } finally {
    saving.value = false
  }
}

async function handleDelete(row: RecordQuery) {
  try {
    await ElMessageBox.confirm(`确定删除「${row.name}」吗？`, '确认删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await deleteRecordQuery(row.id)
    ElMessage.success('删除成功')
    await fetchRecords()
  } catch {
    // 用户取消
  }
}

onMounted(fetchRecords)
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.header-actions {
  display: flex;
  align-items: center;
}

.page-card {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
}

.sort-badge {
  display: inline-block;
  background: #f0f2f5;
  color: #909399;
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 12px;
}

.province-tag {
  font-weight: 600;
  color: #409eff;
}

.platform-text {
  color: #303133;
}

.url-link {
  color: #409eff;
  text-decoration: none;
  word-break: break-all;
  font-size: 13px;
}

.url-link:hover {
  text-decoration: underline;
}

.empty-url {
  color: #c0c4cc;
}

.table-footer {
  margin-top: 12px;
  text-align: right;
  font-size: 13px;
  color: #909399;
}
</style>
