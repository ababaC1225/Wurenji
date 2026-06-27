import request from '../utils/request'
import type { AlarmEventItem, MaintenanceRecordItem, PageResult } from '../types/api'

export function createMaintenanceRecord(payload: MaintenanceRecordItem) {
  return request<void>('/maintain/record/add', {
    method: 'POST',
    body: payload,
  })
}

export function fetchAlarmPage(params: { current?: number; size?: number } = {}) {
  const search = new URLSearchParams()

  if (params.current) search.set('current', String(params.current))
  if (params.size) search.set('size', String(params.size))

  const suffix = search.toString() ? `?${search.toString()}` : ''
  return request<PageResult<AlarmEventItem>>(`/maintain/alarm/page${suffix}`)
}

export function handleAlarm(payload: AlarmEventItem) {
  return request<void>('/maintain/alarm/handle', {
    method: 'PUT',
    body: payload,
  })
}