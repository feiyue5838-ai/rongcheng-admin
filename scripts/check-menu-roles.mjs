// 菜单权限覆盖检查：layout 菜单出现的所有 path，必须在 roles.ts DEFAULTS
// （精确或前缀）里可达，否则 DB 无配置时非超管会被 403 挡在合法页外。
// 用法：npm run audit:menu
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const layout = fs.readFileSync(path.join(root, 'src/layout/index.vue'), 'utf8')
const roles = fs.readFileSync(path.join(root, 'src/constants/roles.ts'), 'utf8')

// layout 菜单路径：index="..." 与 canAccess('...')
const menuPaths = new Set()
for (const m of layout.matchAll(/index="([^"]+)"/g)) menuPaths.add(m[1].split('?')[0])
for (const m of layout.matchAll(/canAccess\('([^']+)'\)/g)) menuPaths.add(m[1].split('?')[0])

// DEFAULTS 段内的 key
const defaultsBlock = roles.slice(roles.indexOf('const DEFAULTS'), roles.indexOf('}', roles.indexOf('/system/menu-roles')) + 1)
const keys = [...defaultsBlock.matchAll(/'([^']+)'\s*:/g)].map((m) => m[1])

const SKIP = ['/dashboard'] // 通配 '*'，天然可达（仍参与校验，仅展示）
const missing = []
for (const p of [...menuPaths].sort()) {
  if (!p.startsWith('/')) continue
  if (keys.includes(p)) continue
  const prefix = keys.filter((k) => p.startsWith(k + '/')).sort((a, b) => b.length - a.length)[0]
  if (!prefix) missing.push(p)
}

console.log(`menu paths: ${menuPaths.size}, defaults keys: ${keys.length}`)
if (missing.length) {
  console.error('MISSING (DB无配置时非超管403):')
  for (const p of missing) console.error('  ' + p)
  process.exit(1)
}
console.log('OK: 所有菜单路径在 DEFAULTS 精确/前缀可达')
void SKIP
