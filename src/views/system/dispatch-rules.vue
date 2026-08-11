<template>
  <div class="dispatch-rules">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>派单规则配置</h2>
      <div class="header-tip">
        <el-tag type="info" size="small">自动派单根据收货地址+网点服务区域自动匹配网点</el-tag>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="page-tabs">
      <!-- Tab1: 派单模式 -->
      <el-tab-pane label="派单模式" name="mode">
        <div class="page-card" style="max-width: 600px">
          <div class="section-title">全局派单开关</div>
          <el-form label-width="140px" style="margin-top: 16px">
            <el-form-item label="派单模式">
              <el-select v-model="config.mode" style="width: 260px" @change="saveConfig">
                <el-option value="hybrid" label="智能派单（推荐）" />
                <el-option value="auto" label="全自动派单" />
                <el-option value="manual" label="完全人工派单" />
              </el-select>
              <div class="mode-desc">
                <template v-if="config.mode === 'hybrid'">
                  <p><b>智能派单（默认）</b>：在「强制手动地区」列表中的订单转人工派单；其余订单按 <strong>业务类型 + 地理就近 + 网点优先级</strong> 自动分配。管理员可在订单列表改派。</p>
                </template>
                <template v-else-if="config.mode === 'auto'">
                  <p class="warn"><b>全自动派单</b>：忽略「强制手动地区」设置，对所有订单直接按规则自动分配。<strong>注意：即使某地区已设为强制手动，也会自动派单。</strong></p>
                </template>
                <template v-else>
                  <p><b>完全人工派单</b>：不触发任何自动分配，所有订单由运营在订单列表手动派单。</p>
                </template>
              </div>
            </el-form-item>
            <el-form-item label="自动派单">
              <el-switch
                v-model="config.auto_assign"
                :disabled="config.mode === 'manual'"
                @change="saveConfig"
              />
              <span class="form-tip">关闭后即使在自动模式也不会自动派单，需管理员手动操作</span>
            </el-form-item>
            <el-form-item label="业务类型过滤">
              <el-switch v-model="config.business_type_filter" @change="saveConfig" />
              <span class="form-tip">开启后只分配给支持该业务类型的网点（刻章/登报/代理记账）</span>
            </el-form-item>
          </el-form>
        </div>
      </el-tab-pane>

      <!-- Tab2: 网点优先级 -->
      <el-tab-pane label="网点优先级" name="priority">
        <div class="page-card">
          <div class="section-title">
            网点优先级设置
            <span class="tip">优先级数值越高，被优先分配的概率越大（相同区域时）</span>
          </div>
          <div style="margin-bottom: 12px; display: flex; gap: 8px; align-items: center">
            <span style="font-size: 13px; color: #666">批量设置：</span>
            <el-input-number v-model="batchPriority" :min="0" :max="100" size="small" style="width: 120px" />
            <el-button size="small" @click="batchSetPriority">应用选中网点</el-button>
            <span style="font-size: 12px; color: #999; margin-left: 8px">勾选要修改的网点，再点"应用"</span>
          </div>
          <el-table
            :data="priorities"
            row-key="id"
            border
            style="width: 100%"
            @selection-change="handleSelectionChange"
            v-loading="loading"
          >
            <el-table-column type="selection" width="50" />
            <el-table-column prop="outlet.name" label="网点名称" min-width="160" />
            <el-table-column prop="outlet.province" label="省份" width="120" />
            <el-table-column prop="outlet.city" label="城市" width="100" />
            <el-table-column label="优先级" width="200">
              <template #default="{ row }">
                <el-input-number
                  v-model="row.priority"
                  :min="0"
                  :max="100"
                  size="small"
                  style="width: 140px"
                  @change="setPriority(row)"
                />
              </template>
            </el-table-column>
            <el-table-column prop="remark" label="备注" min-width="120">
              <template #default="{ row }">
                <el-input v-model="row.remark" size="small" placeholder="备注" @blur="setPriority(row)" />
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <!-- Tab3: 强制手动地区 -->
      <el-tab-pane label="强制手动地区" name="forced">
        <div class="page-card">
          <div class="section-title">
            强制手动派单地区
            <span class="tip">这些地区的订单不会自动分配，需管理员手动选择网点</span>
          </div>
          <div style="margin-bottom: 12px">
            <el-button type="primary" size="small" @click="showAddForced = true">添加地区</el-button>
          </div>
          <el-table :data="forcedRegions" border v-loading="loading">
            <el-table-column prop="province" label="省/直辖市" width="180" />
            <el-table-column prop="city" label="城市（可选）" width="180">
              <template #default="{ row }">
                {{ row.city || '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="remark" label="备注" min-width="200" />
            <el-table-column prop="created_at" label="添加时间" width="170">
              <template #default="{ row }">
                {{ formatDate(row.created_at) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="{ row }">
                <el-button type="danger" size="small" text @click="deleteForced(row.id)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="forcedRegions.length === 0 && !loading" description="暂无强制手动地区" />
        </div>
      </el-tab-pane>

      <!-- Tab4: 派单记录 -->
      <el-tab-pane label="派单记录" name="records">
        <!-- 统计卡片 -->
        <el-row :gutter="16" style="margin-bottom: 16px">
          <el-col :span="6">
            <div class="stat-card stat-blue">
              <div class="stat-icon">📋</div>
              <div class="stat-info">
                <div class="stat-num">{{ drStats.total }}</div>
                <div class="stat-label">总派单数</div>
              </div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="stat-card stat-green">
              <div class="stat-icon">🤖</div>
              <div class="stat-info">
                <div class="stat-num">{{ drStats.autoCount }}</div>
                <div class="stat-label">自动派单</div>
              </div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="stat-card stat-orange">
              <div class="stat-icon">👤</div>
              <div class="stat-info">
                <div class="stat-num">{{ drStats.manualCount }}</div>
                <div class="stat-label">手动派单</div>
              </div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="stat-card stat-purple">
              <div class="stat-icon">⏱️</div>
              <div class="stat-info">
                <div class="stat-num">{{ drStats.avgAcceptTime }}<span class="unit">分</span></div>
                <div class="stat-label">平均接单时长</div>
              </div>
            </div>
          </el-col>
        </el-row>

        <!-- 筛选区 -->
        <el-card style="margin-bottom: 16px">
          <el-form :inline="true" :model="drFilters" size="default">
            <el-form-item label="时间范围">
              <el-date-picker
                v-model="drDateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                value-format="YYYY-MM-DD"
                @change="handleDrDateChange"
              />
            </el-form-item>
            <el-form-item label="分配方式">
              <el-select v-model="drFilters.assignedBy" placeholder="全部" clearable style="width: 120px">
                <el-option label="自动派单" value="system" />
                <el-option label="手动派单" value="manual" />
              </el-select>
            </el-form-item>
            <el-form-item label="分配网点">
              <el-select v-model="drFilters.outletId" placeholder="全部网点" clearable filterable style="width: 200px">
                <el-option v-for="o in drOutletList" :key="o.id" :label="o.name" :value="o.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="订单状态">
              <el-select v-model="drFilters.status" placeholder="全部" clearable style="width: 120px">
                <el-option label="待接单" :value="1" />
                <el-option label="已接单" :value="2" />
                <el-option label="已完成" :value="3" />
              </el-select>
            </el-form-item>
            <el-form-item label="订单号">
              <el-input v-model="drFilters.orderNo" placeholder="请输入订单号" clearable style="width: 200px" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :icon="SearchIcon" @click="fetchDrData">查询</el-button>
              <el-button :icon="RefreshIcon" @click="resetDrFilters">重置</el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <!-- 数据表格 -->
        <el-card v-loading="drLoading">
          <el-table :data="drTableData" stripe border style="width: 100%">
            <el-table-column prop="orderNo" label="订单号" width="180">
              <template #default="{ row }">
                <el-link type="primary" @click="drViewOrder(row)">{{ row.orderNo }}</el-link>
              </template>
            </el-table-column>
            <el-table-column prop="companyName" label="公司名称" min-width="150" show-overflow-tooltip />
            <el-table-column prop="outletName" label="分配网点" width="150">
              <template #default="{ row }">
                <el-tag>{{ row.outletName }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="assignedBy" label="分配方式" width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="row.assignedBy === 'system' ? 'success' : 'warning'" size="small">
                  {{ row.assignedBy === 'system' ? '自动' : '手动' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="matchScore" label="匹配分" width="80" align="center">
              <template #default="{ row }">
                <span v-if="row.matchScore">{{ row.matchScore }}分</span>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column prop="statusText" label="分配状态" width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="row.status === 1 ? 'warning' : row.status === 2 ? 'primary' : 'success'" size="small">
                  {{ row.statusText }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="分配时间" width="170" />
            <el-table-column prop="acceptedAt" label="接单时间" width="170">
              <template #default="{ row }">
                <span v-if="row.acceptedAt">{{ row.acceptedAt }}</span>
                <span v-else style="color: #999">未接单</span>
              </template>
            </el-table-column>
            <el-table-column prop="remark" label="备注" min-width="160" show-overflow-tooltip />
          </el-table>
          <el-pagination
            v-model:current-page="drPagination.page"
            v-model:page-size="drPagination.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="drPagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            style="margin-top: 16px; justify-content: flex-end"
            @size-change="fetchDrData"
            @current-change="fetchDrData"
          />
        </el-card>

        <!-- 详情弹窗 -->
        <el-dialog v-model="drDetailVisible" title="派单详情" width="700px">
          <el-descriptions :column="2" border v-if="drCurrentRecord">
            <el-descriptions-item label="订单号">{{ drCurrentRecord.orderNo }}</el-descriptions-item>
            <el-descriptions-item label="公司名称">{{ drCurrentRecord.companyName }}</el-descriptions-item>
            <el-descriptions-item label="分配网点">{{ drCurrentRecord.outletName }}</el-descriptions-item>
            <el-descriptions-item label="分配方式">
              <el-tag :type="drCurrentRecord.assignedBy === 'system' ? 'success' : 'warning'">
                {{ drCurrentRecord.assignedBy === 'system' ? '自动派单' : '手动派单' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="匹配分">{{ drCurrentRecord.matchScore || '-' }}分</el-descriptions-item>
            <el-descriptions-item label="分配状态">
              <el-tag :type="drCurrentRecord.status === 1 ? 'warning' : drCurrentRecord.status === 2 ? 'primary' : 'success'">
                {{ drCurrentRecord.statusText }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="分配时间">{{ drCurrentRecord.createdAt }}</el-descriptions-item>
            <el-descriptions-item label="接单时长">{{ drCurrentRecord.acceptDuration ? drCurrentRecord.acceptDuration + '分钟' : '-' }}</el-descriptions-item>
            <el-descriptions-item label="备注" :span="2">{{ drCurrentRecord.remark || '-' }}</el-descriptions-item>
          </el-descriptions>
        </el-dialog>
      </el-tab-pane>
    </el-tabs>

    <!-- 添加强制手动地区弹窗 -->
    <el-dialog v-model="showAddForced" title="添加强制手动地区" width="480px">
      <el-form :model="forcedForm" label-width="120px">
        <el-form-item label="省份" required>
          <el-select v-model="forcedForm.province" placeholder="请选择省份" filterable clearable style="width: 100%">
            <el-option v-for="p in PROVINCES" :key="p" :label="p" :value="p" />
          </el-select>
        </el-form-item>
        <el-form-item label="城市（可选）">
          <el-select v-model="forcedForm.city" placeholder="不填则整个省都强制手动" filterable clearable style="width: 100%">
            <el-option v-for="c in CITIES" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="forcedForm.remark" placeholder="如：该地区网点不稳定" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddForced = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="addForcedRegion">确认添加</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search as SearchIcon, Refresh as RefreshIcon } from '@element-plus/icons-vue'
import request from '@/api'
import {
  getDispatchConfig, updateDispatchConfig,
  getDispatchPriorities, setDispatchPriority, batchSetDispatchPriorities,
  getForcedRegions, addForcedRegion as addForcedRegionAPI, removeForcedRegion
} from '@/api'

const activeTab = ref('mode')
const loading = ref(false)

// ====== 派单记录 Tab 状态 ======
const drLoading = ref(false)
const drTableData = ref<any[]>([])
const drOutletList = ref<any[]>([])
const drStats = reactive({ total: 0, autoCount: 0, manualCount: 0, avgAcceptTime: 0 })
const drFilters = reactive({ orderNo: '', assignedBy: '', outletId: '', status: null as number | null, startDate: '', endDate: '' })
const drDateRange = ref<string[]>([])
const drPagination = reactive({ page: 1, pageSize: 20, total: 0 })
const drDetailVisible = ref(false)
const drCurrentRecord = ref<any>(null)
const submitting = ref(false)
const batchPriority = ref(0)
const selectedRows = ref<any[]>([])
const showAddForced = ref(false)

const config = reactive({ mode: 'auto', auto_assign: true, business_type_filter: true })
const priorities = ref<any[]>([])
const forcedRegions = ref<any[]>([])

const forcedForm = reactive({ province: '', city: '', remark: '' })

const PROVINCES = [
  '北京市','天津市','上海市','重庆市',
  '河北省','山西省','辽宁省','吉林省','黑龙江省',
  '江苏省','浙江省','安徽省','福建省','江西省','山东省',
  '河南省','湖北省','湖南省','广东省','海南省',
  '四川省','贵州省','云南省','陕西省','甘肃省','青海省','台湾省',
  '内蒙古自治区','广西壮族自治区','西藏自治区','宁夏回族自治区','新疆维吾尔自治区',
  '香港特别行政区','澳门特别行政区',
]

const CITIES = [
  '北京市','天津市','上海市','重庆市',
  '广州市','深圳市','成都市','杭州市','武汉市','西安市','苏州市','南京市','长沙市',
  '郑州市','济南市','青岛市','大连市','沈阳市','哈尔滨市','长春市',
  '石家庄市','唐山市','太原市','合肥市','福州市','厦门市','南昌市','济南市',
  '开封市','洛阳市','武汉市','黄石市','长沙市','广州市','珠海市','东莞市',
  '海口市','三亚市','成都市','绵阳市','贵阳市','昆明市','西安市','兰州市',
  '西宁市','台北市','呼和浩特市','南宁市','拉萨市','银川市','乌鲁木齐市',
]

function formatDate(d: string) {
  if (!d) return '-'
  return new Date(d).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

async function loadConfig() {
  try {
    const res = await getDispatchConfig()
    Object.assign(config, res)
  } catch { /* ignore */ }
}

async function saveConfig() {
  try {
    await updateDispatchConfig({ mode: config.mode, auto_assign: config.auto_assign, business_type_filter: config.business_type_filter })
    ElMessage.success('配置已保存')
  } catch {
    ElMessage.error('保存失败')
  }
}

async function loadPriorities() {
  loading.value = true
  try {
    priorities.value = (await getDispatchPriorities()) as any
  } catch { /* ignore */ } finally {
    loading.value = false
  }
}

async function setPriority(row: any) {
  try {
    await setDispatchPriority(row.outlet_id, { priority: row.priority, remark: row.remark })
    ElMessage.success(`「${row.outlet.name}」优先级已更新`)
  } catch {
    ElMessage.error('保存失败')
    loadPriorities()
  }
}

function handleSelectionChange(rows: any[]) {
  selectedRows.value = rows
}

async function batchSetPriority() {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先勾选要修改的网点')
    return
  }
  submitting.value = true
  try {
    const items = selectedRows.value.map(r => ({ outlet_id: r.outlet_id, priority: batchPriority.value }))
    await batchSetDispatchPriorities(items)
    ElMessage.success(`已为 ${selectedRows.value.length} 个网点设置为优先级 ${batchPriority.value}`)
    loadPriorities()
  } catch {
    ElMessage.error('批量设置失败')
  } finally {
    submitting.value = false
  }
}

async function loadForcedRegions() {
  loading.value = true
  try {
    forcedRegions.value = (await getForcedRegions()) as any
  } catch { /* ignore */ } finally {
    loading.value = false
  }
}

async function addForcedRegion() {
  if (!forcedForm.province) {
    ElMessage.warning('请选择省份')
    return
  }
  submitting.value = true
  try {
    await addForcedRegionAPI({ province: forcedForm.province, city: forcedForm.city || undefined, remark: forcedForm.remark })
    ElMessage.success('添加成功')
    showAddForced.value = false
    Object.assign(forcedForm, { province: '', city: '', remark: '' })
    loadForcedRegions()
  } catch {
    ElMessage.error('添加失败')
  } finally {
    submitting.value = false
  }
}

async function deleteForced(id: string) {
  try {
    await ElMessageBox.confirm('确定删除该强制手动地区吗？', '确认', { type: 'warning' })
    await removeForcedRegion(id)
    ElMessage.success('已删除')
    loadForcedRegions()
  } catch { /* cancel or error */ }
}

// ====== 派单记录 Tab 函数 ======
async function fetchDrOutlets() {
  try {
    const res: any = await request.get('/outlets', { params: { pageSize: 100 } })
    drOutletList.value = res?.data?.list || res?.list || []
  } catch { /* ignore */ }
}

async function fetchDrStats() {
  try {
    const res: any = await request.get('/dashboard/dispatch-stats', { params: drFilters })
    Object.assign(drStats, res?.data || res)
  } catch { /* ignore */ }
}

async function fetchDrData() {
  drLoading.value = true
  try {
    const params: any = {
      ...drFilters,
      page: drPagination.page,
      pageSize: drPagination.pageSize,
    }
    const res: any = await request.get('/dashboard/dispatch-records', { params })
    const data = res?.data || res
    drTableData.value = data.list || []
    drPagination.total = data.pagination?.total || 0
    fetchDrStats()
  } catch {
    ElMessage.error('加载数据失败')
  } finally {
    drLoading.value = false
  }
}

function handleDrDateChange(val: string[]) {
  if (val && val.length === 2) {
    drFilters.startDate = val[0]
    drFilters.endDate = val[1]
  } else {
    drFilters.startDate = ''
    drFilters.endDate = ''
  }
}

function resetDrFilters() {
  Object.assign(drFilters, { orderNo: '', assignedBy: '', outletId: '', status: null, startDate: '', endDate: '' })
  drDateRange.value = []
  drPagination.page = 1
  fetchDrData()
}

function drViewOrder(row: any) {
  window.open(`/orders/seal?id=${row.orderId}`, '_blank')
}

// 加载派单记录 Tab 时才拉数据（懒加载）
watch(activeTab, (tab) => {
  if (tab === 'records') {
    if (drOutletList.value.length === 0) fetchDrOutlets()
    fetchDrData()
  }
})

onMounted(() => {
  loadConfig()
  loadPriorities()
  loadForcedRegions()
})
</script>

<style scoped>
.dispatch-rules { }

/* 派单记录 Tab 统计卡片 */
.stat-card {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 1px 6px rgba(0,0,0,.06);

  .stat-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    margin-right: 14px;
    flex-shrink: 0;
  }

  .stat-info {
    flex: 1;
    .stat-num {
      font-size: 26px;
      font-weight: 800;
      line-height: 1.1;
      margin-bottom: 6px;
      .unit { font-size: 13px; font-weight: normal; margin-left: 2px; }
    }
    .stat-label { font-size: 13px; color: #666; }
  }

  &.stat-blue  { background: linear-gradient(135deg, #eef2ff, #dde4ff); .stat-icon { background: #5b6fe8; } }
  &.stat-green { background: linear-gradient(135deg, #f6ffed, #d9f7be); .stat-icon { background: #52c41a; } }
  &.stat-orange{ background: linear-gradient(135deg, #fff7e6, #ffe8c2); .stat-icon { background: #faad14; } }
  &.stat-purple{ background: linear-gradient(135deg, #f9f0ff, #efdbff); .stat-icon { background: #722ed1; } }
}
.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}
.page-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}
.page-tabs { }
.page-card {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
}
.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.tip {
  font-size: 12px;
  color: #999;
  font-weight: 400;
}
.form-tip {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
  display: block;
}
.mode-desc {
  margin-top: 8px;
  font-size: 12px;
  color: #666;
  line-height: 1.6;
  background: #f7f8fa;
  border-radius: 6px;
  padding: 10px 12px;
}
.mode-desc p { margin: 0; }
.mode-desc .warn {
  color: #e6a23c;
  background: #fdf6ec;
  border-radius: 4px;
  padding: 4px 8px;
}
.mode-desc strong { color: #409eff; }
</style>
