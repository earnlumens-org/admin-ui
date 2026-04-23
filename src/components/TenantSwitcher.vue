<template>
  <v-menu v-if="tenants.length > 0">
    <template #activator="{ props: activator }">
      <v-btn
        v-bind="activator"
        append-icon="mdi-chevron-down"
        class="text-none"
        :prepend-icon="tenants.length > 1 ? 'mdi-domain' : 'mdi-domain'"
        size="small"
        :title="$t('tenants.switcher.label')"
        variant="tonal"
      >
        <span class="d-none d-sm-inline">{{ activeLabel }}</span>
        <span class="d-sm-none">{{ activeLabel.slice(0, 8) }}</span>
      </v-btn>
    </template>
    <v-list density="compact" min-width="200">
      <v-list-subheader>{{ $t('tenants.switcher.label') }}</v-list-subheader>
      <v-list-item
        v-for="id in tenants"
        :key="id"
        :active="id === authStore.activeTenantId"
        :prepend-icon="id === authStore.activeTenantId ? 'mdi-check' : 'mdi-circle-outline'"
        :title="labelFor(id)"
        @click="select(id)"
      >
        <template #append>
          <v-chip
            v-if="roleOf(id) === 'admin'"
            color="primary"
            size="x-small"
            variant="tonal"
          >
            admin
          </v-chip>
          <v-chip
            v-else
            color="secondary"
            size="x-small"
            variant="tonal"
          >
            mod
          </v-chip>
        </template>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script lang="ts" setup>
  import { computed } from 'vue'
  import { useTenantLabels } from '@/composables/useTenantLabels'
  import { allUserTenants, useAuthStore } from '@/stores/auth'

  const authStore = useAuthStore()
  const { labelFor } = useTenantLabels()

  const tenants = computed(() => allUserTenants(authStore.user))

  const activeLabel = computed(() => {
    const id = authStore.activeTenantId ?? tenants.value[0] ?? ''
    return id ? labelFor(id) : ''
  })

  function roleOf (tenantId: string): 'admin' | 'moderator' {
    if (authStore.user?.tenantAdminOf?.includes(tenantId)) return 'admin'
    return 'moderator'
  }

  function select (tenantId: string) {
    authStore.setActiveTenant(tenantId)
  }
</script>
