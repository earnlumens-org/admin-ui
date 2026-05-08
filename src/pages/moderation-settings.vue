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
      <!--
        Baseline-coverage helper: makes it explicit which categories
        the platform already enforces for every tenant, regardless of
        their custom prompt. Reduces duplicated rules in the textarea
        below and points tenant admins at what they SHOULD focus on.
      -->
      <v-row class="mb-2">
        <v-col cols="12">
          <v-expansion-panels variant="accordion">
            <v-expansion-panel>
              <v-expansion-panel-title>
                <v-icon class="mr-3" color="info" icon="mdi-shield-check-outline" />
                <span class="font-weight-medium">What EarnLumens already moderates by default</span>
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <p class="text-body-2 mb-3">
                  EarnLumens applies a mandatory baseline moderation layer to every entry
                  published in any tenant — you do <strong>not</strong> need to write rules
                  for these. They are enforced before and on top of your business-rules
                  prompt below.
                </p>
                <ul class="text-body-2 mb-3 ps-4">
                  <li><strong>Music copyright</strong> — automatic detection against the global ACRCloud catalog.</li>
                  <li><strong>NSFW / pornography / explicit nudity / child sexual abuse material.</strong></li>
                  <li><strong>Graphic violence, gore, extreme hate.</strong></li>
                  <li><strong>Self-harm &amp; suicide</strong> — glorification, instructions, methods, pro-anorexia / pro-bulimia content. Educational and recovery-oriented framing is allowed.</li>
                  <li><strong>Phishing &amp; wallet drainers</strong> — seed-phrase requests, fake airdrops, look-alike domains of Freighter / xBull / LOBSTR / SDF / exchanges, malicious "connect-your-wallet" flows.</li>
                  <li><strong>Impersonation &amp; deepfakes</strong> — synthesized media of public figures (Musk, McCaleb, SDF, exchange CEOs) endorsing tokens, misuse of official Stellar / EarnLumens branding.</li>
                  <li><strong>Low-quality spam</strong> — gibberish titles, auto-generated or empty content, blank video.</li>
                  <li><strong>Financial scams</strong> — pump-and-dump, Ponzi, guaranteed-return promises, get-rich-quick schemes.</li>
                  <li><strong>Hate speech</strong> — slurs, calls for violence against groups.</li>
                  <li><strong>Personal information leaks</strong> — phone numbers, emails, private keys.</li>
                  <li><strong>Multimodal analysis</strong> — audio, images, PDFs and rich text are reviewed with the same rigor as the title and description.</li>
                </ul>
                <p class="text-body-2 mb-0">
                  Your <strong>Business Rules</strong> prompt below should focus
                  <em>only</em> on what is specific to your business model: which topics you
                  allow, the tone and format you expect, the kind of offer that fits your
                  vertical. Don't repeat the general rules above — they are already covered,
                  and duplicating them can create conflicts in the model's decision.
                </p>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-col>
      </v-row>

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
              <v-alert
                border="start"
                class="mb-3"
                density="compact"
                type="warning"
                variant="tonal"
              >
                <strong>The text shown when the field is empty is just an example</strong>
                for a fictional <em>“AI for Work”</em> tenant. Do <strong>not</strong>
                save it verbatim — it does not match your business and the platform
                already enforces every baseline rule listed above. Replace it with
                rules that describe <strong>what is specific to your tenant</strong>
                (allowed topics, tone, formats, edge cases). Saving an empty prompt
                is fine: the baseline moderation still applies.
              </v-alert>
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
                  :disabled="!promptHasChanges || saving"
                  :loading="saving"
                  @click="saveConfig"
                >
                  Save prompt
                </v-btn>
                <v-btn
                  :disabled="!promptHasChanges || saving"
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

      <!-- Editable: Tenant Publishing Notes (public-facing) -->
      <v-row class="mb-2">
        <v-col cols="12">
          <v-card>
            <v-card-item>
              <template #prepend>
                <v-icon color="secondary" icon="mdi-note-text-outline" />
              </template>
              <v-card-title class="d-flex align-center ga-2 flex-wrap">
                <span>Tenant Publishing Notes</span>
                <v-chip color="info" label size="x-small" variant="tonal">Public</v-chip>
                <v-chip color="warning" label size="x-small" variant="tonal">English only</v-chip>
              </v-card-title>
              <v-card-subtitle style="white-space: normal">
                Shown verbatim to all visitors on the storefront's
                <a
                  :href="tenantPreviewUrl"
                  rel="noopener noreferrer"
                  target="_blank"
                  class="text-primary"
                  style="text-decoration: underline"
                >/guidelines#tenant-specific-rules<v-icon
                  class="ml-1"
                  icon="mdi-open-in-new"
                  size="x-small"
                /></a>
                page, under "Tenant-specific rules".
                Use it to describe what is specific to <strong>your</strong>
                marketplace: which topics you focus on, expected tone, formats
                you accept. Do <strong>not</strong> repeat the platform-wide
                rules above &mdash; they are already shown.
                <br>
                <span class="text-warning">Must be written in English.</span>
                We don't auto-translate this text; it is displayed identically
                to every visitor regardless of their selected language.
              </v-card-subtitle>
            </v-card-item>

            <v-card-text>
              <v-textarea
                v-model="notesText"
                auto-grow
                counter="5000"
                :maxlength="5000"
                placeholder="EXAMPLE — DO NOT SAVE VERBATIM. Replace with notes that match YOUR tenant. The text below is written for a fictional &quot;AI for Work&quot; tenant.&#10;&#10;This marketplace is for practical, hands-on AI usage at work. We publish actionable prompts, workflows, templates and tutorials that knowledge workers, freelancers and small-business operators can apply the same day.&#10;&#10;- Posts must include at least one concrete artefact: a runnable prompt, a template, a screenshot of a real workflow, or a step-by-step procedure.&#10;- Sponsored content is allowed but must be tagged in the title with [sponsored] and disclose the tool you are paid to promote.&#10;- Generic AI hype, hobbyist art generation and personal-life prompts belong on other tenants — they are off-topic here.&#10;- AI-generated images, voices or videos of real people require explicit consent and a visible &quot;AI-generated&quot; label."
                rows="8"
                variant="outlined"
              />

              <p class="text-caption text-medium-emphasis mt-1 mb-3">
                Leave empty to hide the tenant-specific section on the public
                guidelines page.
              </p>

              <div class="d-flex align-center ga-2">
                <v-btn
                  color="primary"
                  :disabled="!notesHasChanges || saving"
                  :loading="saving"
                  @click="saveNotes"
                >
                  Save notes
                </v-btn>
                <v-btn
                  :disabled="!notesHasChanges || saving"
                  variant="text"
                  @click="resetNotes"
                >
                  Discard changes
                </v-btn>
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
  // Tenant-facing public publishing notes (English only). Independent from
  // the Gemini business rules prompt above; this string is shown verbatim on
  // the storefront's /guidelines page.
  const notesText = ref('')
  const savedNotesText = ref('')

  const snackbar = ref(false)
  const snackbarText = ref('')
  const snackbarColor = ref('success')

  const hasChanges = computed(() =>
    promptText.value !== savedPromptText.value
    || notesText.value !== savedNotesText.value
  )
  const promptHasChanges = computed(() => promptText.value !== savedPromptText.value)
  const notesHasChanges = computed(() => notesText.value !== savedNotesText.value)

  // Public URL where these notes are rendered. We anchor on
  // #tenant-specific-rules (defined in media-store-ui/src/pages/Guidelines.vue)
  // so the owner lands directly on the section instead of having to scroll
  // past the platform-wide rules. The base host is derived from the admin
  // hostname:
  //   admin.earnlumens.org      → *.earnlumens.org      (root tenant: earnlumens.org)
  //   admin-dev.earnlumens.org  → *.app-dev.earnlumens.org
  //   localhost                 → *.earnlumens.org      (local fallback to prod)
  const tenantPreviewUrl = computed(() => {
    const adminHost = typeof window === 'undefined' ? '' : window.location.hostname
    const isDev = adminHost.includes('admin-dev')
    const tenantBase = isDev ? 'app-dev.earnlumens.org' : 'earnlumens.org'
    const sub = selectedTenant.value
    // Root tenant lives at the apex (no subdomain prefix); every other tenant
    // lives at {sub}.{tenantBase}.
    const host = sub === 'earnlumens' ? tenantBase : `${sub}.${tenantBase}`
    return `https://${host}/guidelines#tenant-specific-rules`
  })

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

  const defaultPromptPlaceholder = `EXAMPLE — DO NOT SAVE VERBATIM. Replace with rules that match YOUR tenant.
This sample is written for a fictional tenant called “AI for Work” — a marketplace focused on practical, ethical AI usage for professional work, productivity and business operations. Use it as a template for the structure (Approve / Reject / Manual review), not as actual content.

TENANT FOCUS
This tenant publishes content that teaches people how to use AI to do their job better. Audience: knowledge workers, freelancers, small-business operators, professional educators. Out of scope: personal-life prompts, generic AI hype, hobbyist art generation.

APPROVE when the content delivers concrete, hands-on guidance for legitimate professional use of AI in any of:
- writing, editing, summarising work documents
- spreadsheets, data cleaning and lightweight analysis
- customer support workflows and templated replies
- marketing operations: SEO, ad copy, content calendars
- coding assistance, code review, refactoring, test generation
- business automation: Zapier / Make / Power Automate / n8n flows
- project management, meeting notes, status reports
- prompt engineering and prompt libraries for professional tasks
- no-code / low-code AI tools used inside companies
- professional education: courses, tutorials, walkthroughs, templates with clear takeaways

Reward content that includes runnable prompts, before/after examples, screenshots of real workflows, repeatable steps, or reusable templates.

REJECT when the content teaches, promotes, packages or sells techniques to:
- phishing, scams, impersonation or social engineering of any kind
- fabricating job applications, résumés, references, credentials or professional identities
- spam at scale, mass cold-outreach abuse, bot-driven engagement, fake-account farming
- bypassing platform rules, rate limits, captchas, paywalls, watermarks or moderation systems
- malware, unauthorised access, credential theft, data exfiltration, prompt-injection exploits aimed at production systems
- scraping or harvesting private, personal or copyrighted data without consent
- generating fake reviews, fake testimonials, fake engagement metrics or deceptive marketing collateral
- replacing professional judgment in legal, medical, financial or tax matters without explicit educational framing AND a clear “not professional advice” disclaimer
- impersonating a real person, employee, client, executive or company representative (including AI voice/face cloning of real people without explicit consent)

SEND TO MANUAL REVIEW when the content sits in a grey zone, including:
- automation that could be repurposed for spam or manipulation but is presented as legitimate (e.g. “mass-personalised” outreach, lead-scraping pipelines, auto-DM flows)
- workflows that touch client data, employee data, internal documents or other confidential business information without an explicit privacy / handling note
- sales, recruiting or marketing tactics that flirt with deception (urgency hacks, fake scarcity, opaque AI-generated personas)
- AI-generated images, voices or videos of real people, even when framed as “demo”
- generic, template-only “AI filler” posts where the educational value or originality is unclear

QUALITY BAR
The ideal entry is actionable, specific, ethical and immediately useful to a working professional. Prefer concrete examples over abstract claims; prefer disclosed limitations over guaranteed outcomes; prefer transparent prompt/tool usage over hidden tricks.`

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
      notesText.value = config.value.tenantPublishingNotes || ''
      savedNotesText.value = notesText.value
    } catch {
      showSnackbar('Failed to load moderation config', 'error')
    } finally {
      loading.value = false
    }
  }

  async function saveConfig () {
    saving.value = true
    try {
      config.value = await updateModerationConfig(
        selectedTenant.value,
        promptText.value,
        notesText.value,
      )
      savedPromptText.value = promptText.value
      savedNotesText.value = notesText.value
      showSnackbar('Moderation prompt saved', 'success')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save'
      showSnackbar(message, 'error')
    } finally {
      saving.value = false
    }
  }

  // Saves only the public publishing notes. We resend the saved prompt
  // unchanged because the backend requires businessRulesPrompt on every
  // PUT (validated as @NotBlank); passing the same value is a server-side
  // no-op for the prompt field.
  async function saveNotes () {
    saving.value = true
    try {
      config.value = await updateModerationConfig(
        selectedTenant.value,
        savedPromptText.value,
        notesText.value,
      )
      savedNotesText.value = notesText.value
      showSnackbar('Tenant publishing notes saved', 'success')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save'
      showSnackbar(message, 'error')
    } finally {
      saving.value = false
    }
  }

  function resetNotes () {
    notesText.value = savedNotesText.value
  }

  function resetPrompt () {
    promptText.value = savedPromptText.value
    notesText.value = savedNotesText.value
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
