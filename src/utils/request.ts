import type { ApiResponse } from '../types/api'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'
const API_TARGET_LABEL = import.meta.env.VITE_API_TARGET_LABEL ?? '10.133.10.106:8082'
const TOKEN_KEY = 'wurenji-token'
const PROFILE_KEY = 'wurenji-profile'
const REQUEST_TIMEOUT_MS = 8000

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
  query?: Record<string, string | number | boolean | null | undefined>
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY)
  const headers = new Headers(options.headers)
  const url = new URL(`${API_BASE_URL}${path}`, window.location.origin)

  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value === undefined || value === null || value === '') continue
      url.searchParams.set(key, String(value))
    }
  }

  headers.set('Accept', 'application/json')

  if (options.body !== undefined && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  if (token && !token.startsWith('demo-')) {
    headers.set('Authorization', token.startsWith('Bearer ') ? token : `Bearer ${token}`)
  }

  let response: Response
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    response = await fetch(url.toString(), {
      ...options,
      headers,
      signal: options.signal ?? controller.signal,
      body:
        options.body === undefined || options.body instanceof FormData
          ? options.body
          : JSON.stringify(options.body),
    })
  } catch (error) {
    const isAbort = error instanceof DOMException && error.name === 'AbortError'
    throw new RequestError(
      isAbort
        ? `后端服务请求超时，请确认 ${API_TARGET_LABEL} 当前可访问；也可以先使用演示模式查看页面`
        : `接口服务暂时不可用，请确认 ${API_TARGET_LABEL} 当前可访问`,
    )
  } finally {
    window.clearTimeout(timeoutId)
  }

  const responseText = await response.text()
  let payload: ApiResponse<T> | T | null = null

  if (responseText) {
    try {
      payload = JSON.parse(responseText) as ApiResponse<T> | T
    } catch {
      payload = null
    }
  }

  const wrapped = payload as ApiResponse<T> | null

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(PROFILE_KEY)
    }

    const gatewayMessage =
      response.status === 502 || response.status === 504
        ? `后端服务未连通，请确认 ${API_TARGET_LABEL} 当前可访问；也可以先使用演示模式查看页面`
        : undefined

    throw new RequestError(
      wrapped?.msg || gatewayMessage || responseText || response.statusText || '请求失败',
      response.status,
    )
  }

  if (wrapped && typeof wrapped.code === 'number') {
    if (wrapped.code !== 1 && wrapped.code !== 200) {
      throw new RequestError(wrapped.msg || '请求失败', wrapped.code)
    }

    return wrapped.data as T
  }

  if (payload !== null) {
    return payload as T
  }

  return responseText as T
}

export default request
