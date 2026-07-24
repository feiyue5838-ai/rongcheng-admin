import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { outletLogin } from '@/api'
import router from '@/router'

export const useOutletStore = defineStore('Outlet', () => {
  const token = ref(localStorage.getItem('outlet_token') || '')
  const outletInfo = ref<any>(JSON.parse(localStorage.getItem('outlet_info') || 'null'))
  const allOrders = ref<any[]>([])

  const isLoggedIn = computed(() => !!token.value)

  async function loginAction(phone: string, password: string) {
    const res: any = await outletLogin(phone, password)
    const data = res.data ?? res
    token.value = data.token
    outletInfo.value = data.Outlet
    localStorage.setItem('outlet_token', data.token)
    localStorage.setItem('outlet_info', JSON.stringify(data.Outlet))
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
