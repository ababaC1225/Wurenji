import request from '../utils/request'
import type { DroneHealthItem, OrderFulfillmentItem, TaskMonitorItem } from '../types/api'

export function fetchTaskMonitor() {
  return request<TaskMonitorItem[]>('/stat/taskMonitor')
}

export function fetchDroneHealth() {
  return request<DroneHealthItem[]>('/stat/droneHealth')
}

export function fetchOrderFulfill() {
  return request<OrderFulfillmentItem[]>('/stat/orderFulfillment')
}