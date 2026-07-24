<template>
  <div class="bookkeeping-packages">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>代理记账套餐配置</span>
          <el-button type="primary" @click="handleAdd">新增套餐</el-button>
        </div>
      </template>

      <el-table :data="packages" v-loading="loading">
        <el-table-column prop="name" label="套餐名称" min-width="180" />
        <el-table-column prop="taxpayerType" label="纳税人类型" width="120">
          <template #default="{ row }">
            <el-tag :type="row.taxpayerType === 'small' ? 'success' : 'primary'">
              {{ row.taxpayerType === 'small' ? '小规模' : '一般纳税人' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="cycle" label="服务周期" width="100">
          <template #default="{ row }">
            {{ cycleText[row.cycle] || row.cycle }}
          </template>
        </el-table-column>
        <el-table-column prop="basePrice" label="基础价格" width="100">
          <template #default="{ row }">¥{{ row.basePrice }}</template>
        </el-table-column>
        <el-table-column prop="invoicePrice" label="开票附加" width="100">
          <template #default="{ row }">¥{{ row.invoicePrice }}</template>
        </el-table-column>
        <el-table-column prop="socialPrice" label="社保附加" width="100">
          <template #default="{ row }">¥{{ row.socialPrice }}</template>
        </el-table-column>
        <el-table-column prop="fundPrice" label="公积金附加" width="100">
          <template #default="{ row }">¥{{ row.fundPrice }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-switch v-model="row.status" :active-value="1" :inactive-value="0" @change="handleStatusChange(row)" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="600px">
      <el-form :model="form" label-width="120px">
        <el-form-item label="套餐名称" required>
          <el-input v-model="form.name" placeholder="如：小规模企业-全年代理记账" />
        </el-form-item>
        <el-form-item label="纳税人类型" required>
          <el-select v-model="form.taxpayerType" style="width: 100%">
            <el-option label="小规模纳税人" value="small" />
            <el-option label="一般纳税人" value="general" />
          </el-select>
        </el-form-item>
        <el-form-item label="服务周期" required>
          <el-select v-model="form.cycle" style="width: 100%">
            <el-option label="全年" value="year" />
            <el-option label="半年" value="half" />
            <el-option label="预订" value="preorder" />
          </el-select>
        </el-form-item>
        <el-form-item label="基础价格" required>
          <el-input-number v-model="form.basePrice" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="开票附加费">
          <el-input-number v-model="form.invoicePrice" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="社保附加费">
          <el-input-number v-model="form.socialPrice" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="公积金附加费">
          <el-input-number v-model="form.fundPrice" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="套餐描述">
          <el-input v-model="form.description" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" style="width: 100%" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.status" :active-value="1" :inactive-value="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getBookkeepingPackages, createBookkeepingPackage, updateBookkeepingPackage, deleteBookkeepingPackage } from '@/api'

const loading = ref(false)
const packages = ref<any[]>([])
const dialogVisible = ref(false)
const dialogTitle = ref('新增套餐')
const submitting = ref(false)
const editId = ref('')

const cycleText: Record<string, string> = {
  year: '全年',
  half: '半年',
  preorder: '预订'
}

const form = ref({
  name: '',
  taxpayerType: 'small',
  cycle: 'year',
  basePrice: 1999,
  invoicePrice: 200,
  socialPrice: 300,
  fundPrice: 300,
  description: '',
  sort: 0,
  status: 1
})

const fetchData = async () => {
  loading.value = true
  try {
    const res = await getBookkeepingPackages()
    packages.value = res.data || res
  } catch (e: any) {
    ElMessage.error(e.message || '获取数据失败')
  } finally {
    loading.value = false
  }
}

const handleAdd = () => {
  editId.value = ''
  dialogTitle.value = '新增套餐'
  form.value = {
    name: '',
    taxpayerType: 'small',
    cycle: 'year',
    basePrice: 1999,
    invoicePrice: 200,
    socialPrice: 300,
    fundPrice: 300,
    description: '',
    sort: 0,
    status: 1
  }
  dialogVisible.value = true
}

const handleEdit = (row: any) => {
  editId.value = row.id
  dialogTitle.value = '编辑套餐'
  form.value = { ...row }
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!form.value.name) {
    ElMessage.warning('请输入套餐名称')
    return
  }

  submitting.value = true
  try {
    if (editId.value) {
      await updateBookkeepingPackage(editId.value, form.value)
      ElMessage.success('更新成功')
    } else {
      await createBookkeepingPackage(form.value)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    fetchData()
  } catch (e: any) {
    ElMessage.error(e.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

const handleStatusChange = async (row: any) => {
  try {
    await updateBookkeepingPackage(row.id, { status: row.status })
    ElMessage.success('状态已更新')
  } catch (e: any) {
    ElMessage.error(e.message || '更新失败')
    fetchData()
  }
}

const handleDelete = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定删除此套餐吗？', '提示', { type: 'warning' })
    await deleteBookkeepingPackage(row.id)
    ElMessage.success('删除成功')
    fetchData()
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error(e.message || '删除失败')
    }
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
