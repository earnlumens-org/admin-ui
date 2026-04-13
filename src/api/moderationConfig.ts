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

export async function updateModerationConfig (tenantId: string, businessRulesPrompt: string): Promise<ModerationConfig> {
  const res = await fetch(`${API_BASE_URL}/api/moderation/config/${encodeURIComponent(tenantId)}`, {
    method: 'PUT',
    credentials: 'include',
    headers: await authHeaders(),
    body: JSON.stringify({ businessRulesPrompt }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || 'Failed to update moderation config')
  }
  return res.json()
}
