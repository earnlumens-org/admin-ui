const hostname = window.location.hostname

/**
 * Primary apex host for this deployment.
 *
 * Defaults to `earnlumens.org`. To run the very same admin build under a
 * different domain, set `VITE_PRIMARY_HOST` at build time (per Cloudflare
 * Pages project). Every admin/api/cdn hostname, the brand name and the root
 * tenant id are derived from it, so a single variable re-points and re-brands
 * the whole admin SPA.
 */
const PRIMARY_HOST: string = (() => {
  const raw = import.meta.env.VITE_PRIMARY_HOST
  return typeof raw === 'string' && raw.trim() !== ''
    ? raw.trim().toLowerCase()
    : 'earnlumens.org'
})()

/** Admin host names derived from the primary apex. */
const ADMIN_HOST = `admin.${PRIMARY_HOST}`
const ADMIN_DEV_HOST = `admin-dev.${PRIMARY_HOST}`

// Admin API now lives under the admin host (api.admin.<apex>) so cookies can
// be scoped to *.admin.<apex> and never travel to tenant subdomains under
// *.<apex>.
function resolveApiBaseUrl (): string {
  if (hostname === 'localhost.dv') {
    return 'http://localhost.dv:8082'
  }
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8082'
  }
  if (hostname === ADMIN_DEV_HOST) {
    return `https://api.admin-dev.${PRIMARY_HOST}`
  }
  return `https://api.admin.${PRIMARY_HOST}`
}

function resolveCdnBaseUrl (): string {
  if (hostname === 'localhost.dv' || hostname === 'localhost' || hostname === '127.0.0.1') {
    return `https://cdn-dev.${PRIMARY_HOST}`
  }
  if (hostname === ADMIN_DEV_HOST) {
    return `https://cdn-dev.${PRIMARY_HOST}`
  }
  return `https://cdn.${PRIMARY_HOST}`
}

/**
 * Stellar Horizon URL — testnet for any non-production host (local + dev
 * tunnel), public network for production. Mirrors the policy used by
 * media-store-ui so both surfaces validate addresses against the same
 * ledger their payments will eventually settle on.
 */
function resolveStellarHorizonUrl (): string {
  if (hostname === ADMIN_HOST) {
    return 'https://horizon.stellar.org'
  }
  return 'https://horizon-testnet.stellar.org'
}

export const API_BASE_URL = resolveApiBaseUrl()
export const CDN_BASE_URL = resolveCdnBaseUrl()

export function getStellarHorizonUrl (): string {
  return resolveStellarHorizonUrl()
}

/**
 * The platform apex domain for this deployment (e.g. `earnlumens.org`,
 * `pepe.com`). Use this for any user-visible domain/URL text.
 */
export function getPlatformDomain (): string {
  return PRIMARY_HOST
}

/**
 * The platform brand name derived from the domain: the first label,
 * uppercased. `earnlumens.org` -> `EARNLUMENS`, `pepe.com` -> `PEPE`.
 * Use this for any user-visible brand/title text.
 */
export function getPlatformName (): string {
  return (PRIMARY_HOST.split('.')[0] || PRIMARY_HOST).toUpperCase()
}

/**
 * The platform root (pseudo) tenant id: the first label of the apex,
 * lowercased. `earnlumens.org` -> `earnlumens`, `pepe.com` -> `pepe`.
 * Mirrors the backend `admin.platform.default-tenant-id`, which must be
 * configured to the same value for a non-default domain.
 */
export function getRootTenantId (): string {
  return (PRIMARY_HOST.split('.')[0] || PRIMARY_HOST).toLowerCase()
}

/**
 * Rewrites the canonical brand tokens baked into translation strings to this
 * deployment's domain/name:
 *   `earnlumens.org` -> getPlatformDomain()  (domains, links)
 *   `Earnlumens` / `EarnLumens` -> getPlatformName()  (display brand)
 * The domain token is all-lowercase while the brand tokens are capitalised,
 * so they never overlap. On earnlumens.org the only visible effect is the
 * brand becoming uppercase, per the branding directive.
 */
export function normalizeBrandText (value: string): string {
  return value
    .split('earnlumens.org').join(getPlatformDomain())
    .split('EarnLumens').join(getPlatformName())
    .split('Earnlumens').join(getPlatformName())
}
