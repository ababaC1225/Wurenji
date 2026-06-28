<script setup lang="ts">
import { computed, onMounted, reactive, ref, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { addDrone, fetchDroneList, searchDrones, updateDroneStatus } from '../api/drone'
import { createOrder, generateOrderTask } from '../api/order'
import {
  fetchRoutePage,
  fetchSchedulerOrderPage,
  fetchTaskPage,
  searchRoutePage,
  searchSchedulerOrders,
  searchTaskPage,
} from '../api/scheduler'
import { fetchAlarmPage, handleAlarm, searchAlarmPage } from '../api/maintenance'
import { createUser, fetchUserPage, searchUserPage, updateUser, updateUserStatus } from '../api/sys'
import { fetchDroneHealth, fetchOrderFulfill, fetchTaskMonitor } from '../api/view'
import { useAuthStore } from '../stores/auth'
import type {
  AlarmEventItem,
  CustomerOrderItem,
  DroneHealthItem,
  DroneItem,
  FlightTaskItem,
  RouteItem,
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
const routes = ref<RouteItem[]>([])
const tasks = ref<FlightTaskItem[]>([])
const alarms = ref<AlarmEventItem[]>([])
const users = ref<SysUser[]>([])
const taskMonitor = ref<TaskMonitorItem[]>([])
const droneHealth = ref<DroneHealthItem[]>([])
const orderTotal = ref(0)
const routeTotal = ref(0)
const taskTotal = ref(0)
const alarmTotal = ref(0)
const userTotal = ref(0)
const editingUserId = ref<number | null>(null)

const orderPage = reactive({ current: 1, size: 8 })
const routePage = reactive({ current: 1, size: 8 })
const taskPage = reactive({ current: 1, size: 8 })
const alarmPage = reactive({ current: 1, size: 8 })
const userPage = reactive({ current: 1, size: 8 })
const droneFilter = reactive({
  droneCode: '',
  model: '',
  status: '',
  parkId: undefined as number | undefined,
})
const orderFilter = reactive({
  orderNo: '',
  orderStatus: '',
  priority: '',
})
const routeFilter = reactive({
  routeName: '',
  riskLevel: '',
  enabled: undefined as number | undefined,
})
const taskFilter = reactive({
  taskStatus: '',
  droneId: undefined as number | undefined,
  orderId: undefined as number | undefined,
})
const alarmFilter = reactive({
  alarmType: '',
  alarmLevel: '',
  alarmStatus: '',
  droneId: undefined as number | undefined,
})
const userFilter = reactive({
  username: '',
  realName: '',
  roleId: undefined as number | undefined,
  status: undefined as number | undefined,
})

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
  permissions: '',
})

const allPermissions = [
  'user:query',
  'user:add',
  'user:update',
  'user:delete',
  'role:query',
  'drone:query',
  'drone:add',
  'drone:update',
  'drone:delete',
  'order:query',
  'order:add',
  'order:update',
  'order:delete',
  'route:query',
  'route:add',
  'route:update',
  'route:delete',
  'task:query',
  'task:add',
  'task:update',
  'task:delete',
  'alarm:query',
  'alarm:handle',
  'maintenance:add',
  'stat:query',
  'log:query',
  'param:query',
  'param:update',
]

const dispatcherPermissions = [
  'order:query',
  'order:add',
  'order:update',
  'order:delete',
  'route:query',
  'route:add',
  'route:update',
  'route:delete',
  'task:query',
  'task:add',
  'task:update',
  'task:delete',
]

const operationsPermissions = [
  'drone:query',
  'drone:add',
  'drone:update',
  'drone:delete',
  'alarm:query',
  'alarm:handle',
  'maintenance:add',
]

const tabs: Array<{ key: TabKey; label: string; permission: string }> = [
  { key: 'overview', label: '总览', permission: 'stat:query' },
  { key: 'drones', label: '无人机', permission: 'drone:query' },
  { key: 'orders', label: '订单调度', permission: 'order:query' },
  { key: 'alarms', label: '告警维护', permission: 'alarm:query' },
  { key: 'users', label: '系统用户', permission: 'user:query' },
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

const demoRoutes: RouteItem[] = [
  { routeId: 1, routeName: '总部到南区航线', startPointId: 1, endPointId: 3, distanceKm: 8.4, estimateMinutes: 22, riskLevel: '低', enabled: 1 },
  { routeId: 2, routeName: '总部到东区航线', startPointId: 1, endPointId: 4, distanceKm: 12.6, estimateMinutes: 31, riskLevel: '中', enabled: 1 },
]

const demoFlightTasks: FlightTaskItem[] = [
  { taskId: 1, orderId: 1, droneId: 2, routeId: 1, taskStatus: '执行中', plannedStartTime: '2026-06-27T10:30:00' },
  { taskId: 2, orderId: 2, droneId: 1, routeId: 2, taskStatus: '待起飞', plannedStartTime: '2026-06-27T11:00:00' },
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

function nextId(items: Array<{ [key: string]: unknown }>, key: string) {
  return items.reduce((max, item) => Math.max(max, Number(item[key]) || 0), 0) + 1
}

function useMockData(message?: string) {
  fallbackMode.value = true
  if (message) showSuccess(message)
}

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
  routes.value = demoRoutes.map((item) => ({ ...item }))
  tasks.value = demoFlightTasks.map((item) => ({ ...item }))
  alarms.value = demoAlarms.map((item) => ({ ...item }))
  users.value = demoUsers.map((item) => ({ ...item }))
  applyDemoOverview()
  orderTotal.value = demoOrders.length
  routeTotal.value = demoRoutes.length
  taskTotal.value = demoFlightTasks.length
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

function upsertDroneHealth(item: DroneItem) {
  if (!item.droneId) return

  const healthItem = {
    droneId: item.droneId,
    droneCode: item.droneCode,
    model: item.model,
    status: item.status ?? '空闲',
    healthScore: item.healthScore ?? 100,
  }
  const existingIndex = droneHealth.value.findIndex((health) => health.droneId === item.droneId)

  if (existingIndex >= 0) {
    droneHealth.value.splice(existingIndex, 1, healthItem)
  } else {
    droneHealth.value.unshift(healthItem)
  }
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
const dataModeLabel = computed(() =>
  auth.token.startsWith('demo-') || fallbackMode.value ? 'MOCK: 本地数据' : 'API: 10.133.10.106:8082',
)
const permissionSet = computed(() => {
  const raw = auth.profile?.permissions

  if (raw === '*' || auth.profile?.role === 'demo' || auth.profile?.role === 'admin' || auth.profile?.roleId === 1) {
    return new Set(allPermissions)
  }

  if (raw?.trim()) {
    return new Set(raw.split(',').map((item) => item.trim()).filter(Boolean))
  }

  if (auth.profile?.roleId === 2) return new Set(dispatcherPermissions)
  if (auth.profile?.roleId === 3) return new Set(operationsPermissions)

  return new Set<string>()
})
const visibleTabs = computed(() => tabs.filter((tab) => can(tab.permission)))

function can(permission: string) {
  return permissionSet.value.has(permission)
}

watchEffect(() => {
  const firstTab = visibleTabs.value[0]
  if (!firstTab) return
  if (!visibleTabs.value.some((tab) => tab.key === activeTab.value)) {
    activeTab.value = firstTab.key
  }
})

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

function cleanQuery<T extends Record<string, unknown>>(params: T) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value !== undefined && value !== null),
  ) as Partial<T>
}

function hasQuery(params: Record<string, unknown>) {
  return Object.keys(cleanQuery(params)).length > 0
}

function includesText(value: unknown, keyword: string) {
  return !keyword || String(value ?? '').toLowerCase().includes(keyword.toLowerCase())
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
    useMockData('已刷新 mock 任务数据')
    return
  }

  const [tasksResult, healthResult, fulfillmentResult] = await Promise.allSettled([
    fetchTaskMonitor(),
    fetchDroneHealth(),
    fetchOrderFulfill(),
  ])

  let hasError = false

  if (tasksResult.status === 'fulfilled') {
    fallbackMode.value = false
    taskMonitor.value = tasksResult.value
  } else {
    hasError = true
    if (!taskMonitor.value.length) applyDemoOverview()
  }

  if (healthResult.status === 'fulfilled') {
    fallbackMode.value = false
    droneHealth.value = healthResult.value
  } else {
    hasError = true
    if (!droneHealth.value.length) applyDemoOverview()
  }

  if (fulfillmentResult.status === 'fulfilled') {
    fallbackMode.value = false
    const fulfillment = fulfillmentResult.value
    if (Array.isArray(fulfillment) && fulfillment.length > 0 && !orderTotal.value) {
      orderTotal.value = fulfillment.length
    }
  } else {
    hasError = true
  }

  if (hasError) {
    if (!taskMonitor.value.length || !droneHealth.value.length) applyDemoOverview()
    useMockData('部分统计接口不可用，已用 mock 数据补齐')
  }
}

async function loadDrones() {
  if (auth.token.startsWith('demo-') || fallbackMode.value) {
    drones.value = demoDrones
      .filter(
        (item) =>
          includesText(item.droneCode, droneFilter.droneCode) &&
          includesText(item.model, droneFilter.model) &&
          (!droneFilter.status || item.status === droneFilter.status) &&
          (!droneFilter.parkId || item.parkId === droneFilter.parkId),
      )
      .map((item) => ({ ...item }))
    return
  }

  try {
    drones.value = hasQuery(droneFilter) ? await searchDrones(cleanQuery(droneFilter)) : await fetchDroneList()
  } catch {
    drones.value = demoDrones.map((item) => ({ ...item }))
    useMockData('无人机接口不可用，已使用 mock 数据')
  }
}

async function loadOrders() {
  if (auth.token.startsWith('demo-') || fallbackMode.value) {
    orders.value = demoOrders
      .filter(
        (item) =>
          includesText(item.orderNo, orderFilter.orderNo) &&
          (!orderFilter.orderStatus || item.orderStatus === orderFilter.orderStatus) &&
          (!orderFilter.priority || item.priority === orderFilter.priority),
      )
      .map((item) => ({ ...item }))
    orderTotal.value = orders.value.length
    return
  }

  try {
    const page = hasQuery(orderFilter)
      ? await searchSchedulerOrders({ ...cleanQuery(orderFilter), ...orderPage })
      : await fetchSchedulerOrderPage(orderPage)
    orders.value = pageItems<CustomerOrderItem>(page)
    orderTotal.value = page.total
  } catch {
    orders.value = demoOrders.map((item) => ({ ...item }))
    orderTotal.value = orders.value.length
    useMockData('订单接口不可用，已使用 mock 数据')
  }
}

async function loadRoutes() {
  if (auth.token.startsWith('demo-') || fallbackMode.value) {
    routes.value = demoRoutes
      .filter(
        (item) =>
          includesText(item.routeName, routeFilter.routeName) &&
          (!routeFilter.riskLevel || item.riskLevel === routeFilter.riskLevel) &&
          (routeFilter.enabled === undefined || item.enabled === routeFilter.enabled),
      )
      .map((item) => ({ ...item }))
    routeTotal.value = routes.value.length
    return
  }

  try {
    const page = hasQuery(routeFilter)
      ? await searchRoutePage({ ...cleanQuery(routeFilter), ...routePage })
      : await fetchRoutePage(routePage)
    routes.value = pageItems<RouteItem>(page)
    routeTotal.value = page.total
  } catch {
    routes.value = demoRoutes.map((item) => ({ ...item }))
    routeTotal.value = routes.value.length
    useMockData('航线接口不可用，已使用 mock 数据')
  }
}

async function loadTasks() {
  if (auth.token.startsWith('demo-') || fallbackMode.value) {
    tasks.value = demoFlightTasks
      .filter(
        (item) =>
          (!taskFilter.taskStatus || item.taskStatus === taskFilter.taskStatus) &&
          (!taskFilter.droneId || item.droneId === taskFilter.droneId) &&
          (!taskFilter.orderId || item.orderId === taskFilter.orderId),
      )
      .map((item) => ({ ...item }))
    taskTotal.value = tasks.value.length
    return
  }

  try {
    const page = hasQuery(taskFilter)
      ? await searchTaskPage({ ...cleanQuery(taskFilter), ...taskPage })
      : await fetchTaskPage(taskPage)
    tasks.value = pageItems<FlightTaskItem>(page)
    taskTotal.value = page.total
  } catch {
    tasks.value = demoFlightTasks.map((item) => ({ ...item }))
    taskTotal.value = tasks.value.length
    useMockData('任务接口不可用，已使用 mock 数据')
  }
}

async function loadAlarms() {
  if (auth.token.startsWith('demo-') || fallbackMode.value) {
    alarms.value = demoAlarms
      .filter(
        (item) =>
          includesText(item.alarmType, alarmFilter.alarmType) &&
          (!alarmFilter.alarmLevel || item.alarmLevel === alarmFilter.alarmLevel) &&
          (!alarmFilter.alarmStatus || item.alarmStatus === alarmFilter.alarmStatus) &&
          (!alarmFilter.droneId || item.droneId === alarmFilter.droneId),
      )
      .map((item) => ({ ...item }))
    alarmTotal.value = alarms.value.length
    return
  }

  try {
    const page = hasQuery(alarmFilter)
      ? await searchAlarmPage({ ...cleanQuery(alarmFilter), ...alarmPage })
      : await fetchAlarmPage(alarmPage)
    alarms.value = pageItems<AlarmEventItem>(page)
    alarmTotal.value = page.total
  } catch {
    alarms.value = demoAlarms.map((item) => ({ ...item }))
    alarmTotal.value = alarms.value.length
    useMockData('告警接口不可用，已使用 mock 数据')
  }
}

async function loadUsers() {
  if (auth.token.startsWith('demo-') || fallbackMode.value) {
    users.value = demoUsers
      .filter(
        (item) =>
          includesText(item.username, userFilter.username) &&
          includesText(item.realName, userFilter.realName) &&
          (!userFilter.roleId || item.roleId === userFilter.roleId) &&
          (userFilter.status === undefined || item.status === userFilter.status),
      )
      .map((item) => ({ ...item }))
    userTotal.value = users.value.length
    return
  }

  try {
    const page = hasQuery(userFilter)
      ? await searchUserPage({ ...cleanQuery(userFilter), ...userPage })
      : await fetchUserPage(userPage)
    users.value = pageItems<SysUser>(page)
    userTotal.value = page.total
  } catch {
    users.value = demoUsers.map((item) => ({ ...item }))
    userTotal.value = users.value.length
    useMockData('用户接口不可用，已使用 mock 数据')
  }
}

async function loadAll() {
  loading.value = true
  actionError.value = ''

  await Promise.allSettled([loadOverview(), loadDrones(), loadOrders(), loadRoutes(), loadTasks(), loadAlarms(), loadUsers()])
  loading.value = false
}

async function applyDroneSearch() {
  await loadDrones()
}

async function resetDroneSearch() {
  Object.assign(droneFilter, { droneCode: '', model: '', status: '', parkId: undefined })
  await loadDrones()
}

async function applyOrderSearch() {
  orderPage.current = 1
  await loadOrders()
}

async function resetOrderSearch() {
  Object.assign(orderFilter, { orderNo: '', orderStatus: '', priority: '' })
  orderPage.current = 1
  await loadOrders()
}

async function applyRouteSearch() {
  routePage.current = 1
  await loadRoutes()
}

async function resetRouteSearch() {
  Object.assign(routeFilter, { routeName: '', riskLevel: '', enabled: undefined })
  routePage.current = 1
  await loadRoutes()
}

async function applyTaskSearch() {
  taskPage.current = 1
  await loadTasks()
}

async function resetTaskSearch() {
  Object.assign(taskFilter, { taskStatus: '', droneId: undefined, orderId: undefined })
  taskPage.current = 1
  await loadTasks()
}

async function applyAlarmSearch() {
  alarmPage.current = 1
  await loadAlarms()
}

async function resetAlarmSearch() {
  Object.assign(alarmFilter, { alarmType: '', alarmLevel: '', alarmStatus: '', droneId: undefined })
  alarmPage.current = 1
  await loadAlarms()
}

async function applyUserSearch() {
  userPage.current = 1
  await loadUsers()
}

async function resetUserSearch() {
  Object.assign(userFilter, { username: '', realName: '', roleId: undefined, status: undefined })
  userPage.current = 1
  await loadUsers()
}

async function submitDrone() {
  const draft = { ...droneForm }
  const fallbackDrone: DroneItem = {
    ...draft,
    droneId: nextId(drones.value, 'droneId'),
    status: '空闲',
    healthScore: 100,
  }

  try {
    const created = await addDrone(draft)
    const item = {
      ...fallbackDrone,
      ...created,
      droneId: created?.droneId ?? fallbackDrone.droneId,
      status: created?.status ?? fallbackDrone.status,
      healthScore: created?.healthScore ?? fallbackDrone.healthScore,
    }
    drones.value.unshift(item)
    upsertDroneHealth(item)
    Object.assign(droneForm, { droneCode: '', model: 'DJI M300', parkId: 1, maxPayload: 5, batteryCapacity: 100 })
    showSuccess('无人机已新增')
  } catch {
    drones.value.unshift(fallbackDrone)
    upsertDroneHealth(fallbackDrone)
    Object.assign(droneForm, { droneCode: '', model: 'DJI M300', parkId: 1, maxPayload: 5, batteryCapacity: 100 })
    useMockData('无人机新增接口不可用，已临时写入 mock 数据')
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
  const draft = { ...orderForm }
  const fallbackOrder: CustomerOrderItem = {
    ...draft,
    orderId: nextId(orders.value, 'orderId'),
    orderNo: `MOCK-${Date.now()}`,
    orderStatus: '待审核',
    createdAt: new Date().toISOString(),
  }

  try {
    const created = await createOrder(draft)
    orders.value.unshift({
      ...fallbackOrder,
      ...created,
      orderId: created?.orderId ?? fallbackOrder.orderId,
      orderNo: created?.orderNo ?? fallbackOrder.orderNo,
      orderStatus: created?.orderStatus ?? fallbackOrder.orderStatus,
      createdAt: created?.createdAt ?? fallbackOrder.createdAt,
    })
    orderTotal.value = Math.max(orderTotal.value + 1, orders.value.length)
    Object.assign(orderForm, { pickupPointId: 1, deliveryPointId: 3, cargoName: '', cargoWeight: 2.5, priority: '普通' })
    showSuccess('订单已创建')
  } catch {
    orders.value.unshift(fallbackOrder)
    orderTotal.value = orders.value.length
    Object.assign(orderForm, { pickupPointId: 1, deliveryPointId: 3, cargoName: '', cargoWeight: 2.5, priority: '普通' })
    useMockData('订单创建接口不可用，已临时写入 mock 数据')
  }
}

async function generateTask(order: CustomerOrderItem) {
  if (!order.orderId) return

  const taskId = nextId(taskMonitor.value, 'taskId')
  const task: TaskMonitorItem = {
    taskId,
    orderNo: order.orderNo,
    droneCode: drones.value.find((item) => item.status === '空闲')?.droneCode ?? 'UAV-MOCK',
    routeName: '调度航线',
    taskStatus: '待起飞',
    plannedStartTime: new Date().toISOString(),
  }

  try {
    const message = await generateOrderTask(order.orderId)
    order.orderStatus = '执行中'
    taskMonitor.value.unshift(task)
    showSuccess(message || '配送任务已生成')
  } catch {
    order.orderStatus = '执行中'
    taskMonitor.value.unshift({ ...task, routeName: 'mock 调度航线' })
    useMockData('任务生成接口不可用，已临时生成 mock 任务')
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
  } catch {
    item.alarmStatus = '已处理'
    item.handlerId = auth.profile?.userId || undefined
    item.handleResult = item.handleResult || 'mock 标记处理'
    alarmTotal.value = alarms.value.length
    useMockData('告警处理接口不可用，已临时更新 mock 状态')
  }
}

function resetUserForm() {
  editingUserId.value = null
  Object.assign(userForm, { roleId: 1, username: '', passwordHash: '', realName: '', phone: '', status: 1, permissions: '' })
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
    permissions: item.permissions ?? '',
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
  } catch {
    if (editingUserId.value) {
      users.value = users.value.map((item) =>
        item.userId === editingUserId.value ? { ...item, ...userForm, userId: editingUserId.value } : item,
      )
      useMockData('用户更新接口不可用，已临时更新 mock 数据')
    } else {
      users.value.unshift({ ...userForm, userId: nextId(users.value, 'userId') })
      userTotal.value = users.value.length
      useMockData('用户新增接口不可用，已临时写入 mock 数据')
    }
    resetUserForm()
  }
}

async function toggleUserStatus(item: SysUser) {
  try {
    await updateUserStatus(item.userId, item.status === 0 ? 1 : 0)
    await loadUsers()
    showSuccess('用户状态已更新')
  } catch {
    item.status = item.status === 0 ? 1 : 0
    useMockData('用户状态接口不可用，已临时更新 mock 状态')
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
          v-for="tab in visibleTabs"
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
          <span v-else>{{ dataModeLabel }}</span>
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
        <section class="card table-panel">
          <div class="section-title"><h2>无人机条件查询</h2><button class="text-btn" @click="loadDrones">刷新</button></div>
          <form class="filter-grid" @submit.prevent="applyDroneSearch">
            <label><span>编号</span><input v-model="droneFilter.droneCode" placeholder="UAV" /></label>
            <label><span>型号</span><input v-model="droneFilter.model" placeholder="M300" /></label>
            <label><span>状态</span><select v-model="droneFilter.status"><option value="">全部</option><option>空闲</option><option>任务中</option><option>维护中</option><option>停用</option></select></label>
            <label><span>园区 ID</span><input v-model.number="droneFilter.parkId" type="number" min="1" /></label>
            <div class="filter-actions"><button class="outline-btn" type="button" @click="resetDroneSearch">重置</button><button class="primary-btn" type="submit">查询</button></div>
          </form>
          <div class="table drone-table">
            <div class="table-row table-head"><span>编号</span><span>型号</span><span>载重</span><span>电量</span><span>健康</span><span>状态</span><span>操作</span></div>
            <div v-for="item in drones" :key="item.droneId" class="table-row">
              <span>{{ item.droneCode }}</span><span>{{ item.model ?? '-' }}</span><span>{{ item.maxPayload ?? '-' }}</span><span>{{ item.batteryCapacity ?? '-' }}</span><span>{{ item.healthScore ?? '-' }}</span><span>{{ item.status ?? '空闲' }}</span>
              <span v-if="can('drone:update')" class="row-actions">
                <button class="text-btn" @click="setDroneStatus(item, '空闲')">空闲</button>
                <button class="text-btn" @click="setDroneStatus(item, '任务中')">任务中</button>
                <button class="text-btn" @click="setDroneStatus(item, '维护中')">维护中</button>
                <button class="text-btn danger" @click="setDroneStatus(item, '停用')">停用</button>
              </span>
              <span v-else>-</span>
            </div>
          </div>
        </section>

        <section v-if="can('drone:add')" class="card form-panel">
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
      </section>

      <section v-else-if="activeTab === 'orders'" class="split-layout">
        <section class="card table-panel">
          <div class="section-title"><h2>订单条件查询</h2><button class="text-btn" @click="loadOrders">刷新</button></div>
          <form class="filter-grid" @submit.prevent="applyOrderSearch">
            <label><span>订单号</span><input v-model="orderFilter.orderNo" placeholder="ORD" /></label>
            <label><span>状态</span><select v-model="orderFilter.orderStatus"><option value="">全部</option><option>待审核</option><option>执行中</option><option>已完成</option><option>已取消</option></select></label>
            <label><span>优先级</span><select v-model="orderFilter.priority"><option value="">全部</option><option>普通</option><option>加急</option></select></label>
            <div class="filter-actions"><button class="outline-btn" type="button" @click="resetOrderSearch">重置</button><button class="primary-btn" type="submit">查询</button></div>
          </form>
          <div class="table order-table">
            <div class="table-row table-head"><span>订单号</span><span>货物</span><span>重量</span><span>优先级</span><span>状态</span><span>创建时间</span><span>操作</span></div>
            <div v-for="item in orders" :key="item.orderId" class="table-row">
              <span>{{ item.orderNo ?? item.orderId }}</span><span>{{ item.cargoName ?? '-' }}</span><span>{{ item.cargoWeight ?? '-' }}</span><span>{{ item.priority ?? '-' }}</span><span>{{ item.orderStatus ?? '-' }}</span><span>{{ formatDate(item.createdAt) }}</span><span><button v-if="can('task:add')" class="text-btn" @click="generateTask(item)">生成任务</button><span v-else>-</span></span>
            </div>
          </div>
        </section>

        <section class="card table-panel">
          <div class="section-title"><h2>航线条件查询</h2><button class="text-btn" @click="loadRoutes">刷新</button></div>
          <form class="filter-grid" @submit.prevent="applyRouteSearch">
            <label><span>航线名称</span><input v-model="routeFilter.routeName" placeholder="南区" /></label>
            <label><span>风险等级</span><select v-model="routeFilter.riskLevel"><option value="">全部</option><option>低</option><option>中</option><option>高</option></select></label>
            <label><span>启用状态</span><select v-model.number="routeFilter.enabled"><option :value="undefined">全部</option><option :value="1">启用</option><option :value="0">停用</option></select></label>
            <div class="filter-actions"><button class="outline-btn" type="button" @click="resetRouteSearch">重置</button><button class="primary-btn" type="submit">查询</button></div>
          </form>
          <div class="table route-table">
            <div class="table-row table-head"><span>ID</span><span>名称</span><span>起点</span><span>终点</span><span>距离</span><span>预计分钟</span><span>风险</span><span>状态</span></div>
            <div v-for="item in routes" :key="item.routeId" class="table-row">
              <span>{{ item.routeId ?? '-' }}</span><span>{{ item.routeName }}</span><span>{{ item.startPointId ?? '-' }}</span><span>{{ item.endPointId ?? '-' }}</span><span>{{ item.distanceKm ?? '-' }}</span><span>{{ item.estimateMinutes ?? '-' }}</span><span>{{ item.riskLevel ?? '-' }}</span><span>{{ item.enabled === 0 ? '停用' : '启用' }}</span>
            </div>
            <p v-if="!routes.length" class="empty-state">暂无航线数据</p>
          </div>
        </section>

        <section class="card table-panel">
          <div class="section-title"><h2>任务条件查询</h2><button class="text-btn" @click="loadTasks">刷新</button></div>
          <form class="filter-grid" @submit.prevent="applyTaskSearch">
            <label><span>任务状态</span><select v-model="taskFilter.taskStatus"><option value="">全部</option><option>待起飞</option><option>执行中</option><option>已完成</option><option>已取消</option></select></label>
            <label><span>无人机 ID</span><input v-model.number="taskFilter.droneId" type="number" min="1" /></label>
            <label><span>订单 ID</span><input v-model.number="taskFilter.orderId" type="number" min="1" /></label>
            <div class="filter-actions"><button class="outline-btn" type="button" @click="resetTaskSearch">重置</button><button class="primary-btn" type="submit">查询</button></div>
          </form>
          <div class="table task-table">
            <div class="table-row table-head"><span>ID</span><span>订单</span><span>无人机</span><span>航线</span><span>调度员</span><span>状态</span><span>计划开始</span><span>实际结束</span></div>
            <div v-for="item in tasks" :key="item.taskId" class="table-row">
              <span>{{ item.taskId ?? '-' }}</span><span>{{ item.orderId ?? '-' }}</span><span>{{ item.droneId ?? '-' }}</span><span>{{ item.routeId ?? '-' }}</span><span>{{ item.dispatcherId ?? '-' }}</span><span>{{ item.taskStatus ?? '-' }}</span><span>{{ formatDate(item.plannedStartTime) }}</span><span>{{ formatDate(item.actualEndTime) }}</span>
            </div>
            <p v-if="!tasks.length" class="empty-state">暂无任务数据</p>
          </div>
        </section>

        <section v-if="can('order:add')" class="card form-panel">
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
      </section>

      <section v-else-if="activeTab === 'alarms'" class="card table-panel full-width">
        <div class="section-title"><h2>告警条件查询</h2><button class="text-btn" @click="loadAlarms">刷新</button></div>
        <form class="filter-grid" @submit.prevent="applyAlarmSearch">
          <label><span>类型</span><input v-model="alarmFilter.alarmType" placeholder="电量" /></label>
          <label><span>等级</span><select v-model="alarmFilter.alarmLevel"><option value="">全部</option><option>提示</option><option>警告</option><option>严重</option></select></label>
          <label><span>状态</span><select v-model="alarmFilter.alarmStatus"><option value="">全部</option><option>待处理</option><option>已处理</option></select></label>
          <label><span>无人机 ID</span><input v-model.number="alarmFilter.droneId" type="number" min="1" /></label>
          <div class="filter-actions"><button class="outline-btn" type="button" @click="resetAlarmSearch">重置</button><button class="primary-btn" type="submit">查询</button></div>
        </form>
        <div class="table alarm-table">
          <div class="table-row table-head"><span>ID</span><span>无人机</span><span>类型</span><span>等级</span><span>状态</span><span>时间</span><span>处理结果</span><span>操作</span></div>
          <div v-for="item in alarms" :key="item.alarmId" class="table-row">
            <span>{{ item.alarmId }}</span><span>{{ item.droneId ?? '-' }}</span><span>{{ item.alarmType ?? '-' }}</span><span>{{ item.alarmLevel ?? '-' }}</span><span>{{ item.alarmStatus ?? '-' }}</span><span>{{ formatDate(item.alarmTime) }}</span><span>{{ item.handleResult ?? '-' }}</span><span><button v-if="can('alarm:handle')" class="text-btn" @click="resolveAlarm(item)">标记处理</button><span v-else>-</span></span>
          </div>
        </div>
      </section>

      <section v-else class="split-layout">
        <section class="card table-panel">
          <div class="section-title"><h2>用户条件查询</h2><button class="text-btn" @click="loadUsers">刷新</button></div>
          <form class="filter-grid" @submit.prevent="applyUserSearch">
            <label><span>用户名</span><input v-model="userFilter.username" placeholder="admin" /></label>
            <label><span>姓名</span><input v-model="userFilter.realName" placeholder="管理员" /></label>
            <label><span>角色</span><select v-model.number="userFilter.roleId"><option :value="undefined">全部</option><option v-for="role in roleOptions" :key="role.roleId" :value="role.roleId">{{ role.roleName }}</option></select></label>
            <label><span>状态</span><select v-model.number="userFilter.status"><option :value="undefined">全部</option><option :value="1">正常</option><option :value="0">停用</option></select></label>
            <div class="filter-actions"><button class="outline-btn" type="button" @click="resetUserSearch">重置</button><button class="primary-btn" type="submit">查询</button></div>
          </form>
          <div class="table user-table">
            <div class="table-row table-head"><span>ID</span><span>用户名</span><span>姓名</span><span>角色</span><span>状态</span><span>操作</span></div>
            <div v-for="item in users" :key="item.userId" class="table-row">
              <span>{{ item.userId }}</span><span>{{ item.username }}</span><span>{{ item.realName }}</span><span>{{ roleNameOf(item.roleId) }}</span><span>{{ statusText(item.status) }}</span><span class="row-actions"><button v-if="can('user:update')" class="text-btn" @click="editUser(item)">编辑</button><button v-if="can('user:update')" class="text-btn" @click="toggleUserStatus(item)">{{ item.status === 0 ? '启用' : '停用' }}</button><span v-if="!can('user:update')">-</span></span>
            </div>
          </div>
        </section>

        <section v-if="can('user:add') || can('user:update')" class="card form-panel">
          <div class="section-title"><h2>{{ editingUserId ? '编辑用户' : '新增用户' }}</h2></div>
          <form class="field-grid" @submit.prevent="submitUser">
            <label><span>用户名</span><input v-model="userForm.username" required /></label>
            <label><span>密码</span><input v-model="userForm.passwordHash" :required="!editingUserId" type="password" /></label>
            <label><span>真实姓名</span><input v-model="userForm.realName" required /></label>
            <label><span>手机</span><input v-model="userForm.phone" /></label>
            <label><span>角色</span><select v-model.number="userForm.roleId"><option v-for="role in roleOptions" :key="role.roleId" :value="role.roleId">{{ role.roleName }}</option></select></label>
            <label><span>状态</span><select v-model.number="userForm.status"><option :value="1">正常</option><option :value="0">停用</option></select></label>
            <label class="full-width"><span>权限代码</span><input v-model="userForm.permissions" placeholder="user:query,drone:query,order:add" /></label>
            <div class="button-row"><button class="outline-btn" type="button" @click="resetUserForm">清空</button><button class="primary-btn" type="submit">保存用户</button></div>
          </form>
        </section>
      </section>
    </main>
  </div>
</template>

<style scoped>
.platform-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  gap: 18px;
  width: 100%;
  margin: 0;
  padding: 18px;
  background: #f5f7fb;
  font-size: 16px;
}

.sidebar,
.card {
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 16px 38px rgba(15, 23, 42, 0.06);
}

.sidebar {
  position: sticky;
  top: 18px;
  height: calc(100vh - 36px);
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 20px 16px;
  color: #1f2937;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 4px 18px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
}

.brand > span {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  flex: none;
  border-radius: 10px;
  background: #0f766e;
  color: #ffffff;
  font-weight: 850;
}

.brand strong,
.section-title h2,
.page-head h1,
.metric strong {
  font-weight: 800;
}

.brand strong { font-size: 1rem; color: #1f2937; }
.brand p { color: #64748b; }

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
  border-radius: 8px;
  font: inherit;
}

.nav-item {
  width: 100%;
  border: 1px solid transparent;
  padding: 11px 12px;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  text-align: left;
}

.nav-item:hover {
  background: rgba(15, 118, 110, 0.06);
  color: #1f2937;
}

.nav-item.active {
  border-color: rgba(15, 118, 110, 0.22);
  background: rgba(15, 118, 110, 0.1);
  color: #0f766e;
  font-weight: 800;
}

.user-panel {
  margin-top: auto;
  padding: 14px;
  border-radius: 10px;
  background: rgba(15, 118, 110, 0.08);
}

.user-panel span,
.user-panel p { color: #64748b; }
.user-panel strong { display: block; margin-top: 4px; color: #1f2937; font-weight: 800; }

.sidebar > .outline-btn {
  width: 100%;
  min-height: 42px;
  border-color: rgba(148, 163, 184, 0.24);
  background: #ffffff;
  color: #1f2937;
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

.page-head { padding: 24px 26px; }

.eyebrow {
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: #0f766e;
}

.page-head h1 {
  margin-top: 4px;
  font-size: clamp(1.8rem, 2.5vw, 2.5rem);
  line-height: 1.1;
  color: #1f2937;
}

.status-area {
  align-self: flex-start;
  padding: 9px 14px;
  border-radius: 999px;
  background: rgba(15, 118, 110, 0.08);
  color: #0f766e;
  font-size: 0.94rem;
  white-space: nowrap;
}

.notice {
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid transparent;
  font-size: 0.95rem;
}
.notice.success { color: #0f5132; background: #d1e7dd; border-color: #badbcc; }
.notice.error { color: #842029; background: #f8d7da; border-color: #f5c2c7; }

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
  min-height: 150px;
  background: rgba(255, 255, 255, 0.92);
}
.metric:nth-child(1) { background: rgba(15, 118, 110, 0.08); }
.metric:nth-child(2) { background: rgba(37, 99, 235, 0.08); }
.metric:nth-child(3) { background: rgba(180, 83, 9, 0.08); }
.metric:nth-child(4) { background: rgba(190, 18, 60, 0.08); }
.metric span { font-size: 0.94rem; color: #64748b; }
.metric strong { color: #0f766e; font-size: 2.6rem; line-height: 1; font-weight: 850; }
.metric p { color: #64748b; }

.wide-panel,
.table-panel,
.side-panel,
.form-panel { padding: 26px; }
.wide-panel { grid-column: span 8; }
.side-panel { grid-column: span 4; }
.table-panel,
.form-panel,
.full-width { grid-column: 1 / -1; }

.section-title h2 { font-size: 1.28rem; color: #1f2937; }

.split-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 18px;
  align-items: start;
}
.split-layout > .form-panel,
.split-layout > .table-panel { width: 100%; }

.field-grid,
.filter-grid,
.health-list { display: grid; gap: 18px; }
.form-panel .field-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); align-items: end; }
.form-panel .field-grid .primary-btn,
.form-panel .field-grid .button-row { align-self: end; }
.form-panel .field-grid > .primary-btn { width: 100%; min-height: 50px; }
.filter-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr)) auto;
  align-items: end;
  margin-top: 18px;
  padding: 16px;
  border-radius: 10px;
  background: rgba(248, 250, 252, 0.86);
}
.filter-actions {
  display: flex;
  gap: 10px;
}
.filter-actions .outline-btn,
.filter-actions .primary-btn {
  min-width: 74px;
}
.field-grid label,
.filter-grid label { display: grid; gap: 10px; }
.field-grid span,
.filter-grid span,
.empty-state,
.health-item span { color: #64748b; }

input,
select {
  width: 100%;
  border: 1px solid rgba(148, 163, 184, 0.24);
  padding: 13px 14px;
  min-height: 50px;
  background: #ffffff;
  outline: none;
  font-size: 1rem;
}
input:focus,
select:focus { border-color: rgba(15, 118, 110, 0.55); box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.12); }

.primary-btn,
.outline-btn,
.text-btn {
  border: 1px solid rgba(148, 163, 184, 0.24);
  padding: 11px 14px;
  min-height: 44px;
  cursor: pointer;
  font-weight: 750;
}
.primary-btn { border-color: #0f766e; background: #0f766e; color: #ffffff; }
.outline-btn,
.text-btn { background: #ffffff; color: #1f2937; }
.text-btn.danger { color: #b42318; }

.table,
.compact-table { display: grid; gap: 12px; margin-top: 16px; overflow-x: auto; }
.table-row {
  min-width: 780px;
  display: grid;
  gap: 14px;
  align-items: center;
  padding: 16px 14px;
  border-radius: 10px;
  background: rgba(248, 250, 252, 0.86);
  line-height: 1.35;
}
.table-head { background: transparent; color: #64748b; font-weight: 800; }
.compact-table .table-row { grid-template-columns: 80px 1.2fr 1fr 1fr 1.2fr; }
.drone-table .table-row,
.order-table .table-row { grid-template-columns: 1.1fr 1fr 0.7fr 0.7fr 0.7fr 0.9fr 1.3fr; }
.route-table .table-row,
.task-table .table-row { grid-template-columns: 70px 1.2fr 0.75fr 0.75fr 0.75fr 0.9fr 0.9fr 1fr; }
.alarm-table .table-row { grid-template-columns: 70px 90px 1fr 0.8fr 0.9fr 1.2fr 1.4fr 1fr; }
.user-table .table-row { grid-template-columns: 70px 1fr 1fr 0.9fr 0.8fr 1.4fr; }

.health-item { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 18px 0; border-top: 1px solid rgba(148, 163, 184, 0.22); }
.health-item:first-child { border-top: 0; }
.health-item div { display: grid; gap: 2px; }
.health-item strong { font-weight: 800; color: #1f2937; }
.health-item b { font-size: 1.6rem; color: #0f766e; }

@media (max-width: 1100px) {
  .platform-shell { grid-template-columns: 1fr; }
  .sidebar { position: static; height: auto; }
  .nav-list { grid-template-columns: repeat(5, minmax(0, 1fr)); }
  .metric { grid-column: span 6; }
  .wide-panel,
  .side-panel { grid-column: span 12; }
  .form-panel .field-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .filter-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .filter-actions { grid-column: 1 / -1; }
}

@media (max-width: 720px) {
  .platform-shell { width: 100%; padding: 12px; gap: 14px; font-size: 15px; }
  .sidebar,
  .card { border-radius: 10px; }
  .sidebar,
  .page-head,
  .wide-panel,
  .table-panel,
  .side-panel,
  .form-panel { padding: 18px; }
  .nav-list { grid-template-columns: repeat(5, minmax(0, 1fr)); }
  .page-head,
  .section-title,
  .button-row { align-items: stretch; flex-direction: column; }
  .status-area { white-space: normal; }
  .overview-grid { grid-template-columns: 1fr; }
  .metric,
  .wide-panel,
  .table-panel,
  .side-panel { grid-column: auto; }
  .form-panel .field-grid,
  .filter-grid { grid-template-columns: 1fr; }
  .filter-actions { grid-column: auto; }
  .table,
  .compact-table { overflow-x: visible; }
  .table-head { display: none; }
  .table-row,
  .compact-table .table-row,
  .drone-table .table-row,
  .order-table .table-row,
  .route-table .table-row,
  .task-table .table-row,
  .alarm-table .table-row,
  .user-table .table-row { min-width: 0; grid-template-columns: 1fr; gap: 8px; padding: 14px; }
  .table-row span { min-width: 0; overflow-wrap: anywhere; }
  .row-actions { justify-content: flex-start; flex-wrap: wrap; }
}
</style>
