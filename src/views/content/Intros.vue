<template>
  <div>
    <div class="page-header">
      <h2>业务介绍管理</h2>
      <el-button type="primary" @click="openDialog()">新增介绍</el-button>
    </div>
    <div class="page-card">
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="sort" label="排序" width="80" />
        <el-table-column label="图片" width="180">
          <template #default="{ row }">
            <el-image v-if="row.image" :src="row.image" style="width: 160px; height: 90px; border-radius: 4px" :preview-src-list="[row.image]" fit="cover" />
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
        <el-table-column prop="subtitle" label="副标题" min-width="200" show-overflow-tooltip />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">
              {{ row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="openDialog(row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑业务介绍' : '新增业务介绍'" width="560px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="标题">
          <el-input v-model="form.title" placeholder="如：官方备案" />
        </el-form-item>
        <el-form-item label="副标题">
          <el-input v-model="form.subtitle" type="textarea" :rows="3" placeholder="介绍文案" />
        </el-form-item>
        <el-form-item label="宣传图片">
          <el-upload :action="'/api/upload/seal'" :show-file-list="false" :on-success="handleUploadSuccess" :before-upload="beforeUpload" accept="image/*">
            <el-button>选择图片</el-button>
          </el-upload>
          <el-image v-if="form.image" :src="form.image" style="width: 200px; margin-top: 8px; border-radius: 4px" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.status" :active-value="1" :inactive-value="0" active-text="启用" inactive-text="禁用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/api'
import { formatDate } from '@/utils/format'

const loading = ref(false)
const saving = ref(false)
const list = ref([])
const dialogVisible = ref(false)

const form = reactive({ id: null, title: '', subtitle: '', image: '', sort: 0, status: 1 })

async function loadList() {
  loading.value = true
  try {
    const res = await request.get('/content/intros')
    list.value = res.list || []
  } catch { /* ignore */ } finally { loading.value = false }
}

function openDialog(row) {
  if (row) Object.assign(form, row)
  else Object.assign(form, { id: null, title: '', subtitle: '', image: '', sort: 0, status: 1 })
  dialogVisible.value = true
}

function beforeUpload(file) {
  if (file.size > 2 * 1024 * 1024) { ElMessage.error('图片不能超过 2MB'); return false }
  return true
}

function handleUploadSuccess(res) {
  if (res.url) form.image = res.url
  else ElMessage.error('上传失败')
}

async function handleSave() {
  saving.value = true
  try {
    if (form.id) await request.put(`/content/intros/${form.id}`, form)
    else await request.post('/content/intros', form)
    ElMessage.success('保存成功')
    dialogVisible.value = false
    loadList()
  } catch (e) { ElMessage.error(e.message || '保存失败') } finally { saving.value = false }
}

async function handleDelete(row) {
  await ElMessageBox.confirm(`确定删除「${row.title}」吗？`, '提示', { type: 'warning' })
  try {
    await request.delete(`/content/intros/${row.id}`)
    ElMessage.success('删除成功')
    loadList()
  } catch (e) { ElMessage.error(e.message || '删除失败') }
}

onMounted(loadList)
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h2 { margin: 0; font-size: 22px; font-weight: 600; }
.page-card { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
</style>