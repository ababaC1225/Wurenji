import request from '../utils/request'
import type { DroneItem } from '../types/api'

export function fetchDroneList() {
  return request<DroneItem[]>('/maintenance/drones/list')
}

export function searchDrones(params: {
  droneCode?: string
  model?: string
  status?: string
  parkId?: number
  current?: number
  size?: number
} = {}) {
  return request<DroneItem[]>('/maintenance/drones/search', {
    query: params,
  })
}

export function addDrone(payload: DroneItem) {
  return request<DroneItem>('/maintenance/drones/add', {
    method: 'POST',
    body: payload,
  })
}

export function updateDrone(payload: DroneItem) {
  return request<string>('/maintenance/drones/update', {
    method: 'PUT',
    body: payload,
  })
}

export function updateDroneStatus(droneId: number, status: string) {
  return request<string>(`/maintenance/drones/${droneId}/status`, {
    method: 'PUT',
    query: { status },
  })
}

export function deleteDrone(droneId: number) {
  return request<string>(`/maintenance/drones/delete/${droneId}`, {
    method: 'DELETE',
  })
}
