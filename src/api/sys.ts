import request from '../utils/request'
import type {
  OperationLogItem,
  PageResult,
  RoleItem,
  SystemParamItem,
  SysUser,
  UserForm,
} from '../types/api'

export function fetchUserPage(params: { current?: number; size?: number } = {}) {
  const search = new URLSearchParams()

  if (params.current) search.set('current', String(params.current))
  if (params.size) search.set('size', String(params.size))

  const suffix = search.toString() ? `?${search.toString()}` : ''
  return request<PageResult<SysUser>>(`/sys/user/page${suffix}`)
}

export function searchUserPage(params: {
  username?: string
  realName?: string
  roleId?: number
  status?: number
  current?: number
  size?: number
} = {}) {
  return request<PageResult<SysUser>>('/sys/user/search', {
    query: params,
  })
}

export function createUser(payload: UserForm) {
  return request<void>('/sys/user/add', {
    method: 'POST',
    body: payload,
  })
}

export function updateUser(payload: UserForm) {
  return request<void>('/sys/user/update', {
    method: 'PUT',
    body: payload,
  })
}

export function updateUserStatus(userId: number, status: number) {
  return request<void>('/sys/user/status', {
    method: 'PUT',
    query: { userId, status },
  })
}

export function deleteUser(userId: number) {
  return request<string>(`/sys/user/delete/${userId}`, {
    method: 'DELETE',
  })
}

export function fetchRoleList() {
  return request<RoleItem[]>('/sys/role/list')
}

export function fetchLogPage(params: { current?: number; size?: number } = {}) {
  const search = new URLSearchParams()

  if (params.current) search.set('current', String(params.current))
  if (params.size) search.set('size', String(params.size))

  const suffix = search.toString() ? `?${search.toString()}` : ''
  return request<PageResult<OperationLogItem>>(`/sys/log/page${suffix}`)
}

export function fetchSystemParams() {
  return request<SystemParamItem[]>('/sys/param/list')
}
