<template>
  <div class="scene-card" @click="$emit('click')">
    <div class="card-icon">
      <el-icon :size="28" color="#409eff"><Box /></el-icon>
    </div>
    <div class="card-info">
      <div class="card-title">{{ title }}</div>
      <div class="card-stats">
        <el-tag size="small" type="info">{{ count }} 枚</el-tag>
        <el-tag v-if="pkgCount" size="small" type="success" style="margin-left: 4px">{{ pkgCount }} 套餐</el-tag>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Box } from '@element-plus/icons-vue'

defineProps<{
  title: string
  count: number
  pkgCount?: number
}>()

defineEmits<{
  (e: 'click'): void
}>()
</script>

<style scoped>
.scene-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}
.scene-card:hover {
  border-color: #409eff;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.12);
  transform: translateY(-2px);
}
.card-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background: #ecf5ff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.card-info {
  flex: 1;
  min-width: 0;
}
.card-title {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.card-stats {
  display: flex;
  align-items: center;
}
</style>
