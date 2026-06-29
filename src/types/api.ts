export interface ApiResponse<T> {
  code: number
  msg: string
  data: T
  timestamp?: number
}

export interface LoginPayload {
  username: string
  password: string
}

export interface LoginResponse {
  token?: string
  accessToken?: string
  jwt?: string
  role?: string
  roleName?: string
  roleCode?: string
  username?: string
  realName?: string
  roleId?: number
  userId?: number
  permissions?: string | string[]
  user?: {
    username?: string
    realName?: string
    role?: string
    roleName?: string
    roleCode?: string
    roleId?: number
    userId?: number
    permissions?: string | string[]
  }
  [key: string]: unknown
}

export interface SessionProfile {
  token: string
  username: string
  realName: string
  role: string
  roleId: number
  userId: number
  permissions?: string
}

export interface PageResult<T> {
  list?: T[]
  records?: T[]
  total: number
  pages: number
  current?: number
  size?: number
  pageNum?: number
  pageSize?: number
}

export interface RoleItem {
  roleId: number
  roleName: string
  roleDesc?: string
}

export interface SysUser {
  userId: number
  roleId: number
  username: string
  passwordHash?: string
  realName: string
  phone?: string
  status?: number
  permissions?: string
  createdAt?: string
}

export interface UserForm {
  userId?: number
  roleId: number
  username: string
  passwordHash?: string
  realName: string
  phone?: string
  status?: number
  permissions?: string
}

export interface DroneItem {
  droneId?: number
  parkId?: number
  droneCode: string
  model?: string
  maxPayload?: number
  batteryCapacity?: number
  status?: string
  healthScore?: number
}

export interface CustomerOrderItem {
  orderId?: number
  orderNo?: string
  pickupPointId?: number
  deliveryPointId?: number
  cargoName?: string
  cargoWeight?: number
  priority?: string
  orderStatus?: string
  createdBy?: number
  createdAt?: string
}

export interface RouteItem {
  routeId?: number
  startPointId?: number
  endPointId?: number
  routeName: string
  distanceKm?: number
  estimateMinutes?: number
  riskLevel?: string
  enabled?: number
}

export interface RouteNodeItem {
  nodeId?: number
  routeId?: number
  nodeOrder?: number
  longitude?: number
  latitude?: number
  altitude?: number
  nodeType?: string
}

export interface FlightTaskItem {
  taskId?: number
  orderId?: number
  droneId?: number
  routeId?: number
  dispatcherId?: number
  taskStatus?: string
  plannedStartTime?: string
  actualStartTime?: string
  actualEndTime?: string
}

export interface AlarmEventItem {
  alarmId?: number
  droneId?: number
  taskId?: number | null
  alarmType?: string
  alarmLevel?: string
  alarmStatus?: string
  alarmTime?: string
  handlerId?: number | null
  handleResult?: string | null
}

export interface MaintenanceRecordItem {
  recordId?: number
  droneId?: number
  maintainerId?: number
  maintainType?: string
  maintainResult?: string
  maintainTime?: string
  remark?: string
}

export interface TaskMonitorItem {
  taskId?: number
  orderNo?: string
  droneCode?: string
  routeName?: string
  taskStatus?: string
  plannedStartTime?: string
  [key: string]: unknown
}

export interface DroneHealthItem {
  droneId?: number
  droneCode?: string
  model?: string
  status?: string
  healthScore?: number
  [key: string]: unknown
}

export interface OrderFulfillmentItem {
  orderStatus?: string
  count?: number
  total?: number
  [key: string]: unknown
}

export interface OperationLogItem {
  [key: string]: unknown
}

export interface SystemParamItem {
  [key: string]: unknown
}

export interface RoleForm {
  roleId?: number
  roleName: string
  roleDesc: string
}

export interface DashboardMetrics {
  title: string
  value: string
  hint: string
  tone: 'teal' | 'blue' | 'amber' | 'rose'
}
