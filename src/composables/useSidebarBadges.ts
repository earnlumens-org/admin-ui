import type { ModerationStats } from '@/api/moderation'

import { onUnmounted, ref } from 'vue'

import { fetchModerationStats } from '@/api/moderation'

const inReviewCount = ref(0)
const openReportsCount = ref(0)

let intervalId: ReturnType<typeof setInterval> | null = null
let subscriberCount = 0

async function refresh () {
  try {
    const stats: ModerationStats = await fetchModerationStats('earnlumens')
    inReviewCount.value = stats.inReview ?? 0
    openReportsCount.value = stats.openReports ?? 0
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

  return { inReviewCount, openReportsCount, refresh }
}
