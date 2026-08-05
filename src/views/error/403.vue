<template>
  <div class="error-container">
    <div class="error-content">
      <div class="error-icon">
        <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
          <circle cx="60" cy="60" r="56" stroke="#f5222d" stroke-width="4" stroke-dasharray="8 4" opacity="0.3"/>
          <text x="60" y="72" text-anchor="middle" font-size="36" font-weight="bold" fill="#f5222d">403</text>
        </svg>
      </div>
      <h1 class="error-title">无权访问</h1>
      <p class="error-desc">您当前的账号角色无权访问该页面</p>
      <p class="error-role">当前角色：{{ roleLabel }}</p>
      <div class="error-actions">
        <el-button type="primary" @click="goBack">返回上一页</el-button>
        <el-button @click="goHome">返回工作台</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const roleLabel = computed(() => authStore.roleLabel)

function goBack() {
  router.back()
}

function goHome() {
  router.push('/dashboard')
}
</script>

<style lang="scss" scoped>
.error-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #f5f5f5;
}
.error-content {
  text-align: center;
  padding: 48px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  max-width: 420px;
  width: 90%;
}
.error-icon {
  margin-bottom: 24px;
  display: flex;
  justify-content: center;
}
.error-title {
  font-size: 28px;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0 0 12px;
}
.error-desc {
  font-size: 15px;
  color: #666;
  margin: 0 0 8px;
}
.error-role {
  font-size: 13px;
  color: #999;
  margin: 0 0 32px;
  background: #f5f5f5;
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
}
.error-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}
</style>
