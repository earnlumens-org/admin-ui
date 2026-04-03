import { defineStore } from 'pinia'
import { ref } from 'vue'
import { logout as logoutApi } from '@/api/auth'
import { clearToken, broadcastLogout } from '@/services/tokenWorkerClient'

export interface AdminUser {
  oauthUserId: string
  username: string
  displayName: string
  profileImageUrl: string
  role: string
}

/**
 * Parse JWT claims from token string.
 * Used ONLY to extract user profile — token is NOT stored in main thread.
 */
export function parseUserFromToken(token: string): AdminUser | null {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    )
    const claims = JSON.parse(jsonPayload)
    return {
      oauthUserId: claims.sub,
      username: claims.username,
      displayName: claims.name,
      profileImageUrl: claims.profile_image_url,
      role: claims.role,
    }
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated = ref(false)
  const isAuthReady = ref(false)
  const user = ref<AdminUser | null>(null)
  const error = ref<string | null>(null)

  function setUser(profile: AdminUser | null) {
    user.value = profile
    isAuthenticated.value = !!profile
    error.value = null
  }

  function setAuthenticated(value: boolean) {
    isAuthenticated.value = value
  }

  function setAuthReady(ready: boolean) {
    isAuthReady.value = ready
  }

  function clearAuth() {
    user.value = null
    isAuthenticated.value = false
  }

  function setError(msg: string) {
    error.value = msg
  }

  async function logout(): Promise<void> {
    try {
      await logoutApi()
    } finally {
      await clearToken()
      broadcastLogout()
      clearAuth()
    }
  }

  return {
    isAuthenticated,
    isAuthReady,
    user,
    error,
    setUser,
    setAuthenticated,
    setAuthReady,
    clearAuth,
    setError,
    logout,
  }
})
