<template>
  <div class="finance-page">
    <div class="page-header">
      <h2>财务总览</h2>
    </div>

    <!-- 财务统计卡 - 始终固定 -->
    <div class="stat-cards">
      <div class="stat-card income">
        <div class="stat-icon"><el-icon><Coin /></el-icon></div>
        <div class="stat-body">
          <div class="stat-label">收入</div>
          <div class="stat-value">¥{{ fmt(overview.income) }}</div>
          <div class="stat-sub">{{ overview.incomeCount }} 笔交易</div>
        </div>
      </div>
      <div class="stat-card fee">
        <div class="stat-icon"><el-icon><Setting /></el-icon></div>
        <div class="stat-body">
          <div class="stat-label">手续费</div>
          <div class="stat-value">¥{{ fmt(overview.incomeFee) }}</div>
          <div class="stat-sub">费率 0.6%</div>
        </div>
      </div>
      <div class="stat-card refund-stat">
        <div class="stat-icon"><el-icon><CloseBold /></el-icon></div>
        <div class="stat-body">
          <div class="stat-label">退款</div>
          <div class="stat-value">¥{{ fmt(overview.refund) }}</div>
          <div class="stat-sub">{{ overview.refundCount }} 笔退款</div>
        </div>
      </div>
      <div class="stat-card settle">
        <div class="stat-icon"><el-icon><Shop /></el-icon></div>
        <div class="stat-body">
          <div class="stat-label">网点分成</div>
          <div class="stat-value">¥{{ fmt(overview.outletSettle) }}</div>
          <div class="stat-sub">待确认 ¥{{ fmt(overview.pendingOutlet) }}</div>
        </div>
      </div>
      <div class="stat-card net">
        <div class="stat-icon"><el-icon><TrendCharts /></el-icon></div>
        <div class="stat-body">
          <div class="stat-label">平台净利</div>
          <div class="stat-value">¥{{ fmt(overview.platformNet) }}</div>
          <div class="stat-sub">收入-手续费-退款-分成</div>
        </div>
      </div>
    </div>

    <!-- 主 Tab 切换按钮 -->
    <div class="finance-tabs">
      <div class="tab-bar">
        <button class="tab-btn" :class="{ active: mainTab === 'overview' }" @click="switchMain('overview')">财务总览</button>
        <button class="tab-btn" :class="{ active: mainTab === 'settlement' }" @click="switchMain('settlement')">结算管理</button>
        <button class="tab-btn" :class="{ active: mainTab === 'transaction' }" @click="switchMain('transaction')">交易流水</button>
        <button class="tab-btn" :class="{ active: mainTab === 'refund' }" @click="switchMain('refund')">退款管理</button>
      </div>
    </div>

    <!-- ==================== Tab 1: 财务总览 ==================== -->
    <div v-if="mainTab === 'overview'" class="tab-panel">
      <div class="content-grid">
        <el-card shadow="never" class="panel">
          <TrendChart 
            :title="'近' + trendData.length + '天交易趋势'"
            v-model="trendRange"
            :data="trendData"
            @range-change="onTrendRangeChange"
          />
        </el-card>
        <el-card shadow="never" class="panel">
          <template #header><div class="panel-title">待办事项</div></template>
          <div class="todo-items">
            <div v-if="overview.pendingOutlet > 0" class="todo-item" @click="switchMain('settlement')">
              <div class="todo-icon" style="background:#fff3e0"><span style="font-size:20px">💰</span></div>
              <div class="todo-info"><div class="todo-num">{{ overview.pendingOutlet }}</div><div class="todo-label">笔结算待确认</div></div>
            </div>
            <div v-if="overview.pendingCount > 0" class="todo-item" @click="switchMain('refund')">
              <div class="todo-icon" style="background:#fff1f0"><span style="font-size:20px">↩️</span></div>
              <div class="todo-info"><div class="todo-num">{{ overview.pendingCount }}</div><div class="todo-label">笔退款待处理</div></div>
            </div>
            <div v-for="item in outletPending" :key="item.outletId" class="todo-item" @click="switchMain('settlement')">
              <div class="todo-icon" style="background:#f0f5ff"><span style="font-size:20px">🏪</span></div>
              <div class="todo-info"><div class="todo-num">¥{{ fmt(item.pendingAmount) }}</div><div class="todo-label">{{ item.outletName }} 待结算</div></div>
            </div>
            <div v-if="overview.pendingOutlet === 0 && overview.pendingCount === 0 && outletPending.length === 0" class="todo-empty">
              <span style="font-size:40px"><el-icon><Promotion /></el-icon></span>
              <div style="margin-top:8px;color:#909399">暂无待办事项，所有业务已处理完毕</div>
            </div>
          </div>
        </el-card>
      </div>
      <el-card shadow="never" style="margin-top: 16px">
        <template #header><div class="panel-title">营收分布（本月）</div></template>
        <ModuleDonut :data="moduleMonth" :height="280" />
      </el-card>

      <el-card shadow="never" style="margin-top: 16px">
        <template #header><div class="panel-title">汇总明细</div></template>
        <el-descriptions :column="3" border>
          <el-descriptions-item label="收入">{{ overview.income ? '¥' + fmt(overview.income) : '—' }}</el-descriptions-item>
          <el-descriptions-item label="手续费">¥{{ fmt(overview.incomeFee) }}</el-descriptions-item>
          <el-descriptions-item label="退款">¥{{ fmt(overview.refund) }}</el-descriptions-item>
          <el-descriptions-item label="网点分成">¥{{ fmt(overview.outletSettle) }}</el-descriptions-item>
          <el-descriptions-item label="结算笔数">{{ overview.settleCount || 0 }}</el-descriptions-item>
          <el-descriptions-item label="平台净利"><span style="color:#52c41a;font-weight:bold">¥{{ fmt(overview.platformNet) }}</span></el-descriptions-item>
        </el-descriptions>
      </el-card>
    </div>

    <!-- ==================== Tab 2: 结算管理 ==================== -->
    <div v-if="mainTab === 'settlement'" class="tab-panel">
      <div class="sub-header">
        <div class="sub-actions">
          <el-button type="primary" size="small" @click="openGenerateDialog()">生成本期结算</el-button>
          <el-button size="small" @click="openAutoGenerateDialog()">批量自动生成</el-button>
          <el-button size="small" @click="exportRecords">导出对账单</el-button>
        </div>
      </div>
        <el-card shadow="never" style="margin-top:12px">
          <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
            <el-select v-model="filterSettlementOutletId" placeholder="全部服务商" clearable filterable style="width:180px" @change="loadRecords">
              <el-option v-for="o in settlementOutletOptions" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
            <el-select v-model="filterStatus" placeholder="状态" clearable style="width:140px" @change="loadRecords">
              <el-option label="待确认" :value="1" /><el-option label="已结算" :value="2" /><el-option label="已付款" :value="3" />
            </el-select>
            <el-date-picker v-model="dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" style="width:260px" @change="loadRecords" />
          </div>
        </el-card>
        <el-card shadow="never" style="margin-top:12px">
          <el-table :data="records" v-loading="loadingRecords" stripe>
            <el-table-column prop="recordNo" label="结算单号" width="180" />
            <el-table-column prop="outletName" label="网点" min-width="160" show-overflow-tooltip />
            <el-table-column label="结算周期" width="200">
              <template #default="{ row }">{{ row.periodStart ? row.periodStart.slice(0,10) : '' }} ~ {{ row.periodEnd ? row.periodEnd.slice(0,10) : '' }}</template>
            </el-table-column>
            <el-table-column prop="orderCount" label="订单数" width="80" align="center" />
            <el-table-column label="订单金额" width="120" align="right"><template #default="{ row }"><span class="money">¥{{ Number(row.orderAmount||0).toFixed(2) }}</span></template></el-table-column>
            <el-table-column label="网点分成" width="120" align="right"><template #default="{ row }"><span class="money outlet">¥{{ Number(row.outletAmount||0).toFixed(2) }}</span></template></el-table-column>
            <el-table-column label="平台分成" width="120" align="right"><template #default="{ row }"><span class="money platform">¥{{ Number(row.platformAmount||0).toFixed(2) }}</span></template></el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="{ row }"><el-tag :type="statusTagType(row.status)" size="small">{{ row.statusText }}</el-tag></template>
            </el-table-column>
            <el-table-column prop="ruleName" label="规则" width="140" />
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" link size="small" @click="viewRecord(row)">详情</el-button>
                <el-button v-if="row.status===1" type="success" link size="small" @click="handleUpdateStatus(row,2)">确认结算</el-button>
                <el-button v-if="row.status===2" type="warning" link size="small" @click="openPayDialog(row)">确认付款</el-button>
                <el-button v-if="row.status===1" type="danger" link size="small" @click="handleDeleteRecord(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination v-model:current-page="pagination.page" v-model:page-size="pagination.pageSize" :total="pagination.total" :page-sizes="[10,20,50]"
            layout="total, sizes, prev, pager, next" style="margin-top:12px;justify-content:flex-end"
            @size-change="loadRecords" @current-change="loadRecords" />
        </el-card>
    </div>

    <!-- ==================== Tab 3: 交易流水 ==================== -->
    <div v-if="mainTab === 'transaction'" class="tab-panel">
      <!-- 统计卡 -->
      <div class="trans-stats">
        <div class="trans-stat income"><div class="ts-icon">💰</div><div class="ts-body"><div class="ts-label">今日收入</div><div class="ts-value">¥{{ fmt(transStats.today?.income || 0) }}</div><div class="ts-sub" :class="parseFloat(transStats.today?.incomeTrend)>=0?'up':'down'">{{ parseFloat(transStats.today?.incomeTrend)>=0?'↑':'↓' }}{{ Math.abs(parseFloat(transStats.today?.incomeTrend||0)).toFixed(1) }}% 较昨日</div></div></div>
        <div class="trans-stat refund"><div class="ts-icon">↩️</div><div class="ts-body"><div class="ts-label">今日退款</div><div class="ts-value">¥{{ fmt(transStats.today?.refund || 0) }}</div><div class="ts-sub">{{ parseFloat(transStats.today?.refundTrend)>=0?'↑':'↓' }}{{ Math.abs(parseFloat(transStats.today?.refundTrend||0)).toFixed(1) }}% 较昨日</div></div></div>
        <div class="trans-stat net"><div class="ts-icon">📈</div><div class="ts-body"><div class="ts-label">今日净收</div><div class="ts-value">¥{{ fmt(transStats.today?.net || 0) }}</div><div class="ts-sub">平台实收</div></div></div>
        <div class="trans-stat count"><div class="ts-icon"><el-icon><DocumentChecked /></el-icon></div><div class="ts-body"><div class="ts-label">今日笔数</div><div class="ts-value">{{ transStats.today?.count || 0 }}</div><div class="ts-sub">交易笔数</div></div></div>
        <div class="trans-stat month"><div class="ts-icon"><el-icon><Calendar /></el-icon>️</div><div class="ts-body"><div class="ts-label">本月累计</div><div class="ts-value">¥{{ fmt(transStats.month?.income || 0) }}</div><div class="ts-sub">{{ transStats.month?.count || 0 }} 笔</div></div></div>
      </div>

      <!-- 筛选 -->
      <el-card shadow="never" style="margin-top:12px">
        <div style="display:flex;flex-direction:column;gap:10px">
          <div class="quick-range">
            <button v-for="r in quickRanges" :key="r.key" class="quick-btn" :class="{ active: quickRange === r.key }" @click="onQuickFilter(r.key)">{{ r.label }}</button>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
            <el-select v-model="filterParams.outletId" placeholder="全部服务商" clearable filterable style="width:180px" @change="onFilterChange">
              <el-option v-for="o in outletOptions" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
            <el-select v-model="filterParams.module" placeholder="全部业务" clearable style="width:140px" @change="onFilterChange">
              <el-option label="刻章" value="seal" /><el-option label="登报" value="newspaper" /><el-option label="代理记账" value="bookkeeping" />
            </el-select>
            <el-select v-model="filterParams.tradeType" placeholder="全部类型" clearable style="width:140px" @change="onFilterChange">
              <el-option label="订单支付" value="income" /><el-option label="退款" value="refund" /><el-option label="结算付款" value="expense" />
            </el-select>
            <el-select v-model="filterParams.status" placeholder="全部状态" clearable style="width:120px" @change="onFilterChange">
              <el-option label="交易成功" value="success" /><el-option label="交易失败" value="failed" />
            </el-select>
            <el-input v-model="filterParams.keyword" placeholder="订单号/交易单号/用户" style="width:180px" @keyup.enter="onFilterChange" />
            <el-date-picker v-model="dateRange2" type="daterange" range-separator="至" start-placeholder="开始" end-placeholder="结束" value-format="YYYY-MM-DD" style="width:240px" @change="onDateRangeChange" />
            <el-button type="primary" @click="loadData">查询</el-button>
            <el-button @click="onReset">重置</el-button>
            <el-button @click="onExport"><el-icon><Download /></el-icon> 导出</el-button>
          </div>
        </div>
      </el-card>

      <!-- 表格 -->
      <el-card shadow="never" style="margin-top:12px">
        <el-table :data="tableData" stripe v-loading="tableLoading">
          <el-table-column prop="createdAt" label="交易时间" width="170" sortable>
            <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column prop="transactionNo" label="交易单号" width="190" />
          <el-table-column prop="orderNo" label="关联订单" width="190" />
          <el-table-column prop="userName" label="用户" width="120" />
          <el-table-column prop="outletName" label="服务商" width="160" show-overflow-tooltip />
          <el-table-column prop="businessType" label="业务" width="100" />
          <el-table-column label="类型" width="100">
            <template #default="{ row }"><el-tag :type="tradeTypeTagType(row.tradeType)" size="small">{{ tradeTypeText(row.tradeType) }}</el-tag></template>
          </el-table-column>
          <el-table-column prop="payMethod" label="支付方式" width="100" />
          <el-table-column label="交易金额" width="120" align="right">
            <template #default="{ row }"><span :class="row.tradeType==='refund'?'money refund':'money'">{{ row.tradeType==='refund'?'-':'+' }}¥{{ Number(row.amount||0).toFixed(2) }}</span></template>
          </el-table-column>
          <el-table-column prop="fee" label="手续费" width="90" align="right"><template #default="{ row }">¥{{ Number(row.fee||0).toFixed(2) }}</template></el-table-column>
          <el-table-column label="实收" width="120" align="right"><template #default="{ row }"><span class="money">¥{{ Number(row.netAmount||0).toFixed(2) }}</span></template></el-table-column>
          <el-table-column label="状态" width="90">
            <template #default="{ row }"><el-tag :type="row.status==='success'?'success':'danger'" size="small">{{ row.statusText }}</el-tag></template>
          </el-table-column>
          <el-table-column label="操作" width="80" fixed="right">
            <template #default="{ row }"><el-button type="primary" link size="small" @click="viewTransDetail(row)">详情</el-button></template>
          </el-table-column>
        </el-table>
        <el-pagination v-model:current-page="transPage" v-model:page-size="transPageSize" :total="transTotal" :page-sizes="[10,20,50]"
          layout="total, sizes, prev, pager, next" style="margin-top:12px;justify-content:flex-end"
          @size-change="loadData" @current-change="loadData" />
      </el-card>
    </div>

    <!-- ==================== Tab 4: 退款管理 ==================== -->
    <div v-if="mainTab === 'refund'" class="tab-panel">
      <el-card shadow="never" style="margin-top:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <el-select v-model="refundFilter.status" placeholder="状态" clearable style="width:140px" @change="loadRefundList">
            <el-option label="申请中" :value="1" /><el-option label="已通过" :value="2" /><el-option label="已退款" :value="3" /><el-option label="已拒绝" :value="4" />
          </el-select>
          <el-button type="primary" size="small" @click="showApplyDialog = true">发起退款申请</el-button>
        </div>
        <el-table :data="refundList" stripe v-loading="refundLoading" border>
          <el-table-column prop="order_no" label="订单号" width="190" />
          <el-table-column label="退款金额" width="110"><template #default="{ row }">¥{{ Number(row.amount||0).toFixed(2) }}</template></el-table-column>
          <el-table-column prop="reason" label="申请原因" show-overflow-tooltip />
          <el-table-column label="状态" width="100">
            <template #default="{ row }"><el-tag :type="refundStatusTag(row.status)">{{ row.status_text }}</el-tag></template>
          </el-table-column>
          <el-table-column prop="review_note" label="审核备注" show-overflow-tooltip />
          <el-table-column label="申请时间" width="170"><template #default="{ row }">{{ formatDateTime(row.created_at) }}</template></el-table-column>
          <el-table-column label="操作" width="220" fixed="right">
            <template #default="{ row }">
              <template v-if="row.status === 1">
                <el-button type="success" size="small" @click="reviewRefund(row.id, 2)">通过</el-button>
                <el-button type="danger" size="small" @click="reviewRefund(row.id, 4)">拒绝</el-button>
              </template>
              <el-button v-if="row.status === 2" type="primary" size="small" @click="executeRefund(row.id)">执行退款</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination v-model:current-page="refundPage" v-model:page-size="refundPageSize" :total="refundTotal" :page-sizes="[10,20,50]"
          layout="total, sizes, prev, pager, next" style="margin-top:12px;justify-content:flex-end"
          @size-change="loadRefundList" @current-change="loadRefundList" />
      </el-card>
    </div>

    <!-- ============ 弹窗 ============ -->

    <!-- 规则编辑 -->
    <el-dialog v-model="ruleDialogVisible" :title="editingRule ? '编辑规则' : '新增规则'" width="500px">
      <el-form :model="ruleForm" label-width="110px">
        <el-form-item label="规则名称" required><el-input v-model="ruleForm.name" placeholder="如：默认固定金额规则" /></el-form-item>
        <el-form-item label="分成类型" required>
          <el-radio-group v-model="ruleForm.type">
            <el-radio value="fixed">固定金额（每单）</el-radio>
            <el-radio value="percent">百分比（每单）</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item :label="ruleForm.type==='fixed'?'固定金额':'百分比'" required>
          <el-input-number v-if="ruleForm.type==='fixed'" v-model="ruleForm.fixedAmount" :min="0" :precision="2" />
          <el-input-number v-else v-model="ruleForm.percent" :min="0" :max="100" :precision="2" />
          <span style="margin-left:8px">{{ ruleForm.type==='fixed'?'元/单':'%' }}</span>
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
        <el-form-item label="备注"><el-input v-model="ruleForm.remark" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="ruleDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="savingRule" @click="saveRule">保存</el-button>
      </template>
    </el-dialog>

    <!-- 生成本期结算 -->
    <el-dialog v-model="generateDialogVisible" title="生成本期结算" width="480px">
      <el-form :model="generateForm" label-width="110px">
        <el-form-item label="选择网点" required>
          <el-select v-model="generateForm.outletId" placeholder="选择网点" filterable style="width:100%">
            <el-option v-for="o in outlets" :key="o.id" :label="o.name" :value="o.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="开始日期" required>
          <el-date-picker v-model="generateForm.periodStart" type="date" value-format="YYYY-MM-DD" style="width:100%" />
        </el-form-item>
        <el-form-item label="结束日期" required>
          <el-date-picker v-model="generateForm.periodEnd" type="date" value-format="YYYY-MM-DD" style="width:100%" />
        </el-form-item>
      </el-form>
      <p class="dialog-tip">仅统计已完成且已支付的订单，网点分成按规则自动计算。</p>
      <template #footer>
        <el-button @click="generateDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="generating" @click="doGenerate">生成</el-button>
      </template>
    </el-dialog>

    <!-- 批量自动生成 -->
    <el-dialog v-model="autoGenerateDialogVisible" title="批量自动生成" width="480px">
      <el-form :model="autoGenerateForm" label-width="110px">
        <el-form-item label="开始日期" required><el-date-picker v-model="autoGenerateForm.periodStart" type="date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item>
        <el-form-item label="结束日期" required><el-date-picker v-model="autoGenerateForm.periodEnd" type="date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item>
      </el-form>
      <p class="dialog-tip">为所有有已完成订单的网点自动生成结算单。</p>
      <template #footer>
        <el-button @click="autoGenerateDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="autoGenerating" @click="doAutoGenerate">开始生成</el-button>
      </template>
    </el-dialog>

    <!-- 确认付款 -->
    <el-dialog v-model="payDialogVisible" title="确认付款" width="420px">
      <el-form :model="payForm" label-width="90px">
        <el-form-item label="网点"><span>{{ payTarget ? payTarget.outletName : '' }}</span></el-form-item>
        <el-form-item label="付款金额">
          <span class="money outlet" style="font-size:18px;font-weight:bold">¥{{ Number(payTarget ? payTarget.outletAmount : 0).toFixed(2) }}</span>
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

    <!-- 结算详情 -->
    <el-dialog v-model="detailDialogVisible" title="结算详情" width="560px">
      <el-descriptions :column="2" border v-if="detailRecord">
        <el-descriptions-item label="结算单号">{{ detailRecord.recordNo }}</el-descriptions-item>
        <el-descriptions-item label="网点">{{ detailRecord.outletName }}</el-descriptions-item>
        <el-descriptions-item label="结算周期" :span="2">{{ detailRecord.periodStart ? detailRecord.periodStart.slice(0,10) : '' }} ~ {{ detailRecord.periodEnd ? detailRecord.periodEnd.slice(0,10) : '' }}</el-descriptions-item>
        <el-descriptions-item label="订单数量">{{ detailRecord.orderCount }}</el-descriptions-item>
        <el-descriptions-item label="订单金额"><span class="money">¥{{ Number(detailRecord.orderAmount||0).toFixed(2) }}</span></el-descriptions-item>
        <el-descriptions-item label="网点分成"><span class="money outlet">¥{{ Number(detailRecord.outletAmount||0).toFixed(2) }}</span></el-descriptions-item>
        <el-descriptions-item label="平台分成"><span class="money platform">¥{{ Number(detailRecord.platformAmount||0).toFixed(2) }}</span></el-descriptions-item>
        <el-descriptions-item label="状态"><el-tag :type="statusTagType(detailRecord.status)" size="small">{{ detailRecord.statusText }}</el-tag></el-descriptions-item>
        <el-descriptions-item label="结算规则">{{ detailRecord.ruleName }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ detailRecord.createdAt ? detailRecord.createdAt.slice(0,16) : '' }}</el-descriptions-item>
        <el-descriptions-item label="付款时间" v-if="detailRecord.paidAt">{{ detailRecord.paidAt ? detailRecord.paidAt.slice(0,16) : '' }}</el-descriptions-item>
        <el-descriptions-item label="付款备注" v-if="detailRecord.paidRemark" :span="2">{{ detailRecord.paidRemark }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>

    <!-- 交易详情 -->
    <el-dialog v-model="transDetailVisible" title="交易详情" width="560px">
      <el-descriptions :column="2" border v-if="transDetailRow">
        <el-descriptions-item label="交易单号">{{ transDetailRow.transactionNo }}</el-descriptions-item>
        <el-descriptions-item label="关联订单">{{ transDetailRow.orderNo }}</el-descriptions-item>
        <el-descriptions-item label="用户">{{ transDetailRow.userName }} {{ transDetailRow.userPhone }}</el-descriptions-item>
        <el-descriptions-item label="服务商">{{ transDetailRow.outletName || '—' }}</el-descriptions-item>
        <el-descriptions-item label="业务">{{ transDetailRow.businessType }}</el-descriptions-item>
        <el-descriptions-item label="交易类型">{{ tradeTypeText(transDetailRow.tradeType) }}</el-descriptions-item>
        <el-descriptions-item label="支付方式">{{ transDetailRow.payMethod }}</el-descriptions-item>
        <el-descriptions-item label="状态"><el-tag :type="transDetailRow.status==='success'?'success':'danger'">{{ transDetailRow.statusText }}</el-tag></el-descriptions-item>
        <el-descriptions-item label="交易金额" align="right"><span :class="transDetailRow.tradeType==='refund'?'money refund':'money'" style="font-size:16px;font-weight:bold">{{ transDetailRow.tradeType==='refund'?'-':'+' }}¥{{ Number(transDetailRow.amount||0).toFixed(2) }}</span></el-descriptions-item>
        <el-descriptions-item label="手续费" align="right">¥{{ Number(transDetailRow.fee||0).toFixed(2) }}</el-descriptions-item>
        <el-descriptions-item label="实收金额" align="right"><span class="money" style="font-size:16px;font-weight:bold">¥{{ Number(transDetailRow.netAmount||0).toFixed(2) }}</span></el-descriptions-item>
        <el-descriptions-item label="交易流水号" :span="2">{{ transDetailRow.transactionId || '—' }}</el-descriptions-item>
        <el-descriptions-item label="交易时间" :span="2">{{ formatDateTime(transDetailRow.createdAt) }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>

    <!-- 退款申请 -->
    <el-dialog v-model="showApplyDialog" title="发起退款申请" width="500px">
      <el-form :model="applyForm" label-width="100px">
        <el-form-item label="订单ID"><el-input v-model="applyForm.orderId" placeholder="输入订单ID" /></el-form-item>
        <el-form-item label="退款金额"><el-input-number v-model="applyForm.amount" :min="0.01" :precision="2" style="width:100%" /></el-form-item>
        <el-form-item label="退款原因"><el-input v-model="applyForm.reason" type="textarea" :rows="3" placeholder="请输入退款原因" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showApplyDialog = false">取消</el-button>
        <el-button type="primary" :loading="applyingRefund" @click="doApplyRefund">提交申请</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TrendChart from '@/components/TrendChart.vue'
import ModuleDonut from '@/components/ModuleDonut.vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Coin, Setting, CloseBold, Shop, TrendCharts } from '@element-plus/icons-vue'
import {
  getFinanceOverview,
  getSettlementRules, createSettlementRule, updateSettlementRule, deleteSettlementRule,
  getSettlementRecords, getSettlementRecord, generateSettlementRecord,
  autoGenerateSettlementRecords, updateSettlementStatus, deleteSettlementRecord,
  getOutletsAPI,
  getTransactionStats, getTransactionFlows,
  exportTransactionFlows, exportSettlementRecords,
  getOutletsWithFlows,
  getRefundList, applyRefund, reviewRefund as apiReviewRefund, executeRefund as apiExecuteRefund,
  getOutletPendingSummary,
  getSettlementOutletSummary,
} from '@/api'

// ==================== 主 Tab 控制 ====================
const mainTab = ref('overview')
const route = useRoute()
const router = useRouter()

function switchMain(tab) {
  mainTab.value = tab
  router.push({ query: tab === 'overview' ? {} : { tab } })
  if (tab === 'overview') { loadOverview(); loadModuleMonth() }
  else if (tab === 'settlement') { loadSettlementOutletOpts(); loadRecords() }
  else if (tab === 'transaction') { loadOutletOpts(); loadTransStats(); loadData() }
  else if (tab === 'refund') loadRefundList()
}

// ==================== Tab 1: 财务总览 ====================
const overview = ref({})
const byModule = ref([])
const moduleMonth = ref([])
const trendData = ref([])
const trendRange = ref('30')
const outletPending = ref([])

async function loadOverview() {
  try {
    const res = await getFinanceOverview({ days: parseInt(trendRange.value) })
    overview.value = res || {}
    byModule.value = res?.byModule || []
    trendData.value = res?.trend || []
  } catch (e) { console.error(e) }
}

// 本月口径（自然月至今），用于营收分布环形图
async function loadModuleMonth() {
  try {
    const now = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    const startDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`
    const endDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
    const res = await getFinanceOverview({ startDate, endDate })
    moduleMonth.value = (res?.byModule || []).filter(m => m.tradeType === 'income')
  } catch (e) { console.error(e) }
}

async function loadOutletPending() {
  try {
    const res = await getOutletPendingSummary()
    const list = Array.isArray(res) ? res : []
    outletPending.value = list.filter((it) => Number(it?.pendingAmount || 0) > 0)
  } catch (e) { console.error(e) }
}

function onTrendRangeChange(days) {
  trendRange.value = String(days)
  loadOverview()
}

function fmt(v) { return Number(v || 0).toFixed(2) }

const barWidth = (amount) => {
  const max = byModule.value.reduce((m, b) => Math.max(m, b.amount || 0), 0)
  if (max <= 0) return 0
  return Math.max(2, Math.round((amount / max) * 100))
}

const trendMax = computed(() => {
  const max = Math.max(...trendData.value.map(d => Math.max(d.income, d.refund)))
  return max > 0 ? max : 1
})

// ==================== Tab 2: 结算管理 ====================
const settleSubTab = ref('records')

// 结算记录
const records = ref([])
const loadingRecords = ref(false)
const outlets = ref([])
const pagination = reactive({ page: 1, pageSize: 10, total: 0 })
const filterOutletId = ref('')
const filterSettlementOutletId = ref('')
const settlementOutletOptions = ref([])
const filterStatus = ref('')
const dateRange = ref([])

async function loadRecords() {
  loadingRecords.value = true
  try {
    const params = {
      page: pagination.page, pageSize: pagination.pageSize,
      ...(filterOutletId.value && { outletId: filterOutletId.value }),
      ...(filterSettlementOutletId.value && { outletId: filterSettlementOutletId.value }),
      ...(filterStatus.value && { status: filterStatus.value }),
      ...(dateRange.value && dateRange.value[0] && { startDate: dateRange.value[0] }),
      ...(dateRange.value && dateRange.value[1] && { endDate: dateRange.value[1] })
    }
    const res = await getSettlementRecords(params)
    const data = res || {}
    records.value = data?.items || (Array.isArray(data) ? data : [])
    pagination.total = data?.total || 0
  } catch (e) { console.error(e) }
  finally { loadingRecords.value = false }
}

async function loadOutlets() {
  try {
    const res = await getOutletsAPI({ page: 1, pageSize: 100 })
    const data = res || {}
    outlets.value = data?.list || (Array.isArray(data) ? data : [])
  } catch (e) { console.error(e) }
}

function statusTagType(s) { return { 1:'warning', 2:'primary', 3:'success' }[s] || 'info' }

// 规则配置
const rules = ref([])
const loadingRules = ref(false)
const ruleDialogVisible = ref(false)
const editingRule = ref(null)
const savingRule = ref(false)
const ruleFormStatus = ref(1)
const defaultRuleForm = () => ({ name:'', type:'fixed', fixedAmount:50, percent:10, settlementType:'manual', status:1, isDefault:false, remark:'' })
const ruleForm = reactive(defaultRuleForm())

async function loadRules() {
  loadingRules.value = true
  try { const res = await getSettlementRules(); rules.value = (res && res.data) || (Array.isArray(res) ? res : []) }
  catch (e) { console.error(e) }
  finally { loadingRules.value = false }
}

function openRuleDialog(row) {
  editingRule.value = row || null
  if (row) Object.assign(ruleForm, { name:row.name, type:row.type, fixedAmount:row.fixedAmount, percent:row.percent, settlementType:row.settlementType, status:row.status, isDefault:row.isDefault, remark:row.remark||'' }), ruleFormStatus.value = row.status
  else Object.assign(ruleForm, defaultRuleForm())
  ruleDialogVisible.value = true
}

async function saveRule() {
  if (!ruleForm.name) { ElMessage.warning('请输入规则名称'); return }
  savingRule.value = true
  try {
    const data = { ...ruleForm, status: ruleFormStatus.value }
    if (editingRule.value) await updateSettlementRule(editingRule.value.id, data)
    else await createSettlementRule(data)
    ElMessage.success('保存成功')
    ruleDialogVisible.value = false
    loadRules()
  } catch (e) { console.error(e); ElMessage.error('保存失败') }
  finally { savingRule.value = false }
}

async function handleDeleteRule(row) {
  try {
    await ElMessageBox.confirm('确定删除规则：' + row.name + '？', '确认删除', { type:'warning' })
    await deleteSettlementRule(row.id)
    ElMessage.success('删除成功')
    loadRules()
  } catch (e) { if (e !== 'cancel') console.error(e) }
}

async function handleUpdateStatus(row, status) {
  let msg = ''
  if (status === 2) {
    msg = `确认结算「${row.outletName}」？\n结算周期：${(row.periodStart || '').slice(0, 10)} ~ ${(row.periodEnd || '').slice(0, 10)}\n网点分成：¥${Number(row.outletAmount || 0).toFixed(2)}`
  } else if (status === 3) {
    msg = `确认向「${row.outletName}」付款 ¥${Number(row.outletAmount || 0).toFixed(2)}？`
  } else {
    msg = '确定执行此操作？'
  }
  try {
    await ElMessageBox.confirm(msg, '操作确认', { type:'warning', dangerouslyUseHTMLString: false })
    await updateSettlementStatus(row.id, { status })
    ElMessage.success('操作成功')
    loadRecords()
  } catch (e) { if (e !== 'cancel') console.error(e) }
}

async function handleDeleteRecord(row) {
  try {
    await ElMessageBox.confirm('确定删除结算单 ' + row.recordNo + '？', '确认删除', { type:'warning' })
    await deleteSettlementRecord(row.id)
    ElMessage.success('删除成功')
    loadRecords()
  } catch (e) { if (e !== 'cancel') console.error(e) }
}

// 生成
const generateDialogVisible = ref(false)
const generating = ref(false)
const generateForm = reactive({ outletId:'', periodStart:'', periodEnd:'' })

function openGenerateDialog() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  generateForm.periodStart = fmtLocalDate(start)
  generateForm.periodEnd = fmtLocalDate(now)
  generateForm.outletId = ''
  generateDialogVisible.value = true
}

async function doGenerate() {
  if (!generateForm.outletId || !generateForm.periodStart || !generateForm.periodEnd) { ElMessage.warning('请填写完整信息'); return }
  generating.value = true
  try {
    await generateSettlementRecord(generateForm)
    ElMessage.success('结算单生成成功')
    generateDialogVisible.value = false
    loadRecords()
  } catch (e) { ElMessage.error(e.response?.data?.message || e.message || '生成失败') }
  finally { generating.value = false }
}

const autoGenerateDialogVisible = ref(false)
const autoGenerating = ref(false)
const autoGenerateForm = reactive({ periodStart:'', periodEnd:'' })

function openAutoGenerateDialog() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  autoGenerateForm.periodStart = fmtLocalDate(start)
  autoGenerateForm.periodEnd = fmtLocalDate(now)
  autoGenerateDialogVisible.value = true
}

async function doAutoGenerate() {
  if (!autoGenerateForm.periodStart || !autoGenerateForm.periodEnd) { ElMessage.warning('请填写完整信息'); return }
  if (autoGenerateForm.periodStart > autoGenerateForm.periodEnd) {
    ElMessage.warning('开始日期不能晚于结束日期'); return
  }
  autoGenerating.value = true
  try {
    const results = await autoGenerateSettlementRecords(autoGenerateForm)
    const data = results?.data || (Array.isArray(results) ? results : [])
    const success = data.filter(function(r) { return r.success })
    const fail = data.filter(function(r) { return !r.success })
    ElMessage.success('生成完成：' + success.length + ' 个成功，' + fail.length + ' 个失败')
    if (fail.length > 0 && fail.length <= 5) {
      const reasons = fail.slice(0, 3).map(r => r.reason || r.message || '未知原因').join('；')
      ElMessage.warning('部分失败原因：' + reasons)
    }
    autoGenerateDialogVisible.value = false
    if (success.length > 0) loadRecords()
  } catch (e) { ElMessage.error(e.message || '生成失败') }
  finally { autoGenerating.value = false }
}

// 付款
const payDialogVisible = ref(false)
const payTarget = ref(null)
const paying = ref(false)
const payForm = reactive({ remark:'' })

function openPayDialog(row) { payTarget.value = row; payForm.remark = ''; payDialogVisible.value = true }

async function doPay() {
  paying.value = true
  try {
    await updateSettlementStatus(payTarget.value.id, { status:3, remark:payForm.remark })
    ElMessage.success('付款确认成功')
    payDialogVisible.value = false
    loadRecords()
  } catch (e) { ElMessage.error(e.message || '操作失败') }
  finally { paying.value = false }
}

// 详情
const detailDialogVisible = ref(false)
const detailRecord = ref(null)

async function viewRecord(row) {
  try { const res = await getSettlementRecord(row.id); detailRecord.value = res; detailDialogVisible.value = true }
  catch (e) { ElMessage.error('加载详情失败') }
}

// 本地日期格式化（避免 toISOString 的 UTC 偏移）
function fmtLocalDate(d) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// CSV 下载（带 BOM，Excel 可直接打开中文）
function downloadCSV(filename, headers, rows) {
  const esc = (v) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
  }
  const csv = '\uFEFF' + [headers, ...rows].map(row => row.map(esc).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const transStats = ref({})
const filterParams = reactive({ outletId:'', module:'', tradeType:'', status:'', keyword:'' })
const quickRange = ref('today')
const dateRange2 = ref([])
const quickRanges = [
  { key:'today', label:'今日' },
  { key:'yesterday', label:'昨日' },
  { key:'week', label:'近7天' },
  { key:'month', label:'本月' },
  { key:'lastMonth', label:'上月' },
]
const outletOptions = ref([])
const tableData = ref([])
const tableLoading = ref(false)
const transPage = ref(1)
const transPageSize = ref(10)
const transTotal = ref(0)
const transDetailVisible = ref(false)
const transDetailRow = ref(null)

async function loadOutletOpts() {
  try {
    const res = await getOutletsWithFlows()
    const data = res || {}
    const list = Array.isArray(data) ? data : (data?.items || [])
    outletOptions.value = (list || []).map((o) => ({ label: o.outletName, value: o.outletId }))
  } catch (e) { console.error(e) }
}
async function loadSettlementOutletOpts() {
  try {
    const res = await getSettlementOutletSummary()
    const list = Array.isArray(res) ? res : (res?.items || res?.list || [])
    settlementOutletOptions.value = (list || []).map(function(o) { return { label: o.outletName, value: o.outletId } })
  } catch (e) { console.error(e) }
}

async function loadTransStats() {
  try { const res = await getTransactionStats(); transStats.value = (res?.data && typeof res?.data === 'object') ? res.data : (res || {}) }
  catch (e) { console.error(e) }
}

async function loadData() {
  tableLoading.value = true
  try {
    const params = {
      page: transPage.value, pageSize: transPageSize.value,
      ...(filterParams.outletId && { outletId: filterParams.outletId }),
      ...(filterParams.module && { module: filterParams.module }),
      ...(filterParams.tradeType && { tradeType: filterParams.tradeType }),
      ...(filterParams.status && { status: filterParams.status }),
      ...(filterParams.keyword && { keyword: filterParams.keyword }),
      ...(dateRange2.value && dateRange2.value[0] && { startDate: dateRange2.value[0] }),
      ...(dateRange2.value && dateRange2.value[1] && { endDate: dateRange2.value[1] }),
    }
    const res = await getTransactionFlows(params)
    const data = res || {}
    tableData.value = data?.items || (Array.isArray(data) ? data : [])
    transTotal.value = data?.total || 0
  } catch (e) { console.error(e) }
  finally { tableLoading.value = false }
}

function onQuickFilter(key) {
  quickRange.value = key
  const now = new Date()
  let start, end = fmtLocalDate(now)
  if (key === 'today') start = end
  else if (key === 'yesterday') { const y = new Date(now); y.setDate(y.getDate()-1); start = fmtLocalDate(y) }
  else if (key === 'week') { const w = new Date(now); w.setDate(w.getDate()-7); start = fmtLocalDate(w) }
  else if (key === 'month') start = fmtLocalDate(new Date(now.getFullYear(), now.getMonth(), 1))
  else if (key === 'lastMonth') {
    const lm = new Date(now.getFullYear(), now.getMonth()-1, 1)
    const lmEnd = new Date(now.getFullYear(), now.getMonth(), 0)
    start = fmtLocalDate(lm); end = fmtLocalDate(lmEnd)
  }
  dateRange2.value = [start, end]
  filterParams.outletId = ''
  loadData()
  loadTransStats()
}

function onFilterChange() { transPage.value = 1; loadData() }
function onDateRangeChange() { transPage.value = 1; loadData() }

function onReset() {
  filterParams.outletId = ''; filterParams.module = ''; filterParams.tradeType = ''; filterParams.status = ''; filterParams.keyword = ''
  dateRange2.value = []; quickRange.value = 'today'; transPage.value = 1
  loadData(); loadTransStats()
}

async function onExport() {
  try {
    const params = {
      page: 1, pageSize: 10000,
      ...(filterParams.outletId && { outletId: filterParams.outletId }),
      ...(filterParams.module && { module: filterParams.module }),
      ...(filterParams.tradeType && { tradeType: filterParams.tradeType }),
      ...(filterParams.status && { status: filterParams.status }),
      ...(filterParams.keyword && { keyword: filterParams.keyword }),
      ...(dateRange2.value && dateRange2.value[0] && { startDate: dateRange2.value[0] }),
      ...(dateRange2.value && dateRange2.value[1] && { endDate: dateRange2.value[1] }),
    }
    const res = await exportTransactionFlows(params)
    const list = Array.isArray(res) ? res : (res?.items || [])
    if (!list.length) { ElMessage.info('暂无数据可导出'); return }
    const headers = ['交易时间', '交易单号', '关联订单', '用户', '服务商', '业务', '类型', '支付方式', '交易金额', '手续费', '实收', '状态']
    const rows = list.map(r => [
      r.createdAt || '', r.transactionNo || '', r.orderNo || '', r.userName || '', r.outletName || '',
      r.businessType || '', tradeTypeText(r.tradeType), r.payMethod || '',
      r.amount, r.fee, r.netAmount, r.statusText || r.status || '',
    ])
    downloadCSV('交易流水_' + fmtLocalDate(new Date()) + '.csv', headers, rows)
    ElMessage.success('导出成功')
  } catch (e) { console.error(e); ElMessage.error('导出失败') }
}

async function exportRecords() {
  try {
    const params = {
      ...(filterSettlementOutletId.value && { outletId: filterSettlementOutletId.value }),
      ...(filterStatus.value && { status: filterStatus.value }),
      ...(dateRange.value && dateRange.value[0] && { startDate: dateRange.value[0] }),
      ...(dateRange.value && dateRange.value[1] && { endDate: dateRange.value[1] }),
    }
    const res = await exportSettlementRecords(params)
    const list = Array.isArray(res) ? res : (res?.items || [])
    if (!list.length) { ElMessage.info('暂无数据可导出'); return }
    const headers = ['结算单号', '网点', '结算周期', '订单数', '订单金额', '网点分成', '平台分成', '状态']
    const rows = list.map(r => [
      r.recordNo || '', r.outletName || '',
      (r.periodStart ? r.periodStart.slice(0,10) : '') + ' ~ ' + (r.periodEnd ? r.periodEnd.slice(0,10) : ''),
      r.orderCount ?? '', r.orderAmount ?? '', r.outletAmount ?? '', r.platformAmount ?? '',
      r.statusText || r.status || '',
    ])
    downloadCSV('结算对账单_' + fmtLocalDate(new Date()) + '.csv', headers, rows)
    ElMessage.success('导出成功')
  } catch (e) { console.error(e); ElMessage.error('导出失败') }
}
function viewTransDetail(row) { transDetailRow.value = row; transDetailVisible.value = true }

function tradeTypeTagType(type) { return { income:'success', refund:'danger', expense:'warning' }[type] || '' }
function tradeTypeText(type) { return { income:'订单支付', refund:'退款', expense:'结算付款' }[type] || type }

// ==================== Tab 4: 退款管理 ====================
const refundList = ref([])
const refundLoading = ref(false)
const refundFilter = reactive({ status: null })
const refundPage = ref(1)
const refundPageSize = ref(10)
const refundTotal = ref(0)
const showApplyDialog = ref(false)
const applyingRefund = ref(false)
const applyForm = reactive({ orderId:'', amount:0, reason:'' })

async function loadRefundList() {
  refundLoading.value = true
  try {
    const res = await getRefundList({ page: refundPage.value, pageSize: refundPageSize.value, ...(refundFilter.status && { status: refundFilter.status }) })
    refundList.value = res?.items || (Array.isArray(res) ? res : [])
    refundTotal.value = res?.total || 0
  } catch (e) { console.error(e) }
  finally { refundLoading.value = false }
}

function refundStatusTag(s) { return { 1:'warning', 2:'success', 3:'info', 4:'danger' }[s] || 'info' }

async function reviewRefund(id, status) {
  const actionText = status === 2 ? '通过' : '拒绝'
  try {
    await ElMessageBox.confirm(`确定${actionText}此退款申请？`, '操作确认', { type:'warning' })
    await apiReviewRefund(id, { status })
    ElMessage.success('操作成功')
    loadRefundList()
  } catch (e) { if (e !== 'cancel') console.error(e) }
}

async function executeRefund(id) {
  try {
    await ElMessageBox.confirm('确定执行退款？', '确认', { type:'warning' })
    await apiExecuteRefund(id)
    ElMessage.success('退款已提交')
    loadRefundList()
  } catch (e) { if (e !== 'cancel') console.error(e) }
}

async function doApplyRefund() {
  if (!applyForm.orderId) { ElMessage.warning('请输入订单ID'); return }
  if (!applyForm.amount || applyForm.amount <= 0) { ElMessage.warning('请输入退款金额'); return }
  applyingRefund.value = true
  try {
    await applyRefund({ orderId: applyForm.orderId, amount: applyForm.amount, reason: applyForm.reason })
    ElMessage.success('退款申请已提交')
    showApplyDialog.value = false
    loadRefundList()
  } catch (e) { ElMessage.error(e?.message || '申请失败') }
  finally { applyingRefund.value = false }
}

// ==================== 公共工具 ====================
function formatDateTime(date) {
  if (!date) return '—'
  var d = new Date(date)
  if (isNaN(d.getTime())) return '—'
  var y = d.getFullYear()
  var m = String(d.getMonth()+1).padStart(2,'0')
  var day = String(d.getDate()).padStart(2,'0')
  var h = String(d.getHours()).padStart(2,'0')
  var min = String(d.getMinutes()).padStart(2,'0')
  var s = String(d.getSeconds()).padStart(2,'0')
  return y+'-'+m+'-'+day+' '+h+':'+min+':'+s
}

// ==================== 初始化 ====================
onMounted(function() {
  const tab = String(route.query.tab || '')
  if (['settlement', 'transaction', 'refund'].includes(tab)) {
    switchMain(tab)
  } else {
    loadOverview()
    loadOutletPending()
    loadModuleMonth()
  }
})
</script>

<style scoped>
.finance-page { padding: 20px; background: #f5f7fa; min-height: 100vh; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h2 { margin: 0; font-size: 18px; color: #303133; font-weight: 600; }

.stat-cards { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; margin-bottom: 16px; }
.stat-card { border-radius: 16px; padding: 20px 18px; display: flex; align-items: center; gap: 14px; box-shadow: 0 1px 4px rgba(0,0,0,.06); transition: transform .2s, box-shadow .2s; }
.stat-card:hover { transform: translateY(-3px); box-shadow: 0 6px 20px rgba(0,0,0,.1); }
.stat-icon { width: 46px; height: 46px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; color: #fff; }
.stat-body { flex: 1; min-width: 0; }
.stat-label { font-size: 13px; color: #666; margin-bottom: 4px; }
.stat-value { font-size: 20px; font-weight: 700; color: #303133; line-height: 1.2; }
.stat-sub { font-size: 12px; color: #999; margin-top: 2px; }
.stat-card.income { background: linear-gradient(135deg, #eef2ff 0%, #dde4ff 100%); border: 1px solid rgba(91,111,232,.15); }
.stat-card.income .stat-icon { background: linear-gradient(135deg, #5B6FE8, #7B8FF8); }
.stat-card.fee { background: linear-gradient(135deg, #fff7e6 0%, #ffe8c2 100%); border: 1px solid rgba(250,140,22,.15); }
.stat-card.fee .stat-icon { background: linear-gradient(135deg, #fa8c16, #ffa940); }
.stat-card.refund-stat { background: linear-gradient(135deg, #fff1f0 0%, #ffccc7 100%); border: 1px solid rgba(245,34,45,.15); }
.stat-card.refund-stat .stat-icon { background: linear-gradient(135deg, #f5222d, #ff4d4f); }
.stat-card.settle { background: linear-gradient(135deg, #e6fffb 0%, #b5f5ec 100%); border: 1px solid rgba(19,194,194,.15); }
.stat-card.settle .stat-icon { background: linear-gradient(135deg, #13c2c2, #36cfc9); }
.stat-card.net { background: linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%); border: 1px solid rgba(82,196,26,.15); }
.stat-card.net .stat-icon { background: linear-gradient(135deg, #52c41a, #73d13d); }

.finance-tabs { background: #fff; border-radius: 8px; margin-bottom: 16px; overflow: hidden; }
.tab-bar { display: flex; border-bottom: 1px solid #ebeef5; }
.tab-btn { padding: 14px 24px; border: none; background: none; cursor: pointer; font-size: 15px; color: #606266; border-bottom: 2px solid transparent; margin-bottom: -1px; transition: all 0.2s; }
.tab-btn:hover { color: #5B6FE8; }
.tab-btn.active { color: #5B6FE8; border-bottom-color: #5B6FE8; font-weight: 600; }
.tab-panel { animation: fadeIn 0.2s; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.sub-header { display: flex; justify-content: space-between; align-items: center; background: #fff; border-radius: 8px; padding: 8px 16px; }
.sub-tab-bar { display: flex; gap: 4px; }
.sub-tab-btn { padding: 8px 16px; border: none; background: none; cursor: pointer; font-size: 14px; color: #606266; border-radius: 4px; transition: all 0.2s; }
.sub-tab-btn:hover { background: #f5f7fa; color: #5B6FE8; }
.sub-tab-btn.active { background: #ecf5ff; color: #5B6FE8; font-weight: 600; }
.sub-actions { display: flex; gap: 8px; }

.content-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.panel-title { font-size: 14px; font-weight: 600; color: #303133; }
.module-list { display: flex; flex-direction: column; gap: 12px; }
.module-row { display: flex; align-items: center; gap: 12px; }
.module-info { display: flex; flex-direction: column; min-width: 80px; }
.module-name { font-size: 14px; color: #303133; }
.module-count { font-size: 12px; color: #909399; }
.module-bar-wrap { flex: 1; height: 8px; background: #f0f2f5; border-radius: 4px; overflow: hidden; }
.module-bar { height: 100%; background: #5B6FE8; border-radius: 4px; transition: width 0.6s; }
.module-amount { font-size: 14px; color: #303133; min-width: 80px; text-align: right; font-weight: 500; }

.todo-items { display: flex; gap: 16px; }
.todo-item { display: flex; align-items: center; gap: 12px; background: #fafafa; border: 1px solid #f0f0f0; border-radius: 8px; padding: 12px 16px; cursor: pointer; transition: all 0.2s; flex: 1; }
.todo-item:hover { border-color: #5B6FE8; background: #f0f5ff; }
.todo-icon { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.todo-info { display: flex; flex-direction: column; }
.todo-num { font-size: 22px; font-weight: 700; color: #303133; line-height: 1.2; }
.todo-label { font-size: 13px; color: #909399; margin-top: 2px; }
.todo-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px; color: #909399; background: #fafafa; border-radius: 8px; width: 100%; }

.trend-chart { padding: 8px 0; }
.trend-chart-container { display: flex; gap: 12px; }
.trend-y-axis { display: flex; flex-direction: column; justify-content: space-between; height: 100px; width: 60px; flex-shrink: 0; }
.y-tick { display: flex; align-items: center; }
.y-label { font-size: 11px; color: #909399; width: 55px; text-align: right; }
.trend-chart-scroll { flex: 1; overflow-x: auto; }
.trend-chart-scroll::-webkit-scrollbar { height: 6px; }
.trend-chart-scroll::-webkit-scrollbar-thumb { background: #dcdfe6; border-radius: 3px; }
.trend-chart-area { position: relative; min-height: 130px; }
.trend-grid { position: absolute; top: 0; left: 0; right: 0; height: 100px; display: flex; flex-direction: column; justify-content: space-between; pointer-events: none; z-index: 0; }
.grid-line { border-bottom: 1px dashed #e4e7ed; width: 100%; }
.trend-bars { position: relative; z-index: 1; display: flex; align-items: flex-end; gap: 12px; padding: 0 4px 30px 4px; }
.trend-bar-wrap { display: flex; flex-direction: column; align-items: center; flex-shrink: 0; }
.bar-group { display: flex; align-items: flex-end; gap: 4px; height: 100px; }
.bar-income { width: 20px; background: #5B6FE8; border-radius: 3px 3px 0 0; min-height: 4px; transition: opacity 0.2s; cursor: pointer; }
.bar-income:hover { opacity: 0.8; }
.bar-refund { width: 20px; background: #ff7875; border-radius: 3px 3px 0 0; min-height: 4px; transition: opacity 0.2s; cursor: pointer; }
.bar-refund:hover { opacity: 0.8; }
.trend-legend { display: flex; gap: 24px; margin-top: 12px; justify-content: center; }
.trend-date { font-size: 11px; color: #606266; text-align: center; width: 48px; margin-top: 8px; }
.legend-item { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #909399; }
.dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.income-dot { background: #5B6FE8; }
.refund-dot { background: #f5222d; }

.quick-range { display: flex; gap: 8px; }
.quick-btn { padding: 5px 14px; border: 1px solid #dcdfe6; background: #fff; border-radius: 4px; cursor: pointer; font-size: 13px; color: #606266; }
.quick-btn:hover { border-color: #5B6FE8; color: #5B6FE8; }
.quick-btn.active { background: #ecf5ff; border-color: #5B6FE8; color: #5B6FE8; font-weight: 600; }

.trans-stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; margin-bottom: 0; }
.trans-stat { border-radius: 16px; padding: 18px 16px; display: flex; align-items: center; gap: 12px; box-shadow: 0 1px 4px rgba(0,0,0,.06); transition: transform .2s, box-shadow .2s; }
.trans-stat:hover { transform: translateY(-3px); box-shadow: 0 6px 20px rgba(0,0,0,.1); }
.ts-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; color: #fff; }
.ts-body { flex: 1; min-width: 0; }
.ts-label { font-size: 12px; color: #666; margin-bottom: 4px; }
.ts-value { font-size: 18px; font-weight: 700; color: #303133; line-height: 1.2; }
.ts-sub { font-size: 11px; margin-top: 2px; }
.ts-sub.up { color: #52c41a; }
.ts-sub.down { color: #f5222d; }
.trans-stat.income { background: linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%); border: 1px solid rgba(82,196,26,.15); }
.trans-stat.income .ts-icon { background: linear-gradient(135deg, #52c41a, #73d13d); }
.trans-stat.refund { background: linear-gradient(135deg, #fff1f0 0%, #ffccc7 100%); border: 1px solid rgba(245,34,45,.15); }
.trans-stat.refund .ts-icon { background: linear-gradient(135deg, #f5222d, #ff4d4f); }
.trans-stat.net { background: linear-gradient(135deg, #eef2ff 0%, #dde4ff 100%); border: 1px solid rgba(91,111,232,.15); }
.trans-stat.net .ts-icon { background: linear-gradient(135deg, #5B6FE8, #7B8FF8); }
.trans-stat.count { background: linear-gradient(135deg, #e6fffb 0%, #b5f5ec 100%); border: 1px solid rgba(19,194,194,.15); }
.trans-stat.count .ts-icon { background: linear-gradient(135deg, #13c2c2, #36cfc9); }
.trans-stat.month { background: linear-gradient(135deg, #fff7e6 0%, #ffe8c2 100%); border: 1px solid rgba(250,140,22,.15); }
.trans-stat.month .ts-icon { background: linear-gradient(135deg, #fa8c16, #ffa940); }

.money { color: #303133; }
.money.outlet { color: #5B6FE8; }
.money.platform { color: #52c41a; }
.money.refund { color: #f5222d; }

.dialog-tip { color: #909399; font-size: 13px; margin-top: 8px; }
</style>
