/**
 * 契约对齐类型（系统性改造第 1 步）
 * ---------------------------------------------------------------
 * 目标：以后端 DTO 为准，为前端 API 提供共享类型，消灭 camelCase /
 * snake_case 手工漂移与 any 滥用。
 *
 * 说明：
 * 1. 本文件只含类型（type/interface/const 断言），不引入运行时依赖。
 * 2. 字段名以后端 Java 源码（seal-backend）返回为准——响应侧统一
 *    camelCase；已知例外（后端自身不一致）见各注释。
 * 3. 用法：`import type { Outlet, PagedList } from '@/api/types'`，
 *    页面/API 层共用；接口返回建议显式标注。
 * 4. 后续可接入 openapi-generator 自动生成以完全替代手工维护。
 */

// ==================== 通用 ====================

/** 后端统一响应包装 {code:0, message, data}（axios 拦截器已解一层） */
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

/** 分页形态一：{ list, pagination }（/orders/admin/list、/outlets 列表等） */
export interface PagedList<T> {
  list: T[]
  pagination: { page: number; pageSize: number; total: number; totalPages: number }
}

/** 分页形态二：{ items, total }（/refund/list 等） */
export interface PagedItems<T> {
  items: T[]
  total: number
}

/** 分页形态三：{ rows, total }（/after-sales/orders 等） */
export interface PagedRows<T> {
  rows: T[]
  total: number
}

// ==================== 管理员 ====================

export const ADMIN_ROLE_VALUES = [
  'superadmin', 'finance', 'outlet_admin', 'order_admin', 'product_admin', 'content_admin',
] as const
export type AdminRole = typeof ADMIN_ROLE_VALUES[number]

export interface Admin {
  id: string
  username: string
  nickname: string
  role: AdminRole | 'admin' // 'admin' 为历史旧角色
  status: number
  lastLoginAt: string | null
  createdAt: string
}

// ==================== 网点 ====================

/** 网点状态：1 营业 / 0 歇业 / 2 合作中 / 3 审核中 / 4 已暂停 / 5 已终止 / -1 软删除 */
export interface Outlet {
  id: string
  name: string
  contact: string
  phone: string
  province: string
  city: string
  district: string
  address: string
  businessLicense: string | null
  specialPermits: string[] | null
  status: number
  /** 后端读取 camelCase（OutletService.create/update），前端提交须用 settlementCycle */
  settlementCycle: 'daily' | 'weekly' | 'monthly' | null
  settlementWeeklyStartDay: number
  totalOrders: number
  businessTypes?: Array<{ id: string; code: string; name: string }>
  createdAt: string
  updatedAt: string
}

/** /outlets/admin/overview summary（订单量字段后端为 snake_case，已由 OutletOverview.normalizeOverview 归一化） */
export interface OutletOverviewSummary {
  totalOutlets: number
  activeOutlets: number
  inactiveOutlets: number
  totalOrders: number
  totalPending: number
  totalProcessing: number
  totalCompleted: number
  todayTotal: number
}

/** /outlets/admin/overview 行（outlets / topOutlets / regions；totalOrders 归一化后） */
export interface OutletOverviewRow {
  id?: string
  name?: string
  province?: string
  city?: string
  region: string
  status?: number
  outletCount?: number // regions 行
  provinces?: string[] // regions 行
  totalOrders: number
  pending: number
  processing: number
  completed: number
  today: number
}

// ==================== 订单（legacy V1） ====================

export type OrderModule = 'seal' | 'newspaper' | 'bookkeeping'

/** legacy 订单状态（与历史订单列表 statusOptions 一致） */
export const LEGACY_ORDER_STATUS = {
  WAIT_PAY: 1, MAKING: 3, SHIPPED: 4, DONE: 5, CANCELED: 6, AFTER_SALES: 7, REFUNDING: 8, REFUNDED: 9,
} as const

/** legacy 订单（seal/newspaper/bookkeeping 共用） */
export interface LegacyOrder {
  id: string
  orderNo: string
  module: OrderModule
  type: string
  companyName: string
  contactPhone: string
  totalPrice: number
  status: number
  statusText: string
  remark: string | null
  licenseAddressJson?: string
  addressJson?: string
  assignment?: OrderAssignment
  createdAt: string
}

/** 分配（assignment）状态：1待接单 2制作中 3已完成 4已拒绝 5已取消 6已换网点（OrderService 常量，发货后置 3） */
export const ASSIGNMENT_STATUS = {
  WAIT_ACCEPT: 1, MAKING: 2, DONE: 3, REJECTED: 4, CANCELED: 5, MOVED: 6,
} as const

export interface OrderAssignment {
  id: string
  orderId: string
  outletId: string
  status: number
  statusText: string
  assignedAt: string
  acceptedAt: string | null
  completedAt: string | null
}

// ==================== 印章 / 产品 ====================

export interface Seal {
  id: string
  categoryId: string
  name: string
  description: string
  image: string
  price: number
  regionPrices?: Record<string, number | RegionPriceValue>
  status: number
  sort: number
  createdAt: string
  updatedAt: string
}

export interface SealCategory {
  id: string
  name: string
  sceneType?: 'enterprise' | 'personal' | 'electronic' | 'record'
  sort: number
  status: number
}

/** 套餐：响应侧字段为 camelCase sealIds（SealService.packageToRawMap） */
export interface SealPackage {
  id: string
  name: string
  badge: string
  description: string
  price: number
  sealIds: string[]
  status: number
  sort: number
  images: string[]
  regionPrices?: Record<string, number | RegionPriceValue>
  sceneId?: string
  createdAt: string
  updatedAt: string
}

export interface RegionPriceValue {
  province: string
  city: string
  district: string
  price: number
}

// ==================== 报纸 / 模板 ====================

export interface Newspaper {
  id: string
  name: string
  pricePerWord: number
  status: number
  level: 1 | 2 | 3
  province?: string
  city?: string
  region?: string
  /** 后端契约字段待确认：表单为 enable_sections，响应侧 camelCase */
  enableSections?: boolean
  createdAt: string
}

export interface NewspaperCategory {
  id: string
  name: string
  /** 分类图标（用户端渲染为 iconSvg）；新增分类时前端曾误把"描述"提交至此，注意区分 */
  icon: string
  sort: number
  status: number
  subTypes?: Array<{ key: string; name: string; desc?: string; color?: string; sort?: number; hot?: boolean }>
}

export interface NewspaperTemplate {
  id: string
  name: string
  categoryId: string
  status: number
  sort: number
  createdAt: string
}

// ==================== 交易流水（后端刻意双层包装，api 层已解两层） ====================

export type TradeType = 'income' | 'refund'
export type TradeStatus = 'success' | 'failed' | 'pending' | 'refunded'

export interface TransactionFlow {
  id: string
  transactionNo: string
  orderId: string
  orderNo: string
  userName: string
  userPhone: string
  outletId?: string
  outletName?: string
  module: OrderModule
  businessType: string
  tradeType: TradeType
  payMethod: string
  amount: number
  fee: number
  netAmount: number
  status: TradeStatus
  statusText: string
  createdAt: string
}

// ==================== 结算 / 退款（V2） ====================

export type SettlementStatusV2 = 'pending' | 'confirmed' | 'paid' | 'cancelled'

export interface SettlementV2 {
  id: string
  settlementNo: string
  supplierId: string
  supplierName: string
  periodStart: string
  periodEnd: string
  totalAmount: number
  orderAmount: number
  refundDeduct: number
  payableAmount: number
  status: SettlementStatusV2
  createdAt: string
}

export interface RefundV2 {
  id: string
  refundNo: string
  orderNo: string
  orderId?: string
  amount: number
  status: string // applying / pending / approved / rejected / paid ...
  remark?: string
  createdAt: string
}

// ==================== 用户 / 内容运营 ====================

export interface UserProfile {
  id: string
  phone: string
  nickname: string
  status: number
  lastLoginAt?: string
  createdAt: string
}

export type ReviewStatus = 'pending' | 'approved' | 'rejected'

export interface ReviewItem {
  id: string
  userId: string
  userName: string
  rating: number
  content: string
  status: ReviewStatus
  reply?: string
  createdAt: string
}

export interface QuestionReply {
  id: string
  content: string
  createdAt: string
}

export interface QuestionItem {
  id: string
  userId: string
  userName: string
  content: string
  status: ReviewStatus
  replies: QuestionReply[]
  createdAt: string
}

export interface FaqCategory {
  id: string
  name: string
  status: number
  faqs?: FaqItem[]
}

export interface FaqItem {
  id: string
  categoryId: string
  question: string
  answer: string
  status: number
  sort: number
}

// ==================== 菜单权限（re-export 自 constants/roles） ====================

export type { MenuRoleItem } from '@/constants/roles'

// ==================== 已知契约不一致清单（改造时逐项对齐） ====================

/**
 * 1. /outlets/admin/overview：summary/outlets/regions 的订单量字段后端返回
 *    snake_case `total_orders`，与 /outlets 列表（camelCase totalOrders）不一致；
 *    前端已用 normalizeOverview 归一化，后续建议后端统一 camelCase。
 * 2. transaction 系列端点：后端为 {code:0,data:{data:...}} 双层包装（与其他端点
 *    不一致），本次已在 api 层解两层；若后端统一为单层，api 层改动即可。
 * 3. /dispatch/outlets/available：返回裸数组（其他列表多为分页对象），api 层已归一化。
 * 4. 结算周期字段：后端只读 camelCase settlementCycle（前端曾误传 snake_case）。
 * 5. 报纸分类 icon：后端 NewspaperCategory.icon 用于用户端 iconSvg 渲染；
 *    管理端新增分类表单的"描述/配色"字段映射需与产品确认。
 * 6. 金额单位：订单 totalPrice/payPrice 按"元"；remark 内嵌 refund.refundFee 按"分"，
 *    需后端统一后接入 constants/units.ts。
 */
