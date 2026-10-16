import { ROLE_LABELS } from '@/constants/roles'

type LogData = Record<string, unknown>

const MODULE_LABELS: Record<string, string> = {
  seal: '刻章',
  seals: '刻章',
  order: '订单',
  orders: '订单',
  bookkeeping: '记账',
  content: '内容',
  system: '系统',
  dispatch: '派单',
  outlet: '网点',
  outlets: '网点',
  user: '用户',
  users: '用户',
  review: '评价',
  question: '问答',
  faq: '帮助中心',
  finance: '财务',
  settlement: '结算',
  refund: '退款',
  invoice: '开票',
  fulfillment: '履约',
  points: '积分兑奖',
  newspaper: '报纸',
  admin: '管理员',
  notification: '通知',
}

const ACTION_LABELS: Record<string, string> = {
  create: '新增',
  update: '更新',
  delete: '删除',
  login: '登录',
  logout: '退出登录',
  pay: '支付',
  refund: '退款',
  assign: '派单',
  reassign: '改派',
  approve: '审核通过',
  reject: '驳回',
  issue: '开票通过',
  confirm: '确认',
  generate: '生成',
}

const LEGACY_AMBIGUOUS_ACTIONS = new Set([
  '分类', '模板', '套餐', '版面', '个人证件', '备案查询', '印章场景', '状态', '回复',
])

const TARGET_LABELS: Array<[string, string]> = [
  ['invoice-applications', '开票申请'],
  ['shipping-preferences', '发货偏好'],
  ['personal-docs', '个人证件'],
  ['page-decorations', '页面装修'],
  ['material-commitment', '材料真实性承诺书'],
  ['batch-region-prices', '批量区域价格'],
  ['settlement-rules', '结算规则'],
  ['dispatch-records', '派单记录'],
  ['record-queries', '备案查询'],
  ['business-types', '业务权限'],
  ['reset-password', '重置密码'],
  ['subscribe-toggle', '订阅设置'],
  ['bind-openid', '绑定微信账号'],
  ['fulfillments', '履约单'],
  ['settlements', '结算单'],
  ['announcements', '公告'],
  ['categories', '分类'],
  ['templates', '模板'],
  ['packages', '套餐'],
  ['banners', '轮播图'],
  ['sections', '版面'],
  ['scenes', '场景'],
  ['refunds', '退款单'],
  ['orders', '订单'],
  ['outlets', '网点'],
  ['replies', '回复'],
  ['seals', '印章'],
  ['intros', '详情介绍'],
  ['profile', '资料'],
  ['password', '密码'],
  ['status', '状态'],
  ['items', '项目'],
  ['about', '关于我们'],
  ['phone', '客服电话'],
  ['admin', '管理端'],
  ['read', '已读'],
  ['api', '接口'],
  ['me', '当前网点'],
  ['V2', '新版'],
]

const DETAIL_KEY_LABELS: Record<string, string> = {
  id: '编号',
  adminId: '管理员编号',
  userId: '用户编号',
  outletId: '网点编号',
  supplierId: '供应商编号',
  orderId: '订单编号',
  orderNo: '订单号',
  payoutNo: '结算付款单号',
  refundNo: '退款单号',
  username: '用户名',
  nickname: '昵称',
  name: '名称',
  title: '标题',
  role: '角色',
  status: '状态',
  statusText: '状态说明',
  phone: '电话',
  contact: '联系人',
  contactPhone: '联系电话',
  module: '业务模块',
  action: '操作',
  target: '操作对象',
  message: '提示',
  error: '失败原因',
  success: '是否成功',
  enabled: '是否启用',
  deleted: '是否删除',
  createdAt: '创建时间',
  updatedAt: '更新时间',
  amount: '金额',
  price: '价格',
  totalPrice: '总价',
  remark: '备注',
  reason: '原因',
  reply: '回复内容',
  content: '内容',
  description: '说明',
  province: '省份',
  city: '城市',
  district: '区县',
  address: '地址',
  sort: '排序',
  count: '数量',
  page: '页码',
  pageSize: '每页数量',
  total: '总数',
  fileName: '文件名',
  contentType: '文件类型',
  size: '文件大小',
  url: '文件地址',
  urls: '文件地址列表',
  items: '项目',
}

const STATUS_LABELS: Record<string, string> = {
  '0': '禁用',
  '1': '正常',
  active: '正常',
  inactive: '停用',
  enabled: '启用',
  disabled: '禁用',
  pending: '待处理',
  processing: '处理中',
  approved: '已通过',
  rejected: '已驳回',
  success: '成功',
  failed: '失败',
  completed: '已完成',
  cancelled: '已取消',
  refunded: '已退款',
  paid: '已支付',
}

const PLACEHOLDER_LABELS: Record<string, string> = {
  id: '对象编号未记录',
  orderNo: '订单号未记录',
  payoutNo: '结算付款单号未记录',
  sectionId: '版面编号未记录',
  replyId: '回复编号未记录',
}

export function operationLogModuleText(value: unknown): string {
  const raw = String(value ?? '').trim()
  if (!raw) return '未记录'
  return MODULE_LABELS[raw.toLowerCase()] || raw
}

export function operationLogActionText(value: unknown): string {
  const raw = String(value ?? '').trim()
  if (!raw) return '未记录'
  const exact = ACTION_LABELS[raw.toLowerCase()]
  if (exact) return exact
  if (LEGACY_AMBIGUOUS_ACTIONS.has(raw)) return `${raw}操作（历史记录）`
  return raw
    .replace(/banner/gi, '轮播图')
    .replace(/openid/gi, '微信账号')
}

export function operationLogTargetText(value: unknown): string {
  let text = String(value ?? '').trim()
  if (!text) return '未记录'

  text = text.replace(/(?:\{|:)([A-Za-z][\w]*)(?:\})?/g, (_match, key: string) => (
    PLACEHOLDER_LABELS[key] || '对象编号未记录'
  ))
  text = text.replace(/\bPOST\b/g, '新增').replace(/\bPUT\b|\bPATCH\b/g, '更新').replace(/\bDELETE\b/g, '删除')
  text = text.replace(/V2(?=[\u3400-\u9fff])/g, '新版')
  for (const [source, label] of TARGET_LABELS) {
    const escaped = source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    text = text.replace(new RegExp(`(^|/)${escaped}(?=/|$)`, 'g'), (_match, prefix: string) => `${prefix}${label}`)
  }
  return text
    .replace(/^\/+|\/+$/g, '')
    .replace(/\/+/g, ' · ')
    .replace(/\s+/g, ' ')
    .trim() || '未记录'
}

export function operationLogOperatorText(row: unknown): string {
  const record = row && typeof row === 'object' && !Array.isArray(row) ? row as LogData : {}
  const admin = record.admin && typeof record.admin === 'object' && !Array.isArray(record.admin)
    ? record.admin as LogData
    : {}
  const name = String(admin.nickname || admin.username || '').trim()
  if (name) return name
  return record.adminId ? '已删除的管理员' : '系统或业务端'
}

function parseDetail(detail: unknown): LogData | null {
  if (!detail) return null
  if (typeof detail === 'object' && !Array.isArray(detail)) return detail as LogData
  try {
    const parsed = JSON.parse(String(detail))
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as LogData : null
  } catch {
    return null
  }
}

function statusText(value: unknown): string {
  const raw = String(value ?? '')
  return STATUS_LABELS[raw.toLowerCase()] || raw || '未记录'
}

function shortId(value: unknown, length: number): string {
  const raw = String(value ?? '').trim()
  return raw ? raw.slice(0, length) : ''
}

function displayValue(key: string, value: unknown): string {
  if (key === 'status') return statusText(value)
  if (key === 'role') return ROLE_LABELS[String(value)] || String(value ?? '未记录')
  if (key === 'module') return operationLogModuleText(value)
  if (key === 'action') return operationLogActionText(value)
  if (key === 'target') return operationLogTargetText(value)
  if (typeof value === 'boolean') return value ? '是' : '否'
  if (value == null || value === '') return '未记录'
  return String(value)
}

export function operationLogSummary(detail: unknown, action: unknown): string {
  const parsed = parseDetail(detail)
  if (!parsed) return detail ? '详情格式异常' : '无详情'
  if (parsed.serializationError) return '详情生成失败'
  if (parsed.truncated) return String(parsed.message || '日志内容已截断')
  if (parsed.error) return `操作失败：${String(parsed.error)}`

  const result = parsed.result
  const actionText = operationLogActionText(action)
  if (actionText.includes('删除')) return '已删除'
  if (!result || typeof result !== 'object' || Array.isArray(result)) return '无结果摘要'

  const data = result as LogData
  if (actionText.includes('登录')) return displayValue('username', data.username)
  if (actionText.includes('创建') || actionText.includes('新增') || actionText.includes('添加')) {
    const label = data.name ?? data.username ?? data.nickname ?? data.title
    return label ? String(label) : shortId(data.id, 8) || '新增成功'
  }

  const fields = ['status', 'role', 'nickname', 'name', 'phone', 'contact']
  const changed = fields
    .filter(key => data[key] !== undefined)
    .map(key => `${DETAIL_KEY_LABELS[key]}：${displayValue(key, data[key])}`)
  if (changed.length) return changed.join('；')
  const fallback = data.name ?? data.username ?? data.nickname ?? shortId(data.id, 12)
  return fallback == null || String(fallback).trim() === '' ? '无结果摘要' : String(fallback)
}

function localizeDetailValue(value: unknown, key = ''): unknown {
  if (Array.isArray(value)) return value.map(item => localizeDetailValue(item))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as LogData).map(([childKey, childValue]) => [
      DETAIL_KEY_LABELS[childKey] || childKey,
      localizeDetailValue(childValue, childKey),
    ]))
  }
  return displayValue(key, value)
}

export function formatOperationLogDetail(value: unknown): string {
  if (value == null) return '（空）'
  if (typeof value === 'string') {
    try {
      return JSON.stringify(localizeDetailValue(JSON.parse(value)), null, 2)
    } catch {
      return value || '（空）'
    }
  }
  if (typeof value === 'object' && Object.keys(value).length === 0) return '（空）'
  return JSON.stringify(localizeDetailValue(value), null, 2)
}

export function parseOperationLogDetail(detail: unknown): LogData | null {
  return parseDetail(detail)
}
