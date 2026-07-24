<template>
  <div class="Outlet-layout">
    <header class="Outlet-header">
      <div class="header-left">
        <div class="Outlet-brand">
          <div class="brand-logo">蓉</div>
          <div>
            <div class="brand-title">蓉城企服</div>
            <div class="brand-sub">网点工作台</div>
          </div>
        </div>
      </div>
      <div class="header-right">
        <el-tag v-if="outletStore.outletInfo" type="success" effect="plain" class="Outlet-tag">
          <el-icon><Shop /></el-icon>
          <span>{{ outletStore.outletInfo.name }}</span>
        </el-tag>
        <el-dropdown @command="handleCommand" trigger="click">
          <span class="user-info">
            <el-avatar :size="32" style="background: #5B6FE8">
              {{ outletStore.outletInfo?.contact?.[0] || 'S' }}
            </el-avatar>
            <span class="user-name">{{ outletStore.outletInfo?.contact || '网点' }}</span>
            <el-icon><ArrowDown /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item disabled>网点ID: {{ outletStore.outletInfo?.id?.slice(0, 8) || '-' }}</el-dropdown-item>
              <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </header>
    <main class="Outlet-main">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useOutletStore } from '@/stores/outlet'
import { ElMessage } from 'element-plus'
import { Shop, ArrowDown } from '@element-plus/icons-vue'

const router = useRouter()
const outletStore = useOutletStore()

function handleCommand(command) {
  if (command === 'logout') {
    ElMessage.success('已退出登录')
    outletStore.logoutAction()
  }
}
</script>

<style lang="scss" scoped>
.Outlet-layout {
  min-height: 100vh;
  background: #f0f2f5;
  display: flex;
  flex-direction: column;
}

.Outlet-header {
  background: #fff;
  height: 60px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-left {
  .Outlet-brand {
    display: flex;
    align-items: center;
    gap: 12px;

    .brand-logo {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: linear-gradient(135deg, #5B6FE8 0%, #7B8FF8 100%);
      color: #fff;
      font-size: 20px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .brand-title {
      font-size: 16px;
      font-weight: 700;
      color: #333;
      line-height: 1.2;
    }

    .brand-sub {
      font-size: 12px;
      color: #999;
      line-height: 1.2;
    }
  }
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;

  .Outlet-tag {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    padding: 6px 12px;
    border-radius: 8px;
    transition: background 0.2s;

    &:hover {
      background: #f5f5f5;
    }

    .user-name {
      font-size: 14px;
      color: #333;
    }
  }
}

.Outlet-main {
  flex: 1;
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}
</style>
