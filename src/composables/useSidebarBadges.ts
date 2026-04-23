import type { ModerationStats } from '@/api/moderation'

import { onUnmounted, ref, watch } from 'vue'

import { fetchMyInvitations } from '@/api/invitations'
import { fetchModerationStats } from '@/api/moderation'
import { allUserTenants, useAuthStore } from '@/stores/auth'

const inReviewCount = ref(0)
const openReportsCount = ref(0)
const pendingInvitationsCount = ref(0)

let intervalId: ReturnType<typeof setInterval> | null = null
let unwatchTenant: (() => void) | null = null
let subscriberCount = 0

/**
 * Resolve which tenant to query stats for. Mirrors the global tenant context
 * (top-right TenantSwitcher) so the sidebar badge always reflects whatever
 * the rest of the UI is showing — i.e. the count is accountable: clicking
 * the link lands on a queue with the same number of items.
 *
 * Falls back to 'earnlumens' for SUPERADMIN (legacy root tenant) and to the
 * first JWT-granted tenant for everyone else, so the badge still works on
 * the very first render before the switcher has hydrated activeTenantId.
 */
function resolveTenantForStats (authStore: ReturnType<typeof useAuthStore>): string | null {
  if (authStore.activeTenantId) return authStore.activeTenantId
  if (authStore.user?.role === 'SUPERADMIN') return 'earnlumens'
  return allUserTenants(authStore.user)[0] ?? null
}

async function refresh () {
  const authStore = useAuthStore()
  if (!authStore.isAuthenticated) {
    return
  }

  const tenantForStats = resolveTenantForStats(authStore)

  if (tenantForStats) {
    try {
      const stats: ModerationStats = await fetchModerationStats(tenantForStats)
      inReviewCount.value = stats.inReview ?? 0
      openReportsCount.value = stats.openReports ?? 0
    } catch {
      // silent — sidebar badges are best-effort
    }
  } else {
    inReviewCount.value = 0
    openReportsCount.value = 0
  }

  try {
    const invites = await fetchMyInvitations()
    pendingInvitationsCount.value = invites.length
  } catch {
    // silent — sidebar badges are best-effort
  }
}

export function useSidebarBadges () {
  subscriberCount++

  if (subscriberCount === 1) {
    refresh()
    intervalId = setInterval(refresh, 30_000)
    // Re-query stats whenever the global tenant context flips, so the badge
    // and the page contents always agree on which tenant is being shown.
    const authStore = useAuthStore()
    unwatchTenant = watch(() => authStore.activeTenantId, () => {
      // Reset to 0 first to avoid showing stale counts from the previous
      // tenant during the in-flight request.
      inReviewCount.value = 0
      openReportsCount.value = 0
      refresh()
    })
  }

  onUnmounted(() => {
    subscriberCount--
    if (subscriberCount === 0) {
      if (intervalId) {
        clearInterval(intervalId)
        intervalId = null
      }
      if (unwatchTenant) {
        unwatchTenant()
        unwatchTenant = null
      }
    }
  })

  return { inReviewCount, openReportsCount, pendingInvitationsCount, refresh }
}
