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
 *   const res: any = await request.get('/transaction/flows', { params })
 *   return unwrapV2(res)
 *
 * 页面取值规范（替代 .data 三件套）：
 *   const list = toArray(res)                       // 数组：裸数组 / {list} / {items} / {rows} / {data:[...]}
 *   const { list, total } = toPaged(res)            // 分页：三种分页形态统一
 *   const obj = unwrapV1(res)                       // 对象直取
 */
import type { PagedItems, PagedList, PagedRows } from './types'

/** V1 单层包装解包（防御式；拦截器已解 {code:0,data} 后此函数为幂等兜底） */
export function unwrapV1<T = any>(res: any): T {
  return res && typeof res === 'object' && 'data' in res ? (res.data as T) : (res as T)
}

/** V2 双层包装解包（controller 层 + 全局拦截器各一层） */
export function unwrapV2<T = any>(res: any): T {
  const outer = unwrapV1(res)
  return outer && typeof outer === 'object' && 'data' in outer ? (outer.data as T) : (outer as T)
}

/** 数组归一化：兼容裸数组 / {list} / {items} / {rows} / {data:[...]} */
export function toArray<T = any>(res: any): T[] {
  if (Array.isArray(res)) return res
  if (!res || typeof res !== 'object') return []
  const v = (res as any).list ?? (res as any).items ?? (res as any).rows ?? (res as any).data
  return Array.isArray(v) ? v : []
}

/** 分页归一化：三种分页形态（PagedList/PagedItems/PagedRows）统一为 { list, total } */
export function toPaged<T = any>(res: any): { list: T[]; total: number } {
  const list = toArray<T>(res)
  const total = Number(
    (res as any)?.pagination?.total ?? (res as any)?.total ?? list.length ?? 0,
  )
  return { list, total }
}

/** 类型守卫：判断是否标准分页对象（供 toArray/toPaged 外的场景使用） */
export function isPagedList<T>(res: any): res is PagedList<T> {
  return !!res && typeof res === 'object' && Array.isArray(res.list) && !!res.pagination
}
export function isPagedItems<T>(res: any): res is PagedItems<T> {
  return !!res && typeof res === 'object' && Array.isArray(res.items) && typeof res.total === 'number'
}
export function isPagedRows<T>(res: any): res is PagedRows<T> {
  return !!res && typeof res === 'object' && Array.isArray(res.rows) && typeof res.total === 'number'
}
