<template>
  <div>
    <div class="page-header">
      <h2>待派单池 ({{ total }})</h2>
      <div>
        <el-button type="warning" :disabled="selected.length === 0" @click="batchDialogVisible = true">
          批量派单 ({{ selected.length }})
        </el-button>
        <el-button @click="load">刷新</el-button>
      </div>
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
      <el-table :data="list" v-loading="loading" stripe @selection-change="selected = $event">
        <el-table-column type="selection" width="45" />
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
        <el-table-column label="地区" width="130" show-overflow-tooltip>
          <template #default="{ row }">{{ row.licenseRegion || '-' }}</template>
        </el-table-column>
        <el-table-column prop="customerRemark" label="客户备注" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">{{ row.customerRemark || '-' }}</template>
        </el-table-column>
        <el-table-column label="下单时间" width="170">
          <template #default="{ row }">{{ fmt(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="超时" width="90" align="center">
          <template #default="{ row }">
            <el-tag v-if="isOvertime(row.paidAt || row.createdAt)" size="small" type="danger">超48h</el-tag>
            <span v-else style="color:#ccc">-</span>
          </template>
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

    <!-- 批量派单弹窗 -->
    <el-dialog v-model="batchDialogVisible" title="批量派单" width="480px">
      <p style="margin-bottom: 12px">已选 {{ selected.length }} 单，将统一派给：</p>
      <el-select v-model="batchSupplierId" filterable placeholder="选择供应商" style="width: 100%">
        <el-option v-for="s in suppliers" :key="s.id" :label="(s.name || s.id) + (s.region ? `（${s.region}）` : '')" :value="s.id" />
      </el-select>
      <template #footer>
        <el-button @click="batchDialogVisible = false">取消</el-button>
        <el-button type="warning" :loading="batchSubmitting" @click="doBatchAssign">确认派单</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { v2GetUnassigned, v2AssignBatch, v2GetSuppliers } from '@/api'

const moduleLabel = (m: any) => ({ seal: '刻章', newspaper: '登报', bookkeeping: '记账' } as any)[m] || m
// 后端时间为「本地时间 + Z 后缀」格式（非真实 UTC），直接截取字符串避免 new Date 解析产生 +8h 偏移
const fmt = (d?: string) => (d ? d.slice(0, 16).replace('T', ' ') : '-')
// 超48h未派单（去 Z 按本地解析，避免 +8h 偏移导致晚8小时才标红）
const OVERDUE_MS = 48 * 3600 * 1000
function isOvertime(d?: string) {
  if (!d) return false
  const t = new Date(d.endsWith('Z') ? d.slice(0, -1) : d).getTime()
  return !isNaN(t) && Date.now() - t > OVERDUE_MS
}

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
    list.value = res?.list ?? res?.data?.list ?? []
    total.value = res?.pagination?.total ?? res?.total ?? res?.data?.total ?? 0
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

/* 批量派单：勾选多单 → 同一供应商一次派完，后端逐单独立事务 */
const selected = ref<any[]>([])
const batchDialogVisible = ref(false)
const batchSupplierId = ref('')
const batchSubmitting = ref(false)
const suppliers = ref<any[]>([])
async function loadSuppliers() {
  try {
    const res: any = await v2GetSuppliers({})
    suppliers.value = Array.isArray(res) ? res : res?.list ?? []
  } catch { suppliers.value = [] }
}
async function doBatchAssign() {
  if (!batchSupplierId.value) { ElMessage.warning('请先选择供应商'); return }
  batchSubmitting.value = true
  try {
    const res: any = await v2AssignBatch(selected.value.map(r => ({ orderNo: r.orderNo, supplierId: batchSupplierId.value })))
    const ok = res?.successCount ?? 0
    const fail = res?.failedCount ?? 0
    if (fail > 0) {
      const reasons = (res?.failed ?? []).slice(0, 3).map((f: any) => `${f.orderNo}：${f.reason}`).join('；')
      ElMessage.warning(`成功 ${ok} 单，失败 ${fail} 单：${reasons}`)
    } else {
      ElMessage.success(`批量派单成功 ${ok} 单`)
    }
    batchDialogVisible.value = false
    selected.value = []
    load()
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败')
  } finally {
    batchSubmitting.value = false
  }
}
onMounted(() => { load(); loadSuppliers() })
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
</style>
