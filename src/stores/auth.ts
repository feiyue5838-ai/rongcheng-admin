import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login, getMenuRoleConfigs } from '@/api'
import router from '@/router'
import { ADMIN_ROLES, ROLE_LABELS, hasAccess, setMenuConfigs, type MenuRoleItem } from '@/constants/roles'

/** 安全解析 localStorage 中的 admin_info，损坏/被篡改时回退 null，避免整站白屏 */
function safeParseAdminInfo(): any {
  const raw = localStorage.getItem('admin_info')
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('admin_token') || '')
  // 从 localStorage 恢复 adminInfo，确保刷新后 role 不丢
  const adminInfo = ref<any>(safeParseAdminInfo())

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

  async function loginAction(username: string, password: string) {
    const res: any = await login(username, password)
    const data = res.data ?? res
    token.value = data.token
    adminInfo.value = data.admin
    localStorage.setItem('admin_token', data.token)
    localStorage.setItem('admin_info', JSON.stringify(data.admin))
    // 登录后立即加载菜单权限配置
    await loadMenuConfigs()
    router.push('/dashboard')
    return res
  }


  /** 从后端加载菜单权限配置并缓存 */
  async function loadMenuConfigs() {
    try {
      const res: any = await getMenuRoleConfigs()
      const configs: MenuRoleItem[] = res.data ?? res
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

  return { token, adminInfo, isLoggedIn, role, roleLabel, menuConfigs, loginAction, logoutAction, canAccess, loadMenuConfigs }
})
