<template>
  <v-menu v-if="tenants.length > 0">
    <template #activator="{ props: activator }">
      <v-btn
        v-bind="activator"
        append-icon="mdi-chevron-down"
        class="text-none me-2"
        :prepend-icon="tenants.length > 1 ? 'mdi-domain' : 'mdi-domain'"
        size="small"
        :title="$t('tenants.switcher.label')"
        variant="tonal"
      >
        <v-progress-circular
          v-if="!labelsReady"
          color="primary"
          indeterminate
          size="14"
          width="2"
        />
        <template v-else>
          <span class="d-none d-sm-inline">{{ activeLabel }}</span>
          <span class="d-sm-none">{{ activeLabel.slice(0, 8) }}</span>
          <v-chip
            v-if="activeRoleChip"
            class="ml-2"
            :color="activeRoleChip.color"
            size="x-small"
            variant="tonal"
          >
            {{ activeRoleChip.label }}
          </v-chip>
        </template>
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
  const { labelFor, loaded } = useTenantLabels()

  const tenants = computed(() => allUserTenants(authStore.user))

  const activeLabel = computed(() => {
    const id = authStore.activeTenantId ?? tenants.value[0] ?? ''
    return id ? labelFor(id) : ''
  })

  // Hide the raw ObjectId fallback while the label cache is still loading; the
  // 'earnlumens' root tenant is special-cased to a static label inside the
  // composable, so it doesn't need to wait for the network round-trip.
  const labelsReady = computed(() => {
    const id = authStore.activeTenantId ?? tenants.value[0] ?? ''
    return loaded.value || id === 'earnlumens'
  })

  function roleOf (tenantId: string): 'admin' | 'moderator' {
    if (authStore.user?.tenantAdminOf?.includes(tenantId)) return 'admin'
    return 'moderator'
  }

  // Shown inline in the switcher button so the user immediately sees the
  // scope of the active context (admin vs moderator) without opening the
  // menu. SUPERADMIN is global and gets its own chip in the app bar already.
  const activeRoleChip = computed<{ label: string, color: string } | null>(() => {
    if (authStore.user?.role === 'SUPERADMIN') return null
    const id = authStore.activeTenantId
    if (!id) return null
    if (authStore.user?.tenantAdminOf?.includes(id)) {
      return { label: 'admin', color: 'primary' }
    }
    if (authStore.user?.moderatorOf?.includes(id)) {
      return { label: 'mod', color: 'secondary' }
    }
    return null
  })

  function select (tenantId: string) {
    authStore.setActiveTenant(tenantId)
  }
</script>
