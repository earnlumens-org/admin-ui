/**
 * useTenantSettings.ts
 *
 * Shared loader / saver for the owner-facing settings sub-pages
 * (general / wallet / branding / languages). Each page wires a tiny
 * draft against a subset of TenantSummary; this composable centralises
 * the loadTenant + updateMyTenant + snackbar boilerplate so the pages
 * stay focused on their own field set.
 */

import { onMounted, ref, watch } from 'vue'
import {
  getMyTenant,
  getOwnedTenant,
  TenantApiError,
  type TenantSummary,
  updateMyTenant,
  type UpdateTenantSettingsPayload,
} from '@/api/tenants'
import { useAuthStore } from '@/stores/auth'

export function useTenantSettings () {
  const authStore = useAuthStore()
  const tenant = ref<TenantSummary | null>(null)
  const loading = ref(false)
  const loadError = ref<string | null>(null)
  const saving = ref(false)

  const snackbar = ref(false)
  const snackbarText = ref('')
  const snackbarColor = ref('')

  function showSnackbar (text: string, color: string) {
    snackbarText.value = text
    snackbarColor.value = color
    snackbar.value = true
  }

  async function loadTenant () {
    loading.value = true
    loadError.value = null
    try {
      // Prefer the tenant currently selected in the top-right switcher.
      // Falling back to /me would mis-target owners of multiple tenants
      // because /me returns whichever tenant the owner-index surfaces
      // first — making theme/banner/brand edits leak to the wrong tenant.
      const activeId = authStore.activeTenantId
      if (activeId) {
        tenant.value = await getOwnedTenant(activeId)
      } else {
        tenant.value = await getMyTenant()
      }
    } catch (error) {
      loadError.value = error instanceof TenantApiError ? error.code : 'Failed to load tenant'
    } finally {
      loading.value = false
    }
  }

  /**
   * Pushes a diff payload to the server. Returns the fresh tenant on
   * success so the caller can re-snapshot its draft, or `null` on
   * failure (already surfaced via snackbar).
   */
  async function saveTenant (
    payload: UpdateTenantSettingsPayload,
    successMessage = 'Settings saved',
  ): Promise<TenantSummary | null> {
    if (!tenant.value) {
      return null
    }
    if (Object.keys(payload).length === 0) {
      return tenant.value
    }

    saving.value = true
    try {
      const updated = await updateMyTenant(tenant.value.id, payload)
      tenant.value = updated
      showSnackbar(successMessage, 'success')
      return updated
    } catch (error) {
      const msg = error instanceof TenantApiError
        ? `Save failed: ${error.code}`
        : 'Save failed'
      showSnackbar(msg, 'error')
      return null
    } finally {
      saving.value = false
    }
  }

  onMounted(loadTenant)

  // Re-load whenever the user switches the active tenant in the top-right
  // selector. Without this the settings pages keep showing (and saving to)
  // the previously loaded tenant even after the switcher changes.
  watch(() => authStore.activeTenantId, (next, prev) => {
    if (next !== prev) {
      loadTenant()
    }
  })

  return {
    tenant,
    loading,
    loadError,
    saving,
    snackbar,
    snackbarText,
    snackbarColor,
    showSnackbar,
    loadTenant,
    saveTenant,
  }
}
