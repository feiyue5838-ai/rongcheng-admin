<template>
  <div>
    <div class="page-header"><h2>管理员</h2><el-button type="primary" @click="showDialog('add')">添加管理员</el-button></div>
    <div class="page-card">
      <el-table :data="admins" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="200" show-overflow-tooltip />
        <el-table-column prop="username" label="用户名" />
        <el-table-column prop="nickname" label="昵称" />
        <el-table-column prop="role" label="角色" width="100">
          <template #default="{ row }"><el-tag size="small" :type="row.role==='superadmin'?'danger':(row.role==='finance'?'warning':'primary')">{{ roleLabel(row.role) }}</el-tag></template>
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
      <el-pagination
        v-model:current-page="query.page"
        v-model:page-size="query.pageSize"
        :total="pagination.total"
        :page-sizes="[20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        style="margin-top: 20px; justify-content: flex-end"
        @change="fetchAdmins"
      />
    </div>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑管理员' : '添加管理员'" width="500px">
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="100px">
        <el-form-item label="用户名" prop="username"><el-input v-model="form.username" :disabled="isEdit" /></el-form-item>
        <el-form-item label="昵称"><el-input v-model="form.nickname" /></el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" show-password :placeholder="isEdit?'不修改请留空':'请输入密码'" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="form.role" style="width: 100%" :disabled="isCurrentAdmin">
            <el-option v-for="(label, role) in ROLE_LABELS" :key="role" :label="label" :value="role" />
          </el-select>
          <div v-if="legacyRole" class="form-warning">该账号使用旧角色 admin，请选择一个新角色后保存。</div>
          <div v-else-if="isCurrentAdmin" class="form-tip">不能修改当前登录账号的角色。</div>
        </el-form-item>
        <el-form-item label="状态" v-if="isEdit">
          <el-switch v-model="form.status" :active-value="1" :inactive-value="0" :disabled="isCurrentAdmin" />
          <span v-if="isCurrentAdmin" class="form-tip">不能禁用当前登录账号。</span>
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
import { ref, reactive, computed, nextTick, onMounted } from 'vue'
import { getAdmins, createAdmin, updateAdmin, deleteAdmin } from '@/api'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import dayjs from 'dayjs'
import { ADMIN_ROLES, ROLE_LABELS } from '@/constants/roles'
import { useAuthStore } from '@/stores/auth'

const loading = ref(false), saving = ref(false), admins = ref<any[]>([])
const dialogVisible = ref(false), isEdit = ref(false)
const formRef = ref<FormInstance>()
const authStore = useAuthStore()
const query = reactive({ page: 1, pageSize: 20 })
const pagination = reactive({ total: 0 })
const form = reactive<any>({ username: '', nickname: '', password: '', role: ADMIN_ROLES.order_admin, status: 1 })
const editingId = ref('')
const legacyRole = ref(false)
const isCurrentAdmin = computed(() => isEdit.value && editingId.value === authStore.adminInfo?.id)
const formRules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{
    validator: (_rule, value, callback) => {
      if (!isEdit.value && !value) return callback(new Error('请输入密码'))
      if (value && value.length < 6) return callback(new Error('密码至少 6 位'))
      callback()
    },
    trigger: 'blur',
  }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
}

function formatDate(d?: string | null) { return d ? dayjs(d).format('YYYY-MM-DD HH:mm') : '-' }
function roleLabel(role: string) {
  // 保留旧 admin 账号的可读展示；新建账号只允许选择统一角色枚举。
  return ROLE_LABELS[role] || (role === 'admin' ? '普通管理员（旧角色）' : role)
}
async function fetchAdmins() {
  loading.value = true
  try {
    const res: any = await getAdmins(query)
    admins.value = res.list || []
    pagination.total = res.pagination?.total ?? res.total ?? admins.value.length
  } finally { loading.value = false }
}
function showDialog(type: string, row?: any) {
  isEdit.value = type === 'edit'
  editingId.value = row?.id || ''
  legacyRole.value = row?.role === 'admin'
  if (row) {
    Object.assign(form, { ...row, role: legacyRole.value ? '' : row.role, password: '' })
  } else {
    Object.assign(form, { username: '', nickname: '', password: '', role: ADMIN_ROLES.order_admin, status: 1 })
  }
  dialogVisible.value = true
  nextTick(() => formRef.value?.clearValidate())
}
async function saveAdmin() {
  if (!formRef.value || !(await formRef.value.validate().catch(() => false))) return
  saving.value = true
  try {
    const payload = { ...form }
    if (isEdit.value && !payload.password) delete payload.password
    if (isCurrentAdmin.value) {
      delete payload.role
      delete payload.status
    }
    if (isEdit.value) { await updateAdmin(form.id, payload) } else { await createAdmin(payload) }
    ElMessage.success('保存成功'); dialogVisible.value = false; await fetchAdmins()
  } finally { saving.value = false }
}
async function handleDelete(row: any) {
  if (row.id === authStore.adminInfo?.id) return ElMessage.warning('不能删除当前登录账号')
  await ElMessageBox.confirm('确认删除该管理员？')
  await deleteAdmin(row.id)
  ElMessage.success('删除成功')
  if (admins.value.length === 1 && query.page > 1) query.page--
  await fetchAdmins()
}
onMounted(fetchAdmins)
</script>

<style scoped>
.form-tip { margin-left: 8px; color: #909399; font-size: 12px; }
.form-warning { color: #e6a23c; font-size: 12px; line-height: 1.5; }
</style>
