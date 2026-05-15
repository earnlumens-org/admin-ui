/**
 * "What can I do here?" client.
 *
 * Mirrors the backend at {@code GET /api/moderation/permissions/me}. The
 * server applies SUPERADMIN / owner bypass and returns an all-true bag for
 * those callers, so the UI does not need to special-case them — checking
 * the flags works for every role.
 */
import { API_BASE_URL } from '@/config/env'
import { getToken } from '@/services/tokenWorkerClient'

export interface MyPermissions {
  canManualPermaBan: boolean
  canClearStrikes: boolean
  canVerifyCreators: boolean
  canViewTenantAudit: boolean
}

export const NO_PERMISSIONS: Readonly<MyPermissions> = Object.freeze({
  canManualPermaBan: false,
  canClearStrikes: false,
  canVerifyCreators: false,
  canViewTenantAudit: false,
})

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

export async function fetchMyPermissions (tenantId: string | null): Promise<MyPermissions> {
  if (!tenantId) return { ...NO_PERMISSIONS }
  const url = new URL(`${API_BASE_URL}/api/moderation/permissions/me`)
  url.searchParams.set('tenantId', tenantId)
  const res = await fetch(url.toString(), {
    credentials: 'include',
    headers: await authHeaders(),
  })
  if (!res.ok) {
    // Network / auth failures fall back to "no permissions" — the UI then
    // hides opt-in buttons rather than guessing yes and getting a 403 later.
    return { ...NO_PERMISSIONS }
  }
  return res.json()
}
