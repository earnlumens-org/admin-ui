<!--
  /settings/general — tenant display name and description.

  Isolated single-purpose page: only the two editable identity fields
  the owner can change. Everything else (subdomain, fees, status) lives
  on the hub or its own page.
-->
<template>
  <v-container class="pa-4 pa-sm-6" fluid>
    <v-breadcrumbs
      class="px-0 pt-0"
      :items="[
        { title: 'earnlumens', disabled: true },
        { title: 'settings', to: '/settings' },
        { title: 'general', disabled: true },
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

      <div class="text-h6">General</div>
    </div>

    <div class="text-body-2 text-medium-emphasis mb-4">
      Display name and description shown across the storefront.
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
      <v-card>
        <v-card-item>
          <v-card-title>Identity</v-card-title>
          <v-card-subtitle>The tenant's public name and tagline</v-card-subtitle>
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
  import type { TenantSummary, UpdateTenantSettingsPayload } from '@/api/tenants'

  import { computed, reactive, ref, watch } from 'vue'

  import { useTenantSettings } from '@/composables/useTenantSettings'

  const {
    tenant, loading, loadError, saving, loadTenant, saveTenant,
    snackbar, snackbarText, snackbarColor,
  } = useTenantSettings()

  const formValid = ref(true)
  const form = ref<any>(null)

  const draft = reactive({
    title: '',
    description: '',
  })

  const rules = {
    titleRequired: (v: string) => (v && v.trim().length > 0) || 'Required',
    titleLength: (v: string) => (v && v.length >= 2 && v.length <= 80) || 'Between 2 and 80 characters',
    descLength: (v: string) => (!v || v.length <= 280) || 'Up to 280 characters',
  }

  function snapshot (t: TenantSummary) {
    draft.title = t.title ?? ''
    draft.description = t.description ?? ''
  }

  function reset () {
    if (tenant.value) snapshot(tenant.value)
  }

  // Re-snapshot whenever the tenant loads (initial mount or refresh).
  watch(tenant, t => {
    if (t) snapshot(t)
  }, { immediate: true })

  const isDirty = computed(() => {
    if (!tenant.value) return false
    return draft.title !== (tenant.value.title ?? '')
      || draft.description !== (tenant.value.description ?? '')
  })

  async function save () {
    if (!tenant.value) return
    const valid = await form.value?.validate?.()
    if (valid && valid.valid === false) return

    const payload: UpdateTenantSettingsPayload = {}
    if (draft.title !== (tenant.value.title ?? '')) payload.title = draft.title.trim()
    if (draft.description !== (tenant.value.description ?? '')) payload.description = draft.description.trim()

    const updated = await saveTenant(payload)
    if (updated) snapshot(updated)
  }
</script>
