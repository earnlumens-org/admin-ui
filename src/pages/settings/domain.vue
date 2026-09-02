<!--
  /settings/domain — Custom domain (custom-domain-upgrade Fase 2D + decisión #9).

  UX requirement (2D.1): Shopify-level simplicity. One input → a screen with
  the exact DNS records to copy (copy button per record, literal values, no
  jargon), live status with automatic polling ("Waiting for DNS… / Issuing
  SSL… / Active!"), automatic detection without a mandatory "verify" click,
  and plain-language errors with the concrete fix.

  Connection scheme (Cloudflare for SaaS Standard, decisión #9): the storefront
  is served on a hostname (normally www.<apex>) CNAME'd to shops.earnlumens.org;
  the apex is 301-redirected to www AT THE OWNER'S DNS PROVIDER. That external
  redirect (step 2) is deliberately kept apart from EarnLumens' own opt-in
  canonical redirect ({sub}.earnlumens.org → custom domain, the toggle).

  Free tenants see an upsell card linking to /settings/plan (2D.3).
-->
<template>
  <v-container class="pa-4 pa-sm-6" fluid>
    <v-breadcrumbs
      class="px-0 pt-0"
      :items="[
        { title: 'settings', disabled: false, to: '/settings' },
        { title: 'domain', disabled: true },
      ]"
    />

    <div class="text-h6 mb-1">Custom domain</div>

    <div class="text-body-2 text-medium-emphasis mb-4">
      Serve your storefront on your own domain (e.g. <strong>www.yourbrand.com</strong>)
      instead of {{ tenant?.subdomain ?? 'you' }}.earnlumens.org.
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
      <!-- 2D.3 — upsell for Free tenants -->
      <v-card v-if="!isProActive" class="pa-6 text-center" variant="tonal">
        <v-icon color="amber-darken-2" size="48">mdi-crown</v-icon>
        <div class="text-h6 mt-3">Custom domains are a Pro feature</div>

        <div class="text-body-2 text-medium-emphasis mt-1 mb-4">
          Upgrade to Pro to connect your own domain, remove the EarnLumens
          branding and more.
        </div>

        <v-btn color="amber-darken-2" prepend-icon="mdi-crown" to="/settings/plan" variant="flat">
          See Pro plan
        </v-btn>
      </v-card>

      <!-- Pro without a domain yet: one input, one button -->
      <v-card v-else-if="!domain">
        <v-card-item>
          <v-card-title class="text-subtitle-1">Connect your domain</v-card-title>

          <v-card-subtitle>
            Type the domain you already own. We'll give you the exact records
            to copy into your domain provider — nothing else to figure out.
          </v-card-subtitle>
        </v-card-item>

        <v-card-text>
          <v-alert
            v-if="actionError"
            border="start"
            class="mb-4"
            type="error"
            variant="tonal"
          >
            {{ actionError }}
          </v-alert>

          <v-form @submit.prevent="connect">
            <v-text-field
              v-model="draftDomain"
              autocomplete="off"
              :disabled="connecting"
              hint="yourbrand.com, www.yourbrand.com or shop.yourbrand.com"
              label="Your domain"
              persistent-hint
              placeholder="yourbrand.com"
              prepend-inner-icon="mdi-web"
              variant="outlined"
            />

            <!-- Live preview of what will actually be connected (decisión #9) -->
            <v-alert
              v-if="preview"
              class="mt-3"
              density="compact"
              :icon="preview.isApex ? 'mdi-information-outline' : 'mdi-check'"
              type="info"
              variant="tonal"
            >
              <template v-if="preview.isApex">
                Your storefront will live at <strong>{{ preview.hostname }}</strong>.
                Root domains ({{ preview.typed }}) can't be connected directly
                yet, so we connect <strong>www</strong> and you set up a simple
                redirect {{ preview.typed }} → {{ preview.hostname }} at your
                provider (we'll show you exactly how).
              </template>

              <template v-else>
                Your storefront will live at <strong>{{ preview.hostname }}</strong>.
              </template>
            </v-alert>

            <v-btn
              class="mt-4"
              color="primary"
              :disabled="!draftDomain.trim()"
              :loading="connecting"
              prepend-icon="mdi-link-variant"
              type="submit"
              variant="flat"
            >
              Connect {{ preview?.hostname ?? 'domain' }}
            </v-btn>
          </v-form>
        </v-card-text>
      </v-card>

      <!-- Domain exists: live status -->
      <template v-else>
        <!-- Status banner -->
        <v-alert
          border="start"
          class="mb-4"
          :icon="statusUi.icon"
          :type="statusUi.type"
          variant="tonal"
        >
          <div class="font-weight-medium">{{ statusUi.title }}</div>
          <div class="text-body-2">{{ statusUi.detail }}</div>
        </v-alert>

        <v-alert
          v-if="actionError"
          border="start"
          class="mb-4"
          type="error"
          variant="tonal"
        >
          {{ actionError }}
        </v-alert>

        <!-- Domain card -->
        <v-card class="mb-6">
          <v-card-item>
            <template #prepend>
              <v-avatar :color="statusUi.color" rounded="lg" size="40" variant="tonal">
                <v-icon :icon="statusUi.icon" />
              </v-avatar>
            </template>

            <v-card-title class="text-subtitle-1 d-flex align-center flex-wrap">
              {{ domain.domain }}
              <v-chip
                class="ms-2"
                :color="statusUi.color"
                density="comfortable"
                size="small"
                variant="tonal"
              >{{ statusUi.chip }}</v-chip>
            </v-card-title>

            <v-card-subtitle v-if="domain.status === 'ACTIVE' && domain.activatedAt">
              Active since {{ formatDate(domain.activatedAt) }}
            </v-card-subtitle>
          </v-card-item>

          <!-- Progress steps while pending -->
          <v-card-text v-if="isPendingStatus" class="pt-0">
            <div class="d-flex align-center mb-2">
              <v-progress-circular
                class="me-3"
                color="primary"
                indeterminate
                size="20"
                width="2"
              />

              <span class="text-body-2">
                {{ domain.status === 'PENDING_DNS'
                  ? 'Waiting for your DNS records… (checked automatically every few seconds)'
                  : 'DNS verified — issuing the SSL certificate… (usually under 15 minutes)' }}
              </span>
            </div>

            <div class="text-caption text-medium-emphasis">
              You can leave this page — we keep checking in the background and
              your domain activates on its own.
            </div>
          </v-card-text>

          <!-- ACTIVE: link + redirect toggle -->
          <v-card-text v-else-if="domain.status === 'ACTIVE'" class="pt-0">
            <v-btn
              color="primary"
              :href="`https://${domain.domain}`"
              prepend-icon="mdi-open-in-new"
              rel="noopener noreferrer"
              size="small"
              target="_blank"
              variant="tonal"
            >
              Open {{ domain.domain }}
            </v-btn>

            <v-divider class="my-4" />

            <!-- Reminder: external apex → www redirect (owner's provider) -->
            <div v-if="domain.apexRedirect" class="text-body-2 mb-4">
              <v-icon class="me-1" icon="mdi-arrow-right-bottom" size="18" />
              Visitors typing <strong>{{ domain.apexRedirect.from }}</strong> reach
              your store only if your domain provider redirects it to
              <strong>{{ domain.apexRedirect.to }}</strong>

              <v-btn size="x-small" variant="text" @click="showApexHelp = !showApexHelp">
                {{ showApexHelp ? 'Hide' : 'How?' }}
              </v-btn>

              <div v-if="showApexHelp" class="text-caption text-medium-emphasis mt-1">
                In your provider's panel look for "Forwarding", "Redirect" or
                "URL redirect" on {{ domain.apexRedirect.from }} and point it
                (permanent / 301) to {{ domain.apexRedirect.to }}. This is
                configured entirely at your provider — EarnLumens is not involved.
              </div>
            </div>

            <!-- 2D.2 — EarnLumens canonical 301 toggle (distinct from the apex redirect above) -->
            <v-switch
              color="primary"
              density="comfortable"
              :disabled="togglingRedirect"
              hide-details
              :label="`Redirect ${tenant.subdomain}.earnlumens.org to ${domain.domain} (301)`"
              :loading="togglingRedirect"
              :model-value="domain.redirectEnabled"
              @update:model-value="toggleRedirect"
            />

            <div class="text-caption text-medium-emphasis mt-1">
              Off by default. When on, visitors of your EarnLumens subdomain are
              sent to your custom domain (search engines will treat it as the
              main address). This is handled by EarnLumens and is separate from
              the root-domain redirect at your provider.
            </div>
          </v-card-text>

          <!-- SUSPENDED (2D.4) -->
          <v-card-text v-else-if="domain.status === 'SUSPENDED'" class="pt-0">
            <v-btn
              color="amber-darken-2"
              prepend-icon="mdi-crown"
              to="/settings/plan"
              variant="flat"
            >
              Renew Pro to reactivate
            </v-btn>

            <div class="text-caption text-medium-emphasis mt-2">
              Your domain settings are kept for 30 days after suspension —
              renewing within that window reactivates the domain without any
              DNS changes.
            </div>
          </v-card-text>
        </v-card>

        <!-- DNS instructions (2D.1) — step 1: records at the owner's provider -->
        <v-card v-if="isPendingStatus && domain.dnsRecords.length > 0" class="mb-6">
          <v-card-item>
            <v-card-title class="text-subtitle-1">
              {{ domain.apexRedirect ? 'Step 1 — ' : '' }}Add
              {{ domain.dnsRecords.length === 1 ? 'this DNS record' : 'these DNS records' }}
            </v-card-title>

            <v-card-subtitle>
              In the DNS panel of your domain provider (Namecheap, GoDaddy,
              Cloudflare, Google Domains…), create
              {{ domain.dnsRecords.length === 1 ? 'this record' : 'each record' }}
              exactly as shown for <strong>{{ domain.apexDomain }}</strong>.
            </v-card-subtitle>
          </v-card-item>

          <v-card-text>
            <v-card
              v-for="(rec, i) in domain.dnsRecords"
              :key="`${rec.type}-${rec.name}`"
              class="mb-3 pa-3"
              variant="outlined"
            >
              <div class="text-caption text-medium-emphasis mb-2">
                Record {{ i + 1 }} — {{ rec.purpose === 'routing'
                  ? 'points your domain at your storefront'
                  : 'proves you own the domain' }}
              </div>

              <v-row dense>
                <v-col cols="12" sm="2">
                  <div class="text-caption text-medium-emphasis">Type</div>
                  <code class="text-body-2">{{ rec.type }}</code>
                </v-col>

                <v-col cols="12" sm="4">
                  <div class="text-caption text-medium-emphasis">Name / Host</div>

                  <div class="d-flex align-center">
                    <code class="text-body-2 text-truncate">{{ rec.host }}</code>

                    <v-btn
                      density="comfortable"
                      icon="mdi-content-copy"
                      size="x-small"
                      variant="text"
                      @click="copy(rec.host)"
                    />
                  </div>

                  <div v-if="rec.host !== rec.name" class="text-caption text-medium-emphasis">
                    If your provider asks for the full name:
                    <code>{{ rec.name }}</code>

                    <v-btn
                      density="compact"
                      icon="mdi-content-copy"
                      size="x-small"
                      variant="text"
                      @click="copy(rec.name)"
                    />
                  </div>
                </v-col>

                <v-col cols="12" sm="6">
                  <div class="text-caption text-medium-emphasis">Value / Target</div>

                  <div class="d-flex align-center">
                    <code class="text-body-2 text-truncate">{{ rec.value }}</code>

                    <v-btn
                      density="comfortable"
                      icon="mdi-content-copy"
                      size="x-small"
                      variant="text"
                      @click="copy(rec.value)"
                    />
                  </div>
                </v-col>
              </v-row>
            </v-card>

            <!-- Legacy only: a root domain connected via CNAME before decisión #9 -->
            <v-alert
              v-if="hasLegacyApexCname"
              class="mb-3"
              density="compact"
              type="warning"
              variant="tonal"
            >
              This domain is connected at its root ("@"). A CNAME at the root
              only works if your provider supports it (sometimes called ALIAS,
              ANAME or CNAME flattening). If it never activates, remove it and
              connect <strong>www.{{ domain.apexDomain }}</strong> instead.
            </v-alert>

            <div class="text-caption text-medium-emphasis">
              DNS changes can take a few minutes to propagate. We keep checking
              automatically.
            </div>

            <v-btn
              class="mt-3"
              :loading="verifying"
              prepend-icon="mdi-refresh"
              size="small"
              variant="tonal"
              @click="checkNow"
            >
              Check now
            </v-btn>
          </v-card-text>
        </v-card>

        <!-- Step 2: external apex → www redirect (owner's provider, not EarnLumens) -->
        <v-card v-if="isPendingStatus && domain.apexRedirect" class="mb-6">
          <v-card-item>
            <v-card-title class="text-subtitle-1">
              Step 2 — Redirect {{ domain.apexRedirect.from }} to your store
            </v-card-title>

            <v-card-subtitle>
              So people who type <strong>{{ domain.apexRedirect.from }}</strong>
              (without www) also land on your store. Done at your domain
              provider — look for "Forwarding", "Redirect" or "URL redirect".
            </v-card-subtitle>
          </v-card-item>

          <v-card-text>
            <v-card class="pa-3" variant="outlined">
              <v-row dense>
                <v-col cols="12" sm="2">
                  <div class="text-caption text-medium-emphasis">Type</div>
                  <code class="text-body-2">Redirect (301)</code>
                </v-col>

                <v-col cols="12" sm="4">
                  <div class="text-caption text-medium-emphasis">From</div>

                  <div class="d-flex align-center">
                    <code class="text-body-2 text-truncate">{{ domain.apexRedirect.from }}</code>

                    <v-btn
                      density="comfortable"
                      icon="mdi-content-copy"
                      size="x-small"
                      variant="text"
                      @click="copy(domain.apexRedirect.from)"
                    />
                  </div>
                </v-col>

                <v-col cols="12" sm="6">
                  <div class="text-caption text-medium-emphasis">To</div>

                  <div class="d-flex align-center">
                    <code class="text-body-2 text-truncate">{{ domain.apexRedirect.to }}</code>

                    <v-btn
                      density="comfortable"
                      icon="mdi-content-copy"
                      size="x-small"
                      variant="text"
                      @click="copy(domain.apexRedirect.to)"
                    />
                  </div>
                </v-col>
              </v-row>
            </v-card>

            <div class="text-caption text-medium-emphasis mt-3">
              Choose "permanent" (301) and keep the path if your provider offers
              it. This redirect lives entirely at your provider and is not
              required for activation — your store works on
              {{ domain.domain }} as soon as step 1 is detected.
            </div>
          </v-card-text>
        </v-card>

        <!-- Danger zone -->
        <v-card variant="outlined">
          <v-card-item>
            <v-card-title class="text-subtitle-1">Remove domain</v-card-title>

            <v-card-subtitle>
              Your storefront stays available on
              {{ tenant.subdomain }}.earnlumens.org. You can reconnect a domain
              at any time.
            </v-card-subtitle>
          </v-card-item>

          <v-card-text>
            <v-btn
              color="error"
              prepend-icon="mdi-delete-outline"
              variant="tonal"
              @click="deleteDialog = true"
            >
              Remove {{ domain.domain }}
            </v-btn>
          </v-card-text>
        </v-card>

        <v-dialog v-model="deleteDialog" max-width="480">
          <v-card>
            <v-card-title class="text-subtitle-1">Remove custom domain?</v-card-title>

            <v-card-text class="text-body-2">
              <strong>{{ domain.domain }}</strong> will stop serving your
              storefront immediately. To use it again later you'll have to
              connect and verify it from scratch.
            </v-card-text>

            <v-card-actions>
              <v-spacer />
              <v-btn variant="text" @click="deleteDialog = false">Cancel</v-btn>

              <v-btn color="error" :loading="deleting" variant="flat" @click="removeDomain">
                Remove domain
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </template>
    </template>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="4000">
      {{ snackbarText }}
    </v-snackbar>
  </v-container>
</template>

<script lang="ts" setup>
  import { computed, onBeforeUnmount, ref, watch } from 'vue'
  import {
    CustomDomainApiError,
    type CustomDomainView,
    deleteCustomDomain,
    getCustomDomain,
    previewServedHostname,
    registerCustomDomain,
    setCustomDomainRedirect,
    verifyCustomDomain,
  } from '@/api/customDomain'
  import { useTenantSettings } from '@/composables/useTenantSettings'

  const {
    tenant, loading, loadError, loadTenant,
    snackbar, snackbarText, snackbarColor, showSnackbar,
  } = useTenantSettings()

  const domain = ref<CustomDomainView | null>(null)
  const draftDomain = ref('')
  const connecting = ref(false)
  const verifying = ref(false)
  const deleting = ref(false)
  const togglingRedirect = ref(false)
  const deleteDialog = ref(false)
  const actionError = ref<string | null>(null)
  const showApexHelp = ref(false)

  // ---- live preview of the served hostname (decisión #9) ------------------

  const preview = computed(() => {
    const typed = draftDomain.value.trim().toLowerCase().replace(/\.$/, '')
    const hostname = previewServedHostname(typed)
    if (!hostname) return null
    return { typed, hostname, isApex: hostname !== typed }
  })

  /** Root domain connected via CNAME before decisión #9 (needs provider flattening). */
  const hasLegacyApexCname = computed(() =>
    domain.value?.connection === 'CNAME'
    && domain.value.dnsRecords.some(r => r.purpose === 'routing' && r.host === '@'))

  // ---- plan gate ---------------------------------------------------------

  const isProActive = computed(() => {
    if (!tenant.value || tenant.value.plan !== 'PRO') return false
    const limit = tenant.value.planGraceUntil ?? tenant.value.planExpiresAt
    return !!limit && new Date(limit) > new Date()
  })

  // ---- status presentation (2D.4) ---------------------------------------

  const isPendingStatus = computed(() =>
    domain.value?.status === 'PENDING_DNS' || domain.value?.status === 'PENDING_SSL')

  const statusUi = computed(() => {
    switch (domain.value?.status) {
      case 'ACTIVE': {
        return {
          type: 'success' as const, color: 'success', icon: 'mdi-check-circle',
          chip: 'ACTIVE', title: 'Your domain is live!',
          detail: 'Visitors can reach your storefront on your own domain with SSL.',
        }
      }
      case 'PENDING_DNS': {
        return {
          type: 'info' as const, color: 'info', icon: 'mdi-dns',
          chip: 'WAITING FOR DNS', title: 'Waiting for your DNS records',
          detail: 'Add the records below at your domain provider. We detect them automatically — no need to click anything.',
        }
      }
      case 'PENDING_SSL': {
        return {
          type: 'info' as const, color: 'info', icon: 'mdi-lock-clock',
          chip: 'ISSUING SSL', title: 'DNS verified — issuing your SSL certificate',
          detail: 'This is automatic and usually takes a few minutes.',
        }
      }
      case 'SUSPENDED': {
        return {
          type: 'error' as const, color: 'error', icon: 'mdi-pause-circle',
          chip: 'SUSPENDED', title: 'Domain suspended — Pro plan expired',
          detail: 'Renew your Pro plan to reactivate this domain. Settings are kept for 30 days.',
        }
      }
      case 'FAILED': {
        return {
          type: 'error' as const, color: 'error', icon: 'mdi-alert-circle',
          chip: 'FAILED', title: 'Something went wrong with this domain',
          detail: 'The domain was blocked or removed at the SSL provider. Remove it below and connect it again.',
        }
      }
      default: {
        return {
          type: 'info' as const, color: 'grey', icon: 'mdi-web',
          chip: '—', title: '', detail: '',
        }
      }
    }
  })

  // ---- error mapping (plain language + concrete fix, 2D.1/2D.4) ---------

  function mapError (error: unknown): string {
    if (!(error instanceof CustomDomainApiError)) {
      return 'Something went wrong. Please try again.'
    }
    switch (error.code) {
      case 'domain_invalid': { return 'That does not look like a valid domain. Enter it like yourbrand.com or shop.yourbrand.com (no https://, no paths).'
      }
      case 'domain_reserved': { return 'Domains under earnlumens.org cannot be connected — your subdomain already works out of the box.'
      }
      case 'domain_taken': { return 'This domain is already connected to another store. If you own it and believe this is an error, contact support.'
      }
      case 'domain_already_set': { return 'This store already has a domain. Remove it first to connect a different one.'
      }
      case 'domain_not_active': { return 'The redirect can only be enabled once your domain is active.'
      }
      case 'domain_rate_limited': { return 'Too many domain changes today. Please try again tomorrow.'
      }
      case 'domain_cf_error': { return 'Our domain provider is having a hiccup. Please try again in a few minutes.'
      }
      case 'domain_feature_disabled': { return 'Custom domains are not available for your shop yet (rolling out gradually). Please try again later.'
      }
      case 'domain_connection_unsupported': { return 'That connection method is not available yet. Connect your domain as www.yourbrand.com (the default).'
      }
      case 'plan_required': { return 'Custom domains require an active Pro plan.'
      }
      case 'domain_not_set': { return 'No domain is connected yet.'
      }
      default: { return `Unexpected error: ${error.code}`
      }
    }
  }

  // ---- data flow ----------------------------------------------------------

  async function loadDomain () {
    if (!tenant.value) return
    try {
      domain.value = await getCustomDomain(tenant.value.id)
    } catch (error) {
      if (error instanceof CustomDomainApiError && error.code === 'domain_not_set') {
        domain.value = null
      } else if (error instanceof CustomDomainApiError && error.code === 'domain_cf_error') {
        // Keep last known state; polling will retry.
      } else {
        actionError.value = mapError(error)
      }
    }
  }

  async function connect () {
    if (!tenant.value || connecting.value) return
    actionError.value = null
    connecting.value = true
    try {
      domain.value = await registerCustomDomain(tenant.value.id, draftDomain.value.trim())
      draftDomain.value = ''
      showSnackbar(`${domain.value.domain} connected — now add the records at your provider`, 'success')
    } catch (error) {
      actionError.value = mapError(error)
    } finally {
      connecting.value = false
    }
  }

  async function checkNow () {
    if (!tenant.value || verifying.value) return
    actionError.value = null
    verifying.value = true
    try {
      domain.value = await verifyCustomDomain(tenant.value.id)
    } catch (error) {
      actionError.value = mapError(error)
    } finally {
      verifying.value = false
    }
  }

  async function toggleRedirect (value: boolean | null) {
    if (!tenant.value || !domain.value || togglingRedirect.value) return
    actionError.value = null
    togglingRedirect.value = true
    try {
      domain.value = await setCustomDomainRedirect(tenant.value.id, value === true)
      showSnackbar(value ? 'Redirect enabled' : 'Redirect disabled', 'success')
    } catch (error) {
      actionError.value = mapError(error)
    } finally {
      togglingRedirect.value = false
    }
  }

  async function removeDomain () {
    if (!tenant.value || deleting.value) return
    deleting.value = true
    try {
      await deleteCustomDomain(tenant.value.id)
      domain.value = null
      deleteDialog.value = false
      showSnackbar('Domain removed', 'success')
    } catch (error) {
      actionError.value = mapError(error)
      deleteDialog.value = false
    } finally {
      deleting.value = false
    }
  }

  async function copy (text: string) {
    try {
      await navigator.clipboard.writeText(text)
      showSnackbar('Copied', 'success')
    } catch {
      showSnackbar('Copy failed — select and copy manually', 'error')
    }
  }

  function formatDate (iso: string | null | undefined): string {
    if (!iso) return '—'
    try {
      return new Date(iso).toLocaleString()
    } catch {
      return iso
    }
  }

  function reload () {
    loadTenant()
  }

  // ---- automatic detection (2D.1): poll while pending ---------------------

  let pollTimer: ReturnType<typeof setInterval> | null = null

  function syncPolling () {
    const shouldPoll = isPendingStatus.value
    if (shouldPoll && !pollTimer) {
      pollTimer = setInterval(loadDomain, 10_000)
    } else if (!shouldPoll && pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  watch(domain, syncPolling)
  watch(tenant, t => {
    domain.value = null
    actionError.value = null
    if (t) loadDomain()
  })
  onBeforeUnmount(() => {
    if (pollTimer) clearInterval(pollTimer)
  })
</script>
