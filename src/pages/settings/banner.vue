<!--
  /settings/banner — storefront hero banner.

  A focused, distraction-free workspace for the per-tenant hero banner that
  the storefront renders at the top of its home page. The fields are
  intentionally minimal and copy-driven so the tenant owner can answer the
  three marketing questions every visitor lands on the page asking:

    1. What is this place about? (eyebrow + headline)
    2. Who is it for, and what will I get? (subheadline)
    3. What should I do next? (CTA label + URL)

  All text fields are plain strings today. A follow-up will plug in
  automatic translation per locale; this page already groups them under a
  "Hero copy" card so adding a per-language tab later is a localised change.
-->
<template>
  <v-container class="pa-4 pa-sm-6" fluid>
    <v-breadcrumbs
      class="px-0 pt-0"
      :items="[
        { title: 'earnlumens', disabled: true },
        { title: 'settings', to: '/settings' },
        { title: 'banner', disabled: true },
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

      <div class="text-h6">Storefront banner</div>
    </div>

    <div class="text-body-2 text-medium-emphasis mb-4">
      The hero block visitors see when they land on your storefront. Use it
      to explain your niche, set the tone with a strong image, and point
      visitors at the first thing you want them to do.
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
        <!-- Master switch + image -->
        <v-col cols="12" md="6">
          <v-card>
            <v-card-item>
              <v-card-title>Visibility</v-card-title>

              <v-card-subtitle>
                Flip this on once you're happy with the copy and image below.
              </v-card-subtitle>
            </v-card-item>

            <v-card-text>
              <v-switch
                v-model="draft.bannerEnabled"
                class="mb-0"
                color="primary"
                density="comfortable"
                hide-details
                :label="draft.bannerEnabled ? 'Banner published' : 'Banner hidden'"
              />

              <div class="text-caption text-medium-emphasis mt-2">
                When off, your storefront renders the regular catalogue with no
                hero block. Edits below are saved either way.
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="6">
          <v-card>
            <v-card-item>
              <v-card-title>Background image</v-card-title>

              <v-card-subtitle>
                PNG, JPEG or WebP up to 2 MB. Wide formats (≥ 1600×600) look
                best.
              </v-card-subtitle>
            </v-card-item>

            <v-card-text>
              <div class="d-flex align-center ga-3 mb-3">
                <div class="banner-thumb">
                  <v-img
                    v-if="bannerImagePreviewUrl"
                    :alt="draft.bannerImageAlt || 'Banner preview'"
                    cover
                    :src="bannerImagePreviewUrl"
                  />

                  <v-icon v-else color="medium-emphasis" size="32">
                    mdi-image-outline
                  </v-icon>
                </div>

                <div class="flex-grow-1">
                  <v-file-input
                    v-model="bannerFile"
                    accept="image/png,image/jpeg,image/webp"
                    density="comfortable"
                    hide-details
                    :loading="bannerUploading"
                    prepend-icon=""
                    prepend-inner-icon="mdi-upload"
                    show-size
                    variant="outlined"
                    @update:model-value="onBannerFileSelected"
                  />

                  <v-progress-linear
                    v-if="bannerUploading"
                    class="mt-2"
                    color="primary"
                    height="6"
                    :model-value="bannerUploadProgress"
                    rounded
                  />

                  <div v-if="bannerError" class="text-caption text-error mt-1">
                    {{ bannerError }}
                  </div>

                  <v-btn
                    v-if="draft.bannerImageR2Key"
                    class="mt-2"
                    color="error"
                    density="comfortable"
                    prepend-icon="mdi-trash-can-outline"
                    size="small"
                    variant="text"
                    @click="clearBanner"
                  >
                    Remove image
                  </v-btn>
                </div>
              </div>

              <v-text-field
                v-model="draft.bannerImageAlt"
                density="comfortable"
                hint="Describe the image for screen readers and SEO."
                label="Image alt text"
                maxlength="140"
                persistent-hint
                variant="outlined"
              />
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Hero copy -->
        <v-col cols="12">
          <v-card>
            <v-card-item>
              <v-card-title>Hero copy</v-card-title>

              <v-card-subtitle>
                Three short fields to explain who you serve and why they should
                care. Keep each line scannable — visitors decide in seconds.
              </v-card-subtitle>
            </v-card-item>

            <v-card-text>
              <v-row>
                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="draft.bannerEyebrow"
                    density="comfortable"
                    hint="A short niche tag, e.g. 'Stellar smart contracts'."
                    label="Eyebrow"
                    maxlength="40"
                    persistent-hint
                    variant="outlined"
                  />
                </v-col>

                <v-col cols="12" md="8">
                  <v-text-field
                    v-model="draft.bannerHeadline"
                    density="comfortable"
                    hint="The promise. Lead with the outcome, not the format."
                    label="Headline"
                    maxlength="80"
                    persistent-hint
                    variant="outlined"
                  />
                </v-col>

                <v-col cols="12">
                  <v-textarea
                    v-model="draft.bannerSubheadline"
                    auto-grow
                    density="comfortable"
                    hint="One or two sentences: who it's for and what they get."
                    label="Subheadline"
                    maxlength="200"
                    persistent-hint
                    rows="2"
                    variant="outlined"
                  />
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- CTA -->
        <v-col cols="12">
          <v-card>
            <v-card-item>
              <v-card-title>Call to action</v-card-title>

              <v-card-subtitle>
                Optional button rendered on the banner. Use a relative path
                (<code>/explore</code>) to point inside your storefront, or a
                full <code>https://</code> URL for an external destination.
              </v-card-subtitle>
            </v-card-item>

            <v-card-text>
              <v-row>
                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="draft.bannerCtaLabel"
                    density="comfortable"
                    hint="Action verb works best: 'Explore', 'Start', 'See plans'."
                    label="Button label"
                    maxlength="32"
                    persistent-hint
                    variant="outlined"
                  />
                </v-col>

                <v-col cols="12" md="8">
                  <v-text-field
                    v-model="draft.bannerCtaUrl"
                    density="comfortable"
                    hint="Empty = no button. Only relative paths or https URLs are accepted."
                    label="Destination"
                    maxlength="256"
                    persistent-hint
                    :rules="[rules.ctaUrl]"
                    variant="outlined"
                  />
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Preview -->
        <v-col cols="12">
          <v-card>
            <v-card-item>
              <v-card-title>Preview</v-card-title>

              <v-card-subtitle>
                Approximate desktop rendering using your current draft.
              </v-card-subtitle>
            </v-card-item>

            <v-card-text>
              <div class="banner-preview">
                <div
                  class="banner-preview-bg"
                  :style="bannerImagePreviewUrl
                    ? `background-image: url(${bannerImagePreviewUrl})`
                    : ''"
                >
                  <div class="banner-preview-overlay" />

                  <div class="banner-preview-content">
                    <v-chip
                      v-if="draft.bannerEyebrow"
                      class="mb-3 text-uppercase font-weight-medium"
                      color="primary"
                      label
                      size="small"
                      variant="flat"
                    >
                      {{ draft.bannerEyebrow }}
                    </v-chip>

                    <div class="banner-preview-headline">
                      {{ draft.bannerHeadline || 'Your headline goes here' }}
                    </div>

                    <div class="banner-preview-subheadline">
                      {{ draft.bannerSubheadline
                        || 'One or two sentences telling visitors who this storefront is for and what they will get.' }}
                    </div>

                    <div v-if="draft.bannerCtaLabel" class="mt-4">
                      <v-btn
                        class="text-none font-weight-bold"
                        color="primary"
                        rounded="lg"
                        size="large"
                      >
                        {{ draft.bannerCtaLabel }}
                        <v-icon class="ms-2" icon="mdi-arrow-right" />
                      </v-btn>
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
          :disabled="!isDirty || saving || bannerUploading"
          :loading="saving"
          type="submit"
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
    uploadToPresignedUrl,
  } from '@/api/tenants'
  import { useTenantSettings } from '@/composables/useTenantSettings'
  import { CDN_BASE_URL } from '@/config/env'

  const BANNER_ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])
  const BANNER_MAX_BYTES = 2 * 1024 * 1024 // 2 MB — matches the server cap.

  const {
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
  } = useTenantSettings()

  const form = ref<{ validate?: () => Promise<{ valid: boolean }> } | null>(null)
  const formValid = ref(true)

  const draft = reactive({
    bannerEnabled: false,
    bannerImageR2Key: '',
    bannerEyebrow: '',
    bannerHeadline: '',
    bannerSubheadline: '',
    bannerCtaLabel: '',
    bannerCtaUrl: '',
    bannerImageAlt: '',
  })

  // Local object URL used as a preview after the user picks a file but
  // before they hit Save. Cleared once the file is uploaded to R2 so the
  // preview switches to the cached CDN URL on the next snapshot.
  const localBannerPreview = ref<string | null>(null)
  const bannerFile = ref<File | File[] | null>(null)
  const bannerUploading = ref(false)
  const bannerUploadProgress = ref(0)
  const bannerError = ref('')

  const bannerImagePreviewUrl = computed(() => {
    if (localBannerPreview.value) return localBannerPreview.value
    if (draft.bannerImageR2Key) return `${CDN_BASE_URL}/${draft.bannerImageR2Key}`
    return null
  })

  async function validateBannerFile (file: File): Promise<void> {
    if (!BANNER_ALLOWED_TYPES.has(file.type)) {
      throw new Error('Only PNG, JPEG or WebP are allowed.')
    }
    if (file.size > BANNER_MAX_BYTES) {
      throw new Error('File exceeds 2 MB.')
    }
  }

  async function onBannerFileSelected (selection: File | File[] | null) {
    bannerError.value = ''
    const file = Array.isArray(selection) ? selection[0] ?? null : selection
    if (!file) {
      bannerFile.value = null
      return
    }
    if (!tenant.value) {
      bannerFile.value = null
      return
    }
    try {
      await validateBannerFile(file)
    } catch (error) {
      bannerError.value = error instanceof Error ? error.message : 'Invalid file.'
      bannerFile.value = null
      return
    }

    if (localBannerPreview.value) URL.revokeObjectURL(localBannerPreview.value)
    localBannerPreview.value = URL.createObjectURL(file)

    bannerUploading.value = true
    bannerUploadProgress.value = 0
    try {
      const { uploadUrl, r2Key } = await presignTenantLogoUpload(
        tenant.value.id, file.type, file.size, 'banner',
      )
      await uploadToPresignedUrl(uploadUrl, file, percent => {
        bannerUploadProgress.value = percent
      })
      draft.bannerImageR2Key = r2Key
      showSnackbar('Image uploaded. Press Save changes to confirm.', 'info')
    } catch (error) {
      const code = error instanceof TenantApiError ? error.code : (error as Error).message
      bannerError.value = `Could not upload image: ${code}`
      if (localBannerPreview.value) {
        URL.revokeObjectURL(localBannerPreview.value)
        localBannerPreview.value = null
      }
    } finally {
      bannerUploading.value = false
      bannerFile.value = null
    }
  }

  function clearBanner () {
    draft.bannerImageR2Key = ''
    if (localBannerPreview.value) {
      URL.revokeObjectURL(localBannerPreview.value)
      localBannerPreview.value = null
    }
    bannerError.value = ''
  }

  onUnmounted(() => {
    if (localBannerPreview.value) URL.revokeObjectURL(localBannerPreview.value)
  })

  const rules = {
    ctaUrl: (v: string) => {
      if (!v) return true
      const trimmed = v.trim()
      // Mirror the server-side scheme allowlist (relative path or https).
      if (trimmed.startsWith('//')) return 'Protocol-relative URLs are not allowed.'
      if (trimmed.startsWith('/')) return true
      if (/^https:\/\//i.test(trimmed)) return true
      return 'Use a relative path (/explore) or an https:// URL.'
    },
  }

  function snapshot (t: TenantSummary) {
    draft.bannerEnabled = t.bannerEnabled ?? false
    draft.bannerImageR2Key = t.bannerImageR2Key ?? ''
    draft.bannerEyebrow = t.bannerEyebrow ?? ''
    draft.bannerHeadline = t.bannerHeadline ?? ''
    draft.bannerSubheadline = t.bannerSubheadline ?? ''
    draft.bannerCtaLabel = t.bannerCtaLabel ?? ''
    draft.bannerCtaUrl = t.bannerCtaUrl ?? ''
    draft.bannerImageAlt = t.bannerImageAlt ?? ''
    if (localBannerPreview.value) {
      URL.revokeObjectURL(localBannerPreview.value)
      localBannerPreview.value = null
    }
    bannerError.value = ''
  }

  function reset () {
    if (tenant.value) snapshot(tenant.value)
  }

  watch(tenant, t => {
    if (t) snapshot(t)
  }, { immediate: true })

  const isDirty = computed(() => {
    if (!tenant.value) return false
    const t = tenant.value
    return draft.bannerEnabled !== (t.bannerEnabled ?? false)
      || draft.bannerImageR2Key !== (t.bannerImageR2Key ?? '')
      || draft.bannerEyebrow !== (t.bannerEyebrow ?? '')
      || draft.bannerHeadline !== (t.bannerHeadline ?? '')
      || draft.bannerSubheadline !== (t.bannerSubheadline ?? '')
      || draft.bannerCtaLabel !== (t.bannerCtaLabel ?? '')
      || draft.bannerCtaUrl !== (t.bannerCtaUrl ?? '')
      || draft.bannerImageAlt !== (t.bannerImageAlt ?? '')
  })

  async function save () {
    if (!tenant.value) return
    const valid = await form.value?.validate?.()
    if (valid && valid.valid === false) return

    const payload: UpdateTenantSettingsPayload = {}
    const t = tenant.value
    if (draft.bannerEnabled !== (t.bannerEnabled ?? false)) payload.bannerEnabled = draft.bannerEnabled
    if (draft.bannerImageR2Key !== (t.bannerImageR2Key ?? '')) payload.bannerImageR2Key = draft.bannerImageR2Key.trim()
    if (draft.bannerEyebrow !== (t.bannerEyebrow ?? '')) payload.bannerEyebrow = draft.bannerEyebrow.trim()
    if (draft.bannerHeadline !== (t.bannerHeadline ?? '')) payload.bannerHeadline = draft.bannerHeadline.trim()
    if (draft.bannerSubheadline !== (t.bannerSubheadline ?? '')) payload.bannerSubheadline = draft.bannerSubheadline.trim()
    if (draft.bannerCtaLabel !== (t.bannerCtaLabel ?? '')) payload.bannerCtaLabel = draft.bannerCtaLabel.trim()
    if (draft.bannerCtaUrl !== (t.bannerCtaUrl ?? '')) payload.bannerCtaUrl = draft.bannerCtaUrl.trim()
    if (draft.bannerImageAlt !== (t.bannerImageAlt ?? '')) payload.bannerImageAlt = draft.bannerImageAlt.trim()

    const updated = await saveTenant(payload)
    if (updated) snapshot(updated)
  }
</script>

<style scoped>
.banner-thumb {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 96px;
  height: 64px;
  border-radius: 8px;
  background-color: rgb(var(--v-theme-surface-variant, var(--v-theme-surface)));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  overflow: hidden;
  flex-shrink: 0;
}

.banner-preview {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 12px;
  overflow: hidden;
  background: rgb(var(--v-theme-surface));
}

.banner-preview-bg {
  position: relative;
  min-height: 280px;
  background-color: rgb(var(--v-theme-surface-variant, var(--v-theme-surface)));
  background-size: cover;
  background-position: center;
}

.banner-preview-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    rgba(0, 0, 0, 0.65) 0%,
    rgba(0, 0, 0, 0.35) 55%,
    rgba(0, 0, 0, 0.1) 100%
  );
}

.banner-preview-content {
  position: relative;
  z-index: 1;
  padding: 32px;
  max-width: 720px;
  color: #fff;
}

.banner-preview-headline {
  font-size: 2rem;
  font-weight: 900;
  line-height: 1.1;
  letter-spacing: -0.01em;
  margin-bottom: 12px;
}

.banner-preview-subheadline {
  font-size: 1rem;
  line-height: 1.4;
  opacity: 0.92;
}

@media (min-width: 960px) {
  .banner-preview-headline {
    font-size: 2.75rem;
  }
}
</style>
