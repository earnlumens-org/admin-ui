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

// =====================================================================
//  Types — mirror admin-api FranchiseConfigResponse / FranchiseResponse /
//  FranchiseBanResponse shapes. Commission percentages are BigDecimal on
//  the server and arrive as JSON numbers.
// =====================================================================

export type FranchiseStatus = 'ACTIVE' | 'DISABLED'

/**
 * Franchise governance config for a franchisor tenant, plus a live count of
 * active franchises so the UI can explain why the model can be paused but
 * never fully torn down once franchises exist.
 */
export interface FranchiseConfigResponse {
  tenantId: string
  franchisesEnabled: boolean
  franchisesPaused: boolean
  /** Percent of the tenant's own profit shared with each franchise. */
  defaultFranchiseCommissionPercent: number | null
  activeFranchiseCount: number
  maxCommissionPercent: number
}

export interface FranchiseResponse {
  id: string
  /** Franchisor subdomain that owns the franchise. */
  tenantId: string
  slug: string
  ownerUsername: string | null
  ownerDisplayName: string | null
  /** Frozen at creation — the commission this franchise actually earns. */
  commissionPercent: number
  payoutWallet: string
  title: string | null
  description: string | null
  logoR2Key: string | null
  coverR2Key: string | null
  accentColor: string | null
  status: FranchiseStatus
  disabledReason: string | null
  acceptedTermsAt: string | null
  createdAt: string
}

export interface FranchiseBanResponse {
  userId: string
  reason: string
  bannedBy: string
  bannedAt: string
}

export class FranchiseApiError extends Error {
  readonly code: string
  readonly status: number

  constructor (code: string, status: number, message?: string) {
    super(message ?? code)
    this.code = code
    this.status = status
  }
}

async function parseError (res: Response): Promise<FranchiseApiError> {
  let code = 'unknown_error'
  try {
    const body = await res.json()
    if (body && typeof body.error === 'string') {
      code = body.error
    }
  } catch {
    // non-JSON body
  }
  return new FranchiseApiError(code, res.status)
}

// =====================================================================
//  Governance (franchisor / "alfa"). Every endpoint is tenant-scoped and
//  the server re-checks ownership against the database on every call, so a
//  transferred or revoked owner loses access immediately.
// =====================================================================

const root = `${API_BASE_URL}/api/franchises`
const tid = (tenantId: string) => encodeURIComponent(tenantId)

export async function getFranchiseConfig (tenantId: string): Promise<FranchiseConfigResponse> {
  const res = await fetch(`${root}/config/${tid(tenantId)}`, {
    credentials: 'include',
    headers: await authHeaders(),
  })
  if (!res.ok) throw await parseError(res)
  return res.json()
}

export async function enableFranchises (
  tenantId: string,
  defaultCommissionPercent: string,
): Promise<FranchiseConfigResponse> {
  const res = await fetch(`${root}/config/${tid(tenantId)}/enable`, {
    method: 'POST',
    credentials: 'include',
    headers: await authHeaders(),
    body: JSON.stringify({ defaultCommissionPercent }),
  })
  if (!res.ok) throw await parseError(res)
  return res.json()
}

export interface UpdateFranchiseConfigPayload {
  /** Decimal string; applies to FUTURE franchises only. Omit to leave. */
  defaultCommissionPercent?: string
  /** Pause / unpause NEW franchise creation. Omit to leave. */
  paused?: boolean
}

export async function updateFranchiseConfig (
  tenantId: string,
  payload: UpdateFranchiseConfigPayload,
): Promise<FranchiseConfigResponse> {
  const res = await fetch(`${root}/config/${tid(tenantId)}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw await parseError(res)
  return res.json()
}

export async function listFranchises (tenantId: string): Promise<FranchiseResponse[]> {
  const res = await fetch(`${root}/tenant/${tid(tenantId)}`, {
    credentials: 'include',
    headers: await authHeaders(),
  })
  if (!res.ok) throw await parseError(res)
  return res.json()
}

/** Franchisor takedown — DISABLED hides the storefront and blocks new sales; history is never deleted. */
export async function disableFranchise (
  tenantId: string,
  franchiseId: string,
  reason: string,
): Promise<FranchiseResponse> {
  const res = await fetch(`${root}/tenant/${tid(tenantId)}/${encodeURIComponent(franchiseId)}/disable`, {
    method: 'POST',
    credentials: 'include',
    headers: await authHeaders(),
    body: JSON.stringify({ reason }),
  })
  if (!res.ok) throw await parseError(res)
  return res.json()
}

export async function listFranchiseBans (tenantId: string): Promise<FranchiseBanResponse[]> {
  const res = await fetch(`${root}/tenant/${tid(tenantId)}/bans`, {
    credentials: 'include',
    headers: await authHeaders(),
  })
  if (!res.ok) throw await parseError(res)
  return res.json()
}

export async function banFranchiseUser (
  tenantId: string,
  userId: string,
  reason: string,
): Promise<FranchiseBanResponse> {
  const res = await fetch(`${root}/tenant/${tid(tenantId)}/bans`, {
    method: 'POST',
    credentials: 'include',
    headers: await authHeaders(),
    body: JSON.stringify({ userId, reason }),
  })
  if (!res.ok) throw await parseError(res)
  return res.json()
}

export async function unbanFranchiseUser (tenantId: string, userId: string): Promise<void> {
  const res = await fetch(`${root}/tenant/${tid(tenantId)}/bans/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: await authHeaders(),
  })
  if (!res.ok) throw await parseError(res)
}
