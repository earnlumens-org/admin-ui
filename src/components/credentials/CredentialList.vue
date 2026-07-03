<template>
  <v-card variant="flat">
    <v-card-text>
      <v-alert
        border="start"
        class="mb-4"
        density="comfortable"
        :icon="badgeType === 'U3' ? 'mdi-shield-account' : badgeType === 'U2' ? 'mdi-shield-star' : 'mdi-shield-check'"
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
          :color="copy.accentColor"
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
          <v-icon class="mr-2" :color="copy.iconColor">{{ copy.icon }}</v-icon>
          {{ copy.grantTitle }}
        </v-card-title>
        <v-card-text>
          <p class="text-body-2 text-medium-emphasis mb-4">
            {{ copy.grantBody }}
          </p>
          <v-text-field
            ref="usernameField"
            v-model="grantUsername"
            autofocus
            class="mb-1"
            density="compact"
            :disabled="granting"
            :error-messages="grantError ? [grantError] : []"
            label="X Username"
            placeholder="username"
            prefix="@"
            :rules="[v => !!v?.trim() || 'Username is required']"
            variant="outlined"
            @keydown.enter="submitGrant"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn :disabled="granting" variant="text" @click="grantOpen = false">Cancel</v-btn>
          <v-btn
            :color="copy.accentColor"
            :disabled="!grantUsername.trim() || granting"
            :loading="granting"
            variant="elevated"
            @click="submitGrant"
          >
            {{ copy.grantCta }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Revoke confirm dialog -->
    <v-dialog v-if="canRevoke" v-model="revokeOpen" max-width="460">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2" color="error">mdi-shield-off</v-icon>
          {{ copy.revokeTitle }}
        </v-card-title>
        <v-card-text>
          <p class="text-body-2">
            <strong>{{ pendingRevoke?.displayName ?? pendingRevoke?.username }}</strong>
            {{ copy.revokeBody }}
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
    grantAmbassador,
    grantGold,
    listHolders,
    revokeAmbassador,
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

  /**
   * Copy + API dispatch per badge type. U3 (Ambassador, gray) uses its own
   * main-tenant-only endpoints; everything else goes through the Gold
   * endpoints (U1 is read-only anyway).
   */
  const isAmbassador = computed(() => props.badgeType === 'U3')

  const copy = computed(() => isAmbassador.value
    ? {
      icon: 'mdi-shield-account',
      iconColor: 'blue-grey',
      accentColor: 'blue-grey-darken-1',
      label: 'Ambassador',
      grantTitle: 'Add Stellar Ambassador',
      grantBody: 'Enter the exact X (Twitter) username of the ambassador. The gray '
        + 'badge is GLOBAL: it appears on their profile and content across every '
        + 'tenant immediately.',
      grantCta: 'Add Ambassador',
      revokeTitle: 'Remove Stellar Ambassador?',
      revokeBody: 'will lose the gray Ambassador badge on every tenant immediately. '
        + 'If they still hold Gold or Blue badges on specific tenants, those '
        + 'reappear automatically.',
    }
    : {
      icon: 'mdi-shield-star',
      iconColor: 'amber-darken-2',
      accentColor: 'amber-darken-3',
      label: 'Gold',
      grantTitle: 'Grant Verified Gold',
      grantBody: 'Enter the exact X (Twitter) username of the user you want to verify. '
        + 'They will be allowed to publish in spaces restricted to Verified Gold '
        + 'immediately.',
      grantCta: 'Grant Gold',
      revokeTitle: 'Revoke Verified Gold?',
      revokeBody: 'will lose the Gold badge immediately. Existing content stays online but '
        + 'stops appearing in Verified-Gold-only spaces.',
    })

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
      const grantFn = isAmbassador.value ? grantAmbassador : grantGold
      const created = await grantFn(props.tenantId, { username: handle })
      // Idempotent UI: replace if exists, else prepend.
      const idx = holders.value.findIndex(h => h.assignmentId === created.assignmentId)
      if (idx >= 0) holders.value.splice(idx, 1, created)
      else holders.value.unshift(created)
      grantOpen.value = false
      showSnack('success', `${copy.value.label} granted to @${created.username ?? handle}`)
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
      const revokeFn = isAmbassador.value ? revokeAmbassador : revokeGold
      await revokeFn(props.tenantId, target.assignmentId)
      holders.value = holders.value.filter(h => h.assignmentId !== target.assignmentId)
      revokeOpen.value = false
      showSnack('success', `${copy.value.label} revoked from @${target.username ?? target.oauthUserId}`)
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
        case 'BADGE_TYPE_MISMATCH': return `This assignment is not a ${copy.value.label} credential.`
        case 'MAIN_TENANT_ONLY': return 'Ambassador credentials can only be managed from the main tenant.'
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
