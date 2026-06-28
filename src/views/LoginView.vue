<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { login } from '../api/auth'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()

const form = reactive({
  username: 'admin',
  password: '123456',
})

const loading = ref(false)
const errorMessage = ref('')
const showPassword = ref(false)

async function onSubmit() {
  loading.value = true
  errorMessage.value = ''

  try {
    const result = await login({
      username: form.username.trim(),
      password: form.password,
    })
    auth.setSession({
      token: result.token,
      username: result.username ?? form.username.trim(),
      realName: result.realName ?? form.username.trim(),
      role: result.role,
      roleId: result.roleId ?? (result.role === 'admin' ? 1 : 2),
      userId: result.userId ?? 0,
      permissions: result.permissions,
    })
    await router.push('/')
  } catch (error) {
    const message = error instanceof Error ? error.message : '登录失败，请稍后重试'
    errorMessage.value = /Bad Gateway|502|504|超时|接口服务暂时不可用|后端服务未连通/.test(message)
      ? '后端服务未连通，请确认 10.133.10.106:8082 可访问；也可以先点“演示模式”查看平台页面'
      : message
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
  <main class="login-page">
    <section class="login-hero">
      <p class="eyebrow">UAV ADMIN</p>
      <h1>无人机管理平台</h1>
      <p>请使用系统账号登录。后端服务启动后，页面将读取数据库中的真实业务数据。</p>
    </section>

    <section class="login-card card">
      <div class="login-card__head">
        <h2>系统登录</h2>
        <p>默认接口地址通过 Vite 代理转发到 http://10.133.10.106:8082。</p>
      </div>

      <form class="login-form" @submit.prevent="onSubmit">
        <label>
          <span>用户名</span>
          <input v-model="form.username" autocomplete="username" placeholder="请输入用户名" />
        </label>

        <label>
          <span>密码</span>
          <div class="password-field">
            <input
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              placeholder="请输入密码"
            />
            <button
              class="password-toggle"
              type="button"
              :aria-label="showPassword ? '隐藏密码' : '显示密码'"
              @click="showPassword = !showPassword"
            >
              <svg v-if="showPassword" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 3l18 18" />
                <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                <path d="M9.3 5.4A9.8 9.8 0 0 1 12 5c5 0 8.5 4.4 9.6 6a13.5 13.5 0 0 1-3.1 3.5" />
                <path d="M6.5 6.9A13.8 13.8 0 0 0 2.4 11c1.1 1.6 4.6 6 9.6 6 1.2 0 2.3-.2 3.3-.7" />
              </svg>
              <svg v-else viewBox="0 0 24 24" aria-hidden="true">
                <path d="M2.4 12s3.6-6 9.6-6 9.6 6 9.6 6-3.6 6-9.6 6-9.6-6-9.6-6z" />
                <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
              </svg>
            </button>
          </div>
        </label>

        <p v-if="errorMessage" class="form-error">{{ errorMessage }}</p>

        <div class="login-actions">
          <button class="primary-btn" :disabled="loading" type="submit">
            {{ loading ? '登录中...' : '进入平台' }}
          </button>
          <button class="ghost-btn" type="button" @click="enterDemoMode">演示模式</button>
        </div>
      </form>
    </section>
  </main>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 500px;
  gap: 44px;
  width: min(1120px, calc(100% - 48px));
  margin: 0 auto;
  padding: 56px 0;
  align-items: center;
  font-size: 17px;
}

.login-hero {
  max-width: 760px;
}

.eyebrow {
  color: var(--accent);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.login-hero h1 {
  margin: 14px 0 18px;
  font-size: clamp(2.6rem, 4vw, 4.4rem);
  line-height: 1.12;
  font-weight: 800;
}

.login-hero p {
  max-width: 42rem;
  color: var(--text-soft);
  font-size: 1.12rem;
  line-height: 1.7;
}

.login-card {
  width: 100%;
  padding: 36px;
}

.login-card__head {
  display: grid;
  gap: 10px;
  margin-bottom: 30px;
}

.login-card__head h2 {
  font-size: 1.55rem;
  font-weight: 750;
}

.login-card__head p,
.login-form span {
  color: var(--text-soft);
}

.login-form {
  display: grid;
  gap: 20px;
}

.login-form label {
  display: grid;
  gap: 10px;
}

.login-form input {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 16px 17px;
  min-height: 54px;
  background: rgba(255, 255, 255, 0.92);
  color: var(--text-main);
  outline: none;
  font-size: 1rem;
}

.password-field {
  position: relative;
}

.password-field input {
  padding-right: 76px;
}

.password-toggle {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  border: 0;
  border-radius: 7px;
  width: 40px;
  height: 36px;
  display: grid;
  place-items: center;
  background: rgba(15, 118, 110, 0.08);
  color: #0f766e;
  cursor: pointer;
}

.password-toggle svg {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.login-form input:focus {
  border-color: rgba(15, 118, 110, 0.45);
  box-shadow: 0 0 0 4px rgba(15, 118, 110, 0.08);
}

.login-actions {
  display: grid;
  gap: 12px;
}

.primary-btn,
.ghost-btn {
  border-radius: 8px;
  padding: 16px 18px;
  min-height: 54px;
  font-weight: 700;
  cursor: pointer;
  font-size: 1rem;
}

.primary-btn {
  border: 0;
  background: #0f766e;
  color: #fff;
}

.primary-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.ghost-btn {
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.72);
  color: var(--text-main);
}

.form-error {
  color: #b42318;
  line-height: 1.6;
}

@media (max-width: 900px) {
  .login-page {
    grid-template-columns: 1fr;
    width: min(100% - 28px, 720px);
    padding: 28px 0;
    gap: 24px;
  }

  .login-card {
    max-width: none;
    justify-self: stretch;
    padding: 30px;
  }

  .login-hero h1 {
    font-size: clamp(2.7rem, 12vw, 4.4rem);
  }
}
</style>
