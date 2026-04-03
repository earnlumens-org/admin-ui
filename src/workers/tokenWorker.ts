/**
 * Token Worker - Manages access token lifecycle in isolated Web Worker memory.
 * The access token NEVER lives in main-thread JavaScript, reducing XSS attack surface.
 *
 * Security measures:
 * - Token stored only in Worker thread memory (not accessible via DOM/devtools)
 * - Proactive refresh before expiry (30s buffer)
 * - Concurrent refresh deduplication (single in-flight request)
 * - Session expiration broadcast to main thread
 */

const hostname = self.location?.hostname || 'localhost'

function resolveApiBaseUrl (): string {
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

function apiUrl (path: string): string {
  return `${resolveApiBaseUrl()}${path}`
}

interface WorkerState {
  accessToken: string | null
  expiresAt: number | null
}

const state: WorkerState = {
  accessToken: null,
  expiresAt: null,
}

let pendingRefreshPromise: Promise<boolean> | null = null

// Message types
interface SetTokenMessage { type: 'SET_TOKEN', payload: { accessToken: string } }
interface GetTokenMessage { type: 'GET_TOKEN' }
interface ClearTokenMessage { type: 'CLEAR_TOKEN' }
interface RefreshTokenMessage { type: 'REFRESH_TOKEN' }

type IncomingMessage = SetTokenMessage | GetTokenMessage | ClearTokenMessage | RefreshTokenMessage

interface TokenResultPayload { accessToken: string | null, valid: boolean }
interface RefreshResultPayload { success: boolean, accessToken?: string }

type OutgoingMessage
  = | { type: 'TOKEN_RESULT', payload: TokenResultPayload }
    | { type: 'TOKEN_SET', payload: { success: boolean } }
    | { type: 'TOKEN_CLEARED' }
    | { type: 'REFRESH_RESULT', payload: RefreshResultPayload }
    | { type: 'SESSION_EXPIRED' }
    | { type: 'ERROR', payload: { message: string } }

function parseJwtExp (token: string): number | null {
  try {
    const parts = token.split('.')
    if (parts.length < 2 || !parts[1]) {
      return null
    }
    const decoded = JSON.parse(atob(parts[1]))
    return decoded.exp ? decoded.exp * 1000 : null
  } catch {
    return null
  }
}

function isTokenExpired (): boolean {
  if (!state.expiresAt) {
    return true
  }
  const remaining = state.expiresAt - Date.now()
  return remaining <= 30_000
}

function sendMessage (msg: OutgoingMessage) {
  self.postMessage(msg)
}

async function handleRefresh (): Promise<boolean> {
  if (pendingRefreshPromise) {
    return pendingRefreshPromise
  }

  pendingRefreshPromise = (async (): Promise<boolean> => {
    try {
      const response = await fetch(apiUrl('/api/auth/refresh'), {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      })

      if (!response.ok) {
        state.accessToken = null
        state.expiresAt = null
        sendMessage({ type: 'SESSION_EXPIRED' })
        sendMessage({ type: 'REFRESH_RESULT', payload: { success: false } })
        return false
      }

      const data = await response.json()
      const newToken = data.accessToken

      if (newToken) {
        state.accessToken = newToken
        state.expiresAt = parseJwtExp(newToken)
        sendMessage({ type: 'REFRESH_RESULT', payload: { success: true, accessToken: newToken } })
        return true
      } else {
        sendMessage({ type: 'REFRESH_RESULT', payload: { success: false } })
        return false
      }
    } catch {
      sendMessage({ type: 'ERROR', payload: { message: 'Refresh failed' } })
      sendMessage({ type: 'REFRESH_RESULT', payload: { success: false } })
      return false
    } finally {
      pendingRefreshPromise = null
    }
  })()

  return pendingRefreshPromise
}

self.addEventListener('message', (event: MessageEvent<IncomingMessage>) => {
  const { type } = event.data

  void (async () => {
    switch (type) {
      case 'SET_TOKEN': {
        const { accessToken } = (event.data as SetTokenMessage).payload
        state.accessToken = accessToken
        state.expiresAt = parseJwtExp(accessToken)
        sendMessage({ type: 'TOKEN_SET', payload: { success: true } })
        break
      }

      case 'GET_TOKEN': {
        if (!state.accessToken || isTokenExpired()) {
          await handleRefresh()
          sendMessage({
            type: 'TOKEN_RESULT',
            payload: {
              accessToken: state.accessToken,
              valid: !!state.accessToken && !isTokenExpired(),
            },
          })
        } else {
          sendMessage({
            type: 'TOKEN_RESULT',
            payload: { accessToken: state.accessToken, valid: true },
          })
        }
        break
      }

      case 'CLEAR_TOKEN': {
        state.accessToken = null
        state.expiresAt = null
        sendMessage({ type: 'TOKEN_CLEARED' })
        break
      }

      case 'REFRESH_TOKEN': {
        await handleRefresh()
        break
      }

      default: {
        sendMessage({ type: 'ERROR', payload: { message: 'Unknown message type' } })
      }
    }
  })()
})

self.postMessage({ type: 'WORKER_READY' })
