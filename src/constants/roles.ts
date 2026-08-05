/**
 * 管理员角色常量
 * - superadmin: 超级管理员（所有菜单）
 * - outlet_admin: 网点管理员（网点管理 + 订单查看）
 * - order_admin: 订单管理员（订单管理 + 网点管理 + 售后）
 * - product_admin: 产品管理员（产品管理）
 * - content_admin: 内容管理员（用户与内容）
 */
export const ADMIN_ROLES = {
  superadmin: 'superadmin',
  outlet_admin: 'outlet_admin',
  order_admin: 'order_admin',
  product_admin: 'product_admin',
  content_admin: 'content_admin',
} as const

export type AdminRole = typeof ADMIN_ROLES[keyof typeof ADMIN_ROLES]

/**
 * 角色展示名称
 */
export const ROLE_LABELS: Record<string, string> = {
  superadmin: '超级管理员',
  outlet_admin: '网点管理员',
  order_admin: '订单管理员',
  product_admin: '产品管理员',
  content_admin: '内容管理员',
}

/**
 * 菜单角色配置
 * '*' 表示所有角色可见；字符串表示特定角色
 * 路径匹配规则：精确匹配 > 前缀匹配（/orders/* 匹配 /orders/seal）
 */
export const MENU_ROLES: Record<string, string[]> = {
  // 工作台 — 所有人可见
  '/dashboard': ['*'],

  // 网点管理 — superadmin / outlet_admin / order_admin（可看）
  '/outlets/overview': [ADMIN_ROLES.superadmin, ADMIN_ROLES.outlet_admin, ADMIN_ROLES.order_admin],
  '/outlets':          [ADMIN_ROLES.superadmin, ADMIN_ROLES.outlet_admin, ADMIN_ROLES.order_admin],
  '/outlets/dashboard':[ADMIN_ROLES.superadmin, ADMIN_ROLES.outlet_admin, ADMIN_ROLES.order_admin],
  '/outlets/assign':   [ADMIN_ROLES.superadmin, ADMIN_ROLES.outlet_admin, ADMIN_ROLES.order_admin],
  '/outlets/receipts': [ADMIN_ROLES.superadmin, ADMIN_ROLES.outlet_admin, ADMIN_ROLES.order_admin],

  // 订单管理 — superadmin / order_admin / outlet_admin（可看）
  '/orders/seal':        [ADMIN_ROLES.superadmin, ADMIN_ROLES.order_admin, ADMIN_ROLES.outlet_admin],
  '/orders/newspaper':    [ADMIN_ROLES.superadmin, ADMIN_ROLES.order_admin, ADMIN_ROLES.outlet_admin],
  '/orders/bookkeeping':  [ADMIN_ROLES.superadmin, ADMIN_ROLES.order_admin, ADMIN_ROLES.outlet_admin],
  '/orders':             [ADMIN_ROLES.superadmin, ADMIN_ROLES.order_admin, ADMIN_ROLES.outlet_admin],
  '/after-sales/orders': [ADMIN_ROLES.superadmin, ADMIN_ROLES.order_admin],
  '/after-sales/refund-records': [ADMIN_ROLES.superadmin, ADMIN_ROLES.order_admin],

  // 产品管理 — superadmin / product_admin
  '/products/seals/enterprise': [ADMIN_ROLES.superadmin, ADMIN_ROLES.product_admin],
  '/products/seals/personal':   [ADMIN_ROLES.superadmin, ADMIN_ROLES.product_admin],
  '/products/seals/electronic':  [ADMIN_ROLES.superadmin, ADMIN_ROLES.product_admin],
  '/products/record-queries':   [ADMIN_ROLES.superadmin, ADMIN_ROLES.product_admin],
  '/products/scenes':            [ADMIN_ROLES.superadmin, ADMIN_ROLES.product_admin],
  '/products/packages':          [ADMIN_ROLES.superadmin, ADMIN_ROLES.product_admin],
  '/products/newspapers':        [ADMIN_ROLES.superadmin, ADMIN_ROLES.product_admin],
  '/products/newspaper-templates':[ADMIN_ROLES.superadmin, ADMIN_ROLES.product_admin],
  '/products/bookkeeping-packages':[ADMIN_ROLES.superadmin, ADMIN_ROLES.product_admin],

  // 用户与内容 — superadmin / content_admin
  '/users':   [ADMIN_ROLES.superadmin, ADMIN_ROLES.content_admin],
  '/reviews': [ADMIN_ROLES.superadmin, ADMIN_ROLES.content_admin],
  '/questions': [ADMIN_ROLES.superadmin, ADMIN_ROLES.content_admin],
  '/content': [ADMIN_ROLES.superadmin, ADMIN_ROLES.content_admin],

  // 系统管理 — 仅 superadmin
  '/system/admins':       [ADMIN_ROLES.superadmin],
  '/system/logs':         [ADMIN_ROLES.superadmin],
  '/system/configs':      [ADMIN_ROLES.superadmin],
  '/system/dispatch-rules':[ADMIN_ROLES.superadmin],
}

/**
 * 检查用户角色是否有权访问指定路径
 */
export function hasAccess(role: string, path: string): boolean {
  // superadmin 永远有权限
  if (role === ADMIN_ROLES.superadmin) return true

  // 精确匹配（'*' 表示所有角色）
  if (MENU_ROLES[path]) {
    const allowed = MENU_ROLES[path]
    return allowed.includes('*') || allowed.includes(role)
  }

  // 前缀匹配（/orders/* 匹配 /orders/seal）
  const prefix = path.split('/').slice(0, 2).join('/')
  for (const [menuPath, allowed] of Object.entries(MENU_ROLES)) {
    if (menuPath.endsWith('/*')) {
      const base = menuPath.replace('/*', '')
      if (path.startsWith(base + '/')) {
        return allowed.includes('*') || allowed.includes(role)
      }
    }
    // 父路径匹配（如 /orders 匹配 /orders/seal）
    const menuPrefix = menuPath.split('/').slice(0, 2).join('/')
    if (menuPrefix === prefix && !menuPath.includes('*')) {
      return allowed.includes('*') || allowed.includes(role)
    }
  }

  // 默认：无配置则按 superadmin 专属处理
  return false
}
