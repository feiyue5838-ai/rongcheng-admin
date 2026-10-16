// 菜单覆盖检查：
// 1) layout 菜单出现的所有 path，必须在 roles.ts DEFAULTS（精确或前缀）里可达；
// 2) 产品管理中的页面路由，必须有真实的左侧菜单入口。
// 用法：npm run menu:check
import fs from 'node:fs'
import path from 'node:path'
import console from 'node:console'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const layout = fs.readFileSync(path.join(root, 'src/layout/index.vue'), 'utf8')
const roles = fs.readFileSync(path.join(root, 'src/constants/roles.ts'), 'utf8')
const router = fs.readFileSync(path.join(root, 'src/router/index.ts'), 'utf8')

// layout 菜单路径：index="..." 与 canAccess('...')
const menuPaths = new Set()
for (const m of layout.matchAll(/index="([^"]+)"/g)) menuPaths.add(m[1].split('?')[0])
for (const m of layout.matchAll(/canAccess\('([^']+)'\)/g)) menuPaths.add(m[1].split('?')[0])

// 只统计真实 el-menu-item，避免 showProducts/showSealMgmt 中出现过路径就误判为已有入口。
const renderedMenuPaths = new Set()
for (const m of layout.matchAll(/<el-menu-item\b[^>]*\bindex="([^"]+)"/g)) {
  renderedMenuPaths.add(m[1].split('?')[0])
}

// component 页面默认需要菜单入口；redirect 路由和动态分类路由不计入。
const productPagePaths = new Set()
for (const line of router.split(/\r?\n/)) {
  const route = line.match(/\{\s*path:\s*'([^']+)'[^}\n]*\bcomponent:/)
  if (!route) continue
  const routePath = `/${route[1]}`
  if (routePath.startsWith('/products/')) productPagePaths.add(routePath)
}

// DEFAULTS 段内的 key
const defaultsBlock = roles.slice(roles.indexOf('const DEFAULTS'), roles.indexOf('}', roles.indexOf('/system/menu-roles')) + 1)
const keys = [...defaultsBlock.matchAll(/'([^']+)'\s*:/g)].map((m) => m[1])

const missing = []
for (const p of [...menuPaths].sort()) {
  if (!p.startsWith('/')) continue
  if (keys.includes(p)) continue
  const prefix = keys.filter((k) => p.startsWith(k + '/')).sort((a, b) => b.length - a.length)[0]
  if (!prefix) missing.push(p)
}

const missingProductEntries = [...productPagePaths]
  .filter(p => !renderedMenuPaths.has(p))
  .sort()

console.log(`menu paths: ${menuPaths.size}, defaults keys: ${keys.length}`)
console.log(`product pages: ${productPagePaths.size}, product menu entries: ${[...renderedMenuPaths].filter(p => p.startsWith('/products/')).length}`)
let failed = false
if (missing.length) {
  console.error('MISSING (DB无配置时非超管403):')
  for (const p of missing) console.error('  ' + p)
  failed = true
}
if (missingProductEntries.length) {
  console.error('MISSING PRODUCT MENU ENTRIES (有页面路由但左侧菜单无入口):')
  for (const p of missingProductEntries) console.error('  ' + p)
  failed = true
}
if (failed) process.exit(1)
console.log('OK: 所有菜单路径在 DEFAULTS 精确/前缀可达')
console.log('OK: 所有产品页面路由都有左侧菜单入口')
