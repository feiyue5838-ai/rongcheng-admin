import { describe, expect, it } from 'vitest'
import {
  fulfillmentStatusTag,
  fulfillmentStatusText,
  outletFulfillmentStatusTag,
  outletFulfillmentStatusText,
} from './fulfillment-status'

describe('履约状态展示', () => {
  it('区分供应链与网点语境', () => {
    expect(fulfillmentStatusText('assigned')).toBe('已派单')
    expect(outletFulfillmentStatusText('assigned')).toBe('待接单')
    expect(fulfillmentStatusTag('assigned')).toBe('primary')
    expect(outletFulfillmentStatusTag('assigned')).toBe('warning')
  })

  it('未知状态保留原文并使用安全标签', () => {
    expect(fulfillmentStatusText('custom')).toBe('custom')
    expect(fulfillmentStatusText(null)).toBe('-')
    expect(outletFulfillmentStatusText(null)).toBe('-')
    expect(fulfillmentStatusTag('custom')).toBe('info')
    expect(outletFulfillmentStatusTag(undefined)).toBe('info')
  })
})
