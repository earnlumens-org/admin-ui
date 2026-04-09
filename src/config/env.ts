const hostname = window.location.hostname

function resolveApiBaseUrl(): string {
  if (hostname === 'localhost.dv') {
    return 'http://localhost.dv:8082'
  }
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8082'
  }
  if (hostname === 'admin-dev.earnlumens.org') {
    return 'https://admin-api-dev.earnlumens.org'
  }
  return 'https://admin-api.earnlumens.org'
}

function resolveCdnBaseUrl(): string {
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
