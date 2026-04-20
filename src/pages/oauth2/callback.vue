<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col class="text-center" cols="12">
        <v-breadcrumbs class="justify-center" :items="[{ title: 'earnlumens', disabled: true }, { title: 'authentication', disabled: true }]" />

        <template v-if="pendingInvite && !errorMessage">
          <v-card class="mx-auto pa-6 text-left" max-width="540" variant="outlined">
            <div class="text-h6 mb-2">Moderation Invitation</div>
            <p class="text-body-1 mb-4">
              You were invited to moderate tenant
              <strong>{{ pendingInvite.tenantId }}</strong>.
              To continue, you must accept this invitation.
            </p>
            <div class="d-flex ga-3 justify-end">
              <v-btn :disabled="isAccepting" to="/" variant="text">Cancel</v-btn>
              <v-btn color="primary" :loading="isAccepting" @click="handleAcceptInvitation">
                Accept Invitation
              </v-btn>
            </div>
          </v-card>
        </template>

        <v-progress-circular
          v-if="!errorMessage && !pendingInvite"
          class="mb-4"
          color="primary"
          indeterminate
          size="64"
          width="6"
        />
        <p v-if="!errorMessage && !pendingInvite" class="text-body-1 text-medium-emphasis">
          Authenticating...
        </p>

        <template v-if="errorMessage">
          <div class="text-body-1 font-weight-medium mb-2">Authentication failed</div>
          <div class="text-body-2 text-medium-emphasis mb-6">{{ errorMessage }}</div>
          <v-btn size="small" to="/" variant="outlined">
            Back
          </v-btn>
        </template>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts" setup>
  import { onMounted, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { acceptModeratorInvitation, createSession } from '@/api/auth'
  import { setToken } from '@/services/tokenWorkerClient'
  import { parseUserFromToken, useAuthStore } from '@/stores/auth'

  const route = useRoute()
  const router = useRouter()
  const authStore = useAuthStore()
  const errorMessage = ref<string | null>(null)
  const pendingInvite = ref<{ uuid: string, tenantId: string } | null>(null)
  const isAccepting = ref(false)

  async function completeLogin (accessToken: string) {
    await setToken(accessToken)
    const userProfile = parseUserFromToken(accessToken)
    if (userProfile) {
      authStore.setUser(userProfile)
    } else {
      authStore.setAuthenticated(true)
    }
    await router.replace('/dashboard')
  }

  async function handleAcceptInvitation () {
    if (!pendingInvite.value?.uuid) return

    try {
      isAccepting.value = true
      const { accessToken } = await acceptModeratorInvitation(pendingInvite.value.uuid)
      await completeLogin(accessToken)
    } catch (error: unknown) {
      errorMessage.value = error instanceof Error ? error.message : 'Could not accept invitation. Please try again.'
    } finally {
      isAccepting.value = false
    }
  }

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

    const isPendingInvite = route.query.pendingInvite === '1'
    if (isPendingInvite) {
      const tenantId = ((route.query.tenantId as string | undefined) || 'unknown').trim()
      pendingInvite.value = { uuid, tenantId }
      return
    }

    try {
      const { accessToken } = await createSession(uuid)
      await completeLogin(accessToken)
    } catch (error_: unknown) {
      errorMessage.value = error_ instanceof Error ? error_.message : 'Authentication failed. Please try again.'
    }
  })
</script>
