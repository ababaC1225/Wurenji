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

export function sendEmailCode(email: string) {
  return request<void>('/auth/send-code', {
    method: 'POST',
    query: { email },
  })
}

export function loginByEmail(payload: { email: string; code: string }) {
  return request<LoginResponse>('/auth/login-email', {
    method: 'POST',
    query: payload,
  })
}

export function logoutApi() {
  return request<string>('/auth/logout', {
    method: 'POST',
  })
}
