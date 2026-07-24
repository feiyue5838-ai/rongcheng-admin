import axios from 'axios'
import { ElMessage } from 'element-plus'

const request = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

// 请求拦截器：附加 Token
request.interceptors.request.use((config) => {
  // 真正的网点端专属接口才用 outlet_token
  // 注意：管理端的 /delivery-receipts（AdminJwtAuthGuard）也用 admin_token
  // 网点端用的是 /delivery-receipts/Outlet/list
  const isOutletEndpoint =
    config.url?.startsWith('/auth/outlet/') ||
    config.url?.startsWith('/delivery-receipts/Outlet/') ||
    config.url === '/delivery-receipts/Outlet/list'
  if (isOutletEndpoint) {
    const outletToken = localStorage.getItem('outlet_token')
    if (outletToken) config.headers.Authorization = `Bearer ${outletToken}`
  } else {
    // 其他全部走管理端 admin_token（含 /outlets/ 系列、/delivery-receipts 列表）
    const adminToken = localStorage.getItem('admin_token')
    if (adminToken) config.headers.Authorization = `Bearer ${adminToken}`
  }
  return config
})

// 响应拦截器
request.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // 网点端专属接口 → 跳网点登录；其余（管理端接口）→ 跳管理登录
      const url = error.config?.url || ''
      const isOutletEndpoint =
        url.startsWith('/auth/outlet/') ||
        url.startsWith('/delivery-receipts/Outlet/') ||
        url === '/delivery-receipts/Outlet/list'
      if (isOutletEndpoint) {
        localStorage.removeItem('outlet_token')
        window.location.href = '/Outlet-login'
        ElMessage.error('网点登录已过期，请重新登录')
      } else {
        localStorage.removeItem('admin_token')
        window.location.href = '/login'
        ElMessage.error('登录已过期，请重新登录')
      }
    } else {
      ElMessage.error(error.response?.data?.message || '请求失败')
    }
    return Promise.reject(error)
  }
)

export default request

// ==================== 认证接口 ====================
export const login = (username: string, password: string) =>
  request.post('/auth/admin/login', { username, password })

export const getAdminInfo = () => request.get('/admin/profile')

// ==================== 订单接口 ====================
export const getSealOrders = (params: any) => request.get('/orders/admin/list', { params: { ...params, module: 'seal' } })
export const getNewspaperOrders = (params: any) => request.get('/orders/admin/list', { params: { ...params, module: 'newspaper' } })
export const getBookkeepingOrders = (params: any) => request.get('/orders/admin/list', { params: { ...params, module: 'bookkeeping' } })
export const getOrderDetail = (id: string) => request.get(`/orders/admin/detail/${id}`)
export const updateOrder = (id: string, data: any) => request.put(`/orders/admin/${id}`, data)
export const refundOrder = (id: string, data: any) => request.post(`/orders/${id}/refund`, data)
export const auditMaterial = (id: string, data: { status: number; remark?: string }) =>
  request.put(`/orders/admin/materials/${id}/audit`, data)
export const getOrderStatistics = () => request.get('/orders/admin/statistics')

// ==================== 产品接口 ====================
// 无参数：返回4分类列表；传 id：返回该分类详情（含印章+套餐）
export const getSealCategories = (id?: string) => id ? request.get(`/seals/categories/${id}`) : request.get('/seals/categories')
// 用户端：获取场景下的印章和套餐
export const getSealSceneProducts = (sceneId: string) => request.get(`/seals/scenes/${sceneId}`)
export const getSeals = (params?: any) => request.get('/seals', { params })
export const getSealPackages = () => request.get('/seals/packages')
export const createSeal = (data: any) => request.post('/seals', data)
export const updateSeal = (id: string, data: any) => request.put(`/seals/${id}`, data)
export const deleteSeal = (id: string) => request.delete(`/seals/${id}`)

// ==================== 场景管理（管理端） ====================
export const getAdminScenes = () => request.get('/seals/admin/scenes')
export const getAdminScene = (id: string) => request.get(`/seals/admin/scenes/${id}`)
export const createScene = (data: any) => request.post('/seals/admin/scenes', data)
export const updateScene = (id: string, data: any) => request.put(`/seals/admin/scenes/${id}`, data)
export const deleteScene = (id: string) => request.delete(`/seals/admin/scenes/${id}`)
export const setSceneSeals = (id: string, sealIds: string[]) => request.put(`/seals/admin/scenes/${id}/seals`, { sealIds })
export const setScenePackages = (id: string, packages: any[]) => request.put(`/seals/admin/scenes/${id}/packages`, { packages })

// ==================== 刻章备案查询 ====================
export const getRecordQueries = () => request.get('/seals/admin/record-queries')
export const createRecordQuery = (data: any) => request.post('/seals/admin/record-queries', data)
export const updateRecordQuery = (id: string, data: any) => request.put(`/seals/admin/record-queries/${id}`, data)
export const deleteRecordQuery = (id: string) => request.delete(`/seals/admin/record-queries/${id}`)

export const createPackage = (data: any) => request.post('/seals/packages', data)
export const updatePackage = (id: string, data: any) => request.put(`/seals/packages/${id}`, data)
export const deletePackage = (id: string) => request.delete(`/seals/packages/${id}`)

export const getNewspapers = (params?: any) => request.get('/newspapers', { params })
export const getNewspaperCategories = () => request.get('/newspapers/categories')
export const createNewspaper = (data: any) => request.post('/newspapers', data)
export const updateNewspaper = (id: string, data: any) => request.put(`/newspapers/${id}`, data)
export const deleteNewspaper = (id: string) => request.delete(`/newspapers/${id}`)
export const createNewspaperCategory = (data: any) => request.post('/newspapers/categories', data)
export const updateNewspaperCategory = (id: string, data: any) => request.put(`/newspapers/categories/${id}`, data)
export const deleteNewspaperCategory = (id: string) => request.delete(`/newspapers/categories/${id}`)
export const getTemplates = (params?: any) => request.get('/newspapers/templates', { params })
export const createTemplate = (data: any) => request.post('/newspapers/templates', data)
export const updateTemplate = (id: string, data: any) => request.put(`/newspapers/templates/${id}`, data)
export const deleteTemplate = (id: string) => request.delete(`/newspapers/templates/${id}`)

// ==================== 用户接口 ====================
export const getUsers = (params?: any) => request.get('/users/admin/list', { params })

// ==================== 评价接口 ====================
export const getReviews = (params?: any) => request.get('/reviews/admin/list', { params })
export const replyReview = (id: string, reply: string) => request.put(`/reviews/${id}/reply`, { reply })
export const deleteReview = (id: string) => request.delete(`/reviews/${id}`)
export const updateReviewStatus = (id: string, status: 'pending' | 'approved' | 'rejected') =>
  request.put(`/reviews/${id}/status`, { status })

// ==================== 问答接口 ====================
export const getQuestions = (params?: any) => request.get('/questions/admin/list', { params })
export const updateQuestionStatus = (id: string, status: 'pending' | 'published' | 'rejected') =>
  request.put(`/questions/${id}/status`, { status })
export const replyQuestion = (id: string, content: string) =>
  request.post(`/questions/${id}/replies`, { content })
export const deleteQuestion = (id: string) => request.delete(`/questions/${id}`)
export const deleteQuestionReply = (replyId: string) => request.delete(`/questions/replies/${replyId}`)

// ==================== 管理端接口 ====================
export const getDashboard = () => request.get('/dashboard')
export const getDashboardTrend = (type: 'order' | 'amount' = 'order', days: number = 7) =>
  request.get('/dashboard/trend', { params: { type, days } })
export const getAdmins = (params?: any) => request.get('/admin/admins', { params })
export const createAdmin = (data: any) => request.post('/admin/admins', data)
export const updateAdmin = (id: string, data: any) => request.put(`/admin/admins/${id}`, data)
export const deleteAdmin = (id: string) => request.delete(`/admin/admins/${id}`)
export const getLogs = (params?: any) => request.get('/admin/logs', { params })

// ==================== 上传接口 ====================
export const uploadImage = (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  return request.post('/upload/seal', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
}

export const uploadMaterial = (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  return request.post('/upload/material', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
}

// ==================== 网点端登录 ====================
export const outletLogin = (phone: string, password: string) =>
  request.post('/auth/Outlet/login', { phone, password })

// ==================== 网点 API ====================
export const getOutletsAPI = (params: object) => request.get('/outlets', { params })
export const getOutletAPI = (id: string) => request.get(`/outlets/${id}`)
export const createOutletAPI = (data: object) => request.post('/outlets', data)
export const updateOutletAPI = (id: string, data: object) => request.put(`/outlets/${id}`, data)
export const deleteOutletAPI = (id: string) => request.delete(`/outlets/${id}`)
export const resetOutletPasswordAPI = (id: string) => request.post(`/outlets/${id}/reset-password`)
export const getOutletOrdersAPI = (outletId: string, params: object) => request.get(`/outlets/${outletId}/orders`, { params })
export const getOutletOverviewAPI = () => request.get('/outlets/admin/overview')

// ==================== 订单分配 API ====================
export const getUnassignedOrdersAPI = (params: object) => request.get('/orders/unassigned', { params })
export const assignOrderAPI = (orderId: string, data: { outletId: string; remark?: string }) => request.post(`/orders/${orderId}/assign`, { outletId: data.outletId, remark: data.remark })

// ==================== 交付回执 API ====================
export const getDeliveryReceiptsAPI = (params: object) => request.get('/delivery-receipts', { params })
export const getDeliveryReceiptAPI = (id: string) => request.get(`/delivery-receipts/${id}`)

// ==================== 代理记账套餐 API ====================
export const getBookkeepingPackages = (params?: object) => request.get('/bookkeeping/packages', { params })
export const getBookkeepingPackage = (id: string) => request.get(`/bookkeeping/packages/${id}`)
export const createBookkeepingPackage = (data: object) => request.post('/bookkeeping/packages', data)
export const updateBookkeepingPackage = (id: string, data: object) => request.put(`/bookkeeping/packages/${id}`, data)
export const deleteBookkeepingPackage = (id: string) => request.delete(`/bookkeeping/packages/${id}`)

// ==================== 售后管理 API ====================
export const getAfterSalesOrders = (params?: object) => request.get('/after-sales/orders', { params })
export const confirmAfterSalesRefund = (id: string) => request.post(`/after-sales/orders/${id}/confirm-refund`)
export const rejectAfterSales = (id: string, reason: string) => request.post(`/after-sales/orders/${id}/reject`, { reason })
export const getRefundRecords = (params?: object) => request.get('/after-sales/refund-records', { params })
