<template>
  <div>
    <div class="page-header">
      <h2>套餐管理</h2>
      <el-button type="primary" @click="showDialog('add')">添加套餐</el-button>
    </div>
    <div class="page-card">
      <el-table :data="packages" v-loading="loading" stripe>
        <el-table-column prop="name" label="套餐名称" />
        <el-table-column prop="badge" label="标签" width="100"><template #default="{ row }"><el-tag v-if="row.badge" size="small">{{ row.badge }}</el-tag></template></el-table-column>
        <el-table-column prop="price" label="价格" width="100"><template #default="{ row }">¥{{ row.price }}</template></el-table-column>
        <el-table-column label="包含印章" min-width="300">
          <template #default="{ row }">
            <el-tag v-for="s in row.seals" :key="s.id" size="small" style="margin: 2px">{{ s.name }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="sort" label="排序" width="80" />
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button type="primary" link @click="showDialog('edit', row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑套餐' : '添加套餐'" width="600px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="套餐名称" required><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="标签"><el-input v-model="form.badge" placeholder="如：特惠" /></el-form-item>
        <el-form-item label="价格(元)" required><el-input-number v-model="form.price" :min="0" :precision="2" /></el-form-item>
        <el-form-item label="包含印章" required>
          <el-select v-model="form.sealIds" multiple placeholder="选择印章" style="width: 100%">
            <el-option v-for="s in allSeals" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述"><el-input v-model="form.description" type="textarea" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.sort" :min="0" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="savePackage" :loading="saving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { getSealPackages, getSeals, createPackage, updatePackage, deletePackage } from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false), saving = ref(false), packages = ref<any[]>([]), allSeals = ref<any[]>([])
const dialogVisible = ref(false), isEdit = ref(false)
const form = reactive<any>({ name: '', badge: '', price: 0, sealIds: [], description: '', sort: 0 })

async function fetchPackages() { loading.value = true; try { packages.value = (await getSealPackages()).data ?? [] } finally { loading.value = false } }
async function fetchSeals() { allSeals.value = (await getSeals()).data ?? [] }
function showDialog(type: string, row?: any) {
  isEdit.value = type === 'edit'
  if (row) { Object.assign(form, { ...row }) } else { Object.assign(form, { name: '', badge: '', price: 0, sealIds: [], description: '', sort: 0 }) }
  dialogVisible.value = true
}
async function savePackage() {
  saving.value = true
  try {
    if (isEdit.value) { await updatePackage(form.id, form) } else { await createPackage(form) }
    ElMessage.success('保存成功'); dialogVisible.value = false; fetchPackages()
  } finally { saving.value = false }
}
async function handleDelete(row: any) {
  await ElMessageBox.confirm('确认删除该套餐？'); await deletePackage(row.id); ElMessage.success('删除成功'); fetchPackages()
}
onMounted(() => { fetchPackages(); fetchSeals() })
</script>
