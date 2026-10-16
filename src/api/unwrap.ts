/**
 * 响应解包统一工具（系统性改造第 3 步）
 * ---------------------------------------------------------------
 * 目标：解包逻辑全部收敛到 api 层，页面禁止再出现手工 `.data`。
 *
 * 现状：
 * - request（V1）：拦截器已解一层 {code:0,data}；
 * - v2Request（V2）：拦截器已解两层；
 * - transaction 系列端点：后端刻意双层包装 {code:0,data:{data:...}}，
 *   拦截器只解一层，页面需再取 .data —— 本次统一为在 api 层解两层。
 *
 * 用法（api 层内）：
 *   const res: unknown = await request.get('/transaction/flows', { params })
 *   return unwrapV2(res)
 *
 * 页面取值规范（替代 .data 三件套）：
 *   const list = toArray(res)                       // 数组：裸数组 / {list} / {items} / {rows} / {data:[...]}
 *   const { list, total } = toPaged(res)            // 分页：三种分页形态统一
 *   const obj = unwrapV1(res)                       // 对象直取
 */
import type { PagedItems, PagedList, PagedRows } from './types'

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

/** V1 单层包装解包（防御式；拦截器已解 {code:0,data} 后此函数为幂等兜底） */
export function unwrapV1<T = unknown>(res: unknown): T {
  return isRecord(res) && res.code === 0 && 'data' in res
    ? (res.data as T)
    : (res as T)
}

/** V2 双层包装解包（controller 层 + 全局拦截器各一层） */
export function unwrapV2<T = unknown>(res: unknown): T {
  const outer = unwrapV1(res)
  return unwrapV1<T>(outer)
}

/**
 * 兼容历史接口的无 code 包装 `{ data: T }`。
 * 仅应在已确认响应主体不是含业务 data 字段的实体时使用。
 */
export function unwrapData<T = unknown>(res: unknown): T {
  const value = unwrapV1<unknown>(res)
  return isRecord(value) && 'data' in value
    ? (value.data as T)
    : (value as T)
}

/** 数组归一化：兼容裸数组 / {list} / {items} / {rows} / {data:[...]} */
export function toArray<T = unknown>(res: unknown): T[] {
  if (Array.isArray(res)) return res
  if (!isRecord(res)) return []
  const v = res.list ?? res.items ?? res.rows ?? res.data
  return Array.isArray(v) ? v : []
}

/** 分页归一化：三种分页形态（PagedList/PagedItems/PagedRows）统一为 { list, total } */
export function toPaged<T = unknown>(res: unknown): { list: T[]; total: number } {
  const list = toArray<T>(res)
  const record = isRecord(res) ? res : {}
  const pagination = isRecord(record.pagination) ? record.pagination : {}
  const total = Number(
    pagination.total ?? record.total ?? list.length,
  )
  return { list, total }
}

/** 类型守卫：判断是否标准分页对象（供 toArray/toPaged 外的场景使用） */
export function isPagedList<T>(res: unknown): res is PagedList<T> {
  return isRecord(res) && Array.isArray(res.list) && isRecord(res.pagination)
}
export function isPagedItems<T>(res: unknown): res is PagedItems<T> {
  return isRecord(res) && Array.isArray(res.items) && typeof res.total === 'number'
}
export function isPagedRows<T>(res: unknown): res is PagedRows<T> {
  return isRecord(res) && Array.isArray(res.rows) && typeof res.total === 'number'
}

/** 上传回执取 url：兼容 {url} / {data:{url}}（fetch 直调与 el-upload 回调两种形态） */
export function unwrapUploadUrl(res: unknown): string {
  if (!isRecord(res)) return ''
  if (typeof res.url === 'string') return res.url
  const d = res.data
  if (isRecord(d) && typeof d.url === 'string') return d.url
  if (typeof d === 'string') return d
  return ''
}
