<template>
  <div class="region-multi-picker">
    <div class="region-multi-picker__controls">
      <el-cascader
        v-model="selectedPaths"
        :options="regionOptions"
        :props="cascaderProps"
        collapse-tags
        collapse-tags-tooltip
        filterable
        clearable
        placeholder="选择省 / 市 / 区县（可停在任意一级）"
        style="width: 100%"
      />
      <el-button type="primary" plain @click="addSelected">加入</el-button>
    </div>
    <div class="region-multi-picker__tags">
      <el-tag
        v-for="path in modelValue"
        :key="path"
        closable
        @close="removeOne(path)"
      >
        {{ displayPath(path) }}
      </el-tag>
      <span v-if="!modelValue.length" class="region-multi-picker__empty">
        未配置 = 该材料不按地区要求（空数组）
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { provinces, provinceToCities, cityToDistricts } from '@/utils/regions'

type RegionOption = {
  value: string
  label: string
  children?: RegionOption[]
}

const props = defineProps<{ modelValue: string[] }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: string[]): void }>()

const selectedPaths = ref<string[][]>([])
const cascaderProps = {
  multiple: true,
  checkStrictly: true,
  emitPath: true,
}

const regionOptions = computed<RegionOption[]>(() => provinces.map(province => ({
  value: province,
  label: province,
  children: (provinceToCities[province] || []).map(city => {
    const districts = cityToDistricts[city] || []
    return {
      value: city,
      label: city,
      ...(districts.length
        ? {
            children: districts.map(district => ({
              value: district,
              label: district,
            })),
          }
        : {}),
    }
  }),
})))

function normalizeRegionPart(value: string): string {
  return String(value || '')
    .trim()
    .replace(/(特别行政区|自治区|自治州|省|市|区|县)$/g, '')
}

function semanticKey(value: string): string {
  return String(value || '')
    .split('/')
    .map(normalizeRegionPart)
    .filter(Boolean)
    .join('/')
}

function addSelected() {
  const merged = [...props.modelValue]
  const existingKeys = new Set(merged.map(semanticKey))
  for (const path of selectedPaths.value) {
    const value = path.map(part => String(part).trim()).filter(Boolean).join('/')
    const key = semanticKey(value)
    if (value && key && !existingKeys.has(key)) {
      merged.push(value)
      existingKeys.add(key)
    }
  }
  emit('update:modelValue', merged)
  selectedPaths.value = []
}

function removeOne(path: string) {
  emit('update:modelValue', props.modelValue.filter(value => value !== path))
}

function displayPath(path: string): string {
  return path.split('/').join(' / ')
}
</script>

<style scoped>
.region-multi-picker {
  width: 100%;
}

.region-multi-picker__controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  width: 100%;
}

.region-multi-picker__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.region-multi-picker__empty {
  color: #909399;
  font-size: 12px;
}
</style>
