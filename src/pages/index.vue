<template>
  <v-container class="fill-height" fluid>
    <v-fade-transition mode="out-in">
      <!--
        Avoid flashing the sign-in card when an already-authenticated user
        lands on "/" (e.g. via deep link or browser back). Wait until the
        session rehydration completed and we know the user is anonymous
        before painting the card; otherwise show a centered loader while
        we redirect to the dashboard.
      -->
      <v-row v-if="showLogin" key="login" align="center" justify="center">
        <v-col cols="12" lg="3" md="5" sm="8">
          <v-card class="pa-8">
            <div class="text-center mb-6">
              <div class="text-h6 font-weight-bold mb-1">{{ platformName }}</div>
              <div class="text-body-2 text-medium-emphasis">Administration</div>
            </div>

            <v-divider class="mb-6" />

            <v-btn
              block
              color="surface-variant"
              :loading="loading"
              size="large"
              variant="flat"
              @click="loginWithX"
            >
              <template #prepend>
                <svg fill="currentColor" height="18" viewBox="0 0 32 32" width="18">
                  <path d="M 4.0175781 4 L 13.091797 17.609375 L 4.3359375 28 L 6.9511719 28 L 14.246094 19.34375 L 20.017578 28 L 20.552734 28 L 28.015625 28 L 18.712891 14.042969 L 27.175781 4 L 24.560547 4 L 17.558594 12.310547 L 12.017578 4 L 4.0175781 4 z M 7.7558594 6 L 10.947266 6 L 24.279297 26 L 21.087891 26 L 7.7558594 6 z" />
                </svg>
              </template>
              Sign In
            </v-btn>

            <div class="text-caption text-medium-emphasis text-center mt-6">
              Authorized personnel only.
            </div>
          </v-card>

          <div class="text-center mt-4">
            <v-btn
              class="text-caption text-medium-emphasis"
              :href="legalHref"
              rel="noopener noreferrer"
              size="small"
              target="_blank"
              variant="text"
            >
              Legal Notice
            </v-btn>
            <span class="text-medium-emphasis mx-1">|</span>
            <v-btn
              class="text-caption text-medium-emphasis"
              :href="legalHref"
              rel="noopener noreferrer"
              size="small"
              target="_blank"
              variant="text"
            >
              Privacy Policy
            </v-btn>
          </div>
        </v-col>
      </v-row>

      <v-row v-else key="loading" align="center" justify="center">
        <v-col class="text-center" cols="12">
          <v-progress-circular
            color="primary"
            indeterminate
            size="48"
            width="4"
          />
        </v-col>
      </v-row>
    </v-fade-transition>
  </v-container>
</template>

<script lang="ts" setup>
  import { computed, ref, watchEffect } from 'vue'
  import { useRouter } from 'vue-router'
  import { API_BASE_URL, getPlatformDomain, getPlatformName } from '@/config/env'
  import { useAuthStore } from '@/stores/auth'

  const router = useRouter()
  const authStore = useAuthStore()
  const loading = ref(false)
  const platformName = getPlatformName()
  const legalHref = `https://${getPlatformDomain()}/terms`

  // Only render the sign-in card once we are sure the user is anonymous.
  // This prevents the brief "login -> dashboard" flash that authenticated
  // users would otherwise see when landing on "/".
  const showLogin = computed(
    () => authStore.isAuthReady && !authStore.isAuthenticated,
  )

  watchEffect(() => {
    if (authStore.isAuthReady && authStore.isAuthenticated) {
      router.replace('/dashboard')
    }
  })

  function loginWithX () {
    loading.value = true
    window.location.href = `${API_BASE_URL}/oauth2/authorization/x`
  }
</script>
