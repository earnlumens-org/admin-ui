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
            class="mb-3"
            :counter="40"
            hint="English name (1–40 characters). AI translations are generated from this."
            label="Name"
            persistent-hint
            :rules="[
              v => !!v?.trim() || 'Required',
              v => (v ?? '').length <= 40 || 'Max 40 characters',
            ]"
            variant="outlined"
          />

          <v-text-field
            v-model.trim="form.icon"
            class="mb-3"
            hint='Material Design Icon name, e.g. "mdi-compass-outline".'
            label="Icon"
            persistent-hint
            placeholder="mdi-compass-outline"
            :rules="[
              v => !!v?.trim() || 'Required',
              v => /^mdi-[a-z0-9-]{1,40}$/.test(v ?? '') || 'Invalid icon',
            ]"
            variant="outlined"
          >
            <template #prepend-inner>
              <v-icon :icon="form.icon || 'mdi-help-circle-outline'" />
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
  </v-container>
</template>

<script lang="ts" setup>
  import { computed, onMounted, reactive, ref } from 'vue'
  import {
    archiveSpace,
    type CreateSpacePayload,
    createSpace,
    listEnabledLanguages,
    listSpaces,
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
  } from '@/api/spaces'
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
    && /^mdi-[a-z0-9-]{1,40}$/.test(form.icon ?? ''),
  )

  function openCreate () {
    formMode.value = 'create'
    editingId.value = null
    form.baseName = ''
    form.icon = ''
    form.whoCanPublish = 'ALL'
    form.showInSidebar = true
    form.allowPublishing = true
    formError.value = null
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
    formDialog.value = true
  }

  async function submitForm () {
    submitting.value = true
    formError.value = null
    try {
      if (formMode.value === 'create') {
        const payload: CreateSpacePayload = {
          baseName: form.baseName.trim(),
          icon: form.icon.trim(),
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
          icon: form.icon.trim(),
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
