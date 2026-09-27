import { describe, it, expect } from 'vitest'
import { unwrapV1, unwrapV2, toArray, toPaged, unwrapUploadUrl } from './unwrap'

describe('unwrapV1', () => {
  it('解 {code:0,data} 单层', () => {
    expect(unwrapV1({ code: 0, data: [1] })).toEqual([1])
  })
  it('幂等：无 data 键原样返回', () => {
    expect(unwrapV1([1, 2])).toEqual([1, 2])
    expect(unwrapV1(null)).toBe(null)
  })
  it('不认 code 不解包：含 data 键但无 code:0 的业务对象原样返回', () => {
    const biz = { data: [1], summary: {} }
    expect(unwrapV1(biz)).toBe(biz)
  })
})

describe('unwrapV2', () => {
  it('解双层包装', () => {
    expect(unwrapV2({ code: 0, data: { code: 0, data: { x: 1 } } })).toEqual({ x: 1 })
  })
  it('单层直接返回内层', () => {
    expect(unwrapV2({ code: 0, data: [1] })).toEqual([1])
  })
  it('不解包无 code:0 的业务 data 字段', () => {
    const biz = { data: [1], summary: {} }
    expect(unwrapV2(biz)).toBe(biz)
  })
})

describe('unwrapUploadUrl', () => {
  it('兼容 {url} / {data:{url}} / 空值', () => {
    expect(unwrapUploadUrl({ url: 'a' })).toBe('a')
    expect(unwrapUploadUrl({ data: { url: 'b' } })).toBe('b')
    expect(unwrapUploadUrl(null)).toBe('')
    expect(unwrapUploadUrl({})).toBe('')
  })
})

describe('toArray', () => {
  it('兼容裸数组 / list / items / rows / data', () => {
    expect(toArray([1])).toEqual([1])
    expect(toArray({ list: [1] })).toEqual([1])
    expect(toArray({ items: [1] })).toEqual([1])
    expect(toArray({ rows: [1] })).toEqual([1])
    expect(toArray({ data: [1] })).toEqual([1])
    expect(toArray(null)).toEqual([])
    expect(toArray({})).toEqual([])
  })
})

describe('toPaged', () => {
  it('三种分页形态统一 {list,total}', () => {
    expect(toPaged({ list: [1], pagination: { total: 9 } })).toEqual({ list: [1], total: 9 })
    expect(toPaged({ items: [1], total: 7 })).toEqual({ list: [1], total: 7 })
    expect(toPaged({ rows: [1], total: 5 })).toEqual({ list: [1], total: 5 })
    expect(toPaged([1, 2])).toEqual({ list: [1, 2], total: 2 })
  })
})
