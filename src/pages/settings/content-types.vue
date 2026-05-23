<!--
  /settings/content-types — per-tenant content-type allowlist.

  Lets the owner shape the identity of the storefront by choosing which
  entry types are accepted. With every switch ON (the default for legacy
  tenants) the tenant accepts video, audio, image, resource and collection
  uploads — i.e. the full EarnLumens catalogue. Turning some OFF carves
  out a niche (e.g. "images only" to look like Instagram, "audio only"
  to feel like Spotify, "video only" to look like YouTube).

  This page only changes what NEW uploads are accepted and what tabs are
  rendered on the storefront. Existing entries of a now-disallowed type
  stay browseable so an owner cannot accidentally hide content their
  buyers already paid for.
-->
<template>
  <v-container class="pa-4 pa-sm-6" fluid>
    <v-breadcrumbs
      class="px-0 pt-0"
      :items="[
        { title: 'earnlumens', disabled: true },
        { title: 'settings', to: '/settings' },
        { title: 'content types', disabled: true },
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

      <div class="text-h6">Content types</div>
    </div>

    <div class="text-body-2 text-medium-emphasis mb-4">
      Pick which kinds of content your storefront accepts. This shapes
      both the upload menu creators see and the tabs visitors browse.
      Existing content of any kind stays online.
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

    <template v-else-if="tenant">
      <v-card>
        <v-card-item>
          <template #prepend>
            <v-icon color="primary" icon="mdi-shape-outline" size="large" />
          </template>

          <v-card-title>Allowed content types</v-card-title>

          <v-card-subtitle>
            Turn off any types your storefront isn't about. Keep at least one on.
          </v-card-subtitle>
        </v-card-item>

        <v-card-text>
          <div class="d-flex flex-column ga-1">
            <v-switch
              v-for="opt in options"
              :key="opt.value"
              color="primary"
              :disabled="saving"
              hide-details
              inset
              :model-value="draft[opt.value]"
              @update:model-value="(v: boolean | null) => onToggle(opt.value, v)"
            >
              <template #label>
                <div class="d-flex align-center">
                  <v-icon class="me-3" :color="draft[opt.value] ? 'primary' : 'medium-emphasis'">
                    {{ opt.icon }}
                  </v-icon>
                  <div>
                    <div class="text-body-1">{{ opt.label }}</div>
                    <div class="text-caption text-medium-emphasis">{{ opt.help }}</div>
                  </div>
                </div>
              </template>
            </v-switch>
          </div>

          <v-alert
            v-if="atLeastOneError"
            border="start"
            class="mt-4"
            density="compact"
            type="error"
            variant="tonal"
          >
            Pick at least one content type — your storefront can't accept nothing.
          </v-alert>

          <v-alert
            v-else-if="collectionWithoutEntriesError"
            border="start"
            class="mt-4"
            density="compact"
            type="error"
            variant="tonal"
          >
            Collections bundle entries together, so you need at least one
            entry type on (video, audio, image or resource) before you can
            allow collections.
          </v-alert>

          <div class="d-flex justify-end mt-4 ga-2">
            <v-btn
              :disabled="!isDirty || saving"
              variant="text"
              @click="reset"
            >
              Reset
            </v-btn>
            <v-btn
              color="primary"
              :disabled="!isDirty || hasValidationError"
              :loading="saving"
              variant="flat"
              @click="save"
            >
              Save changes
            </v-btn>
          </div>
        </v-card-text>
      </v-card>

      <v-alert
        border="start"
        class="mt-4"
        icon="mdi-eye-outline"
        type="info"
        variant="tonal"
      >
        <div class="text-subtitle-2 font-weight-medium">What your visitors see</div>

        <div class="text-body-2">
          Only the tabs you keep on show up on the storefront, and the
          upload menu only offers those types. Anything that was already
          uploaded stays browseable so people don't lose access to content
          they have already paid for.
        </div>
      </v-alert>

      <v-card class="mt-4" variant="tonal">
        <v-card-item>
          <template #prepend>
            <v-icon color="info" icon="mdi-information-outline" />
          </template>

          <v-card-title class="text-subtitle-1">When to restrict content types</v-card-title>
        </v-card-item>

        <v-card-text class="text-body-2">
          <ul class="pl-4">
            <li>Your storefront has a clear identity — for example "images only" like Instagram, "audio only" like Spotify, or "video only" like YouTube.</li>
            <li>You want creators to focus on one or two formats instead of uploading everything.</li>
            <li>You don't have moderation rules ready for a particular type yet.</li>
            <li>You sell a specific format (courses = resources, podcasts = audio, photo packs = images) and want the storefront to look the part.</li>
          </ul>
        </v-card-text>
      </v-card>
    </template>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000">
      {{ snackbarText }}
    </v-snackbar>
  </v-container>
</template>

<script lang="ts" setup>
  import { computed, ref, watch } from 'vue'

  import { useTenantSettings } from '@/composables/useTenantSettings'

  type TypeKey = 'VIDEO' | 'AUDIO' | 'IMAGE' | 'RESOURCE' | 'COLLECTION'

  const options: { value: TypeKey, label: string, help: string, icon: string }[] = [
    { value: 'VIDEO', label: 'Video', help: 'Movies, clips, vlogs, tutorials.', icon: 'mdi-video-outline' },
    { value: 'AUDIO', label: 'Audio', help: 'Music, podcasts, audiobooks.', icon: 'mdi-music-note' },
    { value: 'IMAGE', label: 'Image', help: 'Photos, illustrations, comics.', icon: 'mdi-image-outline' },
    { value: 'RESOURCE', label: 'Resource', help: 'PDFs, e-books, downloads, courses.', icon: 'mdi-text-box-outline' },
    { value: 'COLLECTION', label: 'Collection', help: 'Bundles that group several entries.', icon: 'mdi-folder-multiple-outline' },
  ]

  const {
    tenant, loading, loadError, saving, loadTenant, saveTenant,
    snackbar, snackbarText, snackbarColor,
  } = useTenantSettings()

  // Local draft so the owner can flip several switches before saving.
  // Null/empty allowedEntryTypes on the server == "all allowed", so the
  // default state of every switch when nothing is restricted is ON.
  const draft = ref<Record<TypeKey, boolean>>({
    VIDEO: true, AUDIO: true, IMAGE: true, RESOURCE: true, COLLECTION: true,
  })

  function hydrate () {
    const list = tenant.value?.allowedEntryTypes
    if (!list || list.length === 0) {
      draft.value = { VIDEO: true, AUDIO: true, IMAGE: true, RESOURCE: true, COLLECTION: true }
      return
    }
    const set = new Set(list.map(s => s.toUpperCase()))
    draft.value = {
      VIDEO: set.has('VIDEO'),
      AUDIO: set.has('AUDIO'),
      IMAGE: set.has('IMAGE'),
      RESOURCE: set.has('RESOURCE'),
      COLLECTION: set.has('COLLECTION'),
    }
  }

  watch(tenant, hydrate, { immediate: true })

  const selected = computed<TypeKey[]>(() =>
    options.map(o => o.value).filter(k => draft.value[k]),
  )

  const atLeastOneError = computed(() => selected.value.length === 0)

  // Collections bundle entries, so "collections only" makes no sense —
  // a tenant that turns COLLECTION on must also keep at least one
  // entry type (VIDEO / AUDIO / IMAGE / RESOURCE) on.
  const ENTRY_TYPES: TypeKey[] = ['VIDEO', 'AUDIO', 'IMAGE', 'RESOURCE']
  const hasAnyEntryType = computed(() => ENTRY_TYPES.some(k => draft.value[k]))
  const collectionWithoutEntriesError = computed(
    () => draft.value.COLLECTION && !hasAnyEntryType.value,
  )
  const hasValidationError = computed(
    () => atLeastOneError.value || collectionWithoutEntriesError.value,
  )

  const isDirty = computed(() => {
    const current = (tenant.value?.allowedEntryTypes ?? null)
    const currentSet = new Set((current ?? []).map(s => s.toUpperCase()))
    const draftSet = new Set(selected.value)
    // Server-side "null/empty == all allowed". Same goes for the draft:
    // an all-on draft is equivalent to a cleared allowlist.
    const allOn = selected.value.length === options.length
    const currentlyUnrestricted = current === null || current.length === 0
    if (allOn && currentlyUnrestricted) return false
    if (allOn !== currentlyUnrestricted) return true
    if (draftSet.size !== currentSet.size) return true
    for (const k of draftSet) if (!currentSet.has(k)) return true
    return false
  })

  function onToggle (key: TypeKey, value: boolean | null) {
    if (value === null) return
    draft.value = { ...draft.value, [key]: value }
  }

  function reset () {
    hydrate()
  }

  async function save () {
    if (hasValidationError.value) return
    // All-on draft → send an empty array so the server clears the
    // restriction and the tenant goes back to "no allowlist".
    const allOn = selected.value.length === options.length
    const payload = allOn
      ? { allowedEntryTypes: [] }
      : { allowedEntryTypes: selected.value }
    await saveTenant(payload, 'Content types updated')
  }
</script>
