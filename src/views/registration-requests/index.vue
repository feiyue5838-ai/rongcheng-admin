<template>
  <div>
    <div class="page-header"><h2>工商注册</h2></div>
    <div class="page-card">
      <el-form inline :model="query" class="search-form">
        <el-form-item label="关键词">
          <el-input v-model="query.keyword" placeholder="手机号 / 注册地区" clearable style="width: 240px" @keyup.enter="search" />
        </el-form-item>
        <el-form-item label="办理类型">
          <el-select v-model="query.kind" clearable placeholder="全部" style="width: 150px" @change="search">
            <el-option label="企业注册" value="enterprise" />
            <el-option label="个体户" value="individual" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="search">搜索</el-button>
          <el-button @click="reset">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table v-loading="loading" :data="list" stripe>
        <el-table-column prop="createdAt" label="提交时间" width="175">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column prop="kind" label="办理类型" width="110">
          <template #default="{ row }">{{ kindLabel(row.kind) }}</template>
        </el-table-column>
        <el-table-column prop="enterpriseType" label="企业类型" min-width="130">
          <template #default="{ row }">{{ row.enterpriseType || '-' }}</template>
        </el-table-column>
        <el-table-column label="注册地区" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">{{ [row.province, row.city, row.district].filter(Boolean).join(' ') }}</template>
        </el-table-column>
        <el-table-column prop="phone" label="联系电话" width="140" />
        <el-table-column label="已有地址" width="105">
          <template #default="{ row }">{{ row.hasAddress ? '有' : '无' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="95" fixed="right">
          <template #default="{ row }"><el-button type="primary" link @click="showDetail(row.id)">查看</el-button></template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="query.page"
        v-model:page-size="query.pageSize"
        :total="pagination.total"
        :page-sizes="[20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        style="margin-top: 20px; justify-content: flex-end"
        @current-change="fetchData"
        @size-change="onSizeChange"
      />
    </div>

    <el-dialog v-model="detailVisible" title="工商注册详情" width="680px">
      <div v-loading="detailLoading">
        <el-descriptions v-if="detail" :column="2" border>
          <el-descriptions-item label="需求编号" :span="2">{{ detail.id }}</el-descriptions-item>
          <el-descriptions-item label="办理类型">{{ kindLabel(detail.kind) }}</el-descriptions-item>
          <el-descriptions-item label="提交时间">{{ formatDate(detail.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="注册地区" :span="2">{{ [detail.province, detail.city, detail.district].filter(Boolean).join(' ') }}</el-descriptions-item>
          <el-descriptions-item v-if="detail.kind === 'enterprise'" label="企业类型">{{ detail.enterpriseType || '-' }}</el-descriptions-item>
          <el-descriptions-item label="组织 / 组成形式">{{ detail.organizationForm || '-' }}</el-descriptions-item>
          <el-descriptions-item label="已有地址">{{ detail.hasAddress ? '有地址' : '无地址' }}</el-descriptions-item>
          <el-descriptions-item label="纳税类型意向">{{ taxLabel(detail.taxType) }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ detail.phone }}</el-descriptions-item>
          <el-descriptions-item label="用户ID">{{ detail.userId || '-' }}</el-descriptions-item>
          <el-descriptions-item label="备注信息" :span="2"><span class="remark">{{ detail.remark || '无' }}</span></el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'
import { getRegistrationRequestDetail, getRegistrationRequests } from '@/api'

type RegistrationRequest = {
  id: string
  userId: string
  kind: 'enterprise' | 'individual'
  enterpriseType: string | null
  organizationForm: string | null
  province: string
  city: string
  district: string
  hasAddress: boolean
  taxType: 'small' | 'general'
  phone: string
  remark: string | null
  createdAt: string
}

const loading = ref(false)
const list = ref<RegistrationRequest[]>([])
const query = reactive({ keyword: '', kind: '', page: 1, pageSize: 20 })
const pagination = ref({ total: 0 })
const detailVisible = ref(false)
const detailLoading = ref(false)
const detail = ref<RegistrationRequest | null>(null)

const formatDate = (date?: string) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'
const kindLabel = (kind: string) => kind === 'enterprise' ? '企业注册' : '个体户'
const taxLabel = (tax: string) => tax === 'general' ? '一般纳税人' : '小规模纳税人'

async function fetchData() {
  loading.value = true
  try {
    const result: any = await getRegistrationRequests({ ...query })
    list.value = Array.isArray(result?.list) ? result.list : []
    pagination.value.total = result?.pagination?.total ?? 0
  } catch (error: any) {
    list.value = []
    ElMessage.error(error?.message || '加载工商注册失败')
  } finally {
    loading.value = false
  }
}

function search() { query.page = 1; fetchData() }
function reset() { query.keyword = ''; query.kind = ''; search() }
function onSizeChange() { query.page = 1; fetchData() }

async function showDetail(id: string) {
  detail.value = null
  detailVisible.value = true
  detailLoading.value = true
  try {
    detail.value = await getRegistrationRequestDetail(id) as unknown as RegistrationRequest
  } catch (error: any) {
    detailVisible.value = false
    ElMessage.error(error?.message || '加载需求详情失败')
  } finally {
    detailLoading.value = false
  }
}

onMounted(fetchData)
</script>

<style scoped>
.remark { white-space: pre-wrap; word-break: break-word; }
</style>
