import { describe, it, expect } from 'vitest'
import { useLatest } from './useLatest'

describe('useLatest 竞态守卫', () => {
  it('只有最新请求可写回', () => {
    const guard = useLatest()
    const first = guard.next()
    const second = guard.next()
    expect(guard.isCurrent(first)).toBe(false)
    expect(guard.isCurrent(second)).toBe(true)
  })
  it('单请求正常通过', () => {
    const guard = useLatest()
    expect(guard.isCurrent(guard.next())).toBe(true)
  })
})
