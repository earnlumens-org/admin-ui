const hostname = window.location.hostname

// Admin API now lives under the admin host (api.admin.earnlumens.org)
// so cookies can be scoped to *.admin.earnlumens.org and never travel to
// tenant subdomains under *.earnlumens.org.
function resolveApiBaseUrl (): string {
  if (hostname === 'localhost.dv') {
    return 'http://localhost.dv:8082'
  }
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8082'
  }
  if (hostname === 'admin-dev.earnlumens.org') {
    return 'https://api.admin-dev.earnlumens.org'
  }
  return 'https://api.admin.earnlumens.org'
}

function resolveCdnBaseUrl (): string {
  if (hostname === 'localhost.dv' || hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'https://cdn-dev.earnlumens.org'
  }
  if (hostname === 'admin-dev.earnlumens.org') {
    return 'https://cdn-dev.earnlumens.org'
  }
  return 'https://cdn.earnlumens.org'
}

export const API_BASE_URL = resolveApiBaseUrl()
export const CDN_BASE_URL = resolveCdnBaseUrl()
