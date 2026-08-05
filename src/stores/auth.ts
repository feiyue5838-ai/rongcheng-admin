import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login, getAdminInfo, getMenuRoleConfigs } from '@/api'
import router from '@/router'
import { ADMIN_ROLES, ROLE_LABELS, hasAccess, setMenuConfigs, type MenuRoleItem } from '@/constants/roles'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('admin_token') || '')
  const adminInfo = ref<any>(null)

  /** 当前管理员角色，如 superadmin / order_admin 等 */
  const role = computed(() => adminInfo.value?.role || 'guest')

  /** 角色展示名 */
  const roleLabel = computed(() => ROLE_LABELS[role.value] || role.value)

  const isLoggedIn = computed(() => !!token.value)

  /** 检查当前角色是否有权访问指定路径 */
  function canAccess(path: string): boolean {
    return hasAccess(role.value, path)
  }

  async function loginAction(username: string, password: string) {
    const res: any = await login(username, password)
    const data = res.data ?? res
    token.value = data.token
    adminInfo.value = data.admin
    localStorage.setItem('admin_token', data.token)
    // 登录后立即加载菜单权限配置
    await loadMenuConfigs()
    router.push('/dashboard')
    return res
  }

  async function fetchAdminInfo() {
    if (!token.value) return
    const res: any = await getAdminInfo()
    adminInfo.value = res.data ?? res
  }

  /** 从后端加载菜单权限配置并缓存 */
  async function loadMenuConfigs() {
    try {
      const res: any = await getMenuRoleConfigs()
      const configs: MenuRoleItem[] = res.data ?? res
      setMenuConfigs(configs)
    } catch (e) {
      console.warn('[menu-configs] load failed, will use defaults', e)
    }
  }

  function logoutAction() {
    token.value = ''
    adminInfo.value = null
    localStorage.removeItem('admin_token')
    router.push('/login')
  }

  return { token, adminInfo, isLoggedIn, role, roleLabel, loginAction, fetchAdminInfo, logoutAction, canAccess, loadMenuConfigs }
})
