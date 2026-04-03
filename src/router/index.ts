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

const publicPaths = ['/', '/oauth2/callback']

router.beforeEach((to, _from, next) => {
  if (publicPaths.includes(to.path)) {
    return next()
  }

  const authStore = useAuthStore()

  if (!authStore.isAuthReady) {
    const unsubscribe = authStore.$subscribe((_mutation, state) => {
      if (state.isAuthReady) {
        unsubscribe()
        if (state.isAuthenticated) {
          next()
        } else {
          next('/')
        }
      }
    })
    return
  }

  if (!authStore.isAuthenticated) {
    return next('/')
  }

  next()
})

export default router
