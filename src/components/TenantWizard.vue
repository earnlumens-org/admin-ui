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
                :counter="80"
                :hint="$t('tenants.wizard.fields.title_hint')"
                :label="$t('tenants.wizard.fields.title')"
                :rules="[rules.required, rules.titleLength]"
                variant="outlined"
              />
              <v-textarea
                v-model.trim="form.description"
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
                :hint="$t('tenants.wizard.fields.wallet_hint')"
                :label="$t('tenants.wizard.fields.wallet')"
                placeholder="GABC...XYZ"
                :rules="[rules.required, rules.walletFormat]"
                variant="outlined"
              />
              <v-text-field
                v-model.trim="form.tenantFeePercent"
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
          :disabled="loading"
          variant="flat"
          @click="handleNext"
        >
          {{ $t('common.next') }}
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
</template>

<script lang="ts" setup>
  import { computed, reactive, ref, watch } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { createMyTenant, type CreateTenantPayload, TenantApiError, type TenantSummary } from '@/api/tenants'

  const props = defineProps<{
    modelValue: boolean
    rootDomain?: string
  }>()

  const emit = defineEmits<{
    'update:modelValue': [value: boolean]
    'created': [tenant: TenantSummary]
  }>()

  const { t } = useI18n()

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
    required: (v: string) => (v && v.trim().length > 0) || t('tenants.errors.subdomain_required'),
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

  function normalizeSubdomain () {
    // Keep the input mirror-image of what the server will accept.
    form.subdomain = form.subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '')
  }

  const subdomainHint = computed(() =>
    t('tenants.wizard.fields.subdomain_hint', { host: form.subdomain || 'your-handle' }),
  )

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
      resetForm()
      dialog.value = false
    } catch (error) {
      if (error instanceof TenantApiError) {
        serverError.value = error.code
        // Jump back to the most relevant step so the user can fix it.
        if (error.code.startsWith('subdomain_')) step.value = 3
        else if (error.code === 'wallet_format' || error.code === 'tenant_fee_range') step.value = 2
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
</script>
