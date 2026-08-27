import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { ElLoading } from 'element-plus'
import 'element-plus/theme-chalk/el-loading.css'
import 'element-plus/theme-chalk/el-message.css'
import 'element-plus/theme-chalk/el-message-box.css'
import 'element-plus/theme-chalk/el-notification.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import router from './router'
import App from './App.vue'
import './styles/common.scss'
import { useAuthStore } from './stores/auth'

const app = createApp(App)
const pinia = createPinia()

// 注册所有 Element Plus 图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(pinia)

async function bootstrap() {
  const authStore = useAuthStore(pinia)

  // 刷新页面时先恢复数据库菜单权限，避免首次路由鉴权退回硬编码默认值。
  if (authStore.token) {
    await authStore.loadMenuConfigs()
  }

  app.use(router)
  app.directive('loading', ElLoading.directive)
  app.mount('#app')
}

bootstrap()
