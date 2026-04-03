/**
 * Auth Broadcast Channel - Multi-tab synchronization for admin panel.
 * Syncs logout and session expiration events across all browser tabs.
 * Uses a distinct channel name from media-store-ui to avoid cross-app interference.
 */

type AuthEvent = 'LOGOUT' | 'SESSION_EXPIRED'
type AuthEventCallback = (event: AuthEvent) => void

interface AuthBroadcastMessage {
  type: AuthEvent
  tabId: string
  timestamp: number
}

const CHANNEL_NAME = 'admin_auth_events'
const TAB_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`

let channel: BroadcastChannel | null = null
let listeners: AuthEventCallback[] = []
let isBroadcasting = false

export function initAuthBroadcast (): void {
  if (channel) {
    return
  }

  if (typeof BroadcastChannel === 'undefined') {
    console.warn('[AuthBroadcast] BroadcastChannel not supported')
    return
  }

  channel = new BroadcastChannel(CHANNEL_NAME)

  channel.addEventListener('message', (event: MessageEvent<AuthBroadcastMessage>) => {
    if (!event.data || typeof event.data.type !== 'string') {
      return
    }
    const { type, tabId } = event.data
    if (tabId === TAB_ID) {
      return
    }
    if (type !== 'LOGOUT' && type !== 'SESSION_EXPIRED') {
      return
    }

    for (const listener of listeners) {
      try {
        listener(type)
      } catch (error) {
        console.error('[AuthBroadcast] Listener error:', error)
      }
    }
  })
}

export function broadcastAuthEvent (event: AuthEvent): boolean {
  if (!channel) {
    return false
  }
  if (isBroadcasting) {
    return false
  }

  isBroadcasting = true

  try {
    channel.postMessage({
      type: event,
      tabId: TAB_ID,
      timestamp: Date.now(),
    } satisfies AuthBroadcastMessage)
    return true
  } catch {
    return false
  } finally {
    setTimeout(() => {
      isBroadcasting = false
    }, 100)
  }
}

export function onAuthBroadcast (callback: AuthEventCallback): void {
  listeners.push(callback)
}

export function offAuthBroadcast (callback: AuthEventCallback): void {
  listeners = listeners.filter(cb => cb !== callback)
}

export function closeAuthBroadcast (): void {
  if (channel) {
    channel.close()
    channel = null
    listeners = []
  }
}
