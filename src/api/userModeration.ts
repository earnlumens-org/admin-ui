/**
 * User-moderation API client (admin surface).
 *
 * Mirrors the backend at {@code /api/moderation/users}. Each function is a
 * thin fetch wrapper; auth headers and tenant scoping are caller-supplied so
 * the same module is usable from SUPERADMIN tools (which can pass {@code
 * "_all"}) and from per-tenant moderation pages.
 */
import { API_BASE_URL } from '@/config/env'
import { getToken } from '@/services/tokenWorkerClient'
import type { PageResponse } from './moderation'

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

export interface StorefrontUserDto {
  id: string
  oauthProvider: string | null
  oauthUserId: string
  username: string
  displayName: string | null
  profileImageUrl: string | null
  followersCount: number | null
  createdAt: string | null
  lastLoginAt: string | null
  blocked: boolean
  blockedAt: string | null
  blockedByRequestId: string | null
  banReason: string | null
  banExpiresAt: string | null
  banIssuedBy: string | null
  banType: string | null
  strikeCount: number | null
  lastStrikeAt: string | null
}

export type SanctionType = 'WARNING' | 'STRIKE' | 'TEMP_BAN' | 'PERMA_BAN' | 'UNBAN'

export interface UserSanctionDto {
  id: string
  userId: string
  username: string | null
  tenantId: string
  type: SanctionType
  reason: string | null
  notes: string | null
  relatedReportIds: string[] | null
  relatedEntryIds: string[] | null
  issuedBy: string | null
  issuedByUsername: string | null
  issuedAt: string
  expiresAt: string | null
  strikeCountAfter: number | null
  automatic: boolean
}

export interface UserDetailResponse {
  user: StorefrontUserDto
  sanctions: UserSanctionDto[]
  creatorHistory: {
    totalReports: number
    priorSanctions: number
    dismissedReports: number
  }
}

export type UserListFilter = 'blocked' | 'strikes' | 'search'

export async function listUsers (
  tenantId: string,
  filter: UserListFilter,
  q: string | null,
  page = 0,
  size = 20,
): Promise<PageResponse<StorefrontUserDto>> {
  const params = new URLSearchParams({ tenantId, filter, page: String(page), size: String(size) })
  if (q) params.set('q', q)
  const res = await fetch(`${API_BASE_URL}/api/moderation/users?${params}`, {
    credentials: 'include',
    headers: await authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to list users')
  return res.json()
}

export async function fetchUserDetail (tenantId: string, userId: string): Promise<UserDetailResponse> {
  const params = new URLSearchParams({ tenantId })
  const res = await fetch(`${API_BASE_URL}/api/moderation/users/${userId}?${params}`, {
    credentials: 'include',
    headers: await authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to load user')
  return res.json()
}

export interface SanctionPayload {
  reason: string
  notes?: string | null
  reportIds?: string[]
  entryIds?: string[]
}

export async function warnUser (tenantId: string, userId: string, payload: SanctionPayload): Promise<UserSanctionDto> {
  return postSanction(`/api/moderation/users/${userId}/warn`, tenantId, payload)
}

export async function strikeUser (tenantId: string, userId: string, payload: SanctionPayload): Promise<UserSanctionDto> {
  return postSanction(`/api/moderation/users/${userId}/strike`, tenantId, payload)
}

export interface BanPayload extends SanctionPayload {
  banType: 'TEMP_BAN' | 'PERMA_BAN'
  durationDays?: number
}

export async function banUser (tenantId: string, userId: string, payload: BanPayload): Promise<UserSanctionDto> {
  return postSanction(`/api/moderation/users/${userId}/ban`, tenantId, payload)
}

export interface UnbanPayload {
  reason: string
  clearStrikes?: boolean
}

export async function unbanUser (tenantId: string, userId: string, payload: UnbanPayload): Promise<UserSanctionDto> {
  return postSanction(`/api/moderation/users/${userId}/unban`, tenantId, payload)
}

async function postSanction<T> (path: string, tenantId: string, body: unknown): Promise<T> {
  const params = new URLSearchParams({ tenantId })
  const res = await fetch(`${API_BASE_URL}${path}?${params}`, {
    method: 'POST',
    credentials: 'include',
    headers: await authHeaders(),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(err.error || 'Sanction request failed')
  }
  return res.json() as Promise<T>
}
