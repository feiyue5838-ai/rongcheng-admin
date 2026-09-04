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
          <el-alert title="AppSecret 加密保存且不回显；留空表示保持原值。保存后需重启后端服务生效。" type="warning" :closable="false" show-icon />
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

        <el-tab-pane label="刻章配置" name="seal">
          <el-form :model="sealConfig" label-width="160px" style="max-width: 640px">
            <el-form-item label="手持身份证地区">
              <el-input v-model="sealConfig.handheldIdCitiesText" type="textarea" :rows="3" placeholder="多个地区用逗号、顿号或空格分隔，如：上海, 山东, 新疆, 贵阳" />
              <div style="margin-top:6px;color:#909399;font-size:12px;line-height:1.6">企业刻章时，这些地区的法人需上传手持身份证拍照。地区名需与小程序 region 字段匹配（region 为“省 市 区”空格连接，填 上海/山东/新疆/贵阳 即可命中）。</div>
            </el-form-item>
            <el-form-item label="白底自拍照地区">
              <el-input v-model="sealConfig.legalPhotoCitiesText" type="textarea" :rows="3" placeholder="多个地区用逗号、顿号或空格分隔，如：上海, 山东, 新疆, 贵阳" />
              <div style="margin-top:6px;color:#909399;font-size:12px;line-height:1.6">企业/个体户刻章时，这些地区的法人需上传白底自拍照。地区名需与小程序 region 字段匹配；留空则所有地区都不显示该模块。</div>
            </el-form-item>
            <el-form-item label="营业执照正本地区">
              <el-input v-model="sealConfig.licenseOriginalCitiesText" type="textarea" :rows="3" placeholder="多个地区用逗号、顿号或空格分隔，如：上海" />
              <div style="margin-top:6px;color:#909399;font-size:12px;line-height:1.6">命中地区时，营业执照正本照片必传；可与副本地区同时命中。</div>
            </el-form-item>
            <el-form-item label="营业执照副本地区">
              <el-input v-model="sealConfig.licenseCopyCitiesText" type="textarea" :rows="3" placeholder="多个地区用逗号、顿号或空格分隔，如：上海" />
              <div style="margin-top:6px;color:#909399;font-size:12px;line-height:1.6">命中地区时，营业执照副本照片必传；上海同时配置两项时正本、副本都必传。</div>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="sealSaving" @click="saveSealConfig">保存</el-button>
            </el-form-item>
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

      </el-tabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import request from '@/api'
import { ElMessage } from 'element-plus'

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
const runtimeStatus = reactive<any>({
  source: 'environment',
  wechat: { configured: false, appId: '', appSecretConfigured: false, subscribeTemplateConfigured: false },
  payment: { configured: false, mchId: '', apiV3KeyConfigured: false, serialNo: '', privateKeyConfigured: false, certificateConfigured: false, notifyUrlConfigured: false, refundNotifyUrlConfigured: false },
})
const sealSaving = ref(false)
const serviceDetail = ref('')
const serviceSaving = ref(false)
const sealConfig = reactive({
  handheldIdCities: [] as string[], handheldIdCitiesText: '',
  legalPhotoCities: [] as string[], legalPhotoCitiesText: '',
  licenseOriginalCities: [] as string[], licenseOriginalCitiesText: '',
  licenseCopyCities: [] as string[], licenseCopyCitiesText: '',
})

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
  const groups = { business: businessConfig, wechat: wechatConfig, payment: paymentConfig, seal: sealConfig }
  for (const [key, cfg] of Object.entries(groups)) {
    try {
      const res = await request.get('/config/all', { params: { group: key } })
      if (Array.isArray(res)) {
        res.forEach((item: any) => {
          if (key === 'seal') {
            if (item.key === 'handheldIdCities') {
              const arr = asStringArray(item.value)
              sealConfig.handheldIdCities = arr
              sealConfig.handheldIdCitiesText = arr.join('，')
            } else if (item.key === 'legalPhotoCities') {
              const arr = asStringArray(item.value)
              sealConfig.legalPhotoCities = arr
              sealConfig.legalPhotoCitiesText = arr.join('，')
            } else if (item.key === 'licenseOriginalCities') {
              const arr = asStringArray(item.value)
              sealConfig.licenseOriginalCities = arr
              sealConfig.licenseOriginalCitiesText = arr.join('，')
            } else if (item.key === 'licenseCopyCities') {
              const arr = asStringArray(item.value)
              sealConfig.licenseCopyCities = arr
              sealConfig.licenseCopyCitiesText = arr.join('，')
            }
          } else if (cfg.hasOwnProperty(item.key)) {
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
    } catch (e) {
      ElMessage.error(`${key === 'business' ? '业务' : key === 'payment' ? '支付' : '刻章'}配置加载失败`)
    }
  }
  try {
    const status: any = await request.get('/config/runtime-status')
    Object.assign(runtimeStatus, status)
  } catch (e) {
    ElMessage.error('运行时配置状态加载失败')
  }
  await fetchServiceConfig()
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
  } catch (e) {
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
  } catch (e) {
    ElMessage.error('小程序配置保存失败')
  } finally {
    wechatSaving.value = false
  }
}

async function fetchBasicConfig() {
  basicLoading.value = true
  try {
    const about: any = await request.get('/content/about')
    basicConfig.companyName = typeof about?.companyName === 'string' ? about.companyName : ''
    basicConfig.phone = typeof about?.phone === 'string' ? about.phone : ''
    basicConfig.serviceTime = typeof about?.serviceTime === 'string' ? about.serviceTime : ''
    basicConfig.address = typeof about?.address === 'string' ? about.address : ''
  } catch (e) {
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
  } catch (e) {
    ElMessage.error('基本信息保存失败')
  } finally {
    basicSaving.value = false
  }
}

async function saveSealConfig() {
  const parseRegions = (text: string) => [...new Set(text
    .split(/[，,、\s]+/)
    .map((s: string) => s.trim())
    .filter(Boolean))]
  sealSaving.value = true
  try {
    const handheld = parseRegions(sealConfig.handheldIdCitiesText)
    const legal = parseRegions(sealConfig.legalPhotoCitiesText)
    const licenseOriginal = parseRegions(sealConfig.licenseOriginalCitiesText)
    const licenseCopy = parseRegions(sealConfig.licenseCopyCitiesText)
    await request.put('/config/batch', {
      group: 'seal',
      items: [
        { key: 'handheldIdCities', value: handheld },
        { key: 'legalPhotoCities', value: legal },
        { key: 'licenseOriginalCities', value: licenseOriginal },
        { key: 'licenseCopyCities', value: licenseCopy },
      ],
    })
    sealConfig.handheldIdCities = handheld
    sealConfig.legalPhotoCities = legal
    sealConfig.licenseOriginalCities = licenseOriginal
    sealConfig.licenseCopyCities = licenseCopy
    sealConfig.handheldIdCitiesText = handheld.join('，')
    sealConfig.legalPhotoCitiesText = legal.join('，')
    sealConfig.licenseOriginalCitiesText = licenseOriginal.join('，')
    sealConfig.licenseCopyCitiesText = licenseCopy.join('，')
    ElMessage.success('保存成功')
  } catch (e) {
    ElMessage.error('保存失败')
  } finally {
    sealSaving.value = false
  }
}

async function fetchServiceConfig() {
  try {
    const res: any = await request.get('/config', { params: { key: 'bookkeepingServiceDetail' } })
    if (res && typeof res.value === 'string') {
      serviceDetail.value = res.value
    } else {
      serviceDetail.value = ''
    }
  } catch (e) {
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
  } catch (e) {
    ElMessage.error('服务详情保存失败')
  } finally {
    serviceSaving.value = false
  }
}

async function saveConfig(group: string, config: any) {
  try {
    for (const [key, value] of Object.entries(config)) {
      await request.put('/config', { key, value, group })
    }
    ElMessage.success('保存成功')
  } catch (e) {
    ElMessage.error('保存失败: ' + (e as any)?.message || String(e))
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
  } catch (e) {
    ElMessage.error('业务配置保存失败')
  } finally {
    businessSaving.value = false
  }
}

onMounted(fetchConfigs)
</script>
