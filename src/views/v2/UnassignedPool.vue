<template>
  <div>
    <div class="page-header">
      <h2>待派单池 ({{ total }})</h2>
      <el-button @click="load">刷新</el-button>
    </div>

    <el-card shadow="never">
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="orderNo" label="订单号" width="200" show-overflow-tooltip />
        <el-table-column label="类型" width="80">
          <template #default="{ row }">
            <el-tag size="small" :type="row.module === 'seal' ? 'primary' : row.module === 'newspaper' ? 'success' : 'warning'">
              {{ moduleLabel(row.module) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="totalAmount" label="金额" width="100" align="right">
          <template #default="{ row }">¥{{ row.totalAmount }}</template>
        </el-table-column>
        <el-table-column label="下单时间" width="170">
          <template #default="{ row }">{{ row.createdAt ? new Date(row.createdAt).toLocaleString('zh-CN', { hour12: false }) : '-' }}</template>
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
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { v2GetUnassigned } from '@/api'

const moduleLabel = (m: any) => ({ seal: '刻章', newspaper: '登报', bookkeeping: '记账' } as any)[m] || m

const router = useRouter()
const loading = ref(false)
const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

async function load() {
  loading.value = true
  try {
    const res: any = await v2GetUnassigned({ page: page.value, pageSize: pageSize.value })
    list.value = res.list || []
    total.value = res.total || 0
  } catch (e: any) {
    ElMessage.error(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
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
