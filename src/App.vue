<template>
  <v-app>
    <template v-if="showAdminShell">
      <v-app-bar>
        <v-btn icon="mdi-menu" v-show="!drawer || !mdAndUp" @click="drawer = !drawer" />

        <v-toolbar-title>
          <b class="pl-1 font-weight-bold text-label-large">EARNLUMENS</b>
          <v-chip size="x-small" color="primary" variant="tonal" class="ml-2">ADMIN</v-chip>
        </v-toolbar-title>

        <template #append>
          <v-chip variant="tonal" size="small" class="hidden-sm-and-down mr-2">{{ authStore.user?.username }}</v-chip>
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
        <v-list nav density="compact" class="mt-1">
          <v-list-item
            prepend-icon="mdi-view-dashboard-outline"
            title="Dashboard"
            to="/dashboard"
          />
          <v-list-item
            prepend-icon="mdi-domain"
            title="Tenants"
            to="/tenants"
          />
          <v-list-item
            prepend-icon="mdi-shield-account-outline"
            title="Supervisors"
            to="/supervisors"
          />
          <v-list-item
            prepend-icon="mdi-file-check-outline"
            title="Moderation"
            to="/moderation"
          />
          <v-list-item
            prepend-icon="mdi-tune-variant"
            title="Moderation Settings"
            to="/moderation-settings"
          />
          <v-list-item
            prepend-icon="mdi-account-badge-outline"
            title="Moderators"
            to="/moderators"
          />
          <v-list-item
            prepend-icon="mdi-account-group-outline"
            title="Users"
            to="/users"
          />
          <v-list-item
            prepend-icon="mdi-history"
            title="Audit Log"
            to="/audit"
          />
          <v-list-item
            prepend-icon="mdi-cog-outline"
            title="Settings"
            to="/settings"
          />
        </v-list>

        <template #append>
          <v-list nav density="compact">
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
  import { useDisplay } from 'vuetify'
  import { useRoute, useRouter } from 'vue-router'
  import { useTheme } from 'vuetify'
  import { useAuthStore } from '@/stores/auth'

  const authStore = useAuthStore()
  const route = useRoute()
  const router = useRouter()
  const theme = useTheme()
  const { mdAndUp } = useDisplay()

  const authRoutes = ['/', '/oauth2/callback']

  const showAdminShell = computed(() => {
    return authStore.isAuthenticated && !authRoutes.includes(route.path)
  })

  const drawer = ref(true)

  // On mobile, drawer starts closed
  watch(mdAndUp, (val) => {
    drawer.value = val
  }, { immediate: true })

  const isDark = computed(() => theme.global.current.value.dark)

  function toggleTheme() {
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
    (newError) => {
      if (newError) showError.value = true
    },
  )

  function dismissError() {
    showError.value = false
    authStore.error = null
  }

  async function handleLogout() {
    await authStore.logout()
    router.push('/')
  }
</script>

<style scoped>
.avatar-grayscale {
  filter: grayscale(100%);
}
</style>
