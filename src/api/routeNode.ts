import request from '../utils/request'
import type { RouteNodeItem } from '../types/api'

export function fetchRouteNodeList(routeId: number) {
  return request<RouteNodeItem[]>(`/route-node/list/${routeId}`)
}

export function addRouteNode(payload: RouteNodeItem) {
  return request<void>('/route-node/add', {
    method: 'POST',
    body: payload,
  })
}
