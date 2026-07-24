import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login, getAdminInfo } from '@/api'
import router from '@/router'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('admin_token') || '')
  const adminInfo = ref<any>(null)

  const isLoggedIn = computed(() => !!token.value)

  async function loginAction(username: string, password: string) {
    const res: any = await login(username, password)
    const data = res.data ?? res
    token.value = data.token
    adminInfo.value = data.admin
    localStorage.setItem('admin_token', data.token)
    router.push('/dashboard')
    return res
  }

  async function fetchAdminInfo() {
    if (!token.value) return
    const res: any = await getAdminInfo()
    adminInfo.value = res.data ?? res
  }

  function logoutAction() {
    token.value = ''
    adminInfo.value = null
    localStorage.removeItem('admin_token')
    router.push('/login')
  }

  return { token, adminInfo, isLoggedIn, loginAction, fetchAdminInfo, logoutAction }
})
