<template>
  <div class="sub-types-page">
    <div class="page-header">
      <h2>子分类管理</h2>
    </div>

    <!-- 大分类选择 + 子分类列表 -->
    <div class="main-layout">
      <!-- 左侧：主分类列表 -->
      <div class="left-panel">
        <el-card shadow="never">
          <div slot="header" class="card-header">
            <span>主分类</span>
          </div>
          <el-radio-group v-model="selectedCatId" style="width:100%" @change="onCatChange">
            <div v-for="cat in categories" :key="cat.id" class="cat-item">
              <el-radio :label="cat.id" class="cat-radio">
                <span class="cat-name">{{ cat.name }}</span>
                <span class="cat-count">{{ (cat.subTypes||[]).length }}个子分类</span>
              </el-radio>
            </div>
          </el-radio-group>
        </el-card>
      </div>

      <!-- 右侧：子分类编辑区 -->
      <div class="right-panel">
        <el-card shadow="never" v-if="selectedCat">
          <div slot="header" class="card-header">
            <span>编辑「{{ selectedCat.name }}」的子分类</span>
            <el-button type="primary" size="mini" @click="addSubType">+ 添加子分类</el-button>
          </div>

          <!-- 子分类表格 -->
          <el-table :data="editList" border size="small">
            <el-table-column label="排序" width="70">
              <template #default="{ $index }">
                <el-input-number
                  v-model="editList[$index].sort"
                  :min="0" :max="999"
                  size="small" controls-position="right"
                  style="width:60px"
                />
              </template>
            </el-table-column>
            <el-table-column label="Key" width="180">
              <template #default="{ $index, row }">
                <el-input v-model="row.key" size="small" placeholder="英文标识" />
              </template>
            </el-table-column>
            <el-table-column label="名称" min-width="160">
              <template #default="{ $index, row }">
                <el-input v-model="row.name" size="small" placeholder="显示名称" />
              </template>
            </el-table-column>
            <el-table-column label="颜色" width="100">
              <template #default="{ $index, row }">
                <el-color-picker v-model="row.color" size="small" />
              </template>
            </el-table-column>
            <el-table-column label="热门" width="70">
              <template #default="{ $index, row }">
                <el-checkbox v-model="row.hot" />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="80" align="center">
              <template #default="{ $index }">
                <el-button type="danger" size="small" icon="el-icon-delete" @click="removeSubType($index)" />
              </template>
            </el-table-column>
          </el-table>

          <div class="action-bar">
            <el-button type="primary" @click="saveSubTypes" :loading="saving">保存修改</el-button>
            <span class="tip">共 {{ editList.length }} 个子分类</span>
          </div>
        </el-card>

        <el-empty v-else description="请先选择一个主分类" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getNewspaperCategories, updateNewspaperCategory } from '@/api'

const categories = ref<any[]>([])
const selectedCatId = ref<string>('')
const editList = ref<any[]>([])
const saving = ref(false)

const selectedCat = computed(() => {
  return categories.value.find(c => c.id === selectedCatId.value) || null
})

async function loadCategories() {
  try {
    const res: any = await getNewspaperCategories()
    categories.value = res || []
    if (categories.value.length > 0 && !selectedCatId.value) {
      selectedCatId.value = categories.value[0].id
    }
  } catch (e: any) {
    ElMessage.error('加载分类失败: ' + (e.message || e))
  }
}

function syncEditList() {
  const subs = selectedCat.value ? (selectedCat.value.subTypes || []) : []
  editList.value = subs.map((s: any) => ({ ...s }))
}

function onCatChange() {
  syncEditList()
}

function addSubType() {
  editList.value.push({
    key: 'new_' + Date.now(),
    name: '新子分类',
    color: '#5B6FE8',
    hot: false,
    sort: editList.value.length,
  })
}

function removeSubType(index: number) {
  editList.value.splice(index, 1)
}

async function saveSubTypes() {
  // 验证 key 唯一
  const keys = editList.value.map(s => s.key)
  if (new Set(keys).size !== keys.length) {
    ElMessage.warning('Key 不能重复')
    return
  }
  saving.value = true
  try {
    const body = {
      name: selectedCat.value!.name,
      sub_types: editList.value,
    }
    await updateNewspaperCategory(selectedCatId.value, body)
    await loadCategories()
    syncEditList()
    ElMessage.success('保存成功')
  } catch (e: any) {
    ElMessage.error('保存失败: ' + (e.message || e))
  } finally {
    saving.value = false
  }
}

watch(selectedCatId, (val) => {
  if (val) syncEditList()
})

onMounted(() => {
  loadCategories()
})
</script>

<style scoped>
.sub-types-page { padding: 20px; }
.page-header { margin-bottom: 20px; }
.page-header h2 { margin: 0; font-size: 18px; font-weight: 600; }

.main-layout { display: flex; gap: 20px; align-items: flex-start; }

.left-panel { width: 220px; flex-shrink: 0; }
.right-panel { flex: 1; min-width: 0; }

.card-header {
  display: flex; justify-content: space-between; align-items: center;
  font-weight: 600; font-size: 14px;
}

.cat-item {
  padding: 8px 4px;
  border-bottom: 1px solid #f0f0f0;
}
.cat-item:last-child { border-bottom: none; }
.cat-radio { width: 100%; white-space: nowrap; }
.cat-name { font-weight: 500; }
.cat-count { font-size: 12px; color: #999; margin-left: 8px; }

.action-bar {
  margin-top: 16px; display: flex; align-items: center; gap: 12px;
}
.tip { font-size: 12px; color: #999; }
</style>