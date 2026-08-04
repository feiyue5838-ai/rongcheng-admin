import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { outletLogin } from '@/api'
import router from '@/router'

export const useOutletStore = defineStore('Outlet', () => {
  const token = ref(localStorage.getItem('outlet_token') || '')
  // 安全解析 localStorage，避免存"undefined"字符串导致 JSON.parse 报错
  const _infoRaw = localStorage.getItem('outlet_info')
  const outletInfo = ref<any>(_infoRaw && _infoRaw !== 'undefined' ? JSON.parse(_infoRaw) : null)
  const allOrders = ref<any[]>([])

  const isLoggedIn = computed(() => !!token.value)

  async function loginAction(phone: string, password: string) {
    const res: any = await outletLogin(phone, password)
    const data = res.data ?? res
    // 后端实际返回 outlet（小写），兼容旧字段名 Outlet（大写）
    const _outlet = data.outlet || data.Outlet
    token.value = data.token
    outletInfo.value = _outlet
    localStorage.setItem('outlet_token', data.token)
    localStorage.setItem('outlet_info', JSON.stringify(_outlet))
    return res
  }

  function logoutAction() {
    token.value = ''
    outletInfo.value = null
    allOrders.value = []
    localStorage.removeItem('outlet_token')
    localStorage.removeItem('outlet_info')
    router.push('/Outlet-login')
  }

  return { token, outletInfo, allOrders, isLoggedIn, loginAction, logoutAction }
})
