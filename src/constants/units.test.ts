import { describe, expect, it } from 'vitest'
import { fenToYuan, formatFen, formatYuan, formatYuanGrouped, yuanToFen } from './units'

describe('金额单位工具', () => {
  it('分元互转并正确四舍五入', () => {
    expect(fenToYuan(12345)).toBe(123.45)
    expect(fenToYuan('bad')).toBe(0)
    expect(yuanToFen('12.345')).toBe(1235)
    expect(yuanToFen(undefined)).toBe(0)
  })

  it('统一格式化金额与自定义前缀', () => {
    expect(formatFen(12345)).toBe('¥123.45')
    expect(formatYuan('12.3', 'CNY ')).toBe('CNY 12.30')
    expect(formatYuan(null)).toBe('¥0.00')
    expect(formatYuan('bad')).toBe('¥0.00')
    expect(formatYuanGrouped(1234.56)).toBe('¥1,234.56')
    expect(formatYuanGrouped('bad', '')).toBe('0.00')
  })
})
