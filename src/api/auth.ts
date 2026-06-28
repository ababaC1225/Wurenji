import request from '../utils/request'
import type { LoginPayload, LoginResponse } from '../types/api'

export function login(payload: LoginPayload) {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    query: {
      username: payload.username,
      password: payload.password,
    },
  })
}

export function logoutApi() {
  return request<string>('/auth/logout', {
    method: 'POST',
  })
}
