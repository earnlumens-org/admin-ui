import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createMyTenant,
  getMyTenant,
  listAllTenants,
  requestAdditionalTenant,
  TenantApiError,
} from '@/api/tenants'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

vi.mock('@/config/env', () => ({
  API_BASE_URL: 'http://localhost:8082',
}))

vi.mock('@/services/tokenWorkerClient', () => ({
  getToken: vi.fn().mockResolvedValue({ accessToken: 'test-token' }),
}))

describe('tenants API', () => {
  beforeEach(() => {
    fetchMock.mockReset()
  })

  describe('getMyTenant', () => {
    it('returns the tenant on 200', async () => {
      const tenant = { id: 't1', subdomain: 'alice', title: 'Alice Store' }
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(tenant),
      })
      await expect(getMyTenant()).resolves.toEqual(tenant)
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8082/api/tenants/me',
        expect.objectContaining({ credentials: 'include' }),
      )
    })

    it('returns null on 404', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'no_tenant' }),
      })
      await expect(getMyTenant()).resolves.toBeNull()
    })

    it('throws TenantApiError on other non-2xx responses with the server code', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'unknown_error' }),
      })
      await expect(getMyTenant()).rejects.toBeInstanceOf(TenantApiError)
    })
  })

  describe('createMyTenant', () => {
    const payload = {
      title: 'Alice Store',
      tenantWallet: 'G' + 'A'.repeat(55),
      tenantFeePercent: '5.00',
      subdomain: 'alice',
      confirmIrreversible: true,
    }

    it('POSTs with bearer token and JSON body', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ id: 't1', subdomain: 'alice' }),
      })
      const result = await createMyTenant(payload)
      expect(result.id).toBe('t1')
      const call = fetchMock.mock.calls[0]
      expect(call[0]).toBe('http://localhost:8082/api/tenants/me')
      expect(call[1].method).toBe('POST')
      expect(call[1].body).toBe(JSON.stringify(payload))
      expect(call[1].headers.Authorization).toBe('Bearer test-token')
    })

    it('surfaces server error code for subdomain_taken', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 409,
        json: () => Promise.resolve({ error: 'subdomain_taken' }),
      })
      await expect(createMyTenant(payload)).rejects.toMatchObject({
        code: 'subdomain_taken',
        status: 409,
      })
    })

    it('falls back to unknown_error when body is not JSON', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('not json')),
      })
      await expect(createMyTenant(payload)).rejects.toMatchObject({
        code: 'unknown_error',
        status: 500,
      })
    })
  })

  describe('requestAdditionalTenant', () => {
    it('throws additional_not_available (503 is the documented server response)', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 503,
        json: () => Promise.resolve({ error: 'additional_not_available' }),
      })
      await expect(requestAdditionalTenant()).rejects.toMatchObject({
        code: 'additional_not_available',
      })
    })
  })

  describe('listAllTenants', () => {
    it('returns array on 200', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve([{ id: 't1' }, { id: 't2' }]),
      })
      const all = await listAllTenants()
      expect(all).toHaveLength(2)
    })
  })
})
