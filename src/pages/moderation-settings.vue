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
        :items="tenants"
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
        <!-- NudeNet -->
        <v-col cols="12" lg="4" md="6">
          <v-card class="fill-height" variant="outlined">
            <v-card-item>
              <template #prepend>
                <v-icon color="error" icon="mdi-shield-alert-outline" />
              </template>
              <v-card-title class="text-body-1 font-weight-bold">NudeNet (NSFW Detection)</v-card-title>
              <v-card-subtitle>Visual nudity classifier — first layer</v-card-subtitle>
            </v-card-item>
            <v-card-text>
              <v-table density="compact">
                <tbody>
                  <tr>
                    <td class="text-medium-emphasis">Rejection threshold</td>
                    <td class="font-weight-medium text-right">0.80</td>
                  </tr>
                  <tr>
                    <td class="text-medium-emphasis">Applies to</td>
                    <td class="font-weight-medium text-right">VIDEO, IMAGE, THUMBNAIL</td>
                  </tr>
                  <tr>
                    <td class="text-medium-emphasis">Frame sampling</td>
                    <td class="font-weight-medium text-right">~10 frames per video</td>
                  </tr>
                  <tr>
                    <td class="text-medium-emphasis">Action on detect</td>
                    <td class="font-weight-medium text-right">
                      <v-chip color="error" size="x-small" variant="tonal">AUTO REJECT</v-chip>
                    </td>
                  </tr>
                  <tr>
                    <td class="text-medium-emphasis">Cost</td>
                    <td class="font-weight-medium text-right">$0 (self-hosted)</td>
                  </tr>
                </tbody>
              </v-table>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Fingerprint -->
        <v-col cols="12" lg="4" md="6">
          <v-card class="fill-height" variant="outlined">
            <v-card-item>
              <template #prepend>
                <v-icon color="warning" icon="mdi-fingerprint" />
              </template>
              <v-card-title class="text-body-1 font-weight-bold">Content Fingerprinting</v-card-title>
              <v-card-subtitle>Duplicate detection within platform</v-card-subtitle>
            </v-card-item>
            <v-card-text>
              <v-table density="compact">
                <tbody>
                  <tr>
                    <td class="text-medium-emphasis">Algorithm</td>
                    <td class="font-weight-medium text-right">Perceptual Hash (pHash)</td>
                  </tr>
                  <tr>
                    <td class="text-medium-emphasis">Similarity threshold</td>
                    <td class="font-weight-medium text-right">90%</td>
                  </tr>
                  <tr>
                    <td class="text-medium-emphasis">Applies to</td>
                    <td class="font-weight-medium text-right">ALL entry types</td>
                  </tr>
                  <tr>
                    <td class="text-medium-emphasis">Action on detect</td>
                    <td class="font-weight-medium text-right">
                      <v-chip color="error" size="x-small" variant="tonal">AUTO REJECT</v-chip>
                    </td>
                  </tr>
                  <tr>
                    <td class="text-medium-emphasis">Cost</td>
                    <td class="font-weight-medium text-right">$0 (self-hosted)</td>
                  </tr>
                </tbody>
              </v-table>
            </v-card-text>
          </v-card>
        </v-col>

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
              <v-card-title class="text-body-1 font-weight-bold">Gemini 1.5 Flash (Business Rules)</v-card-title>
              <v-card-subtitle>Context-aware AI moderation</v-card-subtitle>
            </v-card-item>
            <v-card-text>
              <v-table density="compact">
                <tbody>
                  <tr>
                    <td class="text-medium-emphasis">Model</td>
                    <td class="font-weight-medium text-right">gemini-1.5-flash</td>
                  </tr>
                  <tr>
                    <td class="text-medium-emphasis">Temperature</td>
                    <td class="font-weight-medium text-right">0 (deterministic)</td>
                  </tr>
                  <tr>
                    <td class="text-medium-emphasis">Analyzes</td>
                    <td class="font-weight-medium text-right">Frames + metadata + text</td>
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
                    <td class="font-weight-medium text-right">Fingerprint (duplicate check)</td>
                  </tr>
                  <tr>
                    <td class="text-medium-emphasis">Step 2</td>
                    <td class="font-weight-medium text-right">NudeNet (NSFW visual)</td>
                  </tr>
                  <tr>
                    <td class="text-medium-emphasis">Step 3</td>
                    <td class="font-weight-medium text-right">ACRCloud (audio copyright)</td>
                  </tr>
                  <tr>
                    <td class="text-medium-emphasis">Step 4</td>
                    <td class="font-weight-medium text-right">Gemini Flash (business rules)</td>
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
  import { computed, onMounted, ref } from 'vue'
  import { fetchTenantIds } from '@/api/moderation'
  import {
    fetchModerationConfig,
    type ModerationConfig,
    updateModerationConfig,
  } from '@/api/moderationConfig'

  const tenants = ref<string[]>([])
  const selectedTenant = ref('earnlumens')
  const loading = ref(true)
  const saving = ref(false)
  const config = ref<ModerationConfig | null>(null)
  const promptText = ref('')
  const savedPromptText = ref('')

  const snackbar = ref(false)
  const snackbarText = ref('')
  const snackbarColor = ref('success')

  const hasChanges = computed(() => promptText.value !== savedPromptText.value)

  const responseFormatJson = `Analyze the submitted content and respond in JSON:
{
  "decision": "APPROVE | REJECT | MANUAL_QUEUE",
  "confidence": 0.0-1.0,
  "categories_detected": ["string"],
  "reason": "string"
}`

  const defaultPromptPlaceholder = `You are the content moderator for an educational finance platform.

RULES:
1. REJECT: Explicit scams, Ponzi schemes, guaranteed profit promises
2. REJECT: Impersonation of public figures for financial advice
3. REJECT: Links to Telegram/WhatsApp groups for "trading signals"
4. MANUAL_QUEUE: Mentions of specific cryptocurrencies without educational context
5. APPROVE: Legitimate financial education content`

  function formatDate (iso: string): string {
    return new Date(iso).toLocaleString()
  }

  async function loadTenants () {
    try {
      tenants.value = await fetchTenantIds()
      if (tenants.value.length > 0 && !tenants.value.includes(selectedTenant.value)) {
        selectedTenant.value = tenants.value[0]
      }
    } catch {
      tenants.value = ['earnlumens']
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

  onMounted(async () => {
    await loadTenants()
    await loadConfig()
  })
</script>
