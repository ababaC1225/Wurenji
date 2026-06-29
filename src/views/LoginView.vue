<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { login, loginByEmail, sendEmailCode } from '../api/auth'
import type { LoginResponse } from '../types/api'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()

const form = reactive({
  username: '',
  password: '',
  email: '',
  code: '',
})

const loginMode = ref<'password' | 'email'>('password')
const loading = ref(false)
const codeSending = ref(false)
const errorMessage = ref('')
const emailMessage = ref('')
const showPassword = ref(false)
const titlePlaneKey = ref(0)

type LooseRecord = Record<string, unknown>

function asRecord(value: unknown): LooseRecord {
  return typeof value === 'object' && value !== null ? (value as LooseRecord) : {}
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number') return String(value)
  }

  return ''
}

function firstNumber(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value)
  }

  return undefined
}

function normalizePermissions(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean).join(',')
  if (typeof value === 'string') return value
  return undefined
}

function decodeJwtPayload(token: string) {
  const [, payload] = token.split('.')

  if (!payload) return {}

  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    const json = decodeURIComponent(
      Array.from(atob(padded))
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join(''),
    )

    return JSON.parse(json) as LooseRecord
  } catch {
    return {}
  }
}

function roleIdOf(roleText: string, username: string, explicitRoleId?: number) {
  if (explicitRoleId && [1, 2, 3].includes(explicitRoleId)) return explicitRoleId

  const keyword = `${roleText} ${username}`.toLowerCase()

  if (/dispatcher|dispatch|调度|order|route|task/.test(keyword)) return 2
  if (/maintain|maintenance|operator|operations|operation|ops|运维|维护|告警/.test(keyword)) return 3
  if (/admin|系统管理员|管理员/.test(keyword)) return 1

  return 2
}

function roleNameOf(roleId: number) {
  if (roleId === 1) return 'admin'
  if (roleId === 2) return 'dispatcher'
  if (roleId === 3) return 'maintenance'
  return 'dispatcher'
}

async function applyLoginResult(result: LoginResponse, fallbackName: string) {
  const root = asRecord(result)
  const inner = asRecord(root.data)
  const deeper = asRecord(inner.data)
  const user = asRecord(
    root.user ??
      root.sysUser ??
      root.loginUser ??
      inner.user ??
      inner.sysUser ??
      inner.loginUser ??
      deeper.user ??
      deeper.sysUser ??
      deeper.loginUser,
  )
  const token = firstString(
    result,
    root.data,
    inner.data,
    root.token,
    root.accessToken,
    root.access_token,
    root.jwt,
    root.tokenValue,
    root.satoken,
    root.Authorization,
    root.authorization,
    inner.token,
    inner.accessToken,
    inner.access_token,
    inner.jwt,
    inner.tokenValue,
    inner.satoken,
    inner.Authorization,
    inner.authorization,
    deeper.token,
    deeper.accessToken,
    deeper.access_token,
    deeper.jwt,
    deeper.tokenValue,
    deeper.satoken,
    deeper.Authorization,
    deeper.authorization,
  )

  if (!token) {
    throw new Error('登录成功但未返回 token，请检查后端登录响应字段')
  }

  const claims = decodeJwtPayload(token)
  const username = firstString(root.username, inner.username, deeper.username, user.username, claims.sub, claims.username, fallbackName)
  const roleText = firstString(
    root.role,
    root.roleName,
    root.roleCode,
    inner.role,
    inner.roleName,
    inner.roleCode,
    deeper.role,
    deeper.roleName,
    deeper.roleCode,
    user.role,
    user.roleName,
    user.roleCode,
    claims.role,
    claims.roleName,
    claims.roleCode,
  )
  const roleId = roleIdOf(roleText, username, firstNumber(root.roleId, inner.roleId, deeper.roleId, user.roleId, claims.roleId))
  const permissions =
    normalizePermissions(root.permissions) ??
    normalizePermissions(inner.permissions) ??
    normalizePermissions(deeper.permissions) ??
    normalizePermissions(user.permissions) ??
    normalizePermissions(claims.permissions)

  auth.setSession({
    token,
    username,
    realName: firstString(root.realName, inner.realName, deeper.realName, user.realName, claims.realName, username),
    role: roleText || roleNameOf(roleId),
    roleId,
    userId: firstNumber(root.userId, inner.userId, deeper.userId, user.userId, claims.userId) ?? 0,
    permissions,
  })
  await router.push('/')
}

async function onSubmit() {
  loading.value = true
  errorMessage.value = ''

  try {
    const result =
      loginMode.value === 'email'
        ? await loginByEmail({ email: form.email.trim(), code: form.code.trim() })
        : await login({
            username: form.username.trim(),
            password: form.password,
          })

    await applyLoginResult(result, loginMode.value === 'email' ? form.email.trim() : form.username.trim())
  } catch (error) {
    const message = error instanceof Error ? error.message : '登录失败，请稍后重试'
    errorMessage.value = /Bad Gateway|502|504|超时|接口服务暂时不可用|后端服务未连通/.test(message)
      ? '后端服务未连通，请确认 10.133.10.106:8082 可访问；也可以先点“演示模式”查看平台页面'
      : message
  } finally {
    loading.value = false
  }
}

async function requestEmailCode() {
  if (!form.email.trim()) {
    errorMessage.value = '请先输入邮箱'
    return
  }

  codeSending.value = true
  errorMessage.value = ''
  emailMessage.value = ''

  try {
    await sendEmailCode(form.email.trim())
    emailMessage.value = '验证码已发送，请查看邮箱'
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '验证码发送失败'
  } finally {
    codeSending.value = false
  }
}

async function enterDemoMode() {
  auth.setDemoSession(form.username)
  await router.push('/')
}

function replayTitlePlane() {
  titlePlaneKey.value += 1
}
</script>

<template>
  <main class="login-page">
    <section class="login-hero">
      <p class="eyebrow">UAV ADMIN</p>
      <div class="hero-title">
        <h1>无人机管理平台</h1>
        <button class="title-plane" type="button" aria-label="重播纸飞机动画" @click="replayTitlePlane">
          <span :key="`trail-${titlePlaneKey}`" class="plane-trail"></span>
          <svg :key="titlePlaneKey" class="paper-plane" viewBox="0 0 48 48" aria-hidden="true">
            <path d="M5 24 42 7 31 41 23 28 10 35 17 26z" />
            <path d="M17 26 42 7 23 28" />
          </svg>
        </button>
      </div>
      <p>请使用系统账号登录。后端服务启动后，页面将读取数据库中的真实业务数据。</p>
    </section>

    <section class="login-card card">
      <div class="login-card__head">
        <h2>系统登录</h2>
        <p>默认接口地址通过 Vite 代理转发到 http://10.133.10.106:8082。</p>
      </div>

      <form class="login-form" autocomplete="off" @submit.prevent="onSubmit">
        <div class="login-mode-toggle" role="tablist" aria-label="登录方式">
          <button :class="{ active: loginMode === 'password' }" type="button" @click="loginMode = 'password'">账号登录</button>
          <button :class="{ active: loginMode === 'email' }" type="button" @click="loginMode = 'email'">邮箱验证码</button>
        </div>

        <label v-if="loginMode === 'password'">
          <span>用户名</span>
          <input v-model="form.username" autocomplete="off" placeholder="请输入用户名" />
        </label>

        <label v-if="loginMode === 'password'">
          <span>密码</span>
          <div class="password-field">
            <input
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="new-password"
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

        <label v-if="loginMode === 'email'">
          <span>邮箱</span>
          <input v-model="form.email" autocomplete="off" placeholder="请输入邮箱" type="email" />
        </label>

        <label v-if="loginMode === 'email'">
          <span>验证码</span>
          <div class="code-field">
            <input v-model="form.code" autocomplete="one-time-code" placeholder="请输入验证码" />
            <button class="code-btn" :disabled="codeSending" type="button" @click="requestEmailCode">
              {{ codeSending ? '发送中' : '获取验证码' }}
            </button>
          </div>
        </label>

        <p v-if="emailMessage" class="form-success">{{ emailMessage }}</p>
        <p v-if="errorMessage" class="form-error">{{ errorMessage }}</p>

        <div class="login-actions">
          <button class="primary-btn" :disabled="loading" type="submit">
            {{ loading ? '登录中...' : loginMode === 'email' ? '邮箱登录' : '进入平台' }}
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
  grid-template-columns: minmax(0, 1.15fr) minmax(460px, 520px);
  gap: clamp(36px, 5vw, 76px);
  width: min(1360px, calc(100% - 36px));
  margin: 0 auto;
  padding: 42px 0;
  align-items: center;
  font-size: 17px;
  position: relative;
  overflow: hidden;
  isolation: isolate;
}

.login-page::before,
.login-page::after {
  position: fixed;
  inset: 0;
  z-index: -2;
  content: '';
  pointer-events: none;
}

.login-page::before {
  background:
    linear-gradient(120deg, rgba(15, 118, 110, 0.1), transparent 34%),
    linear-gradient(300deg, rgba(180, 83, 9, 0.08), transparent 30%),
    linear-gradient(rgba(15, 118, 110, 0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(37, 99, 235, 0.04) 1px, transparent 1px),
    #f3f6fb;
  background-size: auto, auto, 36px 36px, 36px 36px, auto;
  animation: loginGridDrift 26s linear infinite;
}

.login-page::after {
  z-index: -1;
  background:
    linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.62), transparent),
    repeating-linear-gradient(180deg, transparent 0 18px, rgba(15, 118, 110, 0.035) 18px 19px);
  opacity: 0.5;
  transform: translateX(-46%);
  animation: scanSweep 7s ease-in-out infinite;
}

.login-hero {
  max-width: 820px;
  padding-left: clamp(0px, 1vw, 14px);
  animation: heroEnter 680ms ease both;
}

.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border: 1px solid rgba(37, 99, 235, 0.16);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.68);
  color: var(--accent);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  box-shadow: 0 10px 26px rgba(30, 58, 138, 0.06);
}

.eyebrow::before {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #0f766e;
  box-shadow: 0 0 0 0 rgba(15, 118, 110, 0.3);
  content: '';
  animation: statusPulse 1800ms ease-out infinite;
}

.hero-title {
  position: relative;
  width: max-content;
  max-width: 100%;
  margin: 22px 0 20px;
}

.hero-title h1 {
  max-width: none;
  margin: 0;
  color: transparent;
  background:
    linear-gradient(90deg, #123271 0 45%, #2563eb 50%, #123271 58% 100%),
    linear-gradient(#123271, #123271);
  background-clip: text;
  background-position: 180% 0, 0 0;
  background-size: 220% 100%, 100% 100%;
  -webkit-background-clip: text;
  font-size: clamp(3.2rem, 5.35vw, 5.25rem);
  line-height: 1.05;
  font-weight: 850;
  letter-spacing: 0;
  white-space: nowrap;
  animation: titleReveal 1200ms ease both, titleShine 2400ms ease 900ms both;
}

.title-plane {
  position: absolute;
  inset: -28px -24px -18px -24px;
  border: 0;
  padding: 0;
  background: transparent;
}

.paper-plane,
.plane-trail {
  position: absolute;
  left: 0;
  top: 0;
  offset-path: path('M 0 76 C 120 18 200 132 310 66 S 510 6 646 96');
  animation: titlePlaneWave 2600ms cubic-bezier(0.42, 0, 0.2, 1) both;
  will-change: offset-distance, opacity, transform;
}

.paper-plane {
  width: 50px;
  height: 50px;
  color: #0f766e;
  fill: rgba(15, 118, 110, 0.94);
  stroke: #ffffff;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2;
  filter:
    drop-shadow(0 12px 18px rgba(15, 118, 110, 0.32))
    drop-shadow(0 0 10px rgba(37, 99, 235, 0.18));
  pointer-events: auto;
  transform-origin: center;
  offset-rotate: auto 18deg;
}

.plane-trail {
  width: 110px;
  height: 16px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(37, 99, 235, 0), rgba(37, 99, 235, 0.22), rgba(15, 118, 110, 0.58));
  filter: blur(5px);
  opacity: 0;
  pointer-events: none;
  offset-rotate: auto 198deg;
  animation-name: titlePlaneTrail;
  animation-delay: 70ms;
  transform-origin: right center;
}

.login-hero p {
  max-width: 38rem;
  color: var(--text-soft);
  font-size: 1.08rem;
  line-height: 1.9;
}

.login-card {
  width: 100%;
  position: relative;
  overflow: hidden;
  padding: 42px;
  border: 1px solid rgba(100, 116, 139, 0.18);
  border-radius: 8px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.88)),
    rgba(255, 255, 255, 0.9);
  box-shadow:
    0 24px 64px rgba(30, 58, 138, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.84);
  animation: cardEnter 720ms ease 100ms both;
}

.login-card::before {
  position: absolute;
  inset: 0 0 auto;
  height: 4px;
  background: linear-gradient(90deg, #0f766e, #2563eb, #b45309);
  content: '';
}

.login-card::after {
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: '';
  background: linear-gradient(120deg, transparent 0%, rgba(255, 255, 255, 0.58) 46%, transparent 62%);
  opacity: 0;
  transform: translateX(-52%);
}

.login-card:hover::after {
  opacity: 1;
  animation: cardSheen 900ms ease;
}

.login-card__head {
  display: grid;
  gap: 12px;
  margin-bottom: 34px;
}

.login-card__head h2 {
  color: #1f2937;
  font-size: 1.72rem;
  font-weight: 800;
}

.login-card__head p,
.login-form span {
  color: var(--text-soft);
}

.login-card__head p {
  line-height: 1.75;
}

.login-form {
  display: grid;
  gap: 22px;
}

.login-mode-toggle {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  padding: 6px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: rgba(248, 250, 252, 0.86);
  animation: fieldEnter 520ms ease both;
}

.login-mode-toggle button {
  min-height: 42px;
  border: 1px solid transparent;
  border-radius: 7px;
  background: transparent;
  color: var(--text-soft);
  font: inherit;
  font-weight: 750;
  cursor: pointer;
  transition: background 150ms ease, border-color 150ms ease, color 150ms ease, transform 150ms ease;
}

.login-mode-toggle button.active {
  border-color: rgba(15, 118, 110, 0.2);
  background: #ffffff;
  color: #0f766e;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);
}

.login-mode-toggle button:hover {
  transform: translateY(-1px);
}

.login-form label {
  display: grid;
  gap: 11px;
}

.login-form label,
.login-actions {
  animation: fieldEnter 520ms ease both;
}

.login-form label:nth-child(3) { animation-delay: 80ms; }
.login-actions { animation-delay: 160ms; }

.login-form span {
  font-size: 0.95rem;
  font-weight: 700;
}

.login-form input {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 17px 18px;
  min-height: 58px;
  background: rgba(255, 255, 255, 0.92);
  color: var(--text-main);
  outline: none;
  font-size: 1rem;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease,
    background 160ms ease;
}

.password-field,
.code-field {
  position: relative;
}

.password-field input {
  padding-right: 72px;
}

.code-field input {
  padding-right: 132px;
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
  transition:
    transform 150ms ease,
    background 150ms ease,
    box-shadow 150ms ease;
}

.code-btn {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  min-height: 38px;
  border: 1px solid rgba(15, 118, 110, 0.18);
  border-radius: 7px;
  padding: 0 12px;
  background: rgba(15, 118, 110, 0.08);
  color: #0f766e;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 750;
  cursor: pointer;
}

.code-btn:disabled {
  cursor: not-allowed;
  opacity: 0.62;
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
  background: #ffffff;
  box-shadow: 0 0 0 4px rgba(15, 118, 110, 0.08), 0 10px 24px rgba(15, 23, 42, 0.06);
  transform: translateY(-1px);
}

.password-toggle:hover {
  background: rgba(15, 118, 110, 0.13);
  box-shadow: 0 8px 18px rgba(15, 118, 110, 0.12);
}

.password-toggle:active {
  transform: translateY(-50%) scale(0.96);
}

.login-actions {
  display: grid;
  grid-template-columns: 1fr 0.72fr;
  gap: 14px;
  margin-top: 4px;
}

.primary-btn,
.ghost-btn {
  border-radius: 8px;
  padding: 16px 18px;
  min-height: 54px;
  font-weight: 700;
  cursor: pointer;
  font-size: 1rem;
  transition:
    transform 150ms ease,
    box-shadow 150ms ease,
    background 150ms ease,
    border-color 150ms ease;
}

.primary-btn {
  border: 0;
  background: #0f766e;
  color: #fff;
  box-shadow: 0 12px 24px rgba(15, 118, 110, 0.2);
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

.primary-btn:hover:not(:disabled),
.ghost-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 26px rgba(15, 23, 42, 0.1);
}

.primary-btn:active:not(:disabled),
.ghost-btn:active {
  transform: translateY(0);
}

.form-error,
.form-success {
  padding: 12px 14px;
  border-radius: 8px;
  line-height: 1.6;
  animation: fieldEnter 220ms ease both;
}

.form-error {
  border: 1px solid rgba(180, 35, 24, 0.16);
  background: rgba(254, 242, 242, 0.82);
  color: #b42318;
}

.form-success {
  border: 1px solid rgba(15, 118, 110, 0.16);
  background: rgba(236, 253, 245, 0.82);
  color: #0f766e;
}

@keyframes loginGridDrift {
  from { background-position: 0 0, 0 0, 0 0, 0 0, 0 0; }
  to { background-position: 0 0, 0 0, 36px 36px, 36px 36px, 0 0; }
}

@keyframes scanSweep {
  0%,
  100% { transform: translateX(-48%); opacity: 0.28; }
  50% { transform: translateX(48%); opacity: 0.5; }
}

@keyframes heroEnter {
  from {
    opacity: 0;
    transform: translateX(-18px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes cardEnter {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes fieldEnter {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes cardSheen {
  from { transform: translateX(-56%); }
  to { transform: translateX(56%); }
}

@keyframes statusPulse {
  0% { box-shadow: 0 0 0 0 rgba(15, 118, 110, 0.3); }
  70% { box-shadow: 0 0 0 9px rgba(15, 118, 110, 0); }
  100% { box-shadow: 0 0 0 0 rgba(15, 118, 110, 0); }
}

@keyframes titleReveal {
  from {
    opacity: 0;
    clip-path: inset(0 100% 0 0);
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    clip-path: inset(0 0 0 0);
    transform: translateY(0);
  }
}

@keyframes titleShine {
  from { background-position: 180% 0, 0 0; }
  to { background-position: -40% 0, 0 0; }
}

@keyframes titlePlaneWave {
  0% {
    opacity: 0;
    offset-distance: 0%;
    transform: scale(0.9);
  }
  10% { opacity: 1; transform: scale(1); }
  90% { opacity: 1; }
  100% {
    opacity: 1;
    offset-distance: 100%;
    transform: scale(1);
  }
}

@keyframes titlePlaneTrail {
  0% {
    opacity: 0;
    offset-distance: 0%;
    transform: scaleX(0.55);
  }
  14% {
    opacity: 0.78;
    transform: scaleX(0.95);
  }
  82% {
    opacity: 0.68;
  }
  100% {
    opacity: 0;
    offset-distance: 100%;
    transform: scaleX(0.42);
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
  }
}

@media (max-width: 900px) {
  .login-page {
    grid-template-columns: 1fr;
    width: min(100% - 20px, 780px);
    padding: 22px 0;
    gap: 22px;
    align-items: start;
  }

  .login-hero {
    padding-left: 0;
  }

  .login-card {
    max-width: none;
    justify-self: stretch;
    padding: 26px;
  }

  .hero-title {
    margin-top: 18px;
    margin-bottom: 16px;
  }

  .hero-title h1 {
    max-width: none;
    font-size: clamp(2.2rem, 10vw, 4.1rem);
    white-space: nowrap;
  }

  .login-actions {
    grid-template-columns: 1fr;
  }

  .paper-plane {
    width: 40px;
    height: 40px;
  }

  .paper-plane,
  .plane-trail {
    offset-path: path('M 0 58 C 72 8 130 96 205 50 S 310 0 390 70');
  }

  .plane-trail {
    width: 82px;
    height: 12px;
  }
}
</style>
