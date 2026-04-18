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
  resourceContent: string | null
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
  moderationFeedback: string | null
  statusHistory: StatusChangeRecord[]
}

export interface StatusChangeRecord {
  fromStatus: string
  toStatus: string
  actor: string | null
  reason: string | null
  timestamp: string
}

export interface ModerationJobDto {
  id: string
  tenantId: string
  entryId: string
  entryType: string
  entryTitle: string | null
  status: string
  decision: string | null
  confidence: number | null
  categoriesDetected: string[] | null
  decisionReason: string | null
  decidingStep: string | null
  retryCount: number
  maxRetries: number
  errorMessage: string | null
  dispatchedAt: string | null
  processingStartedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
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
  aiProcessing?: number
  inReview: number
  published: number
  suspended: number
  rejected: number
  archived: number
  openReports?: number
}

export interface ContentUrlResponse {
  type: string
  hasContent: boolean
  contentUrl?: string
  contentType?: string
  fileName?: string
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

export async function fetchContentUrl (tenantId: string, entryId: string): Promise<ContentUrlResponse> {
  const params = new URLSearchParams({ tenantId })
  const res = await fetch(`${API_BASE_URL}/api/moderation/entries/${entryId}/content-url?${params}`, {
    credentials: 'include',
    headers: await authHeaders(),
  })
  if (!res.ok) {
    throw new Error('Failed to fetch content URL')
  }
  return res.json()
}

export async function fetchModerationJobs (tenantId: string, entryId: string): Promise<ModerationJobDto[]> {
  const params = new URLSearchParams({ tenantId })
  const res = await fetch(`${API_BASE_URL}/api/moderation/entries/${entryId}/moderation-jobs?${params}`, {
    credentials: 'include',
    headers: await authHeaders(),
  })
  if (!res.ok) {
    throw new Error('Failed to fetch moderation jobs')
  }
  return res.json()
}

export async function fetchJobSummaries (entryIds: string[]): Promise<Record<string, ModerationJobDto>> {
  const params = new URLSearchParams()
  entryIds.forEach(id => params.append('entryIds', id))
  const res = await fetch(`${API_BASE_URL}/api/moderation/job-summaries?${params}`, {
    credentials: 'include',
    headers: await authHeaders(),
  })
  if (!res.ok) {
    throw new Error('Failed to fetch job summaries')
  }
  return res.json()
}

// ── Report types ──────────────────────────────────────────

export interface ReportSnapshotDto {
  title: string | null
  description: string | null
  thumbnailR2Key: string | null
  authorUsername: string | null
}

export interface ReportDto {
  id: string
  tenantId: string
  entryId: string
  creatorUserId: string | null
  reporterUserId: string
  reporterUsername: string | null
  reason: string
  severity: string
  comment: string | null
  snapshot: ReportSnapshotDto | null
  priorityScore: number
  resolution: string
  resolvedBy: string | null
  resolvedAt: string | null
  createdAt: string
}

export interface ReportSummary {
  reportCount: number
  maxSeverity: string
  maxPriority: number
  reasons: string[]
}

// ── Report API ────────────────────────────────────────────

export async function fetchReports (
  tenantId: string,
  resolution: string | null,
  page: number,
  size: number,
): Promise<PageResponse<ReportDto>> {
  const params = new URLSearchParams({ tenantId, page: String(page), size: String(size) })
  if (resolution) params.set('resolution', resolution)
  const res = await fetch(`${API_BASE_URL}/api/moderation/reports?${params}`, {
    credentials: 'include',
    headers: await authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch reports')
  return res.json()
}

export async function fetchEntryReports (tenantId: string, entryId: string): Promise<ReportDto[]> {
  const params = new URLSearchParams({ tenantId })
  const res = await fetch(`${API_BASE_URL}/api/moderation/entries/${entryId}/reports?${params}`, {
    credentials: 'include',
    headers: await authHeaders(),
  })
  if (!res.ok) {
    throw new Error('Failed to fetch reports')
  }
  return res.json()
}

export async function fetchReportSummaries (entryIds: string[]): Promise<Record<string, ReportSummary>> {
  const params = new URLSearchParams()
  entryIds.forEach(id => params.append('entryIds', id))
  const res = await fetch(`${API_BASE_URL}/api/moderation/report-summaries?${params}`, {
    credentials: 'include',
    headers: await authHeaders(),
  })
  if (!res.ok) {
    throw new Error('Failed to fetch report summaries')
  }
  return res.json()
}

export async function resolveReport (reportId: string, resolution: string): Promise<ReportDto> {
  const res = await fetch(`${API_BASE_URL}/api/moderation/reports/${reportId}/resolve`, {
    method: 'POST',
    credentials: 'include',
    headers: await authHeaders(),
    body: JSON.stringify({ resolution }),
  })
  if (!res.ok) {
    throw new Error('Failed to resolve report')
  }
  return res.json()
}
