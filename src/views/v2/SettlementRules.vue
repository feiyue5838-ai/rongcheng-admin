<template>
  <div>
    <div class="page-header">
      <h2>结算规则管理</h2>
      <div>
        <el-button type="primary" @click="openCreate">新增规则</el-button>
        <el-button @click="load">刷新</el-button>
      </div>
    </div>

    <el-card shadow="never">
      <div class="filter-bar" style="margin-bottom: 12px; display: flex; gap: 8px; align-items: center;">
        <el-select v-model="query.module" placeholder="业务模块" clearable style="width: 140px" @change="load">
          <el-option label="刻章" value="seal" />
          <el-option label="登报" value="newspaper" />
          <el-option label="记账" value="bookkeeping" />
        </el-select>
        <el-input v-model="query.keyword" placeholder="规则名称 / 备注" clearable style="width: 220px" @keyup.enter="load" />
        <el-button type="primary" plain @click="load">查询</el-button>
      </div>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="name" label="规则名称" min-width="180" show-overflow-tooltip />
        <el-table-column label="模块" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="moduleTag(row.module)" size="small">{{ moduleText(row.module) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="抽成方式" width="120" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.type === 'percent'" type="danger" size="small">比例 {{ Number(row.percent || 0).toFixed(2) }}%</el-tag>
            <el-tag v-else type="warning" size="small">固定 ￥{{ Number(row.fixedAmount || 0).toFixed(2) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="minOrderAmount" label="起抽金额(元)" width="120" align="right">
          <template #default="{ row }">￥{{ Number(row.minOrderAmount || 0).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">{{ row.status === 1 ? '启用' : '停用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="默认" width="80" align="center">
          <template #default="{ row }">{{ row.isDefault ? '✓' : '-' }}</template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="140" show-overflow-tooltip />
        <el-table-column label="生效期" width="200">
          <template #default="{ row }">
            <span style="font-size: 12px; color: #909399">{{ fmtDate(row.validFrom) }} ~ {{ fmtDate(row.validTo) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" size="small" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        style="margin-top: 12px; justify-content: flex-end"
        layout="total, prev, pager, next"
        :total="total"
        :page-size="pageSize"
        :current-page="page"
        @current-change="onPage"
      />
    </el-card>

    <!-- 新增 / 编辑 -->
    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑结算规则' : '新增结算规则'" width="560px" destroy-on-close>
      <el-form :model="form" label-width="110px">
        <el-form-item label="规则名称" required>
          <el-input v-model="form.name" placeholder="如：刻章网点结算-试点5%" maxlength="60" />
        </el-form-item>
        <el-form-item label="业务模块">
          <el-select v-model="form.module" placeholder="全部业务（空=全部）" clearable style="width: 100%">
            <el-option label="刻章" value="seal" />
            <el-option label="登报" value="newspaper" />
            <el-option label="记账" value="bookkeeping" />
          </el-select>
          <div style="font-size:12px; color:#909399; line-height:1.5; margin-top:4px">不选表示对全部业务生效；如与业务专用规则同时存在，优先匹配业务专用</div>
        </el-form-item>
        <el-form-item label="抽成类型" required>
          <el-radio-group v-model="form.type">
            <el-radio value="percent">按比例（%）</el-radio>
            <el-radio value="fixed">按固定金额（元）</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.type === 'percent'" label="抽成比例 %" required>
          <el-input-number v-model="form.percent" :min="0" :max="100" :precision="2" :step="0.5" style="width: 200px" />
          <div style="font-size:12px; color:#909399; margin-left:8px">供应商结算价 = 订单实付 × (1 − 比例)</div>
        </el-form-item>
        <el-form-item v-else label="抽成金额(元)" required>
          <el-input-number v-model="form.fixedAmount" :min="0" :precision="2" :step="1" style="width: 200px" />
          <div style="font-size:12px; color:#909399; margin-left:8px">供应商结算价 = 订单实付 − 固定金额</div>
        </el-form-item>
        <el-form-item label="起抽金额(元)">
          <el-input-number v-model="form.minOrderAmount" :min="0" :precision="2" :step="10" style="width: 200px" />
          <div style="font-size:12px; color:#909399; margin-left:8px">订单实付低于此值时不抽成（全额结算）</div>
        </el-form-item>
        <el-form-item label="启用状态">
          <el-switch v-model="form.statusOn" />
        </el-form-item>
        <el-form-item label="默认规则">
          <el-switch v-model="form.isDefault" />
          <div style="font-size:12px; color:#909399; margin-left:8px">同模块默认规则未命中时兜底使用</div>
        </el-form-item>
        <el-form-item label="生效期">
          <el-date-picker
            v-model="form.validRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" maxlength="200" placeholder="用途说明，如：试点网点、生效批次等" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  v2GetSettlementRules,
  v2CreateSettlementRule,
  v2UpdateSettlementRule,
  v2DeleteSettlementRule,
} from '@/api'

const loading = ref(false)
const submitting = ref(false)
const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const query = reactive({ module: '', keyword: '' })
const dialogVisible = ref(false)
const form = reactive<any>({})

const moduleText = (m?: string) =>
  m === 'seal' ? '刻章' : m === 'newspaper' ? '登报' : m === 'bookkeeping' ? '记账' : '全部'
const moduleTag = (m?: string) =>
  m === 'seal' ? 'danger' : m === 'newspaper' ? 'primary' : m === 'bookkeeping' ? 'warning' : 'info'
const fmtDate = (d?: string) => (d ? d.slice(0, 10) : '不限')

function resetForm() {
  form.id = ''
  form.name = ''
  form.module = ''
  form.type = 'percent'
  form.percent = 5
  form.fixedAmount = 0
  form.minOrderAmount = 0
  form.statusOn = true
  form.isDefault = false
  form.remark = ''
  form.validRange = null
}

async function load() {
  loading.value = true
  try {
    const res: any = await v2GetSettlementRules({
      page: page.value,
      pageSize: pageSize.value,
      module: query.module || undefined,
      keyword: query.keyword || undefined,
    })
    list.value = res.list || []
    total.value = res.total || 0
  } catch (e: any) {
    ElMessage.error(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}
function onPage(p: number) {
  page.value = p
  load()
}
function openCreate() {
  resetForm()
  dialogVisible.value = true
}
function openEdit(row: any) {
  resetForm()
  Object.assign(form, {
    id: row.id,
    name: row.name,
    module: row.module || '',
    type: row.type || 'percent',
    percent: Number(row.percent ?? 5),
    fixedAmount: Number(row.fixedAmount ?? 0),
    minOrderAmount: Number(row.minOrderAmount ?? 0),
    statusOn: row.status === 1,
    isDefault: !!row.isDefault,
    remark: row.remark || '',
    validRange:
      row.validFrom && row.validTo ? [new Date(row.validFrom), new Date(row.validTo)] : null,
  })
  dialogVisible.value = true
}
function toPayload() {
  const p: any = {
    name: form.name?.trim(),
    type: form.type,
    percent: form.type === 'percent' ? Number(form.percent ?? 0) : undefined,
    fixedAmount: form.type === 'fixed' ? Number(form.fixedAmount ?? 0) : undefined,
    minOrderAmount: Number(form.minOrderAmount ?? 0),
    status: form.statusOn ? 1 : 0,
    isDefault: form.isDefault ? 1 : 0,
    remark: form.remark?.trim() || '',
  }
  if (form.module) p.module = form.module
  if (form.validRange && form.validRange.length === 2) {
    p.validFrom = form.validRange[0].toISOString()
    p.validTo = form.validRange[1].toISOString()
  }
  return p
}
async function save() {
  if (!form.name) {
    ElMessage.warning('请填写规则名称')
    return
  }
  if (form.type === 'percent' && Number(form.percent) <= 0) {
    ElMessage.warning('抽成比例须大于 0')
    return
  }
  if (form.type === 'fixed' && Number(form.fixedAmount) <= 0) {
    ElMessage.warning('抽成金额须大于 0')
    return
  }
  submitting.value = true
  try {
    if (form.id) {
      await v2UpdateSettlementRule(form.id, toPayload())
      ElMessage.success('已更新')
    } else {
      await v2CreateSettlementRule(toPayload())
      ElMessage.success('已创建')
    }
    dialogVisible.value = false
    load()
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  } finally {
    submitting.value = false
  }
}
async function remove(row: any) {
  try {
    await ElMessageBox.confirm(`确定删除规则「${row.name}」？删除后相关订单将按全额结算（无抽成）。`, '删除结算规则', {
      type: 'warning',
    })
  } catch {
    return
  }
  try {
    await v2DeleteSettlementRule(row.id)
    ElMessage.success('已删除')
    load()
  } catch (e: any) {
    ElMessage.error(e?.message || '删除失败')
  }
}

onMounted(load)
</script>
