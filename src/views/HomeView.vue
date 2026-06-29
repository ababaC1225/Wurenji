<script setup lang="ts">
import { computed, onMounted, reactive, ref, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { addDrone, deleteDrone, fetchDroneList, searchDrones, updateDrone, updateDroneStatus } from '../api/drone'
import { createOrder, updateOrder } from '../api/order'
import {
  createRoute,
  createTask,
  deleteRoute,
  fetchRoutePage,
  fetchSchedulerOrderPage,
  fetchTaskPage,
  searchRoutePage,
  searchTaskPage,
  updateRoute,
} from '../api/scheduler'
import { addRouteNode, fetchRouteNodeList } from '../api/routeNode'
import { createMaintenanceRecord, fetchAlarmPage, handleAlarm, searchAlarmPage } from '../api/maintenance'
import {
  createUser,
  fetchLogPage,
  fetchRoleList,
  fetchUserPage,
  searchUserPage,
  updateUser,
  updateUserStatus,
} from '../api/sys'
import { fetchDroneHealth, fetchOrderFulfill, fetchTaskMonitor } from '../api/view'
import { useAuthStore } from '../stores/auth'
import type {
  AlarmEventItem,
  CustomerOrderItem,
  DroneHealthItem,
  DroneItem,
  FlightTaskItem,
  OperationLogItem,
  PageResult,
  RoleItem,
  RouteItem,
  RouteNodeItem,
  SysUser,
  TaskMonitorItem,
  UserForm,
} from '../types/api'

const router = useRouter()
const auth = useAuthStore()

type TabKey = 'overview' | 'drones' | 'orders' | 'alarms' | 'users'
type DronePanelKey = 'list' | 'form'
type OrderPanelKey = 'orders' | 'routes' | 'tasks' | 'create'
type AlarmPanelKey = 'list' | 'handle'
type UserPanelKey = 'list' | 'form' | 'roles' | 'logs'

const activeTab = ref<TabKey>('overview')
const activeDronePanel = ref<DronePanelKey>('list')
const activeOrderPanel = ref<OrderPanelKey>('orders')
const activeAlarmPanel = ref<AlarmPanelKey>('list')
const activeUserPanel = ref<UserPanelKey>('list')
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
const roles = ref<RoleItem[]>([])
const logs = ref<OperationLogItem[]>([])
const routeNodes = ref<RouteNodeItem[]>([])
const taskMonitor = ref<TaskMonitorItem[]>([])
const droneHealth = ref<DroneHealthItem[]>([])
const orderTotal = ref(0)
const routeTotal = ref(0)
const taskTotal = ref(0)
const alarmTotal = ref(0)
const userTotal = ref(0)
const logTotal = ref(0)
const droneTotal = ref(0)
const selectedRouteId = ref<number | null>(null)
const editingDroneId = ref<number | null>(null)
const editingOrderId = ref<number | null>(null)
const editingRouteId = ref<number | null>(null)
const editingAlarmId = ref<number | null>(null)
const editingUserId = ref<number | null>(null)

const dronePage = reactive({ current: 1, size: 10 })
const overviewTaskPage = reactive({ current: 1, size: 10 })
const orderPage = reactive({ current: 1, size: 10 })
const routePage = reactive({ current: 1, size: 10 })
const taskPage = reactive({ current: 1, size: 10 })
const alarmPage = reactive({ current: 1, size: 10 })
const userPage = reactive({ current: 1, size: 10 })
const logPage = reactive({ current: 1, size: 10 })
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
  status: '空闲',
  healthScore: 100,
})

const orderForm = reactive<CustomerOrderItem>({
  pickupPointId: 1,
  deliveryPointId: 3,
  cargoName: '',
  cargoWeight: 2.5,
  priority: '普通',
})

const routeForm = reactive<RouteItem>({
  routeName: '',
  startPointId: 1,
  endPointId: 3,
  distanceKm: 8,
  estimateMinutes: 20,
  riskLevel: '低',
  enabled: 1,
})

const routeNodeForm = reactive<RouteNodeItem>({
  routeId: undefined,
  nodeOrder: 1,
  longitude: 121.47,
  latitude: 31.23,
  altitude: 120,
  nodeType: '途经点',
})

const alarmForm = reactive<AlarmEventItem>({
  alarmId: undefined,
  droneId: undefined,
  taskId: null,
  alarmType: '',
  alarmLevel: '警告',
  alarmStatus: '已处理',
  handlerId: undefined,
  handleResult: '',
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
  { roleId: 1, roleName: '系统管理员' },
  { roleId: 2, roleName: '调度员' },
  { roleId: 3, roleName: '运维管理员' },
]

const demoDrones: DroneItem[] = [
  { droneId: 1, parkId: 1, droneCode: 'UAV-001', model: 'DJI M300', maxPayload: 5, batteryCapacity: 96, status: '空闲', healthScore: 98 },
  { droneId: 2, parkId: 1, droneCode: 'UAV-002', model: 'DJI M200', maxPayload: 3, batteryCapacity: 82, status: '任务中', healthScore: 91 },
  { droneId: 3, parkId: 2, droneCode: 'UAV-003', model: 'DJI M210', maxPayload: 4, batteryCapacity: 64, status: '维护中', healthScore: 73 },
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
  { taskId: 2, orderId: 2, droneId: 1, routeId: 2, taskStatus: '待执行', plannedStartTime: '2026-06-27T11:00:00' },
]

const demoAlarms: AlarmEventItem[] = [
  { alarmId: 1, droneId: 3, alarmType: '电量过低', alarmLevel: '警告', alarmStatus: '待处理', alarmTime: '2026-06-27T10:00:00' },
  { alarmId: 2, droneId: 2, alarmType: '设备异常', alarmLevel: '严重', alarmStatus: '已处理', alarmTime: '2026-06-27T09:10:00', handleResult: '已安排返航检修' },
]

const demoUsers: SysUser[] = [
  { userId: 1, roleId: 1, username: 'admin', realName: '系统管理员', phone: '13800000000', status: 1 },
  { userId: 2, roleId: 2, username: 'dispatcher', realName: '调度员', phone: '13900000000', status: 1 },
  { userId: 3, roleId: 3, username: 'operator', realName: '运维管理员', phone: '13700000000', status: 1 },
]

const demoTasks: TaskMonitorItem[] = [
  { taskId: 1, orderNo: 'ORD-20260627-001', droneCode: 'UAV-002', routeName: '总部到南区航线', taskStatus: '执行中', plannedStartTime: '2026-06-27T10:30:00' },
  { taskId: 2, orderNo: 'ORD-20260627-002', droneCode: 'UAV-001', routeName: '总部到东区航线', taskStatus: '待执行', plannedStartTime: '2026-06-27T11:00:00' },
]

const demoRouteNodes: RouteNodeItem[] = [
  { nodeId: 1, routeId: 1, nodeOrder: 1, longitude: 121.47, latitude: 31.23, altitude: 120, nodeType: '起点' },
  { nodeId: 2, routeId: 1, nodeOrder: 2, longitude: 121.51, latitude: 31.19, altitude: 130, nodeType: '途经点' },
  { nodeId: 3, routeId: 1, nodeOrder: 3, longitude: 121.55, latitude: 31.16, altitude: 100, nodeType: '终点' },
]

const demoLogs: OperationLogItem[] = [
  { logId: 1, username: 'admin', operation: '用户查询', method: 'GET', createdAt: '2026-06-27T09:00:00' },
  { logId: 2, username: 'dispatcher', operation: '生成任务', method: 'POST', createdAt: '2026-06-27T10:30:00' },
]

type PageState = {
  current: number
  size: number
}

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
  roles.value = roleOptions.map((item) => ({ ...item }))
  logs.value = demoLogs.map((item) => ({ ...item }))
  routeNodes.value = demoRouteNodes.map((item) => ({ ...item }))
  applyDemoOverview()
  orderTotal.value = demoOrders.length
  routeTotal.value = demoRoutes.length
  taskTotal.value = demoFlightTasks.length
  alarmTotal.value = demoAlarms.length
  userTotal.value = demoUsers.length
  logTotal.value = demoLogs.length
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
const overviewTaskRows = computed(() => pageSlice(taskMonitor.value, overviewTaskPage))

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
const dronePanels = computed(() =>
  [
    { key: 'list' as const, label: '无人机条件查询', permission: 'drone:query' },
    { key: 'form' as const, label: editingDroneId.value ? '编辑无人机' : '新增无人机', permission: editingDroneId.value ? 'drone:update' : 'drone:add' },
  ].filter((panel) => can(panel.permission)),
)
const orderPanels = computed(() =>
  [
    { key: 'orders' as const, label: '订单条件查询', permission: 'order:query' },
    { key: 'routes' as const, label: '航线条件查询', permission: 'route:query' },
    { key: 'tasks' as const, label: '任务条件查询', permission: 'task:query' },
    { key: 'create' as const, label: editingOrderId.value ? '修改订单' : '创建订单', permission: editingOrderId.value ? 'order:update' : 'order:add' },
  ].filter((panel) => can(panel.permission)),
)
const alarmPanels = computed(() =>
  [
    { key: 'list' as const, label: '告警条件查询', permission: 'alarm:query' },
    { key: 'handle' as const, label: '告警处理信息更新', permission: 'alarm:handle' },
  ].filter((panel) => can(panel.permission)),
)
const userPanels = computed(() =>
  [
    { key: 'list' as const, label: '用户条件查询', permission: 'user:query' },
    { key: 'form' as const, label: editingUserId.value ? '编辑用户' : '新增用户', permission: editingUserId.value ? 'user:update' : 'user:add' },
    { key: 'roles' as const, label: '角色列表', permission: 'user:query' },
    { key: 'logs' as const, label: '操作日志查询', permission: 'log:query' },
  ].filter((panel) => can(panel.permission)),
)

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

watchEffect(() => {
  if (activeTab.value !== 'orders') return

  const firstPanel = orderPanels.value[0]
  if (!firstPanel) return
  if (!orderPanels.value.some((panel) => panel.key === activeOrderPanel.value)) {
    activeOrderPanel.value = firstPanel.key
  }
})

watchEffect(() => {
  if (activeTab.value !== 'drones') return

  const firstPanel = dronePanels.value[0]
  if (!firstPanel) return
  if (!dronePanels.value.some((panel) => panel.key === activeDronePanel.value)) {
    activeDronePanel.value = firstPanel.key
  }
})

watchEffect(() => {
  if (activeTab.value !== 'alarms') return

  const firstPanel = alarmPanels.value[0]
  if (!firstPanel) return
  if (!alarmPanels.value.some((panel) => panel.key === activeAlarmPanel.value)) {
    activeAlarmPanel.value = firstPanel.key
  }
})

watchEffect(() => {
  if (activeTab.value !== 'users') return

  const firstPanel = userPanels.value[0]
  if (!firstPanel) return
  if (!userPanels.value.some((panel) => panel.key === activeUserPanel.value)) {
    activeUserPanel.value = firstPanel.key
  }
})

watchEffect(() => {
  const pages = totalPages(taskMonitor.value.length, overviewTaskPage)
  if (overviewTaskPage.current > pages) {
    overviewTaskPage.current = pages
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

function refreshOverviewIfAllowed() {
  return can('stat:query') ? loadOverview() : Promise.resolve()
}

function pageItems<T>(page: { list?: T[]; records?: T[] }) {
  const candidate = page as {
    list?: T[]
    records?: T[]
    rows?: T[]
    data?: { list?: T[]; records?: T[]; rows?: T[] }
  }

  return (
    candidate.list ??
    candidate.records ??
    candidate.rows ??
    candidate.data?.list ??
    candidate.data?.records ??
    candidate.data?.rows ??
    []
  )
}

function isPageResult<T>(value: T[] | PageResult<T>): value is PageResult<T> {
  return !Array.isArray(value) && typeof value === 'object' && value !== null
}

function pageSlice<T>(items: T[], page: PageState) {
  const start = (page.current - 1) * page.size
  return items.slice(start, start + page.size)
}

function applyPageResult<T>(result: T[] | PageResult<T>, page: PageState) {
  if (!isPageResult(result)) {
    return {
      items: pageSlice(result, page),
      total: result.length,
    }
  }

  return {
    items: pageItems<T>(result),
    total: result.total ?? pageItems<T>(result).length,
  }
}

function totalPages(total: number, page: PageState) {
  return Math.max(1, Math.ceil(total / page.size))
}

function pageNumbers(total: number, page: PageState) {
  const pages = totalPages(total, page)
  const start = Math.max(1, Math.min(page.current - 2, pages - 4))
  const end = Math.min(pages, start + 4)

  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

async function goPage(page: PageState, total: number, current: number, loader: () => void | Promise<void>) {
  const next = Math.min(Math.max(1, current), totalPages(total, page))

  if (next === page.current) return

  const previous = page.current
  page.current = next

  try {
    await loader()
  } catch {
    page.current = previous
  }
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

function matchesOrderFilter(item: CustomerOrderItem) {
  return (
    includesText(item.orderNo, orderFilter.orderNo) &&
    (!orderFilter.orderStatus || item.orderStatus === orderFilter.orderStatus) &&
    (!orderFilter.priority || item.priority === orderFilter.priority)
  )
}

async function fetchAllSchedulerOrdersForFilter() {
  const firstPage = await fetchSchedulerOrderPage({ current: 1, size: orderPage.size })
  const firstItems = pageItems<CustomerOrderItem>(firstPage)
  const total = firstPage.total ?? firstItems.length
  const pages = Math.min(totalPages(total, orderPage), 50)
  const allItems = [...firstItems]

  for (let current = 2; current <= pages; current += 1) {
    const page = await fetchSchedulerOrderPage({ current, size: orderPage.size })
    allItems.push(...pageItems<CustomerOrderItem>(page))
  }

  return allItems
}

function roleNameOf(roleId?: number) {
  return roleOptions.find((role) => role.roleId === roleId)?.roleName ?? `角色 ${roleId ?? '-'}`
}

function statusText(status?: number) {
  return status === 0 ? '停用' : '正常'
}

function taskStatusText(status?: string) {
  return status === '待起飞' ? '待执行' : (status ?? '-')
}

function logValue(item: OperationLogItem, keys: string[]) {
  for (const key of keys) {
    const value = item[key]
    if (value !== undefined && value !== null && value !== '') return String(value)
  }

  return '-'
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
    const filtered = demoDrones.filter(
      (item) =>
        includesText(item.droneCode, droneFilter.droneCode) &&
        includesText(item.model, droneFilter.model) &&
        (!droneFilter.status || item.status === droneFilter.status) &&
        (!droneFilter.parkId || item.parkId === droneFilter.parkId),
    )
    drones.value = pageSlice(filtered, dronePage).map((item) => ({ ...item }))
    droneTotal.value = filtered.length
    return
  }

  try {
    const result = hasQuery(droneFilter)
      ? await searchDrones({ ...cleanQuery(droneFilter), ...dronePage })
      : await fetchDroneList()
    const page = applyPageResult<DroneItem>(result, dronePage)
    drones.value = page.items
    droneTotal.value = page.total
  } catch {
    drones.value = pageSlice(demoDrones, dronePage).map((item) => ({ ...item }))
    droneTotal.value = demoDrones.length
    useMockData('无人机接口不可用，已使用 mock 数据')
  }
}

async function loadOrders() {
  if (auth.token.startsWith('demo-') || fallbackMode.value) {
    const filtered = demoOrders.filter(matchesOrderFilter)
    orders.value = pageSlice(filtered, orderPage).map((item) => ({ ...item }))
    orderTotal.value = filtered.length
    return
  }

  try {
    if (hasQuery(orderFilter)) {
      const allItems = await fetchAllSchedulerOrdersForFilter()
      const filtered = allItems.filter(matchesOrderFilter)

      if (orderPage.current > totalPages(filtered.length, orderPage)) {
        orderPage.current = totalPages(filtered.length, orderPage)
      }

      orders.value = pageSlice(filtered, orderPage)
      orderTotal.value = filtered.length
      return
    }

    const page = await fetchSchedulerOrderPage(orderPage)
    const items = pageItems<CustomerOrderItem>(page)
    const total = page.total ?? items.length

    if (!items.length && total > 0 && orderPage.current > 1) {
      orderPage.current = totalPages(total, orderPage)
      await loadOrders()
      return
    }

    orders.value = items
    orderTotal.value = total
  } catch {
    const filtered = demoOrders.filter(matchesOrderFilter)

    if (orderPage.current > totalPages(filtered.length, orderPage)) {
      orderPage.current = totalPages(filtered.length, orderPage)
    }

    orders.value = pageSlice(filtered, orderPage).map((item) => ({ ...item }))
    orderTotal.value = filtered.length
    useMockData('订单接口不可用，已使用 mock 数据')
  }
}

async function loadRoutes() {
  if (auth.token.startsWith('demo-') || fallbackMode.value) {
    const filtered = demoRoutes.filter(
      (item) =>
        includesText(item.routeName, routeFilter.routeName) &&
        (!routeFilter.riskLevel || item.riskLevel === routeFilter.riskLevel) &&
        (routeFilter.enabled === undefined || item.enabled === routeFilter.enabled),
    )
    routes.value = pageSlice(filtered, routePage).map((item) => ({ ...item }))
    routeTotal.value = filtered.length
    return
  }

  try {
    const page = hasQuery(routeFilter)
      ? await searchRoutePage({ ...cleanQuery(routeFilter), ...routePage })
      : await fetchRoutePage(routePage)
    routes.value = pageItems<RouteItem>(page)
    routeTotal.value = page.total
  } catch {
    routes.value = pageSlice(demoRoutes, routePage).map((item) => ({ ...item }))
    routeTotal.value = demoRoutes.length
    useMockData('航线接口不可用，已使用 mock 数据')
  }
}

async function loadTasks() {
  if (auth.token.startsWith('demo-') || fallbackMode.value) {
    const filtered = demoFlightTasks.filter(
      (item) =>
        (!taskFilter.taskStatus || taskStatusText(item.taskStatus) === taskFilter.taskStatus) &&
        (!taskFilter.droneId || item.droneId === taskFilter.droneId) &&
        (!taskFilter.orderId || item.orderId === taskFilter.orderId),
    )
    tasks.value = pageSlice(filtered, taskPage).map((item) => ({ ...item }))
    taskTotal.value = filtered.length
    return
  }

  try {
    const page = hasQuery(taskFilter)
      ? await searchTaskPage({ ...cleanQuery(taskFilter), ...taskPage })
      : await fetchTaskPage(taskPage)
    tasks.value = pageItems<FlightTaskItem>(page)
    taskTotal.value = page.total
  } catch {
    tasks.value = pageSlice(demoFlightTasks, taskPage).map((item) => ({ ...item }))
    taskTotal.value = demoFlightTasks.length
    useMockData('任务接口不可用，已使用 mock 数据')
  }
}

async function loadAlarms() {
  if (auth.token.startsWith('demo-') || fallbackMode.value) {
    const filtered = demoAlarms.filter(
      (item) =>
        includesText(item.alarmType, alarmFilter.alarmType) &&
        (!alarmFilter.alarmLevel || item.alarmLevel === alarmFilter.alarmLevel) &&
        (!alarmFilter.alarmStatus || item.alarmStatus === alarmFilter.alarmStatus) &&
        (!alarmFilter.droneId || item.droneId === alarmFilter.droneId),
    )
    alarms.value = pageSlice(filtered, alarmPage).map((item) => ({ ...item }))
    alarmTotal.value = filtered.length
    return
  }

  try {
    const page = hasQuery(alarmFilter)
      ? await searchAlarmPage({ ...cleanQuery(alarmFilter), ...alarmPage })
      : await fetchAlarmPage(alarmPage)
    alarms.value = pageItems<AlarmEventItem>(page)
    alarmTotal.value = page.total
  } catch {
    alarms.value = pageSlice(demoAlarms, alarmPage).map((item) => ({ ...item }))
    alarmTotal.value = demoAlarms.length
    useMockData('告警接口不可用，已使用 mock 数据')
  }
}

async function loadUsers() {
  if (auth.token.startsWith('demo-') || fallbackMode.value) {
    const filtered = demoUsers.filter(
      (item) =>
        includesText(item.username, userFilter.username) &&
        includesText(item.realName, userFilter.realName) &&
        (!userFilter.roleId || item.roleId === userFilter.roleId) &&
        (userFilter.status === undefined || item.status === userFilter.status),
    )
    users.value = pageSlice(filtered, userPage).map((item) => ({ ...item }))
    userTotal.value = filtered.length
    return
  }

  try {
    const page = hasQuery(userFilter)
      ? await searchUserPage({ ...cleanQuery(userFilter), ...userPage })
      : await fetchUserPage(userPage)
    users.value = pageItems<SysUser>(page)
    userTotal.value = page.total
  } catch {
    users.value = pageSlice(demoUsers, userPage).map((item) => ({ ...item }))
    userTotal.value = demoUsers.length
    useMockData('用户接口不可用，已使用 mock 数据')
  }
}

async function loadRoles() {
  if (auth.token.startsWith('demo-') || fallbackMode.value) {
    roles.value = roleOptions.map((item) => ({ ...item }))
    return
  }

  try {
    const result = await fetchRoleList()
    roles.value = result.length ? result : roleOptions.map((item) => ({ ...item }))
  } catch {
    roles.value = roleOptions.map((item) => ({ ...item }))
    useMockData('角色接口不可用，已使用默认角色列表')
  }
}

async function loadLogs() {
  if (auth.token.startsWith('demo-') || fallbackMode.value) {
    logs.value = pageSlice(demoLogs, logPage).map((item) => ({ ...item }))
    logTotal.value = demoLogs.length
    return
  }

  try {
    const page = await fetchLogPage(logPage)
    logs.value = pageItems<OperationLogItem>(page)
    logTotal.value = page.total
  } catch {
    logs.value = pageSlice(demoLogs, logPage).map((item) => ({ ...item }))
    logTotal.value = demoLogs.length
    useMockData('操作日志接口不可用，已使用 mock 数据')
  }
}

async function loadRouteNodes(routeId?: number) {
  const id = routeId ?? selectedRouteId.value

  if (!id) {
    routeNodes.value = []
    return
  }

  selectedRouteId.value = id
  routeNodeForm.routeId = id

  if (auth.token.startsWith('demo-') || fallbackMode.value) {
    routeNodes.value = demoRouteNodes.filter((item) => item.routeId === id).map((item) => ({ ...item }))
    return
  }

  try {
    routeNodes.value = await fetchRouteNodeList(id)
  } catch {
    routeNodes.value = demoRouteNodes.filter((item) => item.routeId === id).map((item) => ({ ...item }))
    useMockData('航线节点接口不可用，已使用 mock 数据')
  }
}

async function loadAll() {
  loading.value = true
  actionError.value = ''

  const loaders: Array<() => Promise<void>> = []

  if (can('stat:query')) loaders.push(loadOverview)
  if (can('drone:query')) loaders.push(loadDrones)
  if (can('order:query')) loaders.push(loadOrders)
  if (can('route:query')) loaders.push(loadRoutes)
  if (can('task:query')) loaders.push(loadTasks)
  if (can('alarm:query')) loaders.push(loadAlarms)
  if (can('user:query')) {
    loaders.push(loadUsers)
    loaders.push(loadRoles)
  }
  if (can('log:query')) loaders.push(loadLogs)

  await Promise.allSettled(loaders.map((loader) => loader()))
  loading.value = false
}

async function applyDroneSearch() {
  dronePage.current = 1
  await loadDrones()
}

async function resetDroneSearch() {
  Object.assign(droneFilter, { droneCode: '', model: '', status: '', parkId: undefined })
  dronePage.current = 1
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

function resetDroneForm() {
  editingDroneId.value = null
  Object.assign(droneForm, {
    droneCode: '',
    model: 'DJI M300',
    parkId: 1,
    maxPayload: 5,
    batteryCapacity: 100,
    status: '空闲',
    healthScore: 100,
  })
}

function editDrone(item: DroneItem) {
  editingDroneId.value = item.droneId ?? null
  activeDronePanel.value = 'form'
  Object.assign(droneForm, {
    droneCode: item.droneCode,
    model: item.model ?? '',
    parkId: item.parkId ?? 1,
    maxPayload: item.maxPayload ?? 0,
    batteryCapacity: item.batteryCapacity ?? 100,
    status: item.status ?? '空闲',
    healthScore: item.healthScore ?? 100,
  })
}

async function submitDrone() {
  const draft = { ...droneForm }
  const fallbackDrone: DroneItem = {
    ...draft,
    droneId: editingDroneId.value ?? nextId(drones.value, 'droneId'),
    status: draft.status ?? '空闲',
    healthScore: draft.healthScore ?? 100,
  }

  try {
    if (editingDroneId.value) {
      const updated = { ...draft, droneId: editingDroneId.value }
      await updateDrone(updated)
      drones.value = drones.value.map((item) => (item.droneId === editingDroneId.value ? updated : item))
      upsertDroneHealth(updated)
      resetDroneForm()
      await Promise.all([loadDrones(), refreshOverviewIfAllowed()])
      showSuccess('无人机信息已更新')
    } else {
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
      resetDroneForm()
      showSuccess('无人机已新增')
    }
  } catch {
    if (editingDroneId.value) {
      drones.value = drones.value.map((item) => (item.droneId === editingDroneId.value ? fallbackDrone : item))
      useMockData('无人机更新接口不可用，已临时更新 mock 数据')
    } else {
      drones.value.unshift(fallbackDrone)
      useMockData('无人机新增接口不可用，已临时写入 mock 数据')
    }
    upsertDroneHealth(fallbackDrone)
    resetDroneForm()
  }
}

async function removeDrone(item: DroneItem) {
  if (!item.droneId) return

  try {
    await deleteDrone(item.droneId)
    drones.value = drones.value.filter((drone) => drone.droneId !== item.droneId)
    droneHealth.value = droneHealth.value.filter((drone) => drone.droneId !== item.droneId)
    showSuccess(`无人机 ${item.droneCode} 已删除`)
  } catch {
    drones.value = drones.value.filter((drone) => drone.droneId !== item.droneId)
    droneHealth.value = droneHealth.value.filter((drone) => drone.droneId !== item.droneId)
    useMockData('无人机删除接口不可用，已临时移除 mock 数据')
  }
}

async function generateDroneMaintenance(item: DroneItem) {
  if (!item.droneId) return

  try {
    await createMaintenanceRecord({
      droneId: item.droneId,
      maintainerId: auth.profile?.userId,
      maintainType: '告警维护',
      maintainResult: '待维护',
      maintainTime: new Date().toISOString(),
      remark: `由 ${item.droneCode} 生成告警维护记录`,
    })
    showSuccess(`已为 ${item.droneCode} 生成告警维护记录`)
  } catch {
    useMockData(`维护记录接口不可用，已模拟为 ${item.droneCode} 生成告警维护`)
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
    await Promise.all([loadDrones(), refreshOverviewIfAllowed()])
    showSuccess(`无人机 ${item.droneCode} 状态已更新`)
  } catch (error) {
    updateLocalDroneStatus(item.droneId, status)
    showError(error, `后端未确认，页面已临时显示为 ${status}`)
  }
}

function resetOrderForm() {
  editingOrderId.value = null
  Object.assign(orderForm, {
    pickupPointId: 1,
    deliveryPointId: 3,
    cargoName: '',
    cargoWeight: 2.5,
    priority: '普通',
    orderStatus: undefined,
  })
}

function editOrder(item: CustomerOrderItem) {
  editingOrderId.value = item.orderId ?? null
  activeOrderPanel.value = 'create'
  Object.assign(orderForm, {
    pickupPointId: item.pickupPointId ?? 1,
    deliveryPointId: item.deliveryPointId ?? 3,
    cargoName: item.cargoName ?? '',
    cargoWeight: item.cargoWeight ?? 0,
    priority: item.priority ?? '普通',
    orderStatus: item.orderStatus,
  })
}

async function submitOrder() {
  const draft = { ...orderForm }
  const fallbackOrder: CustomerOrderItem = {
    ...draft,
    orderId: editingOrderId.value ?? nextId(orders.value, 'orderId'),
    orderNo: `MOCK-${Date.now()}`,
    orderStatus: draft.orderStatus ?? '待审核',
    createdAt: new Date().toISOString(),
  }

  try {
    if (editingOrderId.value) {
      const updated = { ...draft, orderId: editingOrderId.value }
      await updateOrder(updated)
      orders.value = orders.value.map((item) => (item.orderId === editingOrderId.value ? { ...item, ...updated } : item))
      resetOrderForm()
      await loadOrders()
      showSuccess('订单已修改')
    } else {
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
      resetOrderForm()
      showSuccess('订单已创建')
    }
  } catch {
    if (editingOrderId.value) {
      orders.value = orders.value.map((item) => (item.orderId === editingOrderId.value ? { ...item, ...fallbackOrder } : item))
      useMockData('订单修改接口不可用，已临时更新 mock 数据')
    } else {
      orders.value.unshift(fallbackOrder)
      orderTotal.value = orders.value.length
      useMockData('订单创建接口不可用，已临时写入 mock 数据')
    }
    resetOrderForm()
  }
}

async function generateTask(order: CustomerOrderItem) {
  if (!order.orderId) return

  const drone = drones.value.find((item) => ['空闲', '正常', undefined, ''].includes(item.status))
  const route = routes.value[0]
  const taskId = nextId(tasks.value, 'taskId')
  const task: FlightTaskItem = {
    taskId,
    orderId: order.orderId,
    droneId: drone?.droneId,
    routeId: route?.routeId,
    dispatcherId: auth.profile?.userId,
    taskStatus: '待执行',
    plannedStartTime: new Date().toISOString(),
  }
  const monitorTask: TaskMonitorItem = {
    taskId,
    orderNo: order.orderNo,
    droneCode: drone?.droneCode ?? 'UAV-MOCK',
    routeName: route?.routeName ?? '调度航线',
    taskStatus: task.taskStatus,
    plannedStartTime: task.plannedStartTime,
  }

  try {
    await createTask(task)
    order.orderStatus = '执行中'
    tasks.value.unshift(task)
    taskMonitor.value.unshift(monitorTask)
    await Promise.all([loadTasks(), refreshOverviewIfAllowed()])
    showSuccess('已通过创建任务接口生成配送任务')
  } catch {
    order.orderStatus = '执行中'
    tasks.value.unshift(task)
    taskMonitor.value.unshift({ ...monitorTask, routeName: monitorTask.routeName ?? 'mock 调度航线' })
    taskTotal.value = tasks.value.length
    useMockData('创建任务接口不可用，已临时生成 mock 配送任务')
  }
}

function resetRouteForm() {
  editingRouteId.value = null
  Object.assign(routeForm, {
    routeName: '',
    startPointId: 1,
    endPointId: 3,
    distanceKm: 8,
    estimateMinutes: 20,
    riskLevel: '低',
    enabled: 1,
  })
}

function editRoute(item: RouteItem) {
  editingRouteId.value = item.routeId ?? null
  activeOrderPanel.value = 'routes'
  Object.assign(routeForm, {
    routeName: item.routeName,
    startPointId: item.startPointId ?? 1,
    endPointId: item.endPointId ?? 3,
    distanceKm: item.distanceKm ?? 0,
    estimateMinutes: item.estimateMinutes ?? 0,
    riskLevel: item.riskLevel ?? '低',
    enabled: item.enabled ?? 1,
  })
}

async function submitRoute() {
  const draft = { ...routeForm }
  const fallbackRoute = { ...draft, routeId: editingRouteId.value ?? nextId(routes.value, 'routeId') }

  try {
    if (editingRouteId.value) {
      const updated = { ...draft, routeId: editingRouteId.value }
      await updateRoute(updated)
      routes.value = routes.value.map((item) => (item.routeId === editingRouteId.value ? updated : item))
      resetRouteForm()
      await loadRoutes()
      showSuccess('航线全部信息已修改')
    } else {
      await createRoute(draft)
      routes.value.unshift(fallbackRoute)
      routeTotal.value = routes.value.length
      resetRouteForm()
      await loadRoutes()
      showSuccess('航线已新增')
    }
  } catch {
    if (editingRouteId.value) {
      routes.value = routes.value.map((item) => (item.routeId === editingRouteId.value ? fallbackRoute : item))
      useMockData('航线修改接口不可用，已临时更新 mock 数据')
    } else {
      routes.value.unshift(fallbackRoute)
      routeTotal.value = routes.value.length
      useMockData('航线新增接口不可用，已临时写入 mock 数据')
    }
    resetRouteForm()
  }
}

async function removeRoute(item: RouteItem) {
  if (!item.routeId) return

  try {
    await deleteRoute(item.routeId)
    routes.value = routes.value.filter((route) => route.routeId !== item.routeId)
    if (selectedRouteId.value === item.routeId) {
      selectedRouteId.value = null
      routeNodes.value = []
    }
    showSuccess(`航线 ${item.routeName} 已删除`)
  } catch {
    routes.value = routes.value.filter((route) => route.routeId !== item.routeId)
    routeTotal.value = routes.value.length
    useMockData('航线删除接口不可用，已临时移除 mock 数据')
  }
}

async function submitRouteNode() {
  if (!routeNodeForm.routeId && selectedRouteId.value) routeNodeForm.routeId = selectedRouteId.value
  if (!routeNodeForm.routeId) return

  const fallbackNode = { ...routeNodeForm, nodeId: nextId(routeNodes.value, 'nodeId') }

  try {
    await addRouteNode({ ...routeNodeForm })
    routeNodes.value.push(fallbackNode)
    Object.assign(routeNodeForm, {
      routeId: selectedRouteId.value,
      nodeOrder: (routeNodeForm.nodeOrder ?? 0) + 1,
      longitude: 121.47,
      latitude: 31.23,
      altitude: 120,
      nodeType: '途经点',
    })
    await loadRouteNodes(fallbackNode.routeId)
    showSuccess('航线节点已新增')
  } catch {
    routeNodes.value.push(fallbackNode)
    Object.assign(routeNodeForm, { nodeOrder: (routeNodeForm.nodeOrder ?? 0) + 1 })
    useMockData('航线节点新增接口不可用，已临时写入 mock 数据')
  }
}

function editAlarm(item: AlarmEventItem) {
  editingAlarmId.value = item.alarmId ?? null
  activeAlarmPanel.value = 'handle'
  Object.assign(alarmForm, {
    alarmId: item.alarmId,
    droneId: item.droneId,
    taskId: item.taskId ?? null,
    alarmType: item.alarmType ?? '',
    alarmLevel: item.alarmLevel ?? '警告',
    alarmStatus: item.alarmStatus ?? '已处理',
    handlerId: item.handlerId ?? auth.profile?.userId ?? undefined,
    handleResult: item.handleResult ?? '',
  })
}

function resetAlarmForm() {
  editingAlarmId.value = null
  Object.assign(alarmForm, {
    alarmId: undefined,
    droneId: undefined,
    taskId: null,
    alarmType: '',
    alarmLevel: '警告',
    alarmStatus: '已处理',
    handlerId: undefined,
    handleResult: '',
  })
}

async function submitAlarmHandle() {
  if (!editingAlarmId.value) return

  const payload = {
    ...alarmForm,
    alarmId: editingAlarmId.value,
    handlerId: alarmForm.handlerId ?? auth.profile?.userId ?? undefined,
  }

  try {
    await handleAlarm(payload)
    alarms.value = alarms.value.map((item) => (item.alarmId === editingAlarmId.value ? payload : item))
    resetAlarmForm()
    await loadAlarms()
    showSuccess('告警处理信息已更新')
  } catch {
    alarms.value = alarms.value.map((item) => (item.alarmId === editingAlarmId.value ? payload : item))
    resetAlarmForm()
    useMockData('告警处理接口不可用，已临时更新 mock 信息')
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
  activeUserPanel.value = 'form'
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
            <div v-for="item in overviewTaskRows" :key="item.taskId" class="table-row">
              <span>{{ item.taskId ?? '-' }}</span><span>{{ item.orderNo ?? '-' }}</span><span>{{ item.droneCode ?? '-' }}</span><span>{{ taskStatusText(item.taskStatus) }}</span><span>{{ formatDate(item.plannedStartTime) }}</span>
            </div>
            <p v-if="!taskMonitor.length" class="empty-state">暂无任务监控数据</p>
          </div>
          <div v-if="taskMonitor.length > overviewTaskPage.size" class="pagination">
            <span>共 {{ taskMonitor.length }} 条</span>
            <button type="button" :disabled="overviewTaskPage.current === 1" @click="goPage(overviewTaskPage, taskMonitor.length, overviewTaskPage.current - 1, () => {})">‹</button>
            <button
              v-for="pageNo in pageNumbers(taskMonitor.length, overviewTaskPage)"
              :key="pageNo"
              type="button"
              :class="{ active: pageNo === overviewTaskPage.current }"
              @click="goPage(overviewTaskPage, taskMonitor.length, pageNo, () => {})"
            >
              {{ pageNo }}
            </button>
            <button type="button" :disabled="overviewTaskPage.current >= totalPages(taskMonitor.length, overviewTaskPage)" @click="goPage(overviewTaskPage, taskMonitor.length, overviewTaskPage.current + 1, () => {})">›</button>
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
        <div class="subnav">
          <button
            v-for="panel in dronePanels"
            :key="panel.key"
            :class="['subnav-item', { active: activeDronePanel === panel.key }]"
            type="button"
            @click="activeDronePanel = panel.key"
          >
            {{ panel.label }}
          </button>
        </div>

        <section v-if="activeDronePanel === 'list'" class="card table-panel">
          <div class="section-title"><h2>无人机条件查询</h2><button class="text-btn" @click="loadDrones">刷新</button></div>
          <form class="filter-grid" @submit.prevent="applyDroneSearch">
            <label><span>编号</span><input v-model="droneFilter.droneCode" placeholder="UAV" /></label>
            <label><span>型号</span><input v-model="droneFilter.model" placeholder="M300" /></label>
            <label><span>状态</span><select v-model="droneFilter.status"><option value="">全部</option><option>空闲</option><option>任务中</option><option>维护中</option><option>停用</option></select></label>
            <label><span>园区 ID</span><input v-model.number="droneFilter.parkId" type="number" min="1" /></label>
            <div class="filter-actions"><button class="outline-btn" type="button" @click="resetDroneSearch">重置</button><button class="primary-btn" type="submit">查询</button></div>
          </form>
          <div class="table drone-table">
            <div class="table-row table-head"><span>编号</span><span>园区</span><span>型号</span><span>载重</span><span>电量</span><span>健康</span><span>状态</span><span>操作</span></div>
            <div v-for="item in drones" :key="item.droneId" class="table-row">
              <span>{{ item.droneCode }}</span><span>{{ item.parkId ?? '-' }}</span><span>{{ item.model ?? '-' }}</span><span>{{ item.maxPayload ?? '-' }}</span><span>{{ item.batteryCapacity ?? '-' }}</span><span>{{ item.healthScore ?? '-' }}</span><span>{{ item.status ?? '空闲' }}</span>
              <span v-if="can('drone:update')" class="row-actions">
                <button class="text-btn" @click="editDrone(item)">编辑</button>
                <template v-if="item.status === '停用'">
                  <button class="text-btn" @click="setDroneStatus(item, '空闲')">启用</button>
                </template>
                <template v-else>
                  <button class="text-btn" @click="setDroneStatus(item, '空闲')">空闲</button>
                  <button class="text-btn" @click="setDroneStatus(item, '任务中')">任务中</button>
                  <button class="text-btn" @click="setDroneStatus(item, '维护中')">维护中</button>
                  <button class="text-btn danger" @click="setDroneStatus(item, '停用')">停用</button>
                </template>
                <button class="text-btn" @click="generateDroneMaintenance(item)">告警维护</button>
                <button v-if="can('drone:delete')" class="text-btn danger" @click="removeDrone(item)">删除</button>
              </span>
              <span v-else>-</span>
            </div>
          </div>
          <div v-if="droneTotal > dronePage.size" class="pagination">
            <span>共 {{ droneTotal }} 条</span>
            <button type="button" :disabled="dronePage.current === 1" @click="goPage(dronePage, droneTotal, dronePage.current - 1, loadDrones)">‹</button>
            <button
              v-for="pageNo in pageNumbers(droneTotal, dronePage)"
              :key="pageNo"
              type="button"
              :class="{ active: pageNo === dronePage.current }"
              @click="goPage(dronePage, droneTotal, pageNo, loadDrones)"
            >
              {{ pageNo }}
            </button>
            <button type="button" :disabled="dronePage.current >= totalPages(droneTotal, dronePage)" @click="goPage(dronePage, droneTotal, dronePage.current + 1, loadDrones)">›</button>
          </div>
        </section>

        <section v-if="activeDronePanel === 'form' && (can('drone:add') || can('drone:update'))" class="card form-panel">
          <div class="section-title"><h2>{{ editingDroneId ? '编辑无人机' : '新增无人机' }}</h2></div>
          <form class="field-grid" @submit.prevent="submitDrone">
            <label><span>编号</span><input v-model="droneForm.droneCode" required placeholder="UAV-005" /></label>
            <label><span>型号</span><input v-model="droneForm.model" placeholder="DJI M300" /></label>
            <label><span>园区 ID</span><input v-model.number="droneForm.parkId" type="number" min="1" /></label>
            <label><span>最大载重 kg</span><input v-model.number="droneForm.maxPayload" type="number" min="0" step="0.1" /></label>
            <label><span>电池容量</span><input v-model.number="droneForm.batteryCapacity" type="number" min="0" max="100" /></label>
            <label><span>健康分</span><input v-model.number="droneForm.healthScore" type="number" min="0" max="100" /></label>
            <label><span>状态</span><select v-model="droneForm.status"><option>空闲</option><option>任务中</option><option>维护中</option><option>停用</option></select></label>
            <div class="button-row"><button class="outline-btn" type="button" @click="resetDroneForm">清空</button><button class="primary-btn" type="submit">{{ editingDroneId ? '保存无人机' : '新增无人机' }}</button></div>
          </form>
        </section>
      </section>

      <section v-else-if="activeTab === 'orders'" class="split-layout">
        <div class="subnav">
          <button
            v-for="panel in orderPanels"
            :key="panel.key"
            :class="['subnav-item', { active: activeOrderPanel === panel.key }]"
            type="button"
            @click="activeOrderPanel = panel.key"
          >
            {{ panel.label }}
          </button>
        </div>

        <section v-if="activeOrderPanel === 'orders'" class="card table-panel">
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
              <span>{{ item.orderNo ?? item.orderId }}</span><span>{{ item.cargoName ?? '-' }}</span><span>{{ item.cargoWeight ?? '-' }}</span><span>{{ item.priority ?? '-' }}</span><span>{{ item.orderStatus ?? '-' }}</span><span>{{ formatDate(item.createdAt) }}</span>
              <span class="row-actions">
                <button v-if="can('order:update')" class="text-btn" @click="editOrder(item)">修改</button>
                <button v-if="can('task:add')" class="text-btn" @click="generateTask(item)">生成任务</button>
                <span v-if="!can('order:update') && !can('task:add')">-</span>
              </span>
            </div>
            <p v-if="!orders.length" class="empty-state">暂无订单数据</p>
          </div>
          <div v-if="orderTotal > orderPage.size" class="pagination">
            <span>共 {{ orderTotal }} 条</span>
            <button type="button" :disabled="orderPage.current === 1" @click="goPage(orderPage, orderTotal, orderPage.current - 1, loadOrders)">‹</button>
            <button
              v-for="pageNo in pageNumbers(orderTotal, orderPage)"
              :key="pageNo"
              type="button"
              :class="{ active: pageNo === orderPage.current }"
              @click="goPage(orderPage, orderTotal, pageNo, loadOrders)"
            >
              {{ pageNo }}
            </button>
            <button type="button" :disabled="orderPage.current >= totalPages(orderTotal, orderPage)" @click="goPage(orderPage, orderTotal, orderPage.current + 1, loadOrders)">›</button>
          </div>
        </section>

        <section v-if="activeOrderPanel === 'routes'" class="card table-panel">
          <div class="section-title"><h2>航线条件查询</h2><button class="text-btn" @click="loadRoutes">刷新</button></div>
          <form class="filter-grid" @submit.prevent="applyRouteSearch">
            <label><span>航线名称</span><input v-model="routeFilter.routeName" placeholder="南区" /></label>
            <label><span>风险等级</span><select v-model="routeFilter.riskLevel"><option value="">全部</option><option>低</option><option>中</option><option>高</option></select></label>
            <label><span>启用状态</span><select v-model.number="routeFilter.enabled"><option :value="undefined">全部</option><option :value="1">启用</option><option :value="0">停用</option></select></label>
            <div class="filter-actions"><button class="outline-btn" type="button" @click="resetRouteSearch">重置</button><button class="primary-btn" type="submit">查询</button></div>
          </form>
          <div class="table route-table">
            <div class="table-row table-head"><span>ID</span><span>名称</span><span>起点</span><span>终点</span><span>距离</span><span>预计分钟</span><span>风险</span><span>状态</span><span>操作</span></div>
            <div v-for="item in routes" :key="item.routeId" class="table-row">
              <span>{{ item.routeId ?? '-' }}</span><span>{{ item.routeName }}</span><span>{{ item.startPointId ?? '-' }}</span><span>{{ item.endPointId ?? '-' }}</span><span>{{ item.distanceKm ?? '-' }}</span><span>{{ item.estimateMinutes ?? '-' }}</span><span>{{ item.riskLevel ?? '-' }}</span><span>{{ item.enabled === 0 ? '停用' : '启用' }}</span>
              <span class="row-actions">
                <button class="text-btn" @click="loadRouteNodes(item.routeId)">节点</button>
                <button v-if="can('route:update')" class="text-btn" @click="editRoute(item)">修改</button>
                <button v-if="can('route:delete')" class="text-btn danger" @click="removeRoute(item)">删除</button>
              </span>
            </div>
            <p v-if="!routes.length" class="empty-state">暂无航线数据</p>
          </div>
          <div v-if="routeTotal > routePage.size" class="pagination">
            <span>共 {{ routeTotal }} 条</span>
            <button type="button" :disabled="routePage.current === 1" @click="goPage(routePage, routeTotal, routePage.current - 1, loadRoutes)">‹</button>
            <button
              v-for="pageNo in pageNumbers(routeTotal, routePage)"
              :key="pageNo"
              type="button"
              :class="{ active: pageNo === routePage.current }"
              @click="goPage(routePage, routeTotal, pageNo, loadRoutes)"
            >
              {{ pageNo }}
            </button>
            <button type="button" :disabled="routePage.current >= totalPages(routeTotal, routePage)" @click="goPage(routePage, routeTotal, routePage.current + 1, loadRoutes)">›</button>
          </div>
        </section>

        <section v-if="activeOrderPanel === 'routes'" class="card table-panel">
          <div class="section-title"><h2>航线节点查询 / 新增</h2><button class="text-btn" @click="loadRouteNodes()">刷新节点</button></div>
          <div class="table route-node-table">
            <div class="table-row table-head"><span>ID</span><span>航线</span><span>顺序</span><span>经度</span><span>纬度</span><span>高度</span><span>类型</span></div>
            <div v-for="item in routeNodes" :key="item.nodeId" class="table-row">
              <span>{{ item.nodeId ?? '-' }}</span><span>{{ item.routeId ?? '-' }}</span><span>{{ item.nodeOrder ?? '-' }}</span><span>{{ item.longitude ?? '-' }}</span><span>{{ item.latitude ?? '-' }}</span><span>{{ item.altitude ?? '-' }}</span><span>{{ item.nodeType ?? '-' }}</span>
            </div>
            <p v-if="selectedRouteId && !routeNodes.length" class="empty-state">暂无航线节点数据</p>
            <p v-if="!selectedRouteId" class="empty-state">请先在航线列表点击“节点”</p>
          </div>
          <form v-if="selectedRouteId" class="field-grid compact-form" @submit.prevent="submitRouteNode">
            <label><span>航线 ID</span><input v-model.number="routeNodeForm.routeId" type="number" min="1" /></label>
            <label><span>顺序</span><input v-model.number="routeNodeForm.nodeOrder" type="number" min="1" /></label>
            <label><span>经度</span><input v-model.number="routeNodeForm.longitude" type="number" step="0.000001" /></label>
            <label><span>纬度</span><input v-model.number="routeNodeForm.latitude" type="number" step="0.000001" /></label>
            <label><span>高度</span><input v-model.number="routeNodeForm.altitude" type="number" min="0" /></label>
            <label><span>类型</span><select v-model="routeNodeForm.nodeType"><option>起点</option><option>途经点</option><option>终点</option></select></label>
            <button class="primary-btn" type="submit">新增节点</button>
          </form>
        </section>

        <section v-if="activeOrderPanel === 'tasks'" class="card table-panel">
          <div class="section-title"><h2>任务条件查询</h2><button class="text-btn" @click="loadTasks">刷新</button></div>
          <form class="filter-grid" @submit.prevent="applyTaskSearch">
            <label><span>任务状态</span><select v-model="taskFilter.taskStatus"><option value="">全部</option><option>待执行</option><option>执行中</option><option>已完成</option><option>已取消</option></select></label>
            <label><span>无人机 ID</span><input v-model.number="taskFilter.droneId" type="number" min="1" /></label>
            <label><span>订单 ID</span><input v-model.number="taskFilter.orderId" type="number" min="1" /></label>
            <div class="filter-actions"><button class="outline-btn" type="button" @click="resetTaskSearch">重置</button><button class="primary-btn" type="submit">查询</button></div>
          </form>
          <div class="table task-table">
            <div class="table-row table-head"><span>ID</span><span>订单</span><span>无人机</span><span>航线</span><span>调度员</span><span>状态</span><span>计划开始</span><span>实际结束</span></div>
            <div v-for="item in tasks" :key="item.taskId" class="table-row">
              <span>{{ item.taskId ?? '-' }}</span><span>{{ item.orderId ?? '-' }}</span><span>{{ item.droneId ?? '-' }}</span><span>{{ item.routeId ?? '-' }}</span><span>{{ item.dispatcherId ?? '-' }}</span><span>{{ taskStatusText(item.taskStatus) }}</span><span>{{ formatDate(item.plannedStartTime) }}</span><span>{{ formatDate(item.actualEndTime) }}</span>
            </div>
            <p v-if="!tasks.length" class="empty-state">暂无任务数据</p>
          </div>
          <div v-if="taskTotal > taskPage.size" class="pagination">
            <span>共 {{ taskTotal }} 条</span>
            <button type="button" :disabled="taskPage.current === 1" @click="goPage(taskPage, taskTotal, taskPage.current - 1, loadTasks)">‹</button>
            <button
              v-for="pageNo in pageNumbers(taskTotal, taskPage)"
              :key="pageNo"
              type="button"
              :class="{ active: pageNo === taskPage.current }"
              @click="goPage(taskPage, taskTotal, pageNo, loadTasks)"
            >
              {{ pageNo }}
            </button>
            <button type="button" :disabled="taskPage.current >= totalPages(taskTotal, taskPage)" @click="goPage(taskPage, taskTotal, taskPage.current + 1, loadTasks)">›</button>
          </div>
        </section>

        <section v-if="activeOrderPanel === 'create' && (can('order:add') || can('order:update'))" class="card form-panel">
          <div class="section-title"><h2>{{ editingOrderId ? '修改订单' : '创建订单' }}</h2></div>
          <form class="field-grid" @submit.prevent="submitOrder">
            <label><span>货物名称</span><input v-model="orderForm.cargoName" required placeholder="医疗物资" /></label>
            <label><span>货物重量 kg</span><input v-model.number="orderForm.cargoWeight" type="number" min="0" step="0.1" /></label>
            <label><span>取货点 ID</span><input v-model.number="orderForm.pickupPointId" type="number" min="1" /></label>
            <label><span>送达点 ID</span><input v-model.number="orderForm.deliveryPointId" type="number" min="1" /></label>
            <label><span>优先级</span><select v-model="orderForm.priority"><option>普通</option><option>加急</option></select></label>
            <label v-if="editingOrderId"><span>状态</span><select v-model="orderForm.orderStatus"><option>待审核</option><option>执行中</option><option>已完成</option><option>已取消</option></select></label>
            <div class="button-row"><button class="outline-btn" type="button" @click="resetOrderForm">清空</button><button class="primary-btn" type="submit">{{ editingOrderId ? '保存订单' : '创建订单' }}</button></div>
          </form>
        </section>

        <section v-if="activeOrderPanel === 'routes' && (can('route:add') || can('route:update'))" class="card form-panel">
          <div class="section-title"><h2>{{ editingRouteId ? '修改航线' : '新增航线' }}</h2></div>
          <form class="field-grid" @submit.prevent="submitRoute">
            <label><span>航线名称</span><input v-model="routeForm.routeName" required placeholder="总部到南区航线" /></label>
            <label><span>起点 ID</span><input v-model.number="routeForm.startPointId" type="number" min="1" /></label>
            <label><span>终点 ID</span><input v-model.number="routeForm.endPointId" type="number" min="1" /></label>
            <label><span>距离 km</span><input v-model.number="routeForm.distanceKm" type="number" min="0" step="0.1" /></label>
            <label><span>预计分钟</span><input v-model.number="routeForm.estimateMinutes" type="number" min="0" /></label>
            <label><span>风险等级</span><select v-model="routeForm.riskLevel"><option>低</option><option>中</option><option>高</option></select></label>
            <label><span>启用状态</span><select v-model.number="routeForm.enabled"><option :value="1">启用</option><option :value="0">停用</option></select></label>
            <div class="button-row"><button class="outline-btn" type="button" @click="resetRouteForm">清空</button><button class="primary-btn" type="submit">{{ editingRouteId ? '保存航线' : '新增航线' }}</button></div>
          </form>
        </section>
      </section>

      <section v-else-if="activeTab === 'alarms'" class="split-layout">
        <div class="subnav">
          <button
            v-for="panel in alarmPanels"
            :key="panel.key"
            :class="['subnav-item', { active: activeAlarmPanel === panel.key }]"
            type="button"
            @click="activeAlarmPanel = panel.key"
          >
            {{ panel.label }}
          </button>
        </div>

        <section v-if="activeAlarmPanel === 'list'" class="card table-panel full-width">
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
              <span>{{ item.alarmId }}</span><span>{{ item.droneId ?? '-' }}</span><span>{{ item.alarmType ?? '-' }}</span><span>{{ item.alarmLevel ?? '-' }}</span><span>{{ item.alarmStatus ?? '-' }}</span><span>{{ formatDate(item.alarmTime) }}</span><span>{{ item.handleResult ?? '-' }}</span>
              <span v-if="can('alarm:handle')" class="row-actions">
                <button class="text-btn" @click="editAlarm(item)">编辑处理</button>
                <button class="text-btn" @click="resolveAlarm(item)">标记处理</button>
              </span>
              <span v-else>-</span>
            </div>
          </div>
          <div v-if="alarmTotal > alarmPage.size" class="pagination">
            <span>共 {{ alarmTotal }} 条</span>
            <button type="button" :disabled="alarmPage.current === 1" @click="goPage(alarmPage, alarmTotal, alarmPage.current - 1, loadAlarms)">‹</button>
            <button
              v-for="pageNo in pageNumbers(alarmTotal, alarmPage)"
              :key="pageNo"
              type="button"
              :class="{ active: pageNo === alarmPage.current }"
              @click="goPage(alarmPage, alarmTotal, pageNo, loadAlarms)"
            >
              {{ pageNo }}
            </button>
            <button type="button" :disabled="alarmPage.current >= totalPages(alarmTotal, alarmPage)" @click="goPage(alarmPage, alarmTotal, alarmPage.current + 1, loadAlarms)">›</button>
          </div>
        </section>

        <section v-if="activeAlarmPanel === 'handle' && can('alarm:handle')" class="card form-panel">
          <div class="section-title"><h2>告警处理信息更新</h2></div>
          <form class="field-grid" @submit.prevent="submitAlarmHandle">
            <label><span>告警 ID</span><input v-model.number="alarmForm.alarmId" disabled type="number" /></label>
            <label><span>无人机 ID</span><input v-model.number="alarmForm.droneId" type="number" min="1" /></label>
            <label><span>任务 ID</span><input v-model.number="alarmForm.taskId" type="number" min="1" /></label>
            <label><span>类型</span><input v-model="alarmForm.alarmType" /></label>
            <label><span>等级</span><select v-model="alarmForm.alarmLevel"><option>提示</option><option>警告</option><option>严重</option></select></label>
            <label><span>状态</span><select v-model="alarmForm.alarmStatus"><option>待处理</option><option>已处理</option></select></label>
            <label><span>处理人 ID</span><input v-model.number="alarmForm.handlerId" type="number" min="1" /></label>
            <label class="full-width"><span>处理结果</span><input v-model="alarmForm.handleResult" placeholder="已降落充电" /></label>
            <div class="button-row"><button class="outline-btn" type="button" @click="resetAlarmForm">清空</button><button class="primary-btn" :disabled="!editingAlarmId" type="submit">保存处理</button></div>
          </form>
        </section>
      </section>

      <section v-else class="split-layout">
        <div class="subnav">
          <button
            v-for="panel in userPanels"
            :key="panel.key"
            :class="['subnav-item', { active: activeUserPanel === panel.key }]"
            type="button"
            @click="activeUserPanel = panel.key"
          >
            {{ panel.label }}
          </button>
        </div>

        <section v-if="activeUserPanel === 'list'" class="card table-panel">
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
          <div v-if="userTotal > userPage.size" class="pagination">
            <span>共 {{ userTotal }} 条</span>
            <button type="button" :disabled="userPage.current === 1" @click="goPage(userPage, userTotal, userPage.current - 1, loadUsers)">‹</button>
            <button
              v-for="pageNo in pageNumbers(userTotal, userPage)"
              :key="pageNo"
              type="button"
              :class="{ active: pageNo === userPage.current }"
              @click="goPage(userPage, userTotal, pageNo, loadUsers)"
            >
              {{ pageNo }}
            </button>
            <button type="button" :disabled="userPage.current >= totalPages(userTotal, userPage)" @click="goPage(userPage, userTotal, userPage.current + 1, loadUsers)">›</button>
          </div>
        </section>

        <section v-if="activeUserPanel === 'form' && (can('user:add') || can('user:update'))" class="card form-panel">
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

        <section v-if="activeUserPanel === 'roles'" class="card table-panel">
          <div class="section-title"><h2>角色列表</h2><button class="text-btn" @click="loadRoles">刷新</button></div>
          <div class="table role-table">
            <div class="table-row table-head"><span>ID</span><span>角色名称</span><span>说明</span></div>
            <div v-for="role in roles" :key="role.roleId" class="table-row">
              <span>{{ role.roleId }}</span><span>{{ roleNameOf(role.roleId) }}</span><span>{{ role.roleDesc ?? '-' }}</span>
            </div>
          </div>
        </section>

        <section v-if="activeUserPanel === 'logs'" class="card table-panel">
          <div class="section-title"><h2>操作日志查询</h2><button class="text-btn" @click="loadLogs">刷新</button></div>
          <div class="table log-table">
            <div class="table-row table-head"><span>ID</span><span>用户</span><span>操作</span><span>方法</span><span>时间</span></div>
            <div v-for="(item, index) in logs" :key="logValue(item, ['logId', 'id']) + index" class="table-row">
              <span>{{ logValue(item, ['logId', 'id']) }}</span><span>{{ logValue(item, ['username', 'operator', 'realName']) }}</span><span>{{ logValue(item, ['operation', 'action', 'description']) }}</span><span>{{ logValue(item, ['method', 'requestMethod']) }}</span><span>{{ formatDate(logValue(item, ['createdAt', 'createTime', 'operationTime'])) }}</span>
            </div>
            <p v-if="!logs.length" class="empty-state">暂无操作日志</p>
          </div>
          <div v-if="logTotal > logPage.size" class="pagination">
            <span>共 {{ logTotal }} 条</span>
            <button type="button" :disabled="logPage.current === 1" @click="goPage(logPage, logTotal, logPage.current - 1, loadLogs)">‹</button>
            <button
              v-for="pageNo in pageNumbers(logTotal, logPage)"
              :key="pageNo"
              type="button"
              :class="{ active: pageNo === logPage.current }"
              @click="goPage(logPage, logTotal, pageNo, loadLogs)"
            >
              {{ pageNo }}
            </button>
            <button type="button" :disabled="logPage.current >= totalPages(logTotal, logPage)" @click="goPage(logPage, logTotal, logPage.current + 1, loadLogs)">›</button>
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

.subnav {
  display: flex;
  gap: 10px;
  padding: 6px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.92);
  overflow-x: auto;
}

.subnav-item {
  flex: 0 0 auto;
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 10px 14px;
  background: transparent;
  color: #64748b;
  font: inherit;
  font-weight: 750;
  cursor: pointer;
  white-space: nowrap;
}

.subnav-item:hover {
  background: rgba(15, 118, 110, 0.06);
  color: #1f2937;
}

.subnav-item.active {
  border-color: rgba(15, 118, 110, 0.22);
  background: rgba(15, 118, 110, 0.1);
  color: #0f766e;
}

.field-grid,
.filter-grid,
.health-list { display: grid; gap: 18px; }
.health-list {
  max-height: 720px;
  overflow-y: auto;
  padding-right: 8px;
}
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
.compact-form { margin-top: 18px; }

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
input:disabled { background: rgba(226, 232, 240, 0.55); color: #64748b; }

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
.drone-table .table-row { grid-template-columns: 1.1fr 0.6fr 1fr 0.7fr 0.7fr 0.7fr 0.9fr 2fr; }
.order-table .table-row { grid-template-columns: 1.1fr 1fr 0.7fr 0.7fr 0.7fr 0.9fr 1.3fr; }
.route-table .table-row { grid-template-columns: 70px 1.2fr 0.65fr 0.65fr 0.65fr 0.8fr 0.7fr 0.7fr 1.5fr; }
.task-table .table-row { grid-template-columns: 70px 1.2fr 0.75fr 0.75fr 0.75fr 0.9fr 0.9fr 1fr; }
.route-node-table .table-row { grid-template-columns: 70px 0.8fr 0.8fr 1fr 1fr 0.8fr 0.9fr; }
.alarm-table .table-row { grid-template-columns: 70px 90px 1fr 0.8fr 0.9fr 1.2fr 1.4fr 1fr; }
.user-table .table-row { grid-template-columns: 70px 1fr 1fr 0.9fr 0.8fr 1.4fr; }
.role-table .table-row { grid-template-columns: 70px 1fr 2fr; }
.log-table .table-row { grid-template-columns: 70px 1fr 1.2fr 1fr 1.2fr; }

.pagination {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
  color: #64748b;
}

.pagination button {
  min-width: 36px;
  height: 36px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 8px;
  background: #ffffff;
  color: #1f2937;
  cursor: pointer;
  font: inherit;
  font-weight: 750;
}

.pagination button.active {
  border-color: #0f766e;
  background: #0f766e;
  color: #ffffff;
}

.pagination button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

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
  .subnav { flex-wrap: wrap; overflow-x: visible; }
  .subnav-item { flex: 1 1 150px; text-align: center; }
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
  .route-node-table .table-row,
  .task-table .table-row,
  .alarm-table .table-row,
  .user-table .table-row,
  .role-table .table-row,
  .log-table .table-row { min-width: 0; grid-template-columns: 1fr; gap: 8px; padding: 14px; }
  .table-row span { min-width: 0; overflow-wrap: anywhere; }
  .row-actions { justify-content: flex-start; flex-wrap: wrap; }
  .pagination { justify-content: flex-start; flex-wrap: wrap; }
}
</style>
