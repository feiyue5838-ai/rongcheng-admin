import { describe, it, expect, beforeEach } from 'vitest'
import { getMenuConfigs, hasAccess, hasActionAccess, setMenuConfigs, type MenuRoleItem } from './roles'

beforeEach(() => setMenuConfigs([]))

describe('hasAccess 默认配置分支', () => {
  it('superadmin 恒通', () => {
    expect(hasAccess('superadmin', '/system/admins')).toBe(true)
    expect(hasAccess('superadmin', '/not-exist')).toBe(true)
  })
  it('精确匹配', () => {
    expect(hasAccess('finance', '/v2/settlement-rules')).toBe(true)
    expect(hasAccess('order_admin', '/v2/settlement-rules')).toBe(false)
    expect(hasAccess('product_admin', '/products/newspaper-templates')).toBe(true)
  })
  it('动态路由继承最长前缀（订单详情继承 /orders）', () => {
    expect(hasAccess('order_admin', '/orders/abc123')).toBe(true)
    expect(hasAccess('finance', '/orders/abc123')).toBe(false)
  })
  it('未配置 = 拒绝', () => {
    expect(hasAccess('finance', '/system/admins')).toBe(false)
    expect(hasAccess('guest', '/dashboard-nothing')).toBe(false)
  })
  it('/dashboard 对所有角色开放', () => {
    expect(hasAccess('order_admin', '/dashboard')).toBe(true)
  })
})

describe('hasAccess 数据库配置分支', () => {
  it('精确 + 前缀 + 最长前缀优先', () => {
    setMenuConfigs([
      { id: '1', path: '/v2', pathType: 'prefix', roles: ['order_admin'], sort: 1, enabled: true },
      { id: '2', path: '/v2/orders', pathType: 'prefix', roles: ['superadmin'], sort: 2, enabled: true },
    ] as MenuRoleItem[])
    // 更长前缀胜出：order_admin 在 /v2 可进，在 /v2/orders 被拒
    expect(hasAccess('order_admin', '/v2/refunds')).toBe(true)
    expect(hasAccess('order_admin', '/v2/orders')).toBe(false)
  })
  it('禁用配置不参与', () => {
    setMenuConfigs([
      { id: '1', path: '/x', pathType: 'exact', roles: ['finance'], sort: 1, enabled: false },
    ] as MenuRoleItem[])
    expect(hasAccess('finance', '/x')).toBe(false)
  })
})

describe('hasActionAccess 独立操作权限', () => {
  it('默认仅超级管理员可导出订单', () => {
    expect(hasActionAccess('superadmin', '/v2/orders/export')).toBe(true)
    expect(hasActionAccess('order_admin', '/v2/orders/export')).toBe(false)
  })

  it('必须显式配置 exact 权限，不能继承订单页 prefix 权限', () => {
    setMenuConfigs([
      { id: '1', path: '/v2/orders', pathType: 'prefix', roles: ['order_admin'], sort: 1, enabled: true },
    ] as MenuRoleItem[])
    expect(hasActionAccess('order_admin', '/v2/orders/export')).toBe(false)

    setMenuConfigs([
      { id: '1', path: '/v2/orders', pathType: 'prefix', roles: ['order_admin'], sort: 1, enabled: true },
      { id: '2', path: '/v2/orders/export', pathType: 'exact', roles: ['order_admin'], sort: 2, enabled: true },
    ] as MenuRoleItem[])
    expect(hasActionAccess('order_admin', '/v2/orders/export')).toBe(true)
  })

  it('禁用操作配置后拒绝非超级管理员', () => {
    setMenuConfigs([
      { id: '1', path: '/v2/orders/export', pathType: 'exact', roles: ['order_admin'], sort: 1, enabled: false },
    ] as MenuRoleItem[])
    expect(hasActionAccess('order_admin', '/v2/orders/export')).toBe(false)
  })

  it('交易流水导出默认开放 superadmin 与 finance', () => {
    expect(hasActionAccess('superadmin', '/transaction/export')).toBe(true)
    expect(hasActionAccess('finance', '/transaction/export')).toBe(true)
    expect(hasActionAccess('order_admin', '/transaction/export')).toBe(false)
  })

  it('财务总览导出默认开放 superadmin 与 finance，且不能继承页面权限', () => {
    expect(hasActionAccess('superadmin', '/finance/export')).toBe(true)
    expect(hasActionAccess('finance', '/finance/export')).toBe(true)
    expect(hasActionAccess('order_admin', '/finance/export')).toBe(false)

    setMenuConfigs([
      { id: '1', path: '/finance', pathType: 'prefix', roles: ['finance'], sort: 1, enabled: true },
    ] as MenuRoleItem[])
    expect(hasActionAccess('finance', '/finance/export')).toBe(false)

    setMenuConfigs([
      { id: '1', path: '/finance/export', pathType: 'exact', roles: ['finance'], sort: 1, enabled: true },
    ] as MenuRoleItem[])
    expect(hasActionAccess('finance', '/finance/export')).toBe(true)
  })

  it('交易流水导出不能继承页面 prefix 权限', () => {
    setMenuConfigs([
      { id: '1', path: '/finance', pathType: 'prefix', roles: ['finance'], sort: 1, enabled: true },
    ] as MenuRoleItem[])
    expect(hasActionAccess('finance', '/transaction/export')).toBe(false)

    setMenuConfigs([
      { id: '1', path: '/finance', pathType: 'prefix', roles: ['finance'], sort: 1, enabled: true },
      { id: '2', path: '/transaction/export', pathType: 'exact', roles: ['finance'], sort: 2, enabled: true },
    ] as MenuRoleItem[])
    expect(hasActionAccess('finance', '/transaction/export')).toBe(true)
  })
})

describe('权限配置边界', () => {
  it('暴露当前缓存，支持父级 exact 与通配角色', () => {
    const configs: MenuRoleItem[] = [
      { id: '1', path: '/custom', pathType: 'exact', roles: ['*'], sort: 1, enabled: true },
    ]
    setMenuConfigs(configs)
    expect(getMenuConfigs()).toBe(configs)
    expect(hasAccess('guest', '/custom/detail')).toBe(true)
    expect(hasAccess('guest', '/missing')).toBe(false)
  })

  it('缓存 exact 与父级 exact 都按角色精确判定', () => {
    setMenuConfigs([
      { id: '1', path: '/custom', pathType: 'exact', roles: ['finance'], sort: 1, enabled: true },
    ])
    expect(hasAccess('finance', '/custom')).toBe(true)
    expect(hasAccess('guest', '/custom')).toBe(false)
    expect(hasAccess('finance', '/custom/detail')).toBe(true)
    expect(hasAccess('guest', '/custom/detail')).toBe(false)
    expect(hasAccess('guest', '/missing/detail')).toBe(false)
  })

  it('操作权限只接受启用的 exact 项并支持通配角色', () => {
    setMenuConfigs([
      { id: '1', path: '/custom/export', pathType: 'exact', roles: ['*'], sort: 1, enabled: true },
    ])
    expect(hasActionAccess('guest', '/custom/export')).toBe(true)
    expect(hasActionAccess('guest', '/custom/missing')).toBe(false)
  })

  it('默认配置拒绝未知操作和未知页面', () => {
    setMenuConfigs([])
    expect(hasActionAccess('finance', '/unknown/export')).toBe(false)
    expect(hasAccess('finance', '/unknown')).toBe(false)
  })

  it('默认动态路由采用最长前缀', () => {
    setMenuConfigs([])
    expect(hasAccess('order_admin', '/v2/orders/detail/123')).toBe(true)
  })
})
