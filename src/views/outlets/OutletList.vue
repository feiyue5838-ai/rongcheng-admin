<template>
  <div class="Outlet-list">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>合作网点管理</h2>
      <el-button type="primary" @click="openCreateDialog">
        <el-icon><Plus /></el-icon> 新增网点
      </el-button>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <el-input
        v-model="keyword"
        placeholder="搜索网点名称/联系人/电话"
        style="width: 260px"
        clearable
        @clear="loadData"
        @keyup.enter="() => { currentPage = 1; loadData() }"
      >
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
      <el-select v-model="status" placeholder="状态" style="width: 140px" clearable @change="loadData">
        <el-option label="全部" value="" />
        <el-option label="正常" :value="1" />
        <el-option label="已禁用" :value="0" />
      </el-select>
      <el-select v-model="region" placeholder="大区" style="width: 140px" clearable @change="loadData">
        <el-option label="全部大区" value="" />
        <el-option v-for="r in REGION_ORDER" :key="r" :label="r" :value="r" />
      </el-select>
      <el-button type="primary" @click="loadData">搜索</el-button>
    </div>

    <!-- 表格 -->
    <div v-for="g in groupedList" :key="g.region" class="region-block">
      <div class="region-header" @click="toggleRegion(g.region)">
        <el-icon class="region-arrow"><ArrowRight v-if="collapsed[g.region]" /><ArrowDown v-else /></el-icon>
        <span class="region-name">{{ g.region }}</span>
        <el-tag size="small" type="info">{{ g.outlets.length }}</el-tag>
      </div>
      <el-table v-show="!collapsed[g.region]" :data="g.outlets" stripe>
        <el-table-column prop="name" label="网点名称" min-width="160" />
        <el-table-column prop="contact" label="联系人" width="100" />
        <el-table-column prop="phone" label="联系电话" width="130">
          <template #default="{ row }">{{ row.phone }}</template>
        </el-table-column>
        <el-table-column label="所在地区" width="140">
          <template #default="{ row }">{{ [row.province, row.city].filter(Boolean).join(' ') || '-' }}</template>
        </el-table-column>
        <el-table-column prop="address" label="详细地址" min-width="160" show-overflow-tooltip />
        <el-table-column prop="totalOrders" label="累计订单" width="100" align="center">
          <template #default="{ row }"><el-tag type="info">{{ row.totalOrders }}</el-tag></template>
        </el-table-column>
        <el-table-column label="证件" width="130">
          <template #default="{ row }">
            <el-button link type="primary" size="small" :disabled="!row.businessLicense" @click="previewDocs(row, 'biz')">执照</el-button>
            <el-button link type="primary" size="small" :disabled="parsePermits(row.specialPermits).length === 0" @click="previewDocs(row, 'permits')">特种({{ parsePermits(row.specialPermits).length }})</el-button>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small">
              {{ row.status === 1 ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="170">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="openEditDialog(row)">编辑</el-button>
            <el-button type="warning" link size="small" @click="onResetPassword(row)">重置密码</el-button>
            <el-button type="danger" link size="small" @click="onDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 汇总 -->
    <div class="list-summary" v-if="!loading">
      共 {{ total }} 个网点 · {{ groupedList.length }} 个大区
    </div>

    <!-- 分页 -->
    <div class="list-pagination" v-if="total > 0">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[50, 100, 200]"
        :total="total"
        layout="sizes, prev, pager, next, total"
        background
        @current-change="loadData"
        @size-change="(s: number) => { currentPage = 1; loadData() }"
      />
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑网点' : '新增网点'"
      width="520px"
      :close-on-click-modal="false"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="网点名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入网点名称" maxlength="50" />
        </el-form-item>
        <el-form-item label="联系人" prop="contact">
          <el-input v-model="form.contact" placeholder="请输入联系人姓名" maxlength="20" />
        </el-form-item>
        <el-form-item label="联系电话" prop="phone">
          <el-input v-model="form.phone" placeholder="请输入手机号" maxlength="11" />
        </el-form-item>
        <el-form-item label="所在地区" required>
          <el-col :span="11">
            <el-form-item prop="province">
              <el-input v-model="form.province" placeholder="省份" />
            </el-form-item>
          </el-col>
          <el-col :span="2" style="text-align:center">-</el-col>
          <el-col :span="11">
            <el-form-item prop="city">
              <el-input v-model="form.city" placeholder="城市" />
            </el-form-item>
          </el-col>
        </el-form-item>
        <el-form-item label="详细地址" prop="address">
          <el-input v-model="form.address" placeholder="请输入详细地址" maxlength="200" />
        </el-form-item>
        <el-form-item label="营业执照">
          <el-upload v-if="!form.businessLicense" :show-file-list="false" :before-upload="beforeUpload" :http-request="uploadBiz">
            <el-button type="primary" plain><el-icon><Plus /></el-icon> 上传营业执照</el-button>
          </el-upload>
          <div v-else class="license-preview">
            <img :src="form.businessLicense" fit="cover" style="width:100px;height:100px;border-radius:8px;object-fit:cover;display:block;" />
            <el-button type="danger" link size="small" @click="form.businessLicense = ''">移除</el-button>
          </div>
        </el-form-item>
        <el-form-item label="特种证件">
          <el-upload list-type="picture-card" :auto-upload="true" :before-upload="beforeUpload" :http-request="uploadPermit" v-model:file-list="permitFiles" :limit="6" multiple>
            <el-icon><Plus /></el-icon>
          </el-upload>
          <div style="font-size:12px;color:#999">支持多张（特种行业许可证等），最多 6 张</div>
        </el-form-item>
        <el-form-item v-if="isEdit" label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio :label="1">正常</el-radio>
            <el-radio :label="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="onSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 重置密码 -->
    <el-dialog v-model="passwordDialogVisible" title="重置密码" width="420px" @closed="passwordResult = ''">
      <!-- 确认阶段 -->
      <div v-if="!passwordResult">
        <p>确定要重置网点「<strong>{{ currentOutlet?.name }}</strong>」的登录密码吗？</p>
        <p style="color:#666;margin-top:8px">重置后请将新密码告知网点管理人员。</p>
      </div>
      <!-- 结果阶段 -->
      <div v-else style="text-align:center;padding:16px 0">
        <p style="margin-bottom:12px;color:#666">新密码为：</p>
        <div style="
          display:inline-flex;align-items:center;gap:12px;
          background:#FFF7E6;border:2px solid #E6A23C;border-radius:8px;
          padding:16px 24px;margin-bottom:12px;
        ">
          <span style="font-size:28px;font-weight:700;letter-spacing:4px;color:#E6A23C;font-family:monospace">
            {{ passwordResult }}
          </span>
          <el-button size="small" @click="copyToClipboard(passwordResult)">复制</el-button>
        </div>
        <p style="color:#999;font-size:13px">请立即复制保存，关闭后无法再次查看</p>
      </div>
      <template #footer>
        <el-button v-if="!passwordResult" @click="passwordDialogVisible = false">取消</el-button>
        <el-button v-if="!passwordResult" type="warning" :loading="submitting" @click="onConfirmReset">确认重置</el-button>
        <el-button v-else type="primary" @click="passwordDialogVisible = false">我已保存</el-button>
      </template>
    </el-dialog>

    <!-- 证件预览 -->
    <el-dialog v-model="previewVisible" title="证件预览" width="760px" @closed="previewList = []">
      <div v-if="previewList.length" style="display:flex;flex-wrap:wrap;gap:12px">
        <el-image
          v-for="(u, i) in previewList"
          :key="i"
          :src="u"
          :preview-src-list="previewList"
          :initial-index="i"
          fit="cover"
          style="width:200px;height:140px;border-radius:8px"
        />
      </div>
      <div v-else style="color:#999;padding:24px;text-align:center">暂无证件</div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, type ComponentPublicInstance } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getOutletsAPI, createOutletAPI, updateOutletAPI, deleteOutletAPI, resetOutletPasswordAPI, uploadImage } from '@/api'
import { formatDate } from '@/utils/format'

const loading = ref(false)
const tableData = ref<any[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(100)
const keyword = ref('')
const status = ref('')
const region = ref('')
const REGION_ORDER = ['华北', '东北', '华东', '华中', '华南', '西南', '西北', '港澳台', '未知']
const collapsed = reactive(Object.assign({}, ...['华北','东北','华东','华中','华南','西南','西北','港澳台','未知'].map(r => ({ [r]: false }))))
// 恢复折叠状态
try { const saved = JSON.parse(localStorage.getItem('outlet-collapse') || '{}'); for (const k in saved) if (k in collapsed) collapsed[k] = saved[k] } catch {}
const groupedList = computed(() => {
  const map: Record<string, any[]> = {}
  for (const o of tableData.value) {
    const r: string = o.region || '未知'
    if (!map[r]) map[r] = []
    map[r].push(o)
  }
  return REGION_ORDER.filter((r: string) => map[r]).map(r => ({ region: r, outlets: map[r] }))
})
function toggleRegion(r: string) {
  (collapsed as any)[r] = !(collapsed as any)[r]
  try { localStorage.setItem('outlet-collapse', JSON.stringify(collapsed)) } catch {}
}

const previewVisible = ref(false)
const previewList = ref<any[]>([])
function previewDocs(row: any, type: string) {
  previewList.value = type === 'biz'
    ? (row.businessLicense ? [row.businessLicense] : [])
    : parsePermits(row.specialPermits)
  previewVisible.value = true
}

const dialogVisible = ref(false)
const passwordDialogVisible = ref(false)
const passwordResult = ref('')
const isEdit = ref(false)
const submitting = ref(false)
const currentOutlet = ref<any>(null)
const formRef = ref<any>(null)

const form = reactive({
  name: '',
  contact: '',
  phone: '',
  province: '',
  city: '',
  address: '',
  businessLicense: '',
  status: 1,
})
const permitFiles = ref<any[]>([])
function parsePermits(str: any) {
  try { const a = JSON.parse(str); return Array.isArray(a) ? a : [] } catch { return [] }
}
function beforeUpload(file: any) {
  const ok = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)
  if (!ok) { ElMessage.error('只能上传图片（JPG/PNG/GIF/WebP）'); return false }
  return true
}
async function uploadBiz(option: any) {
  try { const res: any = await uploadImage(option.file); form.businessLicense = res.data?.url ?? res.url; option.onSuccess(res, option.file) }
  catch (e: any) { option.onError(e) }
}
async function uploadPermit(option: any) {
  try { const res: any = await uploadImage(option.file); option.file.url = res.data?.url ?? res.url; option.onSuccess(res, option.file) }
  catch (e: any) { option.onError(e) }
}

const rules = {
  name: [{ required: true, message: '请输入网点名称', trigger: 'blur' }],
  contact: [{ required: true, message: '请输入联系人', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入联系电话', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' },
  ],
}

function openCreateDialog() {
  isEdit.value = false
  Object.assign(form, { name: '', contact: '', phone: '', province: '', city: '', address: '', businessLicense: '', status: 1 })
  permitFiles.value = []
  currentOutlet.value = null
  dialogVisible.value = true
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text)
}

function openEditDialog(row: any) {
  isEdit.value = true
  Object.assign(form, {
    name: row.name,
    contact: row.contact,
    phone: row.phone,
    province: row.province || '',
    city: row.city || '',
    address: row.address || '',
    businessLicense: row.businessLicense || '',
    status: row.status,
  })
  permitFiles.value = parsePermits(row.specialPermits).map(url => ({ url, name: url.split('/').pop() || '证件' }))
  currentOutlet.value = row
  dialogVisible.value = true
}

async function onSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    const payload = {
      ...form,
      specialPermits: permitFiles.value
        .filter(f => f.response?.url || f.url)
        .map(f => f.response?.url || f.url),
    }
    if (isEdit.value) {
      await updateOutletAPI(currentOutlet.value.id, payload)
      ElMessage.success('编辑成功')
    } else {
      await createOutletAPI(payload)
      ElMessage.success('新增成功')
    }
    dialogVisible.value = false
    loadData()
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

async function onResetPassword(row: any) {
  currentOutlet.value = row
  passwordDialogVisible.value = true
}

async function onConfirmReset() {
  submitting.value = true
  try {
    const res: any = await resetOutletPasswordAPI(currentOutlet.value.id)
    passwordResult.value = res.data?.password ?? res.password
  } catch (err) {
    ElMessage.error((err as any)?.response?.data?.message || '重置失败')
    passwordDialogVisible.value = false
  } finally {
    submitting.value = false
  }
}

async function onDelete(row: any) {
  try {
    await ElMessageBox.confirm(`确定要删除网点「${row.name}」吗？`, '删除确认', { type: 'warning' })
    await deleteOutletAPI(row.id)
    ElMessage.success('删除成功')
    loadData()
  } catch (err: any) {
    if (err !== 'cancel') ElMessage.error(err?.response?.data?.message || '删除失败')
  }
}

async function loadData(page?: number) {
  if (page) currentPage.value = page; else currentPage.value = 1
  loading.value = true
  try {
    const res = await getOutletsAPI({
      page: currentPage.value,
      pageSize: pageSize.value,
      keyword: keyword.value,
      status: status.value === '' ? undefined : status.value,
      region: region.value === '' ? undefined : region.value,
    })
    tableData.value = (res as any).data?.list ?? (res as any).list ?? []
    total.value = (res as any).data?.pagination?.total ?? (res as any).pagination?.total ?? 0
  } catch (err: any) {
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.Outlet-list {
  padding: 24px;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.page-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}
.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  align-items: center;
}
.region-block {
  margin-bottom: 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  overflow: hidden;
}
.region-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: var(--el-fill-color-light);
  cursor: pointer;
  user-select: none;
  font-weight: 600;
}
.region-header:hover {
  background: var(--el-fill-color);
}
.region-arrow {
  color: var(--el-text-color-secondary);
}
.region-name {
  font-size: 15px;
}
.list-summary {
  margin-top: 16px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
.list-pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
.license-preview {
  display: flex;
  align-items: center;
  gap: 8px;
}
/* 特种证件 picture-card 缩到 100x100 */
:deep(.el-form-item:has(.el-upload--picture-card) .el-upload--picture-card),
:deep(.Outlet-list .el-upload--picture-card) {
  width: 100px;
  height: 100px;
}
:deep(.Outlet-list .el-upload--picture-card .el-icon) {
  font-size: 22px;
}
</style>
