<template>
  <div>
    <div class="page-header"><h2>系统配置</h2><el-button type="primary" @click="fetchConfigs">刷新</el-button></div>
    <div class="page-card">
      <el-tabs v-model="activeGroup">
        <el-tab-pane label="基本信息" name="basic">
          <el-form :model="basicConfig" label-width="140px" style="max-width: 600px" v-loading="basicLoading">
            <el-form-item label="公司名称"><el-input v-model="basicConfig.companyName" /></el-form-item>
            <el-form-item label="联系电话"><el-input v-model="basicConfig.phone" /></el-form-item>
            <el-form-item label="客服工作时间"><el-input v-model="basicConfig.serviceTime" placeholder="如：周一至周五 9:00-18:00" /></el-form-item>
            <el-form-item label="地址"><el-input v-model="basicConfig.address" /></el-form-item>
            <el-form-item><el-button type="primary" :loading="basicSaving" @click="saveBasicConfig">保存</el-button></el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="小程序配置" name="wechat">
          <el-alert title="AppSecret 加密保存且不回显；留空表示保持原值。保存后即时生效（无需重启后端）。" type="warning" :closable="false" show-icon />
          <el-form :model="wechatConfig" label-width="150px" style="max-width: 760px; margin-top:16px">
            <el-form-item label="AppID"><el-input v-model="wechatConfig.appId" /></el-form-item>
            <el-form-item label="AppSecret"><el-input v-model="wechatConfig.appSecret" type="password" show-password placeholder="留空保持原值" /></el-form-item>
            <el-form-item label="订阅消息模板 ID"><el-input v-model="wechatConfig.subscribeTemplateId" /></el-form-item>
            <el-form-item><el-button type="primary" :loading="wechatSaving" @click="saveWechatConfig">保存小程序配置</el-button></el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="支付配置" name="payment">
          <el-alert title="密钥和证书加密保存且不回显；留空表示保持原值。保存后需重启后端服务生效。" type="warning" :closable="false" show-icon />
          <el-form :model="paymentConfig" label-width="140px" style="max-width: 760px; margin-top:16px">
            <el-form-item label="商户号"><el-input v-model="paymentConfig.mchId" /></el-form-item>
            <el-form-item label="APIv3 密钥"><el-input v-model="paymentConfig.apiV3Key" type="password" show-password placeholder="留空保持原值" /></el-form-item>
            <el-form-item label="证书序列号"><el-input v-model="paymentConfig.serialNo" /></el-form-item>
            <el-form-item label="商户私钥"><el-input v-model="paymentConfig.privateKey" type="textarea" :rows="5" placeholder="PEM 格式，留空保持原值" /></el-form-item>
            <el-form-item label="平台证书"><el-input v-model="paymentConfig.certificate" type="textarea" :rows="5" placeholder="PEM 格式，留空保持原值" /></el-form-item>
            <el-form-item label="支付回调"><el-input v-model="paymentConfig.notifyUrl" /></el-form-item>
            <el-form-item label="退款回调"><el-input v-model="paymentConfig.refundNotifyUrl" /></el-form-item>
            <el-form-item><el-button type="primary" :loading="paymentSaving" @click="savePaymentConfig">保存支付配置</el-button></el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="业务配置" name="business">
          <el-form :model="businessConfig" label-width="140px" style="max-width: 600px">
            <el-form-item label="最低消费(元)"><el-input-number v-model="businessConfig.minOrderAmount" :min="0" :precision="2" /></el-form-item>
            <el-form-item label="免运费门槛(元)"><el-input-number v-model="businessConfig.freeShippingAmount" :min="0" :precision="2" /></el-form-item>
            <el-form-item label="评价奖励积分"><el-input-number v-model="businessConfig.reviewRewardPoints" :min="0" /></el-form-item>
            <el-form-item label="积分抵扣比例"><el-input v-model="businessConfig.pointsRate" placeholder="如：100积分=1元" /></el-form-item>
            <el-form-item><el-button type="primary" :loading="businessSaving" @click="saveBusinessConfig">保存</el-button></el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="客服配置" name="customer-service">
          <el-form :model="customerServiceConfig" label-width="200px" style="max-width: 760px">
            <el-alert
              title="微信小程序使用「客服消息」（open-type=contact）、抖音小程序使用「IM 客服」（open-type=im），两者代码侧无需额外参数，只需在对应平台后台开通并绑定客服人员。支付宝在线客服需填写下面两项。留空表示该平台在线客服未开通，将回退电话拨打。"
              type="info" :closable="false" show-icon
            />
            <el-form-item label="支付宝企业编码(tntInstId)">
              <el-input v-model="customerServiceConfig.alipayTntInstId" placeholder="支付宝开放平台 → 智能客服 → 服务窗配置 → 聊天窗 URL 中的 tntInstId" />
            </el-form-item>
            <el-form-item label="支付宝聊天窗编码(scene)">
              <el-input v-model="customerServiceConfig.alipayScene" placeholder="同上聊天窗 URL 中的 scene" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="customerServiceSaving" @click="saveCustomerServiceConfig">保存</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="刻章配置" name="seal">
          <el-form :model="sealConfig" label-width="160px" class="seal-config-form">
            <el-card shadow="never" class="seal-config-card">
              <template #header>
                <div class="seal-card-header">
                  <div>
                    <div class="seal-card-title">企业刻章 · 地区材料规则</div>
                    <div class="seal-card-description">根据营业执照所在地区，决定企业及个体户刻章需要追加的材料。</div>
                  </div>
                  <el-tag type="primary" effect="plain">企业刻章</el-tag>
                </div>
              </template>

              <div class="seal-enterprise-grid">
                <section class="seal-rule-tile">
                  <div class="seal-rule-tile__header">
                    <span class="seal-rule-tile__title">手持身份证地区</span>
                    <el-tag size="small" type="warning" effect="plain">法人身份</el-tag>
                  </div>
                  <div class="seal-rule-tile__description">命中地区后，法人需上传手持身份证拍照。</div>
                  <RegionMultiPicker v-model="sealConfig.handheldIdCities" />
                  <div class="seal-field-help">支持选择省、市或区县，保存完整行政路径以避免同名地区误命中。</div>
                </section>

                <section class="seal-rule-tile">
                  <div class="seal-rule-tile__header">
                    <span class="seal-rule-tile__title">白底自拍照地区</span>
                    <el-tag size="small" type="warning" effect="plain">法人身份</el-tag>
                  </div>
                  <div class="seal-rule-tile__description">命中地区后，法人需上传白底自拍照。</div>
                  <RegionMultiPicker v-model="sealConfig.legalPhotoCities" />
                  <div class="seal-field-help">这些地区的法人需上传白底自拍照；留空则所有地区都不显示该材料模块。</div>
                </section>

                <section class="seal-rule-tile">
                  <div class="seal-rule-tile__header">
                    <span class="seal-rule-tile__title">营业执照正本地区</span>
                    <el-tag size="small" type="info" effect="plain">营业执照</el-tag>
                  </div>
                  <div class="seal-rule-tile__description">命中地区后，营业执照正本照片必传。</div>
                  <RegionMultiPicker v-model="sealConfig.licenseOriginalCities" />
                  <div class="seal-field-help">未命中正本或副本规则时，默认上传普通营业执照。</div>
                </section>

                <section class="seal-rule-tile">
                  <div class="seal-rule-tile__header">
                    <span class="seal-rule-tile__title">营业执照副本地区</span>
                    <el-tag size="small" type="info" effect="plain">营业执照</el-tag>
                  </div>
                  <div class="seal-rule-tile__description">命中地区后，营业执照副本照片必传。</div>
                  <RegionMultiPicker v-model="sealConfig.licenseCopyCities" />
                  <div class="seal-field-help">命中地区时，营业执照副本照片必传；与正本地区重合时两项都必传。</div>
                </section>
              </div>
            </el-card>

            <el-card shadow="never" class="seal-config-card">
              <template #header>
                <div class="seal-card-header">
                  <div>
                    <div class="seal-card-title">电子印章 · 必传材料</div>
                    <div class="seal-card-description">电子印章使用独立材料规则，不受企业刻章地区规则影响。</div>
                  </div>
                  <el-tag type="success" effect="plain">电子印章</el-tag>
                </div>
              </template>
              <el-form-item label="必传材料">
                <el-checkbox-group v-model="sealConfig.electronicRequired" class="seal-material-grid">
                  <el-checkbox value="license" :disabled="hasSpecificElectronicLicense">营业执照</el-checkbox>
                  <el-checkbox value="licenseOriginal" :disabled="hasGenericElectronicLicense">营业执照正本</el-checkbox>
                  <el-checkbox value="licenseCopy" :disabled="hasGenericElectronicLicense">营业执照副本</el-checkbox>
                  <el-checkbox value="idCardFront">身份证正面</el-checkbox>
                  <el-checkbox value="idCardBack">身份证反面</el-checkbox>
                  <el-checkbox value="legalPhoto">法人白底自拍照</el-checkbox>
                  <el-checkbox value="handheldIdPhoto">法人手持身份证</el-checkbox>
                  <el-checkbox value="professionalCert">执业证书</el-checkbox>
                  <el-checkbox value="signature">个人签名</el-checkbox>
                  <el-checkbox value="additional">补充材料</el-checkbox>
                </el-checkbox-group>
                <div class="seal-field-help">默认全不勾选表示不收任何材料。普通营业执照与正本/副本要求互斥；保存后小程序和 V2 下单接口按同一规则校验。</div>
              </el-form-item>
              <el-form-item label="证书有效期（月）">
                <el-input-number v-model="sealConfig.electronicCertValidMonths" :min="0" :step="1" step-strictly />
                <div class="seal-field-help">电子印章订单创建时按此自动计算证书有效期至（now + N 个月）；0 表示不自动计算。</div>
              </el-form-item>
            </el-card>

            <el-card shadow="never" class="seal-config-card">
              <template #header>
                <div class="seal-card-header">
                  <div>
                    <div class="seal-card-title">用户端功能入口</div>
                    <div class="seal-card-description">控制小程序刻章页面中可供用户访问的功能入口。</div>
                  </div>
                  <el-tag type="info" effect="plain">功能开关</el-tag>
                </div>
              </template>
              <div class="seal-entry-grid">
                <el-form-item label="企业刻章">
                  <el-switch v-model="sealConfig.companyEnabled" active-text="启用" inactive-text="停用" />
                  <div class="seal-field-help">关闭后隐藏入口、阻止直达，并由后端拒绝新建企业刻章订单。</div>
                </el-form-item>
                <el-form-item label="个人印章">
                  <el-switch v-model="sealConfig.personalEnabled" active-text="启用" inactive-text="停用" />
                  <div class="seal-field-help">关闭后隐藏入口、阻止直达，并由后端拒绝新建个人印章订单。</div>
                </el-form-item>
                <el-form-item label="电子印章">
                  <el-switch v-model="sealConfig.electronicEnabled" active-text="启用" inactive-text="停用" />
                  <div class="seal-field-help">关闭后隐藏入口、阻止直达，并由后端拒绝新建电子印章订单。</div>
                </el-form-item>
                <el-form-item label="刻章备案查询">
                  <el-switch v-model="sealConfig.recordQueryEnabled" active-text="启用" inactive-text="停用" />
                  <div class="seal-field-help">关闭后隐藏入口并阻止通过页面链接直接进入查询页。</div>
                </el-form-item>
              </div>
            </el-card>

            <div class="seal-config-actions">
              <el-button type="primary" :loading="sealSaving" @click="saveSealConfig">保存刻章配置</el-button>
            </div>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="登报配置" name="newspaper">
          <el-form :model="newspaperConfig" label-width="160px" class="seal-config-form">
            <el-card shadow="never" class="seal-config-card">
              <template #header>
                <div class="seal-card-header">
                  <div>
                    <div class="seal-card-title">登报业务入口</div>
                    <div class="seal-card-description">分别控制小程序登报页的 16 个业务入口；关闭后隐藏入口、阻止页面直达，并由后端拒绝新建对应订单。</div>
                  </div>
                  <el-tag type="info" effect="plain">16 个独立开关</el-tag>
                </div>
              </template>
              <div class="seal-entry-grid">
                <el-form-item v-for="entry in NEWSPAPER_ENTRY_OPTIONS" :key="entry.configKey" :label="entry.label">
                  <el-switch
                    v-model="newspaperConfig[entry.configKey]"
                    active-text="启用"
                    inactive-text="停用"
                  />
                  <div class="seal-field-help">{{ entry.description }}</div>
                </el-form-item>
              </div>
            </el-card>

            <div class="seal-config-actions">
              <el-button type="primary" :loading="newspaperSaving" @click="saveNewspaperConfig">保存登报配置</el-button>
            </div>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="服务详情" name="service">
          <el-form label-width="140px" style="max-width: 640px">
            <el-form-item label="代理记账服务详情">
              <el-input v-model="serviceDetail" type="textarea" :rows="8" placeholder="多行文本，每行一项，如：&#10;1. 专业会计团队全程服务&#10;2. 智能做账报税" />
              <div style="margin-top:6px;color:#909399;font-size:12px;line-height:1.6">显示在用户端「代理记账 - 服务详情」弹窗（SystemConfig key: bookkeepingServiceDetail）。保存后小程序端进页实时生效，无需发版；留空保存则弹窗显示默认文案。</div>
            </el-form-item>
            <el-form-item><el-button type="primary" :loading="serviceSaving" @click="saveServiceConfig">保存</el-button></el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="搜索热词" name="hotkeywords">
          <el-form label-width="140px" style="max-width: 640px">
            <el-form-item label="热门搜索词">
              <el-input v-model="hotKeywordsText" type="textarea" :rows="8" placeholder="每行一个热词" />
              <div style="margin-top:6px;color:#909399;font-size:12px;line-height:1.6">显示在小程序搜索页「热门搜索」（SystemConfig key: searchHotKeywords）。每行一个词，保存后小程序进搜索页实时生效，无需发版；清空保存则不展示热门词。</div>
            </el-form-item>
            <el-form-item><el-button type="primary" :loading="hotKeywordsSaving" @click="saveHotKeywords">保存</el-button></el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive, onMounted } from 'vue'
import request, {
  getConfigRuntimeStatus,
  getContentAbout,
  getSystemConfig,
  getSystemConfigs,
} from '@/api'
import type { ConfigRuntimeStatus } from '@/api/types'
import { ElMessage } from 'element-plus'
import RegionMultiPicker from '@/components/RegionMultiPicker.vue'

const activeGroup = ref('basic')
const basicConfig = reactive({ companyName: '', phone: '', serviceTime: '', address: '' })
const basicLoading = ref(false)
const basicSaving = ref(false)
const businessConfig = reactive({ minOrderAmount: 0, freeShippingAmount: 0, reviewRewardPoints: 0, pointsRate: '' })
const businessSaving = ref(false)
const paymentSaving = ref(false)
const wechatSaving = ref(false)
const wechatConfig = reactive({ appId: '', appSecret: '', subscribeTemplateId: '' })
const paymentConfig = reactive({ mchId: '', apiV3Key: '', serialNo: '', privateKey: '', certificate: '', notifyUrl: '', refundNotifyUrl: '' })
const runtimeStatus = reactive<ConfigRuntimeStatus>({
  source: 'environment',
  wechat: { configured: false, appId: '', appSecretConfigured: false, subscribeTemplateConfigured: false },
  payment: { enabled: false, mode: 'disabled', configured: false, mchId: '', apiV3KeyConfigured: false, serialNo: '', privateKeyConfigured: false, certificateConfigured: false, notifyUrlConfigured: false, refundNotifyUrlConfigured: false },
})
const sealSaving = ref(false)
const newspaperSaving = ref(false)
const serviceDetail = ref('')
const serviceSaving = ref(false)
const hotKeywordsText = ref('')
const hotKeywordsSaving = ref(false)
const customerServiceConfig = reactive({ alipayTntInstId: '', alipayScene: '' })
const customerServiceSaving = ref(false)
const sealConfig = reactive({
  handheldIdCities: [] as string[],
  legalPhotoCities: [] as string[],
  licenseOriginalCities: [] as string[],
  licenseCopyCities: [] as string[],
  electronicRequired: [] as string[],
  electronicCertValidMonths: 0,
  companyEnabled: true,
  personalEnabled: true,
  electronicEnabled: true,
  recordQueryEnabled: true,
})
const hasGenericElectronicLicense = computed(() => sealConfig.electronicRequired.includes('license'))
const hasSpecificElectronicLicense = computed(() =>
  sealConfig.electronicRequired.includes('licenseOriginal') || sealConfig.electronicRequired.includes('licenseCopy'))

const NEWSPAPER_ENTRY_OPTIONS = [
  { id: 1, label: '身份证挂失', configKey: 'newspaperIdcardEnabled', description: '控制身份证挂失登报入口。' },
  { id: 2, label: '个人证件', configKey: 'newspaperPersonalDocsEnabled', description: '控制个人证件遗失登报入口。' },
  { id: 3, label: '企业证件', configKey: 'newspaperCompanyDocsEnabled', description: '控制企业证件遗失登报入口。' },
  { id: 4, label: '发票收据', configKey: 'newspaperInvoiceReceiptEnabled', description: '控制发票、收据遗失登报入口。' },
  { id: 5, label: '声明公告', configKey: 'newspaperAnnouncementEnabled', description: '控制声明公告登报入口。' },
  { id: 6, label: '公告声明', configKey: 'newspaperAnnouncementStatementEnabled', description: '控制公告声明登报入口。' },
  { id: 7, label: '法院公告', configKey: 'newspaperCourtEnabled', description: '控制法院公告登报入口。' },
  { id: 8, label: '政府送达', configKey: 'newspaperGovernmentEnabled', description: '控制政府送达登报入口。' },
  { id: 9, label: '债权债务', configKey: 'newspaperCreditorEnabled', description: '控制债权债务公告入口。' },
  { id: 10, label: '解除劳动', configKey: 'newspaperLaborEnabled', description: '控制解除劳动关系公告入口。' },
  { id: 11, label: '环评公示', configKey: 'newspaperEnvEnabled', description: '控制环境影响评价公示入口。' },
  { id: 12, label: '拍卖公告', configKey: 'newspaperAuctionEnabled', description: '控制拍卖公告登报入口。' },
  { id: 13, label: '登报道歉', configKey: 'newspaperApologyEnabled', description: '控制登报道歉入口。' },
  { id: 14, label: '表扬信', configKey: 'newspaperPraiseEnabled', description: '控制表扬信登报入口。' },
  { id: 15, label: '宣传稿', configKey: 'newspaperPublicityEnabled', description: '控制宣传稿登报入口。' },
  { id: 16, label: '招标公告', configKey: 'newspaperBiddingEnabled', description: '控制招标公告登报入口。' },
] as const

const newspaperConfig = reactive<Record<string, boolean>>(
  Object.fromEntries(NEWSPAPER_ENTRY_OPTIONS.map(entry => [entry.configKey, true])),
)

const ELECTRONIC_MATERIAL_KEYS = new Set([
  'license', 'licenseOriginal', 'licenseCopy', 'idCardFront', 'idCardBack',
  'legalPhoto', 'handheldIdPhoto', 'professionalCert', 'signature', 'additional',
])

function normalizeElectronicRequired(value: unknown): string[] {
  const normalized = [...new Set(asStringArray(value).filter(key => ELECTRONIC_MATERIAL_KEYS.has(key)))]
  if (normalized.includes('licenseOriginal') || normalized.includes('licenseCopy')) {
    return normalized.filter(key => key !== 'license')
  }
  return normalized
}

function asBoolean(value: unknown, fallback = true): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase()
    if (['1', 'true', 'on', 'yes'].includes(v)) return true
    if (['0', 'false', 'off', 'no'].includes(v)) return false
  }
  return fallback
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String)
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed.map(String) : []
    } catch { return [] }
  }
  return []
}

async function fetchConfigs() {
  await fetchBasicConfig()
  const groups = { business: businessConfig, wechat: wechatConfig, payment: paymentConfig, seal: sealConfig, newspaper: newspaperConfig }
  for (const [key, cfg] of Object.entries(groups)) {
    try {
      const res = await getSystemConfigs(key)
      if (Array.isArray(res)) {
        res.forEach((item) => {
          if (key === 'seal') {
            if (item.key === 'handheldIdCities') {
              sealConfig.handheldIdCities = asStringArray(item.value)
            } else if (item.key === 'legalPhotoCities') {
              sealConfig.legalPhotoCities = asStringArray(item.value)
            } else if (item.key === 'licenseOriginalCities') {
              sealConfig.licenseOriginalCities = asStringArray(item.value)
            } else if (item.key === 'licenseCopyCities') {
              sealConfig.licenseCopyCities = asStringArray(item.value)
            } else if (item.key === 'electronicRequiredMaterials') {
              sealConfig.electronicRequired = normalizeElectronicRequired(item.value)
            } else if (item.key === 'electronicCertValidMonths') {
              sealConfig.electronicCertValidMonths = Number(item.value) || 0
            } else if (item.key === 'sealCompanyEnabled') {
              sealConfig.companyEnabled = asBoolean(item.value, true)
            } else if (item.key === 'sealPersonalEnabled') {
              sealConfig.personalEnabled = asBoolean(item.value, true)
            } else if (item.key === 'sealElectronicEnabled') {
              sealConfig.electronicEnabled = asBoolean(item.value, true)
            } else if (item.key === 'sealRecordQueryEnabled') {
              sealConfig.recordQueryEnabled = asBoolean(item.value, true)
            }
          } else if (key === 'newspaper' && Object.prototype.hasOwnProperty.call(newspaperConfig, item.key)) {
            newspaperConfig[item.key] = asBoolean(item.value, true)
          } else if (Object.prototype.hasOwnProperty.call(cfg, item.key)) {
            if ((key === 'payment' && ['apiV3Key', 'privateKey', 'certificate'].includes(item.key)) || (key === 'wechat' && item.key === 'appSecret')) return
            if (key === 'business' && ['minOrderAmount', 'freeShippingAmount', 'reviewRewardPoints'].includes(item.key)) {
              const value = Number(item.value)
              Object.assign(cfg, { [item.key]: Number.isFinite(value) ? value : 0 })
            } else {
              Object.assign(cfg, { [item.key]: item.value })
            }
          }
        })
      }
    } catch {
      const groupNames: Record<string, string> = { business: '业务', wechat: '小程序', payment: '支付', seal: '刻章', newspaper: '登报' }
      ElMessage.error(`${groupNames[key] || key}配置加载失败`)
    }
  }
  try {
    const status = await getConfigRuntimeStatus()
    Object.assign(runtimeStatus, status)
  } catch {
    ElMessage.error('运行时配置状态加载失败')
  }
  await fetchServiceConfig()
  await fetchHotKeywords()
  await fetchCustomerServiceConfig()
}

async function savePaymentConfig() {
  paymentSaving.value = true
  try {
    const secrets = new Set(['apiV3Key', 'privateKey', 'certificate'])
    const items = Object.entries(paymentConfig)
      .filter(([key, value]) => !secrets.has(key) || String(value).trim() !== '')
      .map(([key, value]) => ({ key, value: String(value).trim() }))
    await request.put('/config/batch', { group: 'payment', items })
    paymentConfig.apiV3Key = ''
    paymentConfig.privateKey = ''
    paymentConfig.certificate = ''
    ElMessage.success('支付配置已保存，重启后端后生效')
    await fetchConfigs()
  } catch {
    ElMessage.error('支付配置保存失败')
  } finally {
    paymentSaving.value = false
  }
}

async function saveWechatConfig() {
  wechatSaving.value = true
  try {
    const items = [
      { key: 'appId', value: wechatConfig.appId.trim() },
      { key: 'subscribeTemplateId', value: wechatConfig.subscribeTemplateId.trim() },
      ...(wechatConfig.appSecret.trim() ? [{ key: 'appSecret', value: wechatConfig.appSecret.trim() }] : []),
    ]
    await request.put('/config/batch', { group: 'wechat', items })
    wechatConfig.appSecret = ''
    ElMessage.success('小程序配置已保存，重启后端后生效')
    await fetchConfigs()
  } catch {
    ElMessage.error('小程序配置保存失败')
  } finally {
    wechatSaving.value = false
  }
}

async function fetchBasicConfig() {
  basicLoading.value = true
  try {
    const about = await getContentAbout()
    basicConfig.companyName = typeof about?.companyName === 'string' ? about.companyName : ''
    basicConfig.phone = typeof about?.phone === 'string' ? about.phone : ''
    basicConfig.serviceTime = typeof about?.serviceTime === 'string' ? about.serviceTime : ''
    basicConfig.address = typeof about?.address === 'string' ? about.address : ''
  } catch {
    ElMessage.error('基本信息加载失败')
  } finally {
    basicLoading.value = false
  }
}

async function saveBasicConfig() {
  const payload = {
    companyName: basicConfig.companyName.trim(),
    phone: basicConfig.phone.trim(),
    serviceTime: basicConfig.serviceTime.trim(),
    address: basicConfig.address.trim(),
  }
  if (payload.phone && !/^[0-9+()\-\s]{5,30}$/.test(payload.phone)) {
    ElMessage.warning('请输入有效的联系电话')
    return
  }
  basicSaving.value = true
  try {
    await request.put('/content/about', payload)
    Object.assign(basicConfig, payload)
    ElMessage.success('保存成功')
  } catch {
    ElMessage.error('基本信息保存失败')
  } finally {
    basicSaving.value = false
  }
}

async function saveSealConfig() {
  sealSaving.value = true
  try {
    sealConfig.electronicRequired = normalizeElectronicRequired(sealConfig.electronicRequired)
    await request.put('/config/batch', {
      group: 'seal',
      items: [
        { key: 'handheldIdCities', value: [...sealConfig.handheldIdCities] },
        { key: 'legalPhotoCities', value: [...sealConfig.legalPhotoCities] },
        { key: 'licenseOriginalCities', value: [...sealConfig.licenseOriginalCities] },
        { key: 'licenseCopyCities', value: [...sealConfig.licenseCopyCities] },
        { key: 'electronicRequiredMaterials', value: [...sealConfig.electronicRequired] },
        { key: 'electronicCertValidMonths', value: Number(sealConfig.electronicCertValidMonths) },
        { key: 'sealCompanyEnabled', value: sealConfig.companyEnabled ? '1' : '0' },
        { key: 'sealPersonalEnabled', value: sealConfig.personalEnabled ? '1' : '0' },
        { key: 'sealElectronicEnabled', value: sealConfig.electronicEnabled ? '1' : '0' },
        { key: 'sealRecordQueryEnabled', value: sealConfig.recordQueryEnabled ? '1' : '0' },
      ],
    })
    ElMessage.success('保存成功')
  } catch {
    ElMessage.error('保存失败')
  } finally {
    sealSaving.value = false
  }
}

async function fetchServiceConfig() {
  try {
    const res = await getSystemConfig('bookkeepingServiceDetail')
    if (res && typeof res.value === 'string') {
      serviceDetail.value = res.value
    } else {
      serviceDetail.value = ''
    }
  } catch {
    ElMessage.error('服务详情加载失败')
  }
}

async function saveServiceConfig() {
  serviceSaving.value = true
  try {
    await request.put('/config/batch', {
      group: 'service',
      items: [{ key: 'bookkeepingServiceDetail', value: serviceDetail.value }],
    })
    ElMessage.success('保存成功')
  } catch {
    ElMessage.error('服务详情保存失败')
  } finally {
    serviceSaving.value = false
  }
}

async function fetchHotKeywords() {
  try {
    const res = await getSystemConfig('searchHotKeywords')
    hotKeywordsText.value = asStringArray(res?.value).join('\n')
  } catch {
    ElMessage.error('搜索热词加载失败')
  }
}

async function saveHotKeywords() {
  hotKeywordsSaving.value = true
  try {
    const words = [...new Set(hotKeywordsText.value.split('\n').map(w => w.trim()).filter(Boolean))]
    await request.put('/config/batch', {
      group: 'basic',
      items: [{ key: 'searchHotKeywords', value: words }],
    })
    hotKeywordsText.value = words.join('\n')
    ElMessage.success('保存成功')
  } catch {
    ElMessage.error('搜索热词保存失败')
  } finally {
    hotKeywordsSaving.value = false
  }
}

async function fetchCustomerServiceConfig() {
  try {
    const res = await getSystemConfigs('customer-service')
    const items = Array.isArray(res) ? res : []
    customerServiceConfig.alipayTntInstId = ''
    customerServiceConfig.alipayScene = ''
    items.forEach((item) => {
      if (item.key === 'alipayTntInstId') customerServiceConfig.alipayTntInstId = String(item.value ?? '')
      else if (item.key === 'alipayScene') customerServiceConfig.alipayScene = String(item.value ?? '')
    })
  } catch {
    ElMessage.error('客服配置加载失败')
  }
}

async function saveCustomerServiceConfig() {
  customerServiceSaving.value = true
  try {
    await request.put('/config/batch', {
      group: 'customer-service',
      items: [
        { key: 'alipayTntInstId', value: customerServiceConfig.alipayTntInstId.trim() },
        { key: 'alipayScene', value: customerServiceConfig.alipayScene.trim() },
      ],
    })
    ElMessage.success('保存成功')
    await fetchCustomerServiceConfig()
  } catch {
    ElMessage.error('客服配置保存失败')
  } finally {
    customerServiceSaving.value = false
  }
}

async function saveBusinessConfig() {
  businessSaving.value = true
  try {
    await request.put('/config/batch', {
      group: 'business',
      items: [
        { key: 'minOrderAmount', value: Number(businessConfig.minOrderAmount) },
        { key: 'freeShippingAmount', value: Number(businessConfig.freeShippingAmount) },
        { key: 'reviewRewardPoints', value: Math.trunc(Number(businessConfig.reviewRewardPoints)) },
        { key: 'pointsRate', value: businessConfig.pointsRate.trim() },
      ],
    })
    ElMessage.success('保存成功')
    await fetchConfigs()
  } catch {
    ElMessage.error('业务配置保存失败')
  } finally {
    businessSaving.value = false
  }
}

async function saveNewspaperConfig() {
  newspaperSaving.value = true
  try {
    await request.put('/config/batch', {
      group: 'newspaper',
      items: NEWSPAPER_ENTRY_OPTIONS.map(entry => ({
        key: entry.configKey,
        value: newspaperConfig[entry.configKey] ? '1' : '0',
      })),
    })
    ElMessage.success('登报入口配置已保存')
  } catch {
    ElMessage.error('登报入口配置保存失败')
  } finally {
    newspaperSaving.value = false
  }
}

onMounted(fetchConfigs)
</script>

<style scoped>
.seal-config-form {
  max-width: 920px;
}

.seal-config-card + .seal-config-card {
  margin-top: 16px;
}

.seal-config-card :deep(.el-card__header) {
  padding: 16px 20px;
}

.seal-config-card :deep(.el-card__body) {
  padding: 20px;
}

.seal-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.seal-card-title {
  color: #303133;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.5;
}

.seal-card-description,
.seal-field-help {
  color: #909399;
  font-size: 12px;
  line-height: 1.6;
}

.seal-card-description {
  margin-top: 3px;
}

.seal-config-card > :deep(.el-card__body) > .el-form-item:last-child {
  margin-bottom: 0;
}

.seal-enterprise-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.seal-rule-tile {
  min-width: 0;
  padding: 16px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fafafa;
}

.seal-rule-tile__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.seal-rule-tile__title {
  color: #303133;
  font-size: 14px;
  font-weight: 600;
}

.seal-rule-tile__description {
  min-height: 38px;
  margin: 6px 0 12px;
  color: #606266;
  font-size: 12px;
  line-height: 1.6;
}

.seal-field-help {
  width: 100%;
  margin-top: 6px;
}

.seal-material-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  width: 100%;
}

.seal-material-grid :deep(.el-checkbox) {
  margin-right: 16px;
}

.seal-entry-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.seal-entry-grid .el-form-item {
  min-width: 0;
  margin-bottom: 0;
  padding: 16px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fafafa;
}

.seal-config-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 20px;
}

@media (max-width: 768px) {
  .seal-card-header {
    align-items: flex-start;
  }

  .seal-material-grid {
    grid-template-columns: 1fr;
  }

  .seal-enterprise-grid {
    grid-template-columns: 1fr;
  }

  .seal-entry-grid {
    grid-template-columns: 1fr;
  }
}
</style>
