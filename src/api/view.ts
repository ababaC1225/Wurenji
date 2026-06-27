import request from '../utils/request'

export function fetchTaskMonitor() {
  return request<Record<string, unknown>>('/view/taskMonitor')
}

export function fetchDroneHealth() {
  return request<Record<string, unknown>>('/view/droneHealth')
}

export function fetchOrderFulfill() {
  return request<Record<string, unknown>>('/view/orderFulfill')
}