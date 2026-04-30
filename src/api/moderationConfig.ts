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

export interface ModerationConfig {
  id: string | null
  tenantId: string
  businessRulesPrompt: string
  /** English-only public-facing publishing notes for the tenant. Optional. */
  tenantPublishingNotes: string | null
  createdAt: string | null
  updatedAt: string | null
  updatedBy: string | null
}

export async function fetchModerationConfig (tenantId: string): Promise<ModerationConfig> {
  const res = await fetch(`${API_BASE_URL}/api/moderation/config/${encodeURIComponent(tenantId)}`, {
    credentials: 'include',
    headers: await authHeaders(),
  })
  if (!res.ok) {
    throw new Error('Failed to fetch moderation config')
  }
  return res.json()
}

export async function updateModerationConfig (
  tenantId: string,
  businessRulesPrompt: string,
  tenantPublishingNotes: string | null = null,
): Promise<ModerationConfig> {
  const res = await fetch(`${API_BASE_URL}/api/moderation/config/${encodeURIComponent(tenantId)}`, {
    method: 'PUT',
    credentials: 'include',
    headers: await authHeaders(),
    // null tenantPublishingNotes means "do not touch this field"; pass an
    // empty string to clear an existing value on the server.
    body: JSON.stringify({ businessRulesPrompt, tenantPublishingNotes }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || 'Failed to update moderation config')
  }
  return res.json()
}
