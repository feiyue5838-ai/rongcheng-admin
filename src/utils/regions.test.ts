import { describe, expect, it } from 'vitest'
import {
  cityCodes,
  cityToDistricts,
  getCityCode,
  getProvinceCode,
  provinceCodes,
  provinces,
  provinceToCities,
  regionCodeByPath,
  regionPathByCode,
  regionPathByLegacyName,
} from './regions'

const NUL = '\u0000'

describe('region data contract', () => {
  it('keeps every province and city connected to codes and child collections', () => {
    expect(provinces).toHaveLength(31)
    expect(new Set(provinces).size).toBe(provinces.length)
    expect(Object.keys(provinceCodes)).toHaveLength(provinces.length)

    for (const province of provinces) {
      const cities = provinceToCities[province]
      expect(cities?.length, province).toBeGreaterThan(0)
      expect(getProvinceCode(province), province).toBeTruthy()

      for (const city of cities) {
        expect(cityToDistricts[city], `${province}/${city}`).toBeDefined()
        expect(cityCodes[city], `${province}/${city}`).toBeTruthy()
      }
    }
  })

  it('keeps path and code mappings bijective', () => {
    const entries = Object.entries(regionCodeByPath)
    expect(Object.keys(regionPathByCode)).toHaveLength(entries.length)
    expect(new Set(entries.map(([, code]) => code)).size).toBe(entries.length)

    for (const [pathKey, code] of entries) {
      expect(regionPathByCode[code], pathKey).toEqual(pathKey.split(NUL))
    }
  })

  it('keeps legacy names connected to stable region paths', () => {
    for (const [legacyName, regionPath] of Object.entries(regionPathByLegacyName)) {
      expect(regionPath.length, legacyName).toBeGreaterThanOrEqual(2)
      expect(regionCodeByPath[regionPath.join(NUL)], legacyName).toBeTruthy()
    }
  })

  it('resolves representative municipality, province and fallback codes', () => {
    expect(regionCodeByPath[['北京市', '北京市'].join(NUL)]).toBe('110000')
    expect(regionCodeByPath[['四川省', '成都市', '武侯区'].join(NUL)]).toBe('510107')
    expect(regionCodeByPath[['海南省', '儋州市', '那大镇'].join(NUL)])
      .toBe('path:海南省/儋州市/那大镇')
    expect(getCityCode('潜江市', '湖北省')).toBe('429005')
    expect(getCityCode('济源', '河南省')).toBe('419001')
    expect(getCityCode('不存在的城市')).toBe('')
  })
})
