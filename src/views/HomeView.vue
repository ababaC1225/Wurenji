<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { createRole, fetchRoleDetail, fetchRolePage, fetchRoleSelect, removeRole, updateRole } from '../api/role'
import { fetchDroneHealth, fetchOrderFulfill, fetchTaskMonitor } from '../api/view'
import { useAuthStore } from '../stores/auth'
import type { DashboardMetrics, RoleForm, RoleItem } from '../types/api'

const router = useRouter()
const auth = useAuthStore()

const activeTab = ref<'overview' | 'roles'>('overview')
const loadingRoles = ref(false)
const loadingOverview = ref(false)
const panelError = ref('')
const editingId = ref<number | null>(null)

const pagination = reactive({
  pageNum: 1,
  pageSize: 8,
  total: 0,
})

const roleList = ref<RoleItem[]>([])
const roleOptions = ref<RoleItem[]>([])
const dashboardRows = ref<DashboardMetrics[]>([
  { title: '任务监测', value: '待同步', hint: '运行中模块', tone: 'teal' },
  { title: '无人机健康', value: '待同步', hint: '设备状态', tone: 'blue' },
  { title: '订单履约', value: '待同步', hint: '履约进度', tone: 'amber' },
])

const focusCards = [
  { title: '角色管理', desc: '维护权限和岗位配置', accent: 'teal' },
  { title: '任务监测', desc: '汇总执行与告警状态', accent: 'blue' },
  { title: '设备健康', desc: '查看运行和异常概况', accent: 'amber' },
]

const timeline = [
  { title: '登录会话已建立', desc: '系统已进入当前工作台', time: '刚刚' },
  { title: '角色列表已就绪', desc: '可直接进入增删改查', time: '持续刷新' },
  { title: '看板区域已预留', desc: '后端数据到位后自动展示', time: '待同步' },
]

const roleForm = reactive<RoleForm>({
  roleName: '',
  roleDesc: '',
})

const hasRoles = computed(() => roleList.value.length > 0)

function resetForm() {
  editingId.value = null
  roleForm.roleName = ''
  roleForm.roleDesc = ''
}

function applyRoleForm(item: RoleItem) {
  editingId.value = item.roleId
  roleForm.roleName = item.roleName
  roleForm.roleDesc = item.roleDesc
}

function readSummary(payload: Record<string, unknown> | null) {
  if (!payload || Object.keys(payload).length === 0) return '暂无数据'

  const keys = ['total', 'count', 'online', 'offline', 'success', 'abnormal']
  for (const key of keys) {
    const value = payload[key]
    if (typeof value === 'number' || typeof value === 'string') return String(value)
  }

  return '已返回'
}

async function loadOverview() {
  loadingOverview.value = true

  try {
    const [taskMonitor, droneHealth, orderFulfill] = await Promise.all([
      fetchTaskMonitor().catch(() => null),
      fetchDroneHealth().catch(() => null),
      fetchOrderFulfill().catch(() => null),
    ])

    dashboardRows.value = [
      {
        title: '任务监测',
        value: readSummary(taskMonitor),
        hint: '运行中模块',
        tone: 'teal',
      },
      {
        title: '无人机健康',
        value: readSummary(droneHealth),
        hint: '设备状态',
        tone: 'blue',
      },
      {
        title: '订单履约',
        value: readSummary(orderFulfill),
        hint: '履约进度',
        tone: 'amber',
      },
    ]
  } finally {
    loadingOverview.value = false
  }
}

async function loadRoles() {
  loadingRoles.value = true
  panelError.value = ''

  try {
    const page = await fetchRolePage({
      pageNum: pagination.pageNum,
      pageSize: pagination.pageSize,
    })

    roleList.value = page.records
    pagination.total = page.total
    roleOptions.value = await fetchRoleSelect().catch(() => [])
  } catch (error) {
    panelError.value = error instanceof Error ? error.message : '加载失败'
  } finally {
    loadingRoles.value = false
  }
}

async function loadAll() {
  await Promise.all([loadOverview(), loadRoles()])
}

async function submitRole() {
  panelError.value = ''

  try {
    if (editingId.value) {
      await updateRole({
        roleId: editingId.value,
        roleName: roleForm.roleName,
        roleDesc: roleForm.roleDesc,
      })
    } else {
      await createRole({
        roleName: roleForm.roleName,
        roleDesc: roleForm.roleDesc,
      })
    }

    resetForm()
    await loadRoles()
  } catch (error) {
    panelError.value = error instanceof Error ? error.message : '保存失败'
  }
}

async function onEdit(item: RoleItem) {
  try {
    const detail = await fetchRoleDetail(item.roleId)
    applyRoleForm(detail)
  } catch {
    applyRoleForm(item)
  }

  activeTab.value = 'roles'
}

async function onDelete(item: RoleItem) {
  if (!window.confirm(`确认删除角色「${item.roleName}」吗？`)) return

  try {
    await removeRole(item.roleId)
    await loadRoles()
  } catch (error) {
    panelError.value = error instanceof Error ? error.message : '删除失败'
  }
}

async function onLogout() {
  auth.clearSession()
  await router.push('/login')
}

async function goToLogin() {
  auth.clearSession()
  await router.push('/login?force=1')
}

function prevPage() {
  if (pagination.pageNum <= 1) return
  pagination.pageNum -= 1
  loadRoles()
}

function nextPage() {
  if (pagination.pageNum * pagination.pageSize >= pagination.total) return
  pagination.pageNum += 1
  loadRoles()
}

onMounted(loadAll)
</script>

<template>
  <div class="dashboard-shell">
    <aside class="dashboard-sidebar">
      <div class="brand brand--compact">
        <div class="brand-mark">YD</div>
        <div>
          <p class="brand-name">云翼调度台</p>
          <p class="brand-subtitle">{{ auth.profile?.realName ?? '系统管理员' }}</p>
        </div>
      </div>

      <nav class="dashboard-nav">
        <button :class="['nav-item', { active: activeTab === 'overview' }]" @click="activeTab = 'overview'">总览</button>
        <button :class="['nav-item', { active: activeTab === 'roles' }]" @click="activeTab = 'roles'">角色</button>
      </nav>

      <div class="sidebar-card">
        <p class="sidebar-card__title">当前用户</p>
        <p class="sidebar-card__value">{{ auth.profile?.realName ?? '系统管理员' }}</p>
        <p class="sidebar-card__hint">角色编号 {{ auth.profile?.roleId ?? '-' }}</p>
      </div>

      <button class="secondary-btn" @click="goToLogin">返回登录</button>
      <button class="secondary-btn secondary-btn--ghost" @click="onLogout">退出登录</button>
    </aside>

    <main class="dashboard-main">
      <header class="topbar card">
        <div>
          <p class="eyebrow">运行中控制台</p>
          <h1>{{ activeTab === 'overview' ? '任务总览' : '角色中心' }}</h1>
        </div>
        <div class="topbar-actions">
          <button class="ghost-btn" @click="activeTab = 'overview'">总览</button>
          <button class="ghost-btn" @click="activeTab = 'roles'">角色</button>
        </div>
      </header>

      <section v-if="activeTab === 'overview'" class="overview-grid">
        <article v-for="item in dashboardRows" :key="item.title" class="metric-card card" :data-tone="item.tone">
          <p>{{ item.title }}</p>
          <strong v-if="!loadingOverview">{{ item.value }}</strong>
          <strong v-else>更新中</strong>
          <span>{{ item.hint }}</span>
        </article>

        <section class="card info-panel">
          <div class="section-header compact">
            <div>
              <p class="section-kicker">工作台结构</p>
              <h2>常用模块一屏可达</h2>
            </div>
          </div>

          <div class="focus-grid">
            <article v-for="item in focusCards" :key="item.title" class="focus-card">
              <span :data-accent="item.accent"></span>
              <div>
                <h3>{{ item.title }}</h3>
                <p>{{ item.desc }}</p>
              </div>
            </article>
          </div>
        </section>

        <section class="card activity-panel">
          <div class="section-header compact">
            <div>
              <p class="section-kicker">运行动态</p>
              <h2>最近状态</h2>
            </div>
          </div>

          <div class="activity-list">
            <article v-for="item in timeline" :key="item.title" class="activity-item">
              <div>
                <strong>{{ item.title }}</strong>
                <p>{{ item.desc }}</p>
              </div>
              <span>{{ item.time }}</span>
            </article>
          </div>
        </section>
      </section>

      <section v-else class="role-layout">
        <section class="card form-card">
          <div class="section-header compact">
            <div>
              <p class="section-kicker">角色中心</p>
              <h2>{{ editingId ? '编辑角色' : '新建角色' }}</h2>
            </div>
          </div>

          <form class="role-form" @submit.prevent="submitRole">
            <label>
              <span>角色名称</span>
              <input v-model="roleForm.roleName" placeholder="请输入角色名称" />
            </label>

            <label>
              <span>角色描述</span>
              <textarea v-model="roleForm.roleDesc" rows="4" placeholder="请输入角色描述"></textarea>
            </label>

            <div class="form-actions">
              <button class="ghost-btn" type="button" @click="resetForm">清空</button>
              <button class="primary-btn" type="submit">{{ editingId ? '保存修改' : '创建角色' }}</button>
            </div>

            <p v-if="panelError" class="form-error">{{ panelError }}</p>
          </form>
        </section>

        <section class="card table-card">
          <div class="section-header compact">
            <div>
              <p class="section-kicker">角色列表</p>
              <h2>权限配置概览</h2>
            </div>
            <div class="table-meta">共 {{ pagination.total }} 条</div>
          </div>

          <div class="role-options">
            <span v-for="option in roleOptions" :key="option.roleId">{{ option.roleName }}</span>
          </div>

          <div v-if="loadingRoles" class="empty-state">正在加载角色列表...</div>
          <div v-else-if="!hasRoles" class="empty-state">暂无角色数据</div>
          <div v-else class="table">
            <div class="table-row table-head">
              <span>角色ID</span>
              <span>角色名称</span>
              <span>描述</span>
              <span>操作</span>
            </div>
            <div v-for="item in roleList" :key="item.roleId" class="table-row">
              <span>{{ item.roleId }}</span>
              <span>{{ item.roleName }}</span>
              <span>{{ item.roleDesc }}</span>
              <span class="row-actions">
                <button class="text-btn" @click="onEdit(item)">编辑</button>
                <button class="text-btn danger" @click="onDelete(item)">删除</button>
              </span>
            </div>
          </div>

          <div class="pager">
            <button class="ghost-btn" :disabled="pagination.pageNum <= 1" @click="prevPage">上一页</button>
            <span>第 {{ pagination.pageNum }} 页</span>
            <button class="ghost-btn" :disabled="pagination.pageNum * pagination.pageSize >= pagination.total" @click="nextPage">下一页</button>
          </div>
        </section>
      </section>
    </main>
  </div>
</template>

<style scoped>
.dashboard-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 22px;
  padding: 22px;
}

.dashboard-sidebar {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 22px;
  border: 1px solid var(--line);
  border-radius: var(--radius-xl);
  background: var(--bg-elevated);
  backdrop-filter: blur(20px);
  box-shadow: var(--shadow);
}

.brand {
  display: flex;
  align-items: center;
  gap: 14px;
}

.brand-mark {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, rgba(15, 118, 110, 0.16), rgba(37, 99, 235, 0.16));
  color: #0f766e;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.brand-name {
  font-size: 1.02rem;
  font-weight: 700;
  color: var(--text-main);
}

.brand-subtitle {
  color: var(--text-faint);
  margin-top: 2px;
}

.dashboard-nav {
  display: grid;
  gap: 10px;
}

.nav-item {
  border: 1px solid transparent;
  border-radius: 16px;
  padding: 12px 14px;
  text-align: left;
  background: transparent;
  color: var(--text-soft);
  cursor: pointer;
}

.nav-item.active {
  border-color: rgba(15, 118, 110, 0.15);
  background: rgba(15, 118, 110, 0.08);
  color: var(--text-main);
}

.sidebar-card {
  margin-top: auto;
  border-radius: 18px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.75);
  border: 1px solid var(--line);
}

.sidebar-card__title,
.sidebar-card__hint,
.metric-card span,
.section-note,
.empty-state,
.table-meta,
.role-options,
.eyebrow {
  color: var(--text-faint);
}

.sidebar-card__value {
  margin: 8px 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.secondary-btn {
  margin-top: auto;
}

.secondary-btn--ghost {
  margin-top: 0;
}

.dashboard-main {
  display: grid;
  gap: 18px;
}

.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 22px 24px;
}

.topbar h1 {
  margin-top: 10px;
  font-size: clamp(1.65rem, 2vw, 2.25rem);
}

.topbar-actions {
  display: flex;
  gap: 10px;
}

.card {
  border: 1px solid var(--line);
  border-radius: var(--radius-xl);
  background: var(--bg-elevated);
  backdrop-filter: blur(20px);
  box-shadow: var(--shadow);
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 18px;
}

.metric-card {
  padding: 20px;
  display: grid;
  gap: 10px;
}

.metric-card:nth-child(1) {
  grid-column: span 4;
}

.metric-card:nth-child(2) {
  grid-column: span 4;
}

.metric-card:nth-child(3) {
  grid-column: span 4;
}

.info-panel {
  grid-column: span 7;
}

.activity-panel {
  grid-column: span 5;
}

.metric-card strong {
  font-size: 2rem;
  letter-spacing: -0.03em;
}

.metric-card[data-tone='teal'] strong {
  color: #0f766e;
}

.metric-card[data-tone='blue'] strong {
  color: #2563eb;
}

.metric-card[data-tone='amber'] strong {
  color: #b45309;
}

.metric-card[data-tone='rose'] strong {
  color: #be123c;
}

.info-panel,
.activity-panel,
.form-card,
.table-card {
  padding: 22px;
}

.focus-grid {
  display: grid;
  gap: 14px;
}

.focus-card {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  padding: 14px 0;
  border-top: 1px solid rgba(148, 163, 184, 0.16);
}

.focus-card:first-child {
  border-top: 0;
  padding-top: 0;
}

.focus-card span {
  width: 10px;
  height: 10px;
  margin-top: 6px;
  border-radius: 999px;
  background: var(--line-strong);
  flex: none;
}

.focus-card span[data-accent='teal'] {
  background: #0f766e;
}

.focus-card span[data-accent='blue'] {
  background: #2563eb;
}

.focus-card span[data-accent='amber'] {
  background: #b45309;
}

.focus-card h3,
.activity-item strong {
  font-size: 1rem;
  color: var(--text-main);
}

.focus-card p,
.activity-item p {
  margin-top: 5px;
  color: var(--text-soft);
}

.activity-list {
  display: grid;
  gap: 14px;
}

.activity-item {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 0;
  border-top: 1px solid rgba(148, 163, 184, 0.16);
}

.activity-item:first-child {
  border-top: 0;
  padding-top: 0;
}

.activity-item span {
  color: var(--text-faint);
  white-space: nowrap;
}

.role-layout {
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 18px;
}

.role-form {
  display: grid;
  gap: 14px;
}

.role-form label {
  display: grid;
  gap: 8px;
}

.role-form span {
  color: var(--text-soft);
}

.role-form input,
.role-form textarea {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 13px 14px;
  background: rgba(255, 255, 255, 0.9);
  outline: none;
}

.role-form input:focus,
.role-form textarea:focus {
  border-color: rgba(15, 118, 110, 0.35);
  box-shadow: 0 0 0 4px rgba(15, 118, 110, 0.08);
}

.form-actions,
.pager,
.row-actions,
.topbar-actions {
  display: flex;
  align-items: center;
}

.form-actions,
.pager {
  justify-content: space-between;
}

.primary-btn,
.ghost-btn,
.secondary-btn,
.text-btn {
  border: 0;
  border-radius: 14px;
  padding: 11px 14px;
  cursor: pointer;
}

.primary-btn {
  background: linear-gradient(135deg, #0f766e, #115e59);
  color: #fff;
}

.ghost-btn,
.secondary-btn,
.text-btn {
  background: rgba(255, 255, 255, 0.68);
  color: var(--text-main);
  border: 1px solid var(--line);
}

.text-btn {
  padding: 8px 12px;
}

.text-btn.danger {
  color: #b42318;
}

.table {
  display: grid;
  gap: 10px;
  margin-top: 16px;
}

.table-row {
  display: grid;
  grid-template-columns: 90px 1fr 1.5fr 160px;
  gap: 14px;
  padding: 14px 12px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.6);
}

.table-head {
  background: transparent;
  color: var(--text-faint);
}

.role-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.role-options span {
  padding: 7px 10px;
  border-radius: 999px;
  background: rgba(15, 118, 110, 0.08);
}

.empty-state {
  padding: 28px 0 10px;
}

.form-error {
  color: #b42318;
}

@media (max-width: 1120px) {
  .dashboard-shell {
    grid-template-columns: 1fr;
  }

  .metric-card:nth-child(1),
  .metric-card:nth-child(2),
  .metric-card:nth-child(3),
  .info-panel,
  .activity-panel {
    grid-column: span 12;
  }

  .role-layout,
  .overview-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .dashboard-shell {
    padding: 14px;
  }

  .topbar,
  .form-actions,
  .pager {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .table-row {
    grid-template-columns: 1fr;
  }

  .activity-item {
    flex-direction: column;
  }
}
</style>
