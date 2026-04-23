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

export interface MyInvitation {
  invitationId: string
  tenantId: string
  tenantTitle: string | null
  tenantSubdomain: string | null
  tenantLogoR2Key: string | null
  invitedBy: string
  invitedAt: string
}

const BASE = `${API_BASE_URL}/api/moderation/invitations/me`

export async function fetchMyInvitations (): Promise<MyInvitation[]> {
  const res = await fetch(BASE, {
    credentials: 'include',
    headers: await authHeaders(),
  })
  if (!res.ok) {
    throw new Error('Failed to fetch invitations')
  }
  return res.json()
}

export async function acceptMyInvitation (invitationId: string): Promise<void> {
  const res = await fetch(`${BASE}/${encodeURIComponent(invitationId)}/accept`, {
    method: 'POST',
    credentials: 'include',
    headers: await authHeaders(),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || 'Failed to accept invitation')
  }
}

export async function rejectMyInvitation (invitationId: string): Promise<void> {
  const res = await fetch(`${BASE}/${encodeURIComponent(invitationId)}/reject`, {
    method: 'POST',
    credentials: 'include',
    headers: await authHeaders(),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || 'Failed to reject invitation')
  }
}
