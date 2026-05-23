<!--
  UploadsDisabledBanner.vue

  Dashboard-level red alert that surfaces a tenant-wide uploads kill
  switch ASAP. Mounts a single GET /api/tenants/me on creation so it
  silently stays hidden for users who don't own a tenant (404) or whose
  tenant has uploads on.

  The banner intentionally exposes ONLY a "Manage in settings" link —
  flipping uploads back on is a deliberate action (it can expose a
  half-configured storefront to creators) and must go through the
  /settings/uploads page where the owner sees the full context. The
  same page is where brand-new tenants enable uploads for the first
  time, since tenants are created with uploads OFF.
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
        prepend-icon="mdi-cog-outline"
        :to="'/settings/uploads'"
        variant="flat"
      >
        Manage in settings
      </v-btn>
    </div>
  </v-alert>
</template>

<script lang="ts" setup>
  import { computed, onMounted, ref } from 'vue'

  import { getMyTenant, type TenantSummary } from '@/api/tenants'

  const tenant = ref<TenantSummary | null>(null)

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
</script>
