<template>
  <div>
    <div class="page-header"><h2>系统配置</h2><el-button type="primary" @click="fetchConfigs">刷新</el-button></div>
    <div class="page-card">
      <el-tabs v-model="activeGroup">
        <el-tab-pane label="基本信息" name="basic">
          <el-form :model="basicConfig" label-width="140px" style="max-width: 600px">
            <el-form-item label="公司名称"><el-input v-model="basicConfig.companyName" /></el-form-item>
            <el-form-item label="联系电话"><el-input v-model="basicConfig.servicePhone" /></el-form-item>
            <el-form-item label="客服工作时间"><el-input v-model="basicConfig.workHours" placeholder="如：9:00-18:00" /></el-form-item>
            <el-form-item label="地址"><el-input v-model="basicConfig.address" /></el-form-item>
            <el-form-item><el-button type="primary" @click="saveConfig('basic', basicConfig)">保存</el-button></el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="小程序配置" name="wechat">
          <el-form :model="wechatConfig" label-width="140px" style="max-width: 600px">
            <el-form-item label="AppID"><el-input v-model="wechatConfig.appId" /></el-form-item>
            <el-form-item label="AppSecret"><el-input v-model="wechatConfig.appSecret" type="password" show-password /></el-form-item>
            <el-form-item><el-button type="primary" @click="saveConfig('wechat', wechatConfig)">保存</el-button></el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="支付配置" name="payment">
          <el-form :model="paymentConfig" label-width="140px" style="max-width: 600px">
            <el-form-item label="商户号"><el-input v-model="paymentConfig.mchId" /></el-form-item>
            <el-form-item label="API密钥"><el-input v-model="paymentConfig.mchKey" type="password" show-password /></el-form-item>
            <el-form-item label="证书序列号"><el-input v-model="paymentConfig.serial" /></el-form-item>
            <el-form-item label="回调地址"><el-input v-model="paymentConfig.notifyUrl" /></el-form-item>
            <el-form-item><el-button type="primary" @click="saveConfig('payment', paymentConfig)">保存</el-button></el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="业务配置" name="business">
          <el-form :model="businessConfig" label-width="140px" style="max-width: 600px">
            <el-form-item label="最低消费(元)"><el-input-number v-model="businessConfig.minOrderAmount" :min="0" :precision="2" /></el-form-item>
            <el-form-item label="免运费门槛(元)"><el-input-number v-model="businessConfig.freeShippingAmount" :min="0" :precision="2" /></el-form-item>
            <el-form-item label="评价奖励积分"><el-input-number v-model="businessConfig.reviewRewardPoints" :min="0" /></el-form-item>
            <el-form-item label="积分抵扣比例"><el-input v-model="businessConfig.pointsRate" placeholder="如：100积分=1元" /></el-form-item>
            <el-form-item><el-button type="primary" @click="saveConfig('business', businessConfig)">保存</el-button></el-form-item>
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
            <el-form-item>
              <el-button type="primary" @click="saveSealConfig">保存</el-button>
            </el-form-item>
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
const basicConfig = reactive({ companyName: '成都蓉城企业服务有限公司', servicePhone: '', workHours: '', address: '' })
const wechatConfig = reactive({ appId: '', appSecret: '' })
const paymentConfig = reactive({ mchId: '', mchKey: '', serial: '', notifyUrl: '' })
const businessConfig = reactive({ minOrderAmount: 0, freeShippingAmount: 0, reviewRewardPoints: 0, pointsRate: '' })
const sealConfig = reactive<{ handheldIdCities: string[]; handheldIdCitiesText: string; legalPhotoCities: string[]; legalPhotoCitiesText: string }>({ handheldIdCities: [], handheldIdCitiesText: '', legalPhotoCities: [], legalPhotoCitiesText: '' })

async function fetchConfigs() {
  const groups = { basic: basicConfig, wechat: wechatConfig, payment: paymentConfig, business: businessConfig, seal: sealConfig }
  for (const [key, cfg] of Object.entries(groups)) {
    try {
      const res = await request.get('/config/all', { params: { group: key } })
      if (Array.isArray(res)) {
        res.forEach((item: any) => {
          if (key === 'seal') {
            if (item.key === 'handheldIdCities') {
              let arr: string[] = []
              try { arr = JSON.parse(item.value) } catch { arr = [] as string[] }
              sealConfig.handheldIdCities = arr
              sealConfig.handheldIdCitiesText = arr.join('，')
            } else if (item.key === 'legalPhotoCities') {
              let arr: string[] = []
              try { arr = JSON.parse(item.value) } catch { arr = [] as string[] }
              sealConfig.legalPhotoCities = arr
              sealConfig.legalPhotoCitiesText = arr.join('，')
            }
          } else if (cfg.hasOwnProperty(item.key)) {
            Object.assign(cfg, { [item.key]: item.value })
          }
        })
      }
    } catch (e) { /* ignore */ }
  }
}

async function saveSealConfig() {
  try {
    const handheld = sealConfig.handheldIdCitiesText
      .split(/[，,、\s]+/)
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0)
    const legal = sealConfig.legalPhotoCitiesText
      .split(/[，,、\s]+/)
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0)
    await request.put('/config', { key: 'handheldIdCities', value: handheld, group: 'seal' })
    await request.put('/config', { key: 'legalPhotoCities', value: legal, group: 'seal' })
    sealConfig.handheldIdCities = handheld
    sealConfig.legalPhotoCities = legal
    ElMessage.success('保存成功')
  } catch (e) {
    ElMessage.error('保存失败')
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

onMounted(fetchConfigs)
</script>
