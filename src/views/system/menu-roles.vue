<template>
  <div class="page-card">
    <div class="page-header">
      <h3>菜单权限配置</h3>
      <div class="header-actions">
        <el-button @click="handleAdd">新增配置</el-button>
        <el-button type="danger" @click="handleReset">重置为默认</el-button>
      </div>
    </div>

    <el-table :data="tableData" border style="width: 100%">
      <el-table-column prop="path" label="路径" width="220">
        <template #default="{ row }">
          <span>{{ pathLabels[row.path] || row.path }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="pathType" label="匹配方式" width="100">
        <template #default="{ row }">
          <el-tag :type="row.pathType === 'exact' ? 'primary' : 'warning'">
            {{ row.pathType === 'exact' ? '精确' : '前缀' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="roles" label="允许角色" min-width="280">
        <template #default="{ row }">
          <el-tag v-for="r in row.roles" :key="r" style="margin-right:4px">
            {{ r === '*' ? '全部' : roleLabels[r] || r }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="enabled" label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '禁用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="sort" label="排序" width="70" />
      <el-table-column label="操作" width="140">
        <template #default="{ row }">
          <el-button size="small" @click="handleEdit(row)">编辑</el-button>
          <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="editId ? '编辑配置' : '新增配置'" width="500px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="路径">
          <el-input v-model="form.path" placeholder="/system/admins" />
        </el-form-item>
        <el-form-item label="匹配方式">
          <el-radio-group v-model="form.pathType">
            <el-radio value="exact">精确匹配</el-radio>
            <el-radio value="prefix">前缀匹配</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="允许角色">
          <el-checkbox-group v-model="form.roles">
            <el-checkbox v-for="(label, key) in roleLabels" :key="key" :label="key">{{ label }}</el-checkbox>
            <el-checkbox label="*">全部角色</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="form.enabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { createMenuRoleConfig, updateMenuRoleConfig, deleteMenuRoleConfig, resetMenuRoleConfigs } from '@/api'
import { ROLE_LABELS } from '@/constants/roles'
import { useAuthStore } from '@/stores/auth'

const roleLabels = ROLE_LABELS
const authStore = useAuthStore()

const pathLabels: Record<string, string> = {
  '/dashboard': '工作台',
  '/outlets': '网点管理',
  '/outlets/overview': '网点总览',
  '/outlets/dashboard': '网点工作台',
  '/outlets/assign': '订单分配',
  '/outlets/receipts': '收款单据',
  '/orders': '订单管理',
  '/orders/seal': '刻章订单',
  '/orders/newspaper': '登报订单',
  '/orders/bookkeeping': '记账订单',
  '/orders/dispatch-records': '派单记录',
  '/after-sales': '售后管理',
  '/after-sales/orders': '售后工单',
  '/after-sales/refund-records': '退款记录',
  '/products': '产品管理',
  '/products/seals/enterprise': '企业刻章',
  '/products/seals/personal': '个人印章',
  '/products/seals/electronic': '电子印章',
  '/products/record-queries': '刻章备案查询',
  '/products/scenes': '刻章场景',
  '/products/packages': '套餐管理',
  '/products/newspapers': '报纸仓库',
  '/products/newspaper-templates': '报纸模板',
  '/products/bookkeeping-packages': '记账套餐',
  '/users': '用户管理',
  '/reviews': '评价管理',
  '/questions': '问答管理',
  '/content': '内容管理',
  '/content/banners': 'Banner管理',
  '/content/announcements': '公告管理',
  '/content/intros': '业务介绍',
  '/system': '系统管理',
  '/system/admins': '管理员账号',
  '/system/logs': '操作日志',
  '/system/configs': '系统配置',
  '/system/dispatch-rules': '派单规则',
  '/system/menu-roles': '菜单权限',
  '/faq': '常见问题',
  '/finance': '财务中心',
  '/v2/settlements': '结算管理(V2.0)',
}
const tableData = ref<any[]>([])
const dialogVisible = ref(false)
const editId = ref<string | null>(null)
const form = ref({
  path: '',
  pathType: 'exact',
  roles: [] as string[],
  sort: 0,
  enabled: true,
})

async function loadData() {
  const configs = await authStore.loadMenuConfigs()
  if (configs) tableData.value = configs
}

function handleAdd() {
  editId.value = null
  form.value = { path: '', pathType: 'exact', roles: [], sort: tableData.value.length, enabled: true }
  dialogVisible.value = true
}

function handleEdit(row: any) {
  editId.value = row.id
  form.value = {
    path: row.path,
    pathType: row.pathType,
    roles: [...row.roles],
    sort: row.sort,
    enabled: row.enabled,
  }
  dialogVisible.value = true
}

async function handleSubmit() {
  if (!form.value.path) {
    ElMessage.warning('请填写路径')
    return
  }
  if (editId.value) {
    await updateMenuRoleConfig(editId.value, form.value)
  } else {
    await createMenuRoleConfig(form.value)
  }
  ElMessage.success('保存成功')
  dialogVisible.value = false
  await loadData()
}

async function handleDelete(row: any) {
  await ElMessageBox.confirm(`确定删除 ${row.path}？`, '删除确认')
  await deleteMenuRoleConfig(row.id)
  ElMessage.success('删除成功')
  await loadData()
}

async function handleReset() {
  await ElMessageBox.confirm('重置后将恢复为系统默认配置，确定？', '重置确认')
  await resetMenuRoleConfigs()
  ElMessage.success('已重置')
  await loadData()
}

onMounted(loadData)
</script>

<style scoped>
.page-card {
  padding: 20px;
  background: #fff;
  border-radius: 8px;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.header-actions {
  display: flex;
  gap: 10px;
}
</style>
