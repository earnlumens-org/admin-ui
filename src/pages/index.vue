<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="5" lg="3">
        <v-card class="pa-8">
          <div class="text-center mb-6">
            <div class="text-h6 font-weight-bold mb-1">EARNLUMENS</div>
            <div class="text-body-2 text-medium-emphasis">Administration</div>
          </div>

          <v-divider class="mb-6" />

          <v-btn
            block
            size="large"
            color="surface-variant"
            variant="flat"
            :loading="loading"
            @click="loginWithX"
          >
            <template #prepend>
              <svg width="18" height="18" viewBox="0 0 32 32" fill="currentColor">
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
            variant="text"
            size="small"
            class="text-caption text-medium-emphasis"
            href="https://earnlumens.org/terms"
            target="_blank"
            rel="noopener noreferrer"
          >
            Legal Notice
          </v-btn>
          <span class="text-medium-emphasis mx-1">|</span>
          <v-btn
            variant="text"
            size="small"
            class="text-caption text-medium-emphasis"
            href="https://earnlumens.org/terms"
            target="_blank"
            rel="noopener noreferrer"
          >
            Privacy Policy
          </v-btn>
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts" setup>
  import { ref, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { useAuthStore } from '@/stores/auth'
  import { API_BASE_URL } from '@/config/env'

  const router = useRouter()
  const authStore = useAuthStore()
  const loading = ref(false)

  onMounted(() => {
    if (authStore.isAuthenticated) {
      router.replace('/dashboard')
    }
  })

  function loginWithX() {
    loading.value = true
    window.location.href = `${API_BASE_URL}/oauth2/authorization/x`
  }
</script>
