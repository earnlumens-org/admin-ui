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
