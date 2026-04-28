<route lang="json">
{
  "path": "/moderation/invitations"
}
</route>

<template>
  <v-container class="pa-4 pa-sm-6" fluid>
    <v-breadcrumbs
      class="px-0 pt-0"
      :items="[
        { title: 'earnlumens', disabled: true },
        { title: 'moderation', to: '/moderation' },
        { title: 'invitations', disabled: true },
      ]"
    />

    <div class="d-flex align-center mb-1">
      <div class="text-h6">Moderator invitations</div>
      <v-chip
        v-if="invitations.length > 0"
        class="ml-3"
        color="warning"
        size="small"
        variant="tonal"
      >
        {{ invitations.length }} pending
      </v-chip>
    </div>
    <div class="text-body-2 text-medium-emphasis mb-4">
      Tenants that invited <strong>@{{ authStore.user?.username }}</strong> to moderate their content. Accepting grants
      you the moderator role for that tenant; rejecting hides it from this inbox and notifies the tenant owner.
    </div>

    <v-divider class="mb-4" />

    <v-progress-linear v-if="loading" color="primary" indeterminate />

    <v-alert
      v-else-if="loadError"
      class="mb-4"
      color="error"
      icon="mdi-alert-circle-outline"
      variant="tonal"
    >
      Failed to load invitations. <a class="ml-2" href="#" @click.prevent="loadData">Retry</a>
    </v-alert>

    <v-card
      v-else-if="invitations.length === 0"
      class="pa-8 text-center"
      variant="tonal"
    >
      <v-icon class="mb-2" color="success" icon="mdi-inbox-outline" size="48" />
      <div class="text-subtitle-1">No pending invitations</div>
      <div class="text-body-2 text-medium-emphasis">
        You're all caught up. New invitations will appear here automatically.
      </div>
    </v-card>

    <v-card
      v-for="invite in invitations"
      v-else
      :key="invite.invitationId"
      class="mb-3"
      variant="outlined"
    >
      <v-card-item>
        <template #prepend>
          <v-avatar class="bg-grey-lighten-3" size="48">
            <v-icon icon="mdi-domain" />
          </v-avatar>
        </template>

        <v-card-title class="text-subtitle-1">
          {{ invite.tenantTitle ?? invite.tenantId }}
        </v-card-title>
        <v-card-subtitle>
          <span v-if="invite.tenantSubdomain">{{ invite.tenantSubdomain }}.earnlumens.org · </span>
          Invited by <strong>@{{ invite.invitedBy }}</strong> · {{ formatDate(invite.invitedAt) }}
        </v-card-subtitle>

        <template #append>
          <v-btn
            class="mr-2"
            color="error"
            :disabled="!!busyId"
            :loading="busyId === invite.invitationId && busyAction === 'reject'"
            variant="text"
            @click="onReject(invite)"
          >
            Reject
          </v-btn>
          <v-btn
            color="primary"
            :disabled="!!busyId"
            :loading="busyId === invite.invitationId && busyAction === 'accept'"
            variant="flat"
            @click="onAccept(invite)"
          >
            Accept
          </v-btn>
        </template>
      </v-card-item>
    </v-card>

    <v-snackbar v-model="snackbar" :color="snackbarColor" location="bottom right" :timeout="3500">
      {{ snackbarText }}
    </v-snackbar>

    <v-dialog v-model="rejectDialog" max-width="440">
      <v-card>
        <v-card-title>Reject invitation?</v-card-title>
        <v-card-text>
          You're about to decline the moderator invitation for
          <strong>{{ rejectTarget?.tenantTitle ?? rejectTarget?.tenantId }}</strong>. The tenant owner will be able to
          re-invite you later if needed.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="rejectDialog = false">Cancel</v-btn>
          <v-btn color="error" :loading="!!busyId" variant="flat" @click="confirmReject">Reject</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script lang="ts" setup>
  import { onMounted, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { acceptMyInvitation, fetchMyInvitations, type MyInvitation, rejectMyInvitation } from '@/api/invitations'
  import { useSidebarBadges } from '@/composables/useSidebarBadges'
  import { refreshToken } from '@/services/tokenWorkerClient'
  import { parseUserFromToken, useAuthStore } from '@/stores/auth'

  const authStore = useAuthStore()
  const router = useRouter()
  const { refresh: refreshBadges } = useSidebarBadges()

  const invitations = ref<MyInvitation[]>([])
  const loading = ref(false)
  const loadError = ref(false)

  const busyId = ref<string | null>(null)
  const busyAction = ref<'accept' | 'reject' | null>(null)

  const rejectDialog = ref(false)
  const rejectTarget = ref<MyInvitation | null>(null)

  const snackbar = ref(false)
  const snackbarText = ref('')
  const snackbarColor = ref<'success' | 'error'>('success')

  function showSnackbar (text: string, color: 'success' | 'error' = 'success') {
    snackbarText.value = text
    snackbarColor.value = color
    snackbar.value = true
  }

  function formatDate (iso: string): string {
    try {
      return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    } catch {
      return iso
    }
  }

  async function loadData () {
    loading.value = true
    loadError.value = false
    try {
      invitations.value = await fetchMyInvitations()
    } catch {
      loadError.value = true
    } finally {
      loading.value = false
    }
  }

  /**
   * Refresh the JWT after acceptance so the new moderatorOf claim arrives
   * immediately and the user can switch into the just-joined tenant without
   * waiting for the next scheduled token rotation.
   */
  async function syncSession () {
    try {
      const result = await refreshToken()
      if (result.success && result.accessToken) {
        const profile = parseUserFromToken(result.accessToken)
        if (profile) authStore.setUser(profile)
      }
    } catch {
      // Non-fatal — the next scheduled refresh will pick the new claim up.
    }
  }

  async function onAccept (invite: MyInvitation) {
    busyId.value = invite.invitationId
    busyAction.value = 'accept'
    try {
      await acceptMyInvitation(invite.invitationId)
      invitations.value = invitations.value.filter(i => i.invitationId !== invite.invitationId)
      showSnackbar(`Joined ${invite.tenantTitle ?? invite.tenantId} as moderator`, 'success')
      await syncSession()
      await refreshBadges()
      // If this was the last pending one, send the user back to the dashboard.
      if (invitations.value.length === 0) {
        router.push('/dashboard')
      }
    } catch (error: unknown) {
      showSnackbar(error instanceof Error ? error.message : 'Failed to accept', 'error')
    } finally {
      busyId.value = null
      busyAction.value = null
    }
  }

  function onReject (invite: MyInvitation) {
    rejectTarget.value = invite
    rejectDialog.value = true
  }

  async function confirmReject () {
    if (!rejectTarget.value) return
    const target = rejectTarget.value
    busyId.value = target.invitationId
    busyAction.value = 'reject'
    try {
      await rejectMyInvitation(target.invitationId)
      invitations.value = invitations.value.filter(i => i.invitationId !== target.invitationId)
      rejectDialog.value = false
      showSnackbar('Invitation rejected', 'success')
      await refreshBadges()
    } catch (error: unknown) {
      showSnackbar(error instanceof Error ? error.message : 'Failed to reject', 'error')
    } finally {
      busyId.value = null
      busyAction.value = null
    }
  }

  onMounted(loadData)
</script>
