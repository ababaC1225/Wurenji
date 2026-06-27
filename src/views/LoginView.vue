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

async function onSubmit() {
  loading.value = true
  errorMessage.value = ''

  try {
    const result = await login(form)
    auth.setSession({
      token: result.token,
      username: result.username ?? form.username,
      realName: result.realName ?? form.username,
      role: result.role,
      roleId: result.roleId ?? (result.role === 'admin' ? 1 : 2),
      userId: result.userId ?? 0,
    })
    await router.push('/')
  } catch (error) {
    const message = error instanceof Error ? error.message : '登录失败，请稍后重试'
    errorMessage.value = message.includes('Bad Gateway')
      ? '后端服务未连通，请确认 8082 端口已启动；也可以先点“演示模式”查看平台页面'
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
        <p>默认接口地址通过 Vite 代理转发到 http://localhost:8082。</p>
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
