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

export interface LoginResult {
  token: string
  userId: number
  roleId: number
  realName: string
}

export interface RoleItem {
  roleId: number
  roleName: string
  roleDesc: string
}

export interface RolePageResult {
  records: RoleItem[]
  total: number
  pages: number
  current: number
  size: number
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