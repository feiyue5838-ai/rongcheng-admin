<template>
  <div class="Outlet-list">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>履约供应商管理</h2>
      <el-button type="primary" @click="openCreateDialog">
        <el-icon><Plus /></el-icon> 新增履约供应商
      </el-button>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-cards" style="margin-bottom: 12px;">
      <div class="stat-card stat-total">
        <div class="stat-icon"><el-icon><LocationFilled /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">{{ total }}</div>
          <div class="stat-label">履约供应商总数</div>
        </div>
      </div>
      <div class="stat-card stat-active">
        <div class="stat-icon"><el-icon><CircleCheckFilled /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">{{ statusCountMap[1] || 0 }}</div>
          <div class="stat-label">营业中</div>
        </div>
      </div>
      <div class="stat-card stat-inactive">
        <div class="stat-icon"><el-icon><VideoPause /></el-icon>️</div>
        <div class="stat-info">
          <div class="stat-value">{{ (statusCountMap[0] || 0) + (statusCountMap[2] || 0) + (statusCountMap[4] || 0) + (statusCountMap[5] || 0) }}</div>
          <div class="stat-label">非营业</div>
        </div>
      </div>
      <div class="stat-card stat-orders">
        <div class="stat-icon"><el-icon><Box /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">{{ totalOrders }}</div>
          <div class="stat-label">累计订单</div>
        </div>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-row" style="background: #fff; padding: 14px 16px; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); margin-bottom: 12px;">
      <el-input
        v-model="keyword"
        placeholder="搜索履约供应商名称/联系人/电话"
        clearable
        prefix-icon="Search"
        style="width: 220px; margin-right: 12px"
        @keyup.enter="() => { currentPage = 1; loadData() }"
      />
      <el-select v-model="region" placeholder="全部大区" clearable style="width: 110px; margin-right: 12px" @change="onRegionChange">
        <el-option label="全部大区" value="" />
        <el-option label="华北" value="华北" />
        <el-option label="东北" value="东北" />
        <el-option label="华东" value="华东" />
        <el-option label="华中" value="华中" />
        <el-option label="华南" value="华南" />
        <el-option label="西南" value="西南" />
        <el-option label="西北" value="西北" />
        <el-option label="港澳台" value="港澳台" />
      </el-select>
      <el-select v-model="province" placeholder="全部省份" clearable style="width: 120px; margin-right: 12px" @change="onProvinceChange">
        <el-option label="全部省份" value="" />
        <el-option v-for="p in filteredProvinces" :key="p.code" :label="p.name" :value="p.name" />
      </el-select>
      <el-select v-model="city" placeholder="全部城市" clearable style="width: 120px; margin-right: 12px" @change="onFilterChange">
        <el-option label="全部城市" value="" />
        <el-option v-for="c in filteredCities" :key="c.code" :label="c.name" :value="c.name" />
      </el-select>
      <el-select v-model="status" placeholder="全部状态" clearable style="width: 110px; margin-right: 12px" @change="onFilterChange">
        <el-option label="全部" value="" />
        <el-option label="营业中" :value="1" />
        <el-option label="已歇业" :value="0" />
        <el-option label="合作中" :value="2" />
        <el-option label="审核中" :value="3" />
        <el-option label="已暂停" :value="4" />
        <el-option label="已终止" :value="5" />
      </el-select>
            <el-select v-model="businessType" placeholder="全部类型" clearable style="width: 120px; margin-right: 12px" @change="onFilterChange">
        <el-option label="全部类型" value="" />
        <el-option label="刻章" value="seal" />
        <el-option label="登报" value="newspaper" />
        <el-option label="代理记账" value="accounting" />
      </el-select>
      <el-button @click="resetFilters">重置</el-button>
    </div>

    <!-- 表格 -->
    <el-table :data="tableData" stripe v-loading="loading">
      <el-table-column prop="name" label="履约供应商名称" min-width="160" show-overflow-tooltip />
      <el-table-column prop="contact" label="联系人" width="100" />
      <el-table-column prop="phone" label="联系电话" width="130" />
      <el-table-column label="所在地区" width="180" show-overflow-tooltip>
        <template #default="{ row }">
          {{ [row.province, row.city, row.district].filter(Boolean).join(' ') || '-' }}
        </template>
      </el-table-column>
      <el-table-column prop="address" label="详细地址" min-width="150" show-overflow-tooltip />
      <el-table-column label="业务类型" width="150">
        <template #default="{ row }">
          <template v-if="row.businessTypes && row.businessTypes.length">
            <el-tag v-for="bt in row.businessTypes" :key="bt.id" size="small" style="margin-right:4px">{{ bt.name }}</el-tag>
          </template>
          <span v-else style="color:#999">-</span>
        </template>
      </el-table-column>
      <el-table-column prop="totalOrders" label="累计订单" width="100" align="center">
        <template #default="{ row }"><el-tag type="info">{{ row.totalOrders }}</el-tag></template>
      </el-table-column>
      <el-table-column label="证件" width="130">
        <template #default="{ row }">
          <el-button link type="primary" size="small" :disabled="!row.businessLicense" @click="previewDocs(row, 'biz')">执照</el-button>
          <el-button link type="primary" size="small" :disabled="parsePermits(row.specialPermits).length === 0" @click="previewDocs(row, 'permits')">特种({{ parsePermits(row.specialPermits).length }})</el-button>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)" size="small">
            {{ getStatusText(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="创建时间" width="170">
        <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="openEditDialog(row)">编辑</el-button>
          <el-button type="warning" link size="small" @click="onResetPassword(row)">重置密码</el-button>
          <el-button type="success" link size="small" @click="openAuthDialog(row)">授权</el-button>
          <el-button type="danger" link size="small" @click="onDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 汇总 -->
    <div class="list-summary" v-if="!loading">
      共 {{ total }} 个履约供应商
    </div>

    <!-- 分页 -->
    <div class="list-pagination" v-if="total > 0">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[50, 100, 200]"
        :total="total"
        layout="sizes, prev, pager, next, total"
        background
        @current-change="loadData"
        @size-change="(s: number) => { currentPage = 1; loadData() }"
      />
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑履约供应商' : '新增履约供应商'"
      width="520px"
      :close-on-click-modal="false"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="履约供应商名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入履约供应商名称" maxlength="50" />
        </el-form-item>
        <el-form-item label="联系人" prop="contact">
          <el-input v-model="form.contact" placeholder="请输入联系人姓名" maxlength="20" />
        </el-form-item>
        <el-form-item label="联系电话" prop="phone">
          <el-input v-model="form.phone" placeholder="请输入手机号" maxlength="11" />
        </el-form-item>
        <el-form-item label="所在地区" required>
          <el-row :gutter="8" style="width:100%">
            <el-col :span="8">
              <el-form-item prop="province">
                <el-input v-model="form.province" placeholder="省份" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item prop="city">
                <el-input v-model="form.city" placeholder="城市" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item prop="district">
                <el-input v-model="form.district" placeholder="区县" />
              </el-form-item>
            </el-col>
          </el-row>
        </el-form-item>
        <el-form-item label="详细地址" prop="address">
          <el-input v-model="form.address" placeholder="请输入详细地址" maxlength="200" />
        </el-form-item>
        <el-form-item label="营业执照">
          <el-upload v-if="!form.businessLicense" :show-file-list="false" :before-upload="beforeUpload" :http-request="uploadBiz">
            <el-button type="primary" plain><el-icon><Plus /></el-icon> 上传营业执照</el-button>
          </el-upload>
          <div v-else class="license-preview">
            <img :src="form.businessLicense" fit="cover" style="width:100px;height:100px;border-radius:8px;object-fit:cover;display:block;" />
            <el-button type="danger" link size="small" @click="form.businessLicense = ''">移除</el-button>
          </div>
        </el-form-item>
        <el-form-item label="特种证件">
          <el-upload list-type="picture-card" :auto-upload="true" :before-upload="beforeUpload" :http-request="uploadPermit" v-model:file-list="permitFiles" :limit="6" multiple>
            <el-icon><Plus /></el-icon>
          </el-upload>
          <div style="font-size:12px;color:#999">支持多张（特种行业许可证等），最多 6 张</div>
        </el-form-item>
        <el-form-item v-if="isEdit" label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio :label="1">营业中</el-radio>
            <el-radio :label="0">已歇业</el-radio>
            <el-radio :label="2">合作中</el-radio>
            <el-radio :label="3">审核中</el-radio>
            <el-radio :label="4">已暂停</el-radio>
            <el-radio :label="5">已终止</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="结算周期" prop="settlementCycle">
          <el-select v-model="form.settlementCycle" placeholder="留空则手动结算" clearable style="width:100%">
            <el-option label="留空（手动）" :value="null" />
            <el-option label="每天（每日结算）" value="daily" />
            <el-option label="每周（每周固定日结算）" value="weekly" />
            <el-option label="每月（每月1号结算上月）" value="monthly" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.settlementCycle === 'weekly'" label="每周起算日" prop="settlementWeeklyStartDay">
          <el-select v-model="form.settlementWeeklyStartDay" style="width:100%">
            <el-option label="周日" :value="0" />
            <el-option label="周一（推荐）" :value="1" />
            <el-option label="周二" :value="2" />
            <el-option label="周三" :value="3" />
            <el-option label="周四" :value="4" />
            <el-option label="周五" :value="5" />
            <el-option label="周六" :value="6" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="onSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 重置密码 -->
    <el-dialog v-model="passwordDialogVisible" title="重置密码" width="420px" @closed="passwordResult = ''; showPwd = false">
      <!-- 确认阶段 -->
      <div v-if="!passwordResult">
        <p>确定要重置履约供应商「<strong>{{ currentOutlet?.name }}</strong>」的登录密码吗？</p>
        <p style="color:#666;margin-top:8px">重置后请将新密码告知履约供应商管理人员。</p>
      </div>
      <!-- 结果阶段 -->
      <div v-else style="text-align:center;padding:16px 0">
        <p style="margin-bottom:12px;color:#666">新密码为：</p>
        <div style="
          display:inline-flex;align-items:center;gap:12px;
          background:#FFF7E6;border:2px solid #E6A23C;border-radius:8px;
          padding:16px 24px;margin-bottom:12px;
        ">
          <span style="font-size:28px;font-weight:700;letter-spacing:4px;color:#E6A23C;font-family:monospace">
            {{ showPwd ? passwordResult : maskedPwd }}
          </span>
          <el-button size="small" @click="showPwd = !showPwd">{{ showPwd ? '隐藏' : '显示' }}</el-button>
          <el-button size="small" @click="copyToClipboard(passwordResult)">复制</el-button>
        </div>
        <p style="color:#999;font-size:13px">请立即复制保存，关闭后无法再次查看</p>
      </div>
      <template #footer>
        <el-button v-if="!passwordResult" @click="passwordDialogVisible = false">取消</el-button>
        <el-button v-if="!passwordResult" type="warning" :loading="submitting" @click="onConfirmReset">确认重置</el-button>
        <el-button v-else type="primary" @click="passwordDialogVisible = false">我已保存</el-button>
      </template>
    </el-dialog>

    <!-- 证件预览 -->
    <el-dialog v-model="previewVisible" title="证件预览" width="760px" @closed="previewList = []">
      <div v-if="previewList.length" style="display:flex;flex-wrap:wrap;gap:12px">
        <el-image
          v-for="(u, i) in previewList"
          :key="i"
          :src="u"
          :preview-src-list="previewList"
          :initial-index="i"
          fit="cover"
          style="width:200px;height:140px;border-radius:8px"
        />
      </div>
      <div v-else style="color:#999;padding:24px;text-align:center">暂无证件</div>
    </el-dialog>

    <!-- 业务授权弹窗 -->
    <el-dialog v-model="authDialogVisible" :title="'业务授权 - ' + (authOutlet?.name || '')" width="460px">
      <div style="padding:8px 0 16px;color:#666;font-size:14px">勾选该网点可承接的业务类型：</div>
      <el-checkbox-group v-model="authForm.checkedTypes">
        <el-checkbox label="bf454c50-4633-4720-bca1-9f13d1ed0c1b" style="display:block;margin-bottom:12px">
          <span style="font-weight:600">刻章</span>
          <span style="color:#999;font-size:12px;margin-left:8px">企业刻章、个人印章等</span>
        </el-checkbox>
        <el-checkbox label="03d494c6-4a38-43ad-88d5-0d29c55fab85" style="display:block;margin-bottom:12px">
          <span style="font-weight:600">登报</span>
          <span style="color:#999;font-size:12px;margin-left:8px">遗失声明、公告发布等</span>
        </el-checkbox>
        <el-checkbox label="49476a65-8257-45da-a826-7ef80d0cfb61" style="display:block">
          <span style="font-weight:600">代理记账</span>
          <span style="color:#999;font-size:12px;margin-left:8px">月度记账、税务申报等</span>
        </el-checkbox>
      </el-checkbox-group>
      <template #footer>
        <el-button @click="authDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="authSubmitting" @click="onAuthSubmit">保存授权</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, type ComponentPublicInstance } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getOutletsAPI, createOutletAPI, updateOutletAPI, deleteOutletAPI, resetOutletPasswordAPI, uploadImage, setOutletBusinessTypesAPI } from '@/api'
import { formatDate } from '@/utils/format'

// ============ 行政区划数据（与报纸仓库对齐）============
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
  { name: '台湾', code: '71' },
  { name: '香港', code: '81' },
  { name: '澳门', code: '82' },
];

// 城市代码映射
const CITY_CODES: Record<string, { name: string; code: string }[]> = {
  '11': [
    { name: '东城区', code: '110101' }, { name: '西城区', code: '110102' }, { name: '朝阳区', code: '110105' },
    { name: '丰台区', code: '110106' }, { name: '石景山区', code: '110107' }, { name: '海淀区', code: '110108' },
    { name: '门头沟区', code: '110109' }, { name: '房山区', code: '110111' }, { name: '通州区', code: '110112' },
    { name: '顺义区', code: '110113' }, { name: '昌平区', code: '110114' }, { name: '大兴区', code: '110115' },
    { name: '怀柔区', code: '110116' }, { name: '平谷区', code: '110117' }, { name: '密云区', code: '110118' }, { name: '延庆区', code: '110119' },
  ],
  '12': [
    { name: '和平区', code: '120101' }, { name: '河东区', code: '120102' }, { name: '河西区', code: '120103' },
    { name: '南开区', code: '120104' }, { name: '河北区', code: '120105' }, { name: '红桥区', code: '120106' },
    { name: '东丽区', code: '120110' }, { name: '西青区', code: '120111' }, { name: '津南区', code: '120112' },
    { name: '北辰区', code: '120113' }, { name: '武清区', code: '120114' }, { name: '宝坻区', code: '120115' },
    { name: '滨海新区', code: '120116' }, { name: '宁河区', code: '120117' }, { name: '静海区', code: '120118' }, { name: '蓟州区', code: '120119' },
  ],
  '13': [
    { name: '石家庄市', code: '130100' }, { name: '唐山市', code: '130200' }, { name: '秦皇岛市', code: '130300' },
    { name: '邯郸市', code: '130400' }, { name: '邢台市', code: '130500' }, { name: '保定市', code: '130600' },
    { name: '张家口市', code: '130700' }, { name: '承德市', code: '130800' }, { name: '沧州市', code: '130900' },
    { name: '廊坊市', code: '131000' }, { name: '衡水市', code: '131100' },
  ],
  '14': [
    { name: '太原市', code: '140100' }, { name: '大同市', code: '140200' }, { name: '阳泉市', code: '140300' },
    { name: '长治市', code: '140400' }, { name: '晋城市', code: '140500' }, { name: '朔州市', code: '140600' },
    { name: '晋中市', code: '140700' }, { name: '运城市', code: '140800' }, { name: '忻州市', code: '140900' },
    { name: '临汾市', code: '141000' }, { name: '吕梁市', code: '141100' },
  ],
  '15': [
    { name: '呼和浩特市', code: '150100' }, { name: '包头市', code: '150200' }, { name: '乌海市', code: '150300' },
    { name: '赤峰市', code: '150400' }, { name: '通辽市', code: '150500' }, { name: '鄂尔多斯市', code: '150600' },
    { name: '呼伦贝尔市', code: '150700' }, { name: '巴彦淖尔市', code: '150800' }, { name: '乌兰察布市', code: '150900' },
    { name: '兴安盟', code: '152200' }, { name: '锡林郭勒盟', code: '152500' }, { name: '阿拉善盟', code: '152900' },
  ],
  '21': [
    { name: '沈阳市', code: '210100' }, { name: '大连市', code: '210200' }, { name: '鞍山市', code: '210300' },
    { name: '抚顺市', code: '210400' }, { name: '本溪市', code: '210500' }, { name: '丹东市', code: '210600' },
    { name: '锦州市', code: '210700' }, { name: '营口市', code: '210800' }, { name: '阜新市', code: '210900' },
    { name: '辽阳市', code: '211000' }, { name: '盘锦市', code: '211100' }, { name: '铁岭市', code: '211200' },
    { name: '朝阳市', code: '211300' }, { name: '葫芦岛市', code: '211400' },
  ],
  '22': [
    { name: '长春市', code: '220100' }, { name: '吉林市', code: '220200' }, { name: '四平市', code: '220300' },
    { name: '辽源市', code: '220400' }, { name: '通化市', code: '220500' }, { name: '白山市', code: '220600' },
    { name: '松原市', code: '220700' }, { name: '白城市', code: '220800' }, { name: '延边朝鲜族自治州', code: '222400' },
  ],
  '23': [
    { name: '哈尔滨市', code: '230100' }, { name: '齐齐哈尔市', code: '230200' }, { name: '鸡西市', code: '230300' },
    { name: '鹤岗市', code: '230400' }, { name: '双鸭山市', code: '230500' }, { name: '大庆市', code: '230600' },
    { name: '伊春市', code: '230700' }, { name: '佳木斯市', code: '230800' }, { name: '七台河市', code: '230900' },
    { name: '牡丹江市', code: '231000' }, { name: '黑河市', code: '231100' }, { name: '绥化市', code: '231200' },
    { name: '大兴安岭地区', code: '232700' },
  ],
  '31': [
    { name: '黄浦区', code: '310101' }, { name: '徐汇区', code: '310104' }, { name: '长宁区', code: '310105' },
    { name: '静安区', code: '310106' }, { name: '普陀区', code: '310107' }, { name: '虹口区', code: '310109' },
    { name: '杨浦区', code: '310110' }, { name: '闵行区', code: '310112' }, { name: '宝山区', code: '310113' },
    { name: '嘉定区', code: '310114' }, { name: '浦东新区', code: '310115' }, { name: '金山区', code: '310116' },
    { name: '松江区', code: '310117' }, { name: '青浦区', code: '310118' }, { name: '奉贤区', code: '310120' }, { name: '崇明区', code: '310151' },
  ],
  '32': [
    { name: '南京市', code: '320100' }, { name: '无锡市', code: '320200' }, { name: '徐州市', code: '320300' },
    { name: '常州市', code: '320400' }, { name: '苏州市', code: '320500' }, { name: '南通市', code: '320600' },
    { name: '连云港市', code: '320700' }, { name: '淮安市', code: '320800' }, { name: '盐城市', code: '320900' },
    { name: '扬州市', code: '321000' }, { name: '镇江市', code: '321100' }, { name: '泰州市', code: '321200' },
    { name: '宿迁市', code: '321300' },
  ],
  '33': [
    { name: '杭州市', code: '330100' }, { name: '宁波市', code: '330200' }, { name: '温州市', code: '330300' },
    { name: '嘉兴市', code: '330400' }, { name: '湖州市', code: '330500' }, { name: '绍兴市', code: '330600' },
    { name: '金华市', code: '330700' }, { name: '衢州市', code: '330800' }, { name: '舟山市', code: '330900' },
    { name: '台州市', code: '331000' }, { name: '丽水市', code: '331100' },
  ],
  '34': [
    { name: '合肥市', code: '340100' }, { name: '芜湖市', code: '340200' }, { name: '蚌埠市', code: '340300' },
    { name: '淮南市', code: '340400' }, { name: '马鞍山市', code: '340500' }, { name: '淮北市', code: '340600' },
    { name: '铜陵市', code: '340700' }, { name: '安庆市', code: '340800' }, { name: '黄山市', code: '341000' },
    { name: '滁州市', code: '341100' }, { name: '阜阳市', code: '341200' }, { name: '宿州市', code: '341300' },
    { name: '六安市', code: '341500' }, { name: '亳州市', code: '341600' }, { name: '池州市', code: '341700' },
    { name: '宣城市', code: '341800' },
  ],
  '35': [
    { name: '福州市', code: '350100' }, { name: '厦门市', code: '350200' }, { name: '莆田市', code: '350300' },
    { name: '三明市', code: '350400' }, { name: '泉州市', code: '350500' }, { name: '漳州市', code: '350600' },
    { name: '南平市', code: '350700' }, { name: '龙岩市', code: '350800' }, { name: '宁德市', code: '350900' },
  ],
  '36': [
    { name: '南昌市', code: '360100' }, { name: '景德镇市', code: '360200' }, { name: '萍乡市', code: '360300' },
    { name: '九江市', code: '360400' }, { name: '新余市', code: '360500' }, { name: '鹰潭市', code: '360600' },
    { name: '赣州市', code: '360700' }, { name: '吉安市', code: '360800' }, { name: '宜春市', code: '360900' },
    { name: '抚州市', code: '361000' }, { name: '上饶市', code: '361100' },
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
    { name: '恩施土家族苗族自治州', code: '422800' },
  ],
  '43': [
    { name: '长沙市', code: '430100' }, { name: '株洲市', code: '430200' }, { name: '湘潭市', code: '430300' },
    { name: '衡阳市', code: '430400' }, { name: '邵阳市', code: '430500' }, { name: '岳阳市', code: '430600' },
    { name: '常德市', code: '430700' }, { name: '张家界市', code: '430800' }, { name: '益阳市', code: '430900' },
    { name: '郴州市', code: '431000' }, { name: '永州市', code: '431100' }, { name: '怀化市', code: '431200' },
    { name: '娄底市', code: '431300' }, { name: '湘西土家族苗族自治州', code: '433100' },
  ],
  '44': [
    { name: '广州市', code: '440100' }, { name: '韶关市', code: '440200' }, { name: '深圳市', code: '440300' },
    { name: '珠海市', code: '440400' }, { name: '汕头市', code: '440500' }, { name: '佛山市', code: '440600' },
    { name: '江门市', code: '440700' }, { name: '湛江市', code: '440800' }, { name: '茂名市', code: '440900' },
    { name: '肇庆市', code: '441200' }, { name: '惠州市', code: '441300' }, { name: '梅州市', code: '441400' },
    { name: '汕尾市', code: '441500' }, { name: '河源市', code: '441600' }, { name: '阳江市', code: '441700' },
    { name: '清远市', code: '441800' }, { name: '东莞市', code: '441900' }, { name: '中山市', code: '442000' },
    { name: '潮州市', code: '445100' }, { name: '揭阳市', code: '445200' }, { name: '云浮市', code: '445300' },
  ],
  '45': [
    { name: '南宁市', code: '450100' }, { name: '柳州市', code: '450200' }, { name: '桂林市', code: '450300' },
    { name: '梧州市', code: '450400' }, { name: '北海市', code: '450500' }, { name: '防城港市', code: '450600' },
    { name: '钦州市', code: '450700' }, { name: '贵港市', code: '450800' }, { name: '玉林市', code: '450900' },
    { name: '百色市', code: '451000' }, { name: '贺州市', code: '451100' }, { name: '河池市', code: '451200' },
    { name: '来宾市', code: '451300' }, { name: '崇左市', code: '451400' },
  ],
  '46': [
    { name: '海口市', code: '460100' }, { name: '三亚市', code: '460200' }, { name: '三沙市', code: '460300' },
    { name: '儋州市', code: '460400' },
  ],
  '50': [
    { name: '涪陵区', code: '500102' }, { name: '万州区', code: '500101' }, { name: '渝中区', code: '500103' }, { name: '大渡口区', code: '500104' },
    { name: '江北区', code: '500105' }, { name: '沙坪坝区', code: '500106' }, { name: '九龙坡区', code: '500107' },
    { name: '南岸区', code: '500108' }, { name: '北碚区', code: '500109' }, { name: '綦江区', code: '500110' },
    { name: '大足区', code: '500111' }, { name: '渝北区', code: '500112' }, { name: '巴南区', code: '500113' },
    { name: '黔江区', code: '500114' }, { name: '长寿区', code: '500115' }, { name: '江津区', code: '500116' },
    { name: '合川区', code: '500117' }, { name: '永川区', code: '500118' }, { name: '南川区', code: '500119' },
    { name: '璧山区', code: '500120' }, { name: '铜梁区', code: '500121' }, { name: '潼南区', code: '500123' },
    { name: '荣昌区', code: '500125' }, { name: '开州区', code: '500154' }, { name: '梁平区', code: '500155' },
    { name: '武隆区', code: '500156' }, { name: '城口县', code: '500229' }, { name: '丰都县', code: '500230' },
    { name: '垫江县', code: '500231' }, { name: '忠县', code: '500233' }, { name: '云阳县', code: '500235' },
    { name: '奉节县', code: '500236' }, { name: '巫山县', code: '500237' }, { name: '巫溪县', code: '500238' },
    { name: '石柱土家族自治县', code: '500240' }, { name: '秀山土家族苗族自治县', code: '500241' }, { name: '酉阳土家族苗族自治县', code: '500242' }, { name: '彭水苗族土家族自治县', code: '500243' },
  ],
  '51': [
    { name: '成都市', code: '510100' }, { name: '自贡市', code: '510300' }, { name: '攀枝花市', code: '510400' },
    { name: '泸州市', code: '510500' }, { name: '德阳市', code: '510600' }, { name: '绵阳市', code: '510700' },
    { name: '广元市', code: '510800' }, { name: '遂宁市', code: '510900' }, { name: '内江市', code: '511000' },
    { name: '乐山市', code: '511100' }, { name: '南充市', code: '511300' }, { name: '眉山市', code: '511400' },
    { name: '宜宾市', code: '511500' }, { name: '广安市', code: '511600' }, { name: '达州市', code: '511700' },
    { name: '雅安市', code: '511800' }, { name: '巴中市', code: '511900' }, { name: '资阳市', code: '512000' },
    { name: '阿坝藏族羌族自治州', code: '513200' }, { name: '甘孜藏族自治州', code: '513300' }, { name: '凉山彝族自治州', code: '513400' },
  ],
  '52': [
    { name: '贵阳市', code: '520100' }, { name: '六盘水市', code: '520200' }, { name: '遵义市', code: '520300' },
    { name: '安顺市', code: '520400' }, { name: '毕节市', code: '520500' }, { name: '铜仁市', code: '520600' },
    { name: '黔西南布依族苗族自治州', code: '522300' }, { name: '黔东南苗族侗族自治州', code: '522600' }, { name: '黔南布依族苗族自治州', code: '522700' },
  ],
  '53': [
    { name: '昆明市', code: '530100' }, { name: '曲靖市', code: '530300' }, { name: '玉溪市', code: '530400' },
    { name: '保山市', code: '530500' }, { name: '昭通市', code: '530600' }, { name: '丽江市', code: '530700' },
    { name: '普洱市', code: '530800' }, { name: '临沧市', code: '530900' }, { name: '楚雄彝族自治州', code: '532300' },
    { name: '红河哈尼族彝族自治州', code: '532500' }, { name: '文山壮族苗族自治州', code: '532600' }, { name: '西双版纳傣族自治州', code: '532800' },
    { name: '大理白族自治州', code: '532900' }, { name: '德宏傣族景颇族自治州', code: '533100' }, { name: '怒江傈僳族自治州', code: '533300' },
    { name: '迪庆藏族自治州', code: '533400' },
  ],
  '54': [
    { name: '拉萨市', code: '540100' }, { name: '日喀则市', code: '540200' }, { name: '昌都市', code: '540300' },
    { name: '林芝市', code: '540400' }, { name: '山南市', code: '540500' }, { name: '那曲市', code: '540600' },
    { name: '阿里地区', code: '542500' },
  ],
  '61': [
    { name: '西安市', code: '610100' }, { name: '铜川市', code: '610200' }, { name: '宝鸡市', code: '610300' },
    { name: '咸阳市', code: '610400' }, { name: '渭南市', code: '610500' }, { name: '延安市', code: '610600' },
    { name: '汉中市', code: '610700' }, { name: '榆林市', code: '610800' }, { name: '安康市', code: '610900' },
    { name: '商洛市', code: '611000' },
  ],
  '62': [
    { name: '兰州市', code: '620100' }, { name: '嘉峪关市', code: '620200' }, { name: '金昌市', code: '620300' },
    { name: '白银市', code: '620400' }, { name: '天水市', code: '620500' }, { name: '武威市', code: '620600' },
    { name: '张掖市', code: '620700' }, { name: '平凉市', code: '620800' }, { name: '酒泉市', code: '620900' },
    { name: '庆阳市', code: '621000' }, { name: '定西市', code: '621100' }, { name: '陇南市', code: '621200' },
    { name: '临夏回族自治州', code: '622900' }, { name: '甘南藏族自治州', code: '623000' },
  ],
  '63': [
    { name: '西宁市', code: '630100' }, { name: '海东市', code: '630200' }, { name: '海北藏族自治州', code: '632200' },
    { name: '黄南藏族自治州', code: '632300' }, { name: '海南藏族自治州', code: '632500' }, { name: '果洛藏族自治州', code: '632600' },
    { name: '玉树藏族自治州', code: '632700' }, { name: '海西蒙古族藏族自治州', code: '632800' },
  ],
  '64': [
    { name: '银川市', code: '640100' }, { name: '石嘴山市', code: '640200' }, { name: '吴忠市', code: '640300' },
    { name: '固原市', code: '640400' }, { name: '中卫市', code: '640500' },
  ],
  '65': [
    { name: '乌鲁木齐市', code: '650100' }, { name: '克拉玛依市', code: '650200' }, { name: '吐鲁番市', code: '650400' },
    { name: '哈密市', code: '650500' }, { name: '昌吉回族自治州', code: '652300' }, { name: '博尔塔拉蒙古自治州', code: '652700' },
    { name: '巴音郭楞蒙古自治州', code: '652800' }, { name: '阿克苏地区', code: '652900' }, { name: '克孜勒苏柯尔克孜自治州', code: '653000' },
    { name: '喀什地区', code: '653100' }, { name: '和田地区', code: '653200' }, { name: '伊犁哈萨克自治州', code: '654000' },
    { name: '塔城地区', code: '654200' }, { name: '阿勒泰地区', code: '654300' },
  ],
  '71': [
    { name: '台北市', code: '710100' }, { name: '高雄市', code: '710200' }, { name: '台中市', code: '710300' },
    { name: '台南市', code: '710400' }, { name: '基隆市', code: '710500' }, { name: '新竹市', code: '710600' },
    { name: '嘉义市', code: '710700' }, { name: '新北市', code: '710800' }, { name: '桃园市', code: '710900' },
    { name: '宜兰县', code: '711000' }, { name: '新竹县', code: '711100' }, { name: '苗栗县', code: '711200' },
    { name: '彰化县', code: '711300' }, { name: '南投县', code: '711400' }, { name: '云林县', code: '711500' },
    { name: '嘉义县', code: '711600' }, { name: '屏东县', code: '711700' }, { name: '台东县', code: '711800' },
    { name: '花莲县', code: '711900' }, { name: '澎湖县', code: '712000' },
    { name: '金门县', code: '712100' }, { name: '连江县', code: '712200' },
  ],
  '81': [{ name: '香港', code: '810100' }],
  '82': [{ name: '澳门', code: '820100' }],
};

// 大区→省份映射
const REGION_PROVINCES: Record<string, string[]> = {
  '华北': ['北京市', '天津市', '河北省', '山西省', '内蒙古自治区'],
  '东北': ['辽宁省', '吉林省', '黑龙江省'],
  '华东': ['上海市', '江苏省', '浙江省', '安徽省', '福建省', '江西省', '山东省'],
  '华中': ['河南省', '湖北省', '湖南省'],
  '华南': ['广东省', '广西壮族自治区', '海南省'],
  '西南': ['重庆市', '四川省', '贵州省', '云南省', '西藏自治区'],
  '西北': ['陕西省', '甘肃省', '青海省', '宁夏回族自治区', '新疆维吾尔自治区'],
  '港澳台': ['台湾', '香港', '澳门'],
};

// 筛选后的省份列表
const filteredProvinces = computed(() => {
  if (!region.value) return PROVINCES
  const names = REGION_PROVINCES[region.value] || []
  return PROVINCES.filter(p => names.includes(p.name))
})

// 筛选后的城市列表
const filteredCities = computed(() => {
  if (!province.value) return []
  const provinceCode = PROVINCES.find(p => p.name === province.value)?.code
  if (!provinceCode) return []
  return CITY_CODES[provinceCode] || []
})

// 大区切换 → 清空省份和城市
function onRegionChange() {
  province.value = ''
  city.value = ''
  loadData()
}

// 省份切换 → 清空城市
function onProvinceChange() {
  city.value = ''
  loadData()
}

// 重置所有筛选条件
function resetFilters() {
  keyword.value = ''
  region.value = ''
  province.value = ''
  city.value = ''
  status.value = ''
  businessType.value = ''
  currentPage.value = 1
  loadData()
}

// 统计计算属性
const statusCountMap = computed(() => {
  const map: Record<number, number> = {}
  tableData.value.forEach(item => {
    map[item.status] = (map[item.status] || 0) + 1
  })
  return map
})

const totalOrders = computed(() => {
  return tableData.value.reduce((sum, item) => sum + (item.totalOrders || 0), 0)
})

const loading = ref(false)
const tableData = ref<any[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(100)
const keyword = ref('')
const status = ref('')
const region = ref('')
const province = ref('')
const city = ref('')
const district = ref('')
const businessType = ref('')
const businessTypeOptions = [
  { label: '刻章', value: 'seal' },
  { label: '登报', value: 'newspaper' },
  { label: '代理记账', value: 'accounting' },
]
const MUNICIPALITIES = ['北京市', '天津市', '上海市', '重庆市']
const isMunicipality = (province: string) => MUNICIPALITIES.includes(province)

const statusOptions = [
  { value: 1, label: '营业中', type: 'success' },
  { value: 0, label: '已歇业', type: 'danger' },
  { value: 2, label: '合作中', type: 'primary' },
  { value: 3, label: '审核中', type: 'warning' },
  { value: 4, label: '已暂停', type: 'info' },
  { value: 5, label: '已终止', type: 'danger' },
]
const getStatusText = (status: number) => statusOptions.find(s => s.value === status)?.label ?? '未知'
const getStatusType = (status: number) => statusOptions.find(s => s.value === status)?.type ?? 'info'

const previewVisible = ref(false)
const previewList = ref<any[]>([])

// 业务授权弹窗
const authDialogVisible = ref(false)
const authOutlet = ref<any>(null)
const authSubmitting = ref(false)
const authForm = reactive({
  checkedTypes: [] as string[],
})
function openAuthDialog(row: any) {
  authOutlet.value = row
  authForm.checkedTypes = (row.businessTypes || []).map((bt: any) => bt.id)
  authDialogVisible.value = true
}
async function onAuthSubmit() {
  if (authSubmitting.value) return
  authSubmitting.value = true
  try {
    const res: any = await setOutletBusinessTypesAPI(authOutlet.value.id, authForm.checkedTypes)
    // 更新表格行数据
    const idx = tableData.value.findIndex(r => r.id === authOutlet.value.id)
    if (idx >= 0) {
      tableData.value[idx] = { ...tableData.value[idx], businessTypes: res.businessTypes }
    }
    ElMessage.success('授权成功')
    authDialogVisible.value = false
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || '授权失败')
  } finally {
    authSubmitting.value = false
  }
}
function previewDocs(row: any, type: string) {
  previewList.value = type === 'biz'
    ? (row.businessLicense ? [row.businessLicense] : [])
    : parsePermits(row.specialPermits)
  previewVisible.value = true
}

const dialogVisible = ref(false)
const passwordDialogVisible = ref(false)
const passwordResult = ref('')
const showPwd = ref(false)
const maskedPwd = computed(() => '•'.repeat((passwordResult.value || '').length || 8))
const isEdit = ref(false)
const submitting = ref(false)
const currentOutlet = ref<any>(null)
const formRef = ref<any>(null)

const form = reactive({
  name: '',
  contact: '',
  phone: '',
  province: '',
  city: '',
  district: '',
  address: '',
  businessLicense: '',
  status: 1,
  businessTypeIds: [] as string[],
  settlementCycle: null as string | null,
  settlementWeeklyStartDay: 1,
})
const permitFiles = ref<any[]>([])
function parsePermits(str: any) {
  try { const a = JSON.parse(str); return Array.isArray(a) ? a : [] } catch { return [] }
}
function beforeUpload(file: any) {
  const ok = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)
  if (!ok) { ElMessage.error('只能上传图片（JPG/PNG/GIF/WebP）'); return false }
  return true
}
async function uploadBiz(option: any) {
  try { const res: any = await uploadImage(option.file); form.businessLicense = res.data?.url ?? res.url; option.onSuccess(res, option.file) }
  catch (e: any) { option.onError(e) }
}
async function uploadPermit(option: any) {
  try { const res: any = await uploadImage(option.file); option.file.url = res.data?.url ?? res.url; option.onSuccess(res, option.file) }
  catch (e: any) { option.onError(e) }
}

const rules = {
  name: [{ required: true, message: '请输入履约供应商名称', trigger: 'blur' }],
  contact: [{ required: true, message: '请输入联系人', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入联系电话', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' },
  ],
}

function openCreateDialog() {
  isEdit.value = false
  Object.assign(form, { name: '', contact: '', phone: '', province: '', city: '', district: '', address: '', businessLicense: '', status: 1, settlementCycle: null, settlementWeeklyStartDay: 1 })
  permitFiles.value = []
  form.businessTypeIds = []
  currentOutlet.value = null
  dialogVisible.value = true
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text)
}

function openEditDialog(row: any) {
  isEdit.value = true
  Object.assign(form, {
    name: row.name,
    contact: row.contact,
    phone: row.phone,
    province: row.province || '',
    city: row.city || '',
    district: row.district || '',
    address: row.address || '',
    businessLicense: row.businessLicense || '',
    status: row.status,
    settlementCycle: row.settlementCycle ?? null,
    settlementWeeklyStartDay: row.settlementWeeklyStartDay ?? 1,
  })
  permitFiles.value = parsePermits(row.specialPermits).map(url => ({ url, name: url.split('/').pop() || '证件' }))
  currentOutlet.value = row
  dialogVisible.value = true
}

async function onSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    const payload: any = {
      name: form.name,
      contact: form.contact,
      phone: form.phone,
      province: form.province,
      city: form.city,
      district: form.district,
      address: form.address,
      status: form.status,
      business_license: form.businessLicense,
      special_permits: permitFiles.value
        .filter(f => f.url || f.response?.url)
        .map(f => f.url || f.response?.url),
    }
    // 后端 OutletService 只读 camelCase 字段（settlementCycle / settlementWeeklyStartDay），
    // 此前提交 snake_case 会被静默丢弃，结算周期设置永不生效。
    if (form.settlementCycle != null && form.settlementCycle !== '') {
      payload.settlementCycle = form.settlementCycle
      payload.settlementWeeklyStartDay = form.settlementCycle === 'weekly' ? form.settlementWeeklyStartDay : 1
    } else {
      payload.settlementCycle = null
    }
    if (isEdit.value) {
      await updateOutletAPI(currentOutlet.value.id, payload)
      ElMessage.success('编辑成功')
    } else {
      await createOutletAPI(payload)
      ElMessage.success('新增成功')
    }
    dialogVisible.value = false
    // 编辑后停留在当前页（不再强制跳回第 1 页）；新增回第 1 页便于看到新记录
    loadData(isEdit.value ? currentPage.value : 1)
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

async function onResetPassword(row: any) {
  currentOutlet.value = row
  passwordDialogVisible.value = true
}

async function onConfirmReset() {
  submitting.value = true
  try {
    const res: any = await resetOutletPasswordAPI(currentOutlet.value.id)
    passwordResult.value = res.data?.password ?? res.password
  } catch (err) {
    ElMessage.error((err as any)?.response?.data?.message || '重置失败')
    passwordDialogVisible.value = false
  } finally {
    submitting.value = false
  }
}

async function onDelete(row: any) {
  try {
    await ElMessageBox.confirm(`确定要删除履约供应商「${row.name}」吗？`, '删除确认', { type: 'warning' })
    await deleteOutletAPI(row.id)
    ElMessage.success('删除成功')
    // 删除后停留在当前页（不再强制跳回第 1 页）
    loadData(currentPage.value)
  } catch (err: any) {
    if (err !== 'cancel' && err !== 'close') ElMessage.error(err?.response?.data?.message || '删除失败')
  }
}

// 筛选变更：重置页码后再加载
function onFilterChange() {
  currentPage.value = 1
  loadData()
}

async function loadData(page?: number) {
  if (page) currentPage.value = page; else currentPage.value = 1
  loading.value = true
  try {
    const res = await getOutletsAPI({
      page: currentPage.value,
      pageSize: pageSize.value,
      keyword: keyword.value,
      status: status.value === '' ? undefined : status.value,
      region: region.value === '' ? undefined : region.value,
      province: province.value === '' ? undefined : province.value,
      city: isMunicipality(province.value) ? (province.value || undefined) : (city.value === '' ? undefined : city.value),
      district: isMunicipality(province.value) ? (city.value === '' ? undefined : city.value) : undefined,
      businessType: businessType.value === '' ? undefined : businessType.value,
    })
    tableData.value = (res as any).data?.list ?? (res as any).list ?? []
    total.value = (res as any).data?.pagination?.total ?? (res as any).pagination?.total ?? 0
  } catch (err: any) {
    console.error('Load error:', err)
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>

<style lang="scss" scoped>
.Outlet-list {
  padding: 24px;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.page-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}
.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  align-items: center;
}
.list-summary {
  margin-top: 16px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
.list-pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
.license-preview {
  display: flex;
  align-items: center;
  gap: 8px;
}
/* 特种证件 picture-card 缩到 100x100 */
:deep(.el-form-item:has(.el-upload--picture-card) .el-upload--picture-card),
:deep(.Outlet-list .el-upload--picture-card) {
  width: 100px;
  height: 100px;
}
:deep(.Outlet-list .el-upload--picture-card .el-icon) {
  font-size: 22px;
}

/* 统计卡片 */
.stats-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin: 0 0 12px 0;
}
.stat-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px 24px;
  display: flex;
  align-items: center;
  gap: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
  &:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1); }
}
.stat-card .stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}
.stat-info {
  flex: 1;
}
.stat-value {
  font-size: 30px;
  font-weight: 800;
  line-height: 1;
}
.stat-label {
  font-size: 13px;
  color: #888;
  margin-top: 4px;
}

// 履约供应商总数 — 紫蓝
.stat-total { background: linear-gradient(135deg, #eef2ff 0%, #dde4ff 100%); border: 1px solid rgba(91, 111, 232, 0.15); .stat-icon { background: rgba(91, 111, 232, 0.12); } .stat-value { color: #3d4fc4; } }
// 营业中 — 清新绿
.stat-active { background: linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%); border: 1px solid rgba(82, 196, 26, 0.15); .stat-icon { background: rgba(82, 196, 26, 0.12); } .stat-value { color: #389e0d; } }
// 非营业 — 警示红
.stat-inactive { background: linear-gradient(135deg, #fff1f0 0%, #ffccc7 100%); border: 1px solid rgba(245, 34, 45, 0.15); .stat-icon { background: rgba(245, 34, 45, 0.12); } .stat-value { color: #cf1322; } }
// 累计订单 — 活力橙
.stat-orders { background: linear-gradient(135deg, #fff7e6 0%, #ffe8c2 100%); border: 1px solid rgba(250, 140, 22, 0.15); .stat-icon { background: rgba(250, 140, 22, 0.12); } .stat-value { color: #c87619; } }
</style>

