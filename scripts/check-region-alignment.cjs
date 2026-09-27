const fs = require('fs');
const path = require('path');

const taroRoot = process.env.TARO_ROOT || path.resolve(__dirname, '..', '..', 'taro');
const taro = require(path.join(taroRoot, 'src', 'utils', 'region-data.js'));
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

for (const field of fields) {
  const admin = readAdminJson(field);
  assert(
    JSON.stringify(admin) === JSON.stringify(taro[field]),
    `管理端与小程序 ${field} 不一致`,
  );
}

const NUL = '\u0000';
const pathEntries = Object.entries(taro.regionCodeByPath);
const reverseEntries = Object.entries(taro.regionPathByCode);
assert(taro.provinces.length === 31, `省级节点应为 31，实际 ${taro.provinces.length}`);
assert(pathEntries.length === reverseEntries.length, '地区路径和反向代码数量不一致');
assert(new Set(pathEntries.map(([, code]) => code)).size === pathEntries.length, '地区代码不唯一');

for (const [pathKey, code] of pathEntries) {
  assert(code, `地区 ${pathKey} 缺少稳定代码`);
  assert(
    JSON.stringify(taro.regionPathByCode[code]) === JSON.stringify(pathKey.split(NUL)),
    `地区代码反向映射错误: ${pathKey} -> ${code}`,
  );
}

const expectedCodes = {
  ['北京市\u0000北京市']: '110000',
  ['四川省\u0000成都市\u0000武侯区']: '510107',
  ['河南省\u0000济源市']: '419001',
  ['湖北省\u0000潜江市']: '429005',
  ['海南省\u0000儋州市']: '460400',
};
for (const [pathKey, expected] of Object.entries(expectedCodes)) {
  assert(taro.regionCodeByPath[pathKey] === expected, `${pathKey} 应映射到 ${expected}`);
}
assert(
  taro.regionCodeByPath['海南省\u0000儋州市\u0000那大镇'] === 'path:海南省/儋州市/那大镇',
  '没有高德代码的回填镇街应使用唯一 path: 键',
);
assert(taro.getCityCode('潜江市', '湖北省') === '429005', '省市路径应解析潜江市代码');
assert(taro.getCityCode('济源', '河南省') === '419001', '无“市”后缀也应解析济源市代码');

const cityCount = Object.values(taro.provinceToCities).reduce((sum, list) => sum + list.length, 0);
const districtCount = Object.values(taro.cityToDistricts).reduce((sum, list) => sum + list.length, 0);
console.log(`region alignment ok: provinces=${taro.provinces.length}, cities=${cityCount}, districts=${districtCount}, paths=${pathEntries.length}`);
