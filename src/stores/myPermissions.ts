import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { fetchMyPermissions, type MyPermissions, NO_PERMISSIONS } from '@/api/permissions'
import { useAuthStore } from '@/stores/auth'

/**
 * Per-tenant cache of "what can I do here?" answered by the backend.
 *
 * <h2>Why a store and not just a composable?</h2>
 * Several screens need the same answer concurrently (the moderator action
 * dialog, the Credentials tab, the dashboard quick actions, …) and the
 * answer changes <em>asynchronously</em> when the tenant owner toggles a
 * flag. A single shared store ensures every consumer reacts to the same
 * snapshot and a refresh from one screen benefits the rest.
 *
 * <h2>Newly-granted detection</h2>
 * The previous snapshot is persisted in {@code localStorage} keyed by
 * {@code (oauthUserId, tenantId)}. Each load diffs the new snapshot
 * against the stored one and queues a banner if any flag flipped from
 * {@code false → true}. Revocations (true → false) are also detected so
 * the UI can warn the moderator their authority was reduced — losing a
 * capability silently is just as confusing as gaining one silently.
 *
 * The diff is only emitted once per change: {@link acknowledgeNotification}
 * persists the new snapshot so reloading the same screen never re-fires
 * the toast.
 */

const STORAGE_PREFIX = 'earnlumens.modPerms.v1'

export interface PermissionDelta {
  tenantId: string
  granted: (keyof MyPermissions)[]
  revoked: (keyof MyPermissions)[]
}

const ALL_FLAGS: (keyof MyPermissions)[] = [
  'canManualPermaBan',
  'canClearStrikes',
  'canVerifyCreators',
  'canManageAmbassadors',
  'canViewTenantAudit',
]

function snapshotKey (oauthUserId: string, tenantId: string): string {
  return `${STORAGE_PREFIX}.${oauthUserId}.${tenantId}`
}

function readSnapshot (oauthUserId: string, tenantId: string): MyPermissions | null {
  try {
    const raw = localStorage.getItem(snapshotKey(oauthUserId, tenantId))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    // Defensive read — schema may be expanded later; treat any missing
    // flag as false so a freshly-introduced flag is announced exactly
    // once (the very first time it shows up granted).
    return {
      canManualPermaBan: !!parsed.canManualPermaBan,
      canClearStrikes: !!parsed.canClearStrikes,
      canVerifyCreators: !!parsed.canVerifyCreators,
      canManageAmbassadors: !!parsed.canManageAmbassadors,
      canViewTenantAudit: !!parsed.canViewTenantAudit,
    }
  } catch {
    return null
  }
}

function writeSnapshot (oauthUserId: string, tenantId: string, perms: MyPermissions) {
  try {
    localStorage.setItem(snapshotKey(oauthUserId, tenantId), JSON.stringify(perms))
  } catch {
    // ignore — storage may be unavailable
  }
}

export const useMyPermissionsStore = defineStore('myPermissions', () => {
  const authStore = useAuthStore()
  /** {tenantId → flags} — only includes tenants we've fetched in this session. */
  const cache = ref<Record<string, MyPermissions>>({})
  const loading = ref(false)
  /** Latest grant/revoke delta detected; cleared by acknowledgeNotification(). */
  const pendingDelta = ref<PermissionDelta | null>(null)

  /** Synchronous access — returns the cached set or the safe baseline. */
  function permissionsFor (tenantId: string | null): MyPermissions {
    if (!tenantId) return { ...NO_PERMISSIONS }
    return cache.value[tenantId] ?? { ...NO_PERMISSIONS }
  }

  /** Reactive accessor for the active tenant. */
  const active = computed<MyPermissions>(() => permissionsFor(authStore.activeTenantId))

  async function loadFor (tenantId: string | null): Promise<MyPermissions> {
    if (!tenantId) return { ...NO_PERMISSIONS }
    loading.value = true
    try {
      const next = await fetchMyPermissions(tenantId)
      const oauthUserId = authStore.user?.oauthUserId
      if (oauthUserId) {
        const previous = readSnapshot(oauthUserId, tenantId)
        // Skip the diff on the very first load (previous == null) — we have
        // no baseline to compare against, and announcing every existing
        // capability on first sign-in would be noise, not a notification.
        if (previous) {
          const granted: (keyof MyPermissions)[] = []
          const revoked: (keyof MyPermissions)[] = []
          for (const key of ALL_FLAGS) {
            if (!previous[key] && next[key]) granted.push(key)
            else if (previous[key] && !next[key]) revoked.push(key)
          }
          if (granted.length || revoked.length) {
            pendingDelta.value = { tenantId, granted, revoked }
          }
        }
        writeSnapshot(oauthUserId, tenantId, next)
      }
      cache.value = { ...cache.value, [tenantId]: next }
      return next
    } finally {
      loading.value = false
    }
  }

  function acknowledgeNotification () {
    pendingDelta.value = null
  }

  /** Drop in-memory state on logout. Persisted snapshots are kept so the
   *  next session for the same user does not re-announce every flag. */
  function reset () {
    cache.value = {}
    pendingDelta.value = null
    loading.value = false
  }

  return {
    cache,
    loading,
    pendingDelta,
    active,
    permissionsFor,
    loadFor,
    acknowledgeNotification,
    reset,
  }
})

/** Human label per flag — kept here so notifications and dialogs stay in sync. */
export const PERMISSION_LABELS: Record<keyof MyPermissions, string> = {
  canManualPermaBan: 'Manual permanent ban',
  canClearStrikes: 'Clear strike history',
  canVerifyCreators: 'Verify creators (Gold)',
  canManageAmbassadors: 'Manage ambassadors (Gray)',
  canViewTenantAudit: 'View tenant audit',
}
