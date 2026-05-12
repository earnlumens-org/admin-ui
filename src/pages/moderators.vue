<template>
  <v-container class="pa-4 pa-sm-6" fluid>
    <v-breadcrumbs
      class="px-0 pt-0"
      :items="[{ title: 'earnlumens', disabled: true }, { title: 'moderators', disabled: true }]"
    />

    <div class="d-flex flex-column flex-sm-row align-sm-center justify-space-between mb-1">
      <div>
        <div class="text-h6">Moderators</div>
        <div class="text-body-2 text-medium-emphasis mb-4 mb-sm-0">
          Invite and manage tenant moderators
        </div>
      </div>
      <v-btn
        color="primary"
        prepend-icon="mdi-account-plus-outline"
        size="small"
        @click="inviteDialog = true"
      >
        Invite Moderator
      </v-btn>
    </div>

    <v-divider class="mb-4" />

    <v-tabs v-model="tab" class="mb-4">
      <v-tab value="active">
        Active
        <v-badge
          v-if="activeModerators.length > 0"
          class="ml-1"
          color="success"
          :content="activeModerators.length"
          inline
        />
      </v-tab>
      <v-tab value="pending">
        Pending Invitations
        <v-badge
          v-if="pendingModerators.length > 0"
          class="ml-1"
          color="warning"
          :content="pendingModerators.length"
          inline
        />
      </v-tab>
    </v-tabs>

    <!-- Loading -->
    <div v-if="loading" class="d-flex justify-center py-12">
      <v-progress-circular indeterminate />
    </div>

    <!-- Active moderators -->
    <template v-else-if="tab === 'active'">
      <v-card
        v-if="activeModerators.length === 0"
        class="pa-8 text-center"
        variant="tonal"
      >
        <v-icon color="medium-emphasis" size="48">mdi-account-badge-outline</v-icon>
        <div class="text-body-1 mt-4">No active moderators</div>
        <div class="text-body-2 text-medium-emphasis mt-1">
          Invite moderators by their exact X username to help review content.
        </div>
      </v-card>

      <div v-else class="d-flex flex-column ga-2">
        <v-card
          v-for="mod in activeModerators"
          :key="mod.id"
          variant="outlined"
        >
          <div class="d-flex align-center pa-4 ga-3">
            <v-avatar size="40">
              <v-img v-if="mod.profileImageUrl" :src="mod.profileImageUrl" />
              <v-icon v-else>mdi-account-circle</v-icon>
            </v-avatar>
            <div class="flex-grow-1" style="min-width: 0">
              <div class="text-body-1 font-weight-medium">
                {{ mod.displayName || mod.username }}
              </div>
              <div class="text-body-2 text-medium-emphasis">
                @{{ mod.username }}
              </div>
            </div>
            <v-chip
              color="primary"
              label
              size="x-small"
              variant="tonal"
            >
              {{ mod.tenantId }}
            </v-chip>
            <v-chip
              color="success"
              label
              size="x-small"
              variant="tonal"
            >
              Active
            </v-chip>
            <div class="text-caption text-medium-emphasis text-no-wrap">
              Since {{ formatDate(mod.acceptedAt || mod.createdAt) }}
            </div>
            <v-btn
              color="error"
              icon="mdi-account-remove-outline"
              size="small"
              variant="text"
              @click="confirmRevoke(mod)"
            />
          </div>
        </v-card>
      </div>
    </template>

    <!-- Pending invitations -->
    <template v-else>
      <v-card
        v-if="pendingModerators.length === 0"
        class="pa-8 text-center"
        variant="tonal"
      >
        <v-icon color="medium-emphasis" size="48">mdi-email-outline</v-icon>
        <div class="text-body-1 mt-4">No pending invitations</div>
        <div class="text-body-2 text-medium-emphasis mt-1">
          When you invite a moderator, they'll appear here until they sign in.
        </div>
      </v-card>

      <div v-else class="d-flex flex-column ga-2">
        <v-card
          v-for="mod in pendingModerators"
          :key="mod.id"
          variant="outlined"
        >
          <div class="d-flex align-center pa-4 ga-3">
            <v-avatar color="grey-lighten-2" size="40">
              <v-icon>mdi-account-clock-outline</v-icon>
            </v-avatar>
            <div class="flex-grow-1" style="min-width: 0">
              <div class="text-body-1 font-weight-medium">@{{ mod.username }}</div>
              <div class="text-caption text-medium-emphasis">
                Invited by @{{ mod.invitedBy }}
              </div>
            </div>
            <v-chip
              color="primary"
              label
              size="x-small"
              variant="tonal"
            >
              {{ mod.tenantId }}
            </v-chip>
            <v-chip
              color="warning"
              label
              size="x-small"
              variant="tonal"
            >
              Pending
            </v-chip>
            <div class="text-caption text-medium-emphasis text-no-wrap">
              {{ formatDate(mod.createdAt) }}
            </div>
            <v-btn
              color="error"
              icon="mdi-close"
              size="small"
              variant="text"
              @click="confirmRevoke(mod)"
            />
          </div>
        </v-card>
      </div>
    </template>

    <!-- Invite dialog -->
    <v-dialog v-model="inviteDialog" max-width="440">
      <v-card>
        <v-card-title class="text-h6">Invite Moderator</v-card-title>
        <v-card-text>
          <div class="text-body-2 text-medium-emphasis mb-3">
            Enter the exact X (Twitter) username and select a tenant.
            The user will gain access when they sign in.
          </div>
          <v-text-field
            v-model="inviteUsername"
            class="mb-3"
            density="compact"
            label="X Username"
            placeholder="username"
            prefix="@"
            :rules="[v => !!v?.trim() || 'Username is required']"
            variant="outlined"
          />
          <v-select
            v-if="!isTenantOwner"
            v-model="inviteTenant"
            density="compact"
            hide-details
            item-title="title"
            item-value="value"
            :items="tenantOptions"
            label="Tenant"
            variant="outlined"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="inviteDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            :disabled="!inviteUsername?.trim() || !inviteTenant"
            :loading="inviteLoading"
            variant="flat"
            @click="handleInvite"
          >
            Invite
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Revoke confirmation dialog -->
    <v-dialog v-model="revokeDialog" max-width="380">
      <v-card>
        <v-card-title class="text-h6">Revoke Access</v-card-title>
        <v-card-text>
          <div class="text-body-2">
            Remove <strong>@{{ revokeTarget?.username }}</strong> as moderator
            for <strong>{{ revokeTarget?.tenantId }}</strong>?
          </div>
          <div class="text-body-2 text-medium-emphasis mt-2">
            They will lose access immediately on their next request.
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="revokeDialog = false">Cancel</v-btn>
          <v-btn
            color="error"
            :loading="revokeLoading"
            variant="flat"
            @click="handleRevoke"
          >
            Revoke
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000">
      {{ snackbarText }}
    </v-snackbar>
  </v-container>
</template>

<script lang="ts" setup>
  import { computed, onMounted, ref } from 'vue'
  import { fetchTenantIds } from '@/api/moderation'
  import {
    fetchModerators,
    fetchMyTenantModerators,
    inviteModerator,
    inviteMyTenantModerator,
    type ModeratorDto,
    revokeModerator,
    revokeMyTenantModerator,
  } from '@/api/moderators'
  import { useAuthStore } from '@/stores/auth'

  const authStore = useAuthStore()
  const isSuperadmin = computed(() => authStore.user?.role === 'SUPERADMIN')
  /** First (and currently only) tenant the caller owns. */
  const ownedTenantId = computed(() => authStore.user?.tenantAdminOf?.[0] ?? null)
  const isTenantOwner = computed(() => !isSuperadmin.value && !!ownedTenantId.value)

  const tab = ref('active')
  const loading = ref(false)
  const moderators = ref<ModeratorDto[]>([])
  const tenantIds = ref<string[]>([])

  const activeModerators = computed(() =>
    moderators.value.filter(m => m.status === 'ACTIVE'),
  )
  const pendingModerators = computed(() =>
    moderators.value.filter(m => m.status === 'PENDING'),
  )

  // Invite dialog
  const inviteDialog = ref(false)
  const inviteUsername = ref('')
  const inviteTenant = ref('earnlumens')
  const inviteLoading = ref(false)

  // Revoke dialog
  const revokeDialog = ref(false)
  const revokeTarget = ref<ModeratorDto | null>(null)
  const revokeLoading = ref(false)

  // Snackbar
  const snackbar = ref(false)
  const snackbarText = ref('')
  const snackbarColor = ref('')

  const tenantOptions = computed(() => {
    const opts = []
    for (const t of tenantIds.value) {
      opts.push({ title: t === 'earnlumens' ? 'earnlumens (root)' : t, value: t })
    }
    if (!tenantIds.value.includes('earnlumens')) {
      opts.unshift({ title: 'earnlumens (root)', value: 'earnlumens' })
    }
    return opts
  })

  function formatDate (iso: string): string {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  function showSnackbar (text: string, color: string) {
    snackbarText.value = text
    snackbarColor.value = color
    snackbar.value = true
  }

  async function loadData () {
    loading.value = true
    try {
      if (isTenantOwner.value && ownedTenantId.value) {
        // Owner self-service: only the caller's own tenant; no /api/moderation list.
        moderators.value = await fetchMyTenantModerators(ownedTenantId.value)
        tenantIds.value = [ownedTenantId.value]
        inviteTenant.value = ownedTenantId.value
      } else {
        // fetchTenantIds is SUPERADMIN-only on the backend; only call it
        // when we already know the caller is superadmin (this branch is the
        // superadmin/cross-tenant view).
        const [mods, tenants] = await Promise.all([
          fetchModerators(),
          isSuperadmin.value ? fetchTenantIds() : Promise.resolve([] as string[]),
        ])
        moderators.value = mods
        tenantIds.value = tenants
      }
    } catch {
      showSnackbar('Failed to load moderators', 'error')
    } finally {
      loading.value = false
    }
  }

  async function handleInvite () {
    const target = inviteUsername.value.trim().replace(/^@/, '')
    const myHandle = (authStore.user?.username ?? '').trim()
    if (myHandle && target.toLowerCase() === myHandle.toLowerCase()) {
      showSnackbar('You cannot invite yourself as a moderator', 'error')
      return
    }
    inviteLoading.value = true
    try {
      await (isTenantOwner.value && ownedTenantId.value ? inviteMyTenantModerator(ownedTenantId.value, target) : inviteModerator(inviteTenant.value, target))
      showSnackbar(`Invitation sent to @${target}`, 'success')
      inviteDialog.value = false
      inviteUsername.value = ''
      await loadData()
    } catch (error: unknown) {
      showSnackbar(error instanceof Error ? error.message : 'Failed to invite', 'error')
    } finally {
      inviteLoading.value = false
    }
  }

  function confirmRevoke (mod: ModeratorDto) {
    revokeTarget.value = mod
    revokeDialog.value = true
  }

  async function handleRevoke () {
    if (!revokeTarget.value) return
    revokeLoading.value = true
    try {
      await (isTenantOwner.value && ownedTenantId.value ? revokeMyTenantModerator(ownedTenantId.value, revokeTarget.value.id) : revokeModerator(revokeTarget.value.id))
      showSnackbar(`@${revokeTarget.value.username} revoked`, 'success')
      revokeDialog.value = false
      await loadData()
    } catch (error: unknown) {
      showSnackbar(error instanceof Error ? error.message : 'Failed to revoke', 'error')
    } finally {
      revokeLoading.value = false
    }
  }

  onMounted(() => {
    loadData()
  })
</script>
