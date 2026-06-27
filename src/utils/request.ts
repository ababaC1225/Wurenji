import type { ApiResponse } from '../types/api'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

export class RequestError extends Error {
  code?: number

  constructor(message: string, code?: number) {
    super(message)
    this.name = 'RequestError'
    this.code = code
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = localStorage.getItem('wurenji-token')
  const headers = new Headers(options.headers)

  headers.set('Accept', 'application/json')

  if (options.body !== undefined && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  if (token) {
    headers.set('Authorization', token)
  }

  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      body:
        options.body === undefined || options.body instanceof FormData
          ? options.body
          : JSON.stringify(options.body),
    })
  } catch {
    throw new RequestError('接口服务暂时不可用，请先确认后端已启动')
  }

  const responseText = await response.text()

  let payload: ApiResponse<T> | null = null

  if (responseText) {
    try {
      payload = JSON.parse(responseText) as ApiResponse<T>
    } catch {
      payload = null
    }
  }

  if (!response.ok) {
    throw new RequestError(payload?.msg || response.statusText || '请求失败', response.status)
  }

  if (payload && typeof payload.code === 'number' && payload.code !== 200) {
    throw new RequestError(payload.msg || '请求失败', payload.code)
  }

  if (payload && 'data' in payload) {
    return payload.data
  }

  return undefined as T
}

export default request