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

/** Top entry of a leaderboard (top tenant or best-selling space). */
export interface RevenueHighlight {
  /** tenantId for SUPERADMIN scope, spaceId for tenant scope. */
  id: string
  /** Human-readable label resolved server-side; null → fall back to id. */
  name: string | null
  /** Sum of XLM attributed to this entity, as a numeric string. */
  amountXlm: string | null
}

/** Mirrors admin-api's RevenueResponse record. */
export interface RevenueStats {
  /** "platform" for SUPERADMIN view, otherwise the scoped tenantId. */
  scope: string
  /** Lifetime revenue (XLM) — string-encoded BigDecimal; null when no orders. */
  totalRevenueXlm: string | null
  /** Revenue (XLM) since start of current UTC month. */
  monthRevenueXlm: string | null
  /** Sum of the PLATFORM split applied to completed orders. */
  platformFeesXlm: string | null
  /** Populated only on the SUPERADMIN platform view. */
  topTenant: RevenueHighlight | null
  /** Populated only on the tenant-scoped view. */
  bestSellingSpace: RevenueHighlight | null
}

/**
 * Fetches the revenue snapshot for the dashboard.
 *
 * @param tenantId — when omitted, asks for the platform-wide aggregate
 *   (SUPERADMIN-only on the backend). When set, asks for the totals scoped
 *   to that tenant; the backend rejects with 403 if the caller is not an
 *   admin of that tenant.
 */
export async function fetchRevenueStats (tenantId?: string | null): Promise<RevenueStats> {
  const url = new URL(`${API_BASE_URL}/api/admin/revenue/stats`)
  if (tenantId) url.searchParams.set('tenantId', tenantId)
  const response = await fetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: await authHeaders(),
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch revenue stats (${response.status})`)
  }
  return response.json()
}
