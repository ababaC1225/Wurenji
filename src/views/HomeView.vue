<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { addDrone, fetchDroneList, updateDroneStatus } from '../api/drone'
import { createOrder, generateOrderTask } from '../api/order'
import { fetchSchedulerOrderPage } from '../api/scheduler'
import { fetchAlarmPage, handleAlarm } from '../api/maintenance'
import { createUser, fetchUserPage, updateUser, updateUserStatus } from '../api/sys'
import { fetchDroneHealth, fetchOrderFulfill, fetchTaskMonitor } from '../api/view'
import { useAuthStore } from '../stores/auth'
import type {
  AlarmEventItem,
  CustomerOrderItem,
  DroneHealthItem,
  DroneItem,
  SysUser,
  TaskMonitorItem,
  UserForm,
} from '../types/api'

const router = useRouter()
const auth = useAuthStore()

type TabKey = 'overview' | 'drones' | 'orders' | 'alarms' | 'users'

const activeTab = ref<TabKey>('overview')
const loading = ref(false)
const fallbackMode = ref(false)
const actionMessage = ref('')
const actionError = ref('')

const drones = ref<DroneItem[]>([])
const orders = ref<CustomerOrderItem[]>([])
const alarms = ref<AlarmEventItem[]>([])
const users = ref<SysUser[]>([])
const taskMonitor = ref<TaskMonitorItem[]>([])
const droneHealth = ref<DroneHealthItem[]>([])
const orderTotal = ref(0)
const alarmTotal = ref(0)
const userTotal = ref(0)
const editingUserId = ref<number | null>(null)

const orderPage = reactive({ current: 1, size: 8 })
const alarmPage = reactive({ current: 1, size: 8 })
const userPage = reactive({ current: 1, size: 8 })

const droneForm = reactive<DroneItem>({
  droneCode: '',
  model: 'DJI M300',
  parkId: 1,
  maxPayload: 5,
  batteryCapacity: 100,
})

const orderForm = reactive<CustomerOrderItem>({
  pickupPointId: 1,
  deliveryPointId: 3,
  cargoName: '',
  cargoWeight: 2.5,
  priority: '普通',
})

const userForm = reactive<UserForm>({
  roleId: 1,
  username: '',
  passwordHash: '',
  realName: '',
  phone: '',
  status: 1,
})

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'overview', label: '总览' },
  { key: 'drones', label: '无人机' },
  { key: 'orders', label: '订单调度' },
  { key: 'alarms', label: '告警维护' },
  { key: 'users', label: '系统用户' },
]

const roleOptions = [
  { roleId: 1, roleName: '管理员' },
  { roleId: 2, roleName: '调度员' },
]

const demoDrones: DroneItem[] = [
  { droneId: 1, droneCode: 'UAV-001', model: 'DJI M300', maxPayload: 5, batteryCapacity: 96, status: '空闲', healthScore: 98 },
  { droneId: 2, droneCode: 'UAV-002', model: 'DJI M200', maxPayload: 3, batteryCapacity: 82, status: '任务中', healthScore: 91 },
  { droneId: 3, droneCode: 'UAV-003', model: 'DJI M210', maxPayload: 4, batteryCapacity: 64, status: '维护中', healthScore: 73 },
]

const demoOrders: CustomerOrderItem[] = [
  { orderId: 1, orderNo: 'ORD-20260627-001', cargoName: '医疗物资', cargoWeight: 1.8, priority: '加急', orderStatus: '执行中', createdAt: '2026-06-27T09:20:00' },
  { orderId: 2, orderNo: 'ORD-20260627-002', cargoName: '快递包裹', cargoWeight: 2.5, priority: '普通', orderStatus: '待审核', createdAt: '2026-06-27T10:15:00' },
]

const demoAlarms: AlarmEventItem[] = [
  { alarmId: 1, droneId: 3, alarmType: '电量过低', alarmLevel: '警告', alarmStatus: '待处理', alarmTime: '2026-06-27T10:00:00' },
  { alarmId: 2, droneId: 2, alarmType: '设备异常', alarmLevel: '严重', alarmStatus: '已处理', alarmTime: '2026-06-27T09:10:00', handleResult: '已安排返航检修' },
]

const demoUsers: SysUser[] = [
  { userId: 1, roleId: 1, username: 'admin', realName: '管理员', phone: '13800000000', status: 1 },
  { userId: 2, roleId: 2, username: 'dispatcher', realName: '调度员', phone: '13900000000', status: 1 },
]

const demoTasks: TaskMonitorItem[] = [
  { taskId: 1, orderNo: 'ORD-20260627-001', droneCode: 'UAV-002', routeName: '总部到南区航线', taskStatus: '执行中', plannedStartTime: '2026-06-27T10:30:00' },
  { taskId: 2, orderNo: 'ORD-20260627-002', droneCode: 'UAV-001', routeName: '总部到东区航线', taskStatus: '待起飞', plannedStartTime: '2026-06-27T11:00:00' },
]

function applyDemoOverview() {
  taskMonitor.value = demoTasks.map((item) => ({ ...item }))
  droneHealth.value = demoDrones.map((item) => ({
    droneId: item.droneId,
    droneCode: item.droneCode,
    model: item.model,
    status: item.status,
    healthScore: item.healthScore,
  }))
  if (!orderTotal.value) orderTotal.value = demoOrders.length
}

function applyDemoData() {
  fallbackMode.value = true
  drones.value = demoDrones.map((item) => ({ ...item }))
  orders.value = demoOrders.map((item) => ({ ...item }))
  alarms.value = demoAlarms.map((item) => ({ ...item }))
  users.value = demoUsers.map((item) => ({ ...item }))
  applyDemoOverview()
  orderTotal.value = demoOrders.length
  alarmTotal.value = demoAlarms.length
  userTotal.value = demoUsers.length
}

function updateLocalDroneStatus(droneId: number, status: string) {
  drones.value = drones.value.map((item) =>
    item.droneId === droneId
      ? {
          ...item,
          status,
        }
      : item,
  )
  droneHealth.value = droneHealth.value.map((item) =>
    item.droneId === droneId
      ? {
          ...item,
          status,
        }
      : item,
  )
}

const metrics = computed(() => [
  { label: '无人机总数', value: String(drones.value.length), hint: `${availableDroneCount.value} 架可调度` },
  { label: '任务数量', value: String(taskMonitor.value.length), hint: '当前任务监控记录' },
  { label: '订单数量', value: String(orderTotal.value || orders.value.length), hint: '订单分页统计' },
  { label: '待处理告警', value: String(pendingAlarmCount.value), hint: `告警总数 ${alarmTotal.value || alarms.value.length}` },
])

const availableDroneCount = computed(
  () => drones.value.filter((item) => ['空闲', '正常', undefined, ''].includes(item.status)).length,
)
const pendingAlarmCount = computed(
  () => alarms.value.filter((item) => item.alarmStatus !== '已处理').length,
)

function showSuccess(message: string) {
  actionMessage.value = message
  actionError.value = ''
}

function showError(error: unknown, fallback: string) {
  actionMessage.value = ''
  actionError.value = error instanceof Error ? error.message : fallback
}

function pageItems<T>(page: { list?: T[]; records?: T[] }) {
  return page.list ?? page.records ?? []
}

function roleNameOf(roleId?: number) {
  return roleOptions.find((role) => role.roleId === roleId)?.roleName ?? `角色 ${roleId ?? '-'}`
}

function statusText(status?: number) {
  return status === 0 ? '停用' : '正常'
}

function formatDate(value?: string) {
  if (!value) return '-'
  return value.replace('T', ' ').slice(0, 16)
}

async function loadOverview() {
  if (auth.token.startsWith('demo-') || fallbackMode.value) {
    applyDemoOverview()
    showSuccess('已刷新演示任务数据')
    return
  }

  try {
    const [tasks, health, fulfillment] = await Promise.all([
      fetchTaskMonitor(),
      fetchDroneHealth(),
      fetchOrderFulfill(),
    ])

    fallbackMode.value = false
    taskMonitor.value = tasks
    droneHealth.value = health
    if (Array.isArray(fulfillment) && fulfillment.length > 0 && !orderTotal.value) {
      orderTotal.value = fulfillment.length
    }
  } catch (error) {
    if (!taskMonitor.value.length) applyDemoOverview()
    fallbackMode.value = true
    showError(error, '任务监控同步失败，已保留当前数据')
  }
}

async function loadDrones() {
  drones.value = await fetchDroneList()
}

async function loadOrders() {
  const page = await fetchSchedulerOrderPage(orderPage)
  orders.value = pageItems<CustomerOrderItem>(page)
  orderTotal.value = page.total
}

async function loadAlarms() {
  const page = await fetchAlarmPage(alarmPage)
  alarms.value = pageItems<AlarmEventItem>(page)
  alarmTotal.value = page.total
}

async function loadUsers() {
  const page = await fetchUserPage(userPage)
  users.value = pageItems<SysUser>(page)
  userTotal.value = page.total
}

async function loadAll() {
  loading.value = true
  actionError.value = ''

  try {
    await Promise.all([loadOverview(), loadDrones(), loadOrders(), loadAlarms(), loadUsers()])
    fallbackMode.value = false
  } catch (error) {
    applyDemoData()
    showError(error, '后端未连通，已切换为演示数据')
  } finally {
    loading.value = false
  }
}

async function submitDrone() {
  try {
    await addDrone({ ...droneForm })
    Object.assign(droneForm, { droneCode: '', model: 'DJI M300', parkId: 1, maxPayload: 5, batteryCapacity: 100 })
    await loadDrones()
    showSuccess('无人机已新增')
  } catch (error) {
    showError(error, '无人机新增失败')
  }
}

async function setDroneStatus(item: DroneItem, status: string) {
  if (!item.droneId) return

  try {
    if (auth.token.startsWith('demo-')) {
      updateLocalDroneStatus(item.droneId, status)
      showSuccess(`无人机 ${item.droneCode} 状态已切换为 ${status}`)
      return
    }

    updateLocalDroneStatus(item.droneId, status)
    await updateDroneStatus(item.droneId, status)
    await Promise.all([loadDrones(), loadOverview()])
    showSuccess(`无人机 ${item.droneCode} 状态已更新`)
  } catch (error) {
    updateLocalDroneStatus(item.droneId, status)
    showError(error, `后端未确认，页面已临时显示为 ${status}`)
  }
}

async function submitOrder() {
  try {
    await createOrder({ ...orderForm })
    Object.assign(orderForm, { pickupPointId: 1, deliveryPointId: 3, cargoName: '', cargoWeight: 2.5, priority: '普通' })
    await loadOrders()
    showSuccess('订单已创建')
  } catch (error) {
    showError(error, '订单创建失败')
  }
}

async function generateTask(order: CustomerOrderItem) {
  if (!order.orderId) return

  try {
    const message = await generateOrderTask(order.orderId)
    await Promise.all([loadOrders(), loadOverview()])
    showSuccess(message || '配送任务已生成')
  } catch (error) {
    showError(error, '任务生成失败')
  }
}

async function resolveAlarm(item: AlarmEventItem) {
  if (!item.alarmId) return

  try {
    await handleAlarm({
      ...item,
      alarmStatus: '已处理',
      handlerId: auth.profile?.userId || undefined,
      handleResult: item.handleResult || '平台确认处理',
    })
    await loadAlarms()
    showSuccess('告警已处理')
  } catch (error) {
    showError(error, '告警处理失败')
  }
}

function resetUserForm() {
  editingUserId.value = null
  Object.assign(userForm, { roleId: 1, username: '', passwordHash: '', realName: '', phone: '', status: 1 })
}

function editUser(item: SysUser) {
  editingUserId.value = item.userId
  Object.assign(userForm, {
    roleId: item.roleId,
    username: item.username,
    passwordHash: '',
    realName: item.realName,
    phone: item.phone ?? '',
    status: item.status ?? 1,
  })
}

async function submitUser() {
  try {
    if (editingUserId.value) {
      await updateUser({ ...userForm, userId: editingUserId.value, passwordHash: userForm.passwordHash || undefined })
      showSuccess('用户已更新')
    } else {
      await createUser({ ...userForm })
      showSuccess('用户已创建')
    }

    resetUserForm()
    await loadUsers()
  } catch (error) {
    showError(error, '用户保存失败')
  }
}

async function toggleUserStatus(item: SysUser) {
  try {
    await updateUserStatus(item.userId, item.status === 0 ? 1 : 0)
    await loadUsers()
    showSuccess('用户状态已更新')
  } catch (error) {
    showError(error, '用户状态更新失败')
  }
}

async function logout() {
  auth.clearSession()
  await router.push('/login')
}

onMounted(loadAll)
</script>

<template>
  <div class="platform-shell">
    <aside class="sidebar">
      <div class="brand">
        <span>UAV</span>
        <div>
          <strong>无人机管理平台</strong>
          <p>{{ auth.profile?.realName ?? '系统用户' }}</p>
        </div>
      </div>

      <nav class="nav-list">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          :class="['nav-item', { active: activeTab === tab.key }]"
          type="button"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </nav>

      <div class="user-panel">
        <span>当前角色</span>
        <strong>{{ auth.profile?.role || 'demo' }}</strong>
        <p>ID {{ auth.profile?.userId ?? '-' }}</p>
      </div>

      <button class="outline-btn" type="button" @click="loadAll">刷新数据</button>
      <button class="outline-btn" type="button" @click="logout">退出登录</button>
    </aside>

    <main class="content">
      <header class="page-head card">
        <div>
          <p class="eyebrow">当前模块</p>
          <h1>{{ tabs.find((tab) => tab.key === activeTab)?.label }}</h1>
        </div>
        <div class="status-area">
          <span v-if="loading">正在同步...</span>
          <span v-else>API: localhost:8082</span>
        </div>
      </header>

      <p v-if="actionMessage" class="notice success">{{ actionMessage }}</p>
      <p v-if="actionError" class="notice error">{{ actionError }}</p>

      <section v-if="activeTab === 'overview'" class="overview-grid">
        <article v-for="item in metrics" :key="item.label" class="metric card">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
          <p>{{ item.hint }}</p>
        </article>

        <section class="card wide-panel">
          <div class="section-title">
            <h2>任务监控</h2>
            <button class="text-btn" type="button" @click="loadOverview">刷新</button>
          </div>
          <div class="compact-table">
            <div class="table-row table-head">
              <span>任务</span><span>订单</span><span>无人机</span><span>状态</span><span>计划时间</span>
            </div>
            <div v-for="item in taskMonitor" :key="item.taskId" class="table-row">
              <span>{{ item.taskId ?? '-' }}</span><span>{{ item.orderNo ?? '-' }}</span><span>{{ item.droneCode ?? '-' }}</span><span>{{ item.taskStatus ?? '-' }}</span><span>{{ formatDate(item.plannedStartTime) }}</span>
            </div>
            <p v-if="!taskMonitor.length" class="empty-state">暂无任务监控数据</p>
          </div>
        </section>

        <section class="card side-panel">
          <div class="section-title"><h2>设备健康</h2></div>
          <div class="health-list">
            <div v-for="item in droneHealth" :key="item.droneId" class="health-item">
              <div><strong>{{ item.droneCode }}</strong><span>{{ item.model }}</span></div>
              <b>{{ item.healthScore ?? '-' }}</b>
            </div>
            <p v-if="!droneHealth.length" class="empty-state">暂无健康数据</p>
          </div>
        </section>
      </section>

      <section v-else-if="activeTab === 'drones'" class="split-layout">
        <section class="card form-panel">
          <div class="section-title"><h2>新增无人机</h2></div>
          <form class="field-grid" @submit.prevent="submitDrone">
            <label><span>编号</span><input v-model="droneForm.droneCode" required placeholder="UAV-005" /></label>
            <label><span>型号</span><input v-model="droneForm.model" placeholder="DJI M300" /></label>
            <label><span>园区 ID</span><input v-model.number="droneForm.parkId" type="number" min="1" /></label>
            <label><span>最大载重 kg</span><input v-model.number="droneForm.maxPayload" type="number" min="0" step="0.1" /></label>
            <label><span>电池容量</span><input v-model.number="droneForm.batteryCapacity" type="number" min="0" max="100" /></label>
            <button class="primary-btn" type="submit">新增无人机</button>
          </form>
        </section>

        <section class="card table-panel">
          <div class="section-title"><h2>无人机列表</h2><button class="text-btn" @click="loadDrones">刷新</button></div>
          <div class="table drone-table">
            <div class="table-row table-head"><span>编号</span><span>型号</span><span>载重</span><span>电量</span><span>健康</span><span>状态</span><span>操作</span></div>
            <div v-for="item in drones" :key="item.droneId" class="table-row">
              <span>{{ item.droneCode }}</span><span>{{ item.model ?? '-' }}</span><span>{{ item.maxPayload ?? '-' }}</span><span>{{ item.batteryCapacity ?? '-' }}</span><span>{{ item.healthScore ?? '-' }}</span><span>{{ item.status ?? '空闲' }}</span>
              <span class="row-actions">
                <button class="text-btn" @click="setDroneStatus(item, '空闲')">空闲</button>
                <button class="text-btn" @click="setDroneStatus(item, '任务中')">任务中</button>
                <button class="text-btn" @click="setDroneStatus(item, '维护中')">维护中</button>
                <button class="text-btn danger" @click="setDroneStatus(item, '停用')">停用</button>
              </span>
            </div>
          </div>
        </section>
      </section>

      <section v-else-if="activeTab === 'orders'" class="split-layout">
        <section class="card form-panel">
          <div class="section-title"><h2>创建订单</h2></div>
          <form class="field-grid" @submit.prevent="submitOrder">
            <label><span>货物名称</span><input v-model="orderForm.cargoName" required placeholder="医疗物资" /></label>
            <label><span>货物重量 kg</span><input v-model.number="orderForm.cargoWeight" type="number" min="0" step="0.1" /></label>
            <label><span>取货点 ID</span><input v-model.number="orderForm.pickupPointId" type="number" min="1" /></label>
            <label><span>送达点 ID</span><input v-model.number="orderForm.deliveryPointId" type="number" min="1" /></label>
            <label><span>优先级</span><select v-model="orderForm.priority"><option>普通</option><option>加急</option></select></label>
            <button class="primary-btn" type="submit">创建订单</button>
          </form>
        </section>

        <section class="card table-panel">
          <div class="section-title"><h2>订单列表</h2><button class="text-btn" @click="loadOrders">刷新</button></div>
          <div class="table order-table">
            <div class="table-row table-head"><span>订单号</span><span>货物</span><span>重量</span><span>优先级</span><span>状态</span><span>创建时间</span><span>操作</span></div>
            <div v-for="item in orders" :key="item.orderId" class="table-row">
              <span>{{ item.orderNo ?? item.orderId }}</span><span>{{ item.cargoName ?? '-' }}</span><span>{{ item.cargoWeight ?? '-' }}</span><span>{{ item.priority ?? '-' }}</span><span>{{ item.orderStatus ?? '-' }}</span><span>{{ formatDate(item.createdAt) }}</span><span><button class="text-btn" @click="generateTask(item)">生成任务</button></span>
            </div>
          </div>
        </section>
      </section>

      <section v-else-if="activeTab === 'alarms'" class="card table-panel full-width">
        <div class="section-title"><h2>告警维护</h2><button class="text-btn" @click="loadAlarms">刷新</button></div>
        <div class="table alarm-table">
          <div class="table-row table-head"><span>ID</span><span>无人机</span><span>类型</span><span>等级</span><span>状态</span><span>时间</span><span>处理结果</span><span>操作</span></div>
          <div v-for="item in alarms" :key="item.alarmId" class="table-row">
            <span>{{ item.alarmId }}</span><span>{{ item.droneId ?? '-' }}</span><span>{{ item.alarmType ?? '-' }}</span><span>{{ item.alarmLevel ?? '-' }}</span><span>{{ item.alarmStatus ?? '-' }}</span><span>{{ formatDate(item.alarmTime) }}</span><span>{{ item.handleResult ?? '-' }}</span><span><button class="text-btn" @click="resolveAlarm(item)">标记处理</button></span>
          </div>
        </div>
      </section>

      <section v-else class="split-layout">
        <section class="card form-panel">
          <div class="section-title"><h2>{{ editingUserId ? '编辑用户' : '新增用户' }}</h2></div>
          <form class="field-grid" @submit.prevent="submitUser">
            <label><span>用户名</span><input v-model="userForm.username" required /></label>
            <label><span>密码</span><input v-model="userForm.passwordHash" :required="!editingUserId" type="password" /></label>
            <label><span>真实姓名</span><input v-model="userForm.realName" required /></label>
            <label><span>手机</span><input v-model="userForm.phone" /></label>
            <label><span>角色</span><select v-model.number="userForm.roleId"><option v-for="role in roleOptions" :key="role.roleId" :value="role.roleId">{{ role.roleName }}</option></select></label>
            <label><span>状态</span><select v-model.number="userForm.status"><option :value="1">正常</option><option :value="0">停用</option></select></label>
            <div class="button-row"><button class="outline-btn" type="button" @click="resetUserForm">清空</button><button class="primary-btn" type="submit">保存用户</button></div>
          </form>
        </section>

        <section class="card table-panel">
          <div class="section-title"><h2>用户列表</h2><button class="text-btn" @click="loadUsers">刷新</button></div>
          <div class="table user-table">
            <div class="table-row table-head"><span>ID</span><span>用户名</span><span>姓名</span><span>角色</span><span>状态</span><span>操作</span></div>
            <div v-for="item in users" :key="item.userId" class="table-row">
              <span>{{ item.userId }}</span><span>{{ item.username }}</span><span>{{ item.realName }}</span><span>{{ roleNameOf(item.roleId) }}</span><span>{{ statusText(item.status) }}</span><span class="row-actions"><button class="text-btn" @click="editUser(item)">编辑</button><button class="text-btn" @click="toggleUserStatus(item)">{{ item.status === 0 ? '启用' : '停用' }}</button></span>
            </div>
          </div>
        </section>
      </section>
    </main>
  </div>
</template>

<style scoped>
.platform-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 248px minmax(0, 1fr);
  gap: 18px;
  width: 100%;
  margin: 0;
  padding: 18px;
  background: #e8ecef;
  font-size: 16px;
}

.sidebar,
.card {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 18px;
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);
}

.sidebar {
  position: sticky;
  top: 18px;
  height: calc(100vh - 36px);
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 20px 16px;
  background: #111315;
  color: #f8fafc;
}

.card {
  background: #fffdf8;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 4px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.brand > span {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  flex: none;
  border-radius: 14px;
  background: #f6d74b;
  color: #111315;
  font-weight: 850;
  font-size: 0.92rem;
}

.brand strong,
.section-title h2,
.page-head h1,
.metric strong {
  font-weight: 800;
}

.brand strong {
  font-size: 1.02rem;
}

.brand p,
.user-panel p,
.metric p,
.metric span,
.status-area,
.empty-state,
.field-grid span,
.eyebrow {
  color: #6b7280;
}

.sidebar .brand p,
.sidebar .user-panel p,
.sidebar .user-panel span {
  color: rgba(248, 250, 252, 0.62);
}

.nav-list {
  display: grid;
  gap: 8px;
}

.nav-item,
.primary-btn,
.outline-btn,
.text-btn,
input,
select {
  border-radius: 12px;
  font: inherit;
}

.nav-item {
  width: 100%;
  border: 1px solid transparent;
  padding: 12px 14px;
  background: transparent;
  color: rgba(248, 250, 252, 0.72);
  cursor: pointer;
  text-align: left;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
}

.nav-item.active {
  border-color: rgba(246, 215, 75, 0.35);
  background: #f6d74b;
  color: #111315;
  font-weight: 800;
}

.user-panel {
  margin-top: auto;
  padding: 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.08);
}

.user-panel strong {
  display: block;
  margin-top: 4px;
  font-weight: 750;
  color: #ffffff;
}

.sidebar > .outline-btn {
  width: 100%;
  border-color: rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
}

.content {
  min-width: 0;
  display: grid;
  align-content: start;
  gap: 18px;
}

.page-head,
.section-title,
.button-row,
.row-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.page-head {
  padding: 26px 30px;
  background: #fffdf8;
}

.eyebrow {
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: #0f766e;
}

.page-head h1 {
  margin-top: 4px;
  font-size: clamp(2rem, 2.6vw, 2.8rem);
  line-height: 1.08;
}

.status-area {
  font-size: 0.94rem;
  white-space: nowrap;
}

.notice {
  padding: 12px 16px;
  border-radius: 14px;
  border: 1px solid transparent;
  font-size: 0.95rem;
}

.notice.success {
  color: #0f5132;
  background: #d1e7dd;
  border-color: #badbcc;
}

.notice.error {
  color: #842029;
  background: #f8d7da;
  border-color: #f5c2c7;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 18px;
}

.metric {
  grid-column: span 3;
  display: grid;
  gap: 10px;
  padding: 24px;
  min-height: 158px;
  border: 0;
  box-shadow: none;
}

.metric:nth-child(1) {
  background: #f6d74b;
}

.metric:nth-child(2) {
  background: #ffc1dc;
}

.metric:nth-child(3) {
  background: #cddc8d;
}

.metric:nth-child(4) {
  background: #1f2937;
}

.metric:nth-child(4),
.metric:nth-child(4) span,
.metric:nth-child(4) p,
.metric:nth-child(4) strong {
  color: #ffffff;
}

.metric span {
  font-size: 0.94rem;
  color: rgba(17, 19, 21, 0.72);
}

.metric strong {
  color: #111315;
  font-size: 2.75rem;
  line-height: 1;
}

.metric p {
  color: rgba(17, 19, 21, 0.68);
}

.wide-panel,
.table-panel,
.side-panel,
.form-panel {
  padding: 28px;
}

.wide-panel {
  grid-column: span 8;
}

.side-panel {
  grid-column: span 4;
}

.table-panel,
.form-panel {
  grid-column: 1 / -1;
}

.section-title h2 {
  font-size: 1.32rem;
}

.split-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 18px;
  align-items: start;
}

.split-layout > .form-panel,
.split-layout > .table-panel {
  width: 100%;
}

.field-grid,
.health-list {
  display: grid;
  gap: 18px;
}

.form-panel .field-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: end;
}

.form-panel .field-grid .primary-btn,
.form-panel .field-grid .button-row {
  align-self: end;
}

.form-panel .field-grid > .primary-btn {
  width: 100%;
  min-height: 50px;
}

.full-width {
  grid-column: 1 / -1;
}

.field-grid label {
  display: grid;
  gap: 10px;
}

input,
select {
  width: 100%;
  border: 1px solid rgba(15, 23, 42, 0.12);
  padding: 13px 14px;
  min-height: 50px;
  background: #ffffff;
  outline: none;
  font-size: 1rem;
}

input:focus,
select:focus {
  border-color: rgba(15, 118, 110, 0.45);
  box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.08);
}

.primary-btn,
.outline-btn,
.text-btn {
  border: 1px solid rgba(15, 23, 42, 0.12);
  padding: 11px 14px;
  min-height: 44px;
  cursor: pointer;
  font-weight: 750;
}

.primary-btn {
  border-color: #0f766e;
  background: #0f766e;
  color: #fff;
}

.outline-btn,
.text-btn {
  background: #ffffff;
  color: #111315;
}

.text-btn.danger {
  color: #b42318;
}

.table,
.compact-table {
  display: grid;
  gap: 12px;
  margin-top: 16px;
  overflow-x: auto;
}

.table-row {
  min-width: 780px;
  display: grid;
  gap: 14px;
  align-items: center;
  padding: 16px 14px;
  border-radius: 14px;
  background: #f6f7f4;
  line-height: 1.35;
}

.table-head {
  background: transparent;
  color: #6b7280;
  font-weight: 800;
}

.compact-table .table-row {
  grid-template-columns: 80px 1.2fr 1fr 1fr 1.2fr;
}

.drone-table .table-row,
.order-table .table-row {
  grid-template-columns: 1.1fr 1fr 0.7fr 0.7fr 0.7fr 0.9fr 1.3fr;
}

.alarm-table .table-row {
  grid-template-columns: 70px 90px 1fr 0.8fr 0.9fr 1.2fr 1.4fr 1fr;
}

.user-table .table-row {
  grid-template-columns: 70px 1fr 1fr 0.9fr 0.8fr 1.4fr;
}

.health-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 0;
  border-top: 1px solid rgba(15, 23, 42, 0.08);
}

.health-item:first-child {
  border-top: 0;
}

.health-item div {
  display: grid;
  gap: 2px;
}

.health-item strong {
  font-weight: 800;
}

.health-item b {
  color: #0f766e;
  font-size: 1.6rem;
}

.empty-state {
  padding: 20px 0;
}

@media (max-width: 1100px) {
  .platform-shell {
    grid-template-columns: 1fr;
  }

  .sidebar {
    position: static;
    height: auto;
    display: grid;
    grid-template-columns: 1fr;
  }

  .brand {
    padding-bottom: 12px;
  }

  .nav-list {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .nav-item,
  .sidebar > .outline-btn {
    text-align: center;
  }

  .user-panel {
    margin-top: 0;
  }

  .metric {
    grid-column: span 6;
  }

  .wide-panel,
  .side-panel {
    grid-column: span 12;
  }

  .form-panel .field-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .platform-shell {
    width: 100%;
    padding: 12px;
    gap: 14px;
    font-size: 15px;
  }

  .sidebar,
  .card {
    border-radius: 16px;
  }

  .sidebar,
  .page-head,
  .wide-panel,
  .table-panel,
  .side-panel,
  .form-panel {
    padding: 18px;
  }

  .nav-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .page-head,
  .section-title,
  .button-row {
    align-items: stretch;
    flex-direction: column;
  }

  .status-area {
    white-space: normal;
  }

  .overview-grid {
    grid-template-columns: 1fr;
  }

  .metric,
  .wide-panel,
  .table-panel,
  .side-panel {
    grid-column: auto;
  }

  .form-panel .field-grid {
    grid-template-columns: 1fr;
  }

  .table,
  .compact-table {
    overflow-x: visible;
  }

  .table-head {
    display: none;
  }

  .table-row,
  .compact-table .table-row,
  .drone-table .table-row,
  .order-table .table-row,
  .alarm-table .table-row,
  .user-table .table-row {
    min-width: 0;
    grid-template-columns: 1fr;
    gap: 8px;
    padding: 14px;
  }

  .table-row span {
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .row-actions {
    justify-content: flex-start;
    flex-wrap: wrap;
  }
}
</style>
