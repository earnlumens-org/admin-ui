<template>
  <div>
    <v-card class="mb-4" variant="flat">
      <v-card-item>
        <v-card-title>Global languages</v-card-title>
        <v-card-subtitle>
          BCP-47 locales available across the platform. Adding a language
          fans out automatic translation for every existing space across
          every tenant. The catalogue is append-only: once a language is
          added it stays, because the UI bundles ship translations for it.
        </v-card-subtitle>
      </v-card-item>
      <v-card-text class="pt-0">
        <div class="d-flex flex-wrap ga-2 align-center mb-3">
          <v-text-field
            v-model="search"
            class="flex-grow-1"
            clearable
            density="comfortable"
            hide-details
            placeholder="Search code or name…"
            prepend-inner-icon="mdi-magnify"
            style="min-width: 220px; max-width: 360px;"
            variant="outlined"
          />
          <v-spacer />
          <v-btn
            color="primary"
            prepend-icon="mdi-plus"
            variant="flat"
            @click="openAdd"
          >
            Add language
          </v-btn>
        </div>

        <v-alert
          v-if="loadError"
          border="start"
          class="mb-3"
          type="error"
          variant="tonal"
        >
          {{ loadError }}
          <template #append>
            <v-btn size="small" variant="text" @click="load">Retry</v-btn>
          </template>
        </v-alert>

        <v-card v-if="loading" class="pa-8 text-center" variant="tonal">
          <v-progress-circular color="primary" indeterminate />
        </v-card>

        <v-card v-else-if="!filtered.length" class="pa-8 text-center" variant="tonal">
          <v-icon color="medium-emphasis" size="48">mdi-translate-off</v-icon>
          <div class="text-body-1 mt-4">
            {{ search ? 'No matches.' : 'No languages defined.' }}
          </div>
        </v-card>

        <template v-else>
          <v-table v-if="mdAndUp" density="comfortable" hover>
            <thead>
              <tr>
                <th style="width: 140px;">Code</th>
                <th>Name</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="lang in filtered" :key="lang.code">
                <td>
                  <code>{{ lang.code }}</code>
                  <v-chip
                    v-if="lang.code === 'en'"
                    class="ml-2"
                    color="primary"
                    size="x-small"
                    variant="tonal"
                  >
                    source
                  </v-chip>
                </td>
                <td>{{ lang.name || '—' }}</td>
              </tr>
            </tbody>
          </v-table>

          <div v-else class="d-flex flex-column ga-2">
            <v-card
              v-for="lang in filtered"
              :key="lang.code"
              variant="outlined"
            >
              <v-card-text class="d-flex align-center ga-3 py-3">
                <div class="flex-grow-1">
                  <div class="d-flex align-center ga-2">
                    <code>{{ lang.code }}</code>
                    <v-chip
                      v-if="lang.code === 'en'"
                      color="primary"
                      size="x-small"
                      variant="tonal"
                    >
                      source
                    </v-chip>
                  </div>
                  <div class="text-body-2 text-medium-emphasis">
                    {{ lang.name || '—' }}
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </div>
        </template>
      </v-card-text>
    </v-card>

    <!-- Add dialog -->
    <v-dialog v-model="addDialog" max-width="460">
      <v-card>
        <v-card-title>Add language</v-card-title>
        <v-card-text>
          <v-alert
            border="start"
            class="mb-3"
            density="compact"
            type="info"
            variant="tonal"
          >
            Adding a language enqueues an AI translation for every existing
            space across every tenant. Make sure the UI bundles already
            ship translations for this locale.
          </v-alert>
          <v-form ref="addForm" v-model="addValid" @submit.prevent="confirmAdd">
            <v-text-field
              v-model.trim="newCode"
              autofocus
              density="comfortable"
              hint="ISO 639-1 or BCP-47, e.g. es, fr, zh-CN"
              label="Locale code"
              :loading="adding"
              maxlength="10"
              persistent-hint
              :rules="[rules.required, rules.format, rules.unique]"
              variant="outlined"
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn :disabled="adding" variant="text" @click="addDialog = false">
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            :disabled="!addValid"
            :loading="adding"
            variant="flat"
            @click="confirmAdd"
          >
            Add
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts" setup>
  import { computed, onMounted, ref } from 'vue'
  import { useDisplay } from 'vuetify'
  import {
    addLanguage,
    listAllLanguages,
    SpaceApiError,
    type SupportedLanguage,
  } from '@/api/spaces'

  const emit = defineEmits<{
    (e: 'notify', text: string, color: string): void
  }>()

  const { mdAndUp } = useDisplay()

  const languages = ref<SupportedLanguage[]>([])
  const loading = ref(false)
  const loadError = ref<string | null>(null)
  const search = ref('')

  const addDialog = ref(false)
  const addValid = ref(false)
  const addForm = ref<any>(null)
  const newCode = ref('')
  const adding = ref(false)

  const CODE_RE = /^[a-zA-Z]{2,3}([-_][a-zA-Z]{2,4})?$/

  const rules = {
    required: (v: string) => (v && v.trim().length > 0) || 'Required',
    format: (v: string) =>
      CODE_RE.test(v ?? '') || 'Use a BCP-47 tag, e.g. es or zh-CN',
    unique: (v: string) =>
      !languages.value.some(
        l => l.code.toLowerCase() === (v ?? '').toLowerCase(),
      ) || 'Already exists',
  }

  const filtered = computed(() => {
    const q = search.value.trim().toLowerCase()
    const sorted = [...languages.value].sort((a, b) =>
      a.code.localeCompare(b.code),
    )
    if (!q) return sorted
    return sorted.filter(
      l =>
        l.code.toLowerCase().includes(q)
        || (l.name ?? '').toLowerCase().includes(q),
    )
  })

  async function load () {
    loading.value = true
    loadError.value = null
    try {
      languages.value = await listAllLanguages()
    } catch (error) {
      loadError.value = errorMessage(error, 'Failed to load languages')
    } finally {
      loading.value = false
    }
  }

  function openAdd () {
    newCode.value = ''
    addDialog.value = true
  }

  async function confirmAdd () {
    const valid = await addForm.value?.validate?.()
    if (valid && valid.valid === false) return
    adding.value = true
    try {
      const saved = await addLanguage(newCode.value.trim())
      languages.value.push(saved)
      emit(
        'notify',
        `Added ${saved.code} — translation jobs enqueued for existing spaces`,
        'success',
      )
      addDialog.value = false
    } catch (error) {
      emit('notify', errorMessage(error, 'Failed to add language'), 'error')
    } finally {
      adding.value = false
    }
  }

  function errorMessage (error: unknown, fallback: string): string {
    if (error instanceof SpaceApiError) return `${fallback}: ${error.code}`
    if (error instanceof Error) return error.message || fallback
    return fallback
  }

  onMounted(load)
</script>
