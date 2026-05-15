<template>
  <v-container class="pa-4 pa-sm-6" fluid>
    <v-breadcrumbs
      class="px-0 pt-0"
      :items="[{ title: 'earnlumens', disabled: true }, { title: 'settings', disabled: true }]"
    />

    <div class="text-h6 mb-1">Settings</div>
    <div class="text-body-2 text-medium-emphasis mb-4">
      Tenant configuration
    </div>

    <v-tabs v-model="activeTab" class="mb-4" color="primary">
      <v-tab value="general">General</v-tab>
      <v-tab v-if="isSuperadmin" value="languages">
        <v-icon start>mdi-translate</v-icon>
        Languages
      </v-tab>
    </v-tabs>

    <v-divider class="mb-4" />

    <v-window v-model="activeTab">
      <v-window-item value="general">
        <v-card v-if="loading" class="pa-8 text-center" variant="tonal">
          <v-progress-circular color="primary" indeterminate />
        </v-card>

        <v-alert
          v-else-if="loadError"
          border="start"
          class="mb-4"
          type="error"
          variant="tonal"
        >
          {{ loadError }}
          <template #append>
            <v-btn size="small" variant="text" @click="loadTenant">Retry</v-btn>
          </template>
        </v-alert>

        <v-card v-else-if="!tenant" class="pa-8 text-center" variant="tonal">
          <v-icon color="medium-emphasis" size="48">mdi-domain-off</v-icon>
          <div class="text-body-1 mt-4">No tenant to configure.</div>
          <div class="text-body-2 text-medium-emphasis mt-1">
            Create your tenant from the Tenants page first.
          </div>
        </v-card>

        <v-form v-else ref="form" v-model="formValid" @submit.prevent="save">
        <v-row>
          <v-col cols="12" md="6">
            <v-card>
              <v-card-item>
                <v-card-title>General</v-card-title>
                <v-card-subtitle>Display name and description</v-card-subtitle>
              </v-card-item>
              <v-card-text>
                <v-text-field
                  v-model="draft.title"
                  class="mb-2"
                  density="comfortable"
                  label="Tenant name"
                  maxlength="80"
                  :rules="[rules.titleRequired, rules.titleLength]"
                  variant="outlined"
                />
                <v-textarea
                  v-model="draft.description"
                  density="comfortable"
                  label="Description"
                  maxlength="280"
                  rows="3"
                  :rules="[rules.descLength]"
                  variant="outlined"
                />
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" md="6">
            <v-card>
              <v-card-item>
                <v-card-title>Subdomain</v-card-title>
                <v-card-subtitle>Immutable after creation</v-card-subtitle>
              </v-card-item>
              <v-card-text>
                <v-text-field
                  density="comfortable"
                  disabled
                  label="URL"
                  :model-value="`${tenant.subdomain}.earnlumens.org`"
                  variant="outlined"
                />
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" md="6">
            <v-card>
              <v-card-item>
                <v-card-title>Storefront brand</v-card-title>
                <v-card-subtitle>Texto que aparece junto al logo</v-card-subtitle>
              </v-card-item>
              <v-card-text>
                <v-text-field
                  v-model="draft.brandText"
                  density="comfortable"
                  hint="Déjalo vacío para usar el nombre del tenant."
                  label="Brand text"
                  maxlength="60"
                  persistent-hint
                  :rules="[rules.brandTextLength]"
                  variant="outlined"
                />
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" md="6">
            <v-card>
              <v-card-item>
                <v-card-title>Wallet</v-card-title>
                <v-card-subtitle>Stellar wallet for receiving payments</v-card-subtitle>
              </v-card-item>
              <v-card-text>
                <v-text-field
                  v-model.trim="draft.tenantWallet"
                  density="comfortable"
                  label="Stellar wallet address"
                  placeholder="GABC...XYZ"
                  :rules="[rules.walletRequired, rules.walletFormat]"
                  variant="outlined"
                />
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" md="6">
            <v-card>
              <v-card-item>
                <v-card-title>Tenant fee</v-card-title>
                <v-card-subtitle>Your cut on each sale (0–30%)</v-card-subtitle>
              </v-card-item>
              <v-card-text>
                <v-text-field
                  v-model="draft.tenantFeePercent"
                  density="comfortable"
                  label="Tenant fee %"
                  :rules="[rules.feeFormat, rules.feeRange]"
                  suffix="%"
                  variant="outlined"
                />
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" md="6">
            <v-card>
              <v-card-item>
                <v-card-title>Platform fee</v-card-title>
                <v-card-subtitle>Set by the platform</v-card-subtitle>
              </v-card-item>
              <v-card-text>
                <v-text-field
                  density="comfortable"
                  disabled
                  label="Platform fee %"
                  :model-value="tenant.platformFeePercent"
                  suffix="%"
                  variant="outlined"
                />
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12">
            <v-card>
              <v-card-item>
                <v-card-title>Preview</v-card-title>
                <v-card-subtitle>Vista previa de la barra superior del storefront</v-card-subtitle>
              </v-card-item>
              <v-card-text>
                <div class="d-flex flex-column flex-md-row ga-4">
                  <div class="preview-shell flex-grow-1">
                    <div class="text-caption text-medium-emphasis mb-1">Desktop</div>
                    <div class="preview-frame preview-desktop">
                      <div class="preview-appbar">
                        <span class="preview-menu">
                          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z" fill="currentColor" /></svg>
                        </span>
                        <span aria-hidden="true" class="ml-3 app-logo" v-html="storefrontLogoSvg" />
                        <span class="preview-brand"><b class="pl-1 font-weight-bold text-button">{{ previewBrand }}</b></span>
                      </div>
                    </div>
                  </div>
                  <div class="preview-shell">
                    <div class="text-caption text-medium-emphasis mb-1">Mobile</div>
                    <div class="preview-frame preview-mobile">
                      <div class="preview-appbar">
                        <span class="preview-menu">
                          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z" fill="currentColor" /></svg>
                        </span>
                        <span aria-hidden="true" class="ml-3 app-logo" v-html="storefrontLogoSvg" />
                        <span class="preview-brand"><b class="pl-1 font-weight-bold text-button">{{ previewBrand }}</b></span>
                      </div>
                    </div>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

          <div class="d-flex justify-end ga-2 mt-4">
            <v-btn :disabled="!isDirty || saving" variant="text" @click="reset">
              Discard
            </v-btn>
            <v-btn
              color="primary"
              :disabled="!isDirty || !formValid"
              :loading="saving"
              type="submit"
              variant="flat"
            >
              Save changes
            </v-btn>
          </div>
        </v-form>
      </v-window-item>

      <v-window-item v-if="isSuperadmin" value="languages">
        <SettingsLanguages @notify="showSnackbar" />
      </v-window-item>
    </v-window>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000">
      {{ snackbarText }}
    </v-snackbar>
  </v-container>
</template>

<script lang="ts" setup>
  import { computed, onMounted, reactive, ref } from 'vue'
  import SettingsLanguages from '@/components/SettingsLanguages.vue'
  import storefrontLogo from '@/assets/storefront-logo.svg?raw'
  import {
    getMyTenant,
    TenantApiError,
    type TenantSummary,
    type UpdateTenantSettingsPayload,
    updateMyTenant,
  } from '@/api/tenants'
  import { useAuthStore } from '@/stores/auth'

  const storefrontLogoSvg = storefrontLogo

  const authStore = useAuthStore()
  const isSuperadmin = computed(() => authStore.user?.role === 'SUPERADMIN')
  const activeTab = ref('general')

  const tenant = ref<TenantSummary | null>(null)
  const loading = ref(false)
  const loadError = ref<string | null>(null)
  const saving = ref(false)
  const formValid = ref(true)
  const form = ref<any>(null)

  const snackbar = ref(false)
  const snackbarText = ref('')
  const snackbarColor = ref('')

  const draft = reactive({
    title: '',
    description: '',
    logoR2Key: '',
    brandText: '',
    tenantWallet: '',
    tenantFeePercent: '',
  })

  /**
   * Live preview label — mirrors the storefront fallback chain so the
   * admin sees the exact text users will see: brandText override → tenant
   * title → hardcoded EARNLUMENS brand.
   */
  const previewBrand = computed(() => {
    const override = draft.brandText.trim()
    if (override) return override
    const title = draft.title.trim()
    if (title) return title
    return 'EARNLUMENS'
  })

  const isDirty = computed(() => {
    if (!tenant.value) return false
    return draft.title !== (tenant.value.title ?? '')
      || draft.description !== (tenant.value.description ?? '')
      || draft.logoR2Key !== (tenant.value.logoR2Key ?? '')
      || draft.brandText !== (tenant.value.brandText ?? '')
      || draft.tenantWallet !== (tenant.value.tenantWallet ?? '')
      || draft.tenantFeePercent !== (tenant.value.tenantFeePercent ?? '')
  })

  const WALLET_RE = /^G[A-Z2-7]{55}$/
  const FEE_RE = /^\d{1,2}(\.\d{1,2})?$/

  const rules = {
    titleRequired: (v: string) => (v && v.trim().length > 0) || 'Required',
    titleLength: (v: string) => (v && v.length >= 2 && v.length <= 80) || 'Between 2 and 80 characters',
    descLength: (v: string) => (!v || v.length <= 280) || 'Up to 280 characters',
    brandTextLength: (v: string) => (!v || v.length <= 60) || 'Up to 60 characters',
    walletRequired: (v: string) => (v && v.trim().length > 0) || 'Required',
    walletFormat: (v: string) => WALLET_RE.test(v ?? '') || 'Invalid Stellar address',
    feeFormat: (v: string) => FEE_RE.test(v ?? '') || 'Use a number like 12.50',
    feeRange: (v: string) => {
      const n = Number(v)
      return (Number.isFinite(n) && n >= 0 && n <= 30) || '0–30 allowed'
    },
  }

  function snapshotIntoDraft (t: TenantSummary) {
    draft.title = t.title ?? ''
    draft.description = t.description ?? ''
    draft.logoR2Key = t.logoR2Key ?? ''
    draft.brandText = t.brandText ?? ''
    draft.tenantWallet = t.tenantWallet ?? ''
    draft.tenantFeePercent = t.tenantFeePercent ?? ''
  }

  function reset () {
    if (tenant.value) snapshotIntoDraft(tenant.value)
  }

  async function loadTenant () {
    loading.value = true
    loadError.value = null
    try {
      const t = await getMyTenant()
      tenant.value = t
      if (t) snapshotIntoDraft(t)
    } catch (error) {
      loadError.value = error instanceof TenantApiError ? error.code : 'Failed to load tenant'
    } finally {
      loading.value = false
    }
  }

  function showSnackbar (text: string, color: string) {
    snackbarText.value = text
    snackbarColor.value = color
    snackbar.value = true
  }

  function diffPayload () {
    if (!tenant.value) return null
    const out: UpdateTenantSettingsPayload = {}
    if (draft.title !== (tenant.value.title ?? '')) out.title = draft.title.trim()
    if (draft.description !== (tenant.value.description ?? '')) out.description = draft.description.trim()
    if (draft.logoR2Key !== (tenant.value.logoR2Key ?? '')) out.logoR2Key = draft.logoR2Key.trim()
    // brandText is sent raw (including empty string) so the server can clear
    // the override and fall back to the tenant title automatically.
    if (draft.brandText !== (tenant.value.brandText ?? '')) out.brandText = draft.brandText.trim()
    if (draft.tenantWallet !== (tenant.value.tenantWallet ?? '')) out.tenantWallet = draft.tenantWallet.trim()
    if (draft.tenantFeePercent !== (tenant.value.tenantFeePercent ?? '')) out.tenantFeePercent = draft.tenantFeePercent
    return out
  }

  async function save () {
    if (!tenant.value) return
    const valid = await form.value?.validate?.()
    if (valid && valid.valid === false) return

    const payload = diffPayload()
    if (!payload || Object.keys(payload).length === 0) return

    saving.value = true
    try {
      const updated = await updateMyTenant(tenant.value.id, payload)
      tenant.value = updated
      snapshotIntoDraft(updated)
      showSnackbar('Settings saved', 'success')
    } catch (error) {
      const msg = error instanceof TenantApiError
        ? `Save failed: ${error.code}`
        : 'Save failed'
      showSnackbar(msg, 'error')
    } finally {
      saving.value = false
    }
  }

  onMounted(loadTenant)
</script>

<style scoped>
/*
 * Storefront app-bar preview. The DOM and the icon-sizing classes mirror
 * media-store-ui's AppBar (24x24 logo, ml-3 spacing, font-weight-bold
 * text-button label) so the admin sees the exact visual result of their
 * brandText edit instead of an approximation.
 */
.preview-shell { min-width: 0; }

.preview-frame {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 8px;
  overflow: hidden;
  background: rgb(var(--v-theme-surface));
}

.preview-desktop { width: 100%; max-width: 1100px; }
.preview-mobile { width: 360px; max-width: 100%; }

.preview-appbar {
  display: flex;
  align-items: center;
  height: 64px;
  padding: 0 16px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
}

.preview-menu {
  display: inline-flex;
  width: 24px;
  height: 24px;
  color: rgb(var(--v-theme-on-surface));
}

.preview-menu :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
}

.preview-appbar .app-logo {
  display: inline-flex;
  width: 24px;
  height: 24px;
}

.preview-appbar .app-logo :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
}

.preview-brand {
  display: inline-flex;
  align-items: center;
  margin-left: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
