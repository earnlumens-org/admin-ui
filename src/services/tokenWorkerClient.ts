/**
 * Token Worker Client - Bridge between main thread and token worker.
 * Provides promise-based API for token operations.
 * The access token is requested from the Worker on demand, never stored in main thread state.
 */

import { broadcastAuthEvent } from './authBroadcast'

interface TokenResultPayload { accessToken: string | null, valid: boolean }
interface RefreshResultPayload { success: boolean, accessToken?: string }

interface TokenResultMessage { type: 'TOKEN_RESULT', payload: TokenResultPayload }
interface TokenSetMessage { type: 'TOKEN_SET', payload: { success: boolean } }
interface RefreshResultMessage { type: 'REFRESH_RESULT', payload: RefreshResultPayload }
interface SessionExpiredMessage { type: 'SESSION_EXPIRED' }
interface TokenClearedMessage { type: 'TOKEN_CLEARED' }
interface WorkerReadyMessage { type: 'WORKER_READY' }
interface ErrorMessage { type: 'ERROR', payload: { message: string } }

type WorkerMessage
  = | TokenResultMessage
    | TokenSetMessage
    | RefreshResultMessage
    | SessionExpiredMessage
    | TokenClearedMessage
    | WorkerReadyMessage
    | ErrorMessage

type SessionExpiredCallback = () => void

let worker: Worker | null = null
let workerReady = false
let sessionExpiredCallbacks: SessionExpiredCallback[] = []

let pendingGetTokenResolvers: Array<(result: TokenResultPayload) => void> = []
let pendingSetToken: ((success: boolean) => void) | null = null
let pendingRefresh: ((result: RefreshResultPayload) => void) | null = null
let pendingClear: (() => void) | null = null

function handleWorkerMessage (event: MessageEvent<WorkerMessage>) {
  const { type } = event.data

  switch (type) {
    case 'WORKER_READY': {
      workerReady = true
      break
    }

    case 'TOKEN_RESULT': {
      const resolvers = pendingGetTokenResolvers
      pendingGetTokenResolvers = []
      for (const resolve of resolvers) {
        resolve(event.data.payload)
      }
      break
    }

    case 'TOKEN_SET': {
      if (pendingSetToken) {
        pendingSetToken(event.data.payload.success)
        pendingSetToken = null
      }
      break
    }

    case 'REFRESH_RESULT': {
      if (pendingRefresh) {
        pendingRefresh(event.data.payload)
        pendingRefresh = null
      }
      break
    }

    case 'TOKEN_CLEARED': {
      if (pendingClear) {
        pendingClear()
        pendingClear = null
      }
      break
    }

    case 'SESSION_EXPIRED': {
      for (const cb of sessionExpiredCallbacks) {
        cb()
      }
      break
    }

    case 'ERROR': {
      console.error('[TokenWorker]', event.data.payload.message)
      break
    }
  }
}

export function initTokenWorker (): Promise<void> {
  return new Promise((resolve, reject) => {
    if (worker) {
      resolve()
      return
    }

    try {
      worker = new Worker(
        new URL('../workers/tokenWorker.ts', import.meta.url),
        { type: 'module' },
      )

      worker.addEventListener('message', (event: MessageEvent<WorkerMessage>) => {
        if (event.data.type === 'WORKER_READY') {
          workerReady = true
          resolve()
        }
        handleWorkerMessage(event)
      })

      worker.addEventListener('error', error => {
        console.error('[TokenWorker] Error:', error)
        reject(error)
      })

      setTimeout(() => {
        if (!workerReady) {
          reject(new Error('Worker initialization timeout'))
        }
      }, 5000)
    } catch (error) {
      reject(error)
    }
  })
}

export function setToken (accessToken: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    if (!worker) {
      reject(new Error('Worker not initialized'))
      return
    }

    pendingSetToken = resolve
    worker.postMessage({ type: 'SET_TOKEN', payload: { accessToken } })

    setTimeout(() => {
      if (pendingSetToken) {
        pendingSetToken = null
        reject(new Error('Set token timeout'))
      }
    }, 5000)
  })
}

export function getToken (): Promise<TokenResultPayload> {
  return new Promise((resolve, reject) => {
    if (!worker) {
      reject(new Error('Worker not initialized'))
      return
    }

    const isFirstPending = pendingGetTokenResolvers.length === 0
    pendingGetTokenResolvers.push(resolve)

    if (isFirstPending) {
      worker.postMessage({ type: 'GET_TOKEN' })
    }

    const timeoutId = setTimeout(() => {
      const idx = pendingGetTokenResolvers.indexOf(resolve)
      if (idx !== -1) {
        pendingGetTokenResolvers.splice(idx, 1)
        reject(new Error('Get token timeout'))
      }
    }, 10_000)

    const originalResolve = resolve
    pendingGetTokenResolvers[pendingGetTokenResolvers.indexOf(originalResolve)] = result => {
      clearTimeout(timeoutId)
      originalResolve(result)
    }
  })
}

export function refreshToken (): Promise<RefreshResultPayload> {
  return new Promise((resolve, reject) => {
    if (!worker) {
      reject(new Error('Worker not initialized'))
      return
    }

    pendingRefresh = resolve
    worker.postMessage({ type: 'REFRESH_TOKEN' })

    setTimeout(() => {
      if (pendingRefresh) {
        pendingRefresh = null
        reject(new Error('Refresh timeout'))
      }
    }, 15_000)
  })
}

export function clearToken (): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!worker) {
      reject(new Error('Worker not initialized'))
      return
    }

    pendingClear = resolve
    worker.postMessage({ type: 'CLEAR_TOKEN' })

    setTimeout(() => {
      if (pendingClear) {
        pendingClear = null
        reject(new Error('Clear token timeout'))
      }
    }, 5000)
  })
}

export function onSessionExpired (callback: SessionExpiredCallback): () => void {
  sessionExpiredCallbacks.push(callback)
  return () => {
    sessionExpiredCallbacks = sessionExpiredCallbacks.filter(cb => cb !== callback)
  }
}

export function isWorkerReady (): boolean {
  return workerReady
}

export function broadcastLogout (): void {
  broadcastAuthEvent('LOGOUT')
}
