import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'

// 网点端 API 实例（使用 outlet_token）
const outletRequest = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

// 请求拦截：附加 outlet_token
outletRequest.interceptors.request.use((config) => {
  const token = localStorage.getItem('outlet_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截
outletRequest.interceptors.response.use(
  (response) => {
    const body = response.data
    return body && typeof body === 'object' && body.code === 0 && 'data' in body
      ? body.data
      : body
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('outlet_token')
      ElMessage.error('登录已过期，请重新登录')
      router.push('/Outlet-login')
    }
    return Promise.reject(error)
  }
)

export default outletRequest

// ==================== 网点认证 ====================
export const outletLogin = (phone: string, password: string) =>
  outletRequest.post('/auth/Outlet/login', { phone, password })

// ==================== 网点订单 ====================
// 网点端：自己的订单列表（从 JWT 中提取 storeId，无需传 storeId 参数）
export const getMyOutletOrdersAPI = (params: object) =>
  outletRequest.get('/outlets/me/orders', { params })

// 管理端：查看指定网点的订单列表
// ⚠️ 此接口需要 admin_token，不适用于网点端
// export const getStoreOrdersAPI = (storeId: string, params: object) =>
//   outletRequest.get(`/outlets/${storeId}/orders`, { params })

// ==================== 订单操作 ====================
export const acceptOrderAPI = (orderId: string) =>
  outletRequest.put(`/orders/${orderId}/accept`)

export const completeOrderAPI = (
  orderId: string,
  data: {
    expressCompany: string
    expressNo: string
    remark?: string
    receipts?: Array<{ url: string; type: string }>
    sealImages?: Array<{ url: string; remark?: string }>
  }
) => outletRequest.put(`/orders/${orderId}/deliver`, data)

export const getOrderDetailAPI = (orderId: string) =>
  outletRequest.get(`/orders/Outlet/${orderId}`)

export const getDeliveryReceiptsAPI = (params: { orderId?: string; storeId?: string }) =>
  outletRequest.get('/delivery-receipts/Outlet/list', { params })

// ==================== 网点通知 ====================
export const getMyNotificationsAPI = () =>
  outletRequest.get('/notifications/me')

export const markAllReadAPI = () =>
  outletRequest.put('/notifications/read')

export const markReadAPI = (id: string) =>
  outletRequest.put(`/notifications/${id}/read`)

// 绑定微信 openid（接收订阅消息）
export const bindOpenidAPI = (openid: string) =>
  outletRequest.put('/outlets/me/bind-openid', { openid })

// 开关订阅消息
export const toggleSubscribeAPI = (enabled: boolean) =>
  outletRequest.put('/outlets/me/subscribe-toggle', { enabled })

export const getShippingPreferencesAPI = () =>
  outletRequest.get('/outlets/me/shipping-preferences')

export const saveShippingPreferencesAPI = (data: {
  preferredCouriers: string[]; defaultCourier?: string; shippingRemark?: string
}) => outletRequest.put('/outlets/me/shipping-preferences', data)

// ==================== 文件上传 ====================
export const uploadImage = (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  return outletRequest.post('/upload/outlet-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
