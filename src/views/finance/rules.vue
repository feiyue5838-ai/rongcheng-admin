<template>
  <div class="rules-page">
    <div class="page-header">
      <h2>规则配置</h2>
    </div>

    <el-card shadow="never">
      <div style="display:flex;justify-content:flex-end;margin-bottom:12px">
        <el-button type="primary" size="small" @click="openRuleDialog()">新增规则</el-button>
      </div>
      <el-table :data="rules" v-loading="loadingRules" stripe>
        <el-table-column prop="name" label="规则名称" />
        <el-table-column label="适用网点" width="160">
          <template #default="{ row }">{{ row.outletName || '全局' }}</template>
        </el-table-column>
        <el-table-column label="适用模块" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.module" size="small" type="info">{{ moduleLabelMap[row.module] || row.module }}</el-tag>
            <span v-else style="color:#999">全部</span>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="120">
          <template #default="{ row }"><el-tag :type="row.type==='fixed'?'primary':'success'" size="small">{{ row.type==='fixed'?'固定金额':'百分比' }}</el-tag></template>
        </el-table-column>
        <el-table-column label="数值" width="120">
          <template #default="{ row }"><span v-if="row.type==='fixed'">¥{{ row.fixedAmount }}</span><span v-else>{{ row.percent }}%</span></template>
        </el-table-column>
        <el-table-column label="结算模式" width="120">
          <template #default="{ row }"><el-tag :type="row.settlementType==='auto'?'success':'warning'" size="small">{{ row.settlementType==='auto'?'自动':'手动' }}</el-tag></template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }"><el-tag :type="row.status===1?'success':'info'" size="small">{{ row.status===1?'启用':'停用' }}</el-tag></template>
        </el-table-column>
        <el-table-column label="有效期" width="180">
          <template #default="{ row }">
            <span v-if="row.validFrom || row.validTo">
              {{ row.validFrom ? row.validFrom.slice(0,10) : '—' }} ~ {{ row.validTo ? row.validTo.slice(0,10) : '—' }}
            </span>
            <span v-else style="color:#999">长期有效</span>
          </template>
        </el-table-column>
        <el-table-column label="默认" width="80">
          <template #default="{ row }"><el-tag v-if="row.isDefault" type="warning" size="small">默认</el-tag></template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="openRuleDialog(row)">编辑</el-button>
            <el-button type="danger" link size="small" @click="handleDeleteRule(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 规则编辑弹窗 -->
    <el-dialog v-model="ruleDialogVisible" :title="ruleForm.id ? '编辑规则' : '新增规则'" width="600px">
      <el-form :model="ruleForm" label-width="100px">
        <el-form-item label="规则名称">
          <el-input v-model="ruleForm.name" placeholder="请输入规则名称" />
        </el-form-item>
        <el-form-item label="结算类型">
          <el-radio-group v-model="ruleForm.type">
            <el-radio label="fixed">固定金额</el-radio>
            <el-radio label="percent">百分比</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item :label="ruleForm.type === 'fixed' ? '固定金额' : '百分比'">
          <el-input-number v-if="ruleForm.type === 'fixed'" v-model="ruleForm.fixedAmount" :min="0" :precision="2" style="width:200px" />
          <el-input-number v-else v-model="ruleForm.percent" :min="0" :max="100" :precision="2" style="width:200px" />
          <span v-if="ruleForm.type === 'percent'" style="margin-left:8px">%</span>
        </el-form-item>
        <el-form-item label="适用网点">
          <el-select v-model="ruleForm.outletId" placeholder="不选择则全局适用" clearable style="width:250px">
            <el-option v-for="o in outletOptions" :key="o.id" :label="o.name" :value="o.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="适用模块">
          <el-select v-model="ruleForm.module" placeholder="不选择则全部模块适用" clearable style="width:200px">
            <el-option label="刻章" value="seal" />
            <el-option label="登报" value="newspaper" />
            <el-option label="代理记账" value="bookkeeping" />
          </el-select>
        </el-form-item>
        <el-form-item label="有效期">
          <el-date-picker v-model="dateRange" type="daterange" range-separator="~" start-placeholder="生效日期" end-placeholder="失效日期" value-format="YYYY-MM-DD" style="width:300px" />
        </el-form-item>
        <el-form-item label="结算模式">
          <el-radio-group v-model="ruleForm.settlementType">
            <el-radio label="auto">自动结算</el-radio>
            <el-radio label="manual">手动结算</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="ruleForm.status" :active-value="1" :inactive-value="0" active-text="启用" inactive-text="停用" />
        </el-form-item>
        <el-form-item label="设为默认">
          <el-switch v-model="ruleForm.isDefault" :active-value="true" :inactive-value="false" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="ruleForm.remark" type="textarea" :rows="2" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="ruleDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitRule">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getSettlementRules, createSettlementRule, updateSettlementRule, deleteSettlementRule, getOutletsAPI } from '@/api/index'

const moduleLabelMap = { seal: '刻章', newspaper: '登报', bookkeeping: '代理记账' }

const rules = ref([])
const loadingRules = ref(false)
const ruleDialogVisible = ref(false)
const outletOptions = ref([])
const dateRange = ref(null)

const defaultForm = () => ({
  id: null, name: '', type: 'fixed', fixedAmount: 0, percent: 0,
  settlementType: 'manual', status: 1, isDefault: false, remark: '',
  outletId: null, module: null, validFrom: null, validTo: null
})
const ruleForm = ref(defaultForm())

async function loadRules() {
  loadingRules.value = true
  try {
    const res = await getSettlementRules()
    rules.value = (res && res.data) || (Array.isArray(res) ? res : [])
  } catch (e) {
    ElMessage.error('加载规则失败')
  } finally {
    loadingRules.value = false
  }
}

async function loadOutlets() {
  try {
    const res = await getOutletsAPI({ page: 1, pageSize: 200 })
    const list = res?.data?.items || res?.items || res || []
    outletOptions.value = list.map(o => ({ id: o.id, name: o.name }))
  } catch {}
}

function openRuleDialog(row = null) {
  if (row) {
    ruleForm.value = { ...defaultForm(), ...row }
    dateRange.value = row.validFrom ? [row.validFrom.slice(0, 10), row.validTo ? row.validTo.slice(0, 10) : ''] : null
  } else {
    ruleForm.value = defaultForm()
    dateRange.value = null
  }
  ruleDialogVisible.value = true
}

async function submitRule() {
  const data = { ...ruleForm.value }
  if (dateRange.value && dateRange.value.length === 2) {
    data.validFrom = dateRange.value[0] || null
    data.validTo = dateRange.value[1] || null
  } else {
    data.validFrom = null
    data.validTo = null
  }
  try {
    if (data.id) {
      await updateSettlementRule(data.id, data)
      ElMessage.success('更新成功')
    } else {
      await createSettlementRule(data)
      ElMessage.success('创建成功')
    }
    ruleDialogVisible.value = false
    loadRules()
  } catch (e) {
    ElMessage.error('保存失败')
  }
}

async function handleDeleteRule(row) {
  try {
    await ElMessageBox.confirm('确定删除该规则吗？', '提示', { type: 'warning' })
    await deleteSettlementRule(row.id)
    ElMessage.success('删除成功')
    loadRules()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('删除失败')
  }
}

onMounted(() => {
  loadRules()
  loadOutlets()
})
</script>

<style scoped>
.rules-page {
  padding: 20px;
}
.page-header {
  margin-bottom: 20px;
}
.page-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
}
</style>
