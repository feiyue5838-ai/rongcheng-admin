<template>
  <div class="receipt-list-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>交付回执管理</h2>
      <div class="header-actions">
        <el-tag type="info" size="large" effect="plain">
          共 <strong>{{ pagination.total }}</strong> 条回执
        </el-tag>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-grid" v-if="!statsError || stats.total > 0 || stats.sealCount > 0 || stats.certificateCount > 0 || stats.todayCount > 0">
      <div class="stat-card stat-primary">
        <div class="stat-icon"><el-icon><FolderOpened /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.total }}</div>
          <div class="stat-label">回执总数</div>
        </div>
      </div>
      <div class="stat-card stat-blue">
        <div class="stat-icon"><el-icon><Picture /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.sealCount }}</div>
          <div class="stat-label">印章照片</div>
        </div>
      </div>
      <div class="stat-card stat-green">
        <div class="stat-icon"><el-icon><DocumentChecked /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.certificateCount }}</div>
          <div class="stat-label">交付凭证</div>
        </div>
      </div>
      <div class="stat-card stat-orange">
        <div class="stat-icon"><el-icon><Calendar /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.todayCount }}</div>
          <div class="stat-label">今日新增</div>
        </div>
      </div>
    </div>
    <div v-if="statsError" class="stats-error">
      <span>统计加载失败</span>
      <el-button size="small" @click="loadStats">重试</el-button>
    </div>

    <!-- 筛选栏（全部条件一排） -->
    <div class="filter-section">
      <div class="filter-row">
        <el-input
          v-model="filters.keyword"
          placeholder="搜索订单号 / 公司名称"
          style="width:180px"
          clearable
          @keyup.enter="handleSearch"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>

        <el-select v-model="filters.type" placeholder="凭证类型" style="width:110px" clearable @change="handleSearch">
          <el-option label="全部类型" value="" />
          <el-option label="印章照片" value="seal" />
          <el-option label="交付凭证" value="certificate" />
          <el-option label="文档文件" value="document" />
          <el-option label="其他图片" value="image" />
        </el-select>

        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          style="width:220px"
          @change="handleDateChange"
        />

        <el-select v-model="filters.region" placeholder="所属大区" style="width:120px" clearable @change="onRegionChange">
          <el-option label="全部大区" value="" />
          <el-option v-for="r in regionOptions" :key="r" :label="r" :value="r" />
        </el-select>

        <el-select v-model="filters.province" placeholder="所属省份" style="width:130px" clearable @change="handleSearch">
          <el-option label="全部省份" value="" />
          <el-option v-for="p in provinceOptions" :key="p" :label="p" :value="p" />
        </el-select>

        <el-select v-model="filters.outletId" placeholder="所属网点" style="width:150px" clearable @change="handleSearch">
          <el-option label="全部网点" value="" />
          <el-option v-for="o in outlets" :key="o.id" :label="o.name" :value="o.id" />
        </el-select>

        <el-button type="primary" @click="handleSearch">
          <el-icon><Search /></el-icon> 搜索
        </el-button>
        <el-button @click="resetFilters">重置</el-button>

        <!-- 多选批量操作 -->
        <div class="batch-actions" v-if="selected.length > 0">
          <el-divider direction="vertical" />
          <span class="selected-count">{{ selected.length }} 条已选</span>
          <el-button size="small" @click="handleBatchDownload">批量下载</el-button>
          <el-button size="small" type="danger" plain @click="selected = []">清除</el-button>
        </div>
      </div>
    </div>

    <!-- 表格 -->
    <div class="table-container">
      <el-table
        v-loading="loading"
        :data="tableData"
        :row-key="getRowKey"
        @selection-change="selected = $event"
        stripe
        height="calc(100vh - 320px)"
        style="width:100%"
        :default-sort="{ prop: 'createdAt', order: 'descending' }"
      >
        <el-table-column type="selection" width="40" fixed />

        <!-- 缩略图 -->
        <el-table-column label="凭证图" width="80" fixed>
          <template #default="{ row }">
            <el-image
              v-if="isImage(row)"
              :src="row.url"
              :preview-src-list="[row.url]"
              fit="cover"
              loading="lazy"
              class="thumb"
              preview-teleported
            >
              <template #error>
                <div class="thumb-error"><el-icon><Picture /></el-icon></div>
              </template>
            </el-image>
            <div v-else class="thumb-file">
              <el-icon><Document /></el-icon>
            </div>
          </template>
        </el-table-column>

        <!-- 订单号 -->
        <el-table-column label="订单号" prop="seal_orders.order_no" width="200" sortable>
          <template #default="{ row }">
            <span class="order-no">{{ row.seal_orders?.order_no || '-' }}</span>
          </template>
        </el-table-column>

        <!-- 公司名 -->
        <el-table-column label="公司名称" prop="seal_orders.company_name" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.seal_orders?.company_name || '-' }}
          </template>
        </el-table-column>

        <!-- 类型 -->
        <el-table-column label="类型" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="typeTagType(row.type)" size="small" effect="light" round>
              {{ typeTagText(row.type) }}
            </el-tag>
          </template>
        </el-table-column>

        <!-- 大区/省份/网点 -->
        <el-table-column label="所属网点" min-width="180">
          <template #default="{ row }">
            <div v-if="row.outlet" class="outlet-cell">
              <span class="outlet-name">{{ row.outlet.name }}</span>
              <span class="outlet-region">{{ row.outlet.region }} / {{ row.outlet.province }}</span>
            </div>
            <span v-else>-</span>
          </template>
        </el-table-column>

        <!-- 快递信息 -->
        <el-table-column label="快递信息" min-width="160">
          <template #default="{ row }">
            <span v-if="row.seal_orders?.express_company" class="express-info">
              {{ row.seal_orders.express_company }}
              <span v-if="row.seal_orders?.express_no" class="express-no">{{ row.seal_orders.express_no }}</span>
            </span>
            <span v-else class="muted">-</span>
          </template>
        </el-table-column>

        <!-- 时间 -->
        <el-table-column label="上传时间" prop="created_at" width="170" sortable>
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>

        <!-- 操作 -->
        <el-table-column label="操作" width="140" fixed="right" align="center">
          <template #default="{ row }">
            <div class="action-btns">
              <el-button
                v-if="isImage(row)"
                size="small"
                link
                type="primary"
                @click="previewImage(row)"
              >
                <el-icon><ZoomIn /></el-icon> 查看
              </el-button>
              <el-button
                size="small"
                link
                tag="a"
                :href="row.url"
                target="_blank"
              >
                <el-icon><Download /></el-icon> 下载
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页 -->
    <div class="pagination-bar">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="pagination.total"
        :page-sizes="[50, 100, 200, 500]"
        layout="total, sizes, prev, pager, next, jumper"
        @change="loadData"
      />
    </div>

    <!-- 图片预览弹窗 -->
    <el-dialog v-model="previewVisible" title="回执预览" width="720px" class="preview-dialog">
      <img v-if="previewUrl" :src="previewUrl" style="width:100%;border-radius:8px;max-height:70vh;object-fit:contain" />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getDeliveryReceiptsAPI, getOutletsAPI, getDeliveryReceiptStatsAPI } from '@/api'
import { formatDate } from '@/utils/format'
import {
  Search, Document, Picture, ZoomIn, Download, ArrowDown, ArrowUp,
  FolderOpened, DocumentChecked, Calendar,
} from '@element-plus/icons-vue'

// ---------- 统计卡片 ----------
const statsError = ref(false)
const stats = reactive({ total: 0, sealCount: 0, certificateCount: 0, todayCount: 0 })

const loadStats = async () => {
  try {
    statsError.value = false
    const res: any = await getDeliveryReceiptStatsAPI()
    stats.total = res?.total ?? 0
    stats.sealCount = res?.sealCount ?? 0
    stats.certificateCount = res?.certificateCount ?? 0
    stats.todayCount = res?.todayCount ?? 0
  } catch (e: any) {
    statsError.value = true
  }
}

// ---------- 数据 ----------
const loading = ref(false)
const tableData = ref([])
const selected = ref([])
const previewVisible = ref(false)
const previewUrl = ref('')

// ---------- 分页 ----------
const page = ref(1)
const pageSize = ref(100)
const pagination = reactive({ total: 0, page: 1, pageSize: 100 })

// ---------- 筛选 ----------
const filters = reactive({
  keyword: '',
  type: '',
  region: '',
  province: '',
  outletId: '',
})
const dateRange = ref([])

// ---------- 下拉选项 ----------
const outlets = ref<any[]>([])
const regionOptions = ['华北', '东北', '华东', '华中', '华南', '西南', '西北', '港澳台']
const provinceOptions = computed(() => {
  if (!filters.region) return []
  const map = {
    '华北': ['北京市', '天津市', '河北省', '山西省', '内蒙古自治区'],
    '东北': ['辽宁省', '吉林省', '黑龙江省'],
    '华东': ['上海市', '江苏省', '浙江省', '安徽省', '福建省', '江西省', '山东省'],
    '华中': ['河南省', '湖北省', '湖南省'],
    '华南': ['广东省', '广西壮族自治区', '海南省', '香港', '澳门'],
    '西南': ['重庆市', '四川省', '贵州省', '云南省', '西藏自治区'],
    '西北': ['陕西省', '甘肃省', '青海省', '宁夏回族自治区', '新疆维吾尔自治区'],
  }
  return (map as any)[filters.region] || []
})

function onRegionChange() {
  filters.province = ''
  handleSearch()
}

// ---------- 加载网点列表 ----------
async function loadOutlets() {
  try {
    const res: any = await getOutletsAPI({ page: 1, pageSize: 200 })
    outlets.value = (res as any).data?.list ?? (res as any).list ?? []
  } catch { /* ignore */ }
}

// ---------- 加载回执数据 ----------
async function loadData() {
  loading.value = true
  try {
    const params: any = {
      page: page.value,
      pageSize: pageSize.value,
    }
    if (filters.keyword) params.keyword = filters.keyword
    if (filters.type) params.type = filters.type
    if (filters.region) params.region = filters.region
    if (filters.province) params.province = filters.province
    if (filters.outletId) params.outletId = filters.outletId
    if (dateRange.value?.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }

    const res: any = await getDeliveryReceiptsAPI(params)
    const list = (res as any).data?.list ?? (res as any).list ?? []
    const total = (res as any).pagination?.total ?? (res as any).total ?? 0

    tableData.value = list
    pagination.total = total
    pagination.page = (res as any).data?.pagination?.page ?? res.pagination?.page ?? page.value
    pagination.pageSize = (res as any).data?.pagination?.pageSize ?? res.pagination?.pageSize ?? pageSize.value
  } catch (err: any) {
    ElMessage.error('加载失败: ' + (err.message || ''))
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  page.value = 1
  loadData()
}

function handleDateChange() {
  handleSearch()
}

function resetFilters() {
  filters.keyword = ''
  filters.type = ''
  filters.region = ''
  filters.province = ''
  filters.outletId = ''
  dateRange.value = []
  handleSearch()
}

function handleBatchDownload() {
  selected.value.forEach((r: any) => {
    if (r.url) {
      const a = document.createElement('a')
      a.href = r.url
      a.target = '_blank'
      a.download = ''
      a.click()
    }
  })
  ElMessage.success(`已触发 ${selected.value.length} 个文件下载`)
}

function getRowKey(row: any) { return (row as any)?.id }

// ---------- 工具函数 ----------
function isImage(row: any) {
  // 优先按后端 type 字段判断（image/photo/seal/certificate 都视为图片）
  if ((row as any) && (row as any).type && ['image', 'photo', 'seal', 'certificate'].includes((row as any).type)) return true
  // 兜底：URL 后缀判断
  if (!(row as any)?.url) return false
  return /\.(jpg|jpeg|png|gif|webp|bmp|svg|avif)(\?|$)/i.test((row as any).url)
}

function typeTagType(type: any) {
  const t = (type || '').toLowerCase()
  const map: Record<string, string> = { seal: 'primary', certificate: 'success', document: 'warning', image: 'info', photo: 'info' }
  return map[t] || 'info'
}
function typeTagText(type: any) {
  const t = (type || '').toLowerCase()
  const map: Record<string, string> = { seal: '印章', certificate: '凭证', document: '文档', image: '图片', photo: '图片' }
  return map[t] || type || '图片'
}

function previewImage(row: any) {
  if (isImage(row)) {
    previewUrl.value = row.url
    previewVisible.value = true
  }
}

// ---------- 初始化 ----------
onMounted(async () => {
  loadStats()
  await loadOutlets()
  loadData()
})
</script>

<style scoped>
/* 统计卡片 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 14px;
}
.stat-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px 20px 18px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
  transition: transform .2s, box-shadow .2s;
  cursor: default;
}
.stat-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(0,0,0,.1);
}
.stat-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}
.stat-info { flex: 1; }
.stat-value {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.1;
  margin-bottom: 4px;
}
.stat-label { font-size: 13px; color: #666; }

.stat-primary {
  background: linear-gradient(135deg, #eef2ff 0%, #dde4ff 100%);
  border: 1px solid rgba(91,111,232,.15);
}
.stat-primary .stat-icon { background: linear-gradient(135deg, #5B6FE8, #7B8FF8); color: #fff; }
.stat-primary .stat-value { color: #3d4fc4; }

.stat-blue {
  background: linear-gradient(135deg, #e6f7ff 0%, #bae0ff 100%);
  border: 1px solid rgba(24,144,255,.15);
}
.stat-blue .stat-icon { background: linear-gradient(135deg, #1890ff, #69c0ff); color: #fff; }
.stat-blue .stat-value { color: #0958d9; }

.stat-green {
  background: linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%);
  border: 1px solid rgba(82,196,26,.15);
}
.stat-green .stat-icon { background: linear-gradient(135deg, #52c41a, #73d13d); color: #fff; }
.stat-green .stat-value { color: #389e0d; }

.stat-orange {
  background: linear-gradient(135deg, #fff7e6 0%, #ffe8c2 100%);
  border: 1px solid rgba(250,140,22,.15);
}
.stat-orange .stat-icon { background: linear-gradient(135deg, #fa8c16, #ffa940); color: #fff; }
.stat-orange .stat-value { color: #c87619; }

.stats-error {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #f5222d;
  font-size: 13px;
  margin-bottom: 10px;
}

.receipt-list-page { padding: 0 4px; }

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.page-header h2 { margin: 0; font-size: 22px; font-weight: 600; color: #1f2937; }
.header-actions { display: flex; gap: 12px; align-items: center; }

/* 筛选区 */
.filter-section {
  background: #fff;
  border-radius: 10px;
  padding: 14px 16px;
  margin-bottom: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.filter-row {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.batch-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 8px;
}
.selected-count {
  font-size: 13px;
  color: #5b6fe8;
  font-weight: 500;
}

/* 表格容器 */
.table-container {
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}

/* 缩略图 */
.thumb {
  width: 56px;
  height: 56px;
  border-radius: 6px;
  object-fit: cover;
  display: block;
}
.thumb-error {
  width: 56px;
  height: 56px;
  border-radius: 6px;
  background: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c0c4cc;
}
.thumb-file {
  width: 56px;
  height: 56px;
  border-radius: 6px;
  background: #f0f9ff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #5b6fe8;
}

/* 列内样式 */
.order-no {
  font-family: 'SF Mono', Menlo, Consolas, monospace;
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
}
.outlet-cell { display: flex; flex-direction: column; gap: 2px; }
.outlet-name { font-size: 13px; color: #1f2937; font-weight: 500; }
.outlet-region { font-size: 11px; color: #9ca3af; }
.express-info { display: flex; flex-direction: column; gap: 2px; font-size: 13px; }
.express-no {
  font-family: 'SF Mono', Menlo, Consolas, monospace;
  font-size: 12px;
  color: #5b6fe8;
}
.muted { color: #c0c4cc; }
.action-btns { display: flex; gap: 4px; justify-content: center; }

/* 分页 */
.pagination-bar {
  display: flex;
  justify-content: flex-end;
  padding: 14px 0 4px;
}
</style>