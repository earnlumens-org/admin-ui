/**
 * Custom domain API (custom-domain-upgrade Fase 2D).
 *
 * Owner self-service against admin-api (owner-scoped, Pro-gated):
 *   POST   /api/tenants/me/{tenantId}/custom-domain           — register
 *   GET    /api/tenants/me/{tenantId}/custom-domain           — state + DNS records (auto-syncs while pending)
 *   POST   /api/tenants/me/{tenantId}/custom-domain/verify    — forced re-check
 *   DELETE /api/tenants/me/{tenantId}/custom-domain           — remove
 *   PATCH  /api/tenants/me/{tenantId}/custom-domain/redirect  — 301 toggle
 */
import { API_BASE_URL } from '@/config/env'
import { getToken } from '@/services/tokenWorkerClient'

export type CustomDomainStatus
  = | 'NONE' | 'PENDING_DNS' | 'PENDING_SSL' | 'ACTIVE' | 'SUSPENDED' | 'FAILED'

export interface DnsRecord {
  type: 'CNAME' | 'TXT'
  name: string
  value: string
  /** 'routing' (the CNAME to shops.earnlumens.org) or 'verification' (TXT). */
  purpose: string
}

export interface CustomDomainView {
  domain: string
  status: CustomDomainStatus
  redirectEnabled: boolean
  createdAt: string | null
  activatedAt: string | null
  suspendedAt: string | null
  dnsRecords: DnsRecord[]
}

export class CustomDomainApiError extends Error {
  readonly code: string
  readonly status: number
  constructor (code: string, status: number) {
    super(code)
    this.code = code
    this.status = status
  }
}

async function authHeaders (): Promise<Record<string, string>> {
  const result = await getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  }
  if (result.accessToken) {
    headers.Authorization = `Bearer ${result.accessToken}`
  }
  return headers
}

async function request<T> (path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    ...init,
    headers: { ...(await authHeaders()), ...init?.headers },
  })
  if (!res.ok) {
    let code = 'unknown_error'
    try {
      const body = await res.json()
      if (body && typeof body.error === 'string') {
        code = body.error
      }
    } catch { /* non-JSON body */ }
    throw new CustomDomainApiError(code, res.status)
  }
  return res.json() as Promise<T>
}

function base (tenantId: string): string {
  return `/api/tenants/me/${encodeURIComponent(tenantId)}/custom-domain`
}

export function registerCustomDomain (tenantId: string, domain: string): Promise<CustomDomainView> {
  return request(base(tenantId), {
    method: 'POST',
    body: JSON.stringify({ domain }),
  })
}

export function getCustomDomain (tenantId: string): Promise<CustomDomainView> {
  return request(base(tenantId))
}

export function verifyCustomDomain (tenantId: string): Promise<CustomDomainView> {
  return request(`${base(tenantId)}/verify`, { method: 'POST' })
}

export function deleteCustomDomain (tenantId: string): Promise<void> {
  return request(base(tenantId), { method: 'DELETE' })
}

export function setCustomDomainRedirect (tenantId: string, enabled: boolean): Promise<CustomDomainView> {
  return request(`${base(tenantId)}/redirect`, {
    method: 'PATCH',
    body: JSON.stringify({ enabled }),
  })
}
