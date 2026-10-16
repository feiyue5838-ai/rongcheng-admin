const fs = require('fs');
const path = require('path');

const adminSource = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'utils', 'regions.ts'),
  'utf8',
);

function readAdminJson(name) {
  const match = adminSource.match(new RegExp(`export const ${name}(?:\\s*:[^=]+)?\\s*=\\s*(.+);`));
  if (!match) throw new Error(`管理端生成文件缺少 ${name}`);
  return JSON.parse(match[1]);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const fields = [
  'provinces',
  'provinceToCities',
  'cityToDistricts',
  'provinceCodes',
  'cityCodes',
  'regionCodeByPath',
  'regionPathByCode',
  'regionPathByLegacyName',
];
const admin = Object.fromEntries(fields.map((field) => [field, readAdminJson(field)]));
const NUL = '\u0000';

function getCityCode(data, city, province) {
  if (!city) return '';
  const name = city.endsWith('市') ? city : `${city}市`;
  if (province) {
    const exact = data.regionCodeByPath[[province, city].join(NUL)]
      || data.regionCodeByPath[[province, name].join(NUL)];
    if (exact) return exact;
  }
  return data.cityCodes[city] || data.cityCodes[name] || '';
}

function validateAdminIntegrity() {
  const pathEntries = Object.entries(admin.regionCodeByPath);
  const reverseEntries = Object.entries(admin.regionPathByCode);

  assert(admin.provinces.length === 31, `省级节点应为 31，实际 ${admin.provinces.length}`);
  assert(new Set(admin.provinces).size === admin.provinces.length, '省级节点名称不唯一');
  assert(Object.keys(admin.provinceCodes).length === admin.provinces.length, '省级名称和代码数量不一致');
  assert(pathEntries.length === reverseEntries.length, '地区路径和反向代码数量不一致');
  assert(new Set(pathEntries.map(([, code]) => code)).size === pathEntries.length, '地区代码不唯一');

  for (const province of admin.provinces) {
    const cities = admin.provinceToCities[province];
    assert(Array.isArray(cities) && cities.length > 0, `省级节点缺少城市列表: ${province}`);
    assert(admin.provinceCodes[province], `省级节点缺少代码: ${province}`);
    assert(new Set(cities).size === cities.length, `城市名称重复: ${province}`);

    for (const city of cities) {
      assert(Array.isArray(admin.cityToDistricts[city]), `城市缺少区县列表: ${province}/${city}`);
      assert(admin.cityCodes[city], `城市缺少代码: ${province}/${city}`);
    }
  }

  for (const [pathKey, code] of pathEntries) {
    assert(code, `地区 ${pathKey} 缺少稳定代码`);
    assert(
      JSON.stringify(admin.regionPathByCode[code]) === JSON.stringify(pathKey.split(NUL)),
      `地区代码反向映射错误: ${pathKey} -> ${code}`,
    );
  }

  for (const [legacyName, regionPath] of Object.entries(admin.regionPathByLegacyName)) {
    assert(Array.isArray(regionPath) && regionPath.length >= 2, `旧地区名称映射无效: ${legacyName}`);
    assert(admin.regionCodeByPath[regionPath.join(NUL)], `旧地区名称缺少稳定路径: ${legacyName}`);
  }

  const expectedCodes = {
    ['北京市\u0000北京市']: '110000',
    ['四川省\u0000成都市\u0000武侯区']: '510107',
    ['河南省\u0000济源市']: '419001',
    ['湖北省\u0000潜江市']: '429005',
    ['海南省\u0000儋州市']: '460400',
  };
  for (const [pathKey, expected] of Object.entries(expectedCodes)) {
    assert(admin.regionCodeByPath[pathKey] === expected, `${pathKey} 应映射到 ${expected}`);
  }
  assert(
    admin.regionCodeByPath['海南省\u0000儋州市\u0000那大镇'] === 'path:海南省/儋州市/那大镇',
    '没有高德代码的回填镇街应使用唯一 path: 键',
  );
  assert(getCityCode(admin, '潜江市', '湖北省') === '429005', '省市路径应解析潜江市代码');
  assert(getCityCode(admin, '济源', '河南省') === '419001', '无“市”后缀也应解析济源市代码');

  const cityCount = Object.values(admin.provinceToCities).reduce((sum, list) => sum + list.length, 0);
  const districtCount = Object.values(admin.cityToDistricts).reduce((sum, list) => sum + list.length, 0);
  console.log(
    `region integrity ok: provinces=${admin.provinces.length}, cities=${cityCount}, districts=${districtCount}, paths=${pathEntries.length}`,
  );
}

function validateCrossProjectAlignment() {
  const taroRoot = process.env.TARO_ROOT || path.resolve(__dirname, '..', '..', 'taro');
  const taroEntry = path.join(taroRoot, 'src', 'utils', 'region-data.js');
  assert(
    fs.existsSync(taroEntry),
    `跨项目校验需要 Taro 区域数据，请设置 TARO_ROOT；未找到: ${taroEntry}`,
  );

  const taro = require(taroEntry);
  for (const field of fields) {
    assert(
      JSON.stringify(admin[field]) === JSON.stringify(taro[field]),
      `管理端与小程序 ${field} 不一致`,
    );
  }
  assert(typeof taro.getCityCode === 'function', '小程序缺少 getCityCode');
  assert(taro.getCityCode('潜江市', '湖北省') === '429005', '小程序应解析潜江市代码');
  assert(taro.getCityCode('济源', '河南省') === '419001', '小程序应解析无“市”后缀的济源市代码');
  console.log(`region cross-project alignment ok: ${taroEntry}`);
}

validateAdminIntegrity();
if (process.argv.includes('--cross-project')) validateCrossProjectAlignment();
