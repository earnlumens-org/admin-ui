<template>
  <v-app>
    <template v-if="showAdminShell">
      <v-app-bar>
        <v-btn v-show="!drawer || !mdAndUp" icon="mdi-menu" @click="drawer = !drawer" />

        <v-toolbar-title>
          <b class="pl-1 font-weight-bold text-label-large">EARNLUMENS</b>
          <v-chip class="ml-2" color="primary" size="x-small" variant="tonal">ADMIN</v-chip>
        </v-toolbar-title>

        <template #append>
          <v-chip class="hidden-sm-and-down mr-2" size="small" variant="tonal">{{ authStore.user?.username }}</v-chip>
          <v-menu>
            <template #activator="{ props }">
              <v-btn
                v-bind="props"
                class="mr-3"
                icon
                variant="text"
              >
                <v-avatar class="avatar-grayscale">
                  <v-img v-if="authStore.user?.profileImageUrl" :src="authStore.user.profileImageUrl" />
                  <v-icon v-else icon="mdi-account-circle" />
                </v-avatar>
              </v-btn>
            </template>
            <v-list density="compact" min-width="180">
              <v-list-item>
                <v-list-item-title class="text-body-2">{{ authStore.user?.displayName }}</v-list-item-title>
                <v-list-item-subtitle>@{{ authStore.user?.username }}</v-list-item-subtitle>
              </v-list-item>
              <v-divider />
              <v-list-item
                prepend-icon="mdi-circle-half-full"
                :title="isDark ? 'Light mode' : 'Dark mode'"
                @click="toggleTheme"
              />
              <v-list-item title="Sign out" @click="handleLogout" />
            </v-list>
          </v-menu>
        </template>
      </v-app-bar>

      <v-navigation-drawer v-model="drawer" width="220">
        <v-list class="mt-1" density="compact" nav>
          <v-list-item
            prepend-icon="mdi-view-dashboard-outline"
            title="Dashboard"
            to="/dashboard"
          />
          <v-list-item
            v-if="isSuperadmin"
            prepend-icon="mdi-domain"
            title="Tenants"
            to="/tenants"
          />
          <v-list-item
            v-if="isSuperadmin"
            prepend-icon="mdi-shield-account-outline"
            title="Supervisors"
            to="/supervisors"
          />
          <v-list-item
            prepend-icon="mdi-file-check-outline"
            to="/moderation"
          >
            <v-list-item-title>Moderation</v-list-item-title>
            <template v-if="inReviewCount > 0" #append>
              <v-badge
                color="warning"
                :content="inReviewCount"
                inline
              />
            </template>
          </v-list-item>
          <v-list-item
            v-if="isSuperadmin"
            prepend-icon="mdi-tune-variant"
            title="Moderation Settings"
            to="/moderation-settings"
          />
          <v-list-item
            prepend-icon="mdi-flag-outline"
            to="/reports"
          >
            <v-list-item-title>Reports</v-list-item-title>
            <template v-if="openReportsCount > 0" #append>
              <v-badge
                color="error"
                :content="openReportsCount"
                inline
              />
            </template>
          </v-list-item>
          <v-list-item
            v-if="isSuperadmin"
            prepend-icon="mdi-account-badge-outline"
            title="Moderators"
            to="/moderators"
          />
          <v-list-item
            v-if="isSuperadmin"
            prepend-icon="mdi-account-group-outline"
            title="Users"
            to="/users"
          />
          <v-list-item
            v-if="isSuperadmin"
            prepend-icon="mdi-history"
            title="Audit Log"
            to="/audit"
          />
          <v-list-item
            v-if="isSuperadmin"
            prepend-icon="mdi-cog-outline"
            title="Settings"
            to="/settings"
          />
        </v-list>

        <template #append>
          <v-list density="compact" nav>
            <v-list-item
              prepend-icon="mdi-logout"
              title="Sign out"
              @click="handleLogout"
            />
          </v-list>
        </template>
      </v-navigation-drawer>
    </template>

    <v-main>
      <router-view />
    </v-main>

    <v-dialog v-model="showError" max-width="400">
      <v-card>
        <v-card-title>Error</v-card-title>
        <v-card-text>{{ authStore.error }}</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="dismissError">OK</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<script lang="ts" setup>
  import { computed, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useDisplay, useTheme } from 'vuetify'
  import { useSidebarBadges } from '@/composables/useSidebarBadges'
  import { useAuthStore } from '@/stores/auth'

  const authStore = useAuthStore()
  const route = useRoute()
  const router = useRouter()
  const theme = useTheme()
  const { mdAndUp } = useDisplay()
  const { inReviewCount, openReportsCount } = useSidebarBadges()

  const isSuperadmin = computed(() => authStore.user?.role === 'SUPERADMIN')

  const authRoutes = new Set(['/', '/oauth2/callback'])

  const showAdminShell = computed(() => {
    return authStore.isAuthenticated && !authRoutes.has(route.path)
  })

  const drawer = ref(true)

  // On mobile, drawer starts closed
  watch(mdAndUp, val => {
    drawer.value = val
  }, { immediate: true })

  const isDark = computed(() => theme.global.current.value.dark)

  function toggleTheme () {
    const next = theme.global.current.value.dark ? 'light' : 'dark'
    theme.global.name.value = next
    localStorage.setItem('theme', next)
  }

  // Restore saved theme
  const saved = localStorage.getItem('theme')
  if (saved === 'dark' || saved === 'light') {
    theme.global.name.value = saved
  }

  const showError = ref(false)

  watch(
    () => authStore.error,
    newError => {
      if (newError) showError.value = true
    },
  )

  function dismissError () {
    showError.value = false
    authStore.error = null
  }

  async function handleLogout () {
    await authStore.logout()
    router.push('/')
  }
</script>

<style scoped>
.avatar-grayscale {
  filter: grayscale(100%);
}
</style>
