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
              <div class="card-category" :title="row.categoryName || ''">
                <el-tag v-if="row.categoryName" size="small" type="info" effect="plain">{{ row.categoryName }}</el-tag>
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
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" rows="3" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" />
        </el-form-item>
        <el-form-item label="图片">
          <el-upload
            :show-file-list="false"
            :before-upload="beforeUpload"
            :http-request="uploadSeal"
            class="seal-image-uploader"
          >
            <div v-if="form.image" class="image-preview-wrapper">
              <el-image :src="form.image" style="width: 100px; height: 100px; border-radius: 8px" />
              <div class="image-overlay">点击更换</div>
            </div>
            <el-button v-else type="primary" plain>上传图片</el-button>
          </el-upload>
        </el-form-item>
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
import { getSealCategories, getSealSceneProducts, createSeal, updateSeal, deleteSeal, uploadImage, updatePackage, deletePackage } from '@/api'
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
    if (s.category?.id && s.category?.name) map.set(s.category.id, { id: s.category.id, name: s.category.name })
  }
  if (map.size > 0) return [...map.values()]
  return [
    { id: 'b14f2347-9ea5-49ef-a056-cc104b13e4c5', name: '个人签名章' },
    { id: 'c0000001-0000-0000-0000-000000000002', name: '执业资格章' },
  ]
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
const form = reactive<any>({ name: '', sceneId: '', sealCategoryId: '', price: 0, description: '', sort: 0, image: '' })

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
    // 个人印章：按子 Tab 过滤（个人签名章 / 执业资格章）
    const subName = activePersonalSubTab.value === '个人印章' ? '个人签名章' : '执业资格章'
    list = list.filter((s) => s.categoryName === subName)
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

// 个人场景：子分组计数（个人签名章 / 执业资格章）
function personalSubCount(subName: string): number {
  return seals.value.filter((s) => s.categoryName === subName).length
}

// 单路由（个人 + 电子）子 Tab 计数
function singleSubCount(subName: string): number {
  if (isPersonal.value) {
    const catName = subName === '个人印章' ? '个人签名章' : '执业资格章'
    return seals.value.filter((s) => s.categoryName === catName).length
  } else if (isElectronic.value) {
    return seals.value.filter((s) => getSealSubType(s.name) === subName).length
  }
  return 0
}

async function fetchCategories() {
  const res: any = await getSealCategories()
  // API 直接返回数组，不是 { data: [...] }
  categories.value = Array.isArray(res) ? res : res.data || []
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
        categoryName: s.category?.name || '—',
        _sceneName: catName,
      }))
    }
    // 其他路由使用分类 API
    const res: any = await getSealCategories(catId)
    if (!res?.seals) return []
    return res.seals.map((s: any) => ({
      ...s,
      categoryName: s.category?.name || '—',
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
    Object.assign(form, { ...row, sceneId: ctxSceneId, sealCategoryId: row.category?.id || '' })
  } else {
    // 新增：预选当前所属场景（企业=当前 Tab；个人/电子=对应场景）
    let defaultSceneId = ''
    if (isPersonal.value) defaultSceneId = personalScene.value?.id || ''
    else if (isElectronic.value) defaultSceneId = electronicScene.value?.id || ''
    else defaultSceneId = activeSceneId.value || ''
    Object.assign(form, { name: '', sceneId: defaultSceneId, sealCategoryId: '', price: 0, description: '', sort: 0, image: '' })
  }
  dialogVisible.value = true
}

async function saveSeal() {
  if (!form.name) { ElMessage.warning('请填写印章名称'); return }
  saving.value = true
  try {
    if (isEdit.value) {
      // 编辑：categoryId=场景（重建关联，允许改所属场景）；sealCategoryId=个人子分类（写回 seal.categoryId）
      await updateSeal(form.id, {
        name: form.name,
        price: form.price,
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
</style>
