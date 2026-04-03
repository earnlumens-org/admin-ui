/**
 * main.ts
 *
 * Bootstraps Vuetify and other plugins then mounts the App
 * Initializes security infrastructure: token worker, auth broadcast, session rehydration
 */

import { createApp } from 'vue'
import { registerPlugins } from '@/plugins'
import App from './App.vue'
import { useAuthStore, parseUserFromToken } from '@/stores/auth'
import { initTokenWorker, refreshToken, clearToken, onSessionExpired } from '@/services/tokenWorkerClient'
import { initAuthBroadcast, broadcastAuthEvent, onAuthBroadcast } from '@/services/authBroadcast'

import 'unfonts.css'

const app = createApp(App)
registerPlugins(app)

/**
 * Rehydrate session on page load.
 * Attempts to refresh access token using HttpOnly cookie via the Web Worker.
 * MUST complete before router navigation to protected routes.
 */
async function rehydrateSession(): Promise<void> {
  const authStore = useAuthStore()

  try {
    await initTokenWorker()

    const result = await refreshToken()
    if (result.success && result.accessToken) {
      const userProfile = parseUserFromToken(result.accessToken)
      if (userProfile) {
        authStore.setUser(userProfile)
      } else {
        authStore.setAuthenticated(true)
      }
    } else {
      authStore.setAuthenticated(false)
    }
  } catch {
    authStore.setAuthenticated(false)
  } finally {
    authStore.setAuthReady(true)
  }
}

// Handle session expiration from the worker (refresh cookie expired/invalid)
onSessionExpired(async () => {
  const authStore = useAuthStore()
  if (!authStore.isAuthenticated) return

  await clearToken()
  broadcastAuthEvent('SESSION_EXPIRED')
  window.location.assign('/')
})

// Handle auth events from other tabs (logout or session expired)
onAuthBroadcast(async () => {
  const authStore = useAuthStore()
  if (!authStore.isAuthenticated) return

  await clearToken()
  window.location.assign('/')
})

async function initApp() {
  initAuthBroadcast()
  await rehydrateSession()
  app.mount('#app')
}

initApp()
