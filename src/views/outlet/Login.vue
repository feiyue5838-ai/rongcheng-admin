<template>
  <div class="Outlet-login-page">
    <div class="login-card">
      <div class="login-header">
        <div class="logo">蓉</div>
        <h1>蓉城企服</h1>
        <p>网点工作台</p>
      </div>
      <el-form ref="formRef" :model="form" :rules="rules" @submit.prevent="handleLogin">
        <el-form-item prop="phone">
          <el-input
            v-model="form.phone"
            placeholder="网点手机号"
            size="large"
            :prefix-icon="Phone"
            maxlength="11"
            clearable
          />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="密码（初始密码 6 位）"
            size="large"
            :prefix-icon="Lock"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" size="large" :loading="loading" class="login-btn" native-type="submit" style="width: 100%">
            {{ loading ? '登录中...' : '登 录' }}
          </el-button>
        </el-form-item>
      </el-form>
      <div class="login-tip">
        网点账号由管理后台创建，初始密码随机生成
        <router-link to="/login" class="link">返回管理后台登录</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useOutletStore } from '@/stores/outlet'
import { Phone, Lock } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const router = useRouter()
const outletStore = useOutletStore()
const formRef = ref()
const loading = ref(false)

const form = reactive({ phone: '', password: '' })
const rules = {
  phone: [
    { required: true, message: '请输入网点手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' },
  ],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

async function handleLogin() {
  console.log('handleLogin called', form.phone, form.password)
  const valid = await formRef.value?.validate().catch((err) => {
    console.log('Validation error:', err)
    return false
  })
  console.log('Validation result:', valid)
  if (!valid) return
  loading.value = true
  try {
    const res = await outletStore.loginAction(form.phone, form.password)
    console.log('Login response:', res)
    if (res && res.Outlet) {
      ElMessage.success('登录成功')
      router.push('/Outlet/workspace')
    } else {
      ElMessage.error('登录响应格式错误')
    }
  } catch (err) {
    console.error('Login error:', err)
    ElMessage.error(err.message || '登录失败，请检查手机号和密码')
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.Outlet-login-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-card {
  background: #fff;
  border-radius: 16px;
  padding: 48px 40px;
  width: 400px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.login-header {
  text-align: center;
  margin-bottom: 36px;

  .logo {
    width: 64px;
    height: 64px;
    border-radius: 16px;
    background: linear-gradient(135deg, #5B6FE8 0%, #7B8FF8 100%);
    color: #fff;
    font-size: 32px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 16px;
    box-shadow: 0 4px 12px rgba(91, 111, 232, 0.4);
  }

  h1 {
    font-size: 28px;
    font-weight: 700;
    color: #5B6FE8;
    margin: 0;
  }

  p {
    font-size: 14px;
    color: #999;
    margin: 8px 0 0;
  }
}

.login-btn {
  width: 100%;
  height: 44px;
  font-size: 16px;
  border-radius: 8px;
}

.login-tip {
  margin-top: 20px;
  text-align: center;
  font-size: 12px;
  color: #999;
  line-height: 1.8;

  .link {
    color: #5B6FE8;
    text-decoration: none;
    display: block;
    margin-top: 4px;

    &:hover {
      text-decoration: underline;
    }
  }
}
</style>
