import { ref } from 'vue'
import { type AccessibleTenant, fetchAccessibleTenants } from '@/api/tenants'
import { useAuthStore } from '@/stores/auth'

/**
 * Process-wide cache of accessible-tenant labels. The list is small (one row
 * per owned + moderated tenant) and changes rarely, so we fetch it once per
 * session and let any consumer subscribe to the same `ref`.
 *
 * The cache resets on logout via `clear()` so that signing in as a different
 * user never sees the previous user's labels.
 */
const tenants = ref<AccessibleTenant[]>([])
const loaded = ref(false)
let inflight: Promise<void> | null = null

async function load (): Promise<void> {
  if (loaded.value) return
  if (inflight) return inflight
  const auth = useAuthStore()
  if (!auth.isAuthenticated) return

  inflight = fetchAccessibleTenants()
    .then(rows => {
      tenants.value = rows
      loaded.value = true
    })
    .catch(() => {
      // best-effort: leave cache empty so callers fall back to ids
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}

function clear () {
  tenants.value = []
  loaded.value = false
  inflight = null
}

function labelFor (tenantId: string): string {
  if (tenantId === 'earnlumens') return 'earnlumens (root)'
  const match = tenants.value.find(t => t.id === tenantId)
  return match?.title ? match.title : tenantId
}

export function useTenantLabels () {
  void load()
  return { tenants, loaded, labelFor, refresh: () => { loaded.value = false; return load() }, clear }
}
