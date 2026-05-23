<!--
  /settings/uploads — per-tenant uploads kill switch.

  Primary operational control surface for the tenant owner. When the switch
  is OFF, media-store-api refuses every /api/uploads/init and
  /api/uploads/finalize call for this tenant with a 403 carrying
  `error: UPLOADS_DISABLED`. Existing assets and orders are untouched —
  only NEW uploads are blocked.

  Disabling requires explicit confirmation through a dialog so a stray
  click cannot freeze the tenant's content pipeline. Re-enabling is
  one click because that is the safe direction. Both transitions go
  through the same admin-api PATCH and trigger an immediate storefront
  cache invalidation.
-->
<template>
  <v-container class="pa-4 pa-sm-6" fluid>
    <v-breadcrumbs
      class="px-0 pt-0"
      :items="[
        { title: 'earnlumens', disabled: true },
        { title: 'settings', to: '/settings' },
        { title: 'uploads', disabled: true },
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

      <div class="text-h6">Uploads</div>
    </div>

    <div class="text-body-2 text-medium-emphasis mb-4">
      Master switch for new uploads on your storefront. Turning it OFF
      immediately stops creators from uploading new media — existing
      content and orders keep working.
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
            <v-icon
              :color="tenant.uploadsEnabled ? 'success' : 'error'"
              :icon="tenant.uploadsEnabled ? 'mdi-cloud-upload-outline' : 'mdi-cloud-off-outline'"
              size="large"
            />
          </template>

          <v-card-title>
            Uploads are
            <span :class="tenant.uploadsEnabled ? 'text-success' : 'text-error'">
              {{ tenant.uploadsEnabled ? 'enabled' : 'disabled' }}
            </span>
          </v-card-title>

          <v-card-subtitle>
            <template v-if="tenant.uploadsEnabled">
              Creators on your tenant can upload new media right now.
            </template>

            <template v-else>
              New uploads are blocked storefront-wide. Existing content and
              orders are unaffected.
            </template>
          </v-card-subtitle>
        </v-card-item>

        <v-card-text>
          <v-switch
            color="primary"
            :disabled="saving"
            hide-details
            inset
            :label="tenant.uploadsEnabled ? 'Uploads enabled' : 'Uploads disabled'"
            :loading="saving"
            :model-value="tenant.uploadsEnabled"
            @update:model-value="onToggle"
          />
        </v-card-text>
      </v-card>

      <v-alert
        v-if="!tenant.uploadsEnabled"
        border="start"
        class="mt-4"
        icon="mdi-alert-circle-outline"
        type="warning"
        variant="tonal"
      >
        <div class="text-subtitle-2 font-weight-medium">Operational impact</div>

        <div class="text-body-2">
          Storefront upload buttons stay visible but every <code>POST /api/uploads/init</code>
          and <code>POST /api/uploads/finalize</code> returns HTTP 403 with
          <code>UPLOADS_DISABLED</code>. Affected users see a friendly notice
          instead of a generic error.
        </div>
      </v-alert>

      <v-card class="mt-4" variant="tonal">
        <v-card-item>
          <template #prepend>
            <v-icon color="info" icon="mdi-information-outline" />
          </template>

          <v-card-title class="text-subtitle-1">When to disable uploads</v-card-title>
        </v-card-item>

        <v-card-text class="text-body-2">
          <ul class="pl-4">
            <li>You are about to migrate moderation rules and want a clean cutoff.</li>
            <li>An incident is unfolding and you need to stop ingesting new content.</li>
            <li>You're closing the tenant or pausing it during maintenance.</li>
          </ul>
        </v-card-text>
      </v-card>
    </template>

    <v-dialog v-model="confirmOpen" max-width="480" persistent>
      <v-card>
        <v-card-title class="text-h6">Disable uploads?</v-card-title>

        <v-card-text>
          New uploads will be refused immediately across every storefront
          surface (web, API, integrations). Existing content stays online.
          You can re-enable from this page at any time.
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="confirmOpen = false">Cancel</v-btn>

          <v-btn
            color="error"
            :loading="saving"
            variant="flat"
            @click="confirmDisable"
          >
            Disable uploads
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000">
      {{ snackbarText }}
    </v-snackbar>
  </v-container>
</template>

<script lang="ts" setup>
  import { ref } from 'vue'

  import { useTenantSettings } from '@/composables/useTenantSettings'

  const {
    tenant, loading, loadError, saving, loadTenant, saveTenant,
    snackbar, snackbarText, snackbarColor,
  } = useTenantSettings()

  const confirmOpen = ref(false)

  // Re-enabling is one-click (safe direction); disabling routes through
  // the confirmation dialog so a stray click can't freeze the pipeline.
  async function onToggle (next: boolean | null) {
    if (next === null) return
    if (!next) {
      confirmOpen.value = true
      return
    }
    await saveTenant({ uploadsEnabled: true }, 'Uploads enabled')
  }

  async function confirmDisable () {
    const updated = await saveTenant({ uploadsEnabled: false }, 'Uploads disabled')
    if (updated) confirmOpen.value = false
  }
</script>
