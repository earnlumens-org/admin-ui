import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { logout as logoutApi } from '@/api/auth'
import { broadcastLogout, clearToken } from '@/services/tokenWorkerClient'
import { allUserTenants, parseUserFromToken, useAuthStore } from '@/stores/auth'

// Mock the auth API module
vi.mock('@/api/auth', () => ({
  logout: vi.fn(),
}))

// Mock the token worker client
vi.mock('@/services/tokenWorkerClient', () => ({
  clearToken: vi.fn().mockResolvedValue(undefined),
  broadcastLogout: vi.fn(),
}))

// Build a minimal JWT for testing (header.payload.signature)
function buildTestJwt (claims: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = btoa(JSON.stringify(claims))
  return `${header}.${payload}.fake-signature`
}

describe('auth store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(logoutApi).mockReset()
    vi.mocked(clearToken).mockReset().mockResolvedValue(undefined)
    vi.mocked(broadcastLogout).mockReset()
  })

  describe('initial state', () => {
    it('starts unauthenticated and not ready', () => {
      const store = useAuthStore()

      expect(store.isAuthenticated).toBe(false)
      expect(store.isAuthReady).toBe(false)
      expect(store.user).toBeNull()
      expect(store.error).toBeNull()
    })
  })

  describe('parseUserFromToken', () => {
    it('parses JWT claims into AdminUser', () => {
      const token = buildTestJwt({
        sub: '174038477097291776',
        username: 'earnlumens',
        name: 'Earnlumens',
        profile_image_url: 'https://example.com/img.jpg',
        role: 'SUPERADMIN',
      })

      const user = parseUserFromToken(token)

      expect(user).toMatchObject({
        oauthUserId: '174038477097291776',
        username: 'earnlumens',
        displayName: 'Earnlumens',
        profileImageUrl: 'https://example.com/img.jpg',
        role: 'SUPERADMIN',
      })
      expect(user?.tenantAdminOf).toEqual([])
      expect(user?.moderatorOf).toEqual([])
    })

    it('returns null on invalid token', () => {
      expect(parseUserFromToken('invalid')).toBeNull()
    })
  })

  describe('setUser', () => {
    it('sets user and marks authenticated', () => {
      const store = useAuthStore()
      store.setUser({
        oauthUserId: '123',
        username: 'u',
        displayName: 'n',
        profileImageUrl: '',
        role: 'SUPERADMIN',
      })

      expect(store.isAuthenticated).toBe(true)
      expect(store.user?.username).toBe('u')
      expect(store.error).toBeNull()
    })

    it('clears previous error', () => {
      const store = useAuthStore()
      store.setError('previous error')

      store.setUser({
        oauthUserId: '123',
        username: 'u',
        displayName: 'n',
        profileImageUrl: '',
        role: 'SUPERADMIN',
      })

      expect(store.error).toBeNull()
    })
  })

  describe('clearAuth', () => {
    it('resets authentication state', () => {
      const store = useAuthStore()
      store.setUser({
        oauthUserId: '123',
        username: 'u',
        displayName: 'n',
        profileImageUrl: '',
        role: 'SUPERADMIN',
      })

      store.clearAuth()

      expect(store.isAuthenticated).toBe(false)
      expect(store.user).toBeNull()
    })
  })

  describe('setError', () => {
    it('sets error message', () => {
      const store = useAuthStore()
      store.setError('something went wrong')
      expect(store.error).toBe('something went wrong')
    })
  })

  describe('logout', () => {
    it('calls API, clears worker token, broadcasts, and clears state', async () => {
      vi.mocked(logoutApi).mockResolvedValue()
      const store = useAuthStore()
      store.setUser({
        oauthUserId: '123',
        username: 'u',
        displayName: 'n',
        profileImageUrl: '',
        role: 'SUPERADMIN',
      })

      await store.logout()

      expect(logoutApi).toHaveBeenCalled()
      expect(clearToken).toHaveBeenCalled()
      expect(broadcastLogout).toHaveBeenCalled()
      expect(store.isAuthenticated).toBe(false)
      expect(store.user).toBeNull()
    })

    it('clears state even if API call fails', async () => {
      vi.mocked(logoutApi).mockRejectedValue(new Error('network'))
      const store = useAuthStore()
      store.setUser({
        oauthUserId: '123',
        username: 'u',
        displayName: 'n',
        profileImageUrl: '',
        role: 'SUPERADMIN',
      })

      await expect(store.logout()).rejects.toThrow('network')

      expect(clearToken).toHaveBeenCalled()
      expect(store.isAuthenticated).toBe(false)
      expect(store.user).toBeNull()
    })
  })

  describe('multi-tenant JWT claims', () => {
    beforeEach(() => {
      sessionStorage.clear()
    })

    it('parseUserFromToken extracts tenantAdminOf and moderatorOf arrays', () => {
      const token = buildTestJwt({
        sub: 'oauth-1',
        username: 'alice',
        name: 'Alice',
        profile_image_url: '',
        role: 'TENANT_ADMIN',
        tenantAdminOf: ['alice', 'beta'],
        moderatorOf: ['gamma'],
      })
      const user = parseUserFromToken(token)!
      expect(user.tenantAdminOf).toEqual(['alice', 'beta'])
      expect(user.moderatorOf).toEqual(['gamma'])
    })

    it('allUserTenants dedupes admin + moderator + legacy tenantId', () => {
      const user = {
        oauthUserId: 'o1',
        username: 'u',
        displayName: 'u',
        profileImageUrl: '',
        role: 'TENANT_ADMIN',
        tenantId: 'alice',
        tenantAdminOf: ['alice', 'beta'],
        moderatorOf: ['beta', 'gamma'],
      }
      expect(allUserTenants(user).toSorted()).toEqual(['alice', 'beta', 'gamma'])
    })

    it('setUser picks the first available tenant as active by default', () => {
      const store = useAuthStore()
      store.setUser({
        oauthUserId: 'o1',
        username: 'u',
        displayName: 'u',
        profileImageUrl: '',
        role: 'TENANT_ADMIN',
        tenantAdminOf: ['alice', 'beta'],
        moderatorOf: [],
      })
      expect(store.activeTenantId).toBe('alice')
    })

    it('setUser rehydrates activeTenantId from sessionStorage', () => {
      sessionStorage.setItem('earnlumens.activeTenantId', 'beta')
      const store = useAuthStore()
      store.setUser({
        oauthUserId: 'o1',
        username: 'u',
        displayName: 'u',
        profileImageUrl: '',
        role: 'TENANT_ADMIN',
        tenantAdminOf: ['alice', 'beta'],
        moderatorOf: [],
      })
      expect(store.activeTenantId).toBe('beta')
    })

    it('setActiveTenant refuses unknown tenants', () => {
      const store = useAuthStore()
      store.setUser({
        oauthUserId: 'o1',
        username: 'u',
        displayName: 'u',
        profileImageUrl: '',
        role: 'TENANT_ADMIN',
        tenantAdminOf: ['alice'],
        moderatorOf: [],
      })
      expect(store.setActiveTenant('ghost')).toBe(false)
      expect(store.activeTenantId).toBe('alice')
      expect(store.setActiveTenant('alice')).toBe(true)
    })

    it('clearAuth wipes activeTenantId and sessionStorage', () => {
      const store = useAuthStore()
      store.setUser({
        oauthUserId: 'o1',
        username: 'u',
        displayName: 'u',
        profileImageUrl: '',
        role: 'TENANT_ADMIN',
        tenantAdminOf: ['alice'],
        moderatorOf: [],
      })
      store.clearAuth()
      expect(store.activeTenantId).toBeNull()
      expect(sessionStorage.getItem('earnlumens.activeTenantId')).toBeNull()
    })
  })
})
