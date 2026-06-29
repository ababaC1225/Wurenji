import request from '../utils/request'
import type { AlarmEventItem, MaintenanceRecordItem, PageResult } from '../types/api'

type AlarmHandlePayload = Pick<AlarmEventItem, 'alarmId' | 'alarmStatus' | 'handlerId' | 'handleResult'>
type AlarmEditPayload = Pick<
  AlarmEventItem,
  'alarmId' | 'droneId' | 'taskId' | 'alarmType' | 'alarmLevel' | 'alarmStatus' | 'handlerId' | 'handleResult'
>

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

export function searchAlarmPage(params: {
  droneId?: number
  alarmType?: string
  alarmLevel?: string
  alarmStatus?: string
  current?: number
  size?: number
} = {}) {
  return request<PageResult<AlarmEventItem>>('/maintain/alarm/search', {
    query: params,
  })
}

export function updateAlarmHandle(payload: AlarmHandlePayload) {
  return request<void>('/maintain/alarm/handle', {
    method: 'PUT',
    body: payload,
  })
}

export function handleAlarm(payload: AlarmHandlePayload) {
  return updateAlarmHandle(payload)
}

export function editAlarmApi(payload: AlarmEditPayload) {
  return request<void>('/maintain/alarm/edit', {
    method: 'PUT',
    body: payload,
  })
}

export function generateAlarm(payload: Pick<AlarmEventItem, 'droneId' | 'taskId' | 'alarmType' | 'alarmLevel'>) {
  return request<void>('/maintain/alarm/generate', {
    method: 'POST',
    body: payload,
  })
}
