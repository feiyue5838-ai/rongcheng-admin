<template>
  <div class="settlement-page">
    <div class="page-header">
      <h2>结算管理</h2>
      <div class="header-actions">
        <el-button type="primary" @click="activeTab = 'records'">结算记录</el-button>
        <el-button @click="activeTab = 'rules'">规则配置</el-button>
        <el-button @click="activeTab = 'pricing'">合作价格</el-button>
      </div>
    </div>

    <!-- 规则配置 Tab -->
    <div v-if="activeTab === 'rules'" class="tab-content">
      <el-card shadow="never">
        <template #header>
          <div class="card-header">
            <span>结算规则</span>
            <el-button type="primary" size="small" @click="openRuleDialog()">新增规则</el-button>
          </div>
        </template>
        <el-table :data="rules" v-loading="loadingRules">
          <el-table-column prop="name" label="规则名称" />
          <el-table-column label="类型" width="120">
            <template #default="{ row }">
              <el-tag :type="row.type === 'fixed' ? 'primary' : 'success'" size="small">
                {{ row.type === 'fixed' ? '固定金额' : '百分比' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="数值" width="120">
            <template #default="{ row }">
              <span v-if="row.type === 'fixed'">¥{{ row.fixedAmount }}</span>
              <span v-else>{{ row.percent }}%</span>
            </template>
          </el-table-column>
          <el-table-column label="结算模式" width="120">
            <template #default="{ row }">
              <el-tag :type="row.settlementType === 'auto' ? 'success' : 'warning'" size="small">
                {{ row.settlementType === 'auto' ? '自动' : '手动' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">
                {{ row.status === 1 ? '启用' : '停用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="默认" width="80">
            <template #default="{ row }">
              <el-tag v-if="row.isDefault" type="warning" size="small">默认</el-tag>
            </template>
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
    </div>

    <!-- 合作价格 Tab -->
    <div v-if="activeTab === 'pricing'" class="tab-content">
      <el-card>
        <template #header>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-weight:600;">合作价格配置</span>
            <el-button type="primary" size="small" @click="openPricingDialog()">新增配置</el-button>
          </div>
        </template>
        <el-alert type="info" :closable="false" style="margin-bottom:16px;">
          合作价格 = 平台结算给履约供应商的分成单价。刻章：<strong>个/枚</strong>，登报：<strong>期</strong>，代理记账：<strong>家</strong>。
          结算时优先使用网点专属价格，未配置则使用全局结算规则。
        </el-alert>
        <div style="margin-bottom:16px; display:flex; gap:12px; flex-wrap:wrap; align-items:center;">
          <el-select v-model="pricingFilter.outletId" placeholder="选择网点" clearable filterable style="width:200px;" @change="loadPricingList">
            <el-option v-for="o in pricingOutlets" :key="o.id" :label="o.name" :value="o.id" />
          </el-select>
          <el-select v-model="pricingFilter.businessType" placeholder="业务类型" clearable style="width:160px;" @change="loadPricingList">
            <el-option label="刻章 (个/枚)" value="seal" />
            <el-option label="登报 (期)" value="newspaper" />
            <el-option label="代理记账 (家)" value="bookkeeping" />
          </el-select>
          <el-select v-model="pricingFilter.status" placeholder="状态" clearable style="width:120px;" @change="loadPricingList">
            <el-option label="启用" :value="1" />
            <el-option label="停用" :value="0" />
          </el-select>
          <el-button @click="resetPricingFilter">重置</el-button>
        </div>
        <el-table :data="pricingTable" stripe v-loading="pricingLoading">
          <el-table-column prop="outletName" label="履约供应商" min-width="160" show-overflow-tooltip />
          <el-table-column label="业务类型" width="130">
            <template #default="{ row }">
              {{ getBusinessTypeLabel(row.businessType) }} ({{ row.unit }})
            </template>
          </el-table-column>
          <el-table-column label="计费方式" width="100">
            <template #default="{ row }">
              <el-tag :type="row.priceType === 'fixed' ? 'success' : 'warning'" size="small">
                {{ row.priceType === 'fixed' ? '固定金额' : '百分比' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="单价" width="100" align="right">
            <template #default="{ row }">
              {{ row.priceType === 'fixed' ? '¥' + row.priceValue : row.priceValue + '%' }}
            </template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" min-width="120" show-overflow-tooltip />
          <el-table-column label="状态" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small">
                {{ row.status === 1 ? '启用' : '停用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="创建时间" width="170">
            <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link size="small" @click="openPricingDialog(row)">编辑</el-button>
              <el-button type="danger" link size="small" @click="onDeletePricing(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <!-- 结算记录 Tab -->
    <div v-if="activeTab === 'records'" class="tab-content">
      <el-row :gutter="16" class="stats-row">
        <el-col :span="6">
          <el-card shadow="never" class="stat-card">
            <div class="stat-label">结算单数</div>
            <div class="stat-value">{{ summary.totalCount || 0 }}</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="never" class="stat-card">
            <div class="stat-label">订单总金额</div>
            <div class="stat-value">¥{{ Number(summary.totalOrderAmount || 0).toFixed(2) }}</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="never" class="stat-card stat-outlet">
            <div class="stat-label">网点分成</div>
            <div class="stat-value">¥{{ Number(summary.totalOutletAmount || 0).toFixed(2) }}</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="never" class="stat-card stat-platform">
            <div class="stat-label">平台分成</div>
            <div class="stat-value">¥{{ Number(summary.totalPlatformAmount || 0).toFixed(2) }}</div>
          </el-card>
        </el-col>
      </el-row>

      <el-card shadow="never" style="margin-top: 16px">
        <div class="filter-bar">
          <div class="filters">
            <el-select v-model="filterOutletId" placeholder="选择网点" clearable filterable style="width: 200px" @change="loadRecords">
              <el-option v-for="outlet in outlets" :key="outlet.id" :label="outlet.name" :value="outlet.id" />
            </el-select>
            <el-select v-model="filterStatus" placeholder="状态" clearable style="width: 140px" @change="loadRecords">
              <el-option label="待确认" :value="1" />
              <el-option label="已结算" :value="2" />
              <el-option label="已付款" :value="3" />
            </el-select>
            <el-date-picker v-model="dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" style="width: 260px" @change="loadRecords" />
          </div>
          <div class="actions">
            <el-button type="primary" @click="openGenerateDialog()">生成本期结算</el-button>
            <el-button @click="openAutoGenerateDialog()">批量自动生成</el-button>
            <el-button @click="exportRecords">导出对账单</el-button>
          </div>
        </div>

        <el-table :data="records" v-loading="loadingRecords" style="margin-top: 16px">
          <el-table-column prop="recordNo" label="结算单号" width="180" />
          <el-table-column prop="outletName" label="网点" />
          <el-table-column label="结算周期" width="200">
            <template #default="{ row }">
              {{ row.periodStart ? row.periodStart.slice(0, 10) : '' }} ~ {{ row.periodEnd ? row.periodEnd.slice(0, 10) : '' }}
            </template>
          </el-table-column>
          <el-table-column prop="orderCount" label="订单数" width="80" align="center" />
          <el-table-column label="订单金额" width="120" align="right">
            <template #default="{ row }">
              <span class="money">¥{{ Number(row.orderAmount || 0).toFixed(2) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="网点分成" width="120" align="right">
            <template #default="{ row }">
              <span class="money outlet">¥{{ Number(row.outletAmount || 0).toFixed(2) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="平台分成" width="120" align="right">
            <template #default="{ row }">
              <span class="money platform">¥{{ Number(row.platformAmount || 0).toFixed(2) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="statusTagType(row.status)" size="small">{{ row.statusText }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="ruleName" label="结算规则" width="140" />
          <el-table-column label="创建时间" width="160">
            <template #default="{ row }">{{ row.createdAt ? row.createdAt.slice(0, 16) : '' }}</template>
          </el-table-column>
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link size="small" @click="viewRecord(row)">详情</el-button>
              <el-button v-if="row.status === 1" type="success" link size="small" @click="handleUpdateStatus(row, 2)">确认结算</el-button>
              <el-button v-if="row.status === 2" type="warning" link size="small" @click="openPayDialog(row)">确认付款</el-button>
              <el-button v-if="row.status === 1" type="danger" link size="small" @click="handleDeleteRecord(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          style="margin-top: 16px; justify-content: flex-end"
          @size-change="loadRecords"
          @current-change="loadRecords"
        />
      </el-card>
    </div>

    <!-- 规则编辑弹窗 -->
    <el-dialog v-model="ruleDialogVisible" :title="editingRule ? '编辑规则' : '新增规则'" width="500px">
      <el-form :model="ruleForm" label-width="110px">
        <el-form-item label="规则名称" required>
          <el-input v-model="ruleForm.name" placeholder="如：默认固定金额规则" />
        </el-form-item>
        <el-form-item label="分成类型" required>
          <el-radio-group v-model="ruleForm.type">
            <el-radio value="fixed">固定金额（每单）</el-radio>
            <el-radio value="percent">百分比（每单）</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item :label="ruleForm.type === 'fixed' ? '固定金额' : '百分比'" required>
          <el-input-number v-if="ruleForm.type === 'fixed'" v-model="ruleForm.fixedAmount" :min="0" :precision="2" />
          <el-input-number v-else v-model="ruleForm.percent" :min="0" :max="100" :precision="2" />
          <span style="margin-left: 8px">{{ ruleForm.type === 'fixed' ? '元/单' : '%' }}</span>
        </el-form-item>
        <el-form-item label="结算模式" required>
          <el-radio-group v-model="ruleForm.settlementType">
            <el-radio value="manual">手动结算</el-radio>
            <el-radio value="auto">自动结算</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="ruleFormStatus" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-form-item label="设为默认">
          <el-switch v-model="ruleForm.isDefault" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="ruleForm.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="ruleDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="savingRule" @click="saveRule">保存</el-button>
      </template>
    </el-dialog>

    <!-- 生成本期结算弹窗 -->
    <el-dialog v-model="generateDialogVisible" title="生成本期结算" width="480px">
      <el-form :model="generateForm" label-width="110px">
        <el-form-item label="选择网点" required>
          <el-select v-model="generateForm.outletId" placeholder="选择网点" filterable style="width: 100%">
            <el-option v-for="outlet in outlets" :key="outlet.id" :label="outlet.name" :value="outlet.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="开始日期" required>
          <el-date-picker v-model="generateForm.periodStart" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="结束日期" required>
          <el-date-picker v-model="generateForm.periodEnd" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
      </el-form>
      <p class="dialog-tip">仅统计已完成且已支付的订单，网点分成按规则自动计算。</p>
      <template #footer>
        <el-button @click="generateDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="generating" @click="doGenerate">生成</el-button>
      </template>
    </el-dialog>

    <!-- 批量自动生成弹窗 -->
    <el-dialog v-model="autoGenerateDialogVisible" title="批量自动生成结算单" width="480px">
      <el-form :model="autoGenerateForm" label-width="110px">
        <el-form-item label="开始日期" required>
          <el-date-picker v-model="autoGenerateForm.periodStart" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="结束日期" required>
          <el-date-picker v-model="autoGenerateForm.periodEnd" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
      </el-form>
      <p class="dialog-tip">为所有有已完成订单的网点自动生成结算单。</p>
      <template #footer>
        <el-button @click="autoGenerateDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="autoGenerating" @click="doAutoGenerate">开始生成</el-button>
      </template>
    </el-dialog>

    <!-- 确认付款弹窗 -->
    <el-dialog v-model="payDialogVisible" title="确认付款" width="420px">
      <el-form :model="payForm" label-width="90px">
        <el-form-item label="网点"><span>{{ payTarget ? payTarget.outletName : '' }}</span></el-form-item>
        <el-form-item label="付款金额">
          <span class="money outlet" style="font-size: 18px; font-weight: bold">¥{{ Number(payTarget ? payTarget.outletAmount : 0).toFixed(2) }}</span>
        </el-form-item>
        <el-form-item label="付款备注">
          <el-input v-model="payForm.remark" type="textarea" :rows="2" placeholder="可选：付款方式、交易流水号等" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="payDialogVisible = false">取消</el-button>
        <el-button type="warning" :loading="paying" @click="doPay">确认付款</el-button>
      </template>
    </el-dialog>

    <!-- 结算详情弹窗 -->
    <el-dialog v-model="detailDialogVisible" title="结算详情" width="560px">
      <el-descriptions :column="2" border v-if="detailRecord">
        <el-descriptions-item label="结算单号">{{ detailRecord.recordNo }}</el-descriptions-item>
        <el-descriptions-item label="网点">{{ detailRecord.outletName }}</el-descriptions-item>
        <el-descriptions-item label="结算周期">
          {{ detailRecord.periodStart ? detailRecord.periodStart.slice(0, 10) : '' }} ~ {{ detailRecord.periodEnd ? detailRecord.periodEnd.slice(0, 10) : '' }}
        </el-descriptions-item>
        <el-descriptions-item label="订单数量">{{ detailRecord.orderCount }}</el-descriptions-item>
        <el-descriptions-item label="订单金额"><span class="money">¥{{ Number(detailRecord.orderAmount || 0).toFixed(2) }}</span></el-descriptions-item>
        <el-descriptions-item label="网点分成"><span class="money outlet">¥{{ Number(detailRecord.outletAmount || 0).toFixed(2) }}</span></el-descriptions-item>
        <el-descriptions-item label="平台分成"><span class="money platform">¥{{ Number(detailRecord.platformAmount || 0).toFixed(2) }}</span></el-descriptions-item>
        <el-descriptions-item label="状态"><el-tag :type="statusTagType(detailRecord.status)" size="small">{{ detailRecord.statusText }}</el-tag></el-descriptions-item>
        <el-descriptions-item label="结算规则">{{ detailRecord.ruleName }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ detailRecord.createdAt ? detailRecord.createdAt.slice(0, 16) : '' }}</el-descriptions-item>
        <el-descriptions-item label="付款时间" v-if="detailRecord.paidAt">
          {{ detailRecord.paidAt ? detailRecord.paidAt.slice(0, 16) : '' }}
        </el-descriptions-item>
        <el-descriptions-item label="付款备注" v-if="detailRecord.paidRemark" :span="2">{{ detailRecord.paidRemark }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>

    <!-- 合作价格编辑弹窗 -->
    <el-dialog v-model="pricingDialogVisible" :title="pricingForm.id ? '编辑合作价格' : '新增合作价格'" width="520px" :close-on-click-modal="false">
      <el-form :model="pricingForm" :rules="pricingFormRules" label-width="100px">
        <el-form-item label="履约供应商" prop="outletId">
          <el-select v-model="pricingForm.outletId" placeholder="请选择履约供应商" filterable style="width:100%;" @change="onPricingOutletChange">
            <el-option v-for="o in pricingOutlets" :key="o.id" :label="o.name" :value="o.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="业务类型" prop="businessType">
          <el-select v-model="pricingForm.businessType" placeholder="请选择业务类型" style="width:100%;" @change="onBusinessTypeChange">
            <el-option label="刻章 (个/枚)" value="seal" />
            <el-option label="登报 (期)" value="newspaper" />
            <el-option label="代理记账 (家)" value="bookkeeping" />
          </el-select>
        </el-form-item>
        <el-form-item label="单位" prop="unit">
          <el-input v-model="pricingForm.unit" placeholder="根据业务类型自动填入" disabled />
        </el-form-item>
        <el-form-item label="计费方式" prop="priceType">
          <el-radio-group v-model="pricingForm.priceType">
            <el-radio label="fixed">固定金额</el-radio>
            <el-radio label="percent">百分比</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="单价" prop="priceValue">
          <el-input-number v-model="pricingForm.priceValue" :min="0" :precision="2"
            :placeholder="pricingForm.priceType === 'fixed' ? '每单位固定金额（元）' : '百分比（0-100）'"
            :max="pricingForm.priceType === 'percent' ? 100 : undefined"
            style="width:100%;" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="pricingForm.status">
            <el-radio :label="1">启用</el-radio>
            <el-radio :label="0">停用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="pricingForm.remark" type="textarea" :rows="2" placeholder="选填" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="pricingDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="onSubmitPricing">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getSettlementRules, createSettlementRule, updateSettlementRule, deleteSettlementRule,
  getSettlementRecords, getSettlementRecord, generateSettlementRecord,
  autoGenerateSettlementRecords, updateSettlementStatus, deleteSettlementRecord,
  getSettlementOutletSummary, getOutletsAPI,
  getOutletPricingList, upsertOutletPricing, deleteOutletPricing,
} from '@/api'

const activeTab = ref('records')

// ---- 规则配置 ----
const rules = ref([])
const loadingRules = ref(false)
const ruleDialogVisible = ref(false)
const editingRule = ref(null)
const savingRule = ref(false)
const ruleFormStatus = ref(1)

const defaultRuleForm = () => ({
  name: '', type: 'fixed', fixedAmount: 50, percent: 10,
  settlementType: 'manual', status: 1, isDefault: false, remark: ''
})
const ruleForm = reactive(defaultRuleForm())

async function loadRules() {
  loadingRules.value = true
  try {
    const res = await getSettlementRules()
    rules.value = res.data || []
  } catch (e) { console.error(e) }
  finally { loadingRules.value = false }
}

function openRuleDialog(row) {
  editingRule.value = row || null
  if (row) {
    Object.assign(ruleForm, {
      name: row.name, type: row.type, fixedAmount: row.fixedAmount, percent: row.percent,
      settlementType: row.settlementType, status: row.status, isDefault: row.isDefault, remark: row.remark || ''
    })
    ruleFormStatus.value = row.status
  } else {
    Object.assign(ruleForm, defaultRuleForm())
  }
  ruleDialogVisible.value = true
}

async function saveRule() {
  if (!ruleForm.name) { ElMessage.warning('请输入规则名称'); return }
  savingRule.value = true
  try {
    const data = { ...ruleForm, status: ruleFormStatus.value }
    if (editingRule.value) {
      await updateSettlementRule(editingRule.value.id, data)
    } else {
      await createSettlementRule(data)
    }
    ElMessage.success('保存成功')
    ruleDialogVisible.value = false
    loadRules()
  } catch (e) { console.error(e); ElMessage.error('保存失败') }
  finally { savingRule.value = false }
}

async function handleDeleteRule(row) {
  try {
    await ElMessageBox.confirm('确定删除规则：' + row.name + '？', '确认删除', { type: 'warning' })
    await deleteSettlementRule(row.id)
    ElMessage.success('删除成功')
    loadRules()
  } catch (e) { if (e !== 'cancel') console.error(e) }
}

// ---- 结算记录 ----
const records = ref([])
const loadingRecords = ref(false)
const summary = ref({})
const outlets = ref([])
const pagination = reactive({ page: 1, pageSize: 10, total: 0 })
const filterOutletId = ref('')
const filterStatus = ref('')
const dateRange = ref([])

async function loadRecords() {
  loadingRecords.value = true
  try {
    const params = {
      page: pagination.page, pageSize: pagination.pageSize,
      ...(filterOutletId.value && { outletId: filterOutletId.value }),
      ...(filterStatus.value && { status: filterStatus.value }),
      ...(dateRange.value && dateRange.value[0] && { startDate: dateRange.value[0] }),
      ...(dateRange.value && dateRange.value[1] && { endDate: dateRange.value[1] })
    }
    const res = await getSettlementRecords(params)
    records.value = res.data ? (res.data.items || []) : []
    pagination.total = res.data ? (res.data.total || 0) : 0
    summary.value = res.data ? (res.data.summary || {}) : {}
  } catch (e) { console.error(e) }
  finally { loadingRecords.value = false }
}

async function loadOutlets() {
  try {
    const res = await getOutletsAPI({ page: 1, pageSize: 100 })
    outlets.value = res.data ? (res.data.list || res.data || []) : []
  } catch (e) { console.error(e) }
}

function statusTagType(status) {
  const map = { 1: 'warning', 2: 'primary', 3: 'success' }
  return map[status] || 'info'
}

async function handleUpdateStatus(row, status) {
  const isConfirm = status === 2
  const isPay = status === 3
  let msg = ''
  if (isConfirm) {
    msg = `确认结算「${row.outletName}」？\n结算周期：${(row.periodStart || '').slice(0, 10)} ~ ${(row.periodEnd || '').slice(0, 10)}\n网点分成：¥${Number(row.outletAmount || 0).toFixed(2)}`
  } else if (isPay) {
    msg = `确认向「${row.outletName}」付款 ¥${Number(row.outletAmount || 0).toFixed(2)}？`
  } else {
    msg = `确定执行此操作？`
  }
  try {
    await ElMessageBox.confirm(msg, '操作确认', { type: 'warning', dangerouslyUseHTMLString: false })
    await updateSettlementStatus(row.id, { status })
    ElMessage.success('操作成功')
    loadRecords()
  } catch (e) { if (e !== 'cancel') console.error(e) }
}

async function handleDeleteRecord(row) {
  try {
    await ElMessageBox.confirm('确定删除结算单 ' + row.recordNo + '？', '确认删除', { type: 'warning' })
    await deleteSettlementRecord(row.id)
    ElMessage.success('删除成功')
    loadRecords()
  } catch (e) { if (e !== 'cancel') console.error(e) }
}

// ---- 生成本期结算 ----
const generateDialogVisible = ref(false)
const generating = ref(false)
const generateForm = reactive({ outletId: '', periodStart: '', periodEnd: '' })

function openGenerateDialog() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  generateForm.periodStart = start.toISOString().slice(0, 10)
  generateForm.periodEnd = now.toISOString().slice(0, 10)
  generateForm.outletId = ''
  generateDialogVisible.value = true
}

async function doGenerate() {
  if (!generateForm.outletId || !generateForm.periodStart || !generateForm.periodEnd) {
    ElMessage.warning('请填写完整信息'); return
  }
  generating.value = true
  try {
    await generateSettlementRecord(generateForm)
    ElMessage.success('结算单生成成功')
    generateDialogVisible.value = false
    loadRecords()
  } catch (e) {
    ElMessage.error(e.response && e.response.data ? e.response.data.message : (e.message || '生成失败'))
  } finally { generating.value = false }
}

// ---- 批量自动生成 ----
const autoGenerateDialogVisible = ref(false)
const autoGenerating = ref(false)
const autoGenerateForm = reactive({ periodStart: '', periodEnd: '' })

function openAutoGenerateDialog() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  autoGenerateForm.periodStart = start.toISOString().slice(0, 10)
  autoGenerateForm.periodEnd = now.toISOString().slice(0, 10)
  autoGenerateDialogVisible.value = true
}

async function doAutoGenerate() {
  if (!autoGenerateForm.periodStart || !autoGenerateForm.periodEnd) {
    ElMessage.warning('请填写完整信息'); return
  }
  // 幂等防护：检查开始时间是否早于结束时间
  if (autoGenerateForm.periodStart > autoGenerateForm.periodEnd) {
    ElMessage.warning('开始日期不能晚于结束日期'); return
  }
  autoGenerating.value = true
  try {
    const results = await autoGenerateSettlementRecords(autoGenerateForm)
    const data = results.data || []
    const success = Array.isArray(data) ? data.filter(function(r) { return r.success }) : []
    const fail = Array.isArray(data) ? data.filter(function(r) { return !r.success }) : []
    ElMessage.success('生成完成：' + success.length + ' 个成功，' + fail.length + ' 个失败')
    autoGenerateDialogVisible.value = false
    if (fail.length > 0 && fail.length <= 5) {
      // 展示失败原因
      const reasons = fail.slice(0, 3).map(r => r.reason || r.message || '未知原因').join('；')
      ElMessage.warning('部分失败原因：' + reasons)
    }
    if (success.length > 0) { loadRecords() }
  } catch (e) { ElMessage.error(e.message || '生成失败') }
  finally { autoGenerating.value = false }
}

// ---- 确认付款 ----
const payDialogVisible = ref(false)
const payTarget = ref(null)
const paying = ref(false)
const payForm = reactive({ remark: '' })

function openPayDialog(row) {
  payTarget.value = row
  payForm.remark = ''
  payDialogVisible.value = true
}

async function doPay() {
  paying.value = true
  try {
    await updateSettlementStatus(payTarget.value.id, { status: 3, remark: payForm.remark })
    ElMessage.success('付款确认成功')
    payDialogVisible.value = false
    loadRecords()
  } catch (e) { ElMessage.error(e.message || '操作失败') }
  finally { paying.value = false }
}

// ---- 结算详情 ----
const detailDialogVisible = ref(false)
const detailRecord = ref(null)

async function viewRecord(row) {
  try {
    const res = await getSettlementRecord(row.id)
    detailRecord.value = res.data
    detailDialogVisible.value = true
  } catch (e) { ElMessage.error('加载详情失败') }
}

function exportRecords() {
  ElMessage.info('导出功能开发中')
}

// ---- 合作价格 ----
const pricingBusinessTypes = [
  { key: 'seal', label: '刻章', unit: '个/枚' },
  { key: 'newspaper', label: '登报', unit: '期' },
  { key: 'bookkeeping', label: '代理记账', unit: '家' },
]
const pricingTable = ref([])
const pricingLoading = ref(false)
const pricingFilter = reactive({ outletId: '', businessType: '', status: null })
const pricingOutlets = ref([])

async function loadPricingList() {
  pricingLoading.value = true
  try {
    const resp = await getOutletPricingList({
      outletId: pricingFilter.outletId || undefined,
      businessType: pricingFilter.businessType || undefined,
      status: pricingFilter.status ?? undefined,
    })
    pricingTable.value = resp.data || []
  } catch (e) {
    console.error(e)
  } finally {
    pricingLoading.value = false
  }
}

async function loadPricingOutlets() {
  try {
    const resp = await getOutletsAPI()
    pricingOutlets.value = resp.data?.list || resp.data?.items || resp.data || []
  } catch (e) {
    console.error(e)
  }
}

function resetPricingFilter() {
  pricingFilter.outletId = ''
  pricingFilter.businessType = ''
  pricingFilter.status = null
  loadPricingList()
}

function getBusinessTypeLabel(key) {
  return pricingBusinessTypes.find(function(b) { return b.key === key })?.label || key
}

function formatDateTime(date) {
  if (!date) return '—'
  var d = new Date(date)
  if (isNaN(d.getTime())) return '—'
  var y = d.getFullYear()
  var m = String(d.getMonth() + 1).padStart(2, '0')
  var day = String(d.getDate()).padStart(2, '0')
  var h = String(d.getHours()).padStart(2, '0')
  var min = String(d.getMinutes()).padStart(2, '0')
  var s = String(d.getSeconds()).padStart(2, '0')
  return y + '-' + m + '-' + day + ' ' + h + ':' + min + ':' + s
}

// Pricing dialog
const pricingDialogVisible = ref(false)
const pricingForm = reactive({
  id: '',
  outletId: '',
  businessType: '',
  unit: '',
  priceType: 'fixed',
  priceValue: 0,
  status: 1,
  remark: '',
})
const pricingFormRules = {
  outletId: [{ required: true, message: '请选择履约供应商', trigger: 'change' }],
  businessType: [{ required: true, message: '请选择业务类型', trigger: 'change' }],
  priceType: [{ required: true, message: '请选择计费方式', trigger: 'change' }],
  priceValue: [{ required: true, message: '请输入单价', trigger: 'blur' }],
}

function openPricingDialog(row) {
  if (row) {
    Object.assign(pricingForm, {
      id: row.id,
      outletId: row.outletId,
      businessType: row.businessType,
      unit: row.unit,
      priceType: row.priceType,
      priceValue: row.priceValue,
      status: row.status,
      remark: row.remark || '',
    })
  } else {
    Object.assign(pricingForm, { id: '', outletId: '', businessType: '', unit: '', priceType: 'fixed', priceValue: 0, status: 1, remark: '' })
  }
  loadPricingOutlets()
  pricingDialogVisible.value = true
}

function onPricingOutletChange() {
  pricingForm.businessType = ''
  pricingForm.unit = ''
}

function onBusinessTypeChange(key) {
  var bt = pricingBusinessTypes.find(function(b) { return b.key === key })
  pricingForm.unit = bt?.unit || ''
}

async function onSubmitPricing() {
  if (!pricingForm.outletId) { ElMessage.warning('请选择履约供应商'); return }
  if (!pricingForm.businessType) { ElMessage.warning('请选择业务类型'); return }
  if (!pricingForm.priceValue && pricingForm.priceValue !== 0) { ElMessage.warning('请输入单价'); return }
  try {
    await upsertOutletPricing({
      outletId: pricingForm.outletId,
      businessType: pricingForm.businessType,
      unit: pricingForm.unit,
      priceType: pricingForm.priceType,
      priceValue: Number(pricingForm.priceValue),
      status: pricingForm.status,
      remark: pricingForm.remark,
    })
    ElMessage.success('保存成功')
    pricingDialogVisible.value = false
    loadPricingList()
  } catch (e) {
    ElMessage.error(e?.message || '保存失败')
  }
}

async function onDeletePricing(row) {
  try {
    await ElMessageBox.confirm('确定要删除「' + row.outletName + ' - ' + getBusinessTypeLabel(row.businessType) + '」的合作价格配置吗？', '删除确认', { type: 'warning' })
    await deleteOutletPricing(row.id)
    ElMessage.success('删除成功')
    loadPricingList()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e?.message || '删除失败')
  }
}

// Watch activeTab to load pricing data when tab is shown
import { watch } from 'vue'
watch(activeTab, function(newTab) {
  if (newTab === 'pricing') {
    loadPricingList()
    loadPricingOutlets()
  }
})

onMounted(function() {
  loadRules()
  loadOutlets()
  loadRecords()
})
</script>

<style scoped>
.settlement-page { padding: 20px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-header h2 { margin: 0; font-size: 18px; color: #303133; }
.header-actions { display: flex; gap: 8px; }
.tab-content { animation: fadeIn 0.2s; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.stats-row { margin-bottom: 0; }
.stat-card { text-align: center; }
.stat-label { font-size: 13px; color: #909399; margin-bottom: 8px; }
.stat-value { font-size: 24px; font-weight: bold; color: #303133; }
.stat-outlet .stat-value { color: #5B6FE8; }
.stat-platform .stat-value { color: #52c41a; }
.filter-bar { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
.filters { display: flex; gap: 10px; flex-wrap: wrap; }
.actions { display: flex; gap: 8px; }
.dialog-tip { color: #909399; font-size: 13px; margin-top: 8px; }
.money { color: #303133; }
.money.outlet { color: #5B6FE8; }
.money.platform { color: #52c41a; }
</style>
