// 全国省/市/区县级联数据。
// 大陆数据来自 china-division 2.7.0，港澳台使用该数据包的补充数据。
// 用于城市和区县差异化定价选择器。

import mainlandPcaJson from 'china-division/dist/pca.json'
import mainlandPcaCodeJson from 'china-division/dist/pca-code.json'
import hkMoTwJson from 'china-division/dist/HK-MO-TW.json'

type ProvinceCityAreaData = Record<string, Record<string, string[]>>
type RegionCodeNode = { code: string; name: string; children?: RegionCodeNode[] }

const mainlandPca = mainlandPcaJson as ProvinceCityAreaData
const mainlandPcaCode = mainlandPcaCodeJson as RegionCodeNode[]
const hkMoTw = hkMoTwJson as ProvinceCityAreaData

const municipalities = new Set(['北京市', '天津市', '上海市', '重庆市'])
const directlyAdministeredCityGroups = new Set([
  '省直辖县级行政区划',
  '自治区直辖县级行政区划',
])

export const provinceToCities: Record<string, string[]> = {}
export const cityToDistricts: Record<string, string[]> = {}
export const regionCodeByPath: Record<string, string> = {}
export const regionPathByCode: Record<string, string[]> = {}
export const regionPathByLegacyName: Record<string, string[]> = {}

const pathKey = (path: string[]) => path.join('\u0000')

function registerRegion(path: string[], code: string) {
  regionCodeByPath[pathKey(path)] = code
  regionPathByCode[code] = path
  const name = path[path.length - 1]
  // 旧数据只有名称，重名时无法无损还原，固定取数据集中第一个匹配项。
  if (!regionPathByLegacyName[name]) regionPathByLegacyName[name] = path
}

function addProvince(province: string, cities: Record<string, string[]>) {
  if (municipalities.has(province)) {
    provinceToCities[province] = [province]
    cityToDistricts[province] = Object.values(cities).flat()
    return
  }

  const cityNames: string[] = []
  for (const [city, districts] of Object.entries(cities)) {
    // 海南、新疆的直辖县级市本身已是级联的最后一级。
    if (directlyAdministeredCityGroups.has(city)) {
      for (const countyLevelCity of districts) {
        cityNames.push(countyLevelCity)
        cityToDistricts[countyLevelCity] = []
      }
      continue
    }

    cityNames.push(city)
    cityToDistricts[city] = districts
  }
  provinceToCities[province] = cityNames
}

for (const [province, cities] of Object.entries(mainlandPca)) {
  addProvince(province, cities)
}

for (const [province, cities] of Object.entries(hkMoTw)) {
  addProvince(province, cities)
}

for (const province of mainlandPcaCode) {
  if (municipalities.has(province.name)) {
    registerRegion([province.name, province.name], province.code)
    for (const group of province.children || []) {
      for (const district of group.children || []) {
        registerRegion([province.name, province.name, district.name], district.code)
      }
    }
    continue
  }

  for (const city of province.children || []) {
    if (directlyAdministeredCityGroups.has(city.name)) {
      for (const countyLevelCity of city.children || []) {
        registerRegion([province.name, countyLevelCity.name], countyLevelCity.code)
      }
      continue
    }

    registerRegion([province.name, city.name], city.code)
    for (const district of city.children || []) {
      registerRegion([province.name, city.name, district.name], district.code)
    }
  }
}

// 港澳台数据没有统一的大陆行政区划代码，使用完整路径作为稳定且唯一的键。
for (const [province, cities] of Object.entries(hkMoTw)) {
  for (const [city, districts] of Object.entries(cities)) {
    registerRegion([province, city], `path:${province}/${city}`)
    for (const district of districts) {
      registerRegion([province, city, district], `path:${province}/${city}/${district}`)
    }
  }
}

// china-division 的港澳台补充数据中未收录这两个县。
provinceToCities['台湾省'].push('金门县', '连江县')
cityToDistricts['金门县'] = ['金城镇', '金湖镇', '金沙镇', '金宁乡', '烈屿乡', '乌丘乡']
cityToDistricts['连江县'] = ['南竿乡', '北竿乡', '莒光乡', '东引乡']
for (const county of ['金门县', '连江县']) {
  registerRegion(['台湾省', county], `path:台湾省/${county}`)
  for (const district of cityToDistricts[county]) {
    registerRegion(['台湾省', county, district], `path:台湾省/${county}/${district}`)
  }
}
