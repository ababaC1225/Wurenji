<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { login } from '../api/auth'
import { RequestError } from '../utils/request'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()

const form = reactive({
  username: 'admin',
  password: 'admin123',
})

const loading = ref(false)
const errorMessage = ref('')

async function onSubmit() {
  loading.value = true
  errorMessage.value = ''

  try {
    const result = await login(form)
    auth.setSession(result)
    await router.push('/')
  } catch (error) {
    const statusCode = error instanceof RequestError ? error.code : undefined
    const shouldFallbackToDemo =
      statusCode === 502 || statusCode === 503 || statusCode === 504 || statusCode === undefined

    if (shouldFallbackToDemo) {
      auth.setDemoSession(form.username)
      errorMessage.value = '后端暂不可用，已进入演示模式'
      await router.push('/')
      return
    }

    errorMessage.value = error instanceof Error ? error.message : '登录失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

async function enterDemoMode() {
  auth.setDemoSession(form.username)
  await router.push('/')
}
</script>

<template>
  <div class="login-page">
    <section class="login-hero">
      <p class="eyebrow">云翼调度台</p>
      <h1>一个干净的无人机管理入口。</h1>
      <p>
        后端就绪时自动走真实登录，暂时不可用时会切到本地演示，不会卡在错误页。
      </p>
    </section>

    <section class="login-card card">
      <div class="login-card__head">
        <h2>系统登录</h2>
        <p>后端可用时正常登录，不可用时自动进入演示模式</p>
      </div>

      <form class="login-form" @submit.prevent="onSubmit">
        <label>
          <span>用户名</span>
          <input v-model="form.username" autocomplete="username" placeholder="请输入用户名" />
        </label>

        <label>
          <span>密码</span>
          <input
            v-model="form.password"
            type="password"
            autocomplete="current-password"
            placeholder="请输入密码"
          />
        </label>

        <p v-if="errorMessage" class="form-error">{{ errorMessage }}</p>

        <div class="login-actions">
          <button class="primary-btn" :disabled="loading" type="submit">
            {{ loading ? '登录中...' : '进入系统' }}
          </button>
          <button class="ghost-btn" type="button" @click="enterDemoMode">进入演示模式</button>
        </div>

        <p class="login-tip">演示模式可直接查看当前界面，后端恢复后再次登录即可切换为真实数据。</p>
      </form>
    </section>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 24px;
  padding: 32px;
  align-items: center;
}

.login-hero {
  padding: 24px;
  max-width: 620px;
}

.login-hero h1 {
  margin: 14px 0 16px;
  font-size: clamp(2.4rem, 4vw, 4.8rem);
  line-height: 1.02;
  letter-spacing: -0.04em;
}

.login-hero p {
  color: var(--text-soft);
  font-size: 1.05rem;
  max-width: 44rem;
}

.login-card {
  max-width: 480px;
  width: 100%;
  justify-self: end;
  padding: 24px;
}

.login-card__head {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 24px;
}

.login-card__head p {
  color: var(--text-faint);
}

.login-form {
  display: grid;
  gap: 16px;
}

.login-form label {
  display: grid;
  gap: 8px;
}

.login-form span {
  color: var(--text-soft);
  font-size: 0.92rem;
}

.login-form input {
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.9);
  color: var(--text-main);
  outline: none;
}

.login-form input:focus {
  border-color: rgba(15, 118, 110, 0.35);
  box-shadow: 0 0 0 4px rgba(15, 118, 110, 0.08);
}

.form-error {
  color: #b42318;
  font-size: 0.92rem;
}

.primary-btn {
  border: 0;
  border-radius: 16px;
  padding: 14px 18px;
  background: linear-gradient(135deg, #0f766e, #115e59);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

.primary-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.login-actions {
  display: grid;
  gap: 10px;
}

.ghost-btn {
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 13px 18px;
  background: rgba(255, 255, 255, 0.7);
  color: var(--text-main);
  cursor: pointer;
}

.login-tip {
  color: var(--text-faint);
  font-size: 0.88rem;
  line-height: 1.6;
}

@media (max-width: 920px) {
  .login-page {
    grid-template-columns: 1fr;
    padding: 20px;
  }

  .login-card {
    justify-self: stretch;
    max-width: none;
  }
}
</style>