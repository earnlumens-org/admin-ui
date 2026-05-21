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
                  <v-card-title>Storefront brand</v-card-title>
                  <v-card-subtitle>Text and logos shown next to the menu</v-card-subtitle>
                </v-card-item>

                <v-card-text>
                  <!--
                  brandTextHidden is a separate flag from brandText so the
                  owner can hide the label without losing the text they
                  typed (flipping the switch back ON restores it).
                -->
                  <v-switch
                    v-model="draft.brandTextHidden"
                    class="mb-0"
                    color="primary"
                    density="comfortable"
                    hide-details
                    :label="draft.brandTextHidden ? 'Logo only (no text)' : 'Show brand text'"
                  />

                  <v-text-field
                    v-model="draft.brandText"
                    class="mt-2"
                    density="comfortable"
                    :disabled="draft.brandTextHidden"
                    :hint="draft.brandTextHidden
                      ? 'Disabled: the storefront will show only the logo.'
                      : 'Leave empty to use the tenant name.'"
                    label="Brand text"
                    maxlength="60"
                    persistent-hint
                    :rules="[rules.brandTextLength]"
                    variant="outlined"
                  />

                  <div class="mt-4">
                    <div class="text-subtitle-2 mb-1">Logo (light mode)</div>

                    <div class="text-caption text-medium-emphasis mb-3">
                      PNG or WebP, up to 512 KB. Rendered at a fixed 24px height;
                      leave empty to use the default logo.
                    </div>

                    <div class="d-flex align-center ga-3 flex-wrap">
                      <div class="logo-thumb logo-thumb--light">
                        <img v-if="previewLogoUrlLight" :alt="draft.brandText || draft.title" :src="previewLogoUrlLight">
                        <span v-else class="text-caption text-medium-emphasis">No logo</span>
                      </div>

                      <v-file-input
                        accept="image/png,image/webp"
                        class="flex-grow-1"
                        density="comfortable"
                        :disabled="logoUploading.light"
                        hide-details
                        label="Upload light logo"
                        :loading="logoUploading.light"
                        :model-value="logoFileModel.light"
                        prepend-icon=""
                        prepend-inner-icon="mdi-image-outline"
                        show-size
                        style="min-width: 200px;"
                        variant="outlined"
                        @update:model-value="(v) => onLogoFileSelected('light', v)"
                      />

                      <v-btn
                        :disabled="!draft.logoR2Key || logoUploading.light"
                        size="small"
                        variant="text"
                        @click="clearLogo('light')"
                      >
                        Remove logo
                      </v-btn>
                    </div>

                    <v-alert
                      v-if="logoError.light"
                      class="mt-3"
                      closable
                      density="compact"
                      type="error"
                      variant="tonal"
                      @click:close="logoError.light = ''"
                    >
                      {{ logoError.light }}
                    </v-alert>
                  </div>

                  <v-divider class="my-4" />

                  <div>
                    <div class="text-subtitle-2 mb-1">Logo (dark mode)</div>

                    <div class="text-caption text-medium-emphasis mb-3">
                      Optional. If left empty, the dark mode uses the light logo.
                    </div>

                    <div class="d-flex align-center ga-3 flex-wrap">
                      <div class="logo-thumb logo-thumb--dark">
                        <img v-if="previewLogoUrlDark" :alt="draft.brandText || draft.title" :src="previewLogoUrlDark">
                        <span v-else class="text-caption text-medium-emphasis">No logo</span>
                      </div>

                      <v-file-input
                        accept="image/png,image/webp"
                        class="flex-grow-1"
                        density="comfortable"
                        :disabled="logoUploading.dark"
                        hide-details
                        label="Upload dark logo"
                        :loading="logoUploading.dark"
                        :model-value="logoFileModel.dark"
                        prepend-icon=""
                        prepend-inner-icon="mdi-image-outline"
                        show-size
                        style="min-width: 200px;"
                        variant="outlined"
                        @update:model-value="(v) => onLogoFileSelected('dark', v)"
                      />

                      <v-btn
                        :disabled="!draft.logoR2KeyDark || logoUploading.dark"
                        size="small"
                        variant="text"
                        @click="clearLogo('dark')"
                      >
                        Remove logo
                      </v-btn>
                    </div>

                    <v-alert
                      v-if="logoError.dark"
                      class="mt-3"
                      closable
                      density="compact"
                      type="error"
                      variant="tonal"
                      @click:close="logoError.dark = ''"
                    >
                      {{ logoError.dark }}
                    </v-alert>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>

            <v-col cols="12">
              <v-card>
                <v-card-item>
                  <v-card-title>Preview</v-card-title>
                  <v-card-subtitle>Preview of the storefront app bar</v-card-subtitle>
                </v-card-item>

                <v-card-text>
                  <!--
                  Two preview rows so the admin can verify BOTH themes at
                  once. v-theme-provider scopes Vuetify's --v-theme-* CSS
                  vars to the subtree, so the inner .preview-frame surface
                  flips colours without affecting the rest of the page.
                  Within each row the desktop + mobile widths are mocked,
                  matching the storefront breakpoints.
                -->
                  <div v-for="row in previewRows" :key="row.theme" class="mb-4">
                    <div class="text-subtitle-2 mb-2">{{ row.label }}</div>

                    <v-theme-provider :theme="row.theme" with-background>
                      <div class="d-flex flex-column flex-md-row ga-4">
                        <div class="preview-shell flex-grow-1">
                          <div class="text-caption text-medium-emphasis mb-1">Desktop</div>

                          <div class="preview-frame preview-desktop">
                            <div class="preview-appbar">
                              <span class="preview-menu">
                                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z" fill="currentColor" /></svg>
                              </span>

                              <img v-if="row.logoUrl" :alt="previewBrand" class="ml-3 app-logo app-logo--img" :src="row.logoUrl">
                              <span v-else aria-hidden="true" class="ml-3 app-logo" v-html="storefrontLogoSvg" />
                              <span v-if="previewBrand" class="preview-brand"><b class="pl-1 font-weight-bold text-button">{{ previewBrand }}</b></span>
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

                              <img v-if="row.logoUrl" :alt="previewBrand" class="ml-3 app-logo app-logo--img" :src="row.logoUrl">
                              <span v-else aria-hidden="true" class="ml-3 app-logo" v-html="storefrontLogoSvg" />
                              <span v-if="previewBrand" class="preview-brand"><b class="pl-1 font-weight-bold text-button">{{ previewBrand }}</b></span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </v-theme-provider>
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
  import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
  import {
    getMyTenant,
    presignTenantLogoUpload,
    TenantApiError,
    type TenantSummary,
    updateMyTenant,
    type UpdateTenantSettingsPayload,
  } from '@/api/tenants'
  import storefrontLogo from '@/assets/storefront-logo.svg?raw'
  import SettingsLanguages from '@/components/SettingsLanguages.vue'
  import { CDN_BASE_URL } from '@/config/env'
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
    logoR2KeyDark: '',
    brandText: '',
    brandTextHidden: false,
    tenantWallet: '',
    tenantFeePercent: '',
  })

  /**
   * Live preview label — mirrors the storefront fallback chain so the
   * admin sees the exact text users will see. When the owner has flipped
   * on "logo-only" mode the preview renders no text at all; otherwise the
   * usual brandText override → tenant title → hardcoded brand chain applies.
   */
  const previewBrand = computed(() => {
    if (draft.brandTextHidden) return ''
    const override = draft.brandText.trim()
    if (override) return override
    const title = draft.title.trim()
    if (title) return title
    return 'EARNLUMENS'
  })

  // ----- Logo upload (PNG / WebP, max 512 KB, ratio <= 6:1, height >= 64) -----
  //
  // The owner can upload TWO independent logos — one for the light theme
  // and one for the dark theme. The dark variant is optional; when missing
  // the storefront renders the light variant in both themes.
  type LogoVariant = 'light' | 'dark'

  const LOGO_ALLOWED_TYPES = new Set(['image/png', 'image/webp'])
  const LOGO_MAX_BYTES = 512 * 1024
  const LOGO_MIN_DIMENSION = 64
  const LOGO_MAX_RATIO = 6

  const logoUploading = reactive<Record<LogoVariant, boolean>>({ light: false, dark: false })
  const logoError = reactive<Record<LogoVariant, string>>({ light: '', dark: '' })
  /** Object-URL preview of an in-flight upload per variant; replaced by the CDN URL once committed. */
  const localLogoPreview = reactive<Record<LogoVariant, string | null>>({ light: null, dark: null })
  /** Bound directly to v-file-input; cleared after each select. One slot per variant. */
  const logoFileModel = reactive<Record<LogoVariant, File | File[] | null>>({ light: null, dark: null })

  function draftKeyFor (variant: LogoVariant): 'logoR2Key' | 'logoR2KeyDark' {
    return variant === 'dark' ? 'logoR2KeyDark' : 'logoR2Key'
  }

  /**
   * URL used in the thumbnail and in the AppBar mocks for a given variant.
   * Prefers the in-flight object URL so the preview is instant; falls back
   * to the CDN URL once the draft holds a persisted key. The dark preview
   * falls back to the light variant when no dark logo is set, mirroring
   * the runtime fallback in the storefront AppBar.
   */
  function previewLogoUrlFor (variant: LogoVariant): string | null {
    if (localLogoPreview[variant]) return localLogoPreview[variant]
    const key = draft[draftKeyFor(variant)]
    if (key) return `${CDN_BASE_URL}/${key}`
    if (variant === 'dark') return previewLogoUrlFor('light')
    return null
  }
  const previewLogoUrlLight = computed(() => previewLogoUrlFor('light'))
  const previewLogoUrlDark = computed(() => previewLogoUrlFor('dark'))

  /**
   * Drives the dual-theme preview block. Each row scopes a Vuetify theme
   * to its subtree (via {@code <v-theme-provider>}) and renders the logo
   * that the storefront would actually pick for that theme \u2014 so the admin
   * sees, side by side, exactly what dark- and light-mode visitors get.
   */
  const previewRows = computed(() => [
    { theme: 'light', label: 'Light mode', logoUrl: previewLogoUrlLight.value },
    { theme: 'dark', label: 'Dark mode', logoUrl: previewLogoUrlDark.value },
  ])

  async function validateLogoFile (file: File): Promise<void> {
    if (!LOGO_ALLOWED_TYPES.has(file.type)) {
      throw new Error('Only PNG or WebP are allowed.')
    }
    if (file.size > LOGO_MAX_BYTES) {
      throw new Error('File exceeds 512 KB.')
    }
    // Probe natural dimensions to enforce min-height + ratio. The Image
    // element decodes asynchronously; we await it before issuing the
    // presign so a bad file never reaches R2.
    const url = URL.createObjectURL(file)
    try {
      const dims = await new Promise<{ w: number, h: number }>((resolve, reject) => {
        const img = new Image()
        img.addEventListener('load', () => resolve({ w: img.naturalWidth, h: img.naturalHeight }))
        img.addEventListener('error', () => reject(new Error('Could not read the image.')))
        img.src = url
      })
      if (dims.w < LOGO_MIN_DIMENSION || dims.h < LOGO_MIN_DIMENSION) {
        throw new Error(`Minimum dimensions: ${LOGO_MIN_DIMENSION}×${LOGO_MIN_DIMENSION} px.`)
      }
      const ratio = Math.max(dims.w / dims.h, dims.h / dims.w)
      if (ratio > LOGO_MAX_RATIO) {
        throw new Error(`Maximum aspect ratio ${LOGO_MAX_RATIO}:1 (this logo is ${ratio.toFixed(1)}:1).`)
      }
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  async function onLogoFileSelected (variant: LogoVariant, selection: File | File[] | null) {
    logoError[variant] = ''
    const file = Array.isArray(selection) ? selection[0] ?? null : selection
    // v-file-input emits null when the user clears the picker; treat as no-op.
    if (!file) {
      logoFileModel[variant] = null
      return
    }
    if (!tenant.value) {
      logoFileModel[variant] = null
      return
    }
    try {
      await validateLogoFile(file)
    } catch (error) {
      logoError[variant] = error instanceof Error ? error.message : 'Invalid file.'
      logoFileModel[variant] = null
      return
    }

    // Show the local preview immediately so the user gets instant
    // feedback while we negotiate with the backend + R2.
    const previousPreview = localLogoPreview[variant]
    if (previousPreview) URL.revokeObjectURL(previousPreview)
    localLogoPreview[variant] = URL.createObjectURL(file)

    logoUploading[variant] = true
    try {
      const { uploadUrl, r2Key } = await presignTenantLogoUpload(
        tenant.value.id, file.type, file.size, variant,
      )
      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      if (!putRes.ok) {
        throw new Error(`Upload failed (HTTP ${putRes.status}).`)
      }
      // Successful upload — stage the key on the draft so the regular
      // Save button persists it via PATCH. The local object-URL preview
      // stays in place until the next snapshotIntoDraft.
      draft[draftKeyFor(variant)] = r2Key
      showSnackbar('Logo uploaded. Press Save changes to confirm.', 'info')
    } catch (error) {
      const code = error instanceof TenantApiError ? error.code : (error as Error).message
      logoError[variant] = `Could not upload logo: ${code}`
      const failedPreview = localLogoPreview[variant]
      if (failedPreview) {
        URL.revokeObjectURL(failedPreview)
        localLogoPreview[variant] = null
      }
    } finally {
      logoUploading[variant] = false
      logoFileModel[variant] = null
    }
  }

  function clearLogo (variant: LogoVariant) {
    draft[draftKeyFor(variant)] = ''
    const preview = localLogoPreview[variant]
    if (preview) {
      URL.revokeObjectURL(preview)
      localLogoPreview[variant] = null
    }
    logoError[variant] = ''
  }

  onUnmounted(() => {
    for (const variant of ['light', 'dark'] as const) {
      const preview = localLogoPreview[variant]
      if (preview) URL.revokeObjectURL(preview)
    }
  })

  const isDirty = computed(() => {
    if (!tenant.value) return false
    return draft.title !== (tenant.value.title ?? '')
      || draft.description !== (tenant.value.description ?? '')
      || draft.logoR2Key !== (tenant.value.logoR2Key ?? '')
      || draft.logoR2KeyDark !== (tenant.value.logoR2KeyDark ?? '')
      || draft.brandText !== (tenant.value.brandText ?? '')
      || draft.brandTextHidden !== (tenant.value.brandTextHidden ?? false)
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
    draft.logoR2KeyDark = t.logoR2KeyDark ?? ''
    draft.brandText = t.brandText ?? ''
    draft.brandTextHidden = t.brandTextHidden ?? false
    draft.tenantWallet = t.tenantWallet ?? ''
    draft.tenantFeePercent = t.tenantFeePercent ?? ''
    // Drop any local previews — the canonical URL now comes from the
    // freshly-snapshotted draft keys via previewLogoUrlFor().
    for (const variant of ['light', 'dark'] as const) {
      const preview = localLogoPreview[variant]
      if (preview) URL.revokeObjectURL(preview)
      localLogoPreview[variant] = null
      logoError[variant] = ''
    }
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
    if (draft.logoR2KeyDark !== (tenant.value.logoR2KeyDark ?? '')) out.logoR2KeyDark = draft.logoR2KeyDark.trim()
    // brandText is sent raw (including empty string) so the server can clear
    // the override and fall back to the tenant title automatically.
    if (draft.brandText !== (tenant.value.brandText ?? '')) out.brandText = draft.brandText.trim()
    if (draft.brandTextHidden !== (tenant.value.brandTextHidden ?? false)) out.brandTextHidden = draft.brandTextHidden
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

/*
 * Uploaded raster logo. Matches the storefront AppBar 1:1 — fixed 24px
 * height + max-width 160px + object-fit:contain — so the admin sees
 * pixel-perfect what the storefront will render.
 */
.preview-appbar .app-logo--img {
  width: auto;
  height: 24px;
  max-width: 160px;
  object-fit: contain;
}

/* Thumbnail next to the file picker in the settings card. */
.logo-thumb {
  width: 96px;
  height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 4px;
  background: rgb(var(--v-theme-surface));
  overflow: hidden;
}

.logo-thumb img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

/* Dark-variant thumb forces a dark surface so the admin can verify the
 * dark logo against the background it will actually live on. */
.logo-thumb--dark {
  background: #1e1e1e;
  border-color: rgba(255, 255, 255, 0.12);
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
