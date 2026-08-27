/**
 * 金额单位常量与工具（系统性改造第 2 步）
 * ---------------------------------------------------------------
 * 目标：统一"分/元"口径，消灭各页面手工 /100 与单位混用。
 *
 * 用法：
 *   import { FEN, fenToYuan, formatFen, formatYuan } from '@/constants/units'
 *
 * 约定（待与后端最终确认后执行）：
 *   - 后端金额字段若以"分"存储：展示一律 formatFen(...)；
 *   - 后端金额字段若以"元"存储：展示一律 formatYuan(...)；
 *   - 目前已知：订单 totalPrice/payPrice 为"元"；remark 内嵌
 *     refund.refundFee 为"分"（见 types.ts 已知契约不一致清单）。
 */

/** 1 元 = 100 分 */
export const FEN = 100
/** 1 元 */
export const YUAN = 1

/** 分 → 元（保留两位小数，NaN/空值按 0） */
export function fenToYuan(fen: number | string | null | undefined): number {
  const n = Number(fen)
  if (!Number.isFinite(n)) return 0
  return Number((n / FEN).toFixed(2))
}

/** 元 → 分（四舍五入到整数） */
export function yuanToFen(yuan: number | string | null | undefined): number {
  const n = Number(yuan)
  if (!Number.isFinite(n)) return 0
  return Math.round(n * FEN)
}

/** 格式化"分"为 ¥xx.xx */
export function formatFen(fen: number | string | null | undefined, prefix = '¥'): string {
  return `${prefix}${fenToYuan(fen).toFixed(2)}`
}

/** 格式化"元"为 ¥xx.xx（等价于各页面现有 Number(v||0).toFixed(2)） */
export function formatYuan(yuan: number | string | null | undefined, prefix = '¥'): string {
  const n = Number(yuan)
  return `${prefix}${(Number.isFinite(n) ? n : 0).toFixed(2)}`
}

/** 千分位格式化（元），如 1,234.56 */
export function formatYuanGrouped(yuan: number | string | null | undefined, prefix = '¥'): string {
  const n = Number(yuan)
  if (!Number.isFinite(n)) return `${prefix}0.00`
  return `${prefix}${n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
