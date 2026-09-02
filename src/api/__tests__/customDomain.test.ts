import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  previewServedHostname,
  registerCustomDomain,
} from '@/api/customDomain'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

vi.mock('@/config/env', () => ({
  API_BASE_URL: 'http://localhost:8082',
}))

vi.mock('@/services/tokenWorkerClient', () => ({
  getToken: vi.fn().mockResolvedValue({ accessToken: 'test-token' }),
}))

describe('customDomain API', () => {
  beforeEach(() => {
    fetchMock.mockReset()
  })

  describe('previewServedHostname (decisión #9: apex → www)', () => {
    it('turns a bare apex into www.<apex>', () => {
      expect(previewServedHostname('earnxlm.com')).toBe('www.earnxlm.com')
      expect(previewServedHostname('  EarnXLM.com. ')).toBe('www.earnxlm.com')
    })

    it('treats known multi-label public suffixes as apex', () => {
      expect(previewServedHostname('tienda.com.ar')).toBe('www.tienda.com.ar')
      expect(previewServedHostname('brand.co.uk')).toBe('www.brand.co.uk')
    })

    it('keeps explicit hostnames as typed', () => {
      expect(previewServedHostname('www.earnxlm.com')).toBe('www.earnxlm.com')
      expect(previewServedHostname('shop.earnxlm.com')).toBe('shop.earnxlm.com')
      expect(previewServedHostname('shop.tienda.com.ar')).toBe('shop.tienda.com.ar')
    })

    it('returns null for things that are not a domain yet', () => {
      expect(previewServedHostname('')).toBeNull()
      expect(previewServedHostname('nodots')).toBeNull()
      expect(previewServedHostname('https://x.com/p')).toBeNull()
      expect(previewServedHostname('a..com')).toBeNull()
    })
  })

  describe('registerCustomDomain', () => {
    it('sends only the domain by default (backend defaults to CNAME)', async () => {
      fetchMock.mockResolvedValue({ ok: true, json: async () => ({ domain: 'www.earnxlm.com' }) })

      await registerCustomDomain('t1', 'earnxlm.com')

      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe('http://localhost:8082/api/tenants/me/t1/custom-domain')
      expect(init.method).toBe('POST')
      expect(JSON.parse(init.body)).toEqual({ domain: 'earnxlm.com' })
    })

    it('includes the connection when given', async () => {
      fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) })

      await registerCustomDomain('t1', 'earnxlm.com', 'CNAME')

      expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ domain: 'earnxlm.com', connection: 'CNAME' })
    })

    it('surfaces the backend error code (e.g. APEX_PROXY not yet available)', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: 'domain_connection_unsupported' }),
      })

      await expect(registerCustomDomain('t1', 'earnxlm.com', 'APEX_PROXY'))
        .rejects
        .toMatchObject({ code: 'domain_connection_unsupported', status: 400 })
    })
  })
})
