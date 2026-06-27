import request from '../utils/request'
import type { CustomerOrderItem } from '../types/api'

export function createOrder(payload: CustomerOrderItem) {
  return request<CustomerOrderItem>('/dispatcher/orders/create', {
    method: 'POST',
    body: payload,
  })
}

export function generateOrderTask(orderId: number) {
  return request<string>(`/dispatcher/orders/${orderId}/generate-task`, {
    method: 'POST',
  })
}