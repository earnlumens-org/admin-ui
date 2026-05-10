/**
 * Audit-log API client (admin surface).
 *
 * Mirrors the backend at {@code GET /api/admin/audit}. Returns a Spring
 * {@link PageResponse} of {@link UserSanctionDto} rows ordered newest-first.
 */
import { API_BASE_URL } from '@/config/env'
import { getToken } from '@/services/tokenWorkerClient'
import type { PageResponse } from './moderation'
import type { SanctionType, UserSanctionDto } from './userModeration'

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

export interface AuditQuery {
  /** SUPERADMIN may pass "_all"; non-superadmin is silently scoped to their tenants. */
  tenantId?: string | null
  type?: SanctionType | null
  page?: number
  size?: number
}

export async function listAudit (query: AuditQuery = {}): Promise<PageResponse<UserSanctionDto>> {
  const params = new URLSearchParams()
  if (query.tenantId) params.set('tenantId', query.tenantId)
  if (query.type) params.set('type', query.type)
  if (typeof query.page === 'number') params.set('page', String(query.page))
  if (typeof query.size === 'number') params.set('size', String(query.size))
  const res = await fetch(`${API_BASE_URL}/api/admin/audit?${params}`, {
    credentials: 'include',
    headers: await authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to load audit log')
  return res.json()
}
