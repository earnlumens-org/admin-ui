import { defineStore } from 'pinia'
import { ref } from 'vue'
import { logout as logoutApi } from '@/api/auth'
import { broadcastLogout, clearToken } from '@/services/tokenWorkerClient'

export interface AdminUser {
  oauthUserId: string
  username: string
  displayName: string
  profileImageUrl: string
  role: string
  /** Legacy single-tenant claim — kept for backward compatibility. */
  tenantId?: string
  /** Tenants where the caller is the owner / tenant admin. */
  tenantAdminOf?: string[]
  /** Tenants where the caller is a moderator. */
  moderatorOf?: string[]
}

/**
 * Parse JWT claims from token string.
 * Used ONLY to extract user profile — token is NOT stored in main thread.
 */
export function parseUserFromToken (token: string): AdminUser | null {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.codePointAt(0)!.toString(16)).slice(-2))
        .join(''),
    )
    const claims = JSON.parse(jsonPayload)
    return {
      oauthUserId: claims.sub,
      username: claims.username,
      displayName: claims.name,
      profileImageUrl: claims.profile_image_url,
      role: claims.role,
      tenantId: claims.tenantId,
      tenantAdminOf: Array.isArray(claims.tenantAdminOf) ? claims.tenantAdminOf : [],
      moderatorOf: Array.isArray(claims.moderatorOf) ? claims.moderatorOf : [],
    }
  } catch {
    return null
  }
}

const ACTIVE_TENANT_STORAGE_KEY = 'earnlumens.activeTenantId'

/** All tenants the user may switch between (owner + moderator sets, de-duped). */
export function allUserTenants (user: AdminUser | null): string[] {
  if (!user) {
    return []
  }
  const set = new Set<string>()
  if (user.tenantAdminOf) {
    for (const id of user.tenantAdminOf) {
      set.add(id)
    }
  }
  if (user.moderatorOf) {
    for (const id of user.moderatorOf) {
      set.add(id)
    }
  }
  if (user.tenantId) {
    set.add(user.tenantId)
  }
  return Array.from(set)
}

export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated = ref(false)
  const isAuthReady = ref(false)
  const user = ref<AdminUser | null>(null)
  const error = ref<string | null>(null)
  const activeTenantId = ref<string | null>(null)

  function hydrateActiveTenant (profile: AdminUser | null) {
    if (!profile) {
      activeTenantId.value = null
      return
    }
    const available = allUserTenants(profile)
    let saved: string | null = null
    try {
      saved = sessionStorage.getItem(ACTIVE_TENANT_STORAGE_KEY)
    } catch {
      saved = null
    }
    activeTenantId.value = saved && available.includes(saved) ? saved : available[0] ?? null
  }

  function setUser (profile: AdminUser | null) {
    user.value = profile
    isAuthenticated.value = !!profile
    error.value = null
    hydrateActiveTenant(profile)
  }

  function setAuthenticated (value: boolean) {
    isAuthenticated.value = value
  }

  function setAuthReady (ready: boolean) {
    isAuthReady.value = ready
  }

  function clearAuth () {
    user.value = null
    isAuthenticated.value = false
    activeTenantId.value = null
    try {
      sessionStorage.removeItem(ACTIVE_TENANT_STORAGE_KEY)
    } catch {
      // ignore — sessionStorage may be unavailable (e.g. in tests)
    }
  }

  function setError (msg: string) {
    error.value = msg
  }

  /**
   * Switch the active tenant for this session. Ignored if the tenantId is not
   * present in the JWT arrays (defence-in-depth against UI bugs).
   */
  function setActiveTenant (tenantId: string): boolean {
    const available = allUserTenants(user.value)
    if (!available.includes(tenantId)) {
      return false
    }
    activeTenantId.value = tenantId
    try {
      sessionStorage.setItem(ACTIVE_TENANT_STORAGE_KEY, tenantId)
    } catch {
      // ignore — storage is only a convenience
    }
    return true
  }

  async function logout (): Promise<void> {
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
    activeTenantId,
    setUser,
    setAuthenticated,
    setAuthReady,
    clearAuth,
    setError,
    setActiveTenant,
    logout,
  }
})
