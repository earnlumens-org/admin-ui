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

export interface ModeratorDto {
  id: string
  tenantId: string
  username: string
  oauthUserId: string | null
  displayName: string | null
  profileImageUrl: string | null
  status: string // PENDING | ACTIVE | REVOKED
  invitedBy: string
  createdAt: string
  acceptedAt: string | null
  // Opt-in extra capabilities granted on top of the baseline moderator
  // role. All default to false on every new invitation; the tenant
  // owner enables them explicitly via the permissions dialog.
  canManualPermaBan: boolean
  canClearStrikes: boolean
  canVerifyCreators: boolean
  canManageAmbassadors: boolean
  canViewTenantAudit: boolean
}

/**
 * Body shape for the PATCH .../permissions endpoints. Server treats
 * missing keys as false, so a partial body always reduces (never
 * elevates) capabilities.
 */
export interface ModeratorPermissionsPayload {
  canManualPermaBan: boolean
  canClearStrikes: boolean
  canVerifyCreators: boolean
  canManageAmbassadors: boolean
  canViewTenantAudit: boolean
}

export async function fetchModerators (): Promise<ModeratorDto[]> {
  const res = await fetch(`${API_BASE_URL}/api/moderators`, {
    credentials: 'include',
    headers: await authHeaders(),
  })
  if (!res.ok) {
    throw new Error('Failed to fetch moderators')
  }
  return res.json()
}

export async function inviteModerator (tenantId: string, username: string): Promise<ModeratorDto> {
  const res = await fetch(`${API_BASE_URL}/api/moderators`, {
    method: 'POST',
    credentials: 'include',
    headers: await authHeaders(),
    body: JSON.stringify({ tenantId, username }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || 'Failed to invite moderator')
  }
  return res.json()
}

export async function revokeModerator (id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/moderators/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: await authHeaders(),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || 'Failed to revoke moderator')
  }
}

// =====================================================================
//  Owner-scoped endpoints (TENANT_ADMIN). Server re-verifies tenant
//  ownership against the database on every call, and revokeForTenant
//  also asserts that the moderator record belongs to this tenant — so
//  knowing a moderator id never lets the owner of tenant A touch a
//  moderator of tenant B.
// =====================================================================

export async function fetchMyTenantModerators (tenantId: string): Promise<ModeratorDto[]> {
  const res = await fetch(
    `${API_BASE_URL}/api/tenants/me/${encodeURIComponent(tenantId)}/moderators`,
    {
      credentials: 'include',
      headers: await authHeaders(),
    },
  )
  if (!res.ok) {
    throw new Error('Failed to fetch moderators')
  }
  return res.json()
}

export async function inviteMyTenantModerator (
  tenantId: string,
  username: string,
): Promise<ModeratorDto> {
  const res = await fetch(
    `${API_BASE_URL}/api/tenants/me/${encodeURIComponent(tenantId)}/moderators`,
    {
      method: 'POST',
      credentials: 'include',
      headers: await authHeaders(),
      body: JSON.stringify({ username }),
    },
  )
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || 'Failed to invite moderator')
  }
  return res.json()
}

export async function revokeMyTenantModerator (
  tenantId: string,
  moderatorId: string,
): Promise<void> {
  const res = await fetch(
    `${API_BASE_URL}/api/tenants/me/${encodeURIComponent(tenantId)}/moderators/${encodeURIComponent(moderatorId)}`,
    {
      method: 'DELETE',
      credentials: 'include',
      headers: await authHeaders(),
    },
  )
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || 'Failed to revoke moderator')
  }
}

/**
 * Owner-scoped permission update. Replaces the four flags wholesale;
 * the server treats missing keys as false.
 */
export async function updateMyTenantModeratorPermissions (
  tenantId: string,
  moderatorId: string,
  perms: ModeratorPermissionsPayload,
): Promise<ModeratorDto> {
  const res = await fetch(
    `${API_BASE_URL}/api/tenants/me/${encodeURIComponent(tenantId)}/moderators/${encodeURIComponent(moderatorId)}/permissions`,
    {
      method: 'PATCH',
      credentials: 'include',
      headers: await authHeaders(),
      body: JSON.stringify(perms),
    },
  )
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || 'Failed to update permissions')
  }
  return res.json()
}

/** SUPERADMIN-scoped permission update; same body shape. */
export async function updateModeratorPermissions (
  moderatorId: string,
  perms: ModeratorPermissionsPayload,
): Promise<ModeratorDto> {
  const res = await fetch(
    `${API_BASE_URL}/api/moderators/${encodeURIComponent(moderatorId)}/permissions`,
    {
      method: 'PATCH',
      credentials: 'include',
      headers: await authHeaders(),
      body: JSON.stringify(perms),
    },
  )
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || 'Failed to update permissions')
  }
  return res.json()
}
