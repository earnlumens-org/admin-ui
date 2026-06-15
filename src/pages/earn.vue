<template>
  <v-container class="pa-4 pa-sm-6" fluid>
    <v-breadcrumbs
      class="px-0 pt-0"
      :items="[{ title: 'Earn', disabled: true }]"
    />

    <div class="d-flex flex-column flex-sm-row align-sm-center ga-2 mb-4">
      <div>
        <div class="text-h6 mb-1">Earn — Franchises</div>
        <div class="text-body-2 text-medium-emphasis">
          Let trusted users open commercial <em>franchises</em> that resell your
          approved catalogue under <code>{{ selectedTenant }}.{{ getPlatformDomain() }}/f/&lt;slug&gt;</code>.
          You share a slice of <strong>your own profit</strong> with each franchise —
          the customer's final price never changes.
        </div>
      </div>
      <v-spacer />
      <v-select
        v-if="tenantOptions.length > 1"
        v-model="selectedTenant"
        density="compact"
        hide-details
        item-title="title"
        item-value="value"
        :items="tenantOptions"
        label="Tenant"
        style="max-width: 240px"
        variant="outlined"
        @update:model-value="loadAll"
      />
    </div>

    <v-divider class="mb-6" />

    <v-alert v-if="loadError" class="mb-4" type="error" variant="tonal">
      {{ loadError }}
    </v-alert>

    <div v-if="loading" class="d-flex justify-center py-12">
      <v-progress-circular indeterminate />
    </div>

    <template v-else-if="config">
      <!-- ============================================================ -->
      <!--  Not enabled yet — onboarding card                           -->
      <!-- ============================================================ -->
      <v-card v-if="!config.franchisesEnabled" class="mb-6">
        <v-card-item>
          <v-card-title class="text-h6">Enable franchises</v-card-title>
          <v-card-subtitle style="white-space: normal">
            Once enabled, any user you haven't banned can open a franchise
            without prior approval. You can pause new sign-ups, ban users, or
            disable individual franchises at any time.
          </v-card-subtitle>
        </v-card-item>
        <v-card-text>
          <p class="text-body-2 mb-4">
            Set the default commission — the share of <strong>your</strong> cut on
            each sale that the franchise keeps. It is <strong>frozen</strong> for
            each franchise at creation, so later changes only affect new
            franchises. Range: 0–{{ Number(config.maxCommissionPercent) }}%.
          </p>
          <v-text-field
            v-model="commissionInput"
            class="mb-2"
            label="Default commission (%)"
            :max="Number(config.maxCommissionPercent)"
            min="0"
            :rules="[commissionRule]"
            step="0.01"
            style="max-width: 280px"
            suffix="%"
            type="number"
            variant="outlined"
          />
          <v-alert v-if="formError" class="mb-3" density="compact" type="error" variant="tonal">
            {{ formError }}
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="primary"
            :disabled="!isCommissionValid || saving"
            :loading="saving"
            prepend-icon="mdi-handshake-outline"
            variant="flat"
            @click="handleEnable"
          >
            Enable franchises
          </v-btn>
        </v-card-actions>
      </v-card>

      <!-- ============================================================ -->
      <!--  Enabled — governance config                                 -->
      <!-- ============================================================ -->
      <template v-else>
        <v-card class="mb-6">
          <v-card-item>
            <v-card-title class="text-h6 d-flex align-center ga-2">
              Configuration
              <v-chip
                :color="config.franchisesPaused ? 'warning' : 'success'"
                size="small"
                variant="tonal"
              >
                {{ config.franchisesPaused ? 'New sign-ups paused' : 'Open for sign-ups' }}
              </v-chip>
            </v-card-title>
          </v-card-item>
          <v-card-text>
            <v-row>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="commissionInput"
                  hint="Applies to future franchises only — existing ones keep their frozen rate."
                  label="Default commission (%)"
                  :max="Number(config.maxCommissionPercent)"
                  min="0"
                  persistent-hint
                  :rules="[commissionRule]"
                  step="0.01"
                  suffix="%"
                  type="number"
                  variant="outlined"
                />
              </v-col>
              <v-col class="d-flex flex-column justify-center" cols="12" sm="6">
                <v-switch
                  v-model="pausedInput"
                  color="warning"
                  density="comfortable"
                  hide-details
                  :label="pausedInput ? 'New franchise sign-ups paused' : 'Accepting new franchises'"
                />
                <div class="text-caption text-medium-emphasis">
                  {{ config.activeFranchiseCount }} active
                  franchise{{ config.activeFranchiseCount === 1 ? '' : 's' }}.
                  <template v-if="config.activeFranchiseCount > 0">
                    The model can't be turned off while franchises are active —
                    pause sign-ups or disable franchises individually instead.
                  </template>
                </div>
              </v-col>
            </v-row>
            <v-alert v-if="formError" class="mt-2" density="compact" type="error" variant="tonal">
              {{ formError }}
            </v-alert>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn
              color="primary"
              :disabled="!isCommissionValid || saving || !configDirty"
              :loading="saving"
              variant="flat"
              @click="handleUpdateConfig"
            >
              Save changes
            </v-btn>
          </v-card-actions>
        </v-card>

        <!-- =========================== Franchises =========================== -->
        <div class="d-flex align-center mb-2">
          <div class="text-subtitle-1 font-weight-medium">Franchises</div>
          <v-spacer />
          <v-btn
            density="comfortable"
            :loading="loading"
            size="small"
            variant="text"
            @click="loadAll"
          >
            <v-icon start size="16">mdi-refresh</v-icon>
            Refresh
          </v-btn>
        </div>

        <v-card class="mb-6">
          <v-card-text v-if="!franchises.length" class="text-center text-medium-emphasis py-8">
            No franchises yet. Enabled users can open one from their storefront.
          </v-card-text>

          <v-table v-else density="comfortable">
            <thead>
              <tr>
                <th>Franchise</th>
                <th>Owner</th>
                <th class="text-right">Commission</th>
                <th>Status</th>
                <th>Created</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="f in franchises"
                :key="f.id"
                :class="{ 'opacity-60': f.status === 'DISABLED' }"
              >
                <td>
                  <div class="d-flex align-center ga-2">
                    <v-avatar
                      v-if="f.accentColor"
                      :color="f.accentColor"
                      size="16"
                      rounded="sm"
                    />
                    <div>
                      <div class="font-weight-medium">{{ f.title || f.slug }}</div>
                      <div class="text-caption text-medium-emphasis">
                        /f/{{ f.slug }}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <div>{{ f.ownerDisplayName || f.ownerUsername || '—' }}</div>
                  <div v-if="f.ownerUsername" class="text-caption text-medium-emphasis">
                    @{{ f.ownerUsername }}
                  </div>
                </td>
                <td class="text-right">{{ Number(f.commissionPercent).toFixed(2) }}%</td>
                <td>
                  <v-chip
                    :color="f.status === 'ACTIVE' ? 'success' : 'grey'"
                    size="x-small"
                    variant="tonal"
                  >
                    {{ f.status }}
                  </v-chip>
                  <div
                    v-if="f.status === 'DISABLED' && f.disabledReason"
                    class="text-caption text-medium-emphasis mt-1"
                  >
                    {{ f.disabledReason }}
                  </div>
                </td>
                <td class="text-caption">{{ formatDate(f.createdAt) }}</td>
                <td class="text-right">
                  <v-btn
                    v-if="f.status === 'ACTIVE'"
                    color="error"
                    density="comfortable"
                    size="small"
                    variant="text"
                    @click="openDisable(f)"
                  >
                    Disable
                  </v-btn>
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card>

        <!-- =========================== Banned users =========================== -->
        <div class="d-flex align-center mb-2">
          <div class="text-subtitle-1 font-weight-medium">Banned from creating franchises</div>
          <v-spacer />
          <v-btn
            color="primary"
            density="comfortable"
            prepend-icon="mdi-account-cancel-outline"
            size="small"
            variant="tonal"
            @click="openBan"
          >
            Ban a user
          </v-btn>
        </div>

        <v-card>
          <v-card-text v-if="!bans.length" class="text-center text-medium-emphasis py-6">
            No users are banned from creating franchises.
          </v-card-text>
          <v-list v-else lines="two">
            <v-list-item
              v-for="b in bans"
              :key="b.userId"
              :subtitle="b.reason"
              :title="b.userId"
            >
              <template #append>
                <span class="text-caption text-medium-emphasis me-3">
                  {{ formatDate(b.bannedAt) }}
                </span>
                <v-btn
                  density="comfortable"
                  icon="mdi-account-check-outline"
                  size="small"
                  :title="'Lift ban'"
                  variant="text"
                  @click="handleUnban(b)"
                />
              </template>
            </v-list-item>
          </v-list>
        </v-card>
      </template>
    </template>

    <!-- ============================================================ -->
    <!--  Disable franchise dialog                                    -->
    <!-- ============================================================ -->
    <v-dialog v-model="disableDialog" max-width="480" persistent>
      <v-card>
        <v-card-title class="text-h6">Disable franchise</v-card-title>
        <v-card-text>
          <p class="mb-3">
            Disable <strong>{{ disableTarget?.title || disableTarget?.slug }}</strong>?
            The storefront becomes unreachable and no new sales can occur. Past
            sales and entitlements are preserved — this is never a deletion.
          </p>
          <v-textarea
            v-model="disableReason"
            auto-grow
            counter="500"
            label="Reason (for the audit trail)"
            rows="2"
            variant="outlined"
          />
          <v-alert v-if="actionError" class="mt-2" density="compact" type="error" variant="tonal">
            {{ actionError }}
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn :disabled="acting" variant="text" @click="disableDialog = false">Cancel</v-btn>
          <v-btn
            color="error"
            :disabled="!disableReason.trim() || acting"
            :loading="acting"
            variant="flat"
            @click="handleDisable"
          >
            Disable
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ============================================================ -->
    <!--  Ban user dialog                                             -->
    <!-- ============================================================ -->
    <v-dialog v-model="banDialog" max-width="480" persistent>
      <v-card>
        <v-card-title class="text-h6">Ban a user</v-card-title>
        <v-card-text>
          <p class="text-body-2 text-medium-emphasis mb-3">
            Bars this user from opening <em>new</em> franchises under
            {{ selectedTenant }}. It does not touch their account or any
            franchise they already own.
          </p>
          <v-text-field
            v-model.trim="banUserId"
            class="mb-2"
            label="User ID (OAuth user id)"
            variant="outlined"
          />
          <v-textarea
            v-model="banReason"
            auto-grow
            counter="500"
            label="Reason"
            rows="2"
            variant="outlined"
          />
          <v-alert v-if="actionError" class="mt-2" density="compact" type="error" variant="tonal">
            {{ actionError }}
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn :disabled="acting" variant="text" @click="banDialog = false">Cancel</v-btn>
          <v-btn
            color="error"
            :disabled="!banUserId.trim() || !banReason.trim() || acting"
            :loading="acting"
            variant="flat"
            @click="handleBan"
          >
            Ban user
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackbarColor" location="bottom" timeout="3000">
      {{ snackbarText }}
    </v-snackbar>
  </v-container>
</template>

<script lang="ts" setup>
  import { computed, onMounted, ref, watch } from 'vue'
  import {
    banFranchiseUser,
    disableFranchise,
    enableFranchises,
    FranchiseApiError,
    type FranchiseBanResponse,
    type FranchiseConfigResponse,
    type FranchiseResponse,
    getFranchiseConfig,
    listFranchiseBans,
    listFranchises,
    unbanFranchiseUser,
    updateFranchiseConfig,
  } from '@/api/franchises'
  import { useTenantLabels } from '@/composables/useTenantLabels'
  import { getPlatformDomain } from '@/config/env'
  import { useAuthStore } from '@/stores/auth'

  // -------------------------------------------------------------- auth
  const authStore = useAuthStore()
  const isSuperadmin = computed(() => authStore.user?.role === 'SUPERADMIN')
  const ownedTenants = computed(() => authStore.user?.tenantAdminOf ?? [])
  const { labelFor: tenantLabel } = useTenantLabels()

  const tenantOptions = computed(() => {
    const opts = ownedTenants.value.map(t => ({ title: tenantLabel(t), value: t }))
    if (isSuperadmin.value) {
      const seen = new Set(opts.map(o => o.value))
      if (!seen.has('earnlumens')) {
        opts.unshift({ title: 'earnlumens (root)', value: 'earnlumens' })
      }
    }
    return opts
  })

  function defaultTenant (): string {
    if (
      authStore.activeTenantId
      && tenantOptions.value.some(o => o.value === authStore.activeTenantId)
    ) {
      return authStore.activeTenantId
    }
    return tenantOptions.value[0]?.value ?? ''
  }

  const selectedTenant = ref(defaultTenant())

  // -------------------------------------------------------------- state
  const loading = ref(false)
  const loadError = ref<string | null>(null)
  const config = ref<FranchiseConfigResponse | null>(null)
  const franchises = ref<FranchiseResponse[]>([])
  const bans = ref<FranchiseBanResponse[]>([])

  const commissionInput = ref('')
  const pausedInput = ref(false)
  const saving = ref(false)
  const formError = ref<string | null>(null)

  const snackbar = ref(false)
  const snackbarText = ref('')
  const snackbarColor = ref<'success' | 'error' | 'info'>('success')

  function showSnack (text: string, color: 'success' | 'error' | 'info' = 'success') {
    snackbarText.value = text
    snackbarColor.value = color
    snackbar.value = true
  }

  // Friendly messages for the franchise error codes returned by admin-api.
  const ERROR_MESSAGES: Record<string, string> = {
    franchises_not_enabled: 'Franchises are not enabled for this tenant.',
    franchises_paused: 'New franchise sign-ups are paused.',
    franchises_has_active: 'Can\'t disable the model while franchises are active. Pause sign-ups or disable franchises individually.',
    user_banned: 'This user is banned from creating franchises.',
    commission_range: 'Commission is out of the allowed range.',
    reason_required: 'A reason is required.',
    not_found: 'Not found.',
    forbidden: 'You are not allowed to perform this action.',
    tenant_blocked: 'This tenant is currently blocked.',
    unknown_error: 'Something went wrong. Please try again.',
  }

  function localiseError (err: unknown, fallback: string): string {
    if (err instanceof FranchiseApiError) return ERROR_MESSAGES[err.code] ?? err.code
    if (err instanceof Error) return err.message
    return fallback
  }

  function formatDate (iso: string | null): string {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString()
  }

  // -------------------------------------------------------------- validation
  const maxCommission = computed(() => Number(config.value?.maxCommissionPercent ?? 90))

  function commissionRule (v: string): true | string {
    const n = Number(v)
    if (v === '' || Number.isNaN(n)) return 'Enter a percentage.'
    if (n < 0 || n > maxCommission.value) return `Must be between 0 and ${maxCommission.value}.`
    if (!/^\d+(\.\d{1,2})?$/.test(String(v))) return 'At most two decimals.'
    return true
  }

  const isCommissionValid = computed(() => commissionRule(commissionInput.value) === true)

  const configDirty = computed(() => {
    if (!config.value) return false
    const currentPct = config.value.defaultFranchiseCommissionPercent
    const pctChanged = currentPct == null
      ? commissionInput.value !== ''
      : Number(commissionInput.value) !== Number(currentPct)
    return pctChanged || pausedInput.value !== config.value.franchisesPaused
  })

  // -------------------------------------------------------------- load
  async function loadAll () {
    if (!selectedTenant.value) return
    loading.value = true
    loadError.value = null
    formError.value = null
    try {
      const cfg = await getFranchiseConfig(selectedTenant.value)
      config.value = cfg
      commissionInput.value = cfg.defaultFranchiseCommissionPercent == null
        ? ''
        : String(Number(cfg.defaultFranchiseCommissionPercent))
      pausedInput.value = cfg.franchisesPaused
      if (cfg.franchisesEnabled) {
        const [list, banList] = await Promise.all([
          listFranchises(selectedTenant.value),
          listFranchiseBans(selectedTenant.value),
        ])
        franchises.value = list
        bans.value = banList
      } else {
        franchises.value = []
        bans.value = []
      }
    } catch (err) {
      loadError.value = localiseError(err, 'Failed to load franchise settings')
    } finally {
      loading.value = false
    }
  }

  // -------------------------------------------------------------- config actions
  async function handleEnable () {
    if (!isCommissionValid.value) return
    saving.value = true
    formError.value = null
    try {
      config.value = await enableFranchises(selectedTenant.value, commissionInput.value)
      pausedInput.value = config.value.franchisesPaused
      showSnack('Franchises enabled.')
      await loadAll()
    } catch (err) {
      formError.value = localiseError(err, 'Failed to enable franchises')
    } finally {
      saving.value = false
    }
  }

  async function handleUpdateConfig () {
    if (!isCommissionValid.value || !config.value) return
    saving.value = true
    formError.value = null
    try {
      const payload: { defaultCommissionPercent?: string, paused?: boolean } = {}
      const currentPct = config.value.defaultFranchiseCommissionPercent
      if (currentPct == null || Number(commissionInput.value) !== Number(currentPct)) {
        payload.defaultCommissionPercent = commissionInput.value
      }
      if (pausedInput.value !== config.value.franchisesPaused) {
        payload.paused = pausedInput.value
      }
      config.value = await updateFranchiseConfig(selectedTenant.value, payload)
      commissionInput.value = config.value.defaultFranchiseCommissionPercent == null
        ? ''
        : String(Number(config.value.defaultFranchiseCommissionPercent))
      pausedInput.value = config.value.franchisesPaused
      showSnack('Settings saved.')
    } catch (err) {
      formError.value = localiseError(err, 'Failed to save settings')
    } finally {
      saving.value = false
    }
  }

  // -------------------------------------------------------------- disable franchise
  const disableDialog = ref(false)
  const disableTarget = ref<FranchiseResponse | null>(null)
  const disableReason = ref('')
  const acting = ref(false)
  const actionError = ref<string | null>(null)

  function openDisable (f: FranchiseResponse) {
    disableTarget.value = f
    disableReason.value = ''
    actionError.value = null
    disableDialog.value = true
  }

  async function handleDisable () {
    if (!disableTarget.value || !disableReason.value.trim()) return
    acting.value = true
    actionError.value = null
    try {
      const updated = await disableFranchise(
        selectedTenant.value,
        disableTarget.value.id,
        disableReason.value.trim(),
      )
      const idx = franchises.value.findIndex(f => f.id === updated.id)
      if (idx !== -1) franchises.value[idx] = updated
      disableDialog.value = false
      if (config.value) {
        config.value = await getFranchiseConfig(selectedTenant.value)
      }
      showSnack('Franchise disabled.')
    } catch (err) {
      actionError.value = localiseError(err, 'Failed to disable franchise')
    } finally {
      acting.value = false
    }
  }

  // -------------------------------------------------------------- bans
  const banDialog = ref(false)
  const banUserId = ref('')
  const banReason = ref('')

  function openBan () {
    banUserId.value = ''
    banReason.value = ''
    actionError.value = null
    banDialog.value = true
  }

  async function handleBan () {
    if (!banUserId.value.trim() || !banReason.value.trim()) return
    acting.value = true
    actionError.value = null
    try {
      const ban = await banFranchiseUser(
        selectedTenant.value,
        banUserId.value.trim(),
        banReason.value.trim(),
      )
      const idx = bans.value.findIndex(b => b.userId === ban.userId)
      if (idx === -1) bans.value.unshift(ban)
      else bans.value[idx] = ban
      banDialog.value = false
      showSnack('User banned from creating franchises.')
    } catch (err) {
      actionError.value = localiseError(err, 'Failed to ban user')
    } finally {
      acting.value = false
    }
  }

  async function handleUnban (b: FranchiseBanResponse) {
    try {
      await unbanFranchiseUser(selectedTenant.value, b.userId)
      bans.value = bans.value.filter(x => x.userId !== b.userId)
      showSnack('Ban lifted.')
    } catch (err) {
      showSnack(localiseError(err, 'Failed to lift ban'), 'error')
    }
  }

  // -------------------------------------------------------------- lifecycle
  watch(() => authStore.activeTenantId, next => {
    if (next && tenantOptions.value.some(o => o.value === next) && next !== selectedTenant.value) {
      selectedTenant.value = next
      loadAll()
    }
  })

  onMounted(loadAll)
</script>
