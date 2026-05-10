<template>
  <v-container class="pa-4 pa-sm-6" fluid>
    <v-breadcrumbs
      class="px-0 pt-0"
      :items="[
        { title: 'earnlumens', disabled: true },
        { title: 'users', disabled: true },
      ]"
    />

    <div class="text-h6 mb-1">Users</div>
    <div class="text-body-2 text-medium-emphasis mb-4">
      Search storefront users, review sanction history and assign credentials.
    </div>

    <v-divider class="mb-4" />

    <!-- Tenant selector for SUPERADMIN / multi-tenant moderators. -->
    <div v-if="canSeeSuperadminTabs && tenantOptions.length > 1" class="d-flex justify-end mb-3">
      <v-select
        v-model="activeTenantSelection"
        density="compact"
        hide-details
        item-title="title"
        item-value="value"
        :items="tenantOptions"
        style="max-width: 240px"
        variant="outlined"
      />
    </div>

    <v-tabs v-model="tab" class="mb-4" color="primary">
      <v-tab v-if="canSeeSuperadminTabs" value="search">
        <v-icon start>mdi-magnify</v-icon>
        Search
      </v-tab>
      <v-tab v-if="canSeeSuperadminTabs" value="strikes">
        <v-icon start>mdi-alert-decagram-outline</v-icon>
        With strikes
      </v-tab>
      <v-tab v-if="canSeeSuperadminTabs" value="blocked">
        <v-icon start>mdi-account-cancel-outline</v-icon>
        Banned
      </v-tab>
      <v-tab v-if="canManageCredentials" value="credentials">
        <v-icon start>mdi-shield-account-outline</v-icon>
        Credentials
      </v-tab>
    </v-tabs>

    <SanctionLadderExplainer v-if="tab === 'search' || tab === 'strikes' || tab === 'blocked'" />

    <v-window v-model="tab">
      <v-window-item v-if="canSeeSuperadminTabs" value="search">
        <v-card variant="outlined">
          <v-card-text>
            <v-text-field
              v-model="searchQuery"
              clearable
              density="comfortable"
              hide-details
              label="Username contains…"
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              @keyup.enter="loadList()"
            />
          </v-card-text>
          <UserSanctionList
            :empty-hint="searchQuery ? 'No matches.' : 'Type a username and press Enter.'"
            :loading="loading"
            :rows="rows"
            @open="openDetail"
          />
        </v-card>
      </v-window-item>

      <v-window-item v-if="canSeeSuperadminTabs" value="strikes">
        <v-card variant="outlined">
          <v-card-title class="text-body-2 text-medium-emphasis">
            Users with at least one strike. Click a row to see their full history.
          </v-card-title>
          <UserSanctionList
            empty-hint="No users with strikes — clean platform."
            :loading="loading"
            :rows="rows"
            @open="openDetail"
          />
        </v-card>
      </v-window-item>

      <v-window-item v-if="canSeeSuperadminTabs" value="blocked">
        <v-card variant="outlined">
          <v-card-title class="text-body-2 text-medium-emphasis">
            Currently blocked accounts (temporary and permanent).
          </v-card-title>
          <UserSanctionList
            empty-hint="No banned accounts."
            :loading="loading"
            :rows="rows"
            @open="openDetail"
          />
        </v-card>
      </v-window-item>

      <v-window-item v-if="canManageCredentials" value="credentials">
        <CredentialsPanel :tenant-id="activeTenantId" />
      </v-window-item>
    </v-window>
  </v-container>
</template>

<script lang="ts" setup>
  import { computed, ref, watch, watchEffect } from 'vue'
  import { useRouter } from 'vue-router'
  import CredentialsPanel from '@/components/credentials/CredentialsPanel.vue'
  import SanctionLadderExplainer from '@/components/moderation/SanctionLadderExplainer.vue'
  import UserSanctionList from '@/components/moderation/UserSanctionList.vue'
  import { isActiveTenantOwner, useAuthStore } from '@/stores/auth'
  import { listUsers, type StorefrontUserDto } from '@/api/userModeration'

  const authStore = useAuthStore()
  const router = useRouter()

  const isSuperadmin = computed(() => authStore.user?.role === 'SUPERADMIN')
  const isActiveTenantAdmin = computed(
    () => isActiveTenantOwner(authStore.user, authStore.activeTenantId),
  )
  const canSeeSuperadminTabs = computed(() => isSuperadmin.value)
  const canManageCredentials = computed(
    () => isSuperadmin.value || isActiveTenantAdmin.value,
  )
  const activeTenantId = computed(() => authStore.activeTenantId)

  const tenantOptions = computed(() => {
    const list: { title: string, value: string }[] = []
    const active = activeTenantId.value
    if (active) list.push({ title: active, value: active })
    if (isSuperadmin.value) list.push({ title: 'All tenants (_all)', value: '_all' })
    return list
  })
  const activeTenantSelection = ref<string>(activeTenantId.value || 'earnlumens')
  watchEffect(() => {
    if (activeTenantId.value && !activeTenantSelection.value) {
      activeTenantSelection.value = activeTenantId.value
    }
  })

  const tab = ref<string>(canSeeSuperadminTabs.value ? 'search' : 'credentials')
  watchEffect(() => {
    if (
      tab.value === 'search'
      || tab.value === 'strikes'
      || tab.value === 'blocked'
    ) {
      if (!canSeeSuperadminTabs.value) {
        tab.value = canManageCredentials.value ? 'credentials' : 'search'
      }
    } else if (tab.value === 'credentials' && !canManageCredentials.value) {
      tab.value = canSeeSuperadminTabs.value ? 'search' : 'credentials'
    }
  })

  const searchQuery = ref('')
  const rows = ref<StorefrontUserDto[]>([])
  const loading = ref(false)

  async function loadList () {
    if (!canSeeSuperadminTabs.value) return
    if (tab.value === 'credentials') return
    loading.value = true
    try {
      let filter: 'search' | 'blocked' | 'strikes'
      if (tab.value === 'blocked') filter = 'blocked'
      else if (tab.value === 'strikes') filter = 'strikes'
      else filter = 'search'

      // Search tab requires a query before we hit the backend; otherwise we'd
      // return an empty page and waste a round-trip.
      if (filter === 'search' && !searchQuery.value.trim()) {
        rows.value = []
        return
      }

      const page = await listUsers(
        activeTenantSelection.value,
        filter,
        filter === 'search' ? searchQuery.value.trim() : null,
      )
      rows.value = page.content
    } catch {
      rows.value = []
    } finally {
      loading.value = false
    }
  }

  watch([tab, activeTenantSelection], () => loadList())

  function openDetail (user: StorefrontUserDto) {
    router.push(
      `/users/${encodeURIComponent(user.oauthUserId)}?tenantId=${encodeURIComponent(activeTenantSelection.value)}`,
    )
  }
</script>
