<template>
  <div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <el-select
        v-model="selProvinces"
        multiple
        collapse-tags
        collapse-tags-tooltip
        filterable
        clearable
        placeholder="选省/直辖市/自治区"
        style="width:220px"
      >
        <el-option v-for="p in provinces" :key="p" :label="p" :value="p" />
      </el-select>
      <el-select
        v-model="selCities"
        multiple
        collapse-tags
        collapse-tags-tooltip
        filterable
        clearable
        placeholder="选市（先选省可过滤）"
        style="width:220px"
      >
        <el-option v-for="c in cityOptions" :key="c" :label="c" :value="c" />
      </el-select>
      <el-select
        v-model="selDistricts"
        multiple
        collapse-tags
        collapse-tags-tooltip
        filterable
        clearable
        placeholder="选区/县（先选市）"
        style="width:220px"
      >
        <el-option v-for="d in districtOptions" :key="d" :label="d" :value="d" />
      </el-select>
      <el-button type="primary" plain @click="addSelected">加入</el-button>
    </div>
    <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">
      <el-tag
        v-for="name in modelValue"
        :key="name"
        closable
        @close="removeOne(name)"
      >
        {{ name }}
      </el-tag>
      <span v-if="!modelValue.length" style="color:#909399;font-size:12px">未配置 = 该材料不按地区要求（空数组）</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { provinces, provinceToCities, cityToDistricts } from '@/utils/regions'

const props = defineProps<{ modelValue: string[] }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: string[]): void }>()

const selProvinces = ref<string[]>([])
const selCities = ref<string[]>([])
const selDistricts = ref<string[]>([])

// 选了省则市下拉只显示这些省的市；没选省显示全部市（可搜索）
const cityOptions = computed(() => {
  const ps = selProvinces.value.length ? selProvinces.value : provinces
  const set = new Set<string>()
  ps.forEach(p => (provinceToCities[p] || []).forEach(c => set.add(c)))
  return [...set]
})

// 选了市则区县下拉只显示这些市的区县；没选市为空（区县上千，不全量展示）
const districtOptions = computed(() => {
  const set = new Set<string>()
  selCities.value.forEach(c => (cityToDistricts[c] || []).forEach(d => set.add(d)))
  return [...set]
})

function addSelected() {
  const merged = [...props.modelValue]
  for (const n of [...selProvinces.value, ...selCities.value, ...selDistricts.value]) {
    if (!merged.includes(n)) merged.push(n)
  }
  emit('update:modelValue', merged)
  selProvinces.value = []
  selCities.value = []
  selDistricts.value = []
}

function removeOne(name: string) {
  emit('update:modelValue', props.modelValue.filter(x => x !== name))
}
</script>
