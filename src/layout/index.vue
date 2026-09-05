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
        <el-menu-item v-if="canAccess('/dashboard')" index="/dashboard">
          <el-icon><DataAnalysis /></el-icon>
          <span>工作台</span>
        </el-menu-item>

        <!-- 网点管理 sub-menu: 子项任一有权限则显示父菜单 -->
        <el-sub-menu v-if="showStoreMgmt" index="storeMgmt">
          <template #title><el-icon><Shop /></el-icon><span>网点管理</span></template>
          <el-menu-item v-if="canAccess('/outlets/overview')" index="/outlets/overview">全网点总览</el-menu-item>
          <el-menu-item v-if="canAccess('/outlets')" index="/outlets">履约供应商列表</el-menu-item>
          <el-menu-item v-if="canAccess('/outlets/dashboard')" index="/outlets/dashboard">网点看板</el-menu-item>
        </el-sub-menu>

        <!-- 财务中心 sub-menu -->
        <el-sub-menu v-if="showFinance" index="finance">
          <template #title><el-icon><Money /></el-icon><span>财务中心</span></template>
          <el-menu-item v-if="canAccess('/finance')" index="/finance">财务总览</el-menu-item>
          <el-menu-item v-if="canAccess('/finance')" index="/finance?tab=transaction">交易流水</el-menu-item>
          <el-menu-item v-if="canAccess('/v2/settlements')" index="/v2/settlements">结算管理(V2.0)</el-menu-item>
          <el-menu-item v-if="canAccess('/v2/settlement-rules')" index="/v2/settlement-rules">结算规则(差价)</el-menu-item>
        </el-sub-menu>

        <!-- 订单管理 sub-menu -->
        <el-sub-menu v-if="showOrders" index="orders">
          <template #title><el-icon><Document /></el-icon><span>订单管理</span></template>
          <el-menu-item v-if="canAccess('/v2/orders')" index="/v2/orders">供应链订单</el-menu-item>
          <el-menu-item v-if="canAccess('/v2/orders/unassigned')" index="/v2/orders/unassigned">待派单池</el-menu-item>
          <el-menu-item v-if="canAccess('/v2/refunds')" index="/v2/refunds">退款管理</el-menu-item>
          <el-menu-item v-if="canAccess('/v2/invoices')" index="/v2/invoices">开票管理</el-menu-item>
        </el-sub-menu>

        <!-- 产品管理 sub-menu -->
        <el-sub-menu v-if="showProducts" index="products">
          <template #title><el-icon><Goods /></el-icon><span>产品管理</span></template>
          <el-sub-menu v-if="showSealMgmt" index="sealMgmt">
            <template #title><span>印章管理</span></template>
            <el-menu-item v-if="canAccess('/products/seals/enterprise')" index="/products/seals/enterprise">企业刻章</el-menu-item>
            <el-menu-item v-if="canAccess('/products/seals/personal')" index="/products/seals/personal">个人印章</el-menu-item>
            <el-menu-item v-if="canAccess('/products/seals/electronic')" index="/products/seals/electronic">电子印章</el-menu-item>

            <el-menu-item v-if="canAccess('/products/record-queries')" index="/products/record-queries">刻章备案查询</el-menu-item>
          </el-sub-menu>
          <el-sub-menu v-if="showNewspaperMgmt" index="newspaperMgmt">
            <template #title><span>登报管理</span></template>
            <el-menu-item v-if="canAccess('/products/newspapers')" index="/products/newspapers">报纸仓库</el-menu-item>
            <el-menu-item v-if="canAccess('/products/newspaper-templates')" index="/products/newspaper-templates">公告模板</el-menu-item>
          </el-sub-menu>
          <el-sub-menu v-if="showBookkeepingMgmt" index="bookkeepingMgmt">
            <template #title><span>代理记账管理</span></template>
            <el-menu-item v-if="canAccess('/products/bookkeeping-packages')" index="/products/bookkeeping-packages">套餐配置</el-menu-item>
          </el-sub-menu>
        </el-sub-menu>

        <!-- 用户管理 sub-menu -->
        <el-sub-menu v-if="showUserMgmt" index="userMgmt">
          <template #title><el-icon><User /></el-icon><span>用户管理</span></template>
          <el-menu-item v-if="canAccess('/users')" index="/users">用户列表</el-menu-item>
          <el-menu-item v-if="canAccess('/reviews')" index="/reviews">评价管理</el-menu-item>
          <el-menu-item v-if="canAccess('/points')" index="/points">积分兑奖</el-menu-item>
          <el-menu-item v-if="canAccess('/questions')" index="/questions">问答管理</el-menu-item>
        </el-sub-menu>

        <!-- 内容运营 sub-menu -->
        <el-sub-menu v-if="showContentOps" index="contentOps">
          <template #title><el-icon><Goods /></el-icon><span>内容运营</span></template>
          <el-menu-item v-if="canAccess('/faq')" index="/faq">帮助中心</el-menu-item>
          <el-menu-item v-if="canAccess('/content')" index="/content">内容管理</el-menu-item>
        </el-sub-menu>

        <!-- 系统管理 sub-menu: 仅 superadmin -->
        <el-sub-menu v-if="showSystem" index="system">
          <template #title><el-icon><Setting /></el-icon><span>系统管理</span></template>
          <el-menu-item v-if="canAccess('/system/admins')" index="/system/admins">管理员</el-menu-item>
          <el-menu-item v-if="canAccess('/system/logs')" index="/system/logs">操作日志</el-menu-item>
          <el-menu-item v-if="canAccess('/system/configs')" index="/system/configs">系统配置</el-menu-item>
          <el-menu-item v-if="canAccess('/system/dispatch-rules')" index="/system/dispatch-rules">派单规则</el-menu-item>
          <el-menu-item v-if="canAccess('/system/menu-roles')" index="/system/menu-roles">菜单权限</el-menu-item>
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
import { Money, Wallet } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const activeMenu = computed(() =>
  route.path === '/finance' && route.query.tab === 'transaction'
    ? '/finance?tab=transaction'
    : route.path,
)
const currentRoute = computed(() => {
  const titles: Record<string, string> = { settlement: '结算管理', transaction: '交易流水', refund: '退款管理' }
  return (route.query.tab && titles[route.query.tab as string]) || (route.meta.title as string) || ''
})

// 权限判断
const canAccess = (path: string) => authStore.canAccess(path)

// 各子菜单是否显示（任一子项有权限则父菜单显示）
const showStoreMgmt = computed(() =>
  canAccess('/outlets/overview') || canAccess('/outlets') || canAccess('/outlets/dashboard') ||
  canAccess('/outlets/assign'),
)
const showFinance = computed(() =>
  canAccess('/finance') || canAccess('/v2/settlements'),
)
const showOrders = computed(() =>
  canAccess('/v2/orders') || canAccess('/v2/orders/unassigned') || canAccess('/v2/refunds') || canAccess('/v2/invoices'),
)
const showProducts = computed(() =>
  canAccess('/products/seals/enterprise') || canAccess('/products/scenes') ||
  canAccess('/products/packages') ||
  canAccess('/products/newspapers') || canAccess('/products/bookkeeping-packages'),
)
const showSealMgmt = computed(() =>
  canAccess('/products/seals/enterprise') || canAccess('/products/seals/personal') ||
  canAccess('/products/seals/electronic') || canAccess('/products/packages') ||
  canAccess('/products/scenes') || canAccess('/products/record-queries'),
)
const showNewspaperMgmt = computed(() =>
  canAccess('/products/newspapers') || canAccess('/products/newspaper-templates'),
)
const showBookkeepingMgmt = computed(() =>
  canAccess('/products/bookkeeping-packages'),
)
const showUserMgmt = computed(() =>
  canAccess('/users') || canAccess('/reviews') || canAccess('/questions') || canAccess('/points'),
)
const showContentOps = computed(() =>
  canAccess('/faq') || canAccess('/content'),
)
const showSystem = computed(() =>
  canAccess('/system/admins') || canAccess('/system/logs') ||
  canAccess('/system/configs') || canAccess('/system/dispatch-rules') ||
  canAccess('/system/menu-roles'),
)

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
