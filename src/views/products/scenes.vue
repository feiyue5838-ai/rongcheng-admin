<template>
  <div class="scenes-page">
    <!-- 左侧场景列表 -->
    <div class="scene-list">
      <div class="list-header">
        <h3>业务场景</h3>
        <el-button type="primary" size="small" @click="showCreateScene">新增</el-button>
      </div>
      <div
        v-for="s in scenes"
        :key="s.id"
        class="scene-item"
        :class="{ active: currentSceneId === s.id }"
        @click="selectScene(s)"
      >
        <div class="scene-item-name">
          <span class="dot" :class="{ off: s.status !== 1 }"></span>
          {{ s.name }}
        </div>
        <div class="scene-item-type">{{ sceneTypeLabel(s.sceneType) }}</div>
        <div class="scene-item-meta">印章 {{ s._count?.sealSceneSeals ?? 0 }} · 套餐 {{ s._count?.sealScenePackages ?? 0 }}</div>
      </div>
    </div>

    <!-- 右侧编辑区 -->
    <div class="scene-edit" v-if="currentScene">
      <div class="edit-header">
        <h2>{{ currentScene.name }}</h2>
        <div>
          <el-button size="small" @click="showEditScene">编辑信息</el-button>
          <el-button size="small" type="danger" @click="handleDeleteScene">删除场景</el-button>
        </div>
      </div>

      <!-- 印章管理 -->
      <el-card class="block" shadow="never">
        <template #header>
          <div class="block-head">
            <span>场景印章（{{ selectedSealIds.length }}）</span>
            <el-button type="primary" size="small" @click="saveSeals" :loading="savingSeals">保存印章</el-button>
          </div>
        </template>
        <el-select v-model="selectedSealIds" multiple filterable placeholder="选择本场景包含的印章" style="width: 100%" :multiple-limit="0">
          <el-option v-for="seal in allSeals" :key="seal.id" :label="seal.name" :value="seal.id" />
        </el-select>
      </el-card>

      <!-- 套餐管理 -->
      <el-card class="block" shadow="never">
        <template #header>
          <div class="block-head">
            <span>场景套餐（{{ packageList.length }}）</span>
            <div>
              <el-button size="small" @click="showAddPackage">添加套餐</el-button>
              <el-button type="primary" size="small" @click="savePackages" :loading="savingPackages">保存套餐</el-button>
            </div>
          </div>
        </template>
        <el-table :data="packageList" stripe>
          <el-table-column prop="name" label="套餐名称" min-width="260" />
          <el-table-column label="印章" min-width="260">
            <template #default="{ row }">
              <el-tag v-for="sid in row.sealIds" :key="sid" size="small" style="margin: 2px">
                {{ sealNameMap[sid] || sid }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="price" label="价格" width="100">
            <template #default="{ row }">¥{{ row.price }}</template>
          </el-table-column>
          <el-table-column label="操作" width="80">
            <template #default="{ row, $index }">
              <el-button type="danger" link @click="packageList.splice($index, 1)">移除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <el-empty v-else description="请选择左侧场景" />

    <!-- 场景信息对话框 -->
    <el-dialog v-model="sceneDialog" :title="sceneForm.id ? '编辑场景' : '新增场景'" width="500px">
      <el-form :model="sceneForm" label-width="90px">
        <el-form-item label="场景名称" required>
          <el-input v-model="sceneForm.name" placeholder="如：个体户" />
        </el-form-item>
        <el-form-item label="业务类型" required>
          <el-select v-model="sceneForm.sceneType" style="width: 100%">
            <el-option label="企业刻章" value="enterprise" />
            <el-option label="个人印章" value="personal" />
            <el-option label="电子印章" value="electronic" />
            <el-option label="备案查询" value="record" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="sceneForm.description" type="textarea" rows="2" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="sceneForm.sort" :min="0" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="sceneForm.status" :active-value="1" :inactive-value="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="sceneDialog = false">取消</el-button>
        <el-button type="primary" @click="submitScene" :loading="savingScene">保存</el-button>
      </template>
    </el-dialog>

    <!-- 添加套餐对话框 -->
    <el-dialog v-model="pkgDialog" title="添加套餐" width="560px">
      <el-radio-group v-model="pkgMode" style="margin-bottom: 16px">
        <el-radio value="existing">选择已有套餐</el-radio>
        <el-radio value="new">新建套餐</el-radio>
      </el-radio-group>

      <template v-if="pkgMode === 'existing'">
        <el-form label-width="90px">
          <el-form-item label="选择套餐">
            <el-select v-model="existingPkgId" filterable placeholder="选择套餐" style="width: 100%">
              <el-option
                v-for="p in availableExistingPackages"
                :key="p.id"
                :label="`${p.name}（¥${p.price}）`"
                :value="p.id"
              />
            </el-select>
          </el-form-item>
        </el-form>
      </template>

      <template v-else>
        <el-form :model="newPkg" label-width="90px">
          <el-form-item label="套餐名称" required>
            <el-input v-model="newPkg.name" placeholder="如：公章+财务专用章+法人章" />
          </el-form-item>
          <el-form-item label="价格(元)" required>
            <el-input-number v-model="newPkg.price" :min="0" :precision="2" />
          </el-form-item>
          <el-form-item label="包含印章" required>
            <el-select v-model="newPkg.sealIds" multiple filterable placeholder="选择印章" style="width: 100%">
              <el-option v-for="s in allSeals" :key="s.id" :label="s.name" :value="s.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="标签">
            <el-input v-model="newPkg.badge" placeholder="如：特惠" />
          </el-form-item>
        </el-form>
      </template>

      <template #footer>
        <el-button @click="pkgDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmAddPackage">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import {
  getAdminScenes, getAdminScene, createScene, updateScene, deleteScene,
  setSceneSeals, setScenePackages, getSeals, getSealPackages,
} from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'

const scenes = ref<any[]>([])
const allSeals = ref<any[]>([])
const allPackages = ref<any[]>([])
const currentSceneId = ref('')
const currentScene = ref<any>(null)
const selectedSealIds = ref<string[]>([])
const packageList = ref<any[]>([])
let sceneRequestId = 0

const savingSeals = ref(false)
const savingPackages = ref(false)
const savingScene = ref(false)

const sealNameMap = computed(() => {
  const m: Record<string, string> = {}
  allSeals.value.forEach(s => { m[s.id] = s.name })
  return m
})

// 已选入本场景的套餐 id（用于过滤“选择已有套餐”）
const selectedPackageIds = computed(() => packageList.value.map(p => p.id).filter(Boolean))
const availableExistingPackages = computed(() =>
  allPackages.value.filter(p => !selectedPackageIds.value.includes(p.id))
)

// ============ 场景信息对话框 ============
const sceneDialog = ref(false)
const sceneForm = reactive<any>({ id: '', name: '', description: '', sceneType: 'enterprise', sort: 0, status: 1 })

function sceneTypeLabel(sceneType: string) {
  return ({ enterprise: '企业刻章', personal: '个人印章', electronic: '电子印章', record: '备案查询' } as Record<string, string>)[sceneType] || '未分类'
}

function showCreateScene() {
  Object.assign(sceneForm, { id: '', name: '', description: '', sceneType: 'enterprise', sort: 0, status: 1 })
  sceneDialog.value = true
}
function showEditScene() {
  Object.assign(sceneForm, {
    id: currentScene.value.id,
    name: currentScene.value.name,
    description: currentScene.value.description || '',
    sceneType: currentScene.value.sceneType,
    sort: currentScene.value.sort || 0,
    status: currentScene.value.status,
  })
  sceneDialog.value = true
}
async function submitScene() {
  if (!sceneForm.name) { ElMessage.warning('请填写场景名称'); return }
  savingScene.value = true
  try {
    if (sceneForm.id) {
      await updateScene(sceneForm.id, {
        name: sceneForm.name, description: sceneForm.description, sceneType: sceneForm.sceneType, sort: sceneForm.sort, status: sceneForm.status,
      })
      ElMessage.success('更新成功')
    } else {
      await createScene({
        name: sceneForm.name, description: sceneForm.description, sceneType: sceneForm.sceneType, sort: sceneForm.sort, status: sceneForm.status,
      })
      ElMessage.success('创建成功')
    }
    sceneDialog.value = false
    await loadScenes()
  } finally {
    savingScene.value = false
  }
}

// ============ 套餐对话框 ============
const pkgDialog = ref(false)
const pkgMode = ref<'existing' | 'new'>('existing')
const existingPkgId = ref('')
const newPkg = reactive<any>({ name: '', price: 0, sealIds: [], badge: '' })

function showAddPackage() {
  pkgMode.value = 'existing'
  existingPkgId.value = ''
  Object.assign(newPkg, { name: '', price: 0, sealIds: [], badge: '' })
  pkgDialog.value = true
}
function confirmAddPackage() {
  if (pkgMode.value === 'existing') {
    const p = allPackages.value.find(x => x.id === existingPkgId.value)
    if (!p) { ElMessage.warning('请选择套餐'); return }
    packageList.value.push({ id: p.id, name: p.name, price: p.price, sealIds: p.sealIds || [] })
  } else {
    if (!newPkg.name) { ElMessage.warning('请填写套餐名称'); return }
    if (newPkg.sealIds.length === 0) { ElMessage.warning('请选择包含印章'); return }
    packageList.value.push({
      name: newPkg.name, price: newPkg.price, sealIds: [...newPkg.sealIds], badge: newPkg.badge, isNew: true,
    })
  }
  pkgDialog.value = false
}

// ============ 数据加载 ============
async function loadScenes() {
  scenes.value = (await getAdminScenes()) as any
  if (scenes.value.length === 0) {
    sceneRequestId++
    currentSceneId.value = ''
    currentScene.value = null
    selectedSealIds.value = []
    packageList.value = []
    return
  }
  const selectedScene = scenes.value.find(s => s.id === currentSceneId.value) || scenes.value[0]
  await selectScene(selectedScene)
}
async function selectScene(s: any) {
  const requestId = ++sceneRequestId
  currentSceneId.value = s.id
  const detail = (await getAdminScene(s.id)) as any
  if (requestId !== sceneRequestId || currentSceneId.value !== s.id) return
  currentScene.value = detail.scene
  selectedSealIds.value = detail.seals.map((x: any) => x.id)
  packageList.value = detail.packages.map((p: any) => ({
    id: p.id, name: p.name, price: p.price, sealIds: p.sealIds || [], badge: p.badge || '',
  }))
}
async function saveSeals() {
  savingSeals.value = true
  try {
    await setSceneSeals(currentSceneId.value, selectedSealIds.value)
    ElMessage.success('印章已保存')
    await loadScenes()
  } finally {
    savingSeals.value = false
  }
}
async function savePackages() {
  savingPackages.value = true
  try {
    // 整体替换：把本地 packageList 发回后端
    const payload = packageList.value.map(p => ({
      id: p.id, name: p.name, price: p.price, seal_ids: p.sealIds, badge: p.badge, isNew: p.isNew,
    }))
    await setScenePackages(currentSceneId.value, payload)
    ElMessage.success('套餐已保存')
    await selectScene({ id: currentSceneId.value })
    await loadScenes()
  } finally {
    savingPackages.value = false
  }
}
async function handleDeleteScene() {
  await ElMessageBox.confirm(`确认删除场景「${currentScene.value.name}」？关联印章/套餐将一并清除`, '提示')
  await deleteScene(currentSceneId.value)
  ElMessage.success('删除成功')
  currentScene.value = null
  currentSceneId.value = ''
  await loadScenes()
}

onMounted(async () => {
  // Promise.allSettled：单个接口失败不阻塞场景列表加载
  const [seals, packages] = await Promise.allSettled([getSeals() as any, getSealPackages() as any])
  allSeals.value = (seals as any).status === 'fulfilled' ? (seals as any).value : []
  allPackages.value = (packages as any).status === 'fulfilled' ? (packages as any).value : []
  await loadScenes()
})
</script>

<style scoped>
.scenes-page {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}
.scene-list {
  width: 220px;
  flex-shrink: 0;
  background: #fff;
  border-radius: 8px;
  padding: 12px;
}
.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.list-header h3 { margin: 0; font-size: 15px; }
.scene-item {
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 4px;
  transition: background 0.2s;
}
.scene-item:hover { background: #f5f7fa; }
.scene-item.active { background: rgba(91, 111, 232, 0.12); }
.scene-item-name { font-size: 14px; display: flex; align-items: center; gap: 6px; }
.scene-item-meta { font-size: 12px; color: #999; margin-top: 2px; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: #67c23a; }
.dot.off { background: #c0c4cc; }

.scene-edit { flex: 1; min-width: 0; }
.edit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.edit-header h2 { margin: 0; font-size: 20px; }
.block { margin-bottom: 16px; }
.block-head { display: flex; justify-content: space-between; align-items: center; }
</style>
