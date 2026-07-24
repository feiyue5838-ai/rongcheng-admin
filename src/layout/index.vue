<template>
  <el-container class="layout-container">
    <!-- 左侧导航 -->
    <el-aside width="220px" class="layout-aside">
      <div class="logo">
        <span class="logo-text">蓉城企服</span>
        <span class="logo-sub">管理后台</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        class="layout-menu"
        background-color="#1a1a2e"
        text-color="#a0a0b0"
        active-text-color="#5B6FE8"
        :router="true"
      >
        <el-menu-item index="/dashboard">
          <el-icon><DataAnalysis /></el-icon>
          <span>工作台</span>
        </el-menu-item>

        <el-sub-menu index="storeMgmt">
          <template #title><el-icon><Shop /></el-icon><span>网点管理</span></template>
          <el-menu-item index="/outlets/overview">全网点总览</el-menu-item>
          <el-menu-item index="/outlets">网点列表</el-menu-item>
          <el-menu-item index="/outlets/dashboard">网点看板</el-menu-item>
          <el-menu-item index="/outlets/assign">订单分配</el-menu-item>
          <el-menu-item index="/outlets/receipts">交付回执</el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="orders">
          <template #title><el-icon><Document /></el-icon><span>订单管理</span></template>
          <el-menu-item index="/orders/seal">刻章订单</el-menu-item>
          <el-menu-item index="/orders/newspaper">登报订单</el-menu-item>
          <el-menu-item index="/orders/bookkeeping">代理记账订单</el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="afterSales">
          <template #title><el-icon><Warning /></el-icon><span>售后管理</span></template>
          <el-menu-item index="/after-sales/orders">售后订单</el-menu-item>
          <el-menu-item index="/after-sales/refund-records">退款记录</el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="products">
          <template #title><el-icon><Goods /></el-icon><span>产品管理</span></template>
          <el-sub-menu index="sealMgmt">
            <template #title><span>印章管理</span></template>
            <el-menu-item index="/products/seals/enterprise">企业刻章</el-menu-item>
            <el-menu-item index="/products/seals/personal">个人印章</el-menu-item>
            <el-menu-item index="/products/seals/electronic">电子印章</el-menu-item>
            <el-menu-item index="/products/record-queries">刻章备案查询</el-menu-item>

          </el-sub-menu>
          <el-sub-menu index="newspaperMgmt">
            <template #title><span>登报管理</span></template>
            <el-menu-item index="/products/newspapers">报纸仓库</el-menu-item>
            <el-menu-item index="/products/newspaper-templates">公告模板</el-menu-item>
          </el-sub-menu>
          <el-sub-menu index="bookkeepingMgmt">
            <template #title><span>代理记账管理</span></template>
            <el-menu-item index="/products/bookkeeping-packages">套餐配置</el-menu-item>
          </el-sub-menu>
        </el-sub-menu>

        <el-menu-item index="/users">
          <el-icon><User /></el-icon>
          <span>用户管理</span>
        </el-menu-item>

        <el-menu-item index="/reviews">
          <el-icon><ChatDotRound /></el-icon>
          <span>评价管理</span>
        </el-menu-item>

        <el-menu-item index="/questions">
          <el-icon><ChatLineRound /></el-icon>
          <span>问答管理</span>
        </el-menu-item>

        <el-sub-menu index="system">
          <template #title><el-icon><Setting /></el-icon><span>系统管理</span></template>
          <el-menu-item index="/system/admins">管理员</el-menu-item>
          <el-menu-item index="/system/logs">操作日志</el-menu-item>
          <el-menu-item index="/system/configs">系统配置</el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>

    <el-container>
      <!-- 顶部导航 -->
      <el-header class="layout-header">
        <div class="header-left">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/dashboard' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item>{{ currentRoute }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <el-dropdown @command="handleCommand">
            <span class="admin-info">
              <el-avatar :size="32" style="background: #5B6FE8">
                {{ authStore.adminInfo?.nickname?.[0] || 'A' }}
              </el-avatar>
              <span class="admin-name">{{ authStore.adminInfo?.nickname || '管理员' }}</span>
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人设置</el-dropdown-item>
                <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 主内容 -->
      <el-main class="layout-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const activeMenu = computed(() => route.path)
const currentRoute = computed(() => route.meta.title as string || '')

function handleCommand(command: string) {
  if (command === 'logout') {
    authStore.logoutAction()
  } else if (command === 'profile') {
    router.push('/system/admins')
  }
}
</script>

<style lang="scss" scoped>
.layout-container {
  height: 100vh;
}

.layout-aside {
  background: #1a1a2e;
  .logo {
    height: 60px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-bottom: 1px solid #2a2a4e;
    .logo-text {
      font-size: 18px;
      font-weight: 700;
      color: #fff;
    }
    .logo-sub {
      font-size: 11px;
      color: #666;
      margin-top: 2px;
    }
  }
  .layout-menu {
    border-right: none;
    :deep(.el-menu-item), :deep(.el-sub-menu__title) {
      height: 48px;
      line-height: 48px;
      font-size: 14px;
      &.is-active {
        background: rgba(91, 111, 232, 0.15) !important;
      }
    }
  }
}

.layout-header {
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  box-shadow: 0 1px 4px rgba(0,0,0,.08);
  .header-right {
    .admin-info {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      padding: 8px;
      border-radius: 8px;
      transition: background 0.2s;
      &:hover { background: #f5f5f5; }
      .admin-name {
        font-size: 14px;
        color: #333;
      }
    }
  }
}

.layout-main {
  background: #f0f2f5;
  padding: 24px;
}
</style>
