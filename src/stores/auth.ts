import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { LoginResult } from '../types/api'

const TOKEN_KEY = 'wurenji-token'
const PROFILE_KEY = 'wurenji-profile'

function readProfile() {
  const raw = localStorage.getItem(PROFILE_KEY)

  if (!raw) return null

  try {
    return JSON.parse(raw) as LoginResult
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem(TOKEN_KEY) ?? '')
  const profile = ref<LoginResult | null>(readProfile())

  const isLoggedIn = computed(() => Boolean(token.value))

  function setSession(result: LoginResult) {
    token.value = result.token
    profile.value = result
    localStorage.setItem(TOKEN_KEY, result.token)
    localStorage.setItem(PROFILE_KEY, JSON.stringify(result))
  }

  function setDemoSession(username: string) {
    setSession({
      token: `demo-${Date.now()}`,
      userId: 0,
      roleId: 0,
      realName: username || '演示用户',
    })
  }

  function clearSession() {
    token.value = ''
    profile.value = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(PROFILE_KEY)
  }

  return {
    token,
    profile,
    isLoggedIn,
    setSession,
    setDemoSession,
    clearSession,
  }
})