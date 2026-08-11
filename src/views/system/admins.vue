<template>
  <div>
    <div class="page-header"><h2>管理员</h2><el-button type="primary" @click="showDialog('add')">添加管理员</el-button></div>
    <div class="page-card">
      <el-table :data="admins" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="200" show-overflow-tooltip />
        <el-table-column prop="username" label="用户名" />
        <el-table-column prop="nickname" label="昵称" />
        <el-table-column prop="role" label="角色" width="100">
          <template #default="{ row }"><el-tag size="small" :type="row.role==='superadmin'?'danger':'primary'">{{ row.role==='superadmin'?'超级管理员':'普通管理员' }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }"><el-tag :type="row.status===1?'success':'danger'" size="small">{{ row.status===1?'正常':'禁用' }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="lastLoginAt" label="最近登录" width="170"><template #default="{ row }">{{ row.lastLoginAt ? formatDate(row.lastLoginAt) : '-' }}</template></el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="170"><template #default="{ row }">{{ formatDate(row.createdAt) }}</template></el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button type="primary" link @click="showDialog('edit', row)">编辑</el-button>
            <el-button type="danger" link v-if="row.role !== 'superadmin'" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑管理员' : '添加管理员'" width="500px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="用户名" required><el-input v-model="form.username" :disabled="isEdit" /></el-form-item>
        <el-form-item label="昵称"><el-input v-model="form.nickname" /></el-form-item>
        <el-form-item label="密码" :required="!isEdit">
          <el-input v-model="form.password" type="password" show-password :placeholder="isEdit?'不修改请留空':'请输入密码'" />
        </el-form-item>
        <el-form-item label="角色">
          <el-radio-group v-model="form.role"><el-radio label="admin">普通管理员</el-radio><el-radio label="superadmin">超级管理员</el-radio></el-radio-group>
        </el-form-item>
        <el-form-item label="状态" v-if="isEdit">
          <el-switch v-model="form.status" :active-value="1" :inactive-value="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveAdmin" :loading="saving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { getAdmins, createAdmin, updateAdmin, deleteAdmin } from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'

const loading = ref(false), saving = ref(false), admins = ref<any[]>([])
const dialogVisible = ref(false), isEdit = ref(false)
const form = reactive<any>({ username: '', nickname: '', password: '', role: 'admin', status: 1 })

function formatDate(d: string) { return dayjs(d).format('YYYY-MM-DD HH:mm') }
async function fetchAdmins() { loading.value = true; try { const res: any = await getAdmins(); admins.value = res.list } finally { loading.value = false } }
function showDialog(type: string, row?: any) {
  isEdit.value = type === 'edit'
  if (row) { Object.assign(form, { ...row, password: '' }) } else { Object.assign(form, { username: '', nickname: '', password: '', role: 'admin', status: 1 }) }
  dialogVisible.value = true
}
async function saveAdmin() {
  saving.value = true
  try {
    if (isEdit.value) { await updateAdmin(form.id, form) } else { await createAdmin(form) }
    ElMessage.success('保存成功'); dialogVisible.value = false; fetchAdmins()
  } finally { saving.value = false }
}
async function handleDelete(row: any) { await ElMessageBox.confirm('确认删除该管理员？'); await deleteAdmin(row.id); ElMessage.success('删除成功'); fetchAdmins() }
onMounted(fetchAdmins)
</script>
