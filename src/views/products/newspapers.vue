<template>
  <div>
    <div class="page-header">
      <h2>报纸仓库</h2>
      <el-button type="primary" @click="showDialog('add')">添加报纸</el-button>
    </div>

    <div class="page-card">
      <el-input
        v-model="searchKey"
        placeholder="按报纸名称搜索"
        clearable
        prefix-icon="Search"
        style="margin-bottom: 12px; max-width: 320px"
      />
      <el-tabs v-model="activeRegion" class="region-tabs">
        <el-tab-pane :label="`全部 (${regionCounts.all})`" name="" />
        <el-tab-pane :label="`全国 (${regionCounts['全国']})`" name="全国" />
        <el-tab-pane :label="`华北 (${regionCounts['华北']})`" name="华北" />
        <el-tab-pane :label="`东北 (${regionCounts['东北']})`" name="东北" />
        <el-tab-pane :label="`华东 (${regionCounts['华东']})`" name="华东" />
        <el-tab-pane :label="`华中 (${regionCounts['华中']})`" name="华中" />
        <el-tab-pane :label="`华南 (${regionCounts['华南']})`" name="华南" />
        <el-tab-pane :label="`西南 (${regionCounts['西南']})`" name="西南" />
        <el-tab-pane :label="`西北 (${regionCounts['西北']})`" name="西北" />
      </el-tabs>
      <el-table :data="displayedNewspapers" v-loading="loading" stripe>
        <el-table-column prop="name" label="报纸名称" min-width="160" />
        <el-table-column prop="region" label="大区" width="90">
          <template #default="{ row }">
            <el-tag size="small" type="info">{{ row.region || '—' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="province" label="省份" width="100">
          <template #default="{ row }">
            <span>{{ row.province || '全国' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="city" label="城市" width="100" />
        <el-table-column prop="level" label="级别" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="row.level===3?'danger':row.level===2?'warning':''">
              {{ ['','普通','省级','国家级'][row.level] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="pricePerWord" label="单价(元/字)" width="110">
          <template #default="{ row }">¥{{ row.pricePerWord }}</template>
        </el-table-column>
        <el-table-column prop="minWords" label="最少字数" width="90" />
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-switch v-model="row.status" :active-value="1" :inactive-value="0" @change="toggleStatus(row)" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button type="primary" link @click="showDialog('edit', row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑报纸' : '添加报纸'" width="600px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="报纸名称" required>
          <el-input v-model="form.name" placeholder="如：人民日报" />
        </el-form-item>
        <el-form-item label="公告类型" required>
          <el-select v-model="form.categoryId" placeholder="选择公告类型" style="width: 100%">
            <el-option v-for="cat in categories" :key="cat.id" :label="cat.name" :value="cat.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="所属大区" required>
          <el-select v-model="form.region" placeholder="选择大区" style="width: 100%">
            <el-option label="全国（国家级）" value="全国" />
            <el-option label="华北" value="华北" />
            <el-option label="东北" value="东北" />
            <el-option label="华东" value="华东" />
            <el-option label="华中" value="华中" />
            <el-option label="华南" value="华南" />
            <el-option label="西南" value="西南" />
            <el-option label="西北" value="西北" />
          </el-select>
        </el-form-item>
        <el-form-item label="覆盖省份" required>
          <el-select v-model="form.provinceCode" placeholder="选择省份" style="width: 45%" @change="onProvinceChange">
            <el-option label="全国" value="" />
            <el-option v-for="p in provinces" :key="p.code" :label="p.name" :value="p.code" />
          </el-select>
          <el-select v-model="form.cityCode" placeholder="选择城市" style="width: 45%; margin-left: 10px" :disabled="!form.provinceCode">
            <el-option v-for="c in currentCities" :key="c.code" :label="c.name" :value="c.code" />
          </el-select>
        </el-form-item>
        <el-form-item label="级别">
          <el-radio-group v-model="form.level">
            <el-radio :label="1">普通</el-radio>
            <el-radio :label="2">省级</el-radio>
            <el-radio :label="3">国家级</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="单价(元/字)" required>
          <el-input-number v-model="form.pricePerWord" :min="0" :precision="3" style="width: 100%" />
        </el-form-item>
        <el-form-item label="最少字数" required>
          <el-input-number v-model="form.minWords" :min="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" style="width: 100%" />
        </el-form-item>
        <el-form-item label="报纸别名">
          <el-input v-model="form.alias" placeholder="如：北晚" />
        </el-form-item>
        <el-form-item label="出版社">
          <el-input v-model="form.publisher" placeholder="如：北京日报出版社" />
        </el-form-item>
        <el-form-item label="覆盖范围">
          <el-input v-model="form.coverage" placeholder="如：全国发行" />
        </el-form-item>
        <el-form-item label="封面图">
          <el-input v-model="form.image" placeholder="图片URL" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveNewspaper" :loading="saving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { getAllNewspapers, getNewspaperCategories, createNewspaper, updateNewspaper, deleteNewspaper } from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'

// ============ 行政区划数据（与小程序 region-data.js 对齐）============
const PROVINCES = [
  { name: '北京市', code: '11' }, { name: '天津市', code: '12' }, { name: '河北省', code: '13' },
  { name: '山西省', code: '14' }, { name: '内蒙古自治区', code: '15' }, { name: '辽宁省', code: '21' },
  { name: '吉林省', code: '22' }, { name: '黑龙江省', code: '23' }, { name: '上海市', code: '31' },
  { name: '江苏省', code: '32' }, { name: '浙江省', code: '33' }, { name: '安徽省', code: '34' },
  { name: '福建省', code: '35' }, { name: '江西省', code: '36' }, { name: '山东省', code: '37' },
  { name: '河南省', code: '41' }, { name: '湖北省', code: '42' }, { name: '湖南省', code: '43' },
  { name: '广东省', code: '44' }, { name: '广西壮族自治区', code: '45' }, { name: '海南省', code: '46' },
  { name: '重庆市', code: '50' }, { name: '四川省', code: '51' }, { name: '贵州省', code: '52' },
  { name: '云南省', code: '53' }, { name: '西藏自治区', code: '54' }, { name: '陕西省', code: '61' },
  { name: '甘肃省', code: '62' }, { name: '青海省', code: '63' }, { name: '宁夏回族自治区', code: '64' },
  { name: '新疆维吾尔自治区', code: '65' },
];

// 城市代码映射（key = 省份代码）
const CITY_CODES: Record<string, { name: string; code: string }[]> = {
  '51': [
    { name: '成都市', code: '510100' }, { name: '自贡市', code: '510300' }, { name: '攀枝花市', code: '510400' },
    { name: '泸州市', code: '510500' }, { name: '德阳市', code: '510600' }, { name: '绵阳市', code: '510700' },
    { name: '广元市', code: '510800' }, { name: '遂宁市', code: '510900' }, { name: '内江市', code: '511000' },
    { name: '乐山市', code: '511100' }, { name: '南充市', code: '511300' }, { name: '眉山市', code: '511400' },
    { name: '宜宾市', code: '511500' }, { name: '广安市', code: '511600' }, { name: '达州市', code: '511700' },
    { name: '雅安市', code: '511800' }, { name: '巴中市', code: '511900' }, { name: '资阳市', code: '512000' },
  ],
  '44': [
    { name: '广州市', code: '440100' }, { name: '深圳市', code: '440300' }, { name: '珠海市', code: '440400' },
    { name: '东莞市', code: '441900' }, { name: '佛山市', code: '440600' }, { name: '中山市', code: '442000' },
    { name: '惠州市', code: '441300' }, { name: '汕头市', code: '440500' }, { name: '江门市', code: '440700' },
    { name: '湛江市', code: '440800' }, { name: '茂名市', code: '440900' }, { name: '肇庆市', code: '441200' },
    { name: '韶关市', code: '440200' }, { name: '河源市', code: '441600' }, { name: '梅州市', code: '441400' },
    { name: '汕尾市', code: '441500' }, { name: '阳江市', code: '441700' }, { name: '清远市', code: '441800' },
    { name: '潮州市', code: '445100' }, { name: '揭阳市', code: '445200' }, { name: '云浮市', code: '445300' },
  ],
  '33': [
    { name: '杭州市', code: '330100' }, { name: '宁波市', code: '330200' }, { name: '温州市', code: '330300' },
    { name: '嘉兴市', code: '330400' }, { name: '湖州市', code: '330500' }, { name: '绍兴市', code: '330600' },
    { name: '金华市', code: '330700' }, { name: '衢州市', code: '330800' }, { name: '舟山市', code: '330900' },
    { name: '台州市', code: '331000' }, { name: '丽水市', code: '331100' },
  ],
  '32': [
    { name: '南京市', code: '320100' }, { name: '无锡市', code: '320200' }, { name: '徐州市', code: '320300' },
    { name: '常州市', code: '320400' }, { name: '苏州市', code: '320500' }, { name: '南通市', code: '320600' },
    { name: '连云港市', code: '320700' }, { name: '淮安市', code: '320800' }, { name: '盐城市', code: '320900' },
    { name: '扬州市', code: '321000' }, { name: '镇江市', code: '321100' }, { name: '泰州市', code: '321200' },
    { name: '宿迁市', code: '321300' },
  ],
  '37': [
    { name: '济南市', code: '370100' }, { name: '青岛市', code: '370200' }, { name: '淄博市', code: '370300' },
    { name: '枣庄市', code: '370400' }, { name: '东营市', code: '370500' }, { name: '烟台市', code: '370600' },
    { name: '潍坊市', code: '370700' }, { name: '济宁市', code: '370800' }, { name: '泰安市', code: '370900' },
    { name: '威海市', code: '371000' }, { name: '日照市', code: '371100' }, { name: '临沂市', code: '371300' },
    { name: '德州市', code: '371400' }, { name: '聊城市', code: '371500' }, { name: '滨州市', code: '371600' },
    { name: '菏泽市', code: '371700' },
  ],
  '41': [
    { name: '郑州市', code: '410100' }, { name: '开封市', code: '410200' }, { name: '洛阳市', code: '410300' },
    { name: '平顶山市', code: '410400' }, { name: '安阳市', code: '410500' }, { name: '鹤壁市', code: '410600' },
    { name: '新乡市', code: '410700' }, { name: '焦作市', code: '410800' }, { name: '濮阳市', code: '410900' },
    { name: '许昌市', code: '411000' }, { name: '漯河市', code: '411100' }, { name: '三门峡市', code: '411200' },
    { name: '南阳市', code: '411300' }, { name: '商丘市', code: '411400' }, { name: '信阳市', code: '411500' },
    { name: '周口市', code: '411600' }, { name: '驻马店市', code: '411700' },
  ],
  '42': [
    { name: '武汉市', code: '420100' }, { name: '黄石市', code: '420200' }, { name: '十堰市', code: '420300' },
    { name: '宜昌市', code: '420500' }, { name: '襄阳市', code: '420600' }, { name: '鄂州市', code: '420700' },
    { name: '荆门市', code: '420800' }, { name: '孝感市', code: '420900' }, { name: '荆州市', code: '421000' },
    { name: '黄冈市', code: '421100' }, { name: '咸宁市', code: '421200' }, { name: '随州市', code: '421300' },
  ],
  '43': [
    { name: '长沙市', code: '430100' }, { name: '株洲市', code: '430200' }, { name: '湘潭市', code: '430300' },
    { name: '衡阳市', code: '430400' }, { name: '邵阳市', code: '430500' }, { name: '岳阳市', code: '430600' },
    { name: '常德市', code: '430700' }, { name: '张家界市', code: '430800' }, { name: '益阳市', code: '430900' },
    { name: '郴州市', code: '431000' }, { name: '永州市', code: '431100' }, { name: '怀化市', code: '431200' },
    { name: '娄底市', code: '431300' },
  ],
  '13': [
    { name: '石家庄市', code: '130100' }, { name: '唐山市', code: '130200' }, { name: '秦皇岛市', code: '130300' },
    { name: '邯郸市', code: '130400' }, { name: '邢台市', code: '130500' }, { name: '保定市', code: '130600' },
    { name: '张家口市', code: '130700' }, { name: '承德市', code: '130800' }, { name: '沧州市', code: '130900' },
    { name: '廊坊市', code: '131000' }, { name: '衡水市', code: '131100' },
  ],
  '50': [{ name: '重庆', code: '500100' }],
  '31': [{ name: '上海', code: '310100' }],
  '11': [{ name: '北京', code: '110100' }],
  '12': [{ name: '天津', code: '120100' }],
};

// 省份代码 → 大区映射
const PROVINCE_TO_REGION: Record<string, string> = {
  '11': '华北', '12': '华北', '13': '华北', '14': '华北', '15': '华北',
  '21': '东北', '22': '东北', '23': '东北',
  '31': '华东', '32': '华东', '33': '华东', '34': '华东', '35': '华东', '36': '华东', '37': '华东',
  '41': '华中', '42': '华中', '43': '华中',
  '44': '华南', '45': '华南', '46': '华南',
  '50': '西南', '51': '西南', '52': '西南', '53': '西南', '54': '西南',
  '61': '西北', '62': '西北', '63': '西北', '64': '西北', '65': '西北',
};

// 省份代码反向查名称
const PROVINCE_BY_CODE = Object.fromEntries(PROVINCES.map(p => [p.code, p.name]));

// 根据城市代码查名称
function getCityName(code: string): string {
  for (const cities of Object.values(CITY_CODES)) {
    const c = cities.find(c => c.code === code);
    if (c) return c.name;
  }
  return '';
}

// ============ 组件逻辑 ============
const loading = ref(false)
const activeRegion = ref('')
const saving = ref(false)
const categories = ref<any[]>([])
const allNewspapers = ref<any[]>([])
const searchKey = ref('')
const dialogVisible = ref(false)
const isEdit = ref(false)
const provinces = PROVINCES

const form = reactive<any>({
  name: '',
  categoryId: '',
  region: '',
  provinceCode: '',
  cityCode: '',
  level: 1,
  pricePerWord: 0.5,
  minWords: 50,
  alias: '',
  publisher: '',
  coverage: '',
  image: '',
  description: '',
  sort: 0,
  status: 1,
})

// 当前省份下的城市列表
const currentCities = computed(() => {
  if (!form.provinceCode) return [];
  return CITY_CODES[form.provinceCode] || [];
})

function onProvinceChange() {
  form.cityCode = ''; // 切换省份时清空城市
  // 自动推导大区
  if (form.provinceCode) {
    form.region = PROVINCE_TO_REGION[form.provinceCode] || '';
  }
}

async function fetchNewspapers() {
  loading.value = true
  try {
    // 一次性拉全量，前端过滤 + 统计
    const res: any = await getAllNewspapers()
    allNewspapers.value = res.list || []
  } finally {
    loading.value = false
  }
}

// 各 Tab 数量统计
const REGIONS = ['全国', '华北', '东北', '华东', '华中', '华南', '西南', '西北', '港澳台'] as const
const regionCounts = computed(() => {
  const counts: Record<string, number> = { all: allNewspapers.value.length }
  for (const r of REGIONS) counts[r] = 0
  for (const n of allNewspapers.value) {
    if (n.region && counts[n.region] !== undefined) {
      counts[n.region]++
    }
  }
  return counts
})

// Tab + 搜索双重过滤
const displayedNewspapers = computed(() => {
  let list = allNewspapers.value
  if (activeRegion.value) {
    list = list.filter(n => n.region === activeRegion.value)
  }
  const kw = searchKey.value.trim().toLowerCase()
  if (kw) {
    list = list.filter(n => (n.name || '').toLowerCase().includes(kw))
  }
  return list
})

function showDialog(type: string, row?: any) {
  isEdit.value = type === 'edit'
  if (row) {
    Object.assign(form, {
      id: row.id,
      name: row.name || '',
      categoryId: row.categoryId || '',
      region: row.region || '',
      provinceCode: row.provinceCode || '',
      cityCode: row.cityCode || '',
      level: row.level || 1,
      pricePerWord: parseFloat(row.pricePerWord) || 0.5,
      minWords: row.minWords || 50,
      alias: row.alias || '',
      publisher: row.publisher || '',
      coverage: row.coverage || '',
      image: row.image || '',
      description: row.description || '',
      sort: row.sort || 0,
      status: row.status ?? 1,
    })
  } else {
    Object.assign(form, {
      name: '',
      categoryId: '',
      region: '',
      provinceCode: '',
      cityCode: '',
      level: 1,
      pricePerWord: 0.5,
      minWords: 50,
      alias: '',
      publisher: '',
      coverage: '',
      image: '',
      description: '',
      sort: 0,
      status: 1,
    })
  }
  dialogVisible.value = true
}

async function saveNewspaper() {
  if (!form.name) { ElMessage.warning('请填写报纸名称'); return }
  if (!form.categoryId) { ElMessage.warning('请选择公告类型'); return }
  saving.value = true
  try {
    const province = form.provinceCode ? PROVINCE_BY_CODE[form.provinceCode] || '' : '全国';
    const city = form.cityCode ? getCityName(form.cityCode) : '';
    const data = {
      name: form.name,
      categoryId: form.categoryId,
      region: form.region || null,
      province,
      city,
      provinceCode: form.provinceCode,
      cityCode: form.cityCode,
      level: form.level,
      pricePerWord: form.pricePerWord,
      minWords: form.minWords,
      alias: form.alias || null,
      publisher: form.publisher || null,
      coverage: form.coverage || null,
      image: form.image || null,
      description: form.description,
      sort: form.sort,
      status: form.status ?? 1,
    }
    if (isEdit.value) {
      await updateNewspaper(form.id, data)
    } else {
      await createNewspaper(data)
    }
    ElMessage.success('保存成功')
    dialogVisible.value = false
    fetchNewspapers()
  } catch (e: any) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function handleDelete(row: any) {
  await ElMessageBox.confirm('确认删除该报纸？', '提示')
  await deleteNewspaper(row.id)
  ElMessage.success('删除成功')
  fetchNewspapers()
}

async function toggleStatus(row: any) {
  await updateNewspaper(row.id, { status: row.status })
  ElMessage.success('状态已更新')
}

onMounted(async () => {
  const res: any = await getNewspaperCategories()
  categories.value = res.value || res.data?.list || res.list || res || []
  fetchNewspapers()
})
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.page-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}
.page-card {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 4px rgba(0,0,0,.08);
}
:deep(.region-tabs) {
  margin-bottom: 16px;
}
</style>
