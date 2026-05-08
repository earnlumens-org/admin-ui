<template>
  <v-container class="pa-4 pa-sm-6" fluid>
    <v-breadcrumbs class="px-0 pt-0" :items="[{ title: 'earnlumens', disabled: true }, { title: 'users', disabled: true }]" />

    <div class="text-h6 mb-1">Users</div>
    <div class="text-body-2 text-medium-emphasis mb-4">
      Search users, manage block requests and assign credentials
    </div>

    <v-divider class="mb-4" />

    <v-tabs v-model="tab" class="mb-4" color="primary">
      <v-tab v-if="canSeeSuperadminTabs" value="search">Search</v-tab>
      <v-tab v-if="canSeeSuperadminTabs" value="block-requests">Block Requests</v-tab>
      <v-tab v-if="canManageCredentials" value="credentials">
        <v-icon start>mdi-shield-account-outline</v-icon>
        Credentials
      </v-tab>
    </v-tabs>

    <v-window v-model="tab">
      <v-window-item v-if="canSeeSuperadminTabs" value="search">
        <v-card class="pa-8 text-center" variant="tonal">
          <v-icon color="medium-emphasis" size="48">mdi-account-group-outline</v-icon>
          <div class="text-body-1 mt-4">Search for a user</div>
          <div class="text-body-2 text-medium-emphasis mt-1">
            Enter a username to find and view user details.
          </div>
        </v-card>
      </v-window-item>

      <v-window-item v-if="canSeeSuperadminTabs" value="block-requests">
        <v-card class="pa-8 text-center" variant="tonal">
          <v-icon color="medium-emphasis" size="48">mdi-account-cancel-outline</v-icon>
          <div class="text-body-1 mt-4">Block requests</div>
          <div class="text-body-2 text-medium-emphasis mt-1">
            Pending account-block requests will appear here.
          </div>
        </v-card>
      </v-window-item>

      <v-window-item v-if="canManageCredentials" value="credentials">
        <CredentialsPanel :tenant-id="activeTenantId" />
      </v-window-item>
    </v-window>
  </v-container>
</template>

<script lang="ts" setup>
  import { computed, ref, watchEffect } from 'vue'
  import CredentialsPanel from '@/components/credentials/CredentialsPanel.vue'
  import { isActiveTenantOwner, useAuthStore } from '@/stores/auth'

  const authStore = useAuthStore()

  const isSuperadmin = computed(() => authStore.user?.role === 'SUPERADMIN')
  const isActiveTenantAdmin = computed(
    () => isActiveTenantOwner(authStore.user, authStore.activeTenantId),
  )

  const canSeeSuperadminTabs = computed(() => isSuperadmin.value)
  const canManageCredentials = computed(
    () => isSuperadmin.value || isActiveTenantAdmin.value,
  )

  const activeTenantId = computed(() => authStore.activeTenantId)

  // Default tab: superadmins land on Search (their familiar surface), tenant
  // admins land on Credentials (the only tab they can use).
  const tab = ref<string>(canSeeSuperadminTabs.value ? 'search' : 'credentials')

  // Keep the selection valid if the user switches tenant context and loses
  // permission to the currently-selected tab.
  watchEffect(() => {
    if (tab.value === 'search' || tab.value === 'block-requests') {
      if (!canSeeSuperadminTabs.value) {
        tab.value = canManageCredentials.value ? 'credentials' : 'search'
      }
    } else if (tab.value === 'credentials' && !canManageCredentials.value) {
      tab.value = canSeeSuperadminTabs.value ? 'search' : 'credentials'
    }
  })
</script>
