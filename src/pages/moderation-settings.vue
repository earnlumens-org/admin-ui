<template>
  <v-container class="pa-4 pa-sm-6" fluid>
    <v-breadcrumbs
      class="px-0 pt-0"
      :items="[
        { title: 'Moderation', disabled: true },
        { title: 'Settings', disabled: true },
      ]"
    />

    <div class="d-flex flex-column flex-sm-row align-sm-center ga-2 mb-4">
      <div>
        <div class="text-h6 mb-1">Moderation Settings</div>
        <div class="text-body-2 text-medium-emphasis">
          Configure automated moderation rules per tenant
        </div>
      </div>
      <v-spacer />
      <v-select
        v-model="selectedTenant"
        density="compact"
        hide-details
        item-title="title"
        item-value="value"
        :items="tenantOptions"
        label="Tenant"
        style="max-width: 240px"
        variant="outlined"
        @update:model-value="loadConfig"
      />
    </div>

    <v-divider class="mb-6" />

    <!-- Loading state -->
    <div v-if="loading" class="d-flex justify-center py-12">
      <v-progress-circular indeterminate />
    </div>

    <template v-else>
      <!-- Editable: Business Rules Prompt -->
      <v-row class="mb-2">
        <v-col cols="12">
          <v-card>
            <v-card-item>
              <template #prepend>
                <v-icon color="primary" icon="mdi-robot-outline" />
              </template>
              <v-card-title>Business Rules Prompt</v-card-title>
              <v-card-subtitle style="white-space: normal">
                Custom prompt sent to Gemini Flash for content moderation decisions.
                This is the only editable moderation parameter per tenant.
                The system automatically appends the required JSON response format.
              </v-card-subtitle>
            </v-card-item>

            <v-card-text>
              <v-textarea
                v-model="promptText"
                auto-grow
                counter="10000"
                :maxlength="10000"
                :placeholder="defaultPromptPlaceholder"
                rows="14"
                variant="outlined"
              />

              <div class="d-flex align-center ga-2 mt-2">
                <v-btn
                  color="primary"
                  :disabled="!hasChanges || saving"
                  :loading="saving"
                  @click="saveConfig"
                >
                  Save prompt
                </v-btn>
                <v-btn
                  :disabled="!hasChanges || saving"
                  variant="text"
                  @click="resetPrompt"
                >
                  Discard changes
                </v-btn>
                <v-spacer />
                <span v-if="config?.updatedAt" class="text-caption text-medium-emphasis">
                  Last updated: {{ formatDate(config.updatedAt) }}
                  <span v-if="config.updatedBy"> by @{{ config.updatedBy }}</span>
                </span>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Fixed Parameters (read-only) -->
      <div class="text-subtitle-1 font-weight-medium mt-6 mb-3">Fixed Moderation Parameters</div>
      <div class="text-body-2 text-medium-emphasis mb-4">
        These parameters are system-wide and cannot be changed per tenant. They are shown here for reference.
      </div>

      <v-row>
        <!-- ACRCloud -->
        <v-col cols="12" lg="4" md="6">
          <v-card class="fill-height" variant="outlined">
            <v-card-item>
              <template #prepend>
                <v-icon color="info" icon="mdi-music-note-outline" />
              </template>
              <v-card-title class="text-body-1 font-weight-bold">ACRCloud (Audio Copyright)</v-card-title>
              <v-card-subtitle>Music fingerprint matching</v-card-subtitle>
            </v-card-item>
            <v-card-text>
              <v-table density="compact">
                <tbody>
                  <tr>
                    <td class="text-medium-emphasis">Database</td>
                    <td class="font-weight-medium text-right">~100M tracks</td>
                  </tr>
                  <tr>
                    <td class="text-medium-emphasis">Clips per entry</td>
                    <td class="font-weight-medium text-right">3 × 15 seconds</td>
                  </tr>
                  <tr>
                    <td class="text-medium-emphasis">Applies to</td>
                    <td class="font-weight-medium text-right">VIDEO, AUDIO</td>
                  </tr>
                  <tr>
                    <td class="text-medium-emphasis">Action on detect</td>
                    <td class="font-weight-medium text-right">
                      <v-chip color="error" size="x-small" variant="tonal">AUTO REJECT</v-chip>
                    </td>
                  </tr>
                  <tr>
                    <td class="text-medium-emphasis">Cost</td>
                    <td class="font-weight-medium text-right">~$0.005 / query</td>
                  </tr>
                </tbody>
              </v-table>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Gemini Flash -->
        <v-col cols="12" lg="4" md="6">
          <v-card class="fill-height" variant="outlined">
            <v-card-item>
              <template #prepend>
                <v-icon color="primary" icon="mdi-robot-outline" />
              </template>
              <v-card-title class="text-body-1 font-weight-bold">Gemini 2.5 Flash (Business Rules)</v-card-title>
              <v-card-subtitle>Multimodal AI moderation (vision + audio + text)</v-card-subtitle>
            </v-card-item>
            <v-card-text>
              <v-table density="compact">
                <tbody>
                  <tr>
                    <td class="text-medium-emphasis">Model</td>
                    <td class="font-weight-medium text-right">gemini-2.5-flash</td>
                  </tr>
                  <tr>
                    <td class="text-medium-emphasis">Temperature</td>
                    <td class="font-weight-medium text-right">0 (deterministic)</td>
                  </tr>
                  <tr>
                    <td class="text-medium-emphasis">Analyzes</td>
                    <td class="font-weight-medium text-right">Frames + full audio + metadata</td>
                  </tr>
                  <tr>
                    <td class="text-medium-emphasis">Prompt</td>
                    <td class="font-weight-medium text-right">
                      <v-chip color="primary" size="x-small" variant="tonal">EDITABLE ABOVE</v-chip>
                    </td>
                  </tr>
                  <tr>
                    <td class="text-medium-emphasis">Cost</td>
                    <td class="font-weight-medium text-right">~$0.02 / entry</td>
                  </tr>
                </tbody>
              </v-table>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Response Format -->
        <v-col cols="12" lg="4" md="6">
          <v-card class="fill-height" variant="outlined">
            <v-card-item>
              <template #prepend>
                <v-icon color="primary" icon="mdi-code-json" />
              </template>
              <v-card-title class="text-body-1 font-weight-bold">Response Format (fixed)</v-card-title>
              <v-card-subtitle>Auto-appended to every prompt — not editable</v-card-subtitle>
            </v-card-item>
            <v-card-text>
              <v-sheet class="pa-3 text-body-2 font-weight-medium" color="surface-variant" rounded>
                <pre class="ma-0" style="white-space: pre-wrap">{{ responseFormatJson }}</pre>
              </v-sheet>
              <div class="text-caption text-medium-emphasis mt-3">
                The system appends this JSON schema after your business rules prompt.
                Moderation decisions are parsed from this structure.
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Pipeline Order -->
        <v-col cols="12" lg="4" md="6">
          <v-card class="fill-height" variant="outlined">
            <v-card-item>
              <template #prepend>
                <v-icon color="success" icon="mdi-pipe" />
              </template>
              <v-card-title class="text-body-1 font-weight-bold">Pipeline Order</v-card-title>
              <v-card-subtitle>Processing sequence per entry</v-card-subtitle>
            </v-card-item>
            <v-card-text>
              <v-table density="compact">
                <tbody>
                  <tr>
                    <td class="text-medium-emphasis">Step 1</td>
                    <td class="font-weight-medium text-right">ACRCloud (audio copyright)</td>
                  </tr>
                  <tr>
                    <td class="text-medium-emphasis">Step 2</td>
                    <td class="font-weight-medium text-right">Gemini 2.5 Flash (business rules + NSFW + audio scams)</td>
                  </tr>
                  <tr>
                    <td class="text-medium-emphasis">Fail behavior</td>
                    <td class="font-weight-medium text-right">
                      <v-chip color="warning" size="x-small" variant="tonal">STOP ON REJECT</v-chip>
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Re-moderation -->
        <v-col cols="12" lg="4" md="6">
          <v-card class="fill-height" variant="outlined">
            <v-card-item>
              <template #prepend>
                <v-icon color="secondary" icon="mdi-refresh" />
              </template>
              <v-card-title class="text-body-1 font-weight-bold">Re-moderation Triggers</v-card-title>
              <v-card-subtitle>Content re-enters moderation when</v-card-subtitle>
            </v-card-item>
            <v-card-text>
              <v-table density="compact">
                <tbody>
                  <tr>
                    <td class="text-medium-emphasis">Title changed</td>
                    <td class="font-weight-medium text-right">
                      <v-icon color="success" icon="mdi-check" size="small" />
                    </td>
                  </tr>
                  <tr>
                    <td class="text-medium-emphasis">Description changed</td>
                    <td class="font-weight-medium text-right">
                      <v-icon color="success" icon="mdi-check" size="small" />
                    </td>
                  </tr>
                  <tr>
                    <td class="text-medium-emphasis">Thumbnail replaced</td>
                    <td class="font-weight-medium text-right">
                      <v-icon color="success" icon="mdi-check" size="small" />
                    </td>
                  </tr>
                  <tr>
                    <td class="text-medium-emphasis">Tags changed</td>
                    <td class="font-weight-medium text-right">
                      <v-icon color="success" icon="mdi-check" size="small" />
                    </td>
                  </tr>
                  <tr>
                    <td class="text-medium-emphasis">Price / visibility</td>
                    <td class="font-weight-medium text-right">
                      <v-icon icon="mdi-close" size="small" />
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="3000">
      {{ snackbarText }}
    </v-snackbar>
  </v-container>
</template>

<script lang="ts" setup>
  import { computed, onMounted, ref, watch } from 'vue'
  import { fetchTenantIds } from '@/api/moderation'
  import {
    fetchModerationConfig,
    type ModerationConfig,
    updateModerationConfig,
  } from '@/api/moderationConfig'
  import { useTenantLabels } from '@/composables/useTenantLabels'
  import { allUserTenants, useAuthStore } from '@/stores/auth'

  const authStore = useAuthStore()
  const isSuperadmin = computed(() => authStore.user?.role === 'SUPERADMIN')
  const { labelFor: tenantLabel } = useTenantLabels()

  // Tenants the caller may legitimately configure. For a tenant owner that's
  // strictly the tenants they own — moderators don't reach this page (sidebar
  // gate) and even if they did, the backend would 403. The dropdown is
  // restricted on the client too so users can't probe other tenant ids.
  function ownedTenantIds (): string[] {
    return authStore.user?.tenantAdminOf ?? []
  }

  // Backend distinct-tenants list, only loaded for SUPERADMIN.
  const allTenantIds = ref<string[]>([])

  function defaultTenant (): string {
    if (authStore.activeTenantId) return authStore.activeTenantId
    if (isSuperadmin.value) return 'earnlumens'
    return ownedTenantIds()[0] ?? allUserTenants(authStore.user)[0] ?? 'earnlumens'
  }

  const selectedTenant = ref(defaultTenant())
  const loading = ref(true)
  const saving = ref(false)
  const config = ref<ModerationConfig | null>(null)
  const promptText = ref('')
  const savedPromptText = ref('')

  const snackbar = ref(false)
  const snackbarText = ref('')
  const snackbarColor = ref('success')

  const hasChanges = computed(() => promptText.value !== savedPromptText.value)

  // Tenants offered in the dropdown. SUPERADMIN sees every tenant present in
  // the entries collection plus the root; everyone else sees only the tenants
  // they own (defence-in-depth: the backend re-checks on every call).
  const tenantOptions = computed(() => {
    if (!isSuperadmin.value) {
      return ownedTenantIds().map(t => ({ title: tenantLabel(t), value: t }))
    }
    const opts: Array<{ title: string, value: string }> = []
    if (!allTenantIds.value.includes('earnlumens')) {
      opts.push({ title: 'earnlumens (root)', value: 'earnlumens' })
    }
    for (const t of allTenantIds.value) {
      opts.push({ title: tenantLabel(t), value: t })
    }
    return opts
  })

  const responseFormatJson = `Analyze the submitted content and respond in JSON:
{
  "decision": "APPROVE | REJECT | MANUAL_QUEUE",
  "confidence": 0.0-1.0,
  "categories_detected": ["string"],
  "reason": "string"
}`

  const defaultPromptPlaceholder = `You are the content moderator for EarnLumens, an educational finance platform focused on the Stellar ecosystem.

GUIDING PRINCIPLE: lean toward APPROVE. Reject what is harmful or fraudulent, not what is merely unconventional, opinionated, or outside Stellar. Creators are free to discuss general personal finance, other blockchains, and to express opinions clearly labelled as such.

ALWAYS REJECT:
- Ponzi / pyramid / pump & dump / rug pulls / guaranteed-return promises
- Paid trading signals, personalized buy/sell calls with specific amounts, personalized financial advice
- Phishing, fake airdrops, requests for private keys / seed phrases / credentials
- Impersonation of public figures, projects, EarnLumens or the Stellar Development Foundation
- Hate speech, harassment, discrimination, incitement to violence
- Explicit sexual content, graphic violence, content involving minors
- Clearly copyrighted material reuploaded without authorization
- Personal data of third parties without consent

MANUAL_QUEUE (do not auto-reject):
- Mentions of specific tokens / cryptocurrencies without clear educational context
- Promotion of own products / services that may need a "sponsored" label
- Past-performance claims without a verifiable source
- Very short or borderline-low-quality submissions where intent is unclear

APPROVE:
- Stellar / Soroban / SCP / SDK / anchors / DEX education
- General personal finance (saving, budgeting, debt, responsible investing, taxes)
- Tutorials, code demos, wallet/dApp walkthroughs
- Honest comparisons between networks, wallets or protocols (including non-Stellar ones)
- Opinions and analysis clearly identified as personal opinion

Notes:
- Wallets, DEXs and tools that appear in https://stellar.org/ecosystem are a strong trust signal — but mentioning unlisted ones is allowed unless they are promoting fraud.
- Disclosure of positions, "not financial advice" disclaimers, and source citations are recommended but NOT required for approval.`

  function formatDate (iso: string): string {
    return new Date(iso).toLocaleString()
  }

  async function loadTenants () {
    // Only superadmin needs the cross-tenant list; tenant owners use their
    // JWT-derived tenantAdminOf set, which never goes to the network.
    if (!isSuperadmin.value) return
    try {
      allTenantIds.value = await fetchTenantIds()
    } catch {
      allTenantIds.value = ['earnlumens']
    }
  }

  async function loadConfig () {
    loading.value = true
    try {
      config.value = await fetchModerationConfig(selectedTenant.value)
      promptText.value = config.value.businessRulesPrompt || ''
      savedPromptText.value = promptText.value
    } catch {
      showSnackbar('Failed to load moderation config', 'error')
    } finally {
      loading.value = false
    }
  }

  async function saveConfig () {
    saving.value = true
    try {
      config.value = await updateModerationConfig(selectedTenant.value, promptText.value)
      savedPromptText.value = promptText.value
      showSnackbar('Moderation prompt saved', 'success')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save'
      showSnackbar(message, 'error')
    } finally {
      saving.value = false
    }
  }

  function resetPrompt () {
    promptText.value = savedPromptText.value
  }

  function showSnackbar (text: string, color: string) {
    snackbarText.value = text
    snackbarColor.value = color
    snackbar.value = true
  }

  // Mirror the global tenant context (top-right TenantSwitcher) into the
  // in-page filter so the moderation rules screen always reflects the tenant
  // currently selected globally.
  watch(() => authStore.activeTenantId, newId => {
    if (!newId || newId === selectedTenant.value) return
    selectedTenant.value = newId
    loadConfig()
  })

  onMounted(async () => {
    await loadTenants()
    await loadConfig()
  })
</script>
