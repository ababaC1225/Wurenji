import request from '../utils/request'
import type { LoginPayload, LoginResult } from '../types/api'

export function login(payload: LoginPayload) {
  return request<LoginResult>('/login', {
    method: 'POST',
    body: payload,
  })
}