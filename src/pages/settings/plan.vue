<!--
  /settings/plan — Pro plan billing (custom-domain-upgrade Fase 1D).

  Owner view: current plan state (Free / Pro / expiring / grace / expired),
  Free vs Pro comparison, and the prepaid Stellar checkout:
  connect wallet → prepare (unsigned XDR) → sign → submit (sync on-chain).

  SUPERADMIN extras (same page, gated): global price editor, custom-domain
  rollout, manual Pro grant (comp), and the recent plan_orders list. They
  render regardless of whether the superadmin owns a tenant.
-->
<template>
  <v-container class="pa-4 pa-sm-6" fluid>
    <v-breadcrumbs
      class="px-0 pt-0"
      :items="[
        { title: 'settings', disabled: false, to: '/settings' },
        { title: 'plan', disabled: true },
      ]"
    />

    <div class="text-h6 mb-1">Plan</div>

    <div class="text-body-2 text-medium-emphasis mb-4">
      Upgrade your tenant with the Pro plan. Prepaid with Stellar — no
      subscriptions, no card required.
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
        <v-btn size="small" variant="text" @click="reload">Retry</v-btn>
      </template>
    </v-alert>

    <template v-else-if="tenant">
      <!-- 1D.3 — expiry / grace / expired warning banner -->
      <v-alert
        v-if="expiryBanner"
        border="start"
        class="mb-4"
        :type="expiryBanner.type"
        variant="tonal"
      >
        {{ expiryBanner.text }}
      </v-alert>

      <!-- Current plan state -->
      <v-card class="mb-6">
        <v-card-item>
          <template #prepend>
            <v-avatar :color="isProActive ? 'amber-darken-2' : 'grey'" rounded="lg" size="40" variant="tonal">
              <v-icon :icon="isProActive ? 'mdi-crown' : 'mdi-leaf'" />
            </v-avatar>
          </template>

          <v-card-title>
            {{ isProActive ? 'Pro plan' : 'Free plan' }}
            <v-chip
              v-if="isProActive"
              class="ms-2"
              color="success"
              density="comfortable"
              size="small"
              variant="tonal"
            >ACTIVE</v-chip>
          </v-card-title>

          <v-card-subtitle v-if="tenant.planExpiresAt && isProActive">
            {{ inGrace ? 'Expired — grace period until' : 'Valid until' }}
            {{ formatDate(inGrace ? tenant.planGraceUntil : tenant.planExpiresAt) }}
          </v-card-subtitle>

          <v-card-subtitle v-else>
            Your storefront runs on the free tier.
          </v-card-subtitle>
        </v-card-item>
      </v-card>

      <!-- Free vs Pro comparison -->
      <v-row class="mb-2" dense>
        <v-col cols="12" md="6">
          <v-card class="h-100" variant="outlined">
            <v-card-item>
              <v-card-title class="text-subtitle-1">Free</v-card-title>
              <v-card-subtitle>$0 — forever</v-card-subtitle>
            </v-card-item>

            <v-card-text>
              <div v-for="f in freeFeatures" :key="f" class="d-flex align-center mb-2">
                <v-icon class="me-2" color="success" size="18">mdi-check</v-icon>
                <span class="text-body-2">{{ f }}</span>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="6">
          <v-card class="h-100" color="amber-darken-2" variant="outlined">
            <v-card-item>
              <v-card-title class="text-subtitle-1">
                Pro
                <v-icon class="ms-1" size="18">mdi-crown</v-icon>
              </v-card-title>

              <v-card-subtitle>
                ${{ prices?.planPriceMonthlyUsd ?? '4.99' }}/month ·
                ${{ prices?.planPriceYearlyUsd ?? '49.00' }}/year
              </v-card-subtitle>
            </v-card-item>

            <v-card-text>
              <div v-for="f in proFeatures" :key="f" class="d-flex align-center mb-2">
                <v-icon class="me-2" color="amber-darken-2" size="18">mdi-check-bold</v-icon>
                <span class="text-body-2">{{ f }}</span>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Checkout -->
      <v-card class="mb-6">
        <v-card-item>
          <v-card-title class="text-subtitle-1">
            {{ isProActive ? 'Extend your Pro plan' : 'Upgrade to Pro' }}
          </v-card-title>

          <v-card-subtitle>
            One payment with your Stellar wallet. Renewing early adds time on
            top of your current expiry — no days are lost.
          </v-card-subtitle>
        </v-card-item>

        <v-card-text>
          <v-alert
            v-if="checkoutError"
            border="start"
            class="mb-4"
            type="error"
            variant="tonal"
          >
            {{ checkoutError }}
          </v-alert>

          <v-alert
            v-if="checkoutSuccess"
            border="start"
            class="mb-4"
            type="success"
            variant="tonal"
          >
            Payment confirmed on-chain. Your Pro plan
            {{ checkoutSuccess.period === 'YEARLY' ? '(1 year)' : '(1 month)' }}
            is being applied — it becomes visible here within a minute.
          </v-alert>

          <div class="d-flex flex-wrap ga-3">
            <v-btn
              color="amber-darken-2"
              :disabled="paying !== null"
              :loading="paying === 'MONTHLY'"
              prepend-icon="mdi-crown-outline"
              variant="flat"
              @click="pay('MONTHLY')"
            >
              Pay 1 month — ${{ prices?.planPriceMonthlyUsd ?? '4.99' }}
            </v-btn>

            <v-btn
              color="amber-darken-4"
              :disabled="paying !== null"
              :loading="paying === 'YEARLY'"
              prepend-icon="mdi-crown"
              variant="flat"
              @click="pay('YEARLY')"
            >
              Pay 1 year — ${{ prices?.planPriceYearlyUsd ?? '49.00' }}
            </v-btn>
          </div>

          <div v-if="paying" class="text-body-2 text-medium-emphasis mt-3">
            {{ payingStep }}
          </div>
        </v-card-text>
      </v-card>
    </template>

    <v-card v-else-if="!isSuperadmin" class="pa-8 text-center" variant="tonal">
      <v-icon color="medium-emphasis" size="48">mdi-domain-off</v-icon>
      <div class="text-body-1 mt-4">No tenant to configure.</div>

      <div class="text-body-2 text-medium-emphasis mt-1">
        Create your tenant from the Tenants page first.
      </div>

      <v-btn class="mt-4" color="primary" to="/tenants" variant="flat">
        Go to tenants
      </v-btn>
    </v-card>

    <!-- SUPERADMIN console (1D.4) — independent of tenant ownership. -->
    <template v-if="isSuperadmin && !loading">
      <v-divider class="mb-4" />

      <div class="text-subtitle-1 mb-2">
        <v-icon class="me-1" size="18">mdi-shield-crown</v-icon>
        Superadmin — plan administration
      </div>

      <v-card class="mb-4">
        <v-card-item>
          <v-card-title class="text-subtitle-2">Global prices (USD)</v-card-title>
        </v-card-item>

        <v-card-text>
          <v-row dense>
            <v-col cols="12" sm="4">
              <v-text-field
                v-model="draftMonthly"
                density="comfortable"
                label="Monthly (USD)"
                prefix="$"
                variant="outlined"
              />
            </v-col>

            <v-col cols="12" sm="4">
              <v-text-field
                v-model="draftYearly"
                density="comfortable"
                label="Yearly (USD)"
                prefix="$"
                variant="outlined"
              />
            </v-col>

            <v-col class="d-flex align-center" cols="12" sm="4">
              <v-btn
                color="primary"
                :loading="savingPrices"
                variant="flat"
                @click="savePrices"
              >Save prices</v-btn>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <v-card class="mb-4">
        <v-card-item>
          <v-card-title class="text-subtitle-2">Custom domains rollout</v-card-title>
        </v-card-item>

        <v-card-text>
          <v-switch
            v-model="draftCdEnabled"
            color="primary"
            density="comfortable"
            hide-details
            label="Custom domains enabled for everyone (GA)"
          />

          <div class="text-caption text-medium-emphasis mb-3">
            While off, only the beta tenants below can register a new domain.
            Domains that are already registered keep working either way.
          </div>

          <v-row dense>
            <v-col cols="12" sm="8">
              <v-text-field
                v-model="draftCdBeta"
                density="comfortable"
                hint="Comma-separated tenant subdomains"
                label="Beta tenants"
                persistent-hint
                variant="outlined"
              />
            </v-col>

            <v-col class="d-flex align-center" cols="12" sm="4">
              <v-btn
                color="primary"
                :loading="savingRollout"
                variant="flat"
                @click="saveRollout"
              >Save rollout</v-btn>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <v-card class="mb-4">
        <v-card-item>
          <v-card-title class="text-subtitle-2">Grant Pro manually (comp)</v-card-title>
        </v-card-item>

        <v-card-text>
          <v-row dense>
            <v-col cols="12" sm="5">
              <v-text-field
                v-model="grantTenantId"
                density="comfortable"
                label="Tenant subdomain or id"
                variant="outlined"
              />
            </v-col>

            <v-col cols="12" sm="3">
              <v-text-field
                v-model.number="grantMonths"
                density="comfortable"
                label="Months"
                type="number"
                variant="outlined"
              />
            </v-col>

            <v-col class="d-flex align-center" cols="12" sm="4">
              <v-btn
                color="primary"
                :loading="granting"
                variant="flat"
                @click="doGrant"
              >Grant</v-btn>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <v-card>
        <v-card-item>
          <v-card-title class="text-subtitle-2">Recent plan orders</v-card-title>

          <template #append>
            <v-btn
              icon="mdi-refresh"
              size="small"
              variant="text"
              @click="loadOrders"
            />
          </template>
        </v-card-item>

        <v-card-text class="pa-0">
          <v-table density="comfortable">
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Period</th>
                <th>USD</th>
                <th>Status</th>
                <th>Applied</th>
                <th>Created</th>
              </tr>
            </thead>

            <tbody>
              <tr v-for="o in orders" :key="o.id">
                <td>{{ o.tenantId }}</td>
                <td>{{ o.period }}</td>
                <td>{{ o.amountUsd ?? '—' }}</td>

                <td>
                  <v-chip
                    :color="o.status === 'COMPLETED' ? 'success' : (o.status === 'FAILED' ? 'error' : 'grey')"
                    density="comfortable"
                    size="small"
                    variant="tonal"
                  >{{ o.status }}</v-chip>
                </td>

                <td>{{ o.appliedAt ? 'yes' : (o.status === 'COMPLETED' ? 'pending' : '—') }}</td>
                <td>{{ formatDate(o.createdAt ?? null) }}</td>
              </tr>

              <tr v-if="orders.length === 0">
                <td class="text-medium-emphasis" colspan="6">No plan orders yet.</td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>
      </v-card>
    </template>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="4000">
      {{ snackbarText }}
    </v-snackbar>
  </v-container>
</template>

<script lang="ts" setup>
  import { computed, onMounted, ref } from 'vue'
  import {
    type AdminPlanOrder,
    getBillingConfig,
    getPlanPrices,
    grantPro,
    listPlanOrders,
    PlanApiError,
    type PlanPeriod,
    type PlanPrices,
    preparePlan,
    submitPlan,
    updateBillingConfig,
  } from '@/api/plan'
  import { useTenantSettings } from '@/composables/useTenantSettings'
  import { connectWallet, getConnectedAddress, signTransaction } from '@/services/planWallet'
  import { useAuthStore } from '@/stores/auth'

  const authStore = useAuthStore()
  const isSuperadmin = computed(() => authStore.user?.role === 'SUPERADMIN')

  const {
    tenant, loading, loadError, loadTenant,
    snackbar, snackbarText, snackbarColor, showSnackbar,
  } = useTenantSettings()

  const prices = ref<PlanPrices | null>(null)

  const freeFeatures = [
    'Storefront on your subdomain ({you}.earnlumens.org)',
    'Unlimited catalogue & Stellar payments',
    'Branding, themes, banner and franchises',
  ]
  const proFeatures = [
    'Custom domain (yourbrand.com) — connect it in Settings → Custom domain',
    'Remove the EarnLumens branding (logo-only mode)',
    'Priority support',
  ]

  // ---- plan state helpers ----------------------------------------------

  const now = ref(new Date())

  const isProActive = computed(() => {
    if (!tenant.value || tenant.value.plan !== 'PRO') return false
    const limit = tenant.value.planGraceUntil ?? tenant.value.planExpiresAt
    return !!limit && new Date(limit) > now.value
  })

  const inGrace = computed(() => {
    if (!tenant.value || !isProActive.value || !tenant.value.planExpiresAt) return false
    return new Date(tenant.value.planExpiresAt) <= now.value
  })

  const expiryBanner = computed((): { type: 'warning' | 'error' | 'info', text: string } | null => {
    const t = tenant.value
    if (!t || t.plan !== 'PRO' || !t.planExpiresAt) return null
    const expires = new Date(t.planExpiresAt)
    const grace = t.planGraceUntil ? new Date(t.planGraceUntil) : expires
    if (grace <= now.value) {
      return { type: 'error', text: 'Your Pro plan has expired. Pro features are disabled — renew to restore them.' }
    }
    if (expires <= now.value) {
      return { type: 'error', text: `Your Pro plan expired — grace period ends ${formatDate(t.planGraceUntil)}. Renew now to avoid losing Pro features.` }
    }
    const daysLeft = (expires.getTime() - now.value.getTime()) / 86_400_000
    if (daysLeft <= 7) {
      return { type: 'warning', text: `Your Pro plan expires in ${Math.ceil(daysLeft)} day(s) (${formatDate(t.planExpiresAt)}). Renew to keep Pro features without interruption.` }
    }
    return null
  })

  function formatDate (iso: string | null | undefined): string {
    if (!iso) return '—'
    try {
      return new Date(iso).toLocaleString()
    } catch {
      return iso
    }
  }

  // ---- checkout ---------------------------------------------------------

  const paying = ref<PlanPeriod | null>(null)
  const payingStep = ref('')
  const checkoutError = ref<string | null>(null)
  const checkoutSuccess = ref<{ period: PlanPeriod } | null>(null)

  async function pay (period: PlanPeriod) {
    if (!tenant.value || paying.value) return
    checkoutError.value = null
    checkoutSuccess.value = null
    paying.value = period
    try {
      payingStep.value = 'Connecting your Stellar wallet…'
      let address = await getConnectedAddress()
      if (!address) {
        address = await connectWallet()
      }
      if (!address) {
        checkoutError.value = 'No wallet connected.'
        return
      }

      payingStep.value = 'Preparing the payment…'
      const prepared = await preparePlan(tenant.value.id, period, address)

      payingStep.value = `Sign the transaction in your wallet (${prepared.amountXlm} XLM ≈ $${prepared.amountUsd})…`
      const signedXdr = await signTransaction(prepared.unsignedXdr, address)

      payingStep.value = 'Submitting and confirming on-chain (this can take ~10 s)…'
      const result = await submitPlan(tenant.value.id, prepared.orderId, signedXdr)

      if (result.status === 'COMPLETED') {
        checkoutSuccess.value = { period }
        showSnackbar('Pro plan payment confirmed', 'success')
        // Give the apply callback a moment, then refresh the tenant state.
        setTimeout(() => {
          loadTenant()
          now.value = new Date()
        }, 4000)
      } else {
        checkoutError.value = `Payment did not complete (status: ${result.status}).`
      }
    } catch (error) {
      // PlanApiError → mapped server code; anything else = wallet rejection / kit error.
      checkoutError.value = error instanceof PlanApiError
        ? mapErrorCode(error.code)
        : 'The transaction was not signed. No payment was made.'
    } finally {
      paying.value = null
      payingStep.value = ''
    }
  }

  function mapErrorCode (code: string): string {
    switch (code) {
      case 'PAYMENT_IN_PROGRESS': { return 'A previous payment is still being confirmed. Please wait a minute and retry.'
      }
      case 'WALLET_NOT_ACTIVATED': { return 'Your wallet is not activated (unfunded) on the Stellar network.'
      }
      case 'PLAN_OWNER_ONLY': { return 'Only the tenant owner can buy the plan.'
      }
      case 'plan_purchase_disabled': { return 'Plan purchases are temporarily unavailable. Please try again later.'
      }
      default: { return `Payment failed: ${code}`
      }
    }
  }

  // ---- superadmin -------------------------------------------------------

  const draftMonthly = ref('')
  const draftYearly = ref('')
  const savingPrices = ref(false)
  const grantTenantId = ref('')
  const grantMonths = ref(1)
  const granting = ref(false)
  const orders = ref<AdminPlanOrder[]>([])

  async function savePrices () {
    savingPrices.value = true
    try {
      const cfg = await updateBillingConfig({
        planPriceMonthlyUsd: draftMonthly.value,
        planPriceYearlyUsd: draftYearly.value,
      })
      draftMonthly.value = String(cfg.planPriceMonthlyUsd)
      draftYearly.value = String(cfg.planPriceYearlyUsd)
      prices.value = {
        planPriceMonthlyUsd: String(cfg.planPriceMonthlyUsd),
        planPriceYearlyUsd: String(cfg.planPriceYearlyUsd),
      }
      showSnackbar('Prices updated', 'success')
    } catch (error) {
      showSnackbar(error instanceof PlanApiError ? error.code : 'Failed to save prices', 'error')
    } finally {
      savingPrices.value = false
    }
  }

  // Custom-domains rollout (7.4): global GA flag + beta allowlist.
  const draftCdEnabled = ref(false)
  const draftCdBeta = ref('')
  const savingRollout = ref(false)

  async function saveRollout () {
    savingRollout.value = true
    try {
      const cfg = await updateBillingConfig({
        customDomainsEnabled: draftCdEnabled.value,
        customDomainBetaTenants: draftCdBeta.value
          .split(',')
          .map(s => s.trim())
          .filter(Boolean),
      })
      draftCdEnabled.value = cfg.customDomainsEnabled === true
      draftCdBeta.value = (cfg.customDomainBetaTenants ?? []).join(', ')
      showSnackbar('Custom-domain rollout updated', 'success')
    } catch (error) {
      showSnackbar(error instanceof PlanApiError ? error.code : 'Failed to save rollout', 'error')
    } finally {
      savingRollout.value = false
    }
  }

  async function doGrant () {
    if (!grantTenantId.value) return
    granting.value = true
    try {
      await grantPro(grantTenantId.value.trim(), grantMonths.value)
      showSnackbar('Pro granted', 'success')
      loadOrders()
    } catch (error) {
      showSnackbar(error instanceof PlanApiError ? error.code : 'Grant failed', 'error')
    } finally {
      granting.value = false
    }
  }

  async function loadOrders () {
    try {
      orders.value = await listPlanOrders(50)
    } catch {
      orders.value = []
    }
  }

  // ---- lifecycle --------------------------------------------------------

  function reload () {
    loadTenant()
    loadPrices()
  }

  async function loadPrices () {
    try {
      prices.value = await getPlanPrices()
    } catch {
      prices.value = null
    }
  }

  onMounted(async () => {
    await loadTenant()
    loadPrices()
    if (isSuperadmin.value) {
      loadOrders()
      try {
        const cfg = await getBillingConfig()
        draftMonthly.value = String(cfg.planPriceMonthlyUsd)
        draftYearly.value = String(cfg.planPriceYearlyUsd)
        draftCdEnabled.value = cfg.customDomainsEnabled === true
        draftCdBeta.value = (cfg.customDomainBetaTenants ?? []).join(', ')
      } catch { /* superadmin card just stays empty */ }
    }
  })
</script>
