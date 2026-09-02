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

/**
 * How the domain is connected (decisión #9). Only 'CNAME' (Cloudflare for
 * SaaS Standard: www.<apex> → shops.earnlumens.org) is available today;
 * 'APEX_PROXY' is reserved for Enterprise Apex Proxying and rejected by the
 * backend until then.
 */
export type CustomDomainConnection = 'CNAME' | 'APEX_PROXY'

export interface DnsRecord {
  type: 'CNAME' | 'TXT'
  /** Fully-qualified record name (www.yourbrand.com). */
  name: string
  /** Panel-relative name: 'www', '@' (apex) or '_cf-custom-hostname.www'. */
  host: string
  value: string
  /** 'routing' (the CNAME to shops.earnlumens.org) or 'verification' (TXT). */
  purpose: string
}

/**
 * Redirect the OWNER sets up at their own domain provider (apex → www).
 * Not an EarnLumens feature — distinct from `redirectEnabled`, which is the
 * optional {sub}.earnlumens.org → custom domain canonical redirect.
 */
export interface ApexRedirect {
  from: string
  to: string
}

export interface CustomDomainView {
  /** Served hostname (a bare apex is provisioned as www.<apex>). */
  domain: string
  status: CustomDomainStatus
  connection: CustomDomainConnection
  apexDomain: string
  apexRedirect: ApexRedirect | null
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

/** Registers a domain. `connection` is optional (backend default CNAME). */
export function registerCustomDomain (
  tenantId: string,
  domain: string,
  connection?: CustomDomainConnection,
): Promise<CustomDomainView> {
  return request(base(tenantId), {
    method: 'POST',
    body: JSON.stringify(connection ? { domain, connection } : { domain }),
  })
}

/**
 * Multi-label public suffixes the backend also knows (CustomDomainService),
 * so the live preview matches what will actually be provisioned.
 */
const MULTI_LABEL_PUBLIC_SUFFIXES = new Set([
  'co.uk', 'org.uk', 'me.uk', 'ac.uk', 'com.au', 'net.au', 'org.au',
  'com.br', 'com.mx', 'com.ar', 'com.co', 'com.pe', 'com.ve', 'com.ec',
  'com.uy', 'com.py', 'com.bo', 'com.do', 'com.gt', 'com.sv', 'com.hn',
  'com.ni', 'com.pa', 'com.pr', 'com.es', 'co.jp', 'co.nz', 'co.za',
  'co.in', 'co.kr', 'com.tr', 'com.sg', 'com.hk', 'com.tw', 'com.cn',
  'com.ph', 'com.my', 'com.ng', 'com.eg', 'com.sa', 'com.pl', 'com.pt',
])

/**
 * Client-side preview of the hostname the backend will provision for a CNAME
 * connection: a bare apex (yourbrand.com, tienda.com.ar) becomes
 * www.<apex>; anything else is kept. Mirrors CustomDomainService.servedHostname.
 */
export function previewServedHostname (raw: string): string | null {
  const domain = raw.trim().toLowerCase().replace(/\.$/, '')
  if (!domain || domain.includes('/') || domain.includes(':') || domain.includes('*')) {
    return null
  }
  const labels = domain.split('.')
  if (labels.length < 2 || labels.some(l => l.length === 0)) {
    return null
  }
  const lastTwo = labels.slice(-2).join('.')
  const isApex = labels.length === 2
    || (labels.length === 3 && MULTI_LABEL_PUBLIC_SUFFIXES.has(lastTwo))
  return isApex ? `www.${domain}` : domain
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
