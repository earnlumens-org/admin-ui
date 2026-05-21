<!--
  /settings/wallet — payouts wallet and tenant fee.

  Two related editable fields live together because they share the same
  mental model: "how the tenant gets paid". Platform fee stays on the
  hub as a read-only fact.
-->
<template>
  <v-container class="pa-4 pa-sm-6" fluid>
    <v-breadcrumbs
      class="px-0 pt-0"
      :items="[
        { title: 'earnlumens', disabled: true },
        { title: 'settings', to: '/settings' },
        { title: 'wallet & fees', disabled: true },
      ]"
    />

    <div class="d-flex align-center mb-1">
      <v-btn
        class="me-2"
        icon="mdi-arrow-left"
        size="small"
        to="/settings"
        variant="text"
      />

      <div class="text-h6">Wallet & Fees</div>
    </div>

    <div class="text-body-2 text-medium-emphasis mb-4">
      Stellar address to receive payouts and the percentage you keep on
      each sale.
    </div>

    <v-divider class="mb-4" />

    <v-card v-if="loading" class="pa-8 text-center" variant="tonal">
      <v-progress-circular color="primary" indeterminate />
    </v-card>

    <v-alert
      v-else-if="loadError"
      border="start"
      class="mb-4"
      type="error"
      variant="tonal"
    >
      {{ loadError }}
      <template #append>
        <v-btn size="small" variant="text" @click="loadTenant">Retry</v-btn>
      </template>
    </v-alert>

    <v-form
      v-else-if="tenant"
      ref="form"
      v-model="formValid"
      @submit.prevent="save"
    >
      <v-row>
        <v-col cols="12" md="6">
          <v-card>
            <v-card-item>
              <v-card-title>Wallet</v-card-title>
              <v-card-subtitle>Stellar wallet for receiving payments</v-card-subtitle>
            </v-card-item>

            <v-card-text>
              <v-text-field
                v-model.trim="draft.tenantWallet"
                density="comfortable"
                label="Stellar wallet address"
                placeholder="GABC...XYZ"
                :rules="[rules.walletRequired, rules.walletFormat]"
                variant="outlined"
              />
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="6">
          <v-card>
            <v-card-item>
              <v-card-title>Tenant fee</v-card-title>
              <v-card-subtitle>Your cut on each sale (0–30%)</v-card-subtitle>
            </v-card-item>

            <v-card-text>
              <v-text-field
                v-model="draft.tenantFeePercent"
                density="comfortable"
                label="Tenant fee %"
                :rules="[rules.feeFormat, rules.feeRange]"
                suffix="%"
                variant="outlined"
              />

              <div class="text-caption text-medium-emphasis mt-2">
                Platform fee (fixed): <b>{{ tenant.platformFeePercent }}%</b>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <div class="d-flex justify-end ga-2 mt-4">
        <v-btn :disabled="!isDirty || saving" variant="text" @click="reset">
          Discard
        </v-btn>

        <v-btn
          color="primary"
          :disabled="!isDirty || !formValid"
          :loading="saving"
          type="submit"
          variant="flat"
        >
          Save changes
        </v-btn>
      </div>
    </v-form>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000">
      {{ snackbarText }}
    </v-snackbar>
  </v-container>
</template>

<script lang="ts" setup>
  import type { TenantSummary, UpdateTenantSettingsPayload } from '@/api/tenants'

  import { computed, reactive, ref, watch } from 'vue'

  import { useTenantSettings } from '@/composables/useTenantSettings'

  const {
    tenant, loading, loadError, saving, loadTenant, saveTenant,
    snackbar, snackbarText, snackbarColor,
  } = useTenantSettings()

  const formValid = ref(true)
  const form = ref<any>(null)

  const draft = reactive({
    tenantWallet: '',
    tenantFeePercent: '',
  })

  const WALLET_RE = /^G[A-Z2-7]{55}$/
  const FEE_RE = /^\d{1,2}(\.\d{1,2})?$/

  const rules = {
    walletRequired: (v: string) => (v && v.trim().length > 0) || 'Required',
    walletFormat: (v: string) => WALLET_RE.test(v ?? '') || 'Invalid Stellar address',
    feeFormat: (v: string) => FEE_RE.test(v ?? '') || 'Use a number like 12.50',
    feeRange: (v: string) => {
      const n = Number(v)
      return (Number.isFinite(n) && n >= 0 && n <= 30) || '0–30 allowed'
    },
  }

  function snapshot (t: TenantSummary) {
    draft.tenantWallet = t.tenantWallet ?? ''
    draft.tenantFeePercent = t.tenantFeePercent ?? ''
  }

  function reset () {
    if (tenant.value) snapshot(tenant.value)
  }

  watch(tenant, t => {
    if (t) snapshot(t)
  }, { immediate: true })

  const isDirty = computed(() => {
    if (!tenant.value) return false
    return draft.tenantWallet !== (tenant.value.tenantWallet ?? '')
      || draft.tenantFeePercent !== (tenant.value.tenantFeePercent ?? '')
  })

  async function save () {
    if (!tenant.value) return
    const valid = await form.value?.validate?.()
    if (valid && valid.valid === false) return

    const payload: UpdateTenantSettingsPayload = {}
    if (draft.tenantWallet !== (tenant.value.tenantWallet ?? '')) payload.tenantWallet = draft.tenantWallet.trim()
    if (draft.tenantFeePercent !== (tenant.value.tenantFeePercent ?? '')) payload.tenantFeePercent = draft.tenantFeePercent

    const updated = await saveTenant(payload)
    if (updated) snapshot(updated)
  }
</script>
