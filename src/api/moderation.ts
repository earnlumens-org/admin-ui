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

export interface EntryDto {
  id: string
  tenantId: string
  userId: string
  authorUsername: string | null
  authorAvatarUrl: string | null
  authorBadge: string | null
  title: string
  description: string | null
  type: string
  status: string
  previousStatus: string | null
  visibility: string
  paid: boolean
  priceXlm: number | null
  priceUsd: number | null
  priceCurrency: string | null
  pricingMode: string | null
  sellerWallet: string | null
  tags: string[]
  thumbnailR2Key: string | null
  previewR2Key: string | null
  contentLanguage: string | null
  durationSec: number | null
  hlsReady: boolean
  viewCount: number
  createdAt: string
  updatedAt: string
  publishedAt: string | null
}

export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
  first: boolean
  last: boolean
}

export interface ModerationStats {
  inReview: number
  published: number
  suspended: number
  rejected: number
}

export async function fetchEntries (
  tenantId: string,
  tab: string,
  page: number,
  size: number,
  status?: string,
): Promise<PageResponse<EntryDto>> {
  const params = new URLSearchParams({
    tenantId,
    tab,
    page: String(page),
    size: String(size),
  })
  if (status) {
    params.set('status', status)
  }

  const res = await fetch(`${API_BASE_URL}/api/moderation/entries?${params}`, {
    credentials: 'include',
    headers: await authHeaders(),
  })
  if (!res.ok) {
    throw new Error('Failed to fetch entries')
  }
  return res.json()
}

export async function fetchEntry (tenantId: string, entryId: string): Promise<EntryDto> {
  const params = new URLSearchParams({ tenantId })
  const res = await fetch(`${API_BASE_URL}/api/moderation/entries/${entryId}?${params}`, {
    credentials: 'include',
    headers: await authHeaders(),
  })
  if (!res.ok) {
    throw new Error('Failed to fetch entry')
  }
  return res.json()
}

export async function approveEntry (tenantId: string, entryId: string): Promise<EntryDto> {
  const params = new URLSearchParams({ tenantId })
  const res = await fetch(`${API_BASE_URL}/api/moderation/entries/${entryId}/approve?${params}`, {
    method: 'POST',
    credentials: 'include',
    headers: await authHeaders(),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || 'Failed to approve')
  }
  return res.json()
}

export async function rejectEntry (tenantId: string, entryId: string, justification: string): Promise<EntryDto> {
  const params = new URLSearchParams({ tenantId })
  const res = await fetch(`${API_BASE_URL}/api/moderation/entries/${entryId}/reject?${params}`, {
    method: 'POST',
    credentials: 'include',
    headers: await authHeaders(),
    body: JSON.stringify({ justification }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || 'Failed to reject')
  }
  return res.json()
}

export async function suspendEntry (tenantId: string, entryId: string, justification: string): Promise<EntryDto> {
  const params = new URLSearchParams({ tenantId })
  const res = await fetch(`${API_BASE_URL}/api/moderation/entries/${entryId}/suspend?${params}`, {
    method: 'POST',
    credentials: 'include',
    headers: await authHeaders(),
    body: JSON.stringify({ justification }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || 'Failed to suspend')
  }
  return res.json()
}

export async function fetchModerationStats (tenantId: string): Promise<ModerationStats> {
  const params = new URLSearchParams({ tenantId })
  const res = await fetch(`${API_BASE_URL}/api/moderation/stats?${params}`, {
    credentials: 'include',
    headers: await authHeaders(),
  })
  if (!res.ok) {
    throw new Error('Failed to fetch stats')
  }
  return res.json()
}

export async function fetchTenantIds (): Promise<string[]> {
  const res = await fetch(`${API_BASE_URL}/api/tenants`, {
    credentials: 'include',
    headers: await authHeaders(),
  })
  if (!res.ok) {
    throw new Error('Failed to fetch tenants')
  }
  return res.json()
}
