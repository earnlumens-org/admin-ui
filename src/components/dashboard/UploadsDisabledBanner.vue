<!--
  UploadsDisabledBanner.vue

  Dashboard-level red alert that surfaces a tenant-wide uploads kill
  switch ASAP. Mounts a single GET /api/tenants/me on creation so it
  silently stays hidden for users who don't own a tenant (404) or whose
  tenant has uploads on.

  Re-enabling from this banner is one click — the same PATCH path the
  /settings/uploads page uses, so admin-api's cache invalidator drops
  the storefront cached copy immediately. Disabling lives in the
  settings page, behind a confirmation dialog, on purpose.
-->
<template>
  <v-alert
    v-if="show"
    border="start"
    class="mb-4"
    color="error"
    icon="mdi-cloud-off-outline"
    prominent
    variant="tonal"
  >
    <div class="text-subtitle-1 font-weight-medium">
      Uploads are currently DISABLED for your tenant
    </div>

    <div class="text-body-2 mb-2">
      New uploads are being refused storefront-wide. Existing content and
      orders are unaffected. Re-enable when you're ready to resume.
    </div>

    <div class="d-flex flex-wrap ga-2">
      <v-btn
        color="error"
        :loading="reenabling"
        prepend-icon="mdi-cloud-upload-outline"
        variant="flat"
        @click="reenable"
      >
        Re-enable uploads now
      </v-btn>

      <v-btn
        :to="'/settings/uploads'"
        variant="text"
      >
        Manage in settings
      </v-btn>
    </div>
  </v-alert>
</template>

<script lang="ts" setup>
  import { computed, onMounted, ref } from 'vue'

  import { getMyTenant, type TenantSummary, updateMyTenant } from '@/api/tenants'

  const tenant = ref<TenantSummary | null>(null)
  const reenabling = ref(false)

  const show = computed(() => tenant.value !== null && tenant.value.uploadsEnabled === false)

  onMounted(async () => {
    try {
      tenant.value = await getMyTenant()
    } catch {
      // Silent — the dashboard has other surfaces for tenant errors, and
      // missing tenant data must not break the page for users that simply
      // don't own a tenant.
      tenant.value = null
    }
  })

  async function reenable () {
    if (!tenant.value) return
    reenabling.value = true
    try {
      tenant.value = await updateMyTenant(tenant.value.id, { uploadsEnabled: true })
    } catch {
      // Surface nothing here; /settings/uploads has full error handling.
      // The button stays clickable so the user can retry, and the alert
      // disappears as soon as the next successful PATCH lands.
    } finally {
      reenabling.value = false
    }
  }
</script>
