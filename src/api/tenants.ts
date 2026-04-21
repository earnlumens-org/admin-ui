import { API_BASE_URL } from '@/config/env'
import { getToken } from '@/services/tokenWorkerClient'

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

/** Mirrors admin-api's TenantStatus enum. */
export type TenantStatus = 'ACTIVE' | 'BLOCKED'

/** Mirrors admin-api's TenantSummaryResponse record (see TenantController). */
export interface TenantSummary {
  id: string
  subdomain: string
  title: string
  description: string | null
  logoR2Key: string | null
  ownerUsername: string
  ownerDisplayName: string
  platformFeePercent: string
  tenantFeePercent: string
  status: TenantStatus
  createdAt: string
}

/** Payload for POST /api/tenants/me — matches admin-api's CreateTenantRequest. */
export interface CreateTenantPayload {
  title: string
  description?: string
  logoR2Key?: string
  tenantWallet: string
  tenantFeePercent: string // "0.00"–"30.00"
  subdomain: string
  confirmIrreversible: boolean
}

/**
 * Error class that preserves the machine-readable error code
 * returned by the server (see {@code TenantErrorCode}). The UI uses
 * {@link TenantApiError#code} to localise the message.
 */
export class TenantApiError extends Error {
  readonly code: string
  readonly status: number

  constructor (code: string, status: number, message?: string) {
    super(message ?? code)
    this.code = code
    this.status = status
  }
}

async function parseError (res: Response): Promise<TenantApiError> {
  let code = 'unknown_error'
  try {
    const body = await res.json()
    if (body && typeof body.error === 'string') {
      code = body.error
    }
  } catch {
    // non-JSON body — keep 'unknown_error'
  }
  return new TenantApiError(code, res.status)
}

/**
 * GET /api/tenants/me — returns the caller's tenant or null on 404.
 * Any non-2xx / non-404 status is surfaced as a {@link TenantApiError}.
 */
export async function getMyTenant (): Promise<TenantSummary | null> {
  const res = await fetch(`${API_BASE_URL}/api/tenants/me`, {
    credentials: 'include',
    headers: await authHeaders(),
  })
  if (res.status === 404) {
    return null
  }
  if (!res.ok) {
    throw await parseError(res)
  }
  return res.json()
}

export async function createMyTenant (payload: CreateTenantPayload): Promise<TenantSummary> {
  const res = await fetch(`${API_BASE_URL}/api/tenants/me`, {
    method: 'POST',
    credentials: 'include',
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw await parseError(res)
  }
  return res.json()
}

/**
 * POST /api/tenants/me/additional — always returns 503 today
 * (the "coming soon" paid flow). UI uses this to prove to the user that
 * the feature is intentionally gated, not broken.
 */
export async function requestAdditionalTenant (): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/tenants/me/additional`, {
    method: 'POST',
    credentials: 'include',
    headers: await authHeaders(),
  })
  if (!res.ok) {
    throw await parseError(res)
  }
}

/** GET /api/tenants/admin — super-admin only. */
export async function listAllTenants (): Promise<TenantSummary[]> {
  const res = await fetch(`${API_BASE_URL}/api/tenants/admin`, {
    credentials: 'include',
    headers: await authHeaders(),
  })
  if (!res.ok) {
    throw await parseError(res)
  }
  return res.json()
}
