import request from '../utils/request'
import type { FlightTaskItem, PageResult, RouteItem, CustomerOrderItem } from '../types/api'

export function fetchSchedulerOrderPage(params: { current?: number; size?: number } = {}) {
  const search = new URLSearchParams()

  if (params.current) search.set('current', String(params.current))
  if (params.size) search.set('size', String(params.size))

  const suffix = search.toString() ? `?${search.toString()}` : ''
  return request<PageResult<CustomerOrderItem>>(`/scheduler/order/page${suffix}`)
}

export function fetchRoutePage(params: { current?: number; size?: number } = {}) {
  const search = new URLSearchParams()

  if (params.current) search.set('current', String(params.current))
  if (params.size) search.set('size', String(params.size))

  const suffix = search.toString() ? `?${search.toString()}` : ''
  return request<PageResult<RouteItem>>(`/scheduler/route/page${suffix}`)
}

export function createRoute(payload: RouteItem) {
  return request<void>('/scheduler/route/add', {
    method: 'POST',
    body: payload,
  })
}

export function updateRoute(payload: RouteItem) {
  return request<void>('/scheduler/route/update', {
    method: 'PUT',
    body: payload,
  })
}

export function deleteRoute(routeId: number) {
  return request<void>(`/scheduler/route/delete/${routeId}`, {
    method: 'DELETE',
  })
}

export function createTask(payload: FlightTaskItem) {
  return request<void>('/scheduler/task/create', {
    method: 'POST',
    body: payload,
  })
}

export function fetchTaskPage(params: { current?: number; size?: number } = {}) {
  const search = new URLSearchParams()

  if (params.current) search.set('current', String(params.current))
  if (params.size) search.set('size', String(params.size))

  const suffix = search.toString() ? `?${search.toString()}` : ''
  return request<PageResult<FlightTaskItem>>(`/scheduler/task/page${suffix}`)
}