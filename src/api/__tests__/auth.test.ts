import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSession, logout } from '@/api/auth'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

// Mock env module to avoid window.location issues
vi.mock('@/config/env', () => ({
  API_BASE_URL: 'http://localhost:8082',
}))

describe('auth API', () => {
  beforeEach(() => {
    fetchMock.mockReset()
  })

  describe('createSession', () => {
    it('sends UUID header and returns accessToken', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ accessToken: 'test-access-token' }),
      })

      const result = await createSession('550e8400-e29b-41d4-a716-446655440000')

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8082/api/auth/session',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          headers: { UUID: '550e8400-e29b-41d4-a716-446655440000', 'X-Requested-With': 'XMLHttpRequest' },
        }),
      )
      expect(result.accessToken).toBe('test-access-token')
    })

    it('throws on non-ok response', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Invalid UUID' }),
      })

      await expect(createSession('bad-uuid')).rejects.toThrow('Invalid UUID')
    })

    it('throws generic message when error body is not JSON', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        json: () => Promise.reject(new Error('not json')),
      })

      await expect(createSession('bad-uuid')).rejects.toThrow('Session creation failed')
    })
  })

  describe('logout', () => {
    it('sends POST with credentials', async () => {
      fetchMock.mockResolvedValue({ ok: true })

      await logout()

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8082/api/auth/logout',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          headers: { 'X-Requested-With': 'XMLHttpRequest' },
        }),
      )
    })
  })
})
