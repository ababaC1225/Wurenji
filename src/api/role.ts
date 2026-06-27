import request from '../utils/request'
import type { RoleForm, RoleItem, RolePageResult } from '../types/api'

export function fetchRolePage(params: { pageNum?: number; pageSize?: number } = {}) {
  const search = new URLSearchParams()

  if (params.pageNum) search.set('pageNum', String(params.pageNum))
  if (params.pageSize) search.set('pageSize', String(params.pageSize))

  const suffix = search.toString() ? `?${search.toString()}` : ''
  return request<RolePageResult>(`/role/page${suffix}`)
}

export function fetchRoleSelect() {
  return request<RoleItem[]>('/role/select')
}

export function fetchRoleDetail(roleId: number) {
  return request<RoleItem>(`/role/${roleId}`)
}

export function createRole(payload: RoleForm) {
  return request<void>('/role/add', {
    method: 'POST',
    body: payload,
  })
}

export function updateRole(payload: RoleForm) {
  return request<void>('/role/update', {
    method: 'PUT',
    body: payload,
  })
}

export function removeRole(roleId: number) {
  return request<void>(`/role/${roleId}`, {
    method: 'DELETE',
  })
}