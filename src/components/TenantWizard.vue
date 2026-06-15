<template>
  <v-dialog
    v-model="dialog"
    :fullscreen="$vuetify.display.smAndDown"
    max-width="720"
    persistent
    scrollable
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2" icon="mdi-domain-plus" />
        <span>{{ $t('tenants.wizard.title') }}</span>
        <v-spacer />
        <v-btn
          :disabled="loading"
          icon="mdi-close"
          variant="text"
          @click="handleCancel"
        />
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-4 pa-sm-6">
        <v-stepper
          v-model="step"
          bg-color="transparent"
          flat
          hide-actions
          :items="stepTitles"
          :mobile="$vuetify.display.smAndDown"
        >
          <template #item.1>
            <v-form ref="formProfile" @submit.prevent>
              <v-text-field
                v-model.trim="form.title"
                autofocus
                class="mt-2"
                :counter="80"
                :hint="$t('tenants.wizard.fields.title_hint')"
                :label="$t('tenants.wizard.fields.title')"
                :rules="[rules.required, rules.titleLength]"
                variant="outlined"
              />
              <v-textarea
                v-model.trim="form.description"
                class="mt-2"
                :counter="280"
                :hint="$t('tenants.wizard.fields.description_hint')"
                :label="$t('tenants.wizard.fields.description')"
                rows="3"
                :rules="[rules.descLength]"
                variant="outlined"
              />
            </v-form>
          </template>

          <template #item.2>
            <v-form ref="formWallet" @submit.prevent>
              <v-text-field
                v-model.trim="form.tenantWallet"
                autofocus
                class="mt-2"
                :hint="$t('tenants.wizard.fields.wallet_hint')"
                :label="$t('tenants.wizard.fields.wallet')"
                placeholder="GABC...XYZ"
                :rules="[rules.required, rules.walletFormat]"
                variant="outlined"
              />
              <!--
                Generic wallet alert covering both "badly formatted" and
                "valid format but not yet on the Stellar ledger". Mirrors
                the unfunded-wallet banner used by media-store-ui's Wallet
                page, including the same Stellar docs link.
              -->
              <v-alert
                v-if="isWalletErrorCode(serverError)"
                border="start"
                class="mt-2"
                density="compact"
                icon="mdi-alert-circle-outline"
                type="warning"
                variant="tonal"
              >
                <div class="text-body-2">
                  {{ $t('tenants.errors.wallet_invalid') }}
                  <a
                    class="text-primary font-weight-medium"
                    href="https://developers.stellar.org/docs/build/guides/transactions/create-account#create-an-account-1"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {{ $t('common.learn_more') }}
                  </a>
                </div>
              </v-alert>
              <v-text-field
                v-model.trim="form.tenantFeePercent"
                class="mt-2"
                :hint="$t('tenants.wizard.fields.fee_hint')"
                inputmode="decimal"
                :label="$t('tenants.wizard.fields.fee')"
                :rules="[rules.required, rules.feeFormat, rules.feeRange]"
                suffix="%"
                variant="outlined"
              />
            </v-form>
          </template>

          <template #item.3>
            <v-form ref="formSubdomain" @submit.prevent>
              <v-text-field
                v-model.trim="form.subdomain"
                autofocus
                class="mt-2"
                :counter="30"
                :hint="subdomainHint"
                :label="$t('tenants.wizard.fields.subdomain')"
                :rules="[rules.required, rules.subdomainLength, rules.subdomainFormat]"
                :suffix="`.${rootDomain}`"
                variant="outlined"
                @input="normalizeSubdomain"
              />
              <v-alert
                border="start"
                class="mt-2"
                density="compact"
                type="warning"
                variant="tonal"
              >
                {{ $t('tenants.wizard.fields.subdomain_hint', { host: form.subdomain || 'your-handle' }) }}
              </v-alert>
              <v-checkbox
                v-model="form.confirmIrreversible"
                color="primary"
                density="compact"
                hide-details
                :label="$t('tenants.wizard.fields.confirm')"
              />
            </v-form>
          </template>

          <template #item.4>
            <p class="text-body-2 text-medium-emphasis mb-4">
              {{ $t('tenants.wizard.review.heading') }}
            </p>
            <v-list density="compact" lines="two">
              <v-list-item
                :subtitle="form.title"
                :title="$t('tenants.wizard.fields.title')"
              />
              <v-list-item
                v-if="form.description"
                :subtitle="form.description"
                :title="$t('tenants.wizard.fields.description')"
              />
              <v-list-item
                :subtitle="form.tenantWallet"
                :title="$t('tenants.wizard.fields.wallet')"
              />
              <v-list-item :title="$t('tenants.wizard.fields.fee')">
                <template #subtitle>
                  {{ form.tenantFeePercent }}{{ $t('tenants.wizard.review.fee_suffix') }}
                </template>
              </v-list-item>
              <v-list-item :title="$t('tenants.wizard.review.url_preview')">
                <template #subtitle>
                  <strong>{{ form.subdomain }}.{{ rootDomain }}</strong>
                </template>
              </v-list-item>
            </v-list>

            <v-alert
              v-if="serverError"
              border="start"
              class="mt-4"
              type="error"
              variant="tonal"
            >
              {{ localisedServerError }}
            </v-alert>
          </template>
        </v-stepper>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-btn
          :disabled="loading"
          variant="text"
          @click="handleCancel"
        >
          {{ $t('common.cancel') }}
        </v-btn>
        <v-spacer />
        <v-btn
          v-if="step > 1"
          :disabled="loading"
          variant="text"
          @click="step -= 1"
        >
          {{ $t('common.back') }}
        </v-btn>
        <v-btn
          v-if="step < 4"
          color="primary"
          :disabled="loading || checkingWallet || (step === 3 && !isStep3Valid)"
          :loading="checkingWallet"
          variant="flat"
          @click="handleNext"
        >
          {{ checkingWallet ? $t('common.checking') : $t('common.next') }}
        </v-btn>
        <v-btn
          v-else
          color="primary"
          :disabled="!form.confirmIrreversible"
          :loading="loading"
          variant="flat"
          @click="handleSubmit"
        >
          {{ $t('common.submit') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!--
    Post-creation session-restart dialog.
    The current JWT was issued before the user owned a tenant, so it
    has no `tenantAdminOf` claim and the sidebar / route guards still
    treat them as TENANT_PROSPECT. The only sanctioned way out is a
    fresh login — hence persistent + no close button + a single
    "Sign out and continue" CTA.
  -->
  <v-dialog
    v-model="sessionRestartOpen"
    max-width="520"
    persistent
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2" color="success" icon="mdi-check-circle" />
        <span>{{ $t('tenants.wizard.session_restart.title') }}</span>
      </v-card-title>
      <v-divider />
      <v-card-text class="pt-4">
        <p class="text-body-2">
          {{ $t('tenants.wizard.session_restart.body', {
            title: createdTenant?.title ?? '',
            subdomain: createdTenant?.subdomain ?? '',
            root: rootDomain,
          }) }}
        </p>
      </v-card-text>
      <v-divider />
      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn
          color="primary"
          :loading="signingOut"
          prepend-icon="mdi-logout"
          variant="flat"
          @click="handleSessionRestartLogout"
        >
          {{ $t('tenants.wizard.session_restart.sign_out') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
  import { computed, reactive, ref, watch } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { useRouter } from 'vue-router'
  import { createMyTenant, type CreateTenantPayload, TenantApiError, type TenantSummary } from '@/api/tenants'
  import { accountExists } from '@/services/stellar'
  import { useAuthStore } from '@/stores/auth'

  const props = defineProps<{
    modelValue: boolean
    rootDomain?: string
  }>()

  const emit = defineEmits<{
    'update:modelValue': [value: boolean]
    'created': [tenant: TenantSummary]
  }>()

  const { t } = useI18n()
  const authStore = useAuthStore()
  const router = useRouter()

  const dialog = computed({
    get: () => props.modelValue,
    set: value => emit('update:modelValue', value),
  })

  const rootDomain = computed(() => props.rootDomain ?? 'earnlumens.org')

  const stepTitles = computed(() => [
    t('tenants.wizard.step_profile'),
    t('tenants.wizard.step_wallet'),
    t('tenants.wizard.step_subdomain'),
    t('tenants.wizard.step_review'),
  ])

  const step = ref(1)
  const loading = ref(false)
  const serverError = ref<string | null>(null)
  const checkingWallet = ref(false)
  // Persistent session-restart dialog shown after a successful tenant
  // creation. The current JWT was minted before the user owned a tenant
  // so its `tenantAdminOf` claim is empty; the only way to obtain a
  // fresh token with the correct claims is to sign out and sign back
  // in. Logout is the dialog's only exit.
  const sessionRestartOpen = ref(false)
  const createdTenant = ref<TenantSummary | null>(null)
  const signingOut = ref(false)

  const form = reactive({
    title: '',
    description: '',
    tenantWallet: '',
    tenantFeePercent: '',
    subdomain: '',
    confirmIrreversible: false,
  })

  const formProfile = ref<any>(null)
  const formWallet = ref<any>(null)
  const formSubdomain = ref<any>(null)

  // ─── Validation rules ───────────────────────────────────────
  // Return `true | string` so Vuetify renders localised messages.

  const WALLET_RE = /^G[A-Z2-7]{55}$/
  const FEE_RE = /^\d{1,2}(\.\d{1,2})?$/
  const SUBDOMAIN_RE = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/

  const rules = {
    required: (v: string) => (v && v.trim().length > 0) || t('common.field_required'),
    titleLength: (v: string) => (v && v.length >= 2 && v.length <= 80) || t('tenants.errors.unknown_error'),
    descLength: (v: string) => !v || v.length <= 280 || t('tenants.errors.unknown_error'),
    walletFormat: (v: string) => WALLET_RE.test(v) || t('tenants.errors.wallet_format'),
    feeFormat: (v: string) => FEE_RE.test(v) || t('tenants.errors.tenant_fee_range'),
    feeRange: (v: string) => {
      const n = Number.parseFloat(v)
      return (!Number.isNaN(n) && n >= 0 && n <= 30) || t('tenants.errors.tenant_fee_range')
    },
    subdomainLength: (v: string) => (v.length >= 3 && v.length <= 30) || t('tenants.errors.subdomain_length'),
    subdomainFormat: (v: string) => SUBDOMAIN_RE.test(v) || t('tenants.errors.subdomain_format'),
  }

  const isStep3Valid = computed(() =>
    form.confirmIrreversible
    && form.subdomain.length >= 3
    && form.subdomain.length <= 30
    && SUBDOMAIN_RE.test(form.subdomain),
  )

  function normalizeSubdomain () {
    // Keep the input mirror-image of what the server will accept.
    form.subdomain = form.subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '')
  }

  const subdomainHint = computed(() =>
    t('tenants.wizard.fields.subdomain_hint', { host: form.subdomain || 'your-handle' }),
  )

  function isWalletErrorCode (code: string | null): boolean {
    return code === 'wallet_invalid' || code === 'wallet_format' || code === 'wallet_not_activated'
  }

  const localisedServerError = computed(() => {
    if (!serverError.value) return ''
    const key = `tenants.errors.${serverError.value}`
    const msg = t(key)
    // vue-i18n returns the key itself when the translation is missing.
    return msg === key ? t('tenants.errors.unknown_error') : msg
  })

  async function handleNext () {
    serverError.value = null
    let currentForm: any = null
    switch (step.value) {
      case 1: {
        currentForm = formProfile.value
        break
      }
      case 2: {
        currentForm = formWallet.value
        break
      }
      case 3: {
        currentForm = formSubdomain.value
        break
      }
    }
    if (!currentForm) return
    const { valid } = await currentForm.validate()
    if (!valid) return
    // Step 2 has an extra async check: the wallet must already exist
    // (be funded) on the Stellar ledger. Otherwise every payout the
    // tenant ever issues will fail at settlement time. Mirrors the
    // accountExists() guard the storefront uses on entry sales.
    if (step.value === 2) {
      checkingWallet.value = true
      try {
        const exists = await accountExists(form.tenantWallet)
        if (!exists) {
          serverError.value = 'wallet_invalid'
          return
        }
      } catch {
        serverError.value = 'wallet_invalid'
        return
      } finally {
        checkingWallet.value = false
      }
    }
    if (step.value === 3 && !form.confirmIrreversible) {
      serverError.value = 'confirmation_required'
      return
    }
    step.value += 1
  }

  async function handleSubmit () {
    serverError.value = null
    if (!form.confirmIrreversible) {
      serverError.value = 'confirmation_required'
      return
    }
    const payload: CreateTenantPayload = {
      title: form.title,
      description: form.description || undefined,
      tenantWallet: form.tenantWallet,
      tenantFeePercent: form.tenantFeePercent,
      subdomain: form.subdomain,
      confirmIrreversible: true,
    }
    loading.value = true
    try {
      const tenant = await createMyTenant(payload)
      emit('created', tenant)
      // Keep the wizard mounted but hidden behind the persistent
      // session-restart dialog: the user's only path forward from
      // here is to sign out and sign back in to pick up the new
      // tenantAdminOf claim. resetForm() is deferred until logout.
      createdTenant.value = tenant
      dialog.value = false
      sessionRestartOpen.value = true
    } catch (error) {
      if (error instanceof TenantApiError) {
        serverError.value = error.code
        // Jump back to the most relevant step so the user can fix it.
        if (error.code.startsWith('subdomain_')) step.value = 3
        else if (error.code === 'wallet_format' || error.code === 'wallet_invalid' || error.code === 'tenant_fee_range') step.value = 2
      } else {
        serverError.value = 'unknown_error'
      }
    } finally {
      loading.value = false
    }
  }

  function handleCancel () {
    if (loading.value) return
    dialog.value = false
  }

  function resetForm () {
    form.title = ''
    form.description = ''
    form.tenantWallet = ''
    form.tenantFeePercent = ''
    form.subdomain = ''
    form.confirmIrreversible = false
    step.value = 1
    serverError.value = null
  }

  // When the dialog is closed externally we reset so next open starts clean.
  watch(dialog, open => {
    if (!open) resetForm()
  })

  async function handleSessionRestartLogout () {
    if (signingOut.value) return
    signingOut.value = true
    try {
      await authStore.logout()
    } finally {
      signingOut.value = false
      sessionRestartOpen.value = false
      createdTenant.value = null
      router.push('/')
    }
  }
</script>
