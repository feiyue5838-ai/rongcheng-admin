import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { outletLogin } from '@/api'
import type { OutletFulfillmentSummary, OutletLoginResult, OutletSession } from '@/api/types'
import { unwrapV1 } from '@/api/unwrap'
import router from '@/router'
import { readStoredJson } from '@/utils/storage'

export const useOutletStore = defineStore('Outlet', () => {
  const token = ref(localStorage.getItem('outlet_token') || '')
  // 安全解析 localStorage，避免存"undefined"字符串导致 JSON.parse 报错
  const outletInfo = ref<OutletSession | null>(readStoredJson<OutletSession>(localStorage, 'outlet_info'))
  const allOrders = ref<OutletFulfillmentSummary[]>([])

  const isLoggedIn = computed(() => !!token.value)

  async function loginAction(phone: string, password: string) {
    const data = unwrapV1<OutletLoginResult>(await outletLogin(phone, password))
    // 后端实际返回 outlet（小写），兼容旧字段名 Outlet（大写）
    const _outlet = data.outlet ?? data.Outlet
    if (!_outlet) throw new Error('登录响应缺少网点信息')
    token.value = data.token
    outletInfo.value = _outlet
    localStorage.setItem('outlet_token', data.token)
    localStorage.setItem('outlet_info', JSON.stringify(_outlet))
    return data
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
