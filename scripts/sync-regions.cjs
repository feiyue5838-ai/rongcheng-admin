// 生成省市区县选择器数据（小程序 + 管理后台共用同一份）
// 用法：node scripts/sync-regions.cjs （在 admin 目录或任意位置执行）
//
// 数据源（2026-09 换版）：高德地图行政区划（大陆 31 省，不含港澳台）
//   E:/代码/java/seal-backend/tools/region-data/region-tree.json
// 旧版 2024 数据仅作镇街回填与存档：
//   E:/代码/java/seal-backend/tools/region-data/legacy-2024-region-data.js
//
// 生成规则：
//   1. 直辖市（北京/上海/天津/重庆）：市列合并为省名本身，区县直挂省名下
//      （重庆 = 市辖区26 + 县12 共 38 个，全量保留）
//   2. "省/自治区直辖县级行政区划"（海南、湖北仙桃潜江天门、河南济源、新疆兵团市等）
//      的子项提升为"市"级；其下镇街旧数据有则回填
//   3. 东莞/中山/儋州等新数据无区县的直筒子市，从旧数据回填镇街列表
//   4. 港澳台：按需求不含（旧数据中的台湾省/香港/澳门已去除）
const fs = require('fs');
const path = require('path');

const TREE = require('E:/代码/java/seal-backend/tools/region-data/region-tree.json');
const LEGACY = require('E:/代码/java/seal-backend/tools/region-data/legacy-2024-region-data.js');

const MUNICIPALITIES = new Set(['北京市', '天津市', '上海市', '重庆市']);
const DIRECT_GROUP = /^省直辖县级行政区划$|^自治区直辖县级行政区划$/;

const provinces = [];
const provinceToCities = {};
const cityToDistricts = {};

// 行政区划代码：省 2 位、市 6 位（与旧版 2024 数据格式对齐，直辖市不设市码）
const provinceCodes = {};
const cityCodes = {};

for (const prov of TREE) {
  provinces.push(prov.name);
  provinceCodes[prov.name] = prov.code.slice(0, 2);
  const groups = prov.children || [];

  if (MUNICIPALITIES.has(prov.name)) {
    provinceToCities[prov.name] = [prov.name];
    cityToDistricts[prov.name] = groups.flatMap(g => (g.children || []).map(c => c.name));
    continue;
  }

  const cities = [];
  for (const g of groups) {
    if (DIRECT_GROUP.test(g.name)) {
      for (const c of g.children || []) {
        cities.push(c.name);
        cityToDistricts[c.name] = (LEGACY.cityToDistricts[c.name] || []).length
          ? LEGACY.cityToDistricts[c.name]
          : (c.children || []).map(x => x.name);
      }
    } else {
      cities.push(g.name);
      const list = (g.children || []).map(c => c.name);
      cityToDistricts[g.name] = list.length ? list : (LEGACY.cityToDistricts[g.name] || []);
    }
  }
  provinceToCities[prov.name] = cities;
  if (!MUNICIPALITIES.has(prov.name)) {
    for (const g of groups) cityCodes[g.name] = g.code.padEnd(6, '0');
  }
}

// 旧表兜底：直辖县级市（五指山市/济源市等）旧表有码而新数据不设市码的，沿用旧码
for (const [name, code] of Object.entries(LEGACY.cityCodes || {})) {
  if (!(name in cityCodes) &&
      Object.values(provinceToCities).some(list => list.includes(name))) {
    cityCodes[name] = code;
  }
}

function getProvinceCode(province) {
  return provinceCodes[province] || '';
}

function getCityCode(city, _province) {
  if (!city) return '';
  if (cityCodes[city]) return cityCodes[city];
  // 兼容无"市"后缀的城市名
  const name = city.endsWith('市') ? city : city + '市';
  return cityCodes[name] || '';
}

// ============ 短名适配（seal/newspaper 表单页使用，规则与旧版 2024 数据一致） ============
function shortCityName(fullName) {
  // 按长度降序排列，确保 '特别行政区' 优先于 '行政区'，'行政区' 优先于 '区'
  const suffixes = ['特别行政区', '行政区', '自治州', '自治县', '市辖区', '盟', '旗', '县', '区', '市'];
  for (const s of suffixes) {
    if (fullName.endsWith(s) && fullName !== s) return fullName.slice(0, -s.length);
  }
  return fullName;
}

const provinceShortMap = {
  北京市: '北京', 天津市: '天津', 河北省: '河北', 山西省: '山西',
  内蒙古自治区: '内蒙古', 辽宁省: '辽宁', 吉林省: '吉林', 黑龙江省: '黑龙江',
  上海市: '上海', 江苏省: '江苏', 浙江省: '浙江', 安徽省: '安徽',
  福建省: '福建', 江西省: '江西', 山东省: '山东', 河南省: '河南',
  湖北省: '湖北', 湖南省: '湖南', 广东省: '广东', 广西壮族自治区: '广西',
  海南省: '海南', 重庆市: '重庆', 四川省: '四川', 贵州省: '贵州',
  云南省: '云南', 西藏自治区: '西藏', 陕西省: '陕西', 甘肃省: '甘肃',
  青海省: '青海', 宁夏回族自治区: '宁夏', 新疆维吾尔自治区: '新疆'
};
const provincesShort = provinces.map(p => provinceShortMap[p]).filter(Boolean);
const districtsShort = {};
for (const [provinceFull, citiesFull] of Object.entries(provinceToCities)) {
  const provShort = provinceShortMap[provinceFull];
  if (!provShort) continue;
  districtsShort[provShort] = {};
  for (const cityFull of citiesFull) {
    const cityShort = shortCityName(cityFull);
    // 直辖市：cityFull===provinceFull，区数据挂在省名下
    districtsShort[provShort][cityShort] = cityFull === provinceFull
      ? (cityToDistricts[provinceFull] || [])
      : (cityToDistricts[cityFull] || []);
  }
}

function getCitiesByProvince(provinceFull) {
  return provinceToCities[provinceFull] || [];
}

function getDistrictsByCity(cityFull, provinceFull) {
  if (cityFull === provinceFull) return cityToDistricts[provinceFull] || [];
  return cityToDistricts[cityFull] || [];
}

// ---- 输出 1：taro 小程序（CJS） ----
const taroDest = 'E:/代码/taro/src/utils/region-data.js';
const taroOut = `/**
 * 中国省市区数据 - 三级结构（高德行政区划，2026-09 换版，大陆 31 省，不含港澳台）
 * 自动生成：node admin/scripts/sync-regions.cjs —— 别手改。
 * 数据源与生成规则见 seal-backend tools/region-data/ 与 admin/scripts/sync-regions.cjs 头注释。
 */
const provinces = ${JSON.stringify(provinces)};

const provinceToCities = ${JSON.stringify(provinceToCities)};

const cityToDistricts = ${JSON.stringify(cityToDistricts)};

// 行政区划代码（省 2 位 / 市 6 位，直辖市无市码——与旧版行为一致）
const provinceCodes = ${JSON.stringify(provinceCodes)};

const cityCodes = ${JSON.stringify(cityCodes)};

function getProvinceCode(province) {
  return provinceCodes[province] || '';
}

function getCityCode(city, _province) {
  if (!city) return '';
  if (cityCodes[city]) return cityCodes[city];
  // 兼容无"市"后缀的城市名
  const name = city.endsWith('市') ? city : city + '市';
  return cityCodes[name] || '';
}

// 短名适配（seal/newspaper 表单页使用，规则与旧版一致）
const provincesShort = ${JSON.stringify(provincesShort)};

const districtsShort = ${JSON.stringify(districtsShort)};

function getCitiesByProvince(provinceFull) {
  return provinceToCities[provinceFull] || [];
}

function getDistrictsByCity(cityFull, provinceFull) {
  if (cityFull === provinceFull) return cityToDistricts[provinceFull] || [];
  return cityToDistricts[cityFull] || [];
}

module.exports = { provinces, provinceToCities, cityToDistricts, provinceCodes, cityCodes, getProvinceCode, getCityCode, provincesShort, districtsShort, getCitiesByProvince, getDistrictsByCity };
`;
fs.writeFileSync(taroDest, taroOut);

// ---- 输出 2：admin（ESM + 类型） ----
const adminDest = path.resolve(__dirname, '../src/utils/regions.ts');
const adminOut = `// 自动生成：node scripts/sync-regions.cjs — 源头：高德行政区划（2026-09 换版，大陆 31 省，不含港澳台）
// 小程序 region picker 与后台三级勾选共用同一份结构，别手改。
export const provinces: string[] = ${JSON.stringify(provinces)};
export const provinceToCities: Record<string, string[]> = ${JSON.stringify(provinceToCities)};
export const cityToDistricts: Record<string, string[]> = ${JSON.stringify(cityToDistricts)};

// 行政区划代码（省 2 位 / 市 6 位，直辖市无市码——与旧版行为一致）
export const provinceCodes: Record<string, string> = ${JSON.stringify(provinceCodes)};
export const cityCodes: Record<string, string> = ${JSON.stringify(cityCodes)};
export function getProvinceCode(province: string): string {
  return provinceCodes[province] || '';
}
export function getCityCode(city: string, _province?: string): string {
  if (!city) return '';
  if (cityCodes[city]) return cityCodes[city];
  const name = city.endsWith('市') ? city : city + '市';
  return cityCodes[name] || '';
}

// 短名适配（seal/newspaper 表单页使用，规则与旧版一致）
export const provincesShort: string[] = ${JSON.stringify(provincesShort)};
export const districtsShort: Record<string, Record<string, string[]>> = ${JSON.stringify(districtsShort)};
export function getCitiesByProvince(provinceFull: string): string[] {
  return provinceToCities[provinceFull] || [];
}
export function getDistrictsByCity(cityFull: string, provinceFull: string): string[] {
  if (cityFull === provinceFull) return cityToDistricts[provinceFull] || [];
  return cityToDistricts[cityFull] || [];
}
`;
fs.writeFileSync(adminDest, adminOut);

const cityCount = Object.keys(provinceToCities).reduce((n, p) => n + provinceToCities[p].length, 0);
const districtCount = Object.keys(cityToDistricts).reduce((n, c) => n + cityToDistricts[c].length, 0);
console.log('wrote', taroDest, 'and', adminDest);
console.log('provinces:', provinces.length, '| cities:', cityCount, '| districts(含回填镇街):', districtCount);
