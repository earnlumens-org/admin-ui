<template>
  <v-container class="pa-4 pa-sm-6" fluid>
    <v-breadcrumbs
      class="px-0 pt-0"
      :items="[
        { title: 'earnlumens', disabled: true },
        { title: 'users', to: '/users' },
        { title: detail?.user.username || userId, disabled: true },
      ]"
    />

    <div v-if="loading" class="d-flex justify-center pa-10">
      <v-progress-circular indeterminate />
    </div>

    <v-alert v-else-if="error" class="mb-4" type="error" variant="tonal">{{ error }}</v-alert>

    <template v-else-if="detail">
      <SanctionLadderExplainer />

      <!-- Identity card -->
      <v-card class="mb-4" variant="outlined">
        <v-card-text class="d-flex align-center ga-4">
          <v-avatar size="64">
            <v-img v-if="detail.user.profileImageUrl" :src="detail.user.profileImageUrl" />
            <v-icon v-else size="40">mdi-account-circle</v-icon>
          </v-avatar>
          <div class="flex-grow-1">
            <div class="text-h6">{{ detail.user.displayName || detail.user.username }}</div>
            <div class="text-body-2 text-medium-emphasis">@{{ detail.user.username }}</div>
            <div class="text-caption text-medium-emphasis mt-1">
              {{ detail.user.oauthProvider }} · {{ detail.user.oauthUserId }}
            </div>
          </div>
          <div class="d-flex flex-column align-end ga-1">
            <v-chip
              v-if="detail.user.blocked"
              color="error"
              prepend-icon="mdi-account-cancel"
              size="small"
              variant="flat"
            >
              {{ detail.user.banType || 'BANNED' }}
            </v-chip>
            <v-chip
              v-if="(detail.user.strikeCount ?? 0) > 0"
              color="warning"
              prepend-icon="mdi-alert-decagram"
              size="small"
              variant="tonal"
            >
              {{ detail.user.strikeCount }} active strike{{ (detail.user.strikeCount ?? 0) > 1 ? 's' : '' }}
            </v-chip>
            <span class="text-caption text-medium-emphasis">
              {{ detail.creatorHistory.totalReports }} reports against ·
              {{ detail.creatorHistory.priorSanctions }} sanctioned ·
              {{ detail.creatorHistory.dismissedReports }} dismissed
            </span>
          </div>
        </v-card-text>

        <!-- Active ban callout -->
        <v-divider v-if="detail.user.blocked" />
        <v-card-text v-if="detail.user.blocked">
          <div class="text-subtitle-2 text-error mb-1">Currently banned</div>
          <div v-if="detail.user.banReason" class="text-body-2">
            <b>Reason:</b> {{ detail.user.banReason }}
          </div>
          <div class="text-body-2">
            <b>Status:</b>
            <span v-if="detail.user.banExpiresAt">
              Temporary — auto-lifts on {{ new Date(detail.user.banExpiresAt).toLocaleString() }}
            </span>
            <span v-else>Permanent</span>
          </div>
        </v-card-text>

        <v-divider />
        <v-card-actions class="px-4 pb-3 ga-2 flex-wrap">
          <v-btn
            color="warning"
            :disabled="acting"
            prepend-icon="mdi-bell-alert-outline"
            variant="tonal"
            @click="open('warn')"
          >
            Warn
          </v-btn>
          <v-btn
            color="warning"
            :disabled="acting"
            prepend-icon="mdi-alert-decagram"
            variant="flat"
            @click="open('strike')"
          >
            Apply strike
          </v-btn>
          <v-btn
            color="error"
            :disabled="acting"
            prepend-icon="mdi-account-cancel"
            variant="flat"
            @click="open('ban')"
          >
            Ban manually…
          </v-btn>
          <v-spacer />
          <v-btn
            v-if="detail.user.blocked || (detail.user.strikeCount ?? 0) > 0"
            color="success"
            :disabled="acting"
            prepend-icon="mdi-account-check-outline"
            variant="tonal"
            @click="open('unban')"
          >
            Unblock / clear
          </v-btn>
        </v-card-actions>
      </v-card>

      <!-- Sanction history timeline -->
      <v-card class="mb-4" variant="outlined">
        <v-card-title class="text-body-1">Sanction history</v-card-title>
        <v-card-text v-if="detail.sanctions.length === 0" class="text-body-2 text-medium-emphasis">
          No prior sanctions.
        </v-card-text>
        <v-list v-else density="comfortable" lines="three">
          <v-list-item v-for="row in detail.sanctions" :key="row.id">
            <template #prepend>
              <v-icon :color="iconColor(row.type)">{{ iconFor(row.type) }}</v-icon>
            </template>
            <v-list-item-title class="d-flex align-center ga-2">
              <span class="font-weight-medium">{{ row.type }}</span>
              <v-chip v-if="row.automatic" size="x-small" variant="tonal">auto</v-chip>
              <v-chip
                v-if="row.expiresAt"
                color="error"
                size="x-small"
                variant="tonal"
              >
                until {{ new Date(row.expiresAt).toLocaleString() }}
              </v-chip>
              <v-chip
                v-if="row.strikeCountAfter != null && row.type === 'STRIKE'"
                color="warning"
                size="x-small"
                variant="tonal"
              >
                strike #{{ row.strikeCountAfter }}
              </v-chip>
            </v-list-item-title>
            <v-list-item-subtitle>
              <div v-if="row.reason" class="text-body-2">{{ row.reason }}</div>
              <div class="text-caption text-medium-emphasis">
                by {{ row.issuedByUsername || row.issuedBy || 'system' }}
                · {{ new Date(row.issuedAt).toLocaleString() }}
                · tenant {{ row.tenantId }}
              </div>
            </v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </v-card>
    </template>

    <!-- Action dialog (warn / strike / ban / unban) -->
    <v-dialog v-model="dialogOpen" max-width="540">
      <v-card>
        <v-card-title class="text-body-1">
          {{ dialogTitle }}
        </v-card-title>
        <v-card-text>
          <v-alert
            v-if="dialogMode === 'strike'"
            class="mb-3"
            density="compact"
            type="warning"
            variant="tonal"
          >
            This will apply strike #{{ (detail?.user.strikeCount ?? 0) + 1 }} and
            <b>{{ strikePreview }}</b>.
          </v-alert>
          <v-alert
            v-if="dialogMode === 'ban'"
            class="mb-3"
            density="compact"
            type="error"
            variant="tonal"
          >
            Manual ban bypasses the strike ladder. Use this for severe violations.
          </v-alert>

          <v-textarea
            v-model="formReason"
            auto-grow
            label="Reason (visible to the user)"
            rows="2"
            variant="outlined"
          />
          <v-textarea
            v-if="dialogMode !== 'unban'"
            v-model="formNotes"
            auto-grow
            class="mt-2"
            label="Internal notes (only moderators)"
            rows="2"
            variant="outlined"
          />

          <template v-if="dialogMode === 'ban'">
            <v-radio-group v-model="banType" inline>
              <v-radio label="Temporary" value="TEMP_BAN" />
              <v-radio label="Permanent" value="PERMA_BAN" />
            </v-radio-group>
            <v-text-field
              v-if="banType === 'TEMP_BAN'"
              v-model.number="banDays"
              label="Duration (days)"
              min="1"
              type="number"
              variant="outlined"
            />
          </template>

          <v-checkbox
            v-if="dialogMode === 'unban'"
            v-model="clearStrikes"
            label="Also clear the strike count (treat past strikes as overturned)"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn :disabled="acting" variant="text" @click="dialogOpen = false">Cancel</v-btn>
          <v-btn
            :color="dialogColor"
            :disabled="acting || !formReason.trim()"
            :loading="acting"
            variant="flat"
            @click="submit"
          >
            Confirm
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script lang="ts" setup>
  import { computed, onMounted, ref } from 'vue'
  import { useRoute } from 'vue-router'
  import SanctionLadderExplainer from '@/components/moderation/SanctionLadderExplainer.vue'
  import {
    banUser,
    fetchUserDetail,
    strikeUser,
    type SanctionType,
    unbanUser,
    type UserDetailResponse,
    warnUser,
  } from '@/api/userModeration'

  const route = useRoute()
  const userId = String(route.params.userId)
  const tenantId = String(route.query.tenantId || 'earnlumens')

  const detail = ref<UserDetailResponse | null>(null)
  const loading = ref(true)
  const error = ref<string | null>(null)
  const acting = ref(false)

  const dialogOpen = ref(false)
  const dialogMode = ref<'warn' | 'strike' | 'ban' | 'unban'>('warn')
  const formReason = ref('')
  const formNotes = ref('')
  const banType = ref<'TEMP_BAN' | 'PERMA_BAN'>('TEMP_BAN')
  const banDays = ref<number>(7)
  const clearStrikes = ref(false)

  const dialogTitle = computed(() => ({
    warn: 'Issue formal warning',
    strike: 'Apply strike',
    ban: 'Manual ban',
    unban: 'Unblock account',
  })[dialogMode.value])

  const dialogColor = computed(() => ({
    warn: 'warning',
    strike: 'warning',
    ban: 'error',
    unban: 'success',
  })[dialogMode.value])

  const strikePreview = computed(() => {
    const next = (detail.value?.user.strikeCount ?? 0) + 1
    if (next === 1) return 'block the account for 7 days'
    if (next === 2) return 'block the account for 30 days'
    return 'permanently ban the account'
  })

  function open (mode: typeof dialogMode.value) {
    dialogMode.value = mode
    formReason.value = ''
    formNotes.value = ''
    banType.value = 'TEMP_BAN'
    banDays.value = 7
    clearStrikes.value = false
    dialogOpen.value = true
  }

  async function submit () {
    if (!detail.value) return
    acting.value = true
    try {
      const reason = formReason.value.trim()
      const notes = formNotes.value.trim() || undefined
      if (dialogMode.value === 'warn') {
        await warnUser(tenantId, userId, { reason, notes })
      } else if (dialogMode.value === 'strike') {
        await strikeUser(tenantId, userId, { reason, notes })
      } else if (dialogMode.value === 'ban') {
        await banUser(tenantId, userId, {
          reason,
          notes,
          banType: banType.value,
          durationDays: banType.value === 'TEMP_BAN' ? banDays.value : undefined,
        })
      } else if (dialogMode.value === 'unban') {
        await unbanUser(tenantId, userId, {
          reason,
          clearStrikes: clearStrikes.value,
        })
      }
      dialogOpen.value = false
      await load()
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      acting.value = false
    }
  }

  async function load () {
    loading.value = true
    error.value = null
    try {
      detail.value = await fetchUserDetail(tenantId, userId)
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  onMounted(load)

  function iconFor (type: SanctionType): string {
    switch (type) {
      case 'WARNING': return 'mdi-bell-alert-outline'
      case 'STRIKE': return 'mdi-alert-decagram'
      case 'TEMP_BAN': return 'mdi-account-clock-outline'
      case 'PERMA_BAN': return 'mdi-account-cancel'
      case 'UNBAN': return 'mdi-account-check-outline'
    }
  }

  function iconColor (type: SanctionType): string {
    switch (type) {
      case 'WARNING': return 'warning'
      case 'STRIKE': return 'warning'
      case 'TEMP_BAN': return 'error'
      case 'PERMA_BAN': return 'error'
      case 'UNBAN': return 'success'
    }
  }
</script>

<route lang="json">
{
  "path": "/users/:userId",
  "meta": {
    "requiresAuth": true
  }
}
</route>
