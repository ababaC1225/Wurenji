import request from '../utils/request'
import type { CustomerOrderItem } from '../types/api'

export function createOrder(payload: CustomerOrderItem) {
  return request<CustomerOrderItem>('/dispatcher/orders/create', {
    method: 'POST',
    body: payload,
  })
}

export function updateOrder(payload: CustomerOrderItem) {
  return request<string>('/dispatcher/orders/update', {
    method: 'PUT',
    body: payload,
  })
}

export function cancelOrder(orderId: number) {
  return request<string>(`/dispatcher/orders/${orderId}/cancel`, {
    method: 'POST',
  })
}

export function generateOrderTask(orderId: number) {
  return request<string>(`/dispatcher/orders/${orderId}/generate-task`, {
    method: 'POST',
  })
}
