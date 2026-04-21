<template>
  <v-container class="pa-4 pa-sm-6" fluid>
    <v-breadcrumbs
      class="px-0 pt-0"
      :items="[{ title: 'earnlumens', disabled: true }, { title: 'tenants', disabled: true }]"
    />

    <div class="text-h6 mb-1">{{ $t('tenants.page.title') }}</div>
    <div class="text-body-2 text-medium-emphasis mb-4">
      {{ isSuperadmin ? $t('tenants.page.subtitle_superadmin') : $t('tenants.page.subtitle_owner') }}
    </div>

    <v-divider class="mb-4" />

    <!-- Loading state -->
    <v-card v-if="loading" class="pa-8 text-center" variant="tonal">
      <v-progress-circular color="primary" indeterminate />
      <div class="text-body-2 text-medium-emphasis mt-3">{{ $t('common.loading') }}</div>
    </v-card>

    <!-- Error state -->
    <v-alert
      v-else-if="loadError"
      border="start"
      class="mb-4"
      type="error"
      variant="tonal"
    >
      {{ localisedLoadError }}
      <template #append>
        <v-btn
          :disabled="loading"
          size="small"
          variant="text"
          @click="refresh"
        >
          {{ $t('common.retry') }}
        </v-btn>
      </template>
    </v-alert>

    <!-- Superadmin: full list of all tenants on the platform -->
    <template v-else-if="isSuperadmin">
      <v-card v-if="tenants.length === 0" class="pa-8 text-center" variant="tonal">
        <v-icon color="medium-emphasis" size="48">mdi-domain</v-icon>
        <div class="text-body-1 mt-4">{{ $t('tenants.page.no_tenants') }}</div>
      </v-card>
      <v-card v-else variant="outlined">
        <v-list>
          <template v-for="(tenant, idx) in tenants" :key="tenant.id">
            <v-divider v-if="idx > 0" />
            <v-list-item lines="two">
              <template #prepend>
                <v-avatar color="primary" rounded="sm" size="40">
                  <v-icon>mdi-domain</v-icon>
                </v-avatar>
              </template>
              <v-list-item-title class="font-weight-medium">{{ tenant.title }}</v-list-item-title>
              <v-list-item-subtitle>
                {{ tenant.subdomain }}.earnlumens.org · @{{ tenant.ownerUsername }}
              </v-list-item-subtitle>
              <template #append>
                <div class="d-flex align-center ga-2">
                  <v-chip size="small" variant="tonal">
                    {{ tenant.tenantFeePercent }}% / {{ tenant.platformFeePercent }}%
                  </v-chip>
                  <v-chip
                    :color="tenant.status === 'ACTIVE' ? 'success' : 'error'"
                    size="small"
                    variant="tonal"
                  >
                    {{ tenant.status.toLowerCase() }}
                  </v-chip>
                </div>
              </template>
            </v-list-item>
          </template>
        </v-list>
      </v-card>
    </template>

    <!-- Non-superadmin owners/moderators -->
    <template v-else>
      <!-- No tenant yet → CTA to open the wizard -->
      <v-card v-if="!myTenant" class="pa-8 text-center" variant="tonal">
        <v-icon color="medium-emphasis" size="48">mdi-domain-plus</v-icon>
        <div class="text-body-1 mt-4">{{ $t('tenants.page.no_tenants') }}</div>
        <v-btn
          class="mt-4"
          color="primary"
          prepend-icon="mdi-plus"
          variant="flat"
          @click="wizardOpen = true"
        >
          {{ $t('tenants.page.create_cta') }}
        </v-btn>
      </v-card>

      <!-- Owns one tenant → show its summary -->
      <v-card v-else class="mb-4" variant="outlined">
        <v-list-item lines="three">
          <template #prepend>
            <v-avatar color="primary" rounded="sm" size="48">
              <v-icon>mdi-domain</v-icon>
            </v-avatar>
          </template>
          <v-list-item-title class="text-h6">{{ myTenant.title }}</v-list-item-title>
          <v-list-item-subtitle>
            <a :href="storefrontUrl" rel="noopener noreferrer" target="_blank">
              {{ myTenant.subdomain }}.earnlumens.org
            </a>
          </v-list-item-subtitle>
          <v-list-item-subtitle>{{ myTenant.description }}</v-list-item-subtitle>
          <template #append>
            <div class="d-flex flex-column align-end ga-1">
              <v-chip
                :color="myTenant.status === 'ACTIVE' ? 'success' : 'error'"
                size="small"
                variant="tonal"
              >
                {{ myTenant.status.toLowerCase() }}
              </v-chip>
              <v-chip size="x-small" variant="tonal">
                {{ myTenant.tenantFeePercent }}% / {{ myTenant.platformFeePercent }}%
              </v-chip>
            </div>
          </template>
        </v-list-item>
      </v-card>

      <!-- "Coming soon" card for an additional paid tenant -->
      <v-card class="mt-6" variant="tonal">
        <v-card-item>
          <template #prepend>
            <v-icon color="medium-emphasis" size="32">mdi-clock-outline</v-icon>
          </template>
          <v-card-title class="d-flex align-center">
            {{ $t('tenants.soon.title') }}
            <v-chip
              class="ml-2"
              color="warning"
              size="x-small"
              variant="tonal"
            >
              {{ $t('tenants.soon.badge') }}
            </v-chip>
          </v-card-title>
          <v-card-subtitle class="text-wrap">
            {{ $t('tenants.soon.body') }}
          </v-card-subtitle>
        </v-card-item>
      </v-card>
    </template>

    <!-- Creation wizard -->
    <TenantWizard
      v-model="wizardOpen"
      @created="onCreated"
    />
  </v-container>
</template>

<script lang="ts" setup>
  import { computed, onMounted, ref } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { getMyTenant, listAllTenants, TenantApiError, type TenantSummary } from '@/api/tenants'
  import TenantWizard from '@/components/TenantWizard.vue'
  import { useAuthStore } from '@/stores/auth'

  const authStore = useAuthStore()
  const { t } = useI18n()

  const isSuperadmin = computed(() => authStore.user?.role === 'SUPERADMIN')

  const loading = ref(false)
  const loadError = ref<string | null>(null)
  const myTenant = ref<TenantSummary | null>(null)
  const tenants = ref<TenantSummary[]>([])
  const wizardOpen = ref(false)

  const storefrontUrl = computed(() =>
    myTenant.value ? `https://${myTenant.value.subdomain}.earnlumens.org` : '',
  )

  const localisedLoadError = computed(() => {
    if (!loadError.value) return ''
    const key = `tenants.errors.${loadError.value}`
    const msg = t(key)
    return msg === key ? t('tenants.errors.unknown_error') : msg
  })

  async function refresh () {
    loading.value = true
    loadError.value = null
    try {
      if (isSuperadmin.value) {
        tenants.value = await listAllTenants()
      } else {
        myTenant.value = await getMyTenant()
      }
    } catch (error) {
      loadError.value = error instanceof TenantApiError ? error.code : 'unknown_error'
    } finally {
      loading.value = false
    }
  }

  function onCreated (tenant: TenantSummary) {
    myTenant.value = tenant
  }

  onMounted(refresh)
</script>
