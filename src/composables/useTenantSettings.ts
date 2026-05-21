/**
 * useTenantSettings.ts
 *
 * Shared loader / saver for the owner-facing settings sub-pages
 * (general / wallet / branding / languages). Each page wires a tiny
 * draft against a subset of TenantSummary; this composable centralises
 * the loadTenant + updateMyTenant + snackbar boilerplate so the pages
 * stay focused on their own field set.
 */

import { onMounted, ref } from 'vue'
import {
  getMyTenant,
  TenantApiError,
  type TenantSummary,
  updateMyTenant,
  type UpdateTenantSettingsPayload,
} from '@/api/tenants'

export function useTenantSettings () {
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
      tenant.value = await getMyTenant()
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
