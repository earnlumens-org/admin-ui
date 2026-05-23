<!--
  /settings/branding — storefront brand text, logos and live preview.

  Dedicated, distraction-free workspace for the visual identity of the
  storefront. Future banner-image controls will land here too — the
  layout below already has the breathing room (two-column on md+,
  preview spans full width).
-->
<template>
  <v-container class="pa-4 pa-sm-6" fluid>
    <v-breadcrumbs
      class="px-0 pt-0"
      :items="[
        { title: 'earnlumens', disabled: true },
        { title: 'settings', to: '/settings' },
        { title: 'branding', disabled: true },
      ]"
    />

    <div class="d-flex align-center mb-1">
      <v-btn
        class="me-2"
        icon="mdi-arrow-left"
        size="small"
        to="/settings"
        variant="text"
      />

      <div class="text-h6">Storefront branding</div>
    </div>

    <div class="text-body-2 text-medium-emphasis mb-4">
      Brand text and logos shown next to the menu, with live preview for
      both themes.
    </div>

    <v-divider class="mb-4" />

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

    <v-form
      v-else-if="tenant"
      ref="form"
      v-model="formValid"
      @submit.prevent="save"
    >
      <v-row>
        <v-col cols="12" md="6">
          <v-card>
            <v-card-item>
              <v-card-title>Brand text</v-card-title>
              <v-card-subtitle>The label rendered next to the logo</v-card-subtitle>
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
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="6">
          <v-card>
            <v-card-item>
              <v-card-title>Logos</v-card-title>
              <v-card-subtitle>One per theme; dark falls back to light</v-card-subtitle>
            </v-card-item>

            <v-card-text>
              <div>
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

        <v-col cols="12" md="6">
          <v-card>
            <v-card-item>
              <v-card-title>Browser tab</v-card-title>
              <v-card-subtitle>Favicon and tab title shown in the browser</v-card-subtitle>
            </v-card-item>

            <v-card-text>
              <div class="text-caption text-medium-emphasis mb-3">
                PNG, WebP or ICO, up to 128 KB. Leave empty to use the
                default EARNLUMENS favicon.
              </div>

              <div class="d-flex align-center ga-3 flex-wrap">
                <div class="logo-thumb logo-thumb--light favicon-thumb">
                  <img v-if="previewFaviconUrl" alt="Favicon preview" :src="previewFaviconUrl">
                  <span v-else class="text-caption text-medium-emphasis">No icon</span>
                </div>

                <v-file-input
                  accept="image/png,image/webp,image/x-icon,image/vnd.microsoft.icon,.ico"
                  class="flex-grow-1"
                  density="comfortable"
                  :disabled="logoUploading.favicon"
                  hide-details
                  label="Upload favicon"
                  :loading="logoUploading.favicon"
                  :model-value="logoFileModel.favicon"
                  prepend-icon=""
                  prepend-inner-icon="mdi-image-outline"
                  show-size
                  style="min-width: 200px;"
                  variant="outlined"
                  @update:model-value="(v) => onLogoFileSelected('favicon', v)"
                />

                <v-btn
                  :disabled="!draft.faviconR2Key || logoUploading.favicon"
                  size="small"
                  variant="text"
                  @click="clearLogo('favicon')"
                >
                  Remove favicon
                </v-btn>
              </div>

              <v-alert
                v-if="logoError.favicon"
                class="mt-3"
                closable
                density="compact"
                type="error"
                variant="tonal"
                @click:close="logoError.favicon = ''"
              >
                {{ logoError.favicon }}
              </v-alert>

              <v-divider class="my-4" />

              <!--
                Browser-tab title (document.title). Independent from
                brandText so the owner can keep the AppBar label short
                while showing a longer descriptive title in the tab.
              -->
              <v-text-field
                v-model="draft.browserTitle"
                density="comfortable"
                hint="Leave empty to use the tenant name."
                label="Browser tab title"
                maxlength="60"
                persistent-hint
                :rules="[rules.brandTextLength]"
                variant="outlined"
              />

              <!--
                Live preview that mimics a real browser tab: favicon on
                the left, document.title in the middle, the usual close
                affordance on the right. Uses the same fallback chain as
                the storefront so the admin sees the exact text users
                will see in their tab strip.
              -->
              <div class="text-subtitle-2 mt-4 mb-2">Preview</div>

              <div class="tab-preview">
                <img v-if="previewFaviconUrl" alt="Favicon preview" class="tab-preview__favicon" :src="previewFaviconUrl">
                <span v-else class="tab-preview__favicon tab-preview__favicon--placeholder" />
                <span class="tab-preview__title">{{ previewBrowserTitle }}</span>
                <span aria-hidden="true" class="tab-preview__close">
                  <svg height="14" viewBox="0 0 24 24" width="14" xmlns="http://www.w3.org/2000/svg"><path d="M19 6.4 17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12z" fill="currentColor" /></svg>
                </span>
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

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000">
      {{ snackbarText }}
    </v-snackbar>
  </v-container>
</template>

<script lang="ts" setup>
  import { computed, onUnmounted, reactive, ref, watch } from 'vue'

  import {
    presignTenantLogoUpload,
    TenantApiError,
    type TenantSummary,
    type UpdateTenantSettingsPayload,
  } from '@/api/tenants'
  import storefrontLogo from '@/assets/storefront-logo.svg?raw'
  import { useTenantSettings } from '@/composables/useTenantSettings'
  import { CDN_BASE_URL } from '@/config/env'

  const storefrontLogoSvg = storefrontLogo

  const {
    tenant, loading, loadError, saving, loadTenant, saveTenant,
    snackbar, snackbarText, snackbarColor, showSnackbar,
  } = useTenantSettings()

  const formValid = ref(true)
  const form = ref<any>(null)

  const draft = reactive({
    title: '',
    logoR2Key: '',
    logoR2KeyDark: '',
    faviconR2Key: '',
    browserTitle: '',
    brandText: '',
    brandTextHidden: false,
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

  /**
   * Browser-tab title preview. Mirrors the storefront fallback in
   * App.vue: explicit browserTitle override → brandText (when not
   * hidden) → tenant title → hardcoded EARNLUMENS.
   */
  const previewBrowserTitle = computed(() => {
    const override = draft.browserTitle.trim()
    if (override) return override
    if (!draft.brandTextHidden) {
      const brand = draft.brandText.trim()
      if (brand) return brand
    }
    const title = draft.title.trim()
    if (title) return title
    return 'EARNLUMENS'
  })

  // ----- Logo upload (PNG / WebP, max 512 KB, ratio <= 6:1, height >= 64) -----
  //
  // The owner can upload TWO independent logos — one for the light theme
  // and one for the dark theme. The dark variant is optional; when missing
  // the storefront renders the light variant in both themes. The favicon
  // variant lives alongside but uses its own narrower validation (smaller
  // size cap, .ico accepted, no aspect-ratio check).
  type LogoVariant = 'light' | 'dark' | 'favicon'

  const LOGO_ALLOWED_TYPES = new Set(['image/png', 'image/webp'])
  const LOGO_MAX_BYTES = 512 * 1024
  const LOGO_MIN_DIMENSION = 64
  const LOGO_MAX_RATIO = 6

  // Favicon: small browser-tab icon. Allow the legacy .ico container in
  // addition to PNG/WebP because most logo-generator tooling still emits
  // .ico, and cap aggressively so we never serve a multi-MB tab icon.
  const FAVICON_ALLOWED_TYPES = new Set([
    'image/png',
    'image/webp',
    'image/x-icon',
    'image/vnd.microsoft.icon',
  ])
  const FAVICON_MAX_BYTES = 128 * 1024

  const logoUploading = reactive<Record<LogoVariant, boolean>>({ light: false, dark: false, favicon: false })
  const logoError = reactive<Record<LogoVariant, string>>({ light: '', dark: '', favicon: '' })
  /** Object-URL preview of an in-flight upload per variant; replaced by the CDN URL once committed. */
  const localLogoPreview = reactive<Record<LogoVariant, string | null>>({ light: null, dark: null, favicon: null })
  /** Bound directly to v-file-input; cleared after each select. One slot per variant. */
  const logoFileModel = reactive<Record<LogoVariant, File | File[] | null>>({ light: null, dark: null, favicon: null })

  function draftKeyFor (variant: LogoVariant): 'logoR2Key' | 'logoR2KeyDark' | 'faviconR2Key' {
    if (variant === 'dark') return 'logoR2KeyDark'
    if (variant === 'favicon') return 'faviconR2Key'
    return 'logoR2Key'
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
  const previewFaviconUrl = computed(() => previewLogoUrlFor('favicon'))

  const previewRows = computed(() => [
    { theme: 'light', label: 'Light mode', logoUrl: previewLogoUrlLight.value },
    { theme: 'dark', label: 'Dark mode', logoUrl: previewLogoUrlDark.value },
  ])

  async function validateLogoFile (file: File, variant: LogoVariant): Promise<void> {
    if (variant === 'favicon') {
      if (!FAVICON_ALLOWED_TYPES.has(file.type)) {
        throw new Error('Only PNG, WebP or ICO are allowed for the favicon.')
      }
      if (file.size > FAVICON_MAX_BYTES) {
        throw new Error('Favicon exceeds 128 KB.')
      }
      // Favicons are tiny and often non-square (16x16, 32x32, etc.);
      // skip the aspect-ratio / minimum-dimension checks on purpose.
      return
    }
    if (!LOGO_ALLOWED_TYPES.has(file.type)) {
      throw new Error('Only PNG or WebP are allowed.')
    }
    if (file.size > LOGO_MAX_BYTES) {
      throw new Error('File exceeds 512 KB.')
    }
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
    if (!file) {
      logoFileModel[variant] = null
      return
    }
    if (!tenant.value) {
      logoFileModel[variant] = null
      return
    }
    try {
      await validateLogoFile(file, variant)
    } catch (error) {
      logoError[variant] = error instanceof Error ? error.message : 'Invalid file.'
      logoFileModel[variant] = null
      return
    }

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
    for (const variant of ['light', 'dark', 'favicon'] as const) {
      const preview = localLogoPreview[variant]
      if (preview) URL.revokeObjectURL(preview)
    }
  })

  const rules = {
    brandTextLength: (v: string) => (!v || v.length <= 60) || 'Up to 60 characters',
  }

  function snapshot (t: TenantSummary) {
    draft.title = t.title ?? ''
    draft.logoR2Key = t.logoR2Key ?? ''
    draft.logoR2KeyDark = t.logoR2KeyDark ?? ''
    draft.faviconR2Key = t.faviconR2Key ?? ''
    draft.browserTitle = t.browserTitle ?? ''
    draft.brandText = t.brandText ?? ''
    draft.brandTextHidden = t.brandTextHidden ?? false
    // Drop any local previews — the canonical URL now comes from the
    // freshly-snapshotted draft keys via previewLogoUrlFor().
    for (const variant of ['light', 'dark', 'favicon'] as const) {
      const preview = localLogoPreview[variant]
      if (preview) URL.revokeObjectURL(preview)
      localLogoPreview[variant] = null
      logoError[variant] = ''
    }
  }

  function reset () {
    if (tenant.value) snapshot(tenant.value)
  }

  watch(tenant, t => {
    if (t) snapshot(t)
  }, { immediate: true })

  const isDirty = computed(() => {
    if (!tenant.value) return false
    return draft.logoR2Key !== (tenant.value.logoR2Key ?? '')
      || draft.logoR2KeyDark !== (tenant.value.logoR2KeyDark ?? '')
      || draft.faviconR2Key !== (tenant.value.faviconR2Key ?? '')
      || draft.browserTitle !== (tenant.value.browserTitle ?? '')
      || draft.brandText !== (tenant.value.brandText ?? '')
      || draft.brandTextHidden !== (tenant.value.brandTextHidden ?? false)
  })

  async function save () {
    if (!tenant.value) return
    const valid = await form.value?.validate?.()
    if (valid && valid.valid === false) return

    const payload: UpdateTenantSettingsPayload = {}
    if (draft.logoR2Key !== (tenant.value.logoR2Key ?? '')) payload.logoR2Key = draft.logoR2Key.trim()
    if (draft.logoR2KeyDark !== (tenant.value.logoR2KeyDark ?? '')) payload.logoR2KeyDark = draft.logoR2KeyDark.trim()
    if (draft.faviconR2Key !== (tenant.value.faviconR2Key ?? '')) payload.faviconR2Key = draft.faviconR2Key.trim()
    if (draft.browserTitle !== (tenant.value.browserTitle ?? '')) payload.browserTitle = draft.browserTitle.trim()
    // brandText is sent raw (including empty string) so the server can clear
    // the override and fall back to the tenant title automatically.
    if (draft.brandText !== (tenant.value.brandText ?? '')) payload.brandText = draft.brandText.trim()
    if (draft.brandTextHidden !== (tenant.value.brandTextHidden ?? false)) payload.brandTextHidden = draft.brandTextHidden

    const updated = await saveTenant(payload)
    if (updated) snapshot(updated)
  }
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

/* Favicons are square and tiny (16/32px); render the thumb at a 1:1
 * ratio so the admin previews the actual shape, not a stretched copy. */
.favicon-thumb {
  width: 48px;
  height: 48px;
}

/*
 * Browser-tab preview. Mocks the rounded-corner tab shape and the
 * favicon + title + close-button layout the user will see in their
 * tab strip. Sized roughly to a real Chrome tab (240px) so the admin
 * can judge truncation. Colors driven by Vuetify theme tokens so the
 * preview adapts to light/dark.
 */
.tab-preview {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 280px;
  padding: 8px 12px;
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-bottom: none;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.875rem;
  line-height: 1.2;
}

.tab-preview__favicon {
  width: 16px;
  height: 16px;
  flex: 0 0 16px;
  object-fit: contain;
  border-radius: 2px;
}

.tab-preview__favicon--placeholder {
  display: inline-block;
  background: rgba(var(--v-theme-on-surface), 0.16);
}

.tab-preview__title {
  flex: 1 1 auto;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tab-preview__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  color: rgba(var(--v-theme-on-surface), 0.7);
  flex: 0 0 18px;
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
