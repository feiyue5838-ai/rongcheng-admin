import { describe, expect, it } from 'vitest'
import { readStoredJson } from './storage'

function storageWith(value: string | null): Pick<Storage, 'getItem'> {
  return { getItem: () => value }
}

describe('readStoredJson', () => {
  it('解析合法 JSON', () => {
    expect(readStoredJson<{ role: string }>(storageWith('{"role":"finance"}'), 'admin_info'))
      .toEqual({ role: 'finance' })
  })

  it('空值、历史 undefined 和损坏 JSON 回退 null', () => {
    expect(readStoredJson(storageWith(null), 'key')).toBeNull()
    expect(readStoredJson(storageWith('undefined'), 'key')).toBeNull()
    expect(readStoredJson(storageWith('{bad'), 'key')).toBeNull()
  })
})
