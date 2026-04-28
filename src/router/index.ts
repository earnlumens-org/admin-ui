/**
 * router/index.ts
 *
 * Automatic routes for ./src/pages/*.vue
 */

// Composables
import { createRouter, createWebHistory } from 'vue-router'
import { routes } from 'vue-router/auto-routes'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

const publicPaths = new Set(['/', '/oauth2/callback'])

function waitForAuthReady (authStore: ReturnType<typeof useAuthStore>): Promise<void> {
  if (authStore.isAuthReady) {
    return Promise.resolve()
  }
  return new Promise(resolve => {
    const unsubscribe = authStore.$subscribe((_mutation, state) => {
      if (state.isAuthReady) {
        unsubscribe()
        resolve()
      }
    })
  })
}

router.beforeEach(async to => {
  if (publicPaths.has(to.path)) {
    return true
  }

  const authStore = useAuthStore()
  await waitForAuthReady(authStore)

  if (!authStore.isAuthenticated) {
    return '/'
  }
  return true
})

// Mitigation for Vite/browser ESM cache: when a dynamic chunk fails to
// load (typically after a dev server restart, a deploy that purged the
// old hashed chunks, or a navigation that cancelled the import) the
// browser caches the rejected import() promise per ESM spec. Every
// subsequent click on the same route would silently fail. Force a hard
// reload so the next request picks up fresh module URLs.
function isDynamicImportError (err: unknown): boolean {
  if (!(err instanceof Error)) {
    return false
  }
  const msg = err.message || ''
  return /Failed to fetch dynamically imported module/i.test(msg)
    || /error loading dynamically imported module/i.test(msg)
    || /Importing a module script failed/i.test(msg)
}

router.onError((err, to) => {
  if (!isDynamicImportError(err)) {
    return
  }
  // Avoid an infinite reload loop if the same route keeps failing.
  const key = 'el_chunk_reload'
  const last = sessionStorage.getItem(key)
  const target = to?.fullPath ?? window.location.pathname
  if (last === target) {
    sessionStorage.removeItem(key)
    return
  }
  sessionStorage.setItem(key, target)
  window.location.assign(target)
})

export default router
