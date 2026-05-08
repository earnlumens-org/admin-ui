<template>
  <v-card variant="flat">
    <v-card-text>
      <v-alert
        border="start"
        class="mb-4"
        density="comfortable"
        :icon="badgeType === 'U2' ? 'mdi-shield-star' : 'mdi-shield-check'"
        type="info"
        variant="tonal"
      >
        {{ helpText }}
      </v-alert>

      <div class="d-flex flex-column flex-sm-row ga-3 mb-4">
        <v-text-field
          v-model="search"
          clearable
          density="comfortable"
          hide-details
          :label="`Filter ${listTitle.toLowerCase()}`"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
        />
        <v-spacer />
        <v-btn
          v-if="canGrant"
          color="amber-darken-3"
          prepend-icon="mdi-plus"
          variant="elevated"
          @click="openGrantDialog"
        >
          {{ grantLabel ?? 'Grant' }}
        </v-btn>
      </div>

      <v-card v-if="loadError" border class="mb-4" variant="flat">
        <v-card-text>
          <v-alert border="start" type="error" variant="tonal">
            {{ loadError }}
            <template #append>
              <v-btn size="small" variant="text" @click="reload">Retry</v-btn>
            </template>
          </v-alert>
        </v-card-text>
      </v-card>

      <v-card v-else-if="loading" class="pa-8 text-center" variant="tonal">
        <v-progress-circular color="primary" indeterminate />
      </v-card>

      <v-card v-else-if="filtered.length === 0" class="pa-8 text-center" variant="tonal">
        <v-icon color="medium-emphasis" size="48">{{ emptyIcon }}</v-icon>
        <div class="text-body-1 mt-4">{{ emptyTitle }}</div>
        <div class="text-body-2 text-medium-emphasis mt-1">
          {{ emptySubtitle }}
        </div>
      </v-card>

      <v-card v-else border variant="flat">
        <v-list lines="two">
          <template v-for="(holder, idx) in filtered" :key="holder.assignmentId">
            <v-list-item :value="holder.assignmentId">
              <template #prepend>
                <v-avatar :image="holder.profileImageUrl ?? undefined" size="40">
                  <v-icon v-if="!holder.profileImageUrl">mdi-account</v-icon>
                </v-avatar>
              </template>

              <v-list-item-title>
                <span class="text-body-1">{{ holder.displayName ?? holder.username ?? holder.oauthUserId }}</span>
                <span v-if="holder.username" class="text-medium-emphasis text-body-2 ml-2">
                  @{{ holder.username }}
                </span>
              </v-list-item-title>

              <v-list-item-subtitle>
                <span class="text-caption text-medium-emphasis">
                  {{ subtitleFor(holder) }}
                </span>
              </v-list-item-subtitle>

              <template #append>
                <v-btn
                  v-if="canRevoke"
                  color="error"
                  density="comfortable"
                  prepend-icon="mdi-shield-off-outline"
                  size="small"
                  variant="tonal"
                  @click="askRevoke(holder)"
                >
                  Revoke
                </v-btn>
              </template>
            </v-list-item>
            <v-divider v-if="idx < filtered.length - 1" />
          </template>
        </v-list>
      </v-card>
    </v-card-text>

    <!-- Grant dialog -->
    <v-dialog v-if="canGrant" v-model="grantOpen" max-width="500">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2" color="amber-darken-2">mdi-shield-star</v-icon>
          Grant Verified Gold
        </v-card-title>
        <v-card-text>
          <p class="text-body-2 text-medium-emphasis mb-4">
            Enter the public X handle of the user you want to verify. They will be
            allowed to publish in spaces restricted to Verified Gold immediately.
          </p>
          <v-text-field
            ref="usernameField"
            v-model="grantUsername"
            autofocus
            :disabled="granting"
            :error-messages="grantError ? [grantError] : []"
            hint="Example: ai_for_work"
            label="X handle"
            persistent-hint
            placeholder="@username"
            prepend-inner-icon="mdi-at"
            variant="outlined"
            @keydown.enter="submitGrant"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn :disabled="granting" variant="text" @click="grantOpen = false">Cancel</v-btn>
          <v-btn
            color="amber-darken-3"
            :disabled="!grantUsername.trim() || granting"
            :loading="granting"
            variant="elevated"
            @click="submitGrant"
          >
            Grant Gold
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Revoke confirm dialog -->
    <v-dialog v-if="canRevoke" v-model="revokeOpen" max-width="460">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2" color="error">mdi-shield-off</v-icon>
          Revoke Verified Gold?
        </v-card-title>
        <v-card-text>
          <p class="text-body-2">
            <strong>{{ pendingRevoke?.displayName ?? pendingRevoke?.username }}</strong>
            will lose the Gold badge immediately. Existing content stays online but
            stops appearing in Verified-Gold-only spaces.
          </p>
          <p v-if="revokeError" class="text-body-2 text-error mt-2">{{ revokeError }}</p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn :disabled="revoking" variant="text" @click="revokeOpen = false">Cancel</v-btn>
          <v-btn
            color="error"
            :loading="revoking"
            variant="elevated"
            @click="confirmRevoke"
          >
            Revoke
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snack.show" :color="snack.color" location="bottom" timeout="3500">
      {{ snack.text }}
    </v-snackbar>
  </v-card>
</template>

<script lang="ts" setup>
  import { computed, onMounted, reactive, ref, watch } from 'vue'
  import {
    type CredentialBadgeType,
    CredentialApiError,
    type CredentialHolder,
    grantGold,
    listHolders,
    revokeGold,
  } from '@/api/credentials'

  const props = defineProps<{
    tenantId: string
    badgeType: CredentialBadgeType
    canGrant: boolean
    canRevoke: boolean
    listTitle: string
    helpText: string
    emptyIcon: string
    emptyTitle: string
    emptySubtitle: string
    grantLabel?: string
  }>()

  const holders = ref<CredentialHolder[]>([])
  const loading = ref(false)
  const loadError = ref<string | null>(null)
  const search = ref('')

  const filtered = computed(() => {
    const q = search.value.trim().toLowerCase()
    if (!q) return holders.value
    return holders.value.filter(h =>
      (h.username ?? '').toLowerCase().includes(q)
      || (h.displayName ?? '').toLowerCase().includes(q),
    )
  })

  function subtitleFor (h: CredentialHolder): string {
    const parts: string[] = []
    if (h.startedAt) parts.push(`Granted ${formatDate(h.startedAt)}`)
    if (h.assignedByUsername) parts.push(`by @${h.assignedByUsername}`)
    else if (h.assignedBy === 'PROMOTION') parts.push('via promotion')
    else if (h.assignedBy === 'SYSTEM') parts.push('by system')
    if (h.expiresAt) parts.push(`expires ${formatDate(h.expiresAt)}`)
    return parts.join(' · ')
  }

  function formatDate (iso: string): string {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
      })
    } catch {
      return iso
    }
  }

  async function reload (): Promise<void> {
    loading.value = true
    loadError.value = null
    try {
      holders.value = await listHolders(props.tenantId, props.badgeType, { limit: 200 })
    } catch (e: unknown) {
      loadError.value = (e as Error)?.message ?? 'Failed to load credentials'
    } finally {
      loading.value = false
    }
  }

  // ---------------- Grant dialog ----------------
  const grantOpen = ref(false)
  const grantUsername = ref('')
  const grantError = ref<string | null>(null)
  const granting = ref(false)

  function openGrantDialog (): void {
    grantUsername.value = ''
    grantError.value = null
    grantOpen.value = true
  }

  async function submitGrant (): Promise<void> {
    const handle = grantUsername.value.trim().replace(/^@/, '')
    if (!handle) return
    granting.value = true
    grantError.value = null
    try {
      const created = await grantGold(props.tenantId, { username: handle })
      // Idempotent UI: replace if exists, else prepend.
      const idx = holders.value.findIndex(h => h.assignmentId === created.assignmentId)
      if (idx >= 0) holders.value.splice(idx, 1, created)
      else holders.value.unshift(created)
      grantOpen.value = false
      showSnack('success', `Gold granted to @${created.username ?? handle}`)
    } catch (e: unknown) {
      grantError.value = mapErrorMessage(e)
    } finally {
      granting.value = false
    }
  }

  // ---------------- Revoke dialog ----------------
  const revokeOpen = ref(false)
  const revokeError = ref<string | null>(null)
  const revoking = ref(false)
  const pendingRevoke = ref<CredentialHolder | null>(null)

  function askRevoke (holder: CredentialHolder): void {
    pendingRevoke.value = holder
    revokeError.value = null
    revokeOpen.value = true
  }

  async function confirmRevoke (): Promise<void> {
    if (!pendingRevoke.value) return
    const target = pendingRevoke.value
    revoking.value = true
    revokeError.value = null
    try {
      await revokeGold(props.tenantId, target.assignmentId)
      holders.value = holders.value.filter(h => h.assignmentId !== target.assignmentId)
      revokeOpen.value = false
      showSnack('success', `Gold revoked from @${target.username ?? target.oauthUserId}`)
    } catch (e: unknown) {
      revokeError.value = mapErrorMessage(e)
    } finally {
      revoking.value = false
    }
  }

  // ---------------- Misc ----------------
  function mapErrorMessage (e: unknown): string {
    if (e instanceof CredentialApiError) {
      switch (e.code) {
        case 'USER_NOT_FOUND': return 'No user with that handle has logged in yet.'
        case 'USER_REQUIRED': return 'Handle is required.'
        case 'FORBIDDEN': return 'You no longer have permission to manage credentials for this tenant.'
        case 'ASSIGNMENT_NOT_FOUND': return 'This assignment no longer exists.'
        case 'BADGE_TYPE_MISMATCH': return 'This assignment is not a Gold credential.'
        default: return e.message || 'Request failed'
      }
    }
    return (e as Error)?.message ?? 'Unexpected error'
  }

  const snack = reactive({ show: false, color: 'success', text: '' })
  function showSnack (color: 'success' | 'error', text: string): void {
    snack.color = color
    snack.text = text
    snack.show = true
  }

  watch(() => [props.tenantId, props.badgeType] as const, () => reload(), { flush: 'post' })
  onMounted(reload)
</script>
