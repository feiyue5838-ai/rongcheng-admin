import fs from 'node:fs/promises'
import path from 'node:path'

function argument(name) {
  const prefix = `--${name}=`
  return process.argv.find(value => value.startsWith(prefix))?.slice(prefix.length) || ''
}

const backend = process.env.SEAL_BACKEND_URL || 'http://localhost:8080'
const proxy = process.env.SEAL_PROXY_URL || 'http://localhost:5185'
const username = process.env.SEAL_ADMIN_USERNAME || ''
const password = process.env.SEAL_ADMIN_PASSWORD || ''
const uploadRoot = argument('upload-root') || process.env.SEAL_UPLOAD_ROOT || path.resolve('..', 'java', 'seal-backend', 'uploads')

const created = { sealId: '', packageId: '', uploadUrls: [] }
let token = ''
let passed = 0

function pass(message) {
  passed += 1
  console.log(`[PASS] ${message}`)
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
  pass(message)
}

async function request(method, pathname, body, authToken = token) {
  const headers = {}
  if (authToken) headers.Authorization = `Bearer ${authToken}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const response = await fetch(`${backend}${pathname}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await response.text()
  let payload
  try {
    payload = text ? JSON.parse(text) : null
  } catch {
    throw new Error(`${method} ${pathname} returned non-JSON (${response.status})`)
  }
  if (!response.ok || (payload && payload.code !== undefined && payload.code !== 0)) {
    throw new Error(`${method} ${pathname} failed (${response.status}): ${payload?.message || text}`)
  }
  return payload && Object.prototype.hasOwnProperty.call(payload, 'data') ? payload.data : payload
}

async function uploadPng(filename) {
  // Valid 1x1 PNG; generated in memory so the check never depends on historical fixture files.
  const bytes = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64',
  )
  const form = new FormData()
  form.append('file', new Blob([bytes], { type: 'image/png' }), filename)
  const response = await fetch(`${backend}/api/upload/seal`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok || payload?.code !== 0) {
    throw new Error(`upload failed (${response.status}): ${payload?.message || 'invalid response'}`)
  }
  const url = payload?.data?.url || payload?.url
  assert(typeof url === 'string' && url.startsWith('/uploads/'), `上传 ${filename} 返回有效地址`)
  created.uploadUrls.push(url)
  return url
}

function arrayData(value) {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.items)) return value.items
  return []
}

function regionPrice(item, code) {
  const prices = item?.regionPrices || item?.region_prices || {}
  const value = prices[code]
  return Number(value && typeof value === 'object' ? value.price : value)
}

async function assertServed(url, base, label) {
  const response = await fetch(`${base}${url}`)
  assert(response.ok, `${label}可读取上传图片`)
  assert((response.headers.get('content-type') || '').startsWith('image/'), `${label}返回图片类型`)
}

function uploadPath(url) {
  if (!uploadRoot || !url.startsWith('/uploads/')) return ''
  const root = path.resolve(uploadRoot)
  const target = path.resolve(root, url.slice('/uploads/'.length).replaceAll('/', path.sep))
  if (target === root || !target.startsWith(`${root}${path.sep}`)) {
    throw new Error(`refusing to clean unsafe upload path: ${target}`)
  }
  return target
}

async function cleanup() {
  const errors = []
  if (created.packageId) {
    try {
      await request('DELETE', `/api/seals/packages/${created.packageId}`)
      pass('临时套餐已删除')
    } catch (error) {
      errors.push(`package cleanup: ${error.message}`)
    }
  }
  if (created.sealId) {
    try {
      await request('DELETE', `/api/seals/${created.sealId}`)
      pass('临时印章已删除')
    } catch (error) {
      errors.push(`seal cleanup: ${error.message}`)
    }
  }
  for (const url of created.uploadUrls) {
    const target = uploadPath(url)
    if (!target) continue
    try {
      await fs.unlink(target)
      pass(`测试图片已清理 ${path.basename(target)}`)
    } catch (error) {
      if (error.code !== 'ENOENT') errors.push(`upload cleanup ${target}: ${error.message}`)
    }
  }
  if (errors.length) throw new Error(errors.join('\n'))
}

async function main() {
  assert(Boolean(username && password), '必须通过 SEAL_ADMIN_USERNAME 和 SEAL_ADMIN_PASSWORD 显式提供测试账号')
  const uploadRootStat = await fs.stat(uploadRoot).catch(() => null)
  assert(Boolean(uploadRootStat?.isDirectory()), `测试图片清理目录可用 ${uploadRoot}`)

  const login = await request('POST', '/api/auth/admin/login', { username, password }, '')
  token = login?.token || ''
  assert(token.length > 20, '管理员登录成功')

  const scenes = arrayData(await request('GET', '/api/seals/scenes', undefined, ''))
  const scene = scenes.find(item => item?.id)
  assert(Boolean(scene?.id), '取得可用印章场景')

  const stamp = Date.now()
  const sealName = `__seal_admin_check_${stamp}__`
  const firstRegion = {
    '510100': { province: '四川省', city: '成都市', district: '', price: 1.23 },
  }
  const seal = await request('POST', '/api/seals', {
    name: sealName,
    description: '自动验收临时数据',
    price: 0.01,
    image: '',
    sort: 9999,
    status: 1,
    categoryId: scene.id,
    regionPrices: firstRegion,
  })
  created.sealId = seal?.id || ''
  assert(Boolean(created.sealId), '临时印章创建成功')

  const image1 = await uploadPng(`seal-check-${stamp}-1.png`)
  const updated1 = await request('PUT', `/api/seals/${created.sealId}`, {
    image: image1,
    regionPrices: firstRegion,
    categoryId: scene.id,
  })
  assert(updated1?.image === image1, '印章图片首次保存成功')
  assert(regionPrice(updated1, '510100') === 1.23, '印章区域价格首次保存成功')

  const image2 = await uploadPng(`seal-check-${stamp}-2.png`)
  assert(image2 !== image1, '替换上传生成不同文件地址')
  const updated2 = await request('PUT', `/api/seals/${created.sealId}`, { image: image2 })
  assert(updated2?.image === image2, '印章图片替换成功')

  await assertServed(image2, backend, '后端 8080')
  await assertServed(image2, proxy, '后台代理 5185')

  const packageName = `__seal_package_check_${stamp}__`
  const pkg = await request('POST', '/api/seals/packages', {
    name: packageName,
    description: '自动验收临时数据',
    price: 0.02,
    sort: 9999,
    status: 1,
    images: [image2],
    scene_ids: [scene.id],
    seal_ids: [created.sealId],
    regionPrices: firstRegion,
  })
  created.packageId = pkg?.id || ''
  assert(Boolean(created.packageId), '临时印章套餐创建成功')
  assert(regionPrice(pkg, '510100') === 1.23, '套餐区域价格首次保存成功')

  const updatedPkg = await request('PUT', `/api/seals/packages/${created.packageId}`, {
    name: `${packageName}_updated`,
    price: 0.03,
    images: [image2],
    scene_ids: [scene.id],
    seal_ids: [created.sealId],
    regionPrices: firstRegion,
  })
  assert(updatedPkg?.name === `${packageName}_updated`, '印章套餐编辑成功')

  const batchRegion = {
    regionCode: '510181',
    province: '四川省',
    city: '成都市',
    district: '都江堰市',
    price: 3.45,
    sealIds: [created.sealId],
    packageIds: [created.packageId],
  }
  await request('POST', '/api/seals/batch-region-prices', batchRegion)

  const sceneProducts = await request('GET', `/api/seals/scenes/${scene.id}`, undefined, '')
  const savedSeal = arrayData(sceneProducts?.seals).find(item => item.id === created.sealId)
  const savedPackage = arrayData(sceneProducts?.packages).find(item => item.id === created.packageId)
  assert(savedSeal?.image === image2, '场景接口回读到替换后的印章图片')
  assert(regionPrice(savedSeal, '510181') === 3.45, '场景接口回读到印章批量区域价格')
  assert(Boolean(savedPackage), '场景接口回读到新建套餐')
  assert(regionPrice(savedPackage, '510181') === 3.45, '场景接口回读到套餐批量区域价格')
}

let failure
try {
  await main()
} catch (error) {
  failure = error
} finally {
  try {
    await cleanup()
  } catch (error) {
    failure = failure ? new Error(`${failure.message}\n${error.message}`) : error
  }
}

if (failure) {
  console.error(`[FAIL] ${failure.message}`)
  process.exitCode = 1
} else {
  console.log(`seal management check: ${passed} passed, 0 failed`)
}
