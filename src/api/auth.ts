import { API_BASE_URL } from '@/config/env'

export async function createSession(uuid: string): Promise<{ accessToken: string }> {
  const res = await fetch(`${API_BASE_URL}/api/auth/session`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'UUID': uuid, 'X-Requested-With': 'XMLHttpRequest' },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || 'Session creation failed')
  }
  return res.json()
}

// NOTE: refreshAccessToken is now handled exclusively by the Web Worker (tokenWorker.ts)
// The worker calls /api/auth/refresh directly, keeping the access token out of the main thread.

export async function logout(): Promise<void> {
  await fetch(`${API_BASE_URL}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
  })
}
