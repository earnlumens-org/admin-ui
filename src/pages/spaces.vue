<template>
  <v-container class="pa-4 pa-sm-6" fluid>
    <v-breadcrumbs
      class="px-0 pt-0"
      :items="[{ title: 'Spaces', disabled: true }]"
    />

    <div class="d-flex flex-column flex-sm-row align-sm-center ga-2 mb-4">
      <div>
        <div class="text-h6 mb-1">Spaces</div>
        <div class="text-body-2 text-medium-emphasis">
          Publishing destinations shown in the storefront sidebar. The system
          <em>Explore</em> space is always present and cannot be renamed or removed.
        </div>
      </div>
      <v-spacer />
      <v-select
        v-if="tenantOptions.length > 1"
        v-model="selectedTenant"
        density="compact"
        hide-details
        item-title="title"
        item-value="value"
        :items="tenantOptions"
        label="Tenant"
        style="max-width: 240px"
        variant="outlined"
        @update:model-value="loadAll"
      />
      <v-btn
        color="primary"
        :disabled="!selectedTenant || loading"
        prepend-icon="mdi-plus"
        variant="flat"
        @click="openCreate"
      >
        Create space
      </v-btn>
    </div>

    <v-divider class="mb-6" />

    <v-alert v-if="loadError" class="mb-4" type="error" variant="tonal">
      {{ loadError }}
    </v-alert>

    <div v-if="loading" class="d-flex justify-center py-12">
      <v-progress-circular indeterminate />
    </div>

    <template v-else>
      <v-card v-if="!spaces.length">
        <v-card-text class="text-center text-medium-emphasis py-8">
          No spaces yet. Create one to start grouping content.
        </v-card-text>
      </v-card>

      <v-card v-else>
        <v-table density="comfortable">
          <thead>
            <tr>
              <th style="width: 56px"></th>
              <th>Name</th>
              <th>Key</th>
              <th>Sidebar</th>
              <th>Publishing</th>
              <th>Who can publish</th>
              <th>Translations</th>
              <th>Status</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(s, idx) in spaces"
              :key="s.id"
              :class="{ 'opacity-60': s.status === 'ARCHIVED' }"
            >
              <td>
                <div class="d-flex flex-column align-center">
                  <v-btn
                    density="comfortable"
                    :disabled="idx === 0 || s.systemSpace || moving"
                    icon="mdi-chevron-up"
                    size="x-small"
                    variant="text"
                    @click="move(idx, -1)"
                  />
                  <v-btn
                    density="comfortable"
                    :disabled="idx === spaces.length - 1 || s.systemSpace || moving"
                    icon="mdi-chevron-down"
                    size="x-small"
                    variant="text"
                    @click="move(idx, 1)"
                  />
                </div>
              </td>
              <td>
                <div class="d-flex align-center ga-2">
                  <v-icon :icon="s.icon || 'mdi-folder-outline'" />
                  <div>
                    <div class="font-weight-medium">
                      {{ s.systemSpace ? 'Explore' : (s.baseName ?? '—') }}
                      <v-chip
                        v-if="s.systemSpace"
                        class="ml-2"
                        color="primary"
                        size="x-small"
                        variant="tonal"
                      >
                        system
                      </v-chip>
                    </div>
                  </div>
                </div>
              </td>
              <td><code>{{ s.key }}</code></td>
              <td>
                <v-icon
                  :color="s.showInSidebar ? 'success' : 'grey'"
                  :icon="s.showInSidebar ? 'mdi-eye-outline' : 'mdi-eye-off-outline'"
                  size="small"
                />
              </td>
              <td>
                <v-icon
                  :color="s.allowPublishing ? 'success' : 'grey'"
                  :icon="s.allowPublishing ? 'mdi-check-circle-outline' : 'mdi-close-circle-outline'"
                  size="small"
                />
              </td>
              <td>
                <span class="text-caption">{{ publishRuleLabel(s.whoCanPublish) }}</span>
              </td>
              <td>
                <v-btn
                  v-if="!s.systemSpace"
                  density="comfortable"
                  size="small"
                  variant="text"
                  @click="openTranslations(s)"
                >
                  <v-icon start>mdi-translate</v-icon>
                  {{ summariseTranslations(s) }}
                </v-btn>
                <span v-else class="text-caption text-medium-emphasis">global i18n</span>
              </td>
              <td>
                <v-chip
                  :color="s.status === 'ACTIVE' ? 'success' : 'grey'"
                  size="x-small"
                  variant="tonal"
                >
                  {{ s.status }}
                </v-chip>
              </td>
              <td class="text-right">
                <v-btn
                  v-if="!s.systemSpace && s.status === 'ACTIVE'"
                  density="comfortable"
                  icon="mdi-pencil-outline"
                  size="small"
                  variant="text"
                  @click="openEdit(s)"
                />
                <v-btn
                  v-if="!s.systemSpace && s.status === 'ACTIVE'"
                  density="comfortable"
                  icon="mdi-archive-outline"
                  size="small"
                  variant="text"
                  @click="confirmArchive(s)"
                />
                <v-btn
                  v-if="!s.systemSpace && s.status === 'ARCHIVED'"
                  density="comfortable"
                  icon="mdi-restore"
                  size="small"
                  variant="text"
                  @click="handleRestore(s)"
                />
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card>
    </template>

    <!-- ============================================================ -->
    <!--  Create / edit dialog                                        -->
    <!-- ============================================================ -->
    <v-dialog v-model="formDialog" max-width="520" persistent>
      <v-card>
        <v-card-title class="text-h6">
          {{ formMode === 'create' ? 'Create space' : 'Edit space' }}
        </v-card-title>

        <v-card-text>
          <v-text-field
            v-model.trim="form.baseName"
            autofocus
            class="mb-1"
            :counter="40"
            hint="English name (1–40 characters). AI translations are generated from this."
            :label="nameCheckLoading ? 'Name (checking…)' : 'Name'"
            :loading="nameCheckLoading ? 'primary' : false"
            persistent-hint
            :rules="[
              v => !!v?.trim() || 'Required',
              v => (v ?? '').length <= 40 || 'Max 40 characters',
            ]"
            variant="outlined"
          />

          <!-- AI says: not English. Offer one-click swap to suggested English. -->
          <v-alert
            v-if="showNameSuggestion"
            class="mb-3 mt-1"
            color="warning"
            density="comfortable"
            icon="mdi-translate"
            variant="tonal"
          >
            <div class="text-body-2">
              That looks like
              <strong>{{ nameCheck?.detectedLanguageName || 'another language' }}</strong>.
              Space names must be in English so AI can translate them for every
              storefront language.
            </div>
            <div class="text-body-2 mt-1">
              Suggested English name:
              <strong>“{{ nameCheck?.englishSuggestion }}”</strong>
            </div>
            <template #append>
              <div class="d-flex flex-column ga-1">
                <v-btn
                  color="warning"
                  density="comfortable"
                  prepend-icon="mdi-check"
                  size="small"
                  variant="flat"
                  @click="applyNameSuggestion"
                >
                  Use “{{ nameCheck?.englishSuggestion }}”
                </v-btn>
                <v-btn
                  density="comfortable"
                  size="small"
                  variant="text"
                  @click="dismissNameSuggestion"
                >
                  Keep my text
                </v-btn>
              </div>
            </template>
          </v-alert>

          <!-- AI-confirmed English: tiny confirmation, no buttons. -->
          <div
            v-else-if="showNameOk"
            class="d-flex align-center text-success text-caption mb-3 mt-1"
          >
            <v-icon class="me-1" size="16">mdi-check-circle</v-icon>
            English looks good — ready to translate.
          </div>

          <!-- Spacer so the dialog doesn't jump when the alert appears. -->
          <div v-else class="mb-3" />

          <!-- ----------------------------------------------------- icon -->
          <div class="mb-1 text-body-2 text-medium-emphasis">Icon</div>
          <div class="d-flex align-center ga-3 mb-1">
            <v-avatar color="surface-variant" rounded="lg" size="48">
              <v-icon :icon="effectiveIcon" size="28" />
            </v-avatar>
            <div class="flex-grow-1">
              <div class="text-body-1">{{ effectiveIcon }}</div>
              <div class="text-caption text-medium-emphasis">
                {{ form.icon ? 'Custom icon' : 'Default — no icon chosen' }}
              </div>
            </div>
            <v-btn
              prepend-icon="mdi-image-search-outline"
              variant="tonal"
              @click="openIconPicker"
            >
              Choose icon
            </v-btn>
          </div>
          <div class="d-flex align-center mb-3">
            <v-btn
              v-if="form.icon"
              density="comfortable"
              size="small"
              variant="text"
              @click="form.icon = ''"
            >
              Reset to default
            </v-btn>
            <v-spacer />
            <v-btn
              density="comfortable"
              size="small"
              variant="text"
              @click="iconAdvanced = !iconAdvanced"
            >
              <v-icon start size="16">
                {{ iconAdvanced ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
              </v-icon>
              {{ iconAdvanced ? 'Hide' : 'Use custom MDI name' }}
            </v-btn>
          </div>

          <v-text-field
            v-if="iconAdvanced"
            v-model.trim="form.icon"
            class="mb-3"
            hint='Advanced: paste any Material Design Icon name (e.g. "mdi-rocket-launch-outline"). Leave blank to use the default.'
            label="Custom MDI name"
            persistent-hint
            placeholder="mdi-..."
            :rules="[
              v => !v || /^mdi-[a-z0-9-]{1,40}$/.test(v) || 'Must look like \'mdi-something\'',
            ]"
            variant="outlined"
          >
            <template #prepend-inner>
              <v-icon :icon="effectiveIcon" />
            </template>
          </v-text-field>

          <v-select
            v-model="form.whoCanPublish"
            class="mb-3"
            hide-details
            item-title="title"
            item-value="value"
            :items="publishRuleOptions"
            label="Who can publish"
            variant="outlined"
          />

          <v-checkbox
            v-model="form.showInSidebar"
            density="compact"
            hide-details
            label="Show in storefront sidebar"
          />
          <v-checkbox
            v-model="form.allowPublishing"
            density="compact"
            hide-details
            label="Allow new content to be published into this space"
          />

          <v-alert v-if="formError" class="mt-3" density="compact" type="error" variant="tonal">
            {{ formError }}
          </v-alert>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn :disabled="submitting" variant="text" @click="formDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            :disabled="!isFormValid || submitting"
            :loading="submitting"
            variant="flat"
            @click="submitForm"
          >
            {{ formMode === 'create' ? 'Create' : 'Save' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ============================================================ -->
    <!--  Archive confirmation                                        -->
    <!-- ============================================================ -->
    <v-dialog v-model="archiveDialog" max-width="440">
      <v-card>
        <v-card-title class="text-h6">Archive space</v-card-title>
        <v-card-text>
          <p class="mb-2">
            Archive <strong>{{ targetSpace?.baseName }}</strong>?
          </p>
          <p class="text-body-2 text-medium-emphasis mb-0">
            Archived spaces are hidden from the storefront and cannot receive new
            publications. Existing content keeps its space assignment so the
            space can be restored later without data loss.
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn :disabled="submitting" variant="text" @click="archiveDialog = false">Cancel</v-btn>
          <v-btn
            color="error"
            :loading="submitting"
            variant="flat"
            @click="handleArchive"
          >
            Archive
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ============================================================ -->
    <!--  Translation editor                                          -->
    <!-- ============================================================ -->
    <v-dialog v-model="translationsDialog" max-width="640" scrollable>
      <v-card>
        <v-card-title class="text-h6">
          Translations — {{ targetSpace?.baseName }}
        </v-card-title>
        <v-card-subtitle style="white-space: normal">
          AI translations are produced automatically. Edit and click
          <em>Mark reviewed</em> to lock a translation in (the AI pipeline will
          never overwrite a reviewed translation unless you explicitly
          regenerate with <em>force</em>).
        </v-card-subtitle>

        <v-card-text style="max-height: 60vh">
          <div v-if="translationsLoading" class="d-flex justify-center py-6">
            <v-progress-circular indeterminate />
          </div>

          <template v-else>
            <v-alert
              v-if="hasStaleTranslations"
              class="mb-3"
              density="compact"
              type="warning"
              variant="tonal"
            >
              The base English name changed after some translations were produced.
              Regenerate to refresh them.
            </v-alert>

            <div
              v-for="lang in enabledLocales"
              :key="lang.code"
              class="mb-3"
            >
              <div class="d-flex align-center ga-2 mb-1">
                <span class="text-caption font-weight-medium">{{ lang.code }}</span>
                <v-chip
                  :color="translationStatusColor(targetSpace?.translationStatus?.[lang.code])"
                  size="x-small"
                  variant="tonal"
                >
                  {{ targetSpace?.translationStatus?.[lang.code] ?? 'PENDING' }}
                </v-chip>
              </div>
              <div class="d-flex ga-2 align-center">
                <v-text-field
                  v-model="translationDrafts[lang.code]"
                  density="compact"
                  hide-details
                  :placeholder="targetSpace?.translations?.[lang.code] ?? 'Pending…'"
                  variant="outlined"
                />
                <v-btn
                  density="comfortable"
                  :disabled="reviewing === lang.code"
                  :loading="reviewing === lang.code"
                  size="small"
                  variant="tonal"
                  @click="markReviewed(lang.code)"
                >
                  Mark reviewed
                </v-btn>
              </div>
            </div>
          </template>
        </v-card-text>

        <v-card-actions>
          <v-btn
            :disabled="regenerating"
            :loading="regenerating && !regenerateForce"
            variant="text"
            @click="regenerate(false)"
          >
            <v-icon start>mdi-refresh</v-icon>
            Regenerate missing
          </v-btn>
          <v-btn
            :disabled="regenerating"
            :loading="regenerating && regenerateForce"
            variant="text"
            @click="regenerate(true)"
          >
            <v-icon start>mdi-refresh-circle</v-icon>
            Regenerate all (force)
          </v-btn>
          <v-spacer />
          <v-btn variant="text" @click="translationsDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackbarColor" location="bottom" timeout="3000">
      {{ snackbarText }}
    </v-snackbar>

    <!-- ============================================================ -->
    <!--  Icon picker                                                 -->
    <!-- ============================================================ -->
    <v-dialog v-model="iconPickerOpen" max-width="560" scrollable>
      <v-card>
        <v-card-title class="text-h6">Choose an icon</v-card-title>
        <v-card-text style="max-height: 60vh">
          <v-text-field
            v-model="iconPickerSearch"
            autofocus
            class="mb-3"
            clearable
            density="comfortable"
            hide-details
            placeholder="Search 7,000+ icons (e.g. cash, heart, rocket)…"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
          />
          <div
            v-if="iconSearchResults.mode === 'curated'"
            class="text-caption text-medium-emphasis mb-2"
          >
            Suggested for spaces — type above to search the full Material
            Design Icons catalogue.
          </div>
          <div
            v-else-if="iconSearchResults.items.length === 0"
            class="text-center text-medium-emphasis py-6"
          >
            No icons match “{{ iconPickerSearch }}”.
          </div>
          <div v-else class="text-caption text-medium-emphasis mb-2">
            <template v-if="iconSearchResults.truncated">
              Showing the first {{ iconSearchResults.items.length }} matches —
              refine your search to narrow down.
            </template>
            <template v-else>
              {{ iconSearchResults.items.length }}
              match{{ iconSearchResults.items.length === 1 ? '' : 'es' }}.
            </template>
          </div>
          <div class="d-flex flex-wrap ga-2">
            <v-card
              v-for="i in iconSearchResults.items"
              :key="i.name"
              class="pa-2 d-flex flex-column align-center text-center"
              :color="effectiveIcon === i.name ? 'primary' : undefined"
              hover
              link
              :title="i.name"
              :variant="effectiveIcon === i.name ? 'tonal' : 'outlined'"
              width="88"
              @click="selectIcon(i.name)"
            >
              <v-icon :icon="i.name" size="28" />
              <div
                class="text-caption mt-1 text-truncate"
                style="max-width: 100%"
              >
                {{ i.label }}
              </div>
            </v-card>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="iconPickerOpen = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script lang="ts" setup>
  import { computed, onMounted, reactive, ref, watch } from 'vue'
  import {
    archiveSpace,
    type CreateSpacePayload,
    createSpace,
    listEnabledLanguages,
    listSpaces,
    type NameValidationResult,
    regenerateTranslations,
    reorderSpaces,
    restoreSpace,
    reviewTranslation,
    SpaceApiError,
    type SpacePublishRule,
    type SpaceResponse,
    type SupportedLanguage,
    type UpdateSpacePayload,
    updateSpace,
    validateSpaceName,
  } from '@/api/spaces'
  import mdiNames from '@/assets/mdi-names.json'
  import { useTenantLabels } from '@/composables/useTenantLabels'
  import { useAuthStore } from '@/stores/auth'

  // -------------------------------------------------------------- auth
  const authStore = useAuthStore()
  const isSuperadmin = computed(() => authStore.user?.role === 'SUPERADMIN')
  const ownedTenants = computed(() => authStore.user?.tenantAdminOf ?? [])
  const { labelFor: tenantLabel } = useTenantLabels()

  // Tenant dropdown — owners only see tenants they own; superadmin can pick any
  // owned tenant or root. Server re-checks ownership on every call.
  const tenantOptions = computed(() => {
    const opts = ownedTenants.value.map(t => ({ title: tenantLabel(t), value: t }))
    if (isSuperadmin.value) {
      const seen = new Set(opts.map(o => o.value))
      if (!seen.has('earnlumens')) {
        opts.unshift({ title: 'earnlumens (root)', value: 'earnlumens' })
      }
    }
    return opts
  })

  function defaultTenant (): string {
    if (authStore.activeTenantId && tenantOptions.value.some(o => o.value === authStore.activeTenantId)) {
      return authStore.activeTenantId
    }
    return tenantOptions.value[0]?.value ?? ''
  }

  const selectedTenant = ref(defaultTenant())

  // -------------------------------------------------------------- state
  const loading = ref(false)
  const loadError = ref<string | null>(null)
  const spaces = ref<SpaceResponse[]>([])
  const enabledLocales = ref<SupportedLanguage[]>([])
  const moving = ref(false)

  const snackbar = ref(false)
  const snackbarText = ref('')
  const snackbarColor = ref('success')

  function showSnack (text: string, color: 'success' | 'error' | 'info' = 'success') {
    snackbarText.value = text
    snackbarColor.value = color
    snackbar.value = true
  }

  function localiseError (err: unknown, fallback: string): string {
    if (err instanceof SpaceApiError) return err.code
    if (err instanceof Error) return err.message
    return fallback
  }

  // -------------------------------------------------------------- load
  async function loadAll () {
    if (!selectedTenant.value) return
    loading.value = true
    loadError.value = null
    try {
      const [list, langs] = await Promise.all([
        listSpaces(selectedTenant.value),
        enabledLocales.value.length ? Promise.resolve(enabledLocales.value) : listEnabledLanguages(),
      ])
      spaces.value = list.sort((a, b) => a.sortOrder - b.sortOrder)
      enabledLocales.value = langs.filter(l => l.enabled)
    } catch (err) {
      loadError.value = localiseError(err, 'Failed to load spaces')
    } finally {
      loading.value = false
    }
  }

  onMounted(() => {
    if (!selectedTenant.value) {
      // Tenant list might still be hydrating from the auth store on first load.
      const id = setInterval(() => {
        if (tenantOptions.value.length) {
          selectedTenant.value = defaultTenant()
          clearInterval(id)
          loadAll()
        }
      }, 50)
      // Stop after a few seconds if nothing arrives.
      setTimeout(() => clearInterval(id), 3000)
    } else {
      loadAll()
    }
  })

  // -------------------------------------------------------------- reorder
  async function move (index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= spaces.value.length) return
    if (spaces.value[target]?.systemSpace) return
    const next = spaces.value.slice()
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    moving.value = true
    try {
      const updated = await reorderSpaces(selectedTenant.value, next.map(s => s.id))
      spaces.value = updated.sort((a, b) => a.sortOrder - b.sortOrder)
    } catch (err) {
      showSnack(localiseError(err, 'Reorder failed'), 'error')
    } finally {
      moving.value = false
    }
  }

  // -------------------------------------------------------------- create / edit
  type FormMode = 'create' | 'edit'
  const formDialog = ref(false)
  const formMode = ref<FormMode>('create')
  const submitting = ref(false)
  const formError = ref<string | null>(null)
  const editingId = ref<string | null>(null)

  const form = reactive<Required<Pick<CreateSpacePayload, 'baseName' | 'icon'>> & {
    whoCanPublish: SpacePublishRule
    showInSidebar: boolean
    allowPublishing: boolean
  }>({
    baseName: '',
    icon: '',
    whoCanPublish: 'ALL',
    showInSidebar: true,
    allowPublishing: true,
  })

  const publishRuleOptions: Array<{ title: string, value: SpacePublishRule }> = [
    { title: 'Anyone', value: 'ALL' },
    { title: 'Verified Blue and above', value: 'VERIFIED_BLUE' },
    { title: 'Verified Gold only', value: 'VERIFIED_GOLD' },
  ]

  function publishRuleLabel (r: SpacePublishRule): string {
    return publishRuleOptions.find(o => o.value === r)?.title ?? r
  }

  const isFormValid = computed(() =>
    !!form.baseName?.trim()
    && form.baseName.length <= 40
    && (!form.icon || /^mdi-[a-z0-9-]{1,40}$/.test(form.icon)),
  )

  // ---------------------------------------------------------- icon picker
  // Empty form.icon = use the platform default. The picker writes the chosen
  // mdi name into form.icon; submission falls back to DEFAULT_ICON if empty.
  const DEFAULT_ICON = 'mdi-compass-outline'
  /** Hand-picked quick-picks shown when the search box is empty. */
  const ICON_SUGGESTIONS: Array<{ name: string, label: string }> = [
    { name: 'mdi-compass-outline', label: 'Compass' },
    { name: 'mdi-star-outline', label: 'Star' },
    { name: 'mdi-fire', label: 'Fire' },
    { name: 'mdi-school-outline', label: 'School' },
    { name: 'mdi-account-group-outline', label: 'Community' },
    { name: 'mdi-book-open-page-variant-outline', label: 'Book' },
    { name: 'mdi-rocket-launch-outline', label: 'Rocket' },
    { name: 'mdi-earth', label: 'Earth' },
  ]
  /**
   * Full MDI catalogue (~7.4k names, regenerated at build time from
   * @mdi/svg/meta.json). Names are stored without the 'mdi-' prefix to
   * keep the JSON tiny; the picker prepends it on render.
   */
  const ALL_MDI_NAMES: string[] = mdiNames as string[]
  const ICON_SEARCH_LIMIT = 60

  const iconAdvanced = ref(false)
  const iconPickerOpen = ref(false)
  const iconPickerSearch = ref('')

  const effectiveIcon = computed(() => form.icon?.trim() || DEFAULT_ICON)

  /**
   * When the search box is empty we surface the curated quick-picks.
   * Otherwise we fuzzy-match the full catalogue, capped to keep the DOM
   * snappy. A 'truncated' badge tells the admin to refine when needed.
   */
  const iconSearchResults = computed(() => {
    const q = iconPickerSearch.value.trim().toLowerCase()
    if (!q) {
      return {
        mode: 'curated' as const,
        items: ICON_SUGGESTIONS,
        total: ICON_SUGGESTIONS.length,
        truncated: false,
      }
    }
    const matches: Array<{ name: string, label: string }> = []
    for (const raw of ALL_MDI_NAMES) {
      if (raw.includes(q)) {
        matches.push({ name: 'mdi-' + raw, label: raw })
        if (matches.length > ICON_SEARCH_LIMIT) break
      }
    }
    const truncated = matches.length > ICON_SEARCH_LIMIT
    if (truncated) matches.length = ICON_SEARCH_LIMIT
    // Heuristic: count beyond the cap is unknown without scanning the
    // whole array; surface 'many more' when truncated.
    return {
      mode: 'search' as const,
      items: matches,
      total: matches.length,
      truncated,
    }
  })

  function openIconPicker () {
    iconPickerSearch.value = ''
    iconPickerOpen.value = true
  }

  function selectIcon (name: string) {
    form.icon = name
    iconPickerOpen.value = false
  }

  // ---------------------------------------------------------- AI name check
  // Real-time language hint for the name field. Debounced + abortable so a
  // fast typist generates at most one in-flight request.
  const nameCheck = ref<NameValidationResult | null>(null)
  const nameCheckLoading = ref(false)
  const nameCheckIgnored = ref(false) // admin clicked "Use anyway"
  let nameCheckTimer: ReturnType<typeof setTimeout> | null = null
  let nameCheckCtrl: AbortController | null = null

  function resetNameCheck () {
    if (nameCheckTimer) { clearTimeout(nameCheckTimer); nameCheckTimer = null }
    if (nameCheckCtrl) { nameCheckCtrl.abort(); nameCheckCtrl = null }
    nameCheck.value = null
    nameCheckLoading.value = false
    nameCheckIgnored.value = false
  }

  function scheduleNameCheck (raw: string) {
    const text = (raw ?? '').trim()
    if (nameCheckTimer) clearTimeout(nameCheckTimer)
    if (nameCheckCtrl) nameCheckCtrl.abort()
    nameCheck.value = null
    nameCheckLoading.value = false
    if (!text || text.length < 2 || !selectedTenant.value) return
    nameCheckTimer = setTimeout(async () => {
      const ctrl = new AbortController()
      nameCheckCtrl = ctrl
      nameCheckLoading.value = true
      try {
        const r = await validateSpaceName(selectedTenant.value, text, ctrl.signal)
        if (!ctrl.signal.aborted) nameCheck.value = r
      } catch (e) {
        // Silently degrade — hint only.
        if (!(e instanceof DOMException && e.name === 'AbortError')) {
          nameCheck.value = null
        }
      } finally {
        if (nameCheckCtrl === ctrl) nameCheckCtrl = null
        nameCheckLoading.value = false
      }
    }, 600)
  }

  watch(() => form.baseName, v => {
    nameCheckIgnored.value = false
    scheduleNameCheck(v)
  })

  function applyNameSuggestion () {
    const s = nameCheck.value?.englishSuggestion
    if (!s) return
    form.baseName = s
    // The watcher will re-trigger; mark as not-yet-ignored so success state shows.
    nameCheckIgnored.value = false
  }

  function dismissNameSuggestion () {
    nameCheckIgnored.value = true
  }

  // Visible only when AI is confident the name is NOT English AND the admin
  // has not yet applied or dismissed the suggestion.
  const showNameSuggestion = computed(() => {
    const r = nameCheck.value
    return !!r
      && r.english === false
      && !!r.englishSuggestion
      && !nameCheckIgnored.value
  })

  // Visible after AI confirms the name is English (positive feedback).
  const showNameOk = computed(() => {
    const r = nameCheck.value
    return !!r && r.english === true && (form.baseName?.trim().length ?? 0) >= 2
  })

  function openCreate () {
    formMode.value = 'create'
    editingId.value = null
    form.baseName = ''
    form.icon = ''
    form.whoCanPublish = 'ALL'
    form.showInSidebar = true
    form.allowPublishing = true
    formError.value = null
    resetNameCheck()
    formDialog.value = true
  }

  function openEdit (s: SpaceResponse) {
    formMode.value = 'edit'
    editingId.value = s.id
    form.baseName = s.baseName ?? ''
    form.icon = s.icon
    form.whoCanPublish = s.whoCanPublish
    form.showInSidebar = s.showInSidebar
    form.allowPublishing = s.allowPublishing
    formError.value = null
    resetNameCheck()
    formDialog.value = true
  }

  async function submitForm () {
    submitting.value = true
    formError.value = null
    const iconToSend = (form.icon?.trim() || DEFAULT_ICON)
    try {
      if (formMode.value === 'create') {
        const payload: CreateSpacePayload = {
          baseName: form.baseName.trim(),
          icon: iconToSend,
          whoCanPublish: form.whoCanPublish,
          showInSidebar: form.showInSidebar,
          allowPublishing: form.allowPublishing,
        }
        const created = await createSpace(selectedTenant.value, payload)
        spaces.value = [...spaces.value, created].sort((a, b) => a.sortOrder - b.sortOrder)
        showSnack('Space created')
      } else if (editingId.value) {
        const payload: UpdateSpacePayload = {
          baseName: form.baseName.trim(),
          icon: iconToSend,
          whoCanPublish: form.whoCanPublish,
          showInSidebar: form.showInSidebar,
          allowPublishing: form.allowPublishing,
        }
        const updated = await updateSpace(selectedTenant.value, editingId.value, payload)
        spaces.value = spaces.value.map(s => (s.id === updated.id ? updated : s))
        showSnack('Space updated')
      }
      formDialog.value = false
    } catch (err) {
      formError.value = localiseError(err, 'Failed to save space')
    } finally {
      submitting.value = false
    }
  }

  // -------------------------------------------------------------- archive / restore
  const archiveDialog = ref(false)
  const targetSpace = ref<SpaceResponse | null>(null)

  function confirmArchive (s: SpaceResponse) {
    targetSpace.value = s
    archiveDialog.value = true
  }

  async function handleArchive () {
    if (!targetSpace.value) return
    submitting.value = true
    try {
      const updated = await archiveSpace(selectedTenant.value, targetSpace.value.id)
      spaces.value = spaces.value.map(s => (s.id === updated.id ? updated : s))
      archiveDialog.value = false
      showSnack('Space archived')
    } catch (err) {
      showSnack(localiseError(err, 'Archive failed'), 'error')
    } finally {
      submitting.value = false
    }
  }

  async function handleRestore (s: SpaceResponse) {
    try {
      const updated = await restoreSpace(selectedTenant.value, s.id)
      spaces.value = spaces.value.map(sp => (sp.id === updated.id ? updated : sp))
      showSnack('Space restored')
    } catch (err) {
      showSnack(localiseError(err, 'Restore failed'), 'error')
    }
  }

  // -------------------------------------------------------------- translations
  const translationsDialog = ref(false)
  const translationsLoading = ref(false)
  const translationDrafts = reactive<Record<string, string>>({})
  const reviewing = ref<string | null>(null)
  const regenerating = ref(false)
  const regenerateForce = ref(false)

  const hasStaleTranslations = computed(() => {
    const status = targetSpace.value?.translationStatus ?? {}
    return Object.values(status).some(s => s === 'STALE')
  })

  function summariseTranslations (s: SpaceResponse): string {
    const total = enabledLocales.value.length || Object.keys(s.translationStatus ?? {}).length
    const reviewed = Object.values(s.translationStatus ?? {}).filter(v => v === 'REVIEWED').length
    return total ? `${reviewed}/${total} reviewed` : 'edit'
  }

  function translationStatusColor (s: string | undefined): string {
    if (s === 'REVIEWED') return 'success'
    if (s === 'STALE') return 'warning'
    if (s === 'AI') return 'info'
    return 'grey'
  }

  function openTranslations (s: SpaceResponse) {
    targetSpace.value = s
    Object.keys(translationDrafts).forEach(k => delete translationDrafts[k])
    for (const lang of enabledLocales.value) {
      translationDrafts[lang.code] = s.translations?.[lang.code] ?? ''
    }
    translationsDialog.value = true
  }

  async function refreshTargetSpace () {
    if (!targetSpace.value) return
    const list = await listSpaces(selectedTenant.value)
    spaces.value = list.sort((a, b) => a.sortOrder - b.sortOrder)
    targetSpace.value = spaces.value.find(s => s.id === targetSpace.value!.id) ?? null
  }

  async function markReviewed (locale: string) {
    if (!targetSpace.value) return
    reviewing.value = locale
    try {
      const draft = translationDrafts[locale]?.trim()
      const current = targetSpace.value.translations?.[locale]
      // Only send a value override when the admin actually changed the field.
      const value = draft && draft !== current ? draft : undefined
      const updated = await reviewTranslation(selectedTenant.value, targetSpace.value.id, locale, value)
      spaces.value = spaces.value.map(s => (s.id === updated.id ? updated : s))
      targetSpace.value = updated
      showSnack(`Reviewed ${locale}`)
    } catch (err) {
      showSnack(localiseError(err, 'Review failed'), 'error')
    } finally {
      reviewing.value = null
    }
  }

  async function regenerate (force: boolean) {
    if (!targetSpace.value) return
    regenerating.value = true
    regenerateForce.value = force
    try {
      const res = await regenerateTranslations(selectedTenant.value, targetSpace.value.id, force)
      showSnack(`Enqueued ${res.enqueued} translation jobs`, 'info')
      await refreshTargetSpace()
    } catch (err) {
      showSnack(localiseError(err, 'Regenerate failed'), 'error')
    } finally {
      regenerating.value = false
      regenerateForce.value = false
    }
  }
</script>
