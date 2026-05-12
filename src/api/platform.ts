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

/** Mirrors admin-api's PlatformStatsResponse record. */
export interface PlatformStats {
  /** Active tenants count (TenantStatus == ACTIVE). */
  activeTenants: number | null
  /** Total storefront users known to the platform. */
  totalUsers: number | null
  /** Pending transcoding jobs — currently null until a jobs collection exists. */
  transcodingQueue: number | null
  /** Terminally failed jobs — currently null until a jobs collection exists. */
  failedJobs: number | null
}

export async function fetchPlatformStats (): Promise<PlatformStats> {
  const response = await fetch(`${API_BASE_URL}/api/admin/platform/stats`, {
    method: 'GET',
    credentials: 'include',
    headers: await authHeaders(),
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch platform stats (${response.status})`)
  }
  return response.json()
}
