import axios from 'axios'
import { ElMessage } from 'element-plus'
import { toArray, unwrapV2 } from './unwrap'
import type {
  ConfigRuntimeStatus,
  ContentAbout,
  FulfillmentDeliveryPayload,
  InvoiceApplicationPage,
  InvoiceApplicationQuery,
  OperationLogPage,
  OperationLogQuery,
  RefundPageV2,
  RefundQueryV2,
  SystemConfigItem,
  TransactionFlow,
  UserDetail,
  UserListQuery,
  UserPage,
  UserUpdatePayload,
} from './types'

type QueryParams = object
type RequestBody = object

interface TransactionFlowQuery {
  page?: number
  pageSize?: number
  module?: string
  tradeType?: string
  outletId?: string
  status?: string
  startDate?: string
  endDate?: string
  keyword?: string
}

async function rethrowBlobApiError(error: unknown): Promise<never> {
  if (axios.isAxiosError<Blob>(error)) {
    const body = error.response?.data
    if (body instanceof Blob && body.type.includes('json')) {
      try {
        const parsed: unknown = JSON.parse(await body.text())
        if (parsed && typeof parsed === 'object' && 'message' in parsed) {
          const message = parsed.message
          if (message) error.message = Array.isArray(message) ? message.join('；') : String(message)
        }
      } catch { /* 保留 Axios 原始错误 */ }
    }
  }
  throw error
}

const request = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

// 请求拦截器：附加 Token
request.interceptors.request.use((config) => {
  const requestUrl = (config.url || '').toLowerCase()
  // 真正的网点端专属接口才用 outlet_token
  // 注意：管理端的 /delivery-receipts（AdminJwtAuthGuard）也用 admin_token
  // 网点端用的是 /delivery-receipts/Outlet/list
  const isOutletEndpoint =
    requestUrl.startsWith('/auth/outlet/') ||
    requestUrl.startsWith('/outlets/me/') ||
    requestUrl.startsWith('/orders/outlet/') ||
    requestUrl.startsWith('/delivery-receipts/outlet/')
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
      const requestUrl = url.toLowerCase()
      const isOutletEndpoint =
        requestUrl.startsWith('/auth/outlet/') ||
        requestUrl.startsWith('/outlets/me/') ||
        requestUrl.startsWith('/orders/outlet/') ||
        requestUrl.startsWith('/delivery-receipts/outlet/')
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

// ==================== 系统配置 ====================
export const getSystemConfigs = async (group?: string): Promise<SystemConfigItem[]> =>
  await request.get('/config/all', { params: { group } }) as unknown as SystemConfigItem[]

export const getSystemConfig = async (key: string): Promise<SystemConfigItem | null> =>
  await request.get('/config', { params: { key } }) as unknown as SystemConfigItem | null

export const getConfigRuntimeStatus = async (): Promise<ConfigRuntimeStatus> =>
  await request.get('/config/runtime-status') as unknown as ConfigRuntimeStatus

export const getContentAbout = async (): Promise<ContentAbout> =>
  await request.get('/content/about') as unknown as ContentAbout

// ==================== 积分兑奖 ====================
export const getPointsRewards = () => request.get('/points/admin/rewards')
export const createPointsReward = (data: RequestBody) => request.post('/points/admin/rewards', data)
export const updatePointsReward = (id: string, data: RequestBody) => request.put(`/points/admin/rewards/${id}`, data)
export const disablePointsReward = (id: string) => request.delete(`/points/admin/rewards/${id}`)
export const getPointsRedemptions = (params: QueryParams) => request.get('/points/admin/redemptions', { params })
export const shipPointsRedemption = (id: string, data: RequestBody) => request.put(`/points/admin/redemptions/${id}/ship`, data)
export const completePointsRedemption = (id: string) => request.put(`/points/admin/redemptions/${id}/complete`)

// ==================== 认证接口 ====================
export const login = (username: string, password: string) =>
  request.post('/auth/admin/login', { username, password })

export const getAdminInfo = () => request.get('/admin/profile')

// ==================== 订单接口 ====================
// V1 订单 API 已于 2026-08-29 退役（历史页重定向 V2），列表/详情/操作全部走 v2* 系列

// ==================== 产品接口 ====================
// 无参数：返回4分类列表；传 id：返回该分类详情（含印章+套餐）
export const getSealCategories = (id?: string) => id ? request.get(`/seals/categories/${id}`) : request.get('/seals/categories')
// 用户端：获取场景下的印章和套餐
export const getSealSceneProducts = (sceneId: string) => request.get(`/seals/scenes/${sceneId}`)
export const getSeals = (params?: QueryParams) => request.get('/seals', { params })
export const getSealPackages = () => request.get('/seals/packages')
export const createSeal = (data: RequestBody) => request.post('/seals', data)
export const updateSeal = (id: string, data: RequestBody) => request.put(`/seals/${id}`, data)
export const deleteSeal = (id: string) => request.delete(`/seals/${id}`)

// ==================== 场景管理（管理端） ====================
export const getAdminScenes = () => request.get('/seals/admin/scenes')
export const createScene = (data: RequestBody) => request.post('/seals/admin/scenes', data)
export const updateScene = (id: string, data: RequestBody) => request.put(`/seals/admin/scenes/${id}`, data)
export const deleteScene = (id: string) => request.delete(`/seals/admin/scenes/${id}`)

// ==================== 刻章备案查询 ====================
export const getRecordQueries = () => request.get('/seals/admin/record-queries')
export const createRecordQuery = (data: RequestBody) => request.post('/seals/admin/record-queries', data)
export const updateRecordQuery = (id: string, data: RequestBody) => request.put(`/seals/admin/record-queries/${id}`, data)
export const deleteRecordQuery = (id: string) => request.delete(`/seals/admin/record-queries/${id}`)

export const createPackage = (data: RequestBody) => request.post('/seals/packages', data)
export const updatePackage = (id: string, data: RequestBody) => request.put(`/seals/packages/${id}`, data)
export const deletePackage = (id: string) => request.delete(`/seals/packages/${id}`)
// 批量设置城市价（一次请求一个事务）：{ sealIds, packageIds, regionCode, province, city, district, price }
export const batchSetRegionPrice = (data: RequestBody) => request.post('/seals/batch-region-prices', data)

export const getNewspapers = (params?: QueryParams) => request.get('/newspapers', { params })
export const getAllNewspapers = () => request.get('/newspapers/all')
export const getNewspaperCategories = () => request.get('/newspapers/categories')
export const createNewspaper = (data: RequestBody) => request.post('/newspapers', data)
export const updateNewspaper = (id: string, data: RequestBody) => request.put(`/newspapers/${id}`, data)
export const deleteNewspaper = (id: string) => request.delete(`/newspapers/${id}`)
export const createNewspaperCategory = (data: RequestBody) => request.post('/newspapers/categories', data)
export const updateNewspaperCategory = (id: string, data: RequestBody) => request.put(`/newspapers/categories/${id}`, data)
export const deleteNewspaperCategory = (id: string) => request.delete(`/newspapers/categories/${id}`)
export const getTemplates = (params?: QueryParams) => request.get('/newspapers/templates', { params })
export const getAdminTemplates = (params?: QueryParams) => request.get('/newspapers/admin/templates', { params })
export const getTemplateMeta = () => request.get('/newspapers/template-meta')
export const createTemplate = (data: RequestBody) => request.post('/newspapers/templates', data)
export const updateTemplate = (id: string, data: RequestBody) => request.put(`/newspapers/templates/${id}`, data)
export const deleteTemplate = (id: string) => request.delete(`/newspapers/templates/${id}`)

// ==================== 用户接口 ====================
export const getUsers = async (params?: UserListQuery): Promise<UserPage> =>
  await request.get('/users/admin/list', { params }) as unknown as UserPage
export const updateUser = async (id: string, data: UserUpdatePayload): Promise<UserDetail> =>
  await request.put(`/users/admin/${id}`, data) as unknown as UserDetail
export const deleteUser = async (id: string): Promise<{ success: boolean }> =>
  await request.delete(`/users/admin/${id}`) as unknown as { success: boolean }

// ==================== 评价接口 ====================
export const getReviews = (params?: QueryParams) => request.get('/reviews/admin/list', { params })
export const replyReview = (id: string, reply: string) => request.put(`/reviews/${id}/reply`, { reply })
export const deleteReview = (id: string) => request.delete(`/reviews/${id}`)
export const updateReviewStatus = (id: string, status: 'pending' | 'approved' | 'rejected') =>
  request.put(`/reviews/${id}/status`, { status })

// ==================== 投诉接口 ====================
export const getComplaints = (params?: QueryParams) => request.get('/complaints/admin/list', { params })
export const updateComplaintStatus = (id: string, status: string, reply?: string) =>
  request.put(`/complaints/${id}/status`, reply ? { status, reply } : { status })
export const batchComplaintStatus = (ids: string[], status: string, reply?: string) =>
  request.post('/complaints/admin/batch-status', { ids, status, reply })

// ==================== 工商注册需求 ====================
export const getRegistrationRequests = (params?: { page?: number; pageSize?: number; kind?: string; keyword?: string }) =>
  request.get('/registration-requests/admin/list', { params })
export const getRegistrationRequestDetail = (id: string) =>
  request.get(`/registration-requests/admin/${encodeURIComponent(id)}`)

// ==================== 登记需求跟进（线索跟进闭环） ====================
export const getRegistrationRequestFollowUps = (id: string) =>
  request.get(`/registration-requests/admin/${encodeURIComponent(id)}/follow-ups`)
export const followUpRegistrationRequest = (
  id: string,
  data: { fromStatus?: string; status: string; owner?: string; remark?: string }
) => request.post(`/registration-requests/admin/${encodeURIComponent(id)}/follow-up`, data)
export const batchFollowUpRegistrationRequests = (data: {
  ids: string[]
  status: string
  owner?: string
  remark?: string
}) => request.post('/registration-requests/admin/batch-follow-up', data)

// ==================== 问答接口 ====================
export const getQuestions = (params?: QueryParams) => request.get('/questions/admin/list', { params })
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
export const getAdmins = (params?: QueryParams) => request.get('/admin/admins', { params })
export const createAdmin = (data: RequestBody) => request.post('/admin/admins', data)
export const updateAdmin = (id: string, data: RequestBody) => request.put(`/admin/admins/${id}`, data)
export const deleteAdmin = (id: string) => request.delete(`/admin/admins/${id}`)
export const getLogs = async (params?: OperationLogQuery): Promise<OperationLogPage> =>
  await request.get('/admin/logs', { params }) as unknown as OperationLogPage
export const getLogModules = async (): Promise<string[]> =>
  await request.get('/admin/logs/modules') as unknown as string[]

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
export const acceptOutletOrderAdminAPI = (outletId: string, orderId: string) => request.put(`/outlets/${outletId}/orders/${orderId}/accept`)
export const shipOutletOrderAdminAPI = (outletId: string, orderId: string, data: { expressCompany: string; trackingNo: string; remark?: string; receipts: Array<{ type?: string; url: string; remark?: string }> }) => request.put(`/outlets/${outletId}/orders/${orderId}/ship`, data)
export const setOutletBusinessTypesAPI = (id: string, businessTypeIds: string[]) =>
  request.put(`/outlets/${id}/business-types`, { businessTypeIds })
// 管理端：查看指定网点发货偏好（网点端编辑，管理端只读；2026-09-06 新增）
export const getOutletShippingPreferencesAPI = (id: string) =>
  request.get(`/outlets/${id}/shipping-preferences`)
// 管理端：业务类型列表（2026-09-07 新增，替代前端硬编码 UUID）
export const getBusinessTypesAPI = () => request.get('/business-types')

// ==================== 订单分配 API（V1 退役 2026-08-29：派单走 v2AssignOrder / v2 待派单池） ====================

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
// 后端 /dispatch/outlets/available 返回裸数组（List），拦截器解包后 res 即数组；
// 此处统一归一化，避免调用方二次解包 (res as any).data 取到空数组。
export const getAvailableOutlets = async (params?: { addressJson?: string; businessType?: string }) => {
  return toArray(await request.get('/dispatch/outlets/available', { params }))
}

// 菜单权限配置
export const getMenuRoleConfigs = () => request.get('/menu-roles')
export const createMenuRoleConfig = (data: RequestBody) => request.post('/menu-roles', data)
export const updateMenuRoleConfig = (id: string, data: RequestBody) => request.put(`/menu-roles/${id}`, data)
export const deleteMenuRoleConfig = (id: string) => request.delete(`/menu-roles/${id}`)
export const resetMenuRoleConfigs = () => request.post('/menu-roles/reset')

// ==================== 结算管理 API ====================
// V1 settlement 接口已退役（2026-08-29）：待结算数据走 v2GetSettlements（v2Request）

// ==================== 交易流水 API ====================
// 注意：transaction 系列端点后端为 {code:0,data:{data:...}} 双层包装，
// 已在此统一解两层，页面直取数据对象，禁止再写 resp.data。
export const getTransactionStats = async (params?: { startDate?: string; endDate?: string }) =>
  unwrapV2(await request.get('/transaction/stats', { params }))
export const getTransactionStatsByModule = async (params?: { startDate?: string; endDate?: string }) =>
  unwrapV2(await request.get('/transaction/stats/by-module', { params }))
export const getTransactionFlows = async (params?: TransactionFlowQuery) => unwrapV2<{
  items?: TransactionFlow[]
  list?: TransactionFlow[]
  total?: number
}>(
  await request.get('/transaction/flows', { params }),
)
export const getTransactionFlowDetail = async (id: string) =>
  unwrapV2(await request.get(`/transaction/flows/${id}`))
// 按当前筛选导出全部匹配流水 Excel 二进制（独立操作权限：/transaction/export）
export const exportTransactionFlows = async (params: TransactionFlowQuery): Promise<Blob> => {
  try {
    return await v2Request.get('/transaction/export', {
      params,
      responseType: 'blob',
      timeout: 60000,
    }) as unknown as Blob
  } catch (error: unknown) {
    return rethrowBlobApiError(error)
  }
}

// ===== 财务总览 =====
export const getFinanceOverview = (params?: { startDate?: string; endDate?: string; days?: number }) =>
  request({ url: '/finance/overview', method: 'get', params });

// 按财务总览当前统计周期导出 Excel（独立操作权限：/finance/export）
export const exportFinanceOverview = async (params?: {
  startDate?: string; endDate?: string; days?: number
}): Promise<Blob> => {
  try {
    return await v2Request.get('/finance/overview/export', {
      params,
      responseType: 'blob',
      timeout: 60000,
    }) as unknown as Blob
  } catch (error: unknown) {
    return rethrowBlobApiError(error)
  }
}



// ===== 交易流水合作方筛选 =====
export const getOutletsWithFlows = async () => unwrapV2(await request.get('/transaction/outlets-with-flows'));


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
export const addFaqCategory = (data: RequestBody) => request.post('/faqs/admin/category', data)
export const updateFaqCategory = (id: string, data: RequestBody) => request.put(`/faqs/admin/category/${id}`, data)
export const deleteFaqCategory = (id: string) => request.delete(`/faqs/admin/category/${id}`)
export const addFaq = (data: RequestBody) => request.post('/faqs/admin', data)
export const updateFaq = (id: string, data: RequestBody) => request.put(`/faqs/admin/${id}`, data)
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
    // 提取后端业务错误信息（GlobalExceptionHandler 返回 {statusCode,message,error}；message 可能为数组）
    const msg = error.response?.data?.message
    if (msg) error.message = Array.isArray(msg) ? msg.join('；') : String(msg)
    return Promise.reject(error)
  },
)

// ---------- 管理端 V2.0 订单/供应链 ----------
// 看板统计 GET /api/v2/admin/dashboard
export const v2GetDashboard = () => v2Request.get('/v2/admin/dashboard')

// 订单列表（统一五维状态）GET /api/v2/admin/orders?orderStatus=&module=&keyword=&page=&pageSize=
export const v2GetOrders = (params: QueryParams) => v2Request.get('/v2/admin/orders', { params })

// 按当前筛选导出全部匹配订单 Excel（独立操作权限：/v2/orders/export）
export const v2ExportOrders = async (params: QueryParams): Promise<Blob> => {
  try {
    return await v2Request.get('/v2/admin/orders/export', {
      params,
      responseType: 'blob',
      timeout: 60000,
    }) as unknown as Blob
  } catch (error: unknown) {
    return rethrowBlobApiError(error)
  }
}

// 订单详情（供应链视图）GET /api/v2/admin/orders/:orderNo
export const v2GetOrderDetail = (orderNo: string) => v2Request.get(`/v2/admin/orders/${encodeURIComponent(orderNo)}`)

// 待派单池 GET /api/v2/admin/orders/unassigned
export const v2GetUnassigned = (params: QueryParams) => v2Request.get('/v2/admin/orders/unassigned', { params })

// 派单 POST /api/v2/admin/orders/:orderNo/assign
export const v2AssignOrder = (orderNo: string, data: { supplierId: string; remark?: string }) =>
  v2Request.post(`/v2/admin/orders/${encodeURIComponent(orderNo)}/assign`, data)

// 批量派单 POST /api/v2/admin/orders/assign-batch
export const v2AssignBatch = (items: Array<{ orderNo: string; supplierId: string }>) =>
  v2Request.post('/v2/admin/orders/assign-batch', { items })

// 材料单条审核 POST /api/v2/admin/materials/:id/audit
export const v2AuditMaterial = (id: string, data: { status: 1 | 2; remark?: string }) =>
  v2Request.post(`/v2/admin/materials/${encodeURIComponent(id)}/audit`, data)

// 材料批量审核 POST /api/v2/admin/materials/audit-batch
export const v2AuditMaterialBatch = (items: Array<{ materialId: string; status: 1 | 2; remark?: string }>) =>
  v2Request.post('/v2/admin/materials/audit-batch', { items })

// 改派 POST /api/v2/admin/orders/:orderNo/reassign
export const v2ReassignOrder = (orderNo: string, data: { supplierId: string; cancelRemark?: string }) =>
  v2Request.post(`/v2/admin/orders/${encodeURIComponent(orderNo)}/reassign`, data)

// 人工确认收货 POST /api/v2/admin/orders/:orderNo/confirm-receipt
export const v2ConfirmReceipt = (orderNo: string) =>
  v2Request.post(`/v2/admin/orders/${encodeURIComponent(orderNo)}/confirm-receipt`, {})

// ---------- 管理端 V2.0 结算 ----------
// 结算单列表 GET /api/v2/admin/settlements
export const v2GetSettlements = (params: QueryParams) => v2Request.get('/v2/admin/settlements', { params })

// 生成结算单 POST /api/v2/admin/settlements/generate
export const v2GenerateSettlement = (data: { supplierId: string; periodStart: string; periodEnd: string }) =>
  v2Request.post('/v2/admin/settlements/generate', data)

// 结算单详情 GET /api/v2/admin/settlements/:id
export const v2GetSettlementDetail = (id: string) => v2Request.get(`/v2/admin/settlements/${id}`)

// 确认结算单 PUT /api/v2/admin/settlements/:id/confirm
export const v2ConfirmSettlement = (id: string) => v2Request.put(`/v2/admin/settlements/${id}/confirm`)

// 结算付款 POST /api/v2/admin/settlements/:id/pay
export const v2PaySettlement = (id: string, data?: RequestBody) => v2Request.post(`/v2/admin/settlements/${id}/pay`, data || {})

// 登记/核销进项票 PUT /api/v2/admin/settlements/payouts/:payoutNo/invoice（P1 真总包进项侧闭环）
export const v2RegisterPayoutInvoice = (payoutNo: string, data: { invoiceNo: string; invoiceAmount?: number; invoiceTaxRate?: number; invoiceFileUrl?: string }) =>
  v2Request.put(`/v2/admin/settlements/payouts/${payoutNo}/invoice`, data)

// 撤销进项票登记 DELETE /api/v2/admin/settlements/payouts/:payoutNo/invoice
export const v2ClearPayoutInvoice = (payoutNo: string) => v2Request.delete(`/v2/admin/settlements/payouts/${payoutNo}/invoice`)

// ---------- 管理端 V2.0 结算规则（2026-09-05 真·总包差价机制） ----------
// 结算规则列表 GET /api/v2/admin/settlement-rules
export const v2GetSettlementRules = (params: QueryParams) => v2Request.get('/v2/admin/settlement-rules', { params })

// 新增结算规则 POST /api/v2/admin/settlement-rules
export const v2CreateSettlementRule = (data: RequestBody) => v2Request.post('/v2/admin/settlement-rules', data)

// 编辑结算规则 PUT /api/v2/admin/settlement-rules/:id
export const v2UpdateSettlementRule = (id: string, data: RequestBody) => v2Request.put(`/v2/admin/settlement-rules/${id}`, data)

// 删除结算规则 DELETE /api/v2/admin/settlement-rules/:id
export const v2DeleteSettlementRule = (id: string) => v2Request.delete(`/v2/admin/settlement-rules/${id}`)

// ---------- 管理端 V2.0 退款 ----------
// 退款列表 GET /api/v2/admin/refunds
export const v2GetRefunds = async (params: RefundQueryV2): Promise<RefundPageV2> =>
  await v2Request.get('/v2/admin/refunds', { params }) as unknown as RefundPageV2

// 退款审核通过 POST /api/v2/admin/refunds/:id/approve
export const v2ApproveRefund = (id: string, data?: RequestBody) => v2Request.post(`/v2/admin/refunds/${id}/approve`, data || {})

// 退款驳回 POST /api/v2/admin/refunds/:id/reject
export const v2RejectRefund = (id: string, data: { remark?: string }) => v2Request.post(`/v2/admin/refunds/${id}/reject`, data || {})

// ---------- 管理端 V2.0 供应商 ----------
// 供应商列表 GET /api/v2/admin/suppliers
export const v2GetSuppliers = (params: QueryParams) => v2Request.get('/v2/admin/suppliers', { params })

// V2 派单记录/统计（履约维度，替代 V1 dashboard/dispatch-*，2026-08-29）
export const v2GetDispatchRecords = (params: QueryParams) => v2Request.get('/v2/admin/dispatch-records', { params })
export const v2GetDispatchStats = (params: QueryParams) => v2Request.get('/v2/admin/dispatch-stats', { params })

// V2 履约管理（网点看板用，替代 V1 /api/outlets/{id}/orders，2026-08-29）
export const v2GetFulfillments = (params: QueryParams) => v2Request.get('/v2/admin/fulfillments', { params })
export const v2AcceptFulfillment = (id: string) => v2Request.post(`/v2/admin/fulfillments/${id}/accept`)
export const v2StartFulfillment = (id: string) => v2Request.post(`/v2/admin/fulfillments/${id}/start`)
export const v2DeliverFulfillment = (id: string, data: FulfillmentDeliveryPayload) => v2Request.post(`/v2/admin/fulfillments/${id}/deliver`, data)

// ---------- 管理端 V2.0 开票管理 ----------
// 开票申请列表 GET /api/v2/admin/invoice-applications?status=&keyword=&page=&pageSize=
export const v2GetInvoiceApplications = async (
  params: InvoiceApplicationQuery,
): Promise<InvoiceApplicationPage> =>
  await v2Request.get('/v2/admin/invoice-applications', { params }) as unknown as InvoiceApplicationPage

// 开票通过 POST /api/v2/admin/invoice-applications/:id/issue
export const v2IssueInvoice = (id: string, data?: RequestBody) => v2Request.post(`/v2/admin/invoice-applications/${id}/issue`, data || {})

// 开票驳回 POST /api/v2/admin/invoice-applications/:id/reject
export const v2RejectInvoice = (id: string, data: { remark?: string }) => v2Request.post(`/v2/admin/invoice-applications/${id}/reject`, data || {})
