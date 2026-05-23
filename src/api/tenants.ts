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

/** Mirrors admin-api's TenantStatus enum. */
export type TenantStatus = 'ACTIVE' | 'BLOCKED'

/** Mirrors admin-api's TenantSummaryResponse record (see TenantController). */
export interface TenantSummary {
  id: string
  subdomain: string
  title: string
  description: string | null
  logoR2Key: string | null
  /** Optional dark-theme logo; storefront falls back to logoR2Key when null. */
  logoR2KeyDark: string | null
  /** Optional per-tenant browser favicon. Null = storefront uses the baked-in /favicon.ico. */
  faviconR2Key: string | null
  /** Optional browser-tab title override. Null = storefront falls back to title / EARNLUMENS. */
  browserTitle: string | null
  brandText: string | null
  /** When true the storefront renders no text label next to the logo. */
  brandTextHidden: boolean
  /** Hero banner master switch. When false the storefront skips rendering it. */
  bannerEnabled: boolean
  /** R2 key of the banner background image (under .../banner/). */
  bannerImageR2Key: string | null
  bannerEyebrow: string | null
  bannerHeadline: string | null
  bannerSubheadline: string | null
  bannerCtaLabel: string | null
  bannerCtaUrl: string | null
  bannerImageAlt: string | null
  /** Per-tenant default Vuetify theme keys. Null = use platform default. */
  defaultLightTheme: string | null
  defaultDarkTheme: string | null
  /**
   * Per-tenant uploads kill switch. When false, media-store-api refuses
   * any new upload-init / finalize call with 403 UPLOADS_DISABLED.
   * Legacy tenants without the field default to true.
   */
  uploadsEnabled: boolean
  /**
   * Optional per-tenant allowlist of entry types (uppercase enum names:
   * VIDEO, AUDIO, IMAGE, RESOURCE, COLLECTION). Null or empty means no
   * restriction (every type allowed) so legacy tenants stay unrestricted.
   */
  allowedEntryTypes: string[] | null
  ownerUsername: string
  ownerDisplayName: string
  tenantWallet: string | null
  platformFeePercent: string
  tenantFeePercent: string
  status: TenantStatus
  createdAt: string
}

/** Payload for POST /api/tenants/me — matches admin-api's CreateTenantRequest. */
export interface CreateTenantPayload {
  title: string
  description?: string
  logoR2Key?: string
  tenantWallet: string
  tenantFeePercent: string // "0.00"–"30.00"
  subdomain: string
  confirmIrreversible: boolean
}

/**
 * Error class that preserves the machine-readable error code
 * returned by the server (see {@code TenantErrorCode}). The UI uses
 * {@link TenantApiError#code} to localise the message.
 */
export class TenantApiError extends Error {
  readonly code: string
  readonly status: number

  constructor (code: string, status: number, message?: string) {
    super(message ?? code)
    this.code = code
    this.status = status
  }
}

async function parseError (res: Response): Promise<TenantApiError> {
  let code = 'unknown_error'
  try {
    const body = await res.json()
    if (body && typeof body.error === 'string') {
      code = body.error
    }
  } catch {
    // non-JSON body — keep 'unknown_error'
  }
  return new TenantApiError(code, res.status)
}

/**
 * GET /api/tenants/me — returns the caller's tenant or null on 404.
 * Any non-2xx / non-404 status is surfaced as a {@link TenantApiError}.
 */
export async function getMyTenant (): Promise<TenantSummary | null> {
  const res = await fetch(`${API_BASE_URL}/api/tenants/me`, {
    credentials: 'include',
    headers: await authHeaders(),
  })
  if (res.status === 404) {
    return null
  }
  if (!res.ok) {
    throw await parseError(res)
  }
  return res.json()
}

/**
 * GET /api/tenants/me/{tenantId} — owner-scoped load for the specific
 * tenant currently selected in the admin top-right switcher. Required
 * because {@link getMyTenant} returns whichever tenant the owner-index
 * happens to surface first, which silently mis-targets settings edits
 * (theme, banner, brand) when the caller owns more than one tenant.
 */
export async function getOwnedTenant (tenantId: string): Promise<TenantSummary> {
  const res = await fetch(
    `${API_BASE_URL}/api/tenants/me/${encodeURIComponent(tenantId)}`,
    {
      credentials: 'include',
      headers: await authHeaders(),
    },
  )
  if (!res.ok) {
    throw await parseError(res)
  }
  return res.json()
}

export async function createMyTenant (payload: CreateTenantPayload): Promise<TenantSummary> {
  const res = await fetch(`${API_BASE_URL}/api/tenants/me`, {
    method: 'POST',
    credentials: 'include',
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw await parseError(res)
  }
  return res.json()
}

/**
 * POST /api/tenants/me/additional — always returns 503 today
 * (the "coming soon" paid flow). UI uses this to prove to the user that
 * the feature is intentionally gated, not broken.
 */
export async function requestAdditionalTenant (): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/tenants/me/additional`, {
    method: 'POST',
    credentials: 'include',
    headers: await authHeaders(),
  })
  if (!res.ok) {
    throw await parseError(res)
  }
}

/** GET /api/tenants/admin — super-admin only. */
export async function listAllTenants (): Promise<TenantSummary[]> {
  const res = await fetch(`${API_BASE_URL}/api/tenants/admin`, {
    credentials: 'include',
    headers: await authHeaders(),
  })
  if (!res.ok) {
    throw await parseError(res)
  }
  return res.json()
}

/** Payload for PATCH /api/tenants/me/{tenantId} — UpdateTenantSettingsRequest. */
export interface UpdateTenantSettingsPayload {
  title?: string
  description?: string
  logoR2Key?: string
  /** Dark-theme logo R2 key. Empty string clears the value. */
  logoR2KeyDark?: string
  /** Per-tenant browser favicon R2 key. Empty string clears the value. */
  faviconR2Key?: string
  /** Browser-tab title override. Empty string clears the value. */
  browserTitle?: string
  /**
   * Storefront app-bar label. Empty string clears the override and the
   * server falls back to the tenant title (or to the hardcoded EARNLUMENS
   * brand for the platform/root tenant).
   */
  brandText?: string
  /** Flip on to hide the text label entirely (logo-only mode). */
  brandTextHidden?: boolean
  /** Hero banner master switch. */
  bannerEnabled?: boolean
  /** Banner background R2 key. Empty string clears the value. */
  bannerImageR2Key?: string
  /** Eyebrow / niche chip rendered above the headline. Empty string clears. */
  bannerEyebrow?: string
  /** Big marketing title. Empty string clears. */
  bannerHeadline?: string
  /** Supporting paragraph under the headline. Empty string clears. */
  bannerSubheadline?: string
  /** CTA button label. Empty string clears. */
  bannerCtaLabel?: string
  /** CTA destination. Relative (/explore) or absolute https. Empty string clears. */
  bannerCtaUrl?: string
  /** Image alt text — accessibility + SEO. Empty string clears. */
  bannerImageAlt?: string
  /**
   * Default Vuetify theme keys for the storefront. Server validates each
   * against its allowlist of light/dark keys. Empty string clears the
   * override and the storefront falls back to the platform default.
   */
  defaultLightTheme?: string
  defaultDarkTheme?: string
  /**
   * Uploads kill switch. {@code true} = enable; {@code false} = disable
   * (storefront stops accepting new uploads). Omit to leave unchanged.
   */
  uploadsEnabled?: boolean
  /**
   * Per-tenant content-type allowlist. Omit to leave unchanged; pass an
   * empty array to clear the restriction (revert to "all types allowed");
   * pass a non-empty array of uppercase enum names to restrict.
   */
  allowedEntryTypes?: string[]
  tenantWallet?: string
  tenantFeePercent?: string
}

/**
 * PATCH /api/tenants/me/{tenantId} — owner-scoped settings update.
 * The server re-verifies ownership against the database on every call,
 * so a stale JWT cannot mutate a tenant the caller no longer owns.
 */
export async function updateMyTenant (
  tenantId: string,
  payload: UpdateTenantSettingsPayload,
): Promise<TenantSummary> {
  const res = await fetch(
    `${API_BASE_URL}/api/tenants/me/${encodeURIComponent(tenantId)}`,
    {
      method: 'PATCH',
      credentials: 'include',
      headers: await authHeaders(),
      body: JSON.stringify(payload),
    },
  )
  if (!res.ok) {
    throw await parseError(res)
  }
  return res.json()
}

/**
 * Compact label-only view of a tenant the caller can access. Mirrors
 * admin-api's AccessibleTenantResponse. Used to fill tenant-selector
 * dropdowns with human-readable titles instead of raw Mongo ObjectIds.
 */
export interface AccessibleTenant {
  id: string
  title: string
  subdomain: string
  role: 'ADMIN' | 'MODERATOR'
}

export async function fetchAccessibleTenants (): Promise<AccessibleTenant[]> {
  const res = await fetch(`${API_BASE_URL}/api/tenants/me/accessible`, {
    credentials: 'include',
    headers: await authHeaders(),
  })
  if (!res.ok) {
    throw new Error('Failed to fetch accessible tenants')
  }
  return res.json()
}

/**
 * Response of {@code POST /api/tenants/me/{tenantId}/logo/upload-url}.
 *
 * - `uploadUrl`: presigned R2 PUT URL (valid 15 min). The client must PUT
 *   the binary with header `Content-Type` matching the declared MIME type;
 *   any other type causes the R2 signature to fail.
 * - `r2Key`: object key to persist via the regular tenant PATCH once the
 *   upload completes.
 */
export interface LogoUploadUrlResponse {
  uploadUrl: string
  r2Key: string
}

/**
 * Requests a presigned upload URL for the tenant logo. The caller must own
 * the tenant; the server enforces type (PNG or WebP for logo, +JPEG for the
 * banner variant, +ICO for the favicon variant) and size (≤ 512 KB for
 * logos, ≤ 2 MB for the banner, ≤ 128 KB for the favicon).
 */
export async function presignTenantLogoUpload (
  tenantId: string,
  contentType: string,
  sizeBytes: number,
  variant: 'light' | 'dark' | 'banner' | 'favicon' = 'light',
): Promise<LogoUploadUrlResponse> {
  const res = await fetch(
    `${API_BASE_URL}/api/tenants/me/${encodeURIComponent(tenantId)}/logo/upload-url`,
    {
      method: 'POST',
      credentials: 'include',
      headers: await authHeaders(),
      body: JSON.stringify({ contentType, sizeBytes, variant }),
    },
  )
  if (!res.ok) {
    throw await parseError(res)
  }
  return res.json()
}
