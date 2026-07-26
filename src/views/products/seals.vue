<template>
  <div>
    <div class="page-header">
      <h2>印章管理</h2>
      <el-button type="primary" @click="showDialog('add')">添加印章</el-button>
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
        <el-tab-pane name="个人印章">
          <template #label>
            <span class="tab-label">
              个人印章
              <el-badge
                v-if="personalSubCount('个人印章') > 0"
                :value="personalSubCount('个人印章')"
                :max="99"
                class="tab-badge"
                type="primary"
              />
            </span>
          </template>
        </el-tab-pane>
        <el-tab-pane name="个人职业印章">
          <template #label>
            <span class="tab-label">
              个人职业印章
              <el-badge
                v-if="personalSubCount('个人职业印章') > 0"
                :value="personalSubCount('个人职业印章')"
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
        <div v-if="!mergedItems.length && !loading" class="empty-tip">
          该场景暂无印章
        </div>
        <div v-else class="scene-grid">
          <div
            v-for="row in mergedItems"
            :key="row.id"
            class="seal-card"
            :class="{ 'is-pkg': row.__isPackage }"
          >
            <div class="card-image">
              <!-- 套餐多图轮播 -->
              <el-carousel
                v-if="row.__isPackage && row.images?.length"
                height="160px"
                indicator-position="outside"
                arrow="always"
                :autoplay="false"
              >
                <el-carousel-item v-for="(img, idx) in row.images" :key="idx">
                  <el-image :src="img" fit="cover" style="width: 100%; height: 100%" />
                </el-carousel-item>
              </el-carousel>
              <!-- 单图或印章 -->
              <el-image
                v-else-if="!row.__isPackage && row.image"
                :src="row.image"
                fit="cover"
                style="width: 100%; height: 100%"
              />
              <div v-else class="image-placeholder">
                <el-icon :size="32" color="#c0c4cc"><Box v-if="row.__isPackage" /><Postcard v-else /></el-icon>
              </div>
              <el-tag v-if="row.__isPackage" type="warning" size="small" class="card-tag">套餐</el-tag>
            </div>
            <div class="card-body">
              <div class="card-category" :title="row.seal_categories?.name || row.categoryName || ''">
                <el-tag v-if="row.seal_categories?.name" size="small" type="info" effect="plain">{{ row.seal_categories.name }}</el-tag>
                <el-tag v-else-if="row.categoryName" size="small" type="info" effect="plain">{{ row.categoryName }}</el-tag>
                <el-tag v-else-if="isElectronic && getSealSubType(row.name)" size="small" type="info" effect="plain">{{ getSealSubType(row.name) }}</el-tag>
              </div>
              <div class="card-name" :title="row.name">{{ row.name }}</div>
              <div class="card-price" :class="{ 'pkg-price': row.__isPackage }">¥{{ row.price }}</div>
            </div>
            <div class="card-actions">
              <template v-if="row.__isPackage">
                <el-button type="primary" link size="small" @click="showPkgDialog(row)">编辑</el-button>
                <el-button type="danger" link size="small" @click="handlePkgDelete(row)">删除</el-button>
              </template>
              <template v-else>
                <el-button type="primary" link size="small" @click="showDialog('edit', row)">编辑</el-button>
                <el-button type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加/编辑印章对话框 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑印章' : '添加印章'" width="600px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="印章名称" required>
          <el-input v-model="form.name" placeholder="如：公章" />
        </el-form-item>
        <el-form-item label="类型" required v-if="isPersonal">
          <el-select v-model="form.sealCategoryId" placeholder="选择印章类型">
            <el-option v-for="c in personalCategories" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="分类" required v-else>
          <el-select v-model="form.sceneId" placeholder="选择分类" :disabled="isElectronic">
            <el-option v-for="c in sceneOptions" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="价格(元)" required>
          <el-input-number v-model="form.price" :min="0" :precision="2" />
          <span style="color:#999;font-size:12px;margin-left:8px">基准价（默认）</span>
        </el-form-item>
        <el-form-item label="城市差异化定价">
          <div class="region-price-tip">设置各城市价格（空则使用上方基准价）</div>
          <div v-for="(row, idx) in regionPricesRows" :key="idx" class="region-price-row">
            <el-cascader
              v-model="row._cityValue"
              :options="cityOptions"
              :props="{ expandTrigger: 'hover', emitPath: false, checkStrictly: true }"
              placeholder="选择城市"
              clearable
              filterable
              style="width:200px"
              @change="(val: string) => { row.city = val || '' }"
            />
            <el-input-number v-model="row.price" :min="0" :precision="2" style="width:140px" />
            <el-button type="danger" link @click="removeRegionPrice(idx)">删除</el-button>
          </div>
          <div class="region-price-actions">
            <el-button type="default" plain size="small" @click="addRegionPrice">+ 添加城市价格</el-button>
            <el-button v-if="regionPricesRows.length > 0" type="danger" plain size="small" @click="clearAllRegionPrices">清空全部</el-button>
          </div>
        </el-form-item>
        <div class="form-row-2col">
          <div class="col-left">
            <el-form-item label="描述">
              <el-input v-model="form.description" type="textarea" rows="3" />
            </el-form-item>
          </div>
          <div class="col-right">
            <el-form-item label="排序">
              <el-input-number v-model="form.sort" :min="0" style="width:100%" />
            </el-form-item>
            <el-form-item label="图片" label-width="60px">
              <el-upload
                :show-file-list="false"
                :before-upload="beforeUpload"
                :http-request="uploadSeal"
                class="seal-image-uploader"
              >
                <div v-if="form.image" class="image-preview-wrapper">
                  <el-image :src="form.image" style="width: 80px; height: 80px; border-radius: 8px" />
                  <div class="image-overlay">更换</div>
                </div>
                <el-button v-else type="primary" plain size="small">上传图片</el-button>
              </el-upload>
            </el-form-item>
          </div>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveSeal" :loading="saving">保存</el-button>
      </template>
    </el-dialog>

    <!-- 编辑套餐对话框 -->
    <el-dialog v-model="pkgDialogVisible" title="编辑套餐" width="600px">
      <el-form :model="pkgForm" label-width="100px">
        <el-form-item label="套餐名称" required>
          <el-input v-model="pkgForm.name" placeholder="如：全套公章套餐" />
        </el-form-item>
        <el-form-item label="价格(元)" required>
          <el-input-number v-model="pkgForm.price" :min="0" :precision="2" />
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
              <el-image :src="img" style="width: 100px; height: 100px; border-radius: 8px" />
              <div class="image-overlay" @click="removePkgImage(idx)">删除</div>
            </div>
            <el-upload
              :show-file-list="false"
              :auto-upload="false"
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
import { Box, Postcard } from '@element-plus/icons-vue'
import { getSealCategories, getSealSceneProducts, createSeal, updateSeal, deleteSeal, uploadImage, updatePackage, deletePackage, getAdminScenes, getSeals } from '@/api'
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

// 个人印章子分类（旧 SealCategory）：优先从个人场景已有印章的类目动态汇总，空场景时回退已知两类
const personalCategories = computed<{ id: string; name: string }[]>(() => {
  const map = new Map<string, { id: string; name: string }>()
  for (const s of seals.value) {
    if (s.seal_categories?.id && s.seal_categories?.name) map.set(s.seal_categories.id, { id: s.seal_categories.id, name: s.seal_categories.name })
  }
  return map.size > 0 ? [...map.values()] : []
})

// 对话框「分类」下拉候选：企业=8 大业务场景；电子=单一电子场景（禁用）；个人走子分类（不展示本下拉）
const sceneOptions = computed(() => {
  if (isPersonal.value) return []
  if (isElectronic.value) return electronicScene.value ? [electronicScene.value] : []
  return businessCategories.value
})

// 电子印章子类型（Tab 分类）
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
const activePersonalSubTab = ref('个人印章')  // single 路由 + 个人场景：子 Tab（个人印章 / 个人职业印章）
const activeSingleSubTab = ref('电子公章')    // single 路由 + 电子场景：子 Tab（电子公章 / …）

const dialogVisible = ref(false)
const saving = ref(false)
const isEdit = ref(false)
const form = reactive<any>({ name: '', sceneId: '', sealCategoryId: '', price: 0, region_prices: {}, description: '', sort: 0, image: '' })
// 全国地级以上城市级联数据（用于城市差异化定价选择器）
const PROVINCE_CITY_OPTIONS = [{"value":"北京市","label":"北京市","children":[{"value":"北京市","label":"北京市"}]},{"value":"天津市","label":"天津市","children":[{"value":"天津市","label":"天津市"}]},{"value":"上海市","label":"上海市","children":[{"value":"上海市","label":"上海市"}]},{"value":"重庆市","label":"重庆市","children":[{"value":"重庆市","label":"重庆市"}]},{"value":"河北省","label":"河北省","children":[{"value":"石家庄市","label":"石家庄市"},{"value":"唐山市","label":"唐山市"},{"value":"秦皇岛市","label":"秦皇岛市"},{"value":"邯郸市","label":"邯郸市"},{"value":"邢台市","label":"邢台市"},{"value":"保定市","label":"保定市"},{"value":"张家口市","label":"张家口市"},{"value":"承德市","label":"承德市"},{"value":"沧州市","label":"沧州市"},{"value":"廊坊市","label":"廊坊市"},{"value":"衡水市","label":"衡水市"}]},{"value":"山西省","label":"山西省","children":[{"value":"太原市","label":"太原市"},{"value":"大同市","label":"大同市"},{"value":"阳泉市","label":"阳泉市"},{"value":"长治市","label":"长治市"},{"value":"晋城市","label":"晋城市"},{"value":"朔州市","label":"朔州市"},{"value":"晋中市","label":"晋中市"},{"value":"运城市","label":"运城市"},{"value":"忻州市","label":"忻州市"},{"value":"临汾市","label":"临汾市"},{"value":"吕梁市","label":"吕梁市"}]},{"value":"内蒙古自治区","label":"内蒙古自治区","children":[{"value":"呼和浩特市","label":"呼和浩特市"},{"value":"包头市","label":"包头市"},{"value":"乌海市","label":"乌海市"},{"value":"赤峰市","label":"赤峰市"},{"value":"通辽市","label":"通辽市"},{"value":"鄂尔多斯市","label":"鄂尔多斯市"},{"value":"呼伦贝尔市","label":"呼伦贝尔市"},{"value":"巴彦淖尔市","label":"巴彦淖尔市"},{"value":"乌兰察布市","label":"乌兰察布市"},{"value":"兴安盟","label":"兴安盟"},{"value":"锡林郭勒盟","label":"锡林郭勒盟"},{"value":"阿拉善盟","label":"阿拉善盟"}]},{"value":"辽宁省","label":"辽宁省","children":[{"value":"沈阳市","label":"沈阳市"},{"value":"大连市","label":"大连市"},{"value":"鞍山市","label":"鞍山市"},{"value":"抚顺市","label":"抚顺市"},{"value":"本溪市","label":"本溪市"},{"value":"丹东市","label":"丹东市"},{"value":"锦州市","label":"锦州市"},{"value":"营口市","label":"营口市"},{"value":"阜新市","label":"阜新市"},{"value":"辽阳市","label":"辽阳市"},{"value":"盘锦市","label":"盘锦市"},{"value":"铁岭市","label":"铁岭市"},{"value":"朝阳市","label":"朝阳市"},{"value":"葫芦岛市","label":"葫芦岛市"}]},{"value":"吉林省","label":"吉林省","children":[{"value":"长春市","label":"长春市"},{"value":"吉林市","label":"吉林市"},{"value":"四平市","label":"四平市"},{"value":"辽源市","label":"辽源市"},{"value":"通化市","label":"通化市"},{"value":"白山市","label":"白山市"},{"value":"松原市","label":"松原市"},{"value":"白城市","label":"白城市"},{"value":"延边朝鲜族自治州","label":"延边朝鲜族自治州"}]},{"value":"黑龙江省","label":"黑龙江省","children":[{"value":"哈尔滨市","label":"哈尔滨市"},{"value":"齐齐哈尔市","label":"齐齐哈尔市"},{"value":"鸡西市","label":"鸡西市"},{"value":"鹤岗市","label":"鹤岗市"},{"value":"双鸭山市","label":"双鸭山市"},{"value":"大庆市","label":"大庆市"},{"value":"伊春市","label":"伊春市"},{"value":"佳木斯市","label":"佳木斯市"},{"value":"七台河市","label":"七台河市"},{"value":"牡丹江市","label":"牡丹江市"},{"value":"黑河市","label":"黑河市"},{"value":"绥化市","label":"绥化市"},{"value":"大兴安岭地区","label":"大兴安岭地区"}]},{"value":"江苏省","label":"江苏省","children":[{"value":"南京市","label":"南京市"},{"value":"无锡市","label":"无锡市"},{"value":"徐州市","label":"徐州市"},{"value":"常州市","label":"常州市"},{"value":"苏州市","label":"苏州市"},{"value":"南通市","label":"南通市"},{"value":"连云港市","label":"连云港市"},{"value":"淮安市","label":"淮安市"},{"value":"盐城市","label":"盐城市"},{"value":"扬州市","label":"扬州市"},{"value":"镇江市","label":"镇江市"},{"value":"泰州市","label":"泰州市"},{"value":"宿迁市","label":"宿迁市"}]},{"value":"浙江省","label":"浙江省","children":[{"value":"杭州市","label":"杭州市"},{"value":"宁波市","label":"宁波市"},{"value":"温州市","label":"温州市"},{"value":"嘉兴市","label":"嘉兴市"},{"value":"湖州市","label":"湖州市"},{"value":"绍兴市","label":"绍兴市"},{"value":"金华市","label":"金华市"},{"value":"衢州市","label":"衢州市"},{"value":"舟山市","label":"舟山市"},{"value":"台州市","label":"台州市"},{"value":"丽水市","label":"丽水市"}]},{"value":"安徽省","label":"安徽省","children":[{"value":"合肥市","label":"合肥市"},{"value":"芜湖市","label":"芜湖市"},{"value":"蚌埠市","label":"蚌埠市"},{"value":"淮南市","label":"淮南市"},{"value":"马鞍山市","label":"马鞍山市"},{"value":"淮北市","label":"淮北市"},{"value":"铜陵市","label":"铜陵市"},{"value":"安庆市","label":"安庆市"},{"value":"黄山市","label":"黄山市"},{"value":"滁州市","label":"滁州市"},{"value":"阜阳市","label":"阜阳市"},{"value":"宿州市","label":"宿州市"},{"value":"六安市","label":"六安市"},{"value":"亳州市","label":"亳州市"},{"value":"池州市","label":"池州市"},{"value":"宣城市","label":"宣城市"}]},{"value":"福建省","label":"福建省","children":[{"value":"福州市","label":"福州市"},{"value":"厦门市","label":"厦门市"},{"value":"莆田市","label":"莆田市"},{"value":"三明市","label":"三明市"},{"value":"泉州市","label":"泉州市"},{"value":"漳州市","label":"漳州市"},{"value":"南平市","label":"南平市"},{"value":"龙岩市","label":"龙岩市"},{"value":"宁德市","label":"宁德市"}]},{"value":"江西省","label":"江西省","children":[{"value":"南昌市","label":"南昌市"},{"value":"景德镇市","label":"景德镇市"},{"value":"萍乡市","label":"萍乡市"},{"value":"九江市","label":"九江市"},{"value":"新余市","label":"新余市"},{"value":"鹰潭市","label":"鹰潭市"},{"value":"赣州市","label":"赣州市"},{"value":"吉安市","label":"吉安市"},{"value":"宜春市","label":"宜春市"},{"value":"抚州市","label":"抚州市"},{"value":"上饶市","label":"上饶市"}]},{"value":"山东省","label":"山东省","children":[{"value":"济南市","label":"济南市"},{"value":"青岛市","label":"青岛市"},{"value":"淄博市","label":"淄博市"},{"value":"枣庄市","label":"枣庄市"},{"value":"东营市","label":"东营市"},{"value":"烟台市","label":"烟台市"},{"value":"潍坊市","label":"潍坊市"},{"value":"济宁市","label":"济宁市"},{"value":"泰安市","label":"泰安市"},{"value":"威海市","label":"威海市"},{"value":"日照市","label":"日照市"},{"value":"临沂市","label":"临沂市"},{"value":"德州市","label":"德州市"},{"value":"聊城市","label":"聊城市"},{"value":"滨州市","label":"滨州市"},{"value":"菏泽市","label":"菏泽市"},{"value":"莱芜市","label":"莱芜市"}]},{"value":"河南省","label":"河南省","children":[{"value":"郑州市","label":"郑州市"},{"value":"开封市","label":"开封市"},{"value":"洛阳市","label":"洛阳市"},{"value":"平顶山市","label":"平顶山市"},{"value":"安阳市","label":"安阳市"},{"value":"鹤壁市","label":"鹤壁市"},{"value":"新乡市","label":"新乡市"},{"value":"焦作市","label":"焦作市"},{"value":"濮阳市","label":"濮阳市"},{"value":"许昌市","label":"许昌市"},{"value":"漯河市","label":"漯河市"},{"value":"三门峡市","label":"三门峡市"},{"value":"南阳市","label":"南阳市"},{"value":"商丘市","label":"商丘市"},{"value":"信阳市","label":"信阳市"},{"value":"周口市","label":"周口市"},{"value":"驻马店市","label":"驻马店市"},{"value":"济源市","label":"济源市"}]},{"value":"湖北省","label":"湖北省","children":[{"value":"武汉市","label":"武汉市"},{"value":"黄石市","label":"黄石市"},{"value":"十堰市","label":"十堰市"},{"value":"宜昌市","label":"宜昌市"},{"value":"襄阳市","label":"襄阳市"},{"value":"鄂州市","label":"鄂州市"},{"value":"荆门市","label":"荆门市"},{"value":"孝感市","label":"孝感市"},{"value":"荆州市","label":"荆州市"},{"value":"黄冈市","label":"黄冈市"},{"value":"咸宁市","label":"咸宁市"},{"value":"随州市","label":"随州市"},{"value":"恩施土家族苗族自治州","label":"恩施土家族苗族自治州"},{"value":"仙桃市","label":"仙桃市"},{"value":"潜江市","label":"潜江市"},{"value":"天门市","label":"天门市"},{"value":"神农架林区","label":"神农架林区"}]},{"value":"湖南省","label":"湖南省","children":[{"value":"长沙市","label":"长沙市"},{"value":"株洲市","label":"株洲市"},{"value":"湘潭市","label":"湘潭市"},{"value":"衡阳市","label":"衡阳市"},{"value":"邵阳市","label":"邵阳市"},{"value":"岳阳市","label":"岳阳市"},{"value":"常德市","label":"常德市"},{"value":"张家界市","label":"张家界市"},{"value":"益阳市","label":"益阳市"},{"value":"郴州市","label":"郴州市"},{"value":"永州市","label":"永州市"},{"value":"怀化市","label":"怀化市"},{"value":"娄底市","label":"娄底市"},{"value":"湘西土家族苗族自治州","label":"湘西土家族苗族自治州"}]},{"value":"广东省","label":"广东省","children":[{"value":"广州市","label":"广州市"},{"value":"韶关市","label":"韶关市"},{"value":"深圳市","label":"深圳市"},{"value":"珠海市","label":"珠海市"},{"value":"汕头市","label":"汕头市"},{"value":"佛山市","label":"佛山市"},{"value":"江门市","label":"江门市"},{"value":"湛江市","label":"湛江市"},{"value":"茂名市","label":"茂名市"},{"value":"肇庆市","label":"肇庆市"},{"value":"惠州市","label":"惠州市"},{"value":"梅州市","label":"梅州市"},{"value":"汕尾市","label":"汕尾市"},{"value":"河源市","label":"河源市"},{"value":"阳江市","label":"阳江市"},{"value":"清远市","label":"清远市"},{"value":"东莞市","label":"东莞市"},{"value":"中山市","label":"中山市"},{"value":"潮州市","label":"潮州市"},{"value":"揭阳市","label":"揭阳市"},{"value":"云浮市","label":"云浮市"}]},{"value":"广西壮族自治区","label":"广西壮族自治区","children":[{"value":"南宁市","label":"南宁市"},{"value":"柳州市","label":"柳州市"},{"value":"桂林市","label":"桂林市"},{"value":"梧州市","label":"梧州市"},{"value":"北海市","label":"北海市"},{"value":"防城港市","label":"防城港市"},{"value":"钦州市","label":"钦州市"},{"value":"贵港市","label":"贵港市"},{"value":"玉林市","label":"玉林市"},{"value":"百色市","label":"百色市"},{"value":"贺州市","label":"贺州市"},{"value":"河池市","label":"河池市"},{"value":"来宾市","label":"来宾市"},{"value":"崇左市","label":"崇左市"}]},{"value":"海南省","label":"海南省","children":[{"value":"海口市","label":"海口市"},{"value":"三亚市","label":"三亚市"},{"value":"三沙市","label":"三沙市"},{"value":"儋州市","label":"儋州市"},{"value":"五指山市","label":"五指山市"},{"value":"琼海市","label":"琼海市"},{"value":"文昌市","label":"文昌市"},{"value":"万宁市","label":"万宁市"},{"value":"东方市","label":"东方市"},{"value":"定安县","label":"定安县"},{"value":"屯昌县","label":"屯昌县"},{"value":"澄迈县","label":"澄迈县"},{"value":"临高县","label":"临高县"},{"value":"白沙黎族自治县","label":"白沙黎族自治县"},{"value":"昌江黎族自治县","label":"昌江黎族自治县"},{"value":"乐东黎族自治县","label":"乐东黎族自治县"},{"value":"陵水黎族自治县","label":"陵水黎族自治县"},{"value":"保亭黎族苗族自治县","label":"保亭黎族苗族自治县"},{"value":"琼中黎族苗族自治县","label":"琼中黎族苗族自治县"}]},{"value":"四川省","label":"四川省","children":[{"value":"成都市","label":"成都市"},{"value":"自贡市","label":"自贡市"},{"value":"攀枝花市","label":"攀枝花市"},{"value":"泸州市","label":"泸州市"},{"value":"德阳市","label":"德阳市"},{"value":"绵阳市","label":"绵阳市"},{"value":"广元市","label":"广元市"},{"value":"遂宁市","label":"遂宁市"},{"value":"内江市","label":"内江市"},{"value":"乐山市","label":"乐山市"},{"value":"南充市","label":"南充市"},{"value":"眉山市","label":"眉山市"},{"value":"宜宾市","label":"宜宾市"},{"value":"广安市","label":"广安市"},{"value":"达州市","label":"达州市"},{"value":"雅安市","label":"雅安市"},{"value":"巴中市","label":"巴中市"},{"value":"资阳市","label":"资阳市"},{"value":"阿坝藏族羌族自治州","label":"阿坝藏族羌族自治州"},{"value":"甘孜藏族自治州","label":"甘孜藏族自治州"},{"value":"凉山彝族自治州","label":"凉山彝族自治州"}]},{"value":"贵州省","label":"贵州省","children":[{"value":"贵阳市","label":"贵阳市"},{"value":"六盘水市","label":"六盘水市"},{"value":"遵义市","label":"遵义市"},{"value":"安顺市","label":"安顺市"},{"value":"毕节市","label":"毕节市"},{"value":"铜仁市","label":"铜仁市"},{"value":"黔西南布依族苗族自治州","label":"黔西南布依族苗族自治州"},{"value":"黔东南苗族侗族自治州","label":"黔东南苗族侗族自治州"},{"value":"黔南布依族苗族自治州","label":"黔南布依族苗族自治州"}]},{"value":"云南省","label":"云南省","children":[{"value":"昆明市","label":"昆明市"},{"value":"曲靖市","label":"曲靖市"},{"value":"玉溪市","label":"玉溪市"},{"value":"保山市","label":"保山市"},{"value":"昭通市","label":"昭通市"},{"value":"丽江市","label":"丽江市"},{"value":"普洱市","label":"普洱市"},{"value":"临沧市","label":"临沧市"},{"value":"楚雄彝族自治州","label":"楚雄彝族自治州"},{"value":"红河哈尼族彝族自治州","label":"红河哈尼族彝族自治州"},{"value":"文山壮族苗族自治州","label":"文山壮族苗族自治州"},{"value":"西双版纳傣族自治州","label":"西双版纳傣族自治州"},{"value":"大理白族自治州","label":"大理白族自治州"},{"value":"德宏傣族景颇族自治州","label":"德宏傣族景颇族自治州"},{"value":"怒江傈僳族自治州","label":"怒江傈僳族自治州"},{"value":"迪庆藏族自治州","label":"迪庆藏族自治州"}]},{"value":"西藏自治区","label":"西藏自治区","children":[{"value":"拉萨市","label":"拉萨市"},{"value":"日喀则市","label":"日喀则市"},{"value":"昌都市","label":"昌都市"},{"value":"林芝市","label":"林芝市"},{"value":"山南市","label":"山南市"},{"value":"那曲市","label":"那曲市"},{"value":"阿里地区","label":"阿里地区"}]},{"value":"陕西省","label":"陕西省","children":[{"value":"西安市","label":"西安市"},{"value":"铜川市","label":"铜川市"},{"value":"宝鸡市","label":"宝鸡市"},{"value":"咸阳市","label":"咸阳市"},{"value":"渭南市","label":"渭南市"},{"value":"延安市","label":"延安市"},{"value":"汉中市","label":"汉中市"},{"value":"榆林市","label":"榆林市"},{"value":"安康市","label":"安康市"},{"value":"商洛市","label":"商洛市"}]},{"value":"甘肃省","label":"甘肃省","children":[{"value":"兰州市","label":"兰州市"},{"value":"嘉峪关市","label":"嘉峪关市"},{"value":"金昌市","label":"金昌市"},{"value":"白银市","label":"白银市"},{"value":"天水市","label":"天水市"},{"value":"武威市","label":"武威市"},{"value":"张掖市","label":"张掖市"},{"value":"平凉市","label":"平凉市"},{"value":"酒泉市","label":"酒泉市"},{"value":"庆阳市","label":"庆阳市"},{"value":"定西市","label":"定西市"},{"value":"陇南市","label":"陇南市"},{"value":"临夏回族自治州","label":"临夏回族自治州"},{"value":"甘南藏族自治州","label":"甘南藏族自治州"}]},{"value":"青海省","label":"青海省","children":[{"value":"西宁市","label":"西宁市"},{"value":"海东市","label":"海东市"},{"value":"海北藏族自治州","label":"海北藏族自治州"},{"value":"黄南藏族自治州","label":"黄南藏族自治州"},{"value":"海南藏族自治州","label":"海南藏族自治州"},{"value":"果洛藏族自治州","label":"果洛藏族自治州"},{"value":"玉树藏族自治州","label":"玉树藏族自治州"},{"value":"海西蒙古族藏族自治州","label":"海西蒙古族藏族自治州"}]},{"value":"宁夏回族自治区","label":"宁夏回族自治区","children":[{"value":"银川市","label":"银川市"},{"value":"石嘴山市","label":"石嘴山市"},{"value":"吴忠市","label":"吴忠市"},{"value":"固原市","label":"固原市"},{"value":"中卫市","label":"中卫市"}]},{"value":"新疆维吾尔自治区","label":"新疆维吾尔自治区","children":[{"value":"乌鲁木齐市","label":"乌鲁木齐市"},{"value":"克拉玛依市","label":"克拉玛依市"},{"value":"吐鲁番市","label":"吐鲁番市"},{"value":"哈密市","label":"哈密市"},{"value":"昌吉回族自治州","label":"昌吉回族自治州"},{"value":"博尔塔拉蒙古自治州","label":"博尔塔拉蒙古自治州"},{"value":"巴音郭楞蒙古自治州","label":"巴音郭楞蒙古自治州"},{"value":"阿克苏地区","label":"阿克苏地区"},{"value":"克孜勒苏柯尔克孜自治州","label":"克孜勒苏柯尔克孜自治州"},{"value":"喀什地区","label":"喀什地区"},{"value":"和田地区","label":"和田地区"},{"value":"伊犁哈萨克自治州","label":"伊犁哈萨克自治州"},{"value":"塔城地区","label":"塔城地区"},{"value":"阿勒泰地区","label":"阿勒泰地区"}]},{"value":"台湾省","label":"台湾省","children":[{"value":"台北市","label":"台北市"},{"value":"新北市","label":"新北市"},{"value":"桃园市","label":"桃园市"},{"value":"台中市","label":"台中市"},{"value":"台南市","label":"台南市"},{"value":"高雄市","label":"高雄市"}]},{"value":"香港特别行政区","label":"香港特别行政区","children":[{"value":"香港","label":"香港"}]},{"value":"澳门特别行政区","label":"澳门特别行政区","children":[{"value":"澳门","label":"澳门"}]}]

const cityOptions = PROVINCE_CITY_OPTIONS

const regionPricesRows = ref<Array<{ city: string; price: number; _cityValue: string }>>([])

function getRegionPricesRows() {
  const rp = form.region_prices || {}
  regionPricesRows.value = Object.entries(rp).map(([city, price]) => ({ city, price: Number(price), _cityValue: city }))
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
const pkgForm = reactive<any>({ id: '', name: '', price: 0, description: '', sort: 0, images: [] })

// 当前 Tab 下的印章 + 套餐
const mergedItems = computed(() => {
  let list = seals.value
  if (routeType.value === 'enterprise' && activeSceneId.value) {
    const scene = businessCategories.value.find((c) => c.id === activeSceneId.value)
    const sceneName = scene?.name
    list = list.filter((s) => s._sceneName === sceneName)
  } else if (isPersonal.value) {
    // 个人印章 tab = 纯签名章；个人职业印章 tab = 其余所有个人印章
    if (activePersonalSubTab.value === '个人印章') {
      list = list.filter((s) => s.name === '个人签名章')
    } else {
      list = list.filter((s) => s.name !== '个人签名章')
    }
  } else if (isElectronic.value) {
    // 电子印章：按子 Tab 过滤
    list = list.filter((s) => getSealSubType(s.name) === activeSingleSubTab.value)
  }

  const pkgList = packages.value
    .filter((p) => {
      if (routeType.value === 'enterprise' && activeSceneId.value) {
        const sceneName = businessCategories.value.find((c) => c.id === activeSceneId.value)?.name
        return p._sceneName === sceneName
      }
      return true // all / single 路由全量展示
    })
    .map((p) => ({ ...p, __isPackage: true }))

  // 印章在前（按 sort 升序），套餐在后（按 sort 升序），保证视觉顺序工整
  const sealsSorted = [...list].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
  const packagesSorted = [...pkgList].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
  return [...sealsSorted, ...packagesSorted]
})

function sceneItemCount(sceneId: string): number {
  const sceneName = businessCategories.value.find((c) => c.id === sceneId)?.name
  if (!sceneName) return 0
  return seals.value.filter((s) => s._sceneName === sceneName).length
    + packages.value.filter((p) => p._sceneName === sceneName).length
}

// 个人场景：子分组计数
function personalSubCount(subName: string): number {
  if (subName === '个人印章') return seals.value.filter((s) => s.name === '个人签名章').length
  return seals.value.filter((s) => s.name !== '个人签名章').length
}

// 单路由（个人 + 电子）子 Tab 计数
function singleSubCount(subName: string): number {
  if (isPersonal.value) {
    return personalSubCount(subName)
  } else if (isElectronic.value) {
    return seals.value.filter((s) => getSealSubType(s.name) === subName).length
  }
  return 0
}

async function fetchCategories() {
  // seal_scenes（8 条）→ enterprise 场景主源
  // seal_categories 中 name='个人印章'/'电子印章' 的项 → 补充 personalScene/electronicScene
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
        .map((s: any) => ({ ...s, categoryName: s.seal_categories?.name || '—', _sceneName: cat?.name || '电子印章' }))
      packages.value = []
    } else if (isPersonal.value) {
      // 个人印章：全量拉取后前端按 name 过滤
      const all: any = await getSeals()
      const list = Array.isArray(all) ? all : (all?.items || [])
      const cat = categories.value.find((c) => c.id === catId)
      seals.value = list
        .filter((s: any) => {
          const n = s.seal_categories?.name
          return n === '个人印章' || n === '电子个人签名章'
        })
        .map((s: any) => ({ ...s, categoryName: s.seal_categories?.name || '—', _sceneName: cat?.name || '个人印章' }))
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
        categoryName: s.seal_categories?.name || '—',
        _sceneName: catName,
      }))
    }
    // 其他路由使用分类 API
    const res: any = await getSealCategories(catId)
    if (!res?.seals) return []
    return res.seals.map((s: any) => ({
      ...s,
      categoryName: s.seal_categories?.name || '—',
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
      return res.packages.map((p: any) => ({ ...p, categoryName: catName, _sceneName: catName }))
    }
    // 其他路由使用分类 API
    const res: any = await getSealCategories(catId)
    if (!res?.packages) return []
    return res.packages.map((p: any) => ({ ...p, categoryName: catName, _sceneName: catName }))
  } catch {
    return []
  }
}

function showDialog(type: string, row?: any) {
  isEdit.value = type === 'edit'
  if (row) {
    // 编辑：回显当前所属场景 + 个人子分类，允许改所属场景
    let ctxSceneId = ''
    if (isPersonal.value) ctxSceneId = personalScene.value?.id || ''
    else if (isElectronic.value) ctxSceneId = electronicScene.value?.id || ''
    else ctxSceneId = activeSceneId.value || ''
    Object.assign(form, { ...row, sceneId: ctxSceneId, sealCategoryId: row.seal_categories?.id || '' })
    getRegionPricesRows()
  } else {
    // 新增：预选当前所属场景（企业=当前 Tab；个人/电子=对应场景）
    let defaultSceneId = ''
    if (isPersonal.value) defaultSceneId = personalScene.value?.id || ''
    else if (isElectronic.value) defaultSceneId = electronicScene.value?.id || ''
    else defaultSceneId = activeSceneId.value || ''
    Object.assign(form, { name: '', sceneId: defaultSceneId, sealCategoryId: '', price: 0, region_prices: {}, description: '', sort: 0, image: '' })
    regionPricesRows.value = []
  }
  dialogVisible.value = true
}

async function saveSeal() {
  if (!form.name) { ElMessage.warning('请填写印章名称'); return }
  saving.value = true
  try {
    // 从行编辑数据还原 region_prices 对象
    const region_prices: Record<string, number> = {}
    for (const row of regionPricesRows.value) {
      if (row.city.trim()) region_prices[row.city.trim()] = row.price
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
  pkgForm.id = row.id
  pkgForm.name = row.name
  pkgForm.price = Number(row.price) || 0
  pkgForm.description = row.description || ''
  pkgForm.sort = row.sort ?? 0
  pkgForm.images = Array.isArray(row.images) ? [...row.images] : []
  pkgDialogVisible.value = true
}

async function savePkg() {
  if (!pkgForm.name) { ElMessage.warning('请填写套餐名称'); return }
  console.log('[DEBUG] savePkg images:', JSON.stringify(pkgForm.images))
  pkgSaving.value = true
  try {
    await updatePackage(pkgForm.id, {
      name: pkgForm.name,
      price: pkgForm.price,
      description: pkgForm.description,
      sort: pkgForm.sort,
      images: pkgForm.images,
    })
    ElMessage.success('保存成功')
    pkgDialogVisible.value = false
    await fetchSealsByCategory(defaultCategory.value)
  } finally {
    pkgSaving.value = false
  }
}

async function uploadPkg(file: File) {
  try {
    console.log('[DEBUG] uploadPkg called, file:', file?.name)
    const res: any = await (uploadImage as any)(file)
    console.log('[DEBUG] uploadPkg response:', JSON.stringify(res))
    const url = res?.url || ''
    if (!url) { ElMessage.error('上传失败：未获取到文件地址'); return }
    if (!pkgForm.images) pkgForm.images = []
    pkgForm.images.push(url)
    console.log('[DEBUG] uploadPkg images now:', JSON.stringify(pkgForm.images))
    ElMessage.success('上传成功')
  } catch (err: any) {
    console.error('[DEBUG] uploadPkg error:', err?.response?.data || err.message)
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

// 业务场景（8 大场景）：sceneType==='scene'
const businessCategories = computed(() => categories.value.filter((c) => c.sceneType === 'scene'))

// seal_categories 全量（17 条），用于查找个人 / 电子分类的 id
const sealCategories = ref<any[]>([])

// 初始化
onMounted(async () => {
  await fetchCategories()
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
  color: #999;
  font-size: 12px;
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

/* ===== 对话框遮罩：打开时背景 Tab 不高亮 ===== */
.el-dialog {
  z-index: 2000 !important;
}
</style>
