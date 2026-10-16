import { describe, expect, it } from 'vitest'
import { formatDate, maskPhone } from '@/utils/format'

describe('formatDate', () => {
  it('按本地时间输出完整日期', () => {
    expect(formatDate(new Date(2026, 0, 2, 3, 4, 5))).toBe('2026-01-02 03:04:05')
  })

  it('空值和非法日期回退短横线', () => {
    expect(formatDate(null)).toBe('-')
    expect(formatDate('not-a-date')).toBe('-')
  })
})

describe('maskPhone', () => {
  it('仅脱敏 11 位手机号', () => {
    expect(maskPhone('13812345678')).toBe('138****5678')
    expect(maskPhone('123')).toBe('123')
    expect(maskPhone(undefined)).toBeUndefined()
  })
})
