<template>
  <div>
    <div class="page-header">
      <h2>印章管理</h2>
      <el-dropdown trigger="click" @command="handleAddCommand">
        <el-button type="primary">
          添加<i class="el-icon--right el-icon-arrow-down" />
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="seal">添加印章</el-dropdown-item>
            <el-dropdown-item command="package">添加套餐</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>

    <div class="page-card">
      <!-- ====== 路由类型：enterprise（8 业务场景） ====== -->
      <el-tabs
        v-if="routeType === 'enterprise'"
        v-model="activeSceneId"
        class="scene-tabs"
      >
        <el-tab-pane
          v-for="cat in businessCategories"
          :key="cat.id"
          :name="cat.id"
        >
          <template #label>
            <span class="tab-label">
              {{ cat.name }}
              <el-badge
                v-if="sceneItemCount(cat.id) > 0"
                :value="sceneItemCount(cat.id)"
                :max="99"
                class="tab-badge"
                type="primary"
              />
            </span>
          </template>
        </el-tab-pane>
      </el-tabs>

      <!-- ====== 路由类型：single（个人 / 电子）—— 单一分类 Tab ====== -->
      <!-- 个人印章：拆为【个人印章 / 个人职业印章】两个子 Tab -->
      <el-tabs
        v-if="isPersonal"
        v-model="activePersonalSubTab"
        class="scene-tabs"
      >
        <el-tab-pane name="personal">
          <template #label>
            <span class="tab-label">
              个人印章
              <el-badge
                v-if="personalSealCount > 0"
                :value="personalSealCount"
                :max="99"
                class="tab-badge"
                type="primary"
              />
            </span>
          </template>
        </el-tab-pane>
        <el-tab-pane name="professional">
          <template #label>
            <span class="tab-label">
              个人职业印章
              <el-badge
                v-if="professionalSealCount > 0"
                :value="professionalSealCount"
                :max="99"
                class="tab-badge"
                type="primary"
              />
            </span>
          </template>
        </el-tab-pane>
      </el-tabs>

      <!-- 电子印章：6 个子 Tab（按印章类型） -->
      <el-tabs
        v-else-if="isElectronic"
        v-model="activeSingleSubTab"
        class="scene-tabs electronic-tabs"
      >
        <el-tab-pane
          v-for="sub in ELECTRONIC_SUB_TYPES"
          :key="sub.label"
          :name="sub.label"
        >
          <template #label>
            <span class="tab-label">
              {{ sub.label }}
              <el-badge
                v-if="singleSubCount(sub.label) > 0"
                :value="singleSubCount(sub.label)"
                :max="99"
                class="tab-badge"
                type="primary"
              />
            </span>
          </template>
        </el-tab-pane>
      </el-tabs>

      <!-- 电子印章以外的单 Tab（兜底） -->
      <el-tabs
        v-else-if="routeType === 'single'"
        v-model="activeSingleTab"
        class="scene-tabs"
      >
        <el-tab-pane :name="defaultCategory">
          <template #label>
            <span class="tab-label">
              {{ defaultCategoryName }}
              <el-badge
                v-if="seals.length + packages.length > 0"
                :value="seals.length + packages.length"
                :max="99"
                class="tab-badge"
                type="primary"
              />
            </span>
          </template>
        </el-tab-pane>
      </el-tabs>

      <!-- ====== 卡片网格 ====== -->
      <div v-loading="loading" class="scene-grid-wrap">
        <!-- 空状态 -->
        <div v-if="!filteredSeals.length && !filteredPackages.length && !loading" class="empty-tip">
          该场景暂无印章和套餐
        </div>

        <!-- 印章分区 -->
        <template v-if="filteredSeals.length">
          <div class="section-header">
            <span class="section-title">单枚印章</span>
            <span class="section-count">{{ filteredSeals.length }} 枚</span>
          </div>
          <div class="scene-grid">
            <div
              v-for="row in filteredSeals"
              :key="row.id"
              class="seal-card"
            >
              <div class="card-image">
                <el-image
                  v-if="row.image"
                  :src="row.image"
                  fit="cover"
                  style="width: 100%; height: 100%"
                />
                <div v-else class="image-placeholder">
                  <el-icon :size="32" color="#c0c4cc"><Postcard /></el-icon>
                </div>
              </div>
              <div class="card-body">
                <div class="card-category" :title="row.sealCategories?.name || row.categoryName || ''">
                  <el-tag v-if="row.sealCategories?.name" size="small" type="info" effect="plain">{{ row.sealCategories.name }}</el-tag>
                  <el-tag v-else-if="row.categoryName" size="small" type="info" effect="plain">{{ row.categoryName }}</el-tag>
                  <el-tag v-else-if="isElectronic && getSealSubType(row.name)" size="small" type="info" effect="plain">{{ getSealSubType(row.name) }}</el-tag>
                </div>
                <div class="card-name" :title="row.name">{{ row.name }}</div>
                <div class="card-price">¥{{ row.price }}</div>
              </div>
              <div class="card-actions">
                <el-button type="primary" link size="small" @click="showDialog('edit', row)">编辑</el-button>
                <el-button type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
              </div>
            </div>
          </div>
        </template>

        <!-- 套餐分区 -->
        <template v-if="filteredPackages.length">
          <div class="section-header" :class="{ 'section-header--mt': filteredSeals.length }">
            <span class="section-title">套餐</span>
            <span class="section-count">{{ filteredPackages.length }} 个</span>
          </div>
          <div class="scene-grid">
            <div
              v-for="row in filteredPackages"
              :key="row.id"
              class="seal-card is-pkg"
            >
              <div class="card-image">
                <el-carousel
                  v-if="row.images?.length"
                  height="160px"
                  indicator-position="outside"
                  arrow="always"
                  :autoplay="false"
                >
                  <el-carousel-item v-for="(img, idx) in row.images" :key="idx">
                    <el-image :src="img" fit="cover" style="width: 100%; height: 100%" />
                  </el-carousel-item>
                </el-carousel>
                <div v-else class="image-placeholder">
                  <el-icon :size="32" color="#c0c4cc"><Box /></el-icon>
                </div>
                <el-tag type="warning" size="small" class="card-tag">套餐</el-tag>
              </div>
              <div class="card-body">
                <div class="card-name" :title="row.name">{{ row.name }}</div>
                <div class="card-price pkg-price">¥{{ row.price }}</div>
              </div>
              <div class="card-actions">
                <el-button type="primary" link size="small" @click="showPkgDialog(row)">编辑</el-button>
                <el-button type="danger" link size="small" @click="handlePkgDelete(row)">删除</el-button>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- 添加/编辑印章对话框 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑印章' : '添加印章'" width="600px">
      <el-form :model="form" label-width="120px">
        <el-form-item label="印章名称" required>
          <el-input v-model="form.name" placeholder="如：公章" />
        </el-form-item>
        <el-form-item label="类型" required v-if="isPersonal">
          <el-select v-model="form.sealCategoryId" placeholder="选择印章类型">
            <el-option v-for="c in personalCategories" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="分类" v-if="routeType === 'enterprise'" required>
          <el-select v-model="form.sceneId" placeholder="选择分类（必填）" :disabled="isElectronic">
            <el-option v-for="c in sceneOptions" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="价格(元)" required>
          <el-input-number
            v-model="form.price"
            :min="0"
            :precision="2"
            :style="pricingMode === 'nationwide' ? { boxShadow: '0 0 0 2px rgba(64,158,255,0.35)', borderRadius: '4px' } : {}"
          />
          <el-tag
            v-if="pricingMode === 'nationwide'"
            type="primary"
            effect="light"
            size="small"
            style="margin-left:8px"
          >全国统一定价：此价格对所有城市生效</el-tag>
          <span v-else style="color:#999;font-size:12px;margin-left:8px">基准价（默认）</span>
        </el-form-item>
        <el-form-item label="定价方式">
          <el-switch
            v-model="pricingMode"
            :active-value="'regional'"
            :inactive-value="'nationwide'"
          />
          <span style="margin-left:8px;color:#606266">{{ pricingMode === 'regional' ? '区域价（按城市设置不同价格）' : '全国价（统一基准价）' }}</span>
        </el-form-item>
        <el-form-item label="城市差异化定价" v-if="pricingMode === 'regional'">
          <div class="region-price-tip">设置各城市价格（空则使用上方基准价）</div>
          <div v-for="(row, idx) in regionPricesRows" :key="idx" class="region-price-row">
            <el-cascader
              v-model="row._cityValue"
              :options="cityOptions"
              :props="{ expandTrigger: 'hover', emitPath: true, checkStrictly: true }"
              placeholder="选择省/市/区"
              clearable
              filterable
              style="width:200px"
              @change="(val: string[]) => { row.city = (val && val.length >= 2) ? val[1] : ''; row._cityValue = val }"
            />
            <el-input-number v-model="row.price" :min="0" :precision="2" style="width:140px" />
            <el-button type="danger" link @click="removeRegionPrice(idx)">删除</el-button>
          </div>
          <div class="region-price-actions">
            <el-button type="default" plain size="small" @click="addRegionPrice">+ 添加城市价格</el-button>
            <el-button v-if="regionPricesRows.length > 0" type="danger" plain size="small" @click="clearAllRegionPrices">清空全部</el-button>
          </div>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" rows="3" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" style="width:100%" />
        </el-form-item>
        <el-form-item label="图片" label-width="60px">
          <el-upload
            ref="sealUploadRef"
            :show-file-list="false"
            :before-upload="beforeUpload"
            :http-request="uploadSeal"
            class="seal-image-uploader"
          >
            <div v-if="form.image" class="image-preview-wrapper">
              <img :src="form.image" style="width: 80px; height: 80px; border-radius: 8px; object-fit: cover; display: block;" />
              <div class="image-overlay" @click.stop="triggerSealUpload">更换</div>
            </div>
            <el-button v-else type="primary" plain size="small">上传图片</el-button>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveSeal" :loading="saving">保存</el-button>
      </template>
    </el-dialog>

    <!-- 编辑套餐对话框 -->
    <el-dialog v-model="pkgDialogVisible" :title="pkgIsEdit ? '编辑套餐' : '添加套餐'" width="720px">
      <el-form :model="pkgForm" label-width="120px">
        <el-form-item label="所属场景" v-if="routeType === 'enterprise'" required>
          <el-select v-model="pkgForm.sceneId" placeholder="选择套餐所属场景（必填）" style="width:100%" clearable @change="loadPkgSealOptions">
            <el-option
              v-for="cat in businessCategories"
              :key="cat.id"
              :label="cat.name"
              :value="cat.id"
            />
          </el-select>
          <span style="font-size:12px;color:#909399;margin-top:4px;display:block">
            不选择则套餐不会在任何场景 Tab 下显示
          </span>
        </el-form-item>
        <el-form-item label="包含印章" required>
          <el-select v-model="pkgForm.sealIds" multiple filterable placeholder="选择套餐包含的印章（必选）" style="width:100%">
            <el-option
              v-for="s in pkgSealOptions"
              :key="s.id"
              :label="s.name + '（¥' + s.price + '）'"
              :value="s.id"
            />
          </el-select>
          <span style="font-size:12px;color:#909399;margin-top:4px;display:block">
            小程序端套餐内展示的印章列表，不选将导致套餐无法下单
          </span>
        </el-form-item>
        <el-form-item label="套餐名称" required>
          <el-input v-model="pkgForm.name" placeholder="如：全套公章套餐" />
        </el-form-item>
        <el-form-item label="价格(元)" required>
          <el-input-number
            v-model="pkgForm.price"
            :min="0"
            :precision="2"
            :style="pkgPricingMode === 'nationwide' ? { boxShadow: '0 0 0 2px rgba(64,158,255,0.35)', borderRadius: '4px' } : {}"
          />
          <el-tag
            v-if="pkgPricingMode === 'nationwide'"
            type="primary"
            effect="light"
            size="small"
            style="margin-left:8px"
          >全国统一定价：此价格对所有城市生效</el-tag>
          <span v-else style="color:#999;font-size:12px;margin-left:8px">基准价（默认）</span>
        </el-form-item>
        <el-form-item label="定价方式">
          <el-switch
            v-model="pkgPricingMode"
            :active-value="'regional'"
            :inactive-value="'nationwide'"
          />
          <span style="margin-left:8px;color:#606266">{{ pkgPricingMode === 'regional' ? '区域价（按城市设置不同价格）' : '全国价（统一基准价）' }}</span>
        </el-form-item>
        <el-form-item label="城市差异化定价" v-if="pkgPricingMode === 'regional'">
          <div class="region-price-tip">设置各城市价格（空则使用上方基准价）</div>
          <div v-for="(row, idx) in pkgRegionPricesRows" :key="idx" class="region-price-row">
            <el-cascader
              v-model="row._cityValue"
              :options="cityOptions"
              :props="{ expandTrigger: 'hover', emitPath: true, checkStrictly: true }"
              placeholder="选择省/市/区"
              clearable
              filterable
              style="width:200px"
              @change="(val: string[]) => { row.city = (val && val.length >= 2) ? val[1] : ''; row._cityValue = val }"
            />
            <el-input-number v-model="row.price" :min="0" :precision="2" style="width:140px" />
            <el-button type="danger" link @click="removePkgRegionPrice(idx)">删除</el-button>
          </div>
          <div class="region-price-actions">
            <el-button type="default" plain size="small" @click="addPkgRegionPrice">+ 添加城市价格</el-button>
            <el-button v-if="pkgRegionPricesRows.length > 0" type="danger" plain size="small" @click="clearAllPkgRegionPrices">清空全部</el-button>
          </div>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="pkgForm.description" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="pkgForm.sort" :min="0" />
        </el-form-item>
        <el-form-item label="图片">
          <div class="pkg-images-list">
            <div v-for="(img, idx) in pkgForm.images" :key="idx" class="image-preview-wrapper">
              <img :src="img" style="width: 100px; height: 100px; border-radius: 8px; object-fit: cover; display: block;" />
              <div class="image-overlay" @click.stop="removePkgImage(idx)">删除</div>
            </div>
            <el-upload
              :show-file-list="false"
              :auto-upload="false"
              accept=".jpg,.jpeg,.png,.gif,.webp,.pdf"
              class="seal-image-uploader"
              :on-change="(file: any) => {
                const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
                if (!allowedTypes.includes(file.raw?.type)) {
                  ElMessage.error('仅支持 jpg/png/gif/webp/pdf 格式')
                  return
                }
                uploadPkg(file.raw)
              }"
            >
              <el-button type="primary" plain>+ 添加图片</el-button>
            </el-upload>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="pkgDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="savePkg" :loading="pkgSaving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { provinceToCities, cityToDistricts } from '@/data/region-data'
import { Box, Postcard } from '@element-plus/icons-vue'
import { getSealCategories, getSealSceneProducts, createSeal, updateSeal, deleteSeal, uploadImage, updatePackage, deletePackage, getAdminScenes, getSeals, getSealPackages, createPackage } from '@/api'
const route = useRoute()

// 路由逻辑分类 key（不依赖数据，初始化即可确定）
const routeCategoryKey = computed(() => {
  const p = (route.path || '')
  if (p.endsWith('/personal')) return 'personal'
  if (p.endsWith('/electronic')) return 'electronic'
  return '__ALL_BUSINESS__'
})

// 场景全部来自接口，不再写死任何 UUID：
//  - 8 大业务场景 = sceneType==='scene'
//  - 个人 / 电子 / 备案查询 靠 route 中的 type= 区分
const personalScene = computed(() => categories.value.find((c) => c.route && c.route.includes('type=personal')))
const electronicScene = computed(() => categories.value.find((c) => c.route && c.route.includes('type=electronic')))

const isPersonal = computed(() => routeCategoryKey.value === 'personal')
const isElectronic = computed(() => routeCategoryKey.value === 'electronic')

const defaultCategory = computed(() => {
  if (isPersonal.value) return personalScene.value?.id || ''
  if (isElectronic.value) return electronicScene.value?.id || ''
  return '__ALL_BUSINESS__'
})

// 个人印章子分类（硬编码，不再动态计算）
const personalCategories = [
  { id: '__personal__', name: '个人印章' },
  { id: '__professional__', name: '个人职业印章' },
]

// 对话框「分类」下拉候选：企业=8 大业务场景；电子=单一电子场景（禁用）；个人走子分类（不展示本下拉）
const sceneOptions = computed(() => {
  if (isPersonal.value) return []
  if (isElectronic.value) return electronicScene.value ? [electronicScene.value] : []
  return businessCategories.value
})

// 电子印章子类型（Tab 分类，硬编码）
const ELECTRONIC_SUB_TYPES = [
  { label: '电子公章', prefix: '电子公章' },
  { label: '电子财务章', prefix: '电子财务章' },
  { label: '电子合同章', prefix: '电子合同章' },
  { label: '电子法人章', prefix: '电子法人章' },
  { label: '电子发票章', prefix: '电子发票章' },
  { label: '电子个人签名章', prefix: '电子个人签名章' },
  { label: '电子其他印章', prefix: '电子其他印章' },
]

// 从印章名提取子类型（用于电子印章卡片显示）
function getSealSubType(name: string): string {
  for (const t of ELECTRONIC_SUB_TYPES) {
    if (name.startsWith(t.prefix)) return t.label
  }
  return ''
}

// 路由类型：all / enterprise / single
const routeType = computed(() => {
  const cat = defaultCategory.value
  if (!cat) return 'single'
  if (cat === '__ALL_BUSINESS__') return 'enterprise'
  return 'single'
})

// 单一分类 Tab 的显示名称
const defaultCategoryName = computed(() => {
  const cat = categories.value.find((c) => c.id === defaultCategory.value)
  return cat?.name || ''
})

// 8 大业务场景：sceneType==='scene'（来自接口，不再写死 ID 白名单）

const categories = ref<any[]>([])
const seals = ref<any[]>([])
const packages = ref<any[]>([])
const loading = ref(false)

const activeSceneId = ref('')        // enterprise 路由：当前选中的场景
const activeSingleTab = ref('')       // single 路由：Tab name（等于 defaultCategory）
const activePersonalSubTab = ref('personal')  // single 路由 + 个人场景：子 Tab（个人印章 / 个人职业印章）
const activeSingleSubTab = ref('电子公章')    // single 路由 + 电子场景：子 Tab（电子公章 / …）

const dialogVisible = ref(false)
const sealUploadRef = ref<any>(null)
const saving = ref(false)
const isEdit = ref(false)
const form = reactive<any>({ name: '', sceneId: '', sealCategoryId: '', price: 0, region_prices: {}, description: '', sort: 0, image: '' })
// 全国地级以上城市级联数据（用于城市差异化定价选择器）
// 全国三级行政区划（省 → 市 → 区），数据来自 @/data/region-data（2024 最新）
const PROVINCE_CITY_OPTIONS = Object.keys(provinceToCities).map((prov) => ({
  value: prov,
  label: prov,
  children: (provinceToCities[prov] || []).map((city) => ({
    value: city,
    label: city,
    children: (cityToDistricts[city] || []).map((dist) => ({ value: dist, label: dist })),
  })),
}))

// 市 → 省 反向映射，用于编辑时回显级联路径
const CITY_TO_PROVINCE: Record<string, string> = {}
for (const [prov, cities] of Object.entries(provinceToCities)) {
  for (const c of cities) CITY_TO_PROVINCE[c] = prov
}

const cityOptions = PROVINCE_CITY_OPTIONS

const regionPricesRows = ref<Array<{ city: string; price: number; _cityValue: string | string[] }>>([])
const pricingMode = ref<'nationwide' | 'regional'>('nationwide')

function getRegionPricesRows() {
  const rp = form.region_prices || {}
  // @ts-ignore
  regionPricesRows.value = Object.entries(rp).map(([city, price]) => ({ city, price: Number(price), _cityValue: CITY_TO_PROVINCE[city] ? [CITY_TO_PROVINCE[city], city] : (city || '') }))
}

function addRegionPrice() {
  regionPricesRows.value.push({ city: '', price: 0, _cityValue: '' })
}

function removeRegionPrice(idx: number) {
  regionPricesRows.value.splice(idx, 1)
}

async function clearAllRegionPrices() {
  try {
    await ElMessageBox.confirm('确定要清空所有城市价格吗？', '提示', { type: 'warning' })
    regionPricesRows.value = []
  } catch {
    // user cancelled
  }
}

// 套餐弹窗状态
const pkgDialogVisible = ref(false)
const pkgSaving = ref(false)
const pkgIsEdit = ref(false)
const pkgForm = reactive<any>({ id: '', sceneId: '', name: '', price: 0, description: '', sort: 0, images: [], region_prices: {}, sealIds: [] })

// 套餐弹窗：可选印章列表（按所选场景加载，非企业路由回退全量）
const pkgSealOptions = ref<any[]>([])
async function loadPkgSealOptions(sceneId?: string) {
  try {
    if (routeType.value === 'enterprise' && sceneId) {
      const res: any = await getSealSceneProducts(sceneId)
      pkgSealOptions.value = Array.isArray(res?.seals) ? res.seals : []
    } else {
      // 非企业路由 or 未选场景时：只展示当前分类下的印章（避免跨模块印章混入）
      const cat = activeSceneId.value
        ? businessCategories.value.find((c) => c.id === activeSceneId.value)
        : null
      const catName = cat?.name || ''
      const all: any = await getSeals()
      const list = Array.isArray(all) ? all : (all?.items || [])
      pkgSealOptions.value = list.filter((s: any) => s._sceneName === catName)
    }
  } catch {
    pkgSealOptions.value = []
  }
}

// 当前 Tab 下的印章（按 sort 排序）
const filteredSeals = computed(() => {
  let list = seals.value
  if (routeType.value === 'enterprise' && activeSceneId.value) {
    const scene = businessCategories.value.find((c) => c.id === activeSceneId.value)
    list = list.filter((s) => s._sceneName === scene?.name)
  } else if (isPersonal.value) {
    list = activePersonalSubTab.value === '个人印章'
      ? list.filter((s) => s.name === '个人签名章')
      : list.filter((s) => s.name !== '个人签名章')
  } else if (isElectronic.value) {
    list = list.filter((s) => getSealSubType(s.name) === activeSingleSubTab.value)
  }
  return [...list].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
})

// 当前 Tab 下的套餐（按 sort 排序）
const filteredPackages = computed(() => {
  const list = packages.value
    .filter((p) => {
      if (routeType.value === 'enterprise' && activeSceneId.value) {
        const sceneName = businessCategories.value.find((c) => c.id === activeSceneId.value)?.name
        return p._sceneName === sceneName
      }
      return true
    })
    .map((p) => ({ ...p, __isPackage: true }))
  return [...list].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
})

// 兼容旧逻辑（已废弃，由 filteredSeals + filteredPackages 替代）
const mergedItems = computed(() => [...filteredSeals.value, ...filteredPackages.value])


function sceneItemCount(sceneId: string): number {
  const sceneName = businessCategories.value.find((c) => c.id === sceneId)?.name
  if (!sceneName) return 0
  return seals.value.filter((s) => s._sceneName === sceneName).length
    + packages.value.filter((p) => p._sceneName === sceneName).length
}

// 个人场景：子分组计数
// 个人印章 Tab 数量（动态计算，不再硬编码子分类名）
const personalSealCount = computed(() => seals.value.filter((s) => s.name === '个人签名章').length)
const professionalSealCount = computed(() => seals.value.filter((s) => s.name !== '个人签名章').length)

// 单路由（个人 + 电子）子 Tab 计数
// 电子印章 Tab 数量（基于动态 electronicSubTypesMap）
function singleSubCount(label: string): number {
  const st = ELECTRONIC_SUB_TYPES.find(st => st.label === label)
  if (!st) return 0
  return seals.value.filter(s => s.name.startsWith(st.prefix)).length
}

// seal_categories 中 name='个人印章'/'电子印章' 的项 → 补充 personalScene/electronicScene
async function fetchAllCategories() {
  const [catRes, sceneRes] = await Promise.all([
    getSealCategories().catch(() => []),
    getAdminScenes().catch(() => []),
  ])
  const cats = Array.isArray(catRes) ? catRes : (catRes?.data || [])
  const scenes = Array.isArray(sceneRes) ? sceneRes : (sceneRes?.data || [])
  const personalCat = cats.find((c: any) => c.name === '个人印章')
  const electronicCat = cats.find((c: any) => c.name === '电子印章')
  const merged: any[] = [...scenes]
  if (personalCat) merged.push({ ...personalCat, sceneType: 'single', route: '/pages/seal/form/index?type=personal' })
  if (electronicCat) merged.push({ ...electronicCat, sceneType: 'single', route: '/pages/seal/form/index?type=electronic' })
  categories.value = merged
}

async function fetchSealsByCategory(catId: string) {
  loading.value = true
  try {
    if (catId === '__ALL_BUSINESS__') {
      const results = await Promise.all(businessCategories.value.map((c) => fetchCategoryProducts(c.id, c.name)))
      seals.value = results.flat()
      const pkgResults = await Promise.all(businessCategories.value.map((c) => fetchCategoryPackages(c.id, c.name)))
      packages.value = pkgResults.flat()
      if (!activeSceneId.value && businessCategories.value.length) {
        activeSceneId.value = businessCategories.value[0].id
      }
    } else if (isElectronic.value) {
      // 电子印章场景：父分类下无印章，实际印章挂在 6 个子分类下
      // 走 /seals 全量后过滤 name 以'电子'开头，避免依赖父子关联字段
      const all: any = await getSeals()
      const list = Array.isArray(all) ? all : (all?.items || [])
      const cat = categories.value.find((c) => c.id === catId)
      seals.value = list
        .filter((s: any) => s.name && s.name.startsWith('电子'))
        .map((s: any) => ({ ...s, categoryName: s.sealCategories?.name || '—', _sceneName: cat?.name || '电子印章' }))
      packages.value = []
    } else if (isPersonal.value) {
      // 个人印章：全量拉取后前端按 name 过滤
      const all: any = await getSeals()
      const list = Array.isArray(all) ? all : (all?.items || [])
      const cat = categories.value.find((c) => c.id === catId)
      seals.value = list
        .filter((s: any) => {
          const n = s.sealCategories?.name
          return n === '个人印章' || n === '电子个人签名章'
        })
        .map((s: any) => ({ ...s, categoryName: s.sealCategories?.name || '—', _sceneName: cat?.name || '个人印章' }))
      packages.value = []
    } else {
      const cat = categories.value.find((c) => c.id === catId)
      const catName = cat?.name || ''
      seals.value = await fetchCategoryProducts(catId, catName)
      packages.value = await fetchCategoryPackages(catId, catName)
    }
  } finally {
    loading.value = false
  }
}

async function fetchCategoryProducts(catId: string, catName: string): Promise<any[]> {
  try {
    // enterprise 路由使用场景 API
    if (routeType.value === 'enterprise') {
      const res: any = await getSealSceneProducts(catId)
      if (!res?.seals) return []
      return res.seals.map((s: any) => ({
        ...s,
        categoryName: s.sealCategories?.name || '—',
        _sceneName: catName,
      }))
    }
    // 其他路由使用分类 API
    const res: any = await getSealCategories(catId)
    if (!res?.seals) return []
    return res.seals.map((s: any) => ({
      ...s,
      categoryName: s.sealCategories?.name || '—',
      _sceneName: catName,
    }))
  } catch {
    return []
  }
}

async function fetchCategoryPackages(catId: string, catName: string): Promise<any[]> {
  try {
    // enterprise 路由使用场景 API
    if (routeType.value === 'enterprise') {
      const res: any = await getSealSceneProducts(catId)
      if (!res?.packages) return []
      return res.packages.map((p: any) => ({ ...p, categoryName: catName, _sceneName: catName, _sceneId: p.scene_id }))
    }
    // 其他路由：套餐独立接口，全量返回
    const res: any = await getSealPackages()
    return Array.isArray(res) ? res.map((p: any) => ({ ...p, categoryName: catName, _sceneName: catName })) : []
  } catch {
    return []
  }
}

function handleAddCommand(cmd: 'seal' | 'package') {
  if (cmd === 'seal') showDialog('add')
  else openPkgDialog()
}

function showDialog(type: string, row?: any) {
  isEdit.value = type === 'edit'
  if (row) {
    // 编辑：回显当前所属场景 + 个人子分类，允许改所属场景
    let ctxSceneId = ''
    if (isPersonal.value) ctxSceneId = personalScene.value?.id || ''
    else if (isElectronic.value) ctxSceneId = electronicScene.value?.id || ''
    else ctxSceneId = activeSceneId.value || ''
    Object.assign(form, { ...row, sceneId: ctxSceneId, sealCategoryId: row.sealCategories?.id || '' })
    getRegionPricesRows()
    pricingMode.value = Object.keys(form.region_prices || {}).length > 0 ? 'regional' : 'nationwide'
  } else {
    // 新增：预选当前所属场景（企业=当前 Tab；个人/电子=对应场景）
    let defaultSceneId = ''
    if (isPersonal.value) defaultSceneId = personalScene.value?.id || ''
    else if (isElectronic.value) defaultSceneId = electronicScene.value?.id || ''
    else defaultSceneId = activeSceneId.value || ''
    Object.assign(form, { name: '', sceneId: defaultSceneId, sealCategoryId: '', price: 0, region_prices: {}, description: '', sort: 0, image: '' })
    regionPricesRows.value = []
    pricingMode.value = 'nationwide'
  }
  dialogVisible.value = true
}

async function saveSeal() {
  if (!form.name) { ElMessage.warning('请填写印章名称'); return }
  if (routeType.value === 'enterprise' && !form.sceneId) { ElMessage.warning('请选择印章所属分类'); return }
  saving.value = true
  try {
    // 从行编辑数据还原 region_prices 对象（全国价模式强制清空，仅用基准价）
    const region_prices: Record<string, number> = {}
    if (pricingMode.value === 'regional') {
      for (const row of regionPricesRows.value) {
        if (row.city.trim()) region_prices[row.city.trim()] = row.price
      }
    }

    if (isEdit.value) {
      // 编辑：categoryId=场景（重建关联，允许改所属场景）；sealCategoryId=个人子分类（写回 seal.seal_categoriesId）
      await updateSeal(form.id, {
        name: form.name,
        price: form.price,
        region_prices,
        description: form.description,
        sort: form.sort,
        image: form.image,
        categoryId: form.sceneId || undefined,
        sealCategoryId: form.sealCategoryId || null,
      })
    } else {
      await createSeal({
        name: form.name,
        price: form.price,
        region_prices,
        description: form.description,
        sort: form.sort,
        image: form.image,
        categoryId: form.sceneId || undefined,
        sealCategoryId: form.sealCategoryId || undefined,
      })
    }
    ElMessage.success('保存成功')
    dialogVisible.value = false
    await fetchSealsByCategory(defaultCategory.value)
  } finally {
    saving.value = false
  }
}

async function handleDelete(row: any) {
  await ElMessageBox.confirm('确认删除该印章？', '提示')
  await deleteSeal(row.id)
  ElMessage.success('删除成功')
  await fetchSealsByCategory(defaultCategory.value)
}

// 套餐相关
function showPkgDialog(row: any) {
  pkgIsEdit.value = true
  pkgForm.id = row.id
  pkgForm.sceneId = row._sceneId || ''
  pkgForm.name = row.name
  pkgForm.price = Number(row.price) || 0
  pkgForm.description = row.description || ''
  pkgForm.sort = row.sort ?? 0
  pkgForm.sealIds = Array.isArray(row.seal_ids) ? [...row.seal_ids] : []
  loadPkgSealOptions(pkgForm.sceneId)
  pkgForm.images = Array.isArray(row.images) ? [...row.images] : []
  pkgForm.region_prices = row.region_prices || {}
  getPkgRegionPricesRows()
  pkgPricingMode.value = Object.keys(pkgForm.region_prices || {}).length > 0 ? 'regional' : 'nationwide'
  pkgDialogVisible.value = true
}

function openPkgDialog() {
  pkgIsEdit.value = false
  pkgForm.id = ''
  pkgForm.sceneId = routeType.value === 'enterprise' ? (activeSceneId.value || '') : ''
  pkgForm.name = ''
  pkgForm.price = 0
  pkgForm.description = ''
  pkgForm.sort = 0
  pkgForm.sealIds = []
  loadPkgSealOptions(pkgForm.sceneId)
  pkgForm.images = []
  pkgForm.region_prices = {}
  pkgRegionPricesRows.value = []
  pkgPricingMode.value = 'nationwide'
  pkgDialogVisible.value = true
}

// 套餐城市差异化定价
const pkgRegionPricesRows = ref<Array<{ city: string; price: number; _cityValue: string | string[] }>>([])
const pkgPricingMode = ref<'nationwide' | 'regional'>('nationwide')
function getPkgRegionPricesRows() {
  const rp = pkgForm.region_prices || {}
  // @ts-ignore
  pkgRegionPricesRows.value = Object.entries(rp).map(([city, price]) => ({ city, price: Number(price), _cityValue: CITY_TO_PROVINCE[city] ? [CITY_TO_PROVINCE[city], city] : (city || '') }))
}
function addPkgRegionPrice() {
  pkgRegionPricesRows.value.push({ city: '', price: 0, _cityValue: '' })
}
function removePkgRegionPrice(idx: number) {
  pkgRegionPricesRows.value.splice(idx, 1)
}
async function clearAllPkgRegionPrices() {
  try {
    await ElMessageBox.confirm('确认清空所有城市价格？', '提示', { type: 'warning' })
  } catch {
    return
  }
  pkgRegionPricesRows.value = []
}
function buildPkgRegionPrices() {
  const rp: Record<string, number> = {}
  for (const row of pkgRegionPricesRows.value) {
    if (row.city && row.price !== undefined && row.price !== null) {
      rp[row.city] = Number(row.price)
    }
  }
  return rp
}

async function savePkg() {
  if (!pkgForm.name) { ElMessage.warning('请填写套餐名称'); return }
  if (routeType.value === 'enterprise' && !pkgForm.sceneId) { ElMessage.warning('请选择套餐所属场景'); return }
  if (!Array.isArray(pkgForm.sealIds) || pkgForm.sealIds.length === 0) { ElMessage.warning('请选择套餐包含的印章'); return }
  pkgSaving.value = true
  try {
    const sceneIds = routeType.value === 'enterprise' && pkgForm.sceneId ? [pkgForm.sceneId] : []
    const __DEBUG_SAVE_PKG_FIX__ = 'DEBUG_ACTIVE_SCENE_ID_REFRESH'; const targetSceneId = pkgForm.sceneId || defaultCategory.value // 记录保存到了哪个场景，用于后续刷新
    const payload = {
      name: pkgForm.name,
      price: pkgForm.price,
      description: pkgForm.description,
      sort: pkgForm.sort,
      images: pkgForm.images,
      region_prices: pkgPricingMode.value === 'regional' ? buildPkgRegionPrices() : {},
      scene_ids: sceneIds,
      seal_ids: pkgForm.sealIds,
    }
    if (pkgIsEdit.value) {
      await updatePackage(pkgForm.id, payload)
    } else {
      await createPackage(payload)
    }
    ElMessage.success(pkgIsEdit.value ? '保存成功' : '创建成功')
    pkgDialogVisible.value = false
    if (routeType.value === 'enterprise') {
      // 切换到套餐所属的 Tab 并刷新，否则套餐会"消失"
      activeSceneId.value = targetSceneId
      await fetchSealsByCategory(targetSceneId)
    } else {
      await fetchSealsByCategory(defaultCategory.value)
    }
  } finally {
    pkgSaving.value = false
  }
}

async function uploadPkg(file: File) {
  try {
    const res: any = await (uploadImage as any)(file)
    const url = res?.url || ''
    if (!url) { ElMessage.error('上传失败：未获取到文件地址'); return }
    if (!pkgForm.images) pkgForm.images = []
    pkgForm.images.push(url)
    ElMessage.success('上传成功')
  } catch (err: any) {
    ElMessage.error('上传失败')
  }
}

function removePkgImage(idx: number) {
  pkgForm.images.splice(idx, 1)
}

async function handlePkgDelete(row: any) {
  await ElMessageBox.confirm('确认删除该套餐？', '提示')
  await deletePackage(row.id)
  ElMessage.success('删除成功')
  await fetchSealsByCategory(defaultCategory.value)
}

async function toggleStatus(row: any) {
  await updateSeal(row.id, { status: row.status })
  ElMessage.success('状态已更新')
}

async function beforeUpload(file: File) {
  // 与后端保持一致：jpg/png/gif/webp/pdf
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
  const isAllowed = allowedTypes.includes(file.type)
  if (!isAllowed) {
    ElMessage.error('只支持 JPG/PNG/GIF/WebP/PDF 格式')
    return false
  }
  const isLt2M = file.size / 1024 / 1024 < 2
  if (!isLt2M) {
    ElMessage.error('图片大小不能超过 2MB')
    return false
  }
  return true
}

async function uploadSeal(options: any) {
  try {
    const res: any = await (uploadImage as any)(options.file)
    form.image = res.url
    ElMessage.success('上传成功')
  } catch (err) {
    ElMessage.error('上传失败')
  }
}

function triggerSealUpload() {
  // 清除已选文件状态，重新触发系统文件选择对话框
  sealUploadRef.value?.clearFiles()
  const input = sealUploadRef.value?.$refs.input as HTMLInputElement | undefined
  if (input) input.click()
}

// 业务场景（8 大场景）：sceneType==='scene'
const businessCategories = computed(() => categories.value.filter((c) => c.sceneType === 'scene'))

// seal_categories 全量（17 条），用于查找个人 / 电子分类的 id
const sealCategories = ref<any[]>([])

// 初始化
onMounted(async () => {
  await fetchAllCategories()
  await fetchSealsByCategory(defaultCategory.value)
  // single 路由：Tab name 同步为 defaultCategory
  if (routeType.value === 'single') {
    activeSingleTab.value = defaultCategory.value
  }
})

// 路由切换 / 分类数据加载完成：重新拉取对应场景数据
watch(defaultCategory, async (newVal, oldVal) => {
  if (newVal === oldVal) return
  activeSceneId.value = ''
  activeSingleTab.value = newVal
  activePersonalSubTab.value = '个人印章'
  activeSingleSubTab.value = '电子公章'
  if (newVal) await fetchSealsByCategory(newVal)
})

// Tab 切换：enterprise 路由直接拉对应场景数据
watch(activeSceneId, async (newId, oldId) => {
  if (!newId || newId === oldId) return
  if (routeType.value !== 'enterprise') return
  // 清空旧数据，立即显示新 Tab 内容（避免旧数据残影）
  seals.value = []
  packages.value = []
  loading.value = true
  try {
    const cat = businessCategories.value.find((c) => c.id === newId)
    if (cat) {
      const [catSeals, catPkgs] = await Promise.all([
        fetchCategoryProducts(cat.id, cat.name),
        fetchCategoryPackages(cat.id, cat.name),
      ])
      seals.value = catSeals
      packages.value = catPkgs
    }
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.page-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #333;
}
.page-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}

.scene-tabs {
  margin-bottom: 20px;
}
.scene-tabs :deep(.el-tabs__header) {
  margin-bottom: 16px;
}
.scene-tabs :deep(.el-tabs__nav-wrap::after) {
  height: 1px;
  background: #e8e8e8;
}
.scene-tabs :deep(.el-tabs__item) {
  font-size: 14px;
  padding: 0 20px;
  height: 40px;
  line-height: 40px;
}
.scene-tabs :deep(.el-tabs__item.is-active) {
  color: #5B6FE8;
  font-weight: 500;
}
.scene-tabs :deep(.el-tabs__active-bar) {
  background: #5B6FE8;
  height: 2px;
}

/* 电子印章 Tab 特殊样式 */
.electronic-tabs :deep(.el-tabs__item) {
  font-size: 13px;
  padding: 0 16px;
}

.tab-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
}
.tab-badge {
  transform: translateY(-1px);
}
.tab-badge :deep(.el-badge__content) {
  font-size: 11px;
  height: 16px;
  line-height: 16px;
  padding: 0 5px;
  border-radius: 8px;
}

.scene-grid-wrap {
  min-height: 200px;
  padding: 4px 0;
}
.scene-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
}

.seal-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  border: 1px solid #f0f0f0;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}
.seal-card:hover {
  border-color: #5B6FE8;
  box-shadow: 0 8px 24px rgba(91, 111, 232, 0.15);
  transform: translateY(-4px);
}
.seal-card.is-pkg {
  border-color: #f5dab1;
  background: linear-gradient(135deg, #fffaf0 0%, #fff5e6 100%);
}
.seal-card.is-pkg:hover {
  border-color: #e6a23c;
  box-shadow: 0 8px 24px rgba(230, 162, 60, 0.15);
}

.card-image {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  background: linear-gradient(135deg, #f8f9fc 0%, #f0f2f5 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.image-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #f0f2f5 0%, #e8eaed 100%);
}
.card-tag {
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
}

.card-body {
  padding: 14px 16px 10px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.card-category {
  min-height: 22px;
}
.card-category :deep(.el-tag) {
  font-size: 11px;
  padding: 0 8px;
  height: 22px;
  line-height: 20px;
  border-radius: 4px;
  background: #f0f2ff;
  border-color: #d9ddff;
  color: #5B6FE8;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.card-name {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 40px;
}
.card-price {
  font-size: 18px;
  font-weight: 700;
  color: #f56c6c;
  margin-top: auto;
  padding-top: 4px;
}
.card-price.pkg-price {
  color: #e6a23c;
}

.card-actions {
  padding: 10px 16px 14px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  border-top: 1px solid #f5f7fa;
}
.card-actions :deep(.el-button) {
  font-size: 13px;
  padding: 4px 12px;
}

.empty-tip {
  text-align: center;
  color: #909399;
  padding: 80px 0;
  font-size: 14px;
}

/* 描述 + 排序/图片 两列布局 */
.form-row-2col {
  display: grid;
  grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
  gap: 16px;
  align-items: start;
}
.form-row-2col .col-left,
.form-row-2col .col-right {
  min-width: 0;
}
.form-row-2col .col-right {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.form-row-2col .el-form-item {
  margin-bottom: 18px;
}

.seal-image-uploader .image-preview-wrapper {
  position: relative;
  cursor: pointer;
  display: inline-block;
}
.seal-image-uploader .image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100px;
  height: 100px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}
.seal-image-uploader .image-preview-wrapper:hover .image-overlay {
  opacity: 1;
}

/* 套餐多图片列表 */
.pkg-images-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-start;
}
.pkg-images-list .image-preview-wrapper {
  position: relative;
  cursor: pointer;
  display: inline-block;
}
.pkg-images-list .image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100px;
  height: 100px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
  font-size: 13px;
}
.pkg-images-list .image-preview-wrapper:hover .image-overlay {
  opacity: 1;
}

/* ===== 城市差异化定价 ===== */
.region-price-tip {
  color: #606266;
  font-size: 13px;
  line-height: 1.6;
  margin-bottom: 8px;
}
.region-price-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 6px;
}
.region-price-actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}
.region-price-actions .el-button {
  padding: 6px 14px;
}

/* ===== 对话框遮罩：打开时背景 Tab 不高亮 ===== */
.el-dialog {
  z-index: 2000 !important;
}

/* ===== 分区标题 ===== */
.section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 6px;
  border-left: 3px solid #409eff;
}
.section-header--mt {
  margin-top: 24px;
}
.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}
.section-count {
  font-size: 12px;
  color: #909399;
  background: #e6e8eb;
  padding: 1px 8px;
  border-radius: 10px;
}
</style>

