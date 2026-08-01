<template>
  <div class="newspapers-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>报纸仓库</h2>
      <el-button type="primary" @click="showDialog('add')">
        <el-icon><Plus /></el-icon>
        新增报纸
      </el-button>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-row">
      <div class="stat-card blue">
        <div class="stat-icon">📰</div>
        <div class="stat-info">
          <div class="stat-num">{{ stats.total }}</div>
          <div class="stat-label">报纸总数</div>
        </div>
      </div>
      <div class="stat-card green">
        <div class="stat-icon">✅</div>
        <div class="stat-info">
          <div class="stat-num">{{ stats.active }}</div>
          <div class="stat-label">正常合作</div>
        </div>
      </div>
      <div class="stat-card gray">
        <div class="stat-icon">⏸️</div>
        <div class="stat-info">
          <div class="stat-num">{{ stats.inactive }}</div>
          <div class="stat-label">已停用</div>
        </div>
      </div>
      <div class="stat-card cyan">
        <div class="stat-icon">📊</div>
        <div class="stat-info">
          <div class="stat-num">{{ stats.avgPrice }}</div>
          <div class="stat-label">平均单价</div>
        </div>
      </div>
    </div>

    <div class="page-card">
      <!-- 筛选区域 -->
      <div class="filter-row">
        <el-input
          v-model="searchKey"
          placeholder="搜索报纸名称"
          clearable
          prefix-icon="Search"
          style="width: 280px"
        />
        <el-select v-model="filterRegion" placeholder="全部大区" clearable style="width: 130px" @change="onRegionChange">
          <el-option label="全部大区" value="" />
          <el-option label="全国" value="全国" />
          <el-option label="华北" value="华北" />
          <el-option label="东北" value="东北" />
          <el-option label="华东" value="华东" />
          <el-option label="华中" value="华中" />
          <el-option label="华南" value="华南" />
          <el-option label="西南" value="西南" />
          <el-option label="西北" value="西北" />
        </el-select>
        <el-select v-model="filterProvince" placeholder="全部省份" clearable style="width: 150px" @change="onFilterProvinceChange">
          <el-option label="全部省份" value="" />
          <el-option v-for="p in filteredProvinces" :key="p.code" :label="p.name" :value="p.name" />
        </el-select>
        <el-select v-model="filterCity" placeholder="全部城市" clearable style="width: 150px">
          <el-option label="全部城市" value="" />
          <el-option v-for="c in filteredCities" :key="c.code" :label="c.name" :value="c.name" />
        </el-select>
        <el-select v-model="filterStatus" placeholder="全部状态" clearable style="width: 130px">
          <el-option label="全部状态" value="" />
          <el-option label="合作中" :value="1" />
          <el-option label="已停用" :value="0" />
        </el-select>
        <el-select v-model="filterLevel" placeholder="全部级别" clearable style="width: 130px">
          <el-option label="全部级别" value="" />
          <el-option label="国家级" :value="3" />
          <el-option label="省级" :value="2" />
          <el-option label="普通" :value="1" />
        </el-select>
        <el-button type="primary" @click="handleSearch">
          <el-icon><Search /></el-icon>
          查询
        </el-button>
        <el-button @click="handleReset">
          <el-icon><Refresh /></el-icon>
          重置
        </el-button>
      </div>
      <!-- 表格 -->
      <el-table
        :data="displayedNewspapers"
        v-loading="loading"
        stripe
        style="margin-top: 16px"
        row-key="id"
        :expand-row-keys="Array.from(expandedRows)"
      >
        <el-table-column prop="name" label="报纸名称" min-width="160" />
        <el-table-column prop="level" label="级别" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="row.level===3?'danger':row.level===2?'warning':'info'">
              {{ ['','普通','省级','国家级'][row.level] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="region" label="大区" width="90">
          <template #default="{ row }">
            <span>{{ row.region || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="province" label="省份" width="100">
          <template #default="{ row }">
            <span>{{ row.province || '全国' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="city" label="城市" width="100" />
        <el-table-column prop="minWords" label="最少字数" width="90">
          <template #default="{ row }">
            <span>{{ row.minWords || 50 }}字</span>
          </template>
        </el-table-column>
        <el-table-column prop="pricePerWord" label="单价(元/字)" width="110">
          <template #default="{ row }">
            <span class="price">¥{{ parseFloat(row.pricePerWord).toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-switch v-model="row.status" :active-value="1" :inactive-value="0" @change="toggleStatus(row)" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="{ row }">
            <el-button type="info" link size="small" @click="handleExpandChange(row)">
              {{ expandedRows.has(row.id) ? '收起' : '版面' }}
              <el-icon class="el-icon--right" v-if="expandedRows.has(row.id)"><ArrowUp /></el-icon>
              <el-icon class="el-icon--right" v-else><ArrowDown /></el-icon>
            </el-button>
            <el-button type="primary" link size="small" @click="showDialog('edit', row)">编辑</el-button>
            <el-button type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>

        <!-- 展开行：版面列表 -->
        <el-table-column type="expand" width="1">
          <template #default="{ row }">
            <div class="section-expand-wrap">
              <div class="section-expand-header">
                <span class="section-expand-title">{{ row.name }} - 版面管理</span>
                <el-button type="primary" size="small" @click="openAddSection(row)">
                  <el-icon><Plus /></el-icon>新增版面
                </el-button>
              </div>
              <el-table :data="getRowSections(row.id)" size="small" border class="section-table">
                <el-table-column prop="name" label="版面名称" min-width="120" />
                <el-table-column prop="category" label="类别" width="100" />
                <el-table-column prop="listPrice" label="刊例价(元)" width="110">
                  <template #default="{ row: s }">
                    <span class="price">¥{{ Number(s.listPrice || 0).toFixed(2) }}</span>
                  </template>
                </el-table-column>
                <el-table-column prop="deadlineTime" label="截稿时间" width="100" />
                <el-table-column prop="publishCycle" label="见报周期" width="100" />
                <el-table-column prop="sort" label="排序" width="70" />
                <el-table-column prop="status" label="状态" width="70">
                  <template #default="{ row: s }">
                    <el-tag size="small" :type="s.status === 1 ? 'success' : 'info'">{{ s.status === 1 ? '启用' : '停用' }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="remark" label="备注" min-width="120" />
                <el-table-column label="操作" width="130" fixed="right">
                  <template #default="{ row: s }">
                    <el-button type="primary" link size="small" @click="openEditSection(row, s)">编辑</el-button>
                    <el-button type="danger" link size="small" @click="deleteSection(row, s)">删除</el-button>
                  </template>
                </el-table-column>
              </el-table>
              <div v-if="!getRowSections(row.id).length" class="section-empty">
                暂无版面，点击「新增版面」添加
              </div>
            </div>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 分页 -->
      <div class="pagination">
        <span class="pagination-info">共 {{ total }} 条</span>
        <el-pagination
          v-model:current-page="pageNum"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="sizes, prev, pager, next"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
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
        <el-form-item label="版面选择">
          <el-switch v-model="form.enable_sections" :active-value="1" :inactive-value="0" />
          <span style="margin-left: 8px; color: #909399; font-size: 12px">开启后小程序下单可选版面</span>
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

    <!-- 版面管理弹窗 -->
    <el-dialog v-model="sectionDialogVisible" :title="sectionDialogTitle" width="520px">
      <el-form :model="sectionForm" label-width="100px">
        <el-form-item label="版面名称" required>
          <el-input v-model="sectionForm.name" placeholder="如：头版、分类广告版" />
        </el-form-item>
        <el-form-item label="版面类别">
          <el-input v-model="sectionForm.category" placeholder="如：头版、副刊" />
        </el-form-item>
        <el-form-item label="刊例价(元)">
          <el-input-number v-model="sectionForm.list_price" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="截稿时间">
          <el-input v-model="sectionForm.deadline_time" placeholder="如：17:00" />
        </el-form-item>
        <el-form-item label="见报周期">
          <el-select v-model="sectionForm.publish_cycle" placeholder="选择见报周期" clearable style="width: 100%">
            <el-option label="次日见报" value="次日见报" />
            <el-option label="隔日见报" value="隔日见报" />
            <el-option label="3日内见报" value="3日内见报" />
            <el-option label="5日内见报" value="5日内见报" />
            <el-option label="7日内见报" value="7日内见报" />
            <el-option label="一周见报" value="一周见报" />
          </el-select>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="sectionForm.sort" :min="0" style="width: 100%" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="sectionForm.status">
            <el-radio :label="1">启用</el-radio>
            <el-radio :label="0">停用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="sectionForm.remark" type="textarea" rows="2" placeholder="备注信息" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="sectionDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveSection" :loading="sectionLoading">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { getAllNewspapers, getNewspaperCategories, createNewspaper, updateNewspaper, deleteNewspaper, getNewspaperSections, createNewspaperSection, updateNewspaperSection, deleteNewspaperSection } from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, Refresh, ArrowUp, ArrowDown } from '@element-plus/icons-vue'

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
const saving = ref(false)
const sectionLoading = ref(false)
const sectionDialogVisible = ref(false)
const sectionDialogTitle = ref('')
const sectionIsEdit = ref(false)
const currentNewspaperId = ref('')
const editingSectionId = ref('')
const expandedRows = ref<Set<string>>(new Set())
const sections = ref<any[]>([])
const sectionForm = reactive<any>({
  name: '',
  category: '',
  list_price: 0,
  deadline_time: '',
  publish_cycle: '',
  sort: 0,
  status: 1,
  remark: '',
})
const sectionFormRef = ref()
const categories = ref<any[]>([])
const allNewspapers = ref<any[]>([])
const searchKey = ref('')
const filterRegion = ref('')
const filterProvince = ref('')
const filterCity = ref('')
const filterLevel = ref<number | ''>('')
const filterStatus = ref<number | ''>('')
const pageNum = ref(1)
const pageSize = ref(10)
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
  enable_sections: 1,
})

// 当前省份下的城市列表
const currentCities = computed(() => {
  if (!form.provinceCode) return [];
  return CITY_CODES[form.provinceCode] || [];
})

// 三级联动：大区 -> 省份列表
const REGION_PROVINCES: Record<string, string[]> = {
  '全国': [],
  '华北': ['北京市', '天津市', '河北省', '山西省', '内蒙古自治区'],
  '东北': ['辽宁省', '吉林省', '黑龙江省'],
  '华东': ['上海市', '江苏省', '浙江省', '安徽省', '福建省', '江西省', '山东省'],
  '华中': ['河南省', '湖北省', '湖南省'],
  '华南': ['广东省', '广西壮族自治区', '海南省'],
  '西南': ['重庆市', '四川省', '贵州省', '云南省', '西藏自治区'],
  '西北': ['陕西省', '甘肃省', '青海省', '宁夏回族自治区', '新疆维吾尔自治区'],
}

// 筛选后的省份列表
const filteredProvinces = computed(() => {
  if (!filterRegion.value) return PROVINCES
  const provinceNames = REGION_PROVINCES[filterRegion.value] || []
  return PROVINCES.filter(p => provinceNames.includes(p.name))
})

// 筛选后的城市列表
const filteredCities = computed(() => {
  if (!filterProvince.value) return []
  const provinceCode = PROVINCES.find(p => p.name === filterProvince.value)?.code
  if (!provinceCode) return []
  return CITY_CODES[provinceCode] || []
})

// 大区切换 -> 清空省份和城市
function onRegionChange() {
  filterProvince.value = ''
  filterCity.value = ''
}

// 筛选区：省份切换 -> 清空城市
function onFilterProvinceChange() {
  filterCity.value = ''
}

// 表单：省份切换 -> 清空城市 + 自动推导大区
function onProvinceChange() {
  form.cityCode = ''
  if (form.provinceCode) {
    form.region = PROVINCE_TO_REGION[form.provinceCode] || ''
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

// 统计数据
const stats = computed(() => {
  const total = allNewspapers.value.length
  const active = allNewspapers.value.filter(n => n.status === 1).length
  const inactive = allNewspapers.value.filter(n => n.status === 0).length
  const avgPrice = allNewspapers.value.length > 0 
    ? (allNewspapers.value.reduce((sum, n) => sum + parseFloat(n.pricePerWord || 0), 0) / allNewspapers.value.length).toFixed(2)
    : '0.00'
  return { total, active, inactive, avgPrice: `¥${avgPrice}` }
})

// 总数（用于分页）
const total = computed(() => {
  let list = allNewspapers.value
  if (filterRegion.value) {
    list = list.filter(n => n.region === filterRegion.value)
  }
  if (filterProvince.value) {
    const filterName = filterProvince.value.replace(/省$|市$|自治区$/, '')
    list = list.filter(n => {
      const dataName = (n.province || '').replace(/省$|市$|自治区$/, '')
      return dataName === filterName
    })
  }
  if (filterCity.value) {
    const filterName = filterCity.value.replace(/市$/, '')
    list = list.filter(n => {
      const dataName = (n.city || '').replace(/市$/, '')
      return dataName === filterName
    })
  }
  if (filterLevel.value !== '') {
    list = list.filter(n => n.level === filterLevel.value)
  }
  if (filterStatus.value !== '') {
    list = list.filter(n => n.status === filterStatus.value)
  }
  const kw = searchKey.value.trim().toLowerCase()
  if (kw) {
    list = list.filter(n => (n.name || '').toLowerCase().includes(kw))
  }
  return list.length
})

// 筛选后的列表（带分页）
const displayedNewspapers = computed(() => {
  let list = allNewspapers.value
  
  // 大区筛选
  if (filterRegion.value) {
    list = list.filter(n => n.region === filterRegion.value)
  }
  
  // 省份筛选（兼容带/不带"省/市/自治区"后缀）
  if (filterProvince.value) {
    const filterName = filterProvince.value.replace(/省$|市$|自治区$/, '')
    list = list.filter(n => {
      const dataName = (n.province || '').replace(/省$|市$|自治区$/, '')
      return dataName === filterName
    })
  }
  
  // 城市筛选（兼容带/不带"市"后缀）
  if (filterCity.value) {
    const filterName = filterCity.value.replace(/市$/, '')
    list = list.filter(n => {
      const dataName = (n.city || '').replace(/市$/, '')
      return dataName === filterName
    })
  }
  
  // 级别筛选
  if (filterLevel.value !== '') {
    list = list.filter(n => n.level === filterLevel.value)
  }
  
  // 状态筛选
  if (filterStatus.value !== '') {
    list = list.filter(n => n.status === filterStatus.value)
  }
  
  // 关键词搜索
  const kw = searchKey.value.trim().toLowerCase()
  if (kw) {
    list = list.filter(n => (n.name || '').toLowerCase().includes(kw))
  }
  
  // 分页
  const start = (pageNum.value - 1) * pageSize.value
  const end = start + pageSize.value
  return list.slice(start, end)
})

// 查询按钮
function handleSearch() {
  pageNum.value = 1
}

// 重置按钮
function handleReset() {
  searchKey.value = ''
  filterRegion.value = ''
  filterProvince.value = ''
  filterCity.value = ''
  filterLevel.value = ''
  filterStatus.value = ''
  pageNum.value = 1
}

// 分页
function handleSizeChange(val: number) {
  pageSize.value = val
  pageNum.value = 1
}

function handlePageChange(val: number) {
  pageNum.value = val
}

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
      enable_sections: row.enableSections ?? 1,
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
      enable_sections: 1,
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
      enable_sections: form.enable_sections ?? 1,
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

// ==================== 版面管理 ====================
async function handleExpandChange(row: any) {
  if (expandedRows.value.has(row.id)) {
    expandedRows.value.delete(row.id)
    expandedRows.value = new Set(expandedRows.value) // trigger reactivity
    return
  }
  expandedRows.value.add(row.id)
  expandedRows.value = new Set(expandedRows.value) // trigger reactivity
  if (sections.value.find(s => s._newspaperId === row.id)) return
  try {
    const res: any = await getNewspaperSections(row.id)
    const list = res.list || res.data?.list || []
    list.forEach((s: any) => { s._newspaperId = row.id })
    sections.value = [...sections.value.filter(s => s._newspaperId !== row.id), ...list]
  } catch (e: any) {
    ElMessage.error(e?.message || '加载版面失败')
  }
}

function getRowSections(newspaperId: string) {
  return sections.value.filter(s => s._newspaperId === newspaperId)
}

function openAddSection(row: any) {
  currentNewspaperId.value = row.id
  sectionIsEdit.value = false
  sectionDialogTitle.value = `添加版面 - ${row.name}`
  Object.assign(sectionForm, { name: '', category: '', list_price: 0, deadline_time: '', publish_cycle: '', sort: 0, status: 1, remark: '' })
  sectionDialogVisible.value = true
}

function openEditSection(row: any, section: any) {
  currentNewspaperId.value = row.id
  sectionIsEdit.value = true
  editingSectionId.value = section.id
  sectionDialogTitle.value = `编辑版面 - ${row.name}`
  Object.assign(sectionForm, {
    name: section.name,
    category: section.category || '',
    list_price: section.listPrice || 0,
    deadline_time: section.deadlineTime || '',
    publish_cycle: section.publishCycle || '',
    sort: section.sort || 0,
    status: section.status ?? 1,
    remark: section.remark || '',
  })
  sectionDialogVisible.value = true
}

async function saveSection() {
  if (!sectionForm.name) { ElMessage.warning('请填写版面名称'); return }
  sectionLoading.value = true
  try {
    if (sectionIsEdit.value) {
      if (editingSectionId.value) {
        await updateNewspaperSection(currentNewspaperId.value, editingSectionId.value, { ...sectionForm })
      }
    } else {
      await createNewspaperSection(currentNewspaperId.value, { ...sectionForm })
    }
    ElMessage.success('保存成功')
    sectionDialogVisible.value = false
    const rowId = currentNewspaperId.value
    const res: any = await getNewspaperSections(rowId)
    const list = res.list || res.data?.list || []
    list.forEach((s: any) => { s._newspaperId = rowId })
    sections.value = [...sections.value.filter(s => s._newspaperId !== rowId), ...list]
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  } finally {
    sectionLoading.value = false
  }
}

async function deleteSection(row: any, section: any) {
  await ElMessageBox.confirm('确认删除该版面？', '提示')
  try {
    await deleteNewspaperSection(row.id, section.id)
    ElMessage.success('删除成功')
    sections.value = sections.value.filter(s => !(s._newspaperId === row.id && s.id === section.id))
  } catch (e: any) {
    ElMessage.error(e?.message || '删除失败')
  }
}

onMounted(async () => {
  const res: any = await getNewspaperCategories()
  categories.value = res.value || res.data?.list || res.list || res || []
  fetchNewspapers()
})
</script>

<style scoped>
.newspapers-page {
  padding: 0;
}

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

/* 统计卡片 */
.stats-row {
  display: flex;
  gap: 12px;
  padding: 14px 16px;
  background: linear-gradient(135deg, #fafbfc 0%, #f5f7fa 100%);
  border-radius: 10px;
  margin-bottom: 20px;
}

.stat-card {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 32px 18px;
  border-radius: 8px;
  color: #fff;
  min-width: 0;
  min-height: 104px;
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: rgba(255,255,255,.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.stat-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.stat-num {
  font-size: 24px;
  font-weight: 700;
  line-height: 1;
}

.stat-label {
  font-size: 12px;
  opacity: .9;
  margin-top: 4px;
}

.stat-card.blue  { background: linear-gradient(135deg, #5B6FE8, #7B8FFF); }
.stat-card.green { background: linear-gradient(135deg, #52c41a, #73d13d); }
.stat-card.gray  { background: linear-gradient(135deg, #8c8c8c, #bfbfbf); }
.stat-card.cyan  { background: linear-gradient(135deg, #13c2c2, #36cfc9); }

.page-card {
  background: #fff;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 1px 4px rgba(0,0,0,.08);
}

/* 筛选区域 */
.filter-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

/* 价格 */
.price {
  font-weight: 600;
  color: #f56c6c;
}

/* 分页 */
.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.pagination-info {
  font-size: 13px;
  color: #909399;
}

/* 版面展开区 */
.section-expand-wrap {
  padding: 16px 20px;
  background: #f8f9fc;
}

.section-expand-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-expand-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.section-table {
  margin-top: 4px;
  background: #fff;
}

.section-empty {
  text-align: center;
  color: #909399;
  font-size: 13px;
  padding: 16px 0;
}
</style>
