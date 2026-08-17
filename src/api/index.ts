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
  (response) => {
    const d = response.data
    // 新统一包装 {code:0, data}：自动提取 data（兼容旧 {data} 和无包装结构）
    if (d && typeof d === 'object' && d.code === 0 && 'data' in d) {
      return d.data
    }
    return d
  },
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
export const getAllNewspapers = () => request.get('/newspapers/all')
export const getNewspaperCategories = () => request.get('/newspapers/categories')
export const createNewspaper = (data: any) => request.post('/newspapers', data)
export const updateNewspaper = (id: string, data: any) => request.put(`/newspapers/${id}`, data)
export const deleteNewspaper = (id: string) => request.delete(`/newspapers/${id}`)
export const createNewspaperCategory = (data: any) => request.post('/newspapers/categories', data)
export const updateNewspaperCategory = (id: string, data: any) => request.put(`/newspapers/categories/${id}`, data)
export const deleteNewspaperCategory = (id: string) => request.delete(`/newspapers/categories/${id}`)
export const getTemplates = (params?: any) => request.get('/newspapers/templates', { params })
export const getTemplateMeta = () => request.get('/newspapers/template-meta')
export const createTemplate = (data: any) => request.post('/newspapers/templates', data)
export const updateTemplate = (id: string, data: any) => request.put(`/newspapers/templates/${id}`, data)
export const deleteTemplate = (id: string) => request.delete(`/newspapers/templates/${id}`)

// ==================== 用户接口 ====================
export const getUsers = (params?: any) => request.get('/users/admin/list', { params })
export const updateUser = (id: string, data: object) => request.put(`/users/admin/${id}`, data)
export const deleteUser = (id: string) => request.delete(`/users/admin/${id}`)

// ==================== 评价接口 ====================
export const getReviews = (params?: any) => request.get('/reviews/admin/list', { params })
export const replyReview = (id: string, reply: string) => request.put(`/reviews/${id}/reply`, { reply })
export const deleteReview = (id: string) => request.delete(`/reviews/${id}`)
export const updateReviewStatus = (id: string, status: 'pending' | 'approved' | 'rejected') =>
  request.put(`/reviews/${id}/status`, { status })

// ==================== 问答接口 ====================
export const getQuestions = (params?: any) => request.get('/questions/admin/list', { params })
export const updateQuestionStatus = (id: string, status: 'pending' | 'approved' | 'rejected') =>
  request.put(`/questions/${id}/status`, { status })
export const replyQuestion = (id: string, content: string) =>
  request.post(`/questions/${id}/replies`, { content })
export const deleteQuestion = (id: string) => request.delete(`/questions/${id}`)
export const deleteQuestionReply = (replyId: string) => request.delete(`/questions/replies/${replyId}`)

// ==================== 管理端接口 ====================
export const getDashboard = () => request.get('/dashboard')
export const customerActionAPI = (dto: { action: string; segment: string }) => request.post('/dashboard/customer-action', dto)
export const getDashboardTrend = (type: 'order' | 'amount' = 'order', days: number = 7) =>
  request.get('/dashboard/trend', { params: { type, days } })
export const getAdmins = (params?: any) => request.get('/admin/admins', { params })
export const createAdmin = (data: any) => request.post('/admin/admins', data)
export const updateAdmin = (id: string, data: any) => request.put(`/admin/admins/${id}`, data)
export const deleteAdmin = (id: string) => request.delete(`/admin/admins/${id}`)
export const getLogs = (params?: any) => request.get('/admin/logs', { params })
export const getLogModules = () => request.get('/admin/logs/modules')

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
export const setOutletBusinessTypesAPI = (id: string, businessTypeIds: string[]) =>
  request.put(`/outlets/${id}/business-types`, { businessTypeIds })

// ==================== 订单分配 API ====================
export const getUnassignedOrdersAPI = (params: object) => request.get('/orders/unassigned', { params })
export const getAssignedOrdersAPI = (params: object) => request.get('/orders/assigned', { params })
export const assignOrderAPI = (orderId: string, data: { outletId: string; remark?: string }) => request.post(`/orders/${orderId}/assign`, { outlet_id: data.outletId, remark: data.remark })

// ==================== 交付回执 API ====================
export const getDeliveryReceiptsAPI = (params: object) => request.get('/delivery-receipts', { params })
export const getDeliveryReceiptAPI = (id: string) => request.get(`/delivery-receipts/${id}`)
export const getDeliveryReceiptStatsAPI = () => request.get('/delivery-receipts/stats')

// ==================== 代理记账套餐 API ====================
export const getBookkeepingPackages = (params?: object) => request.get('/bookkeeping/packages', { params })
export const getBookkeepingPackage = (id: string) => request.get(`/bookkeeping/packages/${id}`)
export const createBookkeepingPackage = (data: object) => request.post('/bookkeeping/packages', data)
export const updateBookkeepingPackage = (id: string, data: object) => request.put(`/bookkeeping/packages/${id}`, data)
export const deleteBookkeepingPackage = (id: string) => request.delete(`/bookkeeping/packages/${id}`)

// ==================== 售后管理 API ====================
export const getAfterSalesOrders = (params?: object) => request.get('/after-sales/orders', { params })
export const confirmAfterSalesRefund = (id: string, amount?: number) =>
  request.post(`/after-sales/orders/${id}/confirm-refund`, amount != null ? { amount } : {})
export const rejectAfterSales = (id: string, reason: string) => request.post(`/after-sales/orders/${id}/reject`, { reason })
export const getRefundRecords = (params?: object) => request.get('/after-sales/refund-records', { params })

// ==================== 版面管理 API ====================
export const getNewspaperSections = (newspaperId: string) => request.get(`/newspapers/${newspaperId}/sections`)
export const createNewspaperSection = (newspaperId: string, data: object) => request.post(`/newspapers/${newspaperId}/sections`, data)
export const updateNewspaperSection = (newspaperId: string, sectionId: string, data: object) => request.put(`/newspapers/${newspaperId}/sections/${sectionId}`, data)
export const deleteNewspaperSection = (newspaperId: string, sectionId: string) => request.delete(`/newspapers/${newspaperId}/sections/${sectionId}`)

// ==================== 派单规则 API ====================
export const getDispatchConfig = () => request.get('/dispatch/config')
export const updateDispatchConfig = (data: { mode?: string; auto_assign?: boolean; business_type_filter?: boolean }) =>
  request.put('/dispatch/config', data)
export const getDispatchPriorities = () => request.get('/dispatch/priorities')
export const setDispatchPriority = (outletId: string, data: { priority: number; remark?: string }) =>
  request.put(`/dispatch/priorities/${outletId}`, data)
export const batchSetDispatchPriorities = (items: Array<{ outlet_id: string; priority: number }>) =>
  request.post('/dispatch/priorities/batch', { items })
export const getForcedRegions = () => request.get('/dispatch/forced-regions')
export const addForcedRegion = (data: { province: string; city?: string; remark?: string }) =>
  request.post('/dispatch/forced-regions', data)
export const removeForcedRegion = (id: string) => request.delete(`/dispatch/forced-regions/${id}`)
export const getAvailableOutlets = (params?: { addressJson?: string; businessType?: string }) =>
  request.get('/dispatch/outlets/available', { params })

// 菜单权限配置
export const getMenuRoleConfigs = () => request.get('/menu-roles')
export const createMenuRoleConfig = (data: any) => request.post('/menu-roles', data)
export const updateMenuRoleConfig = (id: string, data: any) => request.put(`/menu-roles/${id}`, data)
export const deleteMenuRoleConfig = (id: string) => request.delete(`/menu-roles/${id}`)
export const resetMenuRoleConfigs = () => request.post('/menu-roles/reset')

// ==================== 结算管理 API ====================
export const getSettlementRules = () => request.get('/settlement/rules')
export const getSettlementDefaultRule = () => request.get('/settlement/rules/default')
export const createSettlementRule = (data: any) => request.post('/settlement/rules', data)
export const updateSettlementRule = (id: string, data: any) => request.put(`/settlement/rules/${id}`, data)
export const deleteSettlementRule = (id: string) => request.delete(`/settlement/rules/${id}`)
export const getOutletPendingSummary = () => request.get('/settlement/outlets/pending')
export const getSettlementRecords = (params?: object) => request.get('/settlement/records', { params })
export const getSettlementRecord = (id: string) => request.get(`/settlement/records/${id}`)
export const generateSettlementRecord = (data: { outletId: string; periodStart: string; periodEnd: string }) =>
  request.post('/settlement/records', data)
export const autoGenerateSettlementRecords = (data: { periodStart: string; periodEnd: string }) =>
  request.post('/settlement/records/auto-generate', data)
export const updateSettlementStatus = (id: string, data: { status: number; remark?: string }) =>
  request.put(`/settlement/records/${id}/status`, data)
export const deleteSettlementRecord = (id: string) => request.delete(`/settlement/records/${id}`)
export const getSettlementOutletSummary = () => request.get('/settlement/outlets/summary')

// ==================== 交易流水 API ====================
export const getTransactionStats = (params?: { startDate?: string; endDate?: string }) =>
  request.get('/transaction/stats', { params })
export const getTransactionStatsByModule = (params?: { startDate?: string; endDate?: string }) =>
  request.get('/transaction/stats/by-module', { params })
export const getTransactionFlows = (params?: {
  page?: number; pageSize?: number; module?: string; tradeType?: string; outletId?: string
  status?: string; startDate?: string; endDate?: string; keyword?: string
}) => request.get('/transaction/flows', { params })
export const getTransactionFlowDetail = (id: string) =>
  request.get(`/transaction/flows/${id}`)
export const exportTransactionFlows = (params?: any) =>
  request.get('/transaction/export', { params })

export const exportSettlementRecords = (params?: any) =>
  request.get('/settlement/records/export', { params })

// ===== 财务总览 =====
export const getFinanceOverview = (params?: any) =>
  request({ url: '/finance/overview', method: 'get', params });

// ===== 退款管理 =====
export const getRefundList = (params?: any) => request.get('/refund/list', { params });
export const applyRefund = (data: { orderId: string; amount?: number; reason?: string }) => request.post('/refund/apply', data);
export const reviewRefund = (id: string, data: { status: 2 | 4; reviewNote?: string }) => request.post(`/refund/${id}/review`, data);
export const executeRefund = (id: string) => request.post(`/refund/${id}/execute`);

// ===== 交易流水合作方筛选 =====
export const getOutletsWithFlows = () => request.get('/transaction/outlets-with-flows');


// 合作价格管理
export const getOutletPricingList = (params?: { outletId?: string; businessType?: string; status?: number }) =>
  request.get('/outlet-pricing/list', { params });

export const getOutletPricingByOutlet = (outletId: string) =>
  request.get('/outlet-pricing/outlet/' + outletId);

export const upsertOutletPricing = (data: {
  outletId: string; businessType: string; unit: string;
  priceType: 'fixed' | 'percent'; priceValue: number; status?: number; remark?: string;
}) => request.post('/outlet-pricing/upsert', data);

export const deleteOutletPricing = (id: string) =>
  request.delete('/outlet-pricing/' + id);

// ==================== 帮助中心（FAQ） ====================
export const getFaqAdminList = () => request.get('/faqs/admin/list')
export const addFaqCategory = (data: any) => request.post('/faqs/admin/category', data)
export const updateFaqCategory = (id: string, data: any) => request.put(`/faqs/admin/category/${id}`, data)
export const deleteFaqCategory = (id: string) => request.delete(`/faqs/admin/category/${id}`)
export const addFaq = (data: any) => request.post('/faqs/admin', data)
export const updateFaq = (id: string, data: any) => request.put(`/faqs/admin/${id}`, data)
export const deleteFaq = (id: string) => request.delete(`/faqs/admin/${id}`)
export const updateFaqStatus = (id: string, status: number) => request.put(`/faqs/admin/${id}/status`, { status })
export const updateFaqCategoryStatus = (id: string, status: number) => request.put(`/faqs/admin/category/${id}/status`, { status })
export const getFaqPhone = () => request.get('/faqs/admin/phone')
export const setFaqPhone = (phone: string) => request.put('/faqs/admin/phone', { phone })

// ==================== V2.0 接口（/api/v2） ====================
// V2.0 接口响应为双层包装 {code,message,data:{code,message,data}}（controller 级 + 全局拦截器各一层）
// 此处用独立 axios 实例自动解两层，避免影响现有 V1 接口的单层解包逻辑

const v2Request = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

v2Request.interceptors.request.use((config) => {
  const adminToken = localStorage.getItem('admin_token')
  if (adminToken) config.headers.Authorization = `Bearer ${adminToken}`
  return config
})

// 解两层包装：外 {code,message,data} → 内 {code,message,data} → 实际数据
v2Request.interceptors.response.use(
  (response) => {
    const outer = response.data
    if (outer && typeof outer === 'object' && outer.code === 0 && 'data' in outer) {
      const inner = outer.data
      if (inner && typeof inner === 'object' && inner.code === 0 && 'data' in inner) {
        return inner.data
      }
      return inner
    }
    return outer
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

// ---------- 管理端 V2.0 订单/供应链 ----------
// 看板统计 GET /api/v2/admin/dashboard
export const v2GetDashboard = () => v2Request.get('/v2/admin/dashboard')

// 订单列表（统一五维状态）GET /api/v2/admin/orders?orderStatus=&module=&keyword=&page=&pageSize=
export const v2GetOrders = (params: any) => v2Request.get('/v2/admin/orders', { params })

// 订单详情（供应链视图）GET /api/v2/admin/orders/:orderNo
export const v2GetOrderDetail = (orderNo: string) => v2Request.get(`/v2/admin/orders/${orderNo}`)

// 待派单池 GET /api/v2/admin/orders/unassigned
export const v2GetUnassigned = (params: any) => v2Request.get('/v2/admin/orders/unassigned', { params })

// 派单 POST /api/v2/admin/orders/:orderNo/assign
export const v2AssignOrder = (orderNo: string, data: { supplierId: string; remark?: string }) =>
  v2Request.post(`/v2/admin/orders/${orderNo}/assign`, data)

// 改派 POST /api/v2/admin/orders/:orderNo/reassign
export const v2ReassignOrder = (orderNo: string, data: { supplierId: string; cancelRemark?: string }) =>
  v2Request.post(`/v2/admin/orders/${orderNo}/reassign`, data)

// ---------- 管理端 V2.0 结算 ----------
// 结算单列表 GET /api/v2/admin/settlements
export const v2GetSettlements = (params: any) => v2Request.get('/v2/admin/settlements', { params })

// 生成结算单 POST /api/v2/admin/settlements/generate
export const v2GenerateSettlement = (data: { supplierId: string; periodStart: string; periodEnd: string }) =>
  v2Request.post('/v2/admin/settlements/generate', data)

// 结算单详情 GET /api/v2/admin/settlements/:id
export const v2GetSettlementDetail = (id: string) => v2Request.get(`/v2/admin/settlements/${id}`)

// 确认结算单 PUT /api/v2/admin/settlements/:id/confirm
export const v2ConfirmSettlement = (id: string) => v2Request.put(`/v2/admin/settlements/${id}/confirm`)

// 结算付款 POST /api/v2/admin/settlements/:id/pay
export const v2PaySettlement = (id: string, data?: any) => v2Request.post(`/v2/admin/settlements/${id}/pay`, data || {})

// ---------- 管理端 V2.0 退款 ----------
// 退款列表 GET /api/v2/admin/refunds
export const v2GetRefunds = (params: any) => v2Request.get('/v2/admin/refunds', { params })

// 退款审核通过 POST /api/v2/admin/refunds/:id/approve
export const v2ApproveRefund = (id: string, data?: any) => v2Request.post(`/v2/admin/refunds/${id}/approve`, data || {})

// 退款驳回 POST /api/v2/admin/refunds/:id/reject
export const v2RejectRefund = (id: string, data: { remark?: string }) => v2Request.post(`/v2/admin/refunds/${id}/reject`, data || {})

// ---------- 管理端 V2.0 供应商 ----------
// 供应商列表 GET /api/v2/admin/suppliers
export const v2GetSuppliers = (params: any) => v2Request.get('/v2/admin/suppliers', { params })
