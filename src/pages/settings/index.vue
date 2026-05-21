<!--
  /settings — hub.

  Top: read-only tenant context (subdomain, owner, platform fee, status)
  so the owner always knows which tenant they are configuring.

  Below: list of configuration sections. Each link navigates to a
  dedicated page so the owner can focus on one configuration domain
  without being distracted by the rest.
-->
<template>
  <v-container class="pa-4 pa-sm-6" fluid>
    <v-breadcrumbs
      class="px-0 pt-0"
      :items="[
        { title: 'earnlumens', disabled: true },
        { title: 'settings', disabled: true },
      ]"
    />

    <div class="text-h6 mb-1">Tenant settings</div>

    <div class="text-body-2 text-medium-emphasis mb-4">
      Pick a section to configure. Tenant identity below is immutable.
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

    <v-card v-else-if="!tenant" class="pa-8 text-center" variant="tonal">
      <v-icon color="medium-emphasis" size="48">mdi-domain-off</v-icon>
      <div class="text-body-1 mt-4">No tenant to configure.</div>

      <div class="text-body-2 text-medium-emphasis mt-1">
        Create your tenant from the Tenants page first.
      </div>

      <v-btn class="mt-4" color="primary" to="/tenants" variant="flat">
        Go to tenants
      </v-btn>
    </v-card>

    <template v-else>
      <!-- Fixed tenant context (read-only). -->
      <v-card class="mb-6">
        <v-card-item>
          <template #prepend>
            <div class="tenant-logo-thumb">
              <v-img
                v-if="logoUrl"
                :alt="tenant.title"
                contain
                :src="logoUrl"
              />

              <v-icon v-else color="primary" size="28">mdi-domain</v-icon>
            </div>
          </template>

          <v-card-title class="text-h6">{{ tenant.title }}</v-card-title>

          <v-card-subtitle>
            <a
              class="text-decoration-none"
              :href="storefrontUrl"
              rel="noopener noreferrer"
              target="_blank"
            >
              {{ tenant.subdomain }}.earnlumens.org
              <v-icon class="ms-1" size="12">mdi-open-in-new</v-icon>
            </a>
          </v-card-subtitle>
        </v-card-item>

        <v-divider />

        <v-card-text class="pa-0">
          <v-row dense no-gutters>
            <v-col cols="12" md="4" sm="6">
              <div class="info-cell">
                <div class="text-caption text-medium-emphasis">Owner</div>
                <div class="text-body-2 font-weight-medium">{{ tenant.ownerDisplayName || tenant.ownerUsername }}</div>
              </div>
            </v-col>

            <v-col cols="12" md="4" sm="6">
              <div class="info-cell">
                <div class="text-caption text-medium-emphasis">Platform fee</div>
                <div class="text-body-2 font-weight-medium">{{ tenant.platformFeePercent }}%</div>
              </div>
            </v-col>

            <v-col cols="12" md="4" sm="6">
              <div class="info-cell">
                <div class="text-caption text-medium-emphasis">Status</div>

                <v-chip
                  :color="tenant.status === 'ACTIVE' ? 'success' : 'error'"
                  density="comfortable"
                  size="small"
                  variant="tonal"
                >
                  {{ tenant.status }}
                </v-chip>
              </div>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Configuration sections. -->
      <v-card>
        <v-list class="py-0" lines="two">
          <template v-for="(section, index) in sections" :key="section.to">
            <v-divider v-if="index > 0" />

            <v-list-item :to="section.to">
              <template #prepend>
                <v-avatar
                  :color="section.color"
                  rounded="lg"
                  size="40"
                  variant="tonal"
                >
                  <v-icon :icon="section.icon" />
                </v-avatar>
              </template>

              <v-list-item-title class="font-weight-medium">
                {{ section.title }}
              </v-list-item-title>

              <v-list-item-subtitle>
                {{ section.subtitle }}
              </v-list-item-subtitle>

              <template #append>
                <v-icon color="medium-emphasis">mdi-chevron-right</v-icon>
              </template>
            </v-list-item>
          </template>
        </v-list>
      </v-card>
    </template>
  </v-container>
</template>

<script lang="ts" setup>
  import { computed } from 'vue'

  import { useTenantSettings } from '@/composables/useTenantSettings'
  import { CDN_BASE_URL } from '@/config/env'
  import { useAuthStore } from '@/stores/auth'

  const authStore = useAuthStore()
  const isSuperadmin = computed(() => authStore.user?.role === 'SUPERADMIN')

  const { tenant, loading, loadError, loadTenant } = useTenantSettings()

  const storefrontUrl = computed(() =>
    tenant.value ? `https://${tenant.value.subdomain}.earnlumens.org` : '#',
  )

  const logoUrl = computed(() => {
    if (!tenant.value?.logoR2Key) return null
    return `${CDN_BASE_URL}/${tenant.value.logoR2Key}`
  })

  const sections = computed(() => {
    const list = [
      {
        title: 'General',
        subtitle: 'Display name and description',
        icon: 'mdi-tune',
        color: 'primary',
        to: '/settings/general',
      },
      {
        title: 'Wallet & Fees',
        subtitle: 'Stellar wallet for payouts and your tenant fee',
        icon: 'mdi-wallet-outline',
        color: 'success',
        to: '/settings/wallet',
      },
      {
        title: 'Storefront branding',
        subtitle: 'Brand text, light and dark logos with live preview',
        icon: 'mdi-palette-outline',
        color: 'info',
        to: '/settings/branding',
      },
    ]

    if (isSuperadmin.value) {
      list.push({
        title: 'Languages',
        subtitle: 'Global i18n catalogue (superadmin only)',
        icon: 'mdi-translate',
        color: 'warning',
        to: '/settings/languages',
      })
    }

    return list
  })
</script>

<style scoped>
.tenant-logo-thumb {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  padding: 4px;
  border-radius: 8px;
  background-color: rgb(var(--v-theme-surface-variant, var(--v-theme-surface)));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  overflow: hidden;
}
.tenant-logo-thumb :deep(.v-img__img) {
  object-fit: contain !important;
}

.info-cell {
  padding: 12px 16px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

@media (min-width: 600px) {
  .info-cell {
    border-top: none;
    border-right: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  }
  .info-cell:last-child {
    border-right: none;
  }
}
</style>
