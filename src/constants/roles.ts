/**
 * 管理员角色常量
 */
export const ADMIN_ROLES = {
  superadmin: 'superadmin',
  outlet_admin: 'outlet_admin',
  order_admin: 'order_admin',
  product_admin: 'product_admin',
  content_admin: 'content_admin',
} as const

export type AdminRole = typeof ADMIN_ROLES[keyof typeof ADMIN_ROLES]

export const ROLE_LABELS: Record<string, string> = {
  superadmin: '超级管理员',
  outlet_admin: '网点管理员',
  order_admin: '订单管理员',
  product_admin: '产品管理员',
  content_admin: '内容管理员',
}

/** API 返回的菜单权限项 */
export interface MenuRoleItem {
  id: string
  path: string
  pathType: 'exact' | 'prefix'
  roles: string[]
  sort: number
  enabled: boolean
}

/** 缓存的权限配置 */
let cachedConfigs: MenuRoleItem[] | null = null

export function setMenuConfigs(configs: MenuRoleItem[]) {
  cachedConfigs = configs
}

export function getMenuConfigs(): MenuRoleItem[] | null {
  return cachedConfigs
}

/**
 * 检查角色是否有权访问路径
 * 优先级：数据库配置 > 硬编码默认值
 * superadmin 恒通
 */
export function hasAccess(role: string, path: string): boolean {
  if (role === ADMIN_ROLES.superadmin) return true

  // 从缓存配置查找
  if (cachedConfigs && cachedConfigs.length > 0) {
    // 精确匹配
    const exact = cachedConfigs.find(c => c.enabled && c.pathType === 'exact' && c.path === path)
    if (exact) return exact.roles.includes('*') || exact.roles.includes(role)

    // 前缀匹配
    const prefix = cachedConfigs.find(c => c.enabled && c.pathType === 'prefix' && path.startsWith(c.path))
    if (prefix) return prefix.roles.includes('*') || prefix.roles.includes(role)

    // 父路径匹配
    const parentPath = path.substring(0, path.lastIndexOf('/'))
    if (parentPath) {
      const parent = cachedConfigs.find(c => c.enabled && c.pathType === 'exact' && c.path === parentPath)
      if (parent) return parent.roles.includes('*') || parent.roles.includes(role)
    }

    // 未配置 = 拒绝
    return false
  }

  // 数据库无配置时用硬编码默认值
  const DEFAULTS: Record<string, string[]> = {
    '/dashboard': ['*'],
    '/outlets/overview': ['superadmin', 'outlet_admin', 'order_admin'],
    '/outlets': ['superadmin', 'outlet_admin', 'order_admin'],
    '/outlets/dashboard': ['superadmin', 'outlet_admin', 'order_admin'],
    '/outlets/assign': ['superadmin', 'outlet_admin', 'order_admin'],
    '/outlets/receipts': ['superadmin', 'outlet_admin', 'order_admin'],
    '/orders/seal': ['superadmin', 'order_admin', 'outlet_admin'],
    '/orders/newspaper': ['superadmin', 'order_admin', 'outlet_admin'],
    '/orders/bookkeeping': ['superadmin', 'order_admin', 'outlet_admin'],
    '/orders': ['superadmin', 'order_admin', 'outlet_admin'],
    '/after-sales/orders': ['superadmin', 'order_admin'],
    '/after-sales/refund-records': ['superadmin', 'order_admin'],
    '/products/seals/enterprise': ['superadmin', 'product_admin'],
    '/products/seals/personal': ['superadmin', 'product_admin'],
    '/products/seals/electronic': ['superadmin', 'product_admin'],
    '/products/record-queries': ['superadmin', 'product_admin'],
    '/products/scenes': ['superadmin', 'product_admin'],
    '/products/packages': ['superadmin', 'product_admin'],
    '/products/newspapers': ['superadmin', 'product_admin'],
    '/products/newspaper-templates': ['superadmin', 'product_admin'],
    '/products/bookkeeping-packages': ['superadmin', 'product_admin'],
    '/users': ['superadmin', 'content_admin'],
    '/reviews': ['superadmin', 'content_admin'],
    '/questions': ['superadmin', 'content_admin'],
    '/content': ['superadmin', 'content_admin'],
    '/system/admins': ['superadmin'],
    '/system/logs': ['superadmin'],
    '/system/configs': ['superadmin'],
    '/system/dispatch-rules': ['superadmin'],
  }
  const allowed = DEFAULTS[path]
  return allowed ? (allowed.includes('*') || allowed.includes(role)) : false
}
