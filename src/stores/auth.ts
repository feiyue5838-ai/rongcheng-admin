import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login, getMenuRoleConfigs } from '@/api'
import type { AdminLoginResult, AdminSession } from '@/api/types'
import { toArray, unwrapV1 } from '@/api/unwrap'
import router from '@/router'
import { ROLE_LABELS, hasAccess, hasActionAccess, setMenuConfigs, type MenuRoleItem } from '@/constants/roles'
import { readStoredJson } from '@/utils/storage'

/** 安全解析 localStorage 中的 admin_info，损坏/被篡改时回退 null，避免整站白屏 */
function safeParseAdminInfo(): AdminSession | null {
  return readStoredJson<AdminSession>(localStorage, 'admin_info')
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('admin_token') || '')
  // 从 localStorage 恢复 adminInfo，确保刷新后 role 不丢
  const adminInfo = ref<AdminSession | null>(safeParseAdminInfo())

  /** 当前管理员角色，如 superadmin / order_admin 等 */
  const role = computed(() => adminInfo.value?.role || 'guest')

  /** 角色展示名 */
  const roleLabel = computed(() => ROLE_LABELS[role.value] || role.value)

  const isLoggedIn = computed(() => !!token.value)

  // 保留一份响应式权限配置，使菜单相关 computed 能在配置刷新后立即重算。
  const menuConfigs = ref<MenuRoleItem[]>([])

  /** 检查当前角色是否有权访问指定路径 */
  function canAccess(path: string): boolean {
    // 建立 Vue 响应式依赖；实际匹配仍统一由 hasAccess 处理。
    void menuConfigs.value
    return hasAccess(role.value, path)
  }

  /** 检查导出等独立操作权限；操作权限不继承页面前缀权限。 */
  function canPerform(path: string): boolean {
    void menuConfigs.value
    return hasActionAccess(role.value, path)
  }

  async function loginAction(username: string, password: string) {
    const data = unwrapV1<AdminLoginResult>(await login(username, password))
    token.value = data.token
    adminInfo.value = data.admin
    localStorage.setItem('admin_token', data.token)
    localStorage.setItem('admin_info', JSON.stringify(data.admin))
    // 登录后立即加载菜单权限配置
    await loadMenuConfigs()
    router.push('/dashboard')
    return data
  }


  /** 从后端加载菜单权限配置并缓存 */
  async function loadMenuConfigs() {
    try {
      const configs = toArray<MenuRoleItem>(await getMenuRoleConfigs())
      setMenuConfigs(configs)
      menuConfigs.value = configs
      return configs
    } catch (e) {
      setMenuConfigs([])
      menuConfigs.value = []
      console.warn('[menu-configs] load failed, will use defaults', e)
      return null
    }
  }

  function logoutAction() {
    token.value = ''
    adminInfo.value = null
    setMenuConfigs([])
    menuConfigs.value = []
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_info')
    router.push('/login')
  }

  return { token, adminInfo, isLoggedIn, role, roleLabel, menuConfigs, loginAction, logoutAction, canAccess, canPerform, loadMenuConfigs }
})
