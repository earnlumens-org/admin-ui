/**
 * Pro plan API (custom-domain-upgrade Fase 1D).
 *
 * Owner purchase flow (proxied by admin-api to media-store-api, which owns
 * the Stellar payment pipeline):
 *   POST /api/plan/me/{tenantId}/prepare  → unsigned XDR
 *   POST /api/plan/me/{tenantId}/submit   → sync on-chain confirmation
 *   GET  /api/plan/me/{tenantId}/order/{orderId}
 *
 * Global prices: GET /api/plan/prices (any authenticated user).
 * SUPERADMIN console: billing config, manual grant, plan orders list.
 */
import { API_BASE_URL } from '@/config/env'
import { getToken } from '@/services/tokenWorkerClient'

export type PlanPeriod = 'MONTHLY' | 'YEARLY'

export interface PlanPrices {
  planPriceMonthlyUsd: string
  planPriceYearlyUsd: string
}

export interface PreparePlanResponse {
  orderId: string
  unsignedXdr: string
  period: PlanPeriod
  amountUsd: string
  amountXlm: string
  xlmUsdRate: string
  memo: string
  expiresAt: string
}

export interface PlanOrderStatus {
  orderId: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'EXPIRED'
  period: PlanPeriod
  amountUsd: string
  amountXlm: string
  stellarTxHash: string | null
  completedAt: string | null
}

export class PlanApiError extends Error {
  readonly code: string
  readonly status: number
  constructor (code: string, status: number) {
    super(code)
    this.code = code
    this.status = status
  }
}

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

async function request<T> (path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    ...init,
    headers: { ...(await authHeaders()), ...init?.headers },
  })
  if (!res.ok) {
    let code = 'unknown_error'
    try {
      const body = await res.json()
      if (body && typeof body.error === 'string') {
        code = body.error
      }
    } catch { /* non-JSON body */ }
    throw new PlanApiError(code, res.status)
  }
  return res.json() as Promise<T>
}

export function getPlanPrices (): Promise<PlanPrices> {
  return request('/api/plan/prices')
}

export function preparePlan (
  tenantId: string, period: PlanPeriod, buyerWallet: string,
): Promise<PreparePlanResponse> {
  return request(`/api/plan/me/${encodeURIComponent(tenantId)}/prepare`, {
    method: 'POST',
    body: JSON.stringify({ period, buyerWallet }),
  })
}

export function submitPlan (
  tenantId: string, orderId: string, signedXdr: string,
): Promise<PlanOrderStatus> {
  return request(`/api/plan/me/${encodeURIComponent(tenantId)}/submit`, {
    method: 'POST',
    body: JSON.stringify({ orderId, signedXdr }),
  })
}

export function getPlanOrder (tenantId: string, orderId: string): Promise<PlanOrderStatus> {
  return request(`/api/plan/me/${encodeURIComponent(tenantId)}/order/${encodeURIComponent(orderId)}`)
}

// ---------------------------------------------------------------- superadmin

export interface BillingConfig {
  id: string
  planPriceMonthlyUsd: string
  planPriceYearlyUsd: string
  updatedAt: string | null
  updatedBy: string | null
}

export function getBillingConfig (): Promise<BillingConfig> {
  return request('/api/plan/admin/billing-config')
}

export function updateBillingConfig (
  planPriceMonthlyUsd: string, planPriceYearlyUsd: string,
): Promise<BillingConfig> {
  return request('/api/plan/admin/billing-config', {
    method: 'PATCH',
    body: JSON.stringify({ planPriceMonthlyUsd, planPriceYearlyUsd }),
  })
}

export function grantPro (tenantId: string, months: number): Promise<unknown> {
  return request('/api/plan/admin/grant', {
    method: 'POST',
    body: JSON.stringify({ tenantId, months: String(months) }),
  })
}

export interface AdminPlanOrder {
  id: string
  tenantId: string
  ownerOauthUserId: string
  period: PlanPeriod
  amountUsd?: string
  amountXlm?: string
  status: string
  stellarTxHash?: string
  createdAt?: string
  completedAt?: string
  appliedAt?: string
}

export function listPlanOrders (limit = 50): Promise<AdminPlanOrder[]> {
  return request(`/api/plan/admin/orders?limit=${limit}`)
}
