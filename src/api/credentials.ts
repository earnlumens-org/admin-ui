import { API_BASE_URL } from '@/config/env'
import { getToken } from '@/services/tokenWorkerClient'

/**
 * Admin Credentials API client. Tenant-scoped: every endpoint requires the
 * caller to be SUPERADMIN or admin of {@code tenantId} (re-checked on the
 * server against the tenant document on every call).
 *
 * @see admin-api/src/main/java/org/earnlumens/admin/credential/CredentialController.java
 */

export type CredentialBadgeType = 'U1' | 'U2' | 'U3'
export type CredentialStatus = 'ACTIVE' | 'EXPIRED'

export interface CredentialHolder {
  assignmentId: string
  tenantId: string
  oauthUserId: string
  username: string | null
  displayName: string | null
  profileImageUrl: string | null
  badgeType: CredentialBadgeType
  status: CredentialStatus
  /** "ADMIN" | "PROMOTION" | "SUBSCRIPTION" | "SYSTEM" */
  assignedBy: string | null
  /** Username of the admin who granted the badge (null for self-claim / system). */
  assignedByUsername: string | null
  /** ISO-8601 instant. */
  startedAt: string | null
  /** ISO-8601 instant; null when the badge does not expire (Gold today). */
  expiresAt: string | null
}

export interface GrantGoldPayload {
  /** X / Twitter handle. Leading '@' is allowed and stripped server-side. */
  username?: string
  /** Canonical OAuth provider id (preferred when known). */
  oauthUserId?: string
}

export class CredentialApiError extends Error {
  readonly code: string
  readonly status: number

  constructor (code: string, status: number, message?: string) {
    super(message ?? code)
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

async function parseError (res: Response): Promise<CredentialApiError> {
  let code = 'unknown_error'
  try {
    const body = await res.json()
    if (body && typeof body.error === 'string') code = body.error
  } catch {
    // non-JSON body
  }
  return new CredentialApiError(code, res.status)
}

export async function listHolders (
  tenantId: string,
  badgeType: CredentialBadgeType,
  options: { search?: string, limit?: number } = {},
): Promise<CredentialHolder[]> {
  const url = new URL(
    `${API_BASE_URL}/api/credentials/${encodeURIComponent(tenantId)}/holders`,
  )
  url.searchParams.set('badgeType', badgeType)
  if (options.search) url.searchParams.set('q', options.search)
  if (options.limit) url.searchParams.set('limit', String(options.limit))

  const res = await fetch(url.toString(), {
    credentials: 'include',
    headers: await authHeaders(),
  })
  if (!res.ok) throw await parseError(res)
  return res.json()
}

export async function grantGold (
  tenantId: string,
  payload: GrantGoldPayload,
): Promise<CredentialHolder> {
  const res = await fetch(
    `${API_BASE_URL}/api/credentials/${encodeURIComponent(tenantId)}/gold`,
    {
      method: 'POST',
      credentials: 'include',
      headers: await authHeaders(),
      body: JSON.stringify(payload),
    },
  )
  if (!res.ok) throw await parseError(res)
  return res.json()
}

export async function revokeGold (
  tenantId: string,
  assignmentId: string,
): Promise<void> {
  const res = await fetch(
    `${API_BASE_URL}/api/credentials/${encodeURIComponent(tenantId)}/gold/${encodeURIComponent(assignmentId)}`,
    {
      method: 'DELETE',
      credentials: 'include',
      headers: await authHeaders(),
    },
  )
  if (!res.ok && res.status !== 204) throw await parseError(res)
}

/**
 * Grant the global Ambassador (gray, U3) credential. Main-tenant-only:
 * the server rejects any tenantId other than "earnlumens" with
 * MAIN_TENANT_ONLY. The badge applies on every tenant immediately.
 */
export async function grantAmbassador (
  tenantId: string,
  payload: GrantGoldPayload,
): Promise<CredentialHolder> {
  const res = await fetch(
    `${API_BASE_URL}/api/credentials/${encodeURIComponent(tenantId)}/ambassador`,
    {
      method: 'POST',
      credentials: 'include',
      headers: await authHeaders(),
      body: JSON.stringify(payload),
    },
  )
  if (!res.ok) throw await parseError(res)
  return res.json()
}

/** Revoke an Ambassador assignment. Main-tenant-only (see grantAmbassador). */
export async function revokeAmbassador (
  tenantId: string,
  assignmentId: string,
): Promise<void> {
  const res = await fetch(
    `${API_BASE_URL}/api/credentials/${encodeURIComponent(tenantId)}/ambassador/${encodeURIComponent(assignmentId)}`,
    {
      method: 'DELETE',
      credentials: 'include',
      headers: await authHeaders(),
    },
  )
  if (!res.ok && res.status !== 204) throw await parseError(res)
}
