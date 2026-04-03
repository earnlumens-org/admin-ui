<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" class="text-center">
        <v-breadcrumbs :items="[{ title: 'earnlumens', disabled: true }, { title: 'authentication', disabled: true }]" class="justify-center" />
        <v-progress-circular
          v-if="!errorMessage"
          indeterminate
          color="primary"
          size="64"
          width="6"
          class="mb-4"
        />
        <p v-if="!errorMessage" class="text-body-1 text-medium-emphasis">
          Authenticating...
        </p>

        <template v-if="errorMessage">
          <div class="text-body-1 font-weight-medium mb-2">Authentication failed</div>
          <div class="text-body-2 text-medium-emphasis mb-6">{{ errorMessage }}</div>
          <v-btn variant="outlined" size="small" to="/">
            Back
          </v-btn>
        </template>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts" setup>
  import { ref, onMounted } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useAuthStore, parseUserFromToken } from '@/stores/auth'
  import { createSession } from '@/api/auth'
  import { setToken } from '@/services/tokenWorkerClient'

  const route = useRoute()
  const router = useRouter()
  const authStore = useAuthStore()
  const errorMessage = ref<string | null>(null)

  onMounted(async () => {
    const error = route.query.error as string | undefined
    if (error) {
      errorMessage.value = error === 'access_denied'
        ? 'Access denied. Only authorized administrators can sign in.'
        : error
      return
    }

    const uuid = route.query.UUID as string | undefined
    if (!uuid || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid)) {
      errorMessage.value = 'Invalid or missing authentication token.'
      return
    }

    try {
      const { accessToken } = await createSession(uuid)
      // Send token to Web Worker — it will NOT be stored in main thread
      await setToken(accessToken)
      // Parse user profile from token (read-only, token not retained)
      const userProfile = parseUserFromToken(accessToken)
      if (userProfile) {
        authStore.setUser(userProfile)
      } else {
        authStore.setAuthenticated(true)
      }
      router.replace('/dashboard')
    } catch (err: unknown) {
      errorMessage.value = err instanceof Error ? err.message : 'Authentication failed. Please try again.'
    }
  })
</script>
