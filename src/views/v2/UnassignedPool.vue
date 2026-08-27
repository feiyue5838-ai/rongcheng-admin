<template>
  <div>
    <div class="page-header">
      <h2>待派单池 ({{ total }})</h2>
      <el-button @click="load">刷新</el-button>
    </div>

    <el-card shadow="never">
      <el-form inline style="margin-bottom: 4px">
        <el-form-item label="业务类型">
          <el-select v-model="filters.module" clearable placeholder="全部" style="width: 130px" @change="search">
            <el-option label="刻章" value="seal" />
            <el-option label="登报" value="newspaper" />
            <el-option label="记账" value="bookkeeping" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="filters.keyword" placeholder="订单号/客户备注" clearable style="width: 200px" @keyup.enter="search" @clear="search" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="search">查询</el-button>
        </el-form-item>
      </el-form>
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="orderNo" label="订单号" width="200" show-overflow-tooltip />
        <el-table-column label="类型" width="80">
          <template #default="{ row }">
            <el-tag size="small" :type="row.module === 'seal' ? 'primary' : row.module === 'newspaper' ? 'success' : 'warning'">
              {{ moduleLabel(row.module) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="金额" width="100" align="right">
          <template #default="{ row }">
            {{ row.totalAmount != null ? '¥' + Number(row.totalAmount).toFixed(2) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="退款" width="90">
          <template #default="{ row }">
            <el-tag v-if="row.refundStatus === 'partial_refund'" size="small" type="warning">部分退款</el-tag>
            <el-tag v-else-if="row.refundStatus === 'applying'" size="small" type="danger">退款审核中</el-tag>
            <el-tag v-else-if="row.refundStatus === 'full_refund'" size="small" type="danger">已全额退款</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="customerRemark" label="客户备注" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">{{ row.customerRemark || '-' }}</template>
        </el-table-column>
        <el-table-column label="下单时间" width="170">
          <template #default="{ row }">{{ fmt(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="warning" size="small" @click="openAssign(row)">派单</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        style="margin-top: 16px; justify-content: flex-end"
        @change="load"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { v2GetUnassigned } from '@/api'

const moduleLabel = (m: any) => ({ seal: '刻章', newspaper: '登报', bookkeeping: '记账' } as any)[m] || m
// 后端时间为「本地时间 + Z 后缀」格式（非真实 UTC），直接截取字符串避免 new Date 解析产生 +8h 偏移
const fmt = (d?: string) => (d ? d.slice(0, 16).replace('T', ' ') : '-')

const router = useRouter()
const loading = ref(false)
const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const filters = reactive({ module: '', keyword: '' })

async function load() {
  loading.value = true
  try {
    const res: any = await v2GetUnassigned({
      page: page.value,
      pageSize: pageSize.value,
      module: filters.module || undefined,
      keyword: filters.keyword.trim() || undefined,
    })
    list.value = res.list || []
    total.value = res.total || 0
  } catch (e: any) {
    ElMessage.error(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}
/** 筛选变更/查询：重置到第 1 页，避免高页码下结果集变小显示空列表 */
function search() {
  page.value = 1
  load()
}
function openAssign(row: any) {
  router.push({ path: '/v2/orders/detail', query: { orderNo: row.orderNo, assign: '1' } })
}
onMounted(load)
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
</style>
