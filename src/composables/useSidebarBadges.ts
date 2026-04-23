import type { ModerationStats } from '@/api/moderation'

import { onUnmounted, ref } from 'vue'

import { fetchMyInvitations } from '@/api/invitations'
import { fetchModerationStats } from '@/api/moderation'
import { allUserTenants, useAuthStore } from '@/stores/auth'

const inReviewCount = ref(0)
const openReportsCount = ref(0)
const pendingInvitationsCount = ref(0)

let intervalId: ReturnType<typeof setInterval> | null = null
let subscriberCount = 0

async function refresh () {
  const authStore = useAuthStore()
  if (!authStore.isAuthenticated) {
    return
  }

  // Pick a tenant the caller can actually query stats for. Superadmin keeps
  // the legacy 'earnlumens' default; everyone else uses the first tenant the
  // JWT grants access to (so a moderator of `anime` sees anime's badges and
  // doesn't 403 against 'earnlumens').
  const tenantForStats = authStore.user?.role === 'SUPERADMIN'
    ? 'earnlumens'
    : (allUserTenants(authStore.user)[0] ?? null)

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
  }

  onUnmounted(() => {
    subscriberCount--
    if (subscriberCount === 0 && intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  })

  return { inReviewCount, openReportsCount, pendingInvitationsCount, refresh }
}
