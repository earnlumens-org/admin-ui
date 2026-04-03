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

export const API_BASE_URL = resolveApiBaseUrl()
