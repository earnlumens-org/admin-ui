<template>
  <v-container fluid>
    <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-4">
      <div>
        <h1 class="text-h5 font-weight-bold">Edits &amp; takedowns</h1>

        <div class="text-body-2 text-medium-emphasis">
          Staged edits of published content awaiting a human decision, and the moderation cases with the disputes they opened.
        </div>
      </div>

      <v-select
        v-if="isSuperadmin && tenantIds.length > 1"
        v-model="selectedTenant"
        density="compact"
        hide-details
        :items="tenantIds"
        label="Tenant"
        style="max-width: 240px"
        variant="outlined"
      />
    </div>

    <v-tabs v-model="tab" class="mb-4" color="primary">
      <v-tab value="edits">
        Pending edits
        <v-chip v-if="pendingTotal > 0" class="ml-2" color="warning" size="x-small">{{ pendingTotal }}</v-chip>
      </v-tab>

      <v-tab value="cases">Cases &amp; disputes</v-tab>
    </v-tabs>

    <!-- ───────── Pending edits (N9) ───────── -->
    <v-window v-model="tab">
      <v-window-item value="edits">
        <v-alert class="mb-4" density="compact" type="info" variant="tonal">
          Approving projects the edit onto the published entry. Rejecting discards it — nothing visible changes,
          the entry stays published and no dispute is opened. Buyers are never affected by a rejected edit.
        </v-alert>

        <v-progress-linear v-if="loadingEdits" indeterminate />

        <v-card v-else-if="pendingEdits.length === 0" class="pa-8 text-center text-medium-emphasis" variant="tonal">
          No pending edits.
        </v-card>

        <v-card v-for="entry in pendingEdits" :key="entry.id" class="mb-3" variant="outlined">
          <v-card-text class="d-flex flex-wrap ga-4">
            <v-img
              class="rounded flex-shrink-0"
              cover
              height="72"
              :src="thumbUrl(entry)"
              width="128"
            />

            <div class="flex-grow-1" style="min-width: 240px">
              <div class="d-flex align-center ga-2 flex-wrap">
                <span class="font-weight-medium">{{ entry.title }}</span>
                <v-chip color="success" size="x-small" variant="tonal">{{ entry.status }}</v-chip>

                <v-chip v-for="part in entry.pendingVersion?.changeSummary || []" :key="part" color="warning" size="x-small">
                  {{ part }}
                </v-chip>
              </div>

              <div class="text-caption text-medium-emphasis">
                by {{ entry.authorUsername || entry.userId }} · submitted {{ formatDate(entry.pendingVersion?.submittedAt) }}
              </div>

              <v-table class="mt-2 edit-diff" density="compact">
                <tbody>
                  <tr v-if="entry.pendingVersion?.title != null">
                    <td class="text-medium-emphasis">Title</td>
                    <td><s class="text-medium-emphasis">{{ entry.title }}</s> → <strong>{{ entry.pendingVersion?.title }}</strong></td>
                  </tr>

                  <tr v-if="entry.pendingVersion?.description != null">
                    <td class="text-medium-emphasis">Description</td>
                    <td>{{ entry.pendingVersion?.description }}</td>
                  </tr>

                  <tr v-if="entry.pendingVersion?.thumbnailR2Key">
                    <td class="text-medium-emphasis">Thumbnail</td>

                    <td>
                      <v-img
                        class="rounded d-inline-block"
                        cover
                        height="48"
                        :src="cdn(entry.pendingVersion?.thumbnailR2Key)"
                        width="86"
                      />
                    </td>
                  </tr>

                  <tr v-if="entry.pendingVersion?.previewR2Key">
                    <td class="text-medium-emphasis">Preview</td>

                    <td>
                      <v-img
                        class="rounded d-inline-block"
                        cover
                        height="48"
                        :src="cdn(entry.pendingVersion?.previewR2Key)"
                        width="86"
                      />
                    </td>
                  </tr>

                  <tr v-if="entry.pendingVersion?.resourceContent != null">
                    <td class="text-medium-emphasis">Text</td>
                    <td class="text-truncate" style="max-width: 520px">{{ entry.pendingVersion?.resourceContent }}</td>
                  </tr>

                  <tr v-if="entry.pendingVersion?.creatorNote">
                    <td class="text-medium-emphasis">Creator note</td>
                    <td>{{ entry.pendingVersion?.creatorNote }}</td>
                  </tr>
                </tbody>
              </v-table>
            </div>

            <div class="d-flex flex-column ga-2">
              <v-btn
                color="success"
                :loading="busy === entry.id"
                prepend-icon="mdi-check"
                size="small"
                variant="flat"
                @click="approveEdit(entry)"
              >
                Approve edit
              </v-btn>

              <v-btn
                color="error"
                prepend-icon="mdi-close"
                size="small"
                variant="outlined"
                @click="openRejectEdit(entry)"
              >
                Reject edit
              </v-btn>
            </div>
          </v-card-text>
        </v-card>

        <div v-if="pendingPages > 1" class="d-flex justify-center mt-2">
          <v-pagination v-model="pendingPage" density="compact" :length="pendingPages" @update:model-value="loadPendingEdits" />
        </div>
      </v-window-item>

      <!-- ───────── Cases & disputes (D-15 / D-09) ───────── -->
      <v-window-item value="cases">
        <v-alert class="mb-4" density="compact" type="info" variant="tonal">
          Each case is one blocking action. Disputes are opened automatically, one per affected purchase; they are
          resolved only here, by you. <strong>Refunds are never automatic</strong> and are not issued from this screen.
        </v-alert>

        <v-progress-linear v-if="loadingCases" indeterminate />

        <v-card v-else-if="cases.length === 0" class="pa-8 text-center text-medium-emphasis" variant="tonal">
          No moderation cases.
        </v-card>

        <v-expansion-panels v-else variant="accordion">
          <v-expansion-panel v-for="c in cases" :key="c.id" @group:selected="(e: any) => e.value && loadDisputes(c)">
            <v-expansion-panel-title>
              <div class="d-flex align-center ga-2 flex-wrap">
                <v-chip :color="c.kind === 'TAKEDOWN' ? 'error' : 'warning'" size="x-small">{{ c.kind }}</v-chip>
                <v-chip v-if="c.resolvedAt" color="success" size="x-small" variant="tonal">{{ c.resolution }}</v-chip>
                <span class="font-weight-medium">{{ c.reason }}</span>

                <span class="text-caption text-medium-emphasis">
                  · {{ c.entryIds.length }} entr{{ c.entryIds.length === 1 ? 'y' : 'ies' }}
                  <template v-if="c.collectionIds.length > 0"> · {{ c.collectionIds.length }} collection(s)</template>
                  · by {{ c.actor }} · {{ formatDate(c.createdAt) }}
                </span>
              </div>
            </v-expansion-panel-title>

            <v-expansion-panel-text>
              <div class="text-caption text-medium-emphasis mb-2">
                Case <code>{{ c.id }}</code>
                <template v-if="c.entryIds.length > 0"> · entries: <code>{{ c.entryIds.join(', ') }}</code></template>
                <template v-if="c.collectionIds.length > 0"> · collections: <code>{{ c.collectionIds.join(', ') }}</code></template>
              </div>

              <v-progress-linear v-if="loadingDisputes === c.id" indeterminate />

              <template v-else>
                <div v-if="(disputesByCase[c.id] || []).length === 0" class="text-body-2 text-medium-emphasis">
                  No buyers were affected by this case.
                </div>

                <v-table v-else density="compact">
                  <thead>
                    <tr>
                      <th>Buyer</th>
                      <th>Purchase</th>
                      <th>Affected entries</th>
                      <th>Status</th>
                      <th class="text-right">Resolve</th>
                    </tr>
                  </thead>

                  <tbody>
                    <tr v-for="d in disputesByCase[c.id]" :key="d.id">
                      <td><code>{{ d.userId }}</code></td>

                      <td class="text-caption">
                        <span v-if="d.collectionId">collection <code>{{ d.collectionId }}</code></span>
                        <span v-else>entry</span>
                        · order <code>{{ d.orderId || '—' }}</code>
                      </td>

                      <td class="text-caption"><code>{{ d.affectedEntryIds.join(', ') }}</code></td>

                      <td>
                        <v-chip :color="disputeColor(d.status)" size="x-small">{{ d.status }}</v-chip>
                        <span v-if="d.resolvedBy" class="text-caption text-medium-emphasis ml-1">by {{ d.resolvedBy }}</span>
                      </td>

                      <td class="text-right">
                        <template v-if="d.status === 'OPEN'">
                          <v-btn color="success" size="x-small" variant="text" @click="resolveOne(c, d, 'RESOLVED')">Resolved</v-btn>
                          <v-btn color="grey" size="x-small" variant="text" @click="resolveOne(c, d, 'DISMISSED')">Dismiss</v-btn>
                        </template>
                      </td>
                    </tr>
                  </tbody>
                </v-table>

                <div v-if="(disputesByCase[c.id] || []).some(d => d.status === 'OPEN')" class="d-flex ga-2 mt-3">
                  <v-btn
                    color="success"
                    prepend-icon="mdi-check-all"
                    size="small"
                    variant="tonal"
                    @click="resolveAll(c, 'RESOLVED')"
                  >
                    Mark all as resolved
                  </v-btn>

                  <v-btn
                    color="grey"
                    prepend-icon="mdi-close-circle-multiple-outline"
                    size="small"
                    variant="tonal"
                    @click="resolveAll(c, 'DISMISSED')"
                  >
                    Dismiss all
                  </v-btn>
                </div>
              </template>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-window-item>
    </v-window>

    <!-- Reject edit dialog -->
    <v-dialog v-model="rejectDialog" max-width="440">
      <v-card>
        <v-card-title class="text-h6">Reject edit</v-card-title>

        <v-card-text>
          <div class="text-body-2 text-medium-emphasis mb-3">
            The pending edit of "{{ rejectTarget?.title }}" will be discarded. The published content stays exactly as it
            is and the creator will see this justification.
          </div>

          <v-textarea
            v-model="justification"
            counter
            label="Justification"
            rows="3"
            variant="outlined"
          />
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="rejectDialog = false">Cancel</v-btn>

          <v-btn
            color="error"
            :disabled="!justification.trim()"
            :loading="busy === rejectTarget?.id"
            variant="flat"
            @click="rejectEdit"
          >
            Reject edit
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="4000">{{ snackbarText }}</v-snackbar>
  </v-container>
</template>

<script lang="ts" setup>
  import { computed, onMounted, ref, watch } from 'vue'
  import {
    approvePendingVersion,
    type DisputeDto,
    type EntryDto,
    fetchCaseDisputes,
    fetchModerationCases,
    fetchPendingEdits,
    fetchTenantIds,
    type ModerationCaseDto,
    rejectPendingVersion,
    resolveCase,
    resolveDispute,
  } from '@/api/moderation'
  import { CDN_BASE_URL } from '@/config/env'
  import { allUserTenants, useAuthStore } from '@/stores/auth'

  const authStore = useAuthStore()
  const isSuperadmin = computed(() => authStore.user?.role === 'SUPERADMIN')
  const hasModerationAccess = computed(() =>
    isSuperadmin.value
    || (authStore.user?.tenantAdminOf?.length ?? 0) > 0
    || (authStore.user?.moderatorOf?.length ?? 0) > 0)

  function defaultTenant (): string {
    if (authStore.activeTenantId) return authStore.activeTenantId
    if (isSuperadmin.value) return 'earnlumens'
    return allUserTenants(authStore.user)[0] ?? ''
  }

  const selectedTenant = ref(defaultTenant())
  const tenantIds = ref<string[]>([])
  const tab = ref<'edits' | 'cases'>('edits')

  const loadingEdits = ref(false)
  const pendingEdits = ref<EntryDto[]>([])
  const pendingPage = ref(1)
  const pendingPages = ref(1)
  const pendingTotal = ref(0)

  const loadingCases = ref(false)
  const cases = ref<ModerationCaseDto[]>([])
  const disputesByCase = ref<Record<string, DisputeDto[]>>({})
  const loadingDisputes = ref<string | null>(null)

  const busy = ref<string | null>(null)
  const rejectDialog = ref(false)
  const rejectTarget = ref<EntryDto | null>(null)
  const justification = ref('')

  const snackbar = ref(false)
  const snackbarText = ref('')
  const snackbarColor = ref('success')
  function notify (text: string, color = 'success') {
    snackbarText.value = text
    snackbarColor.value = color
    snackbar.value = true
  }

  function cdn (key?: string | null) {
    return key ? `${CDN_BASE_URL}/${key}` : ''
  }
  function thumbUrl (entry: EntryDto) {
    return cdn(entry.thumbnailR2Key)
  }
  function formatDate (value?: string | null) {
    if (!value) return '—'
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? value : d.toLocaleString()
  }
  function disputeColor (status: DisputeDto['status']) {
    switch (status) {
      case 'OPEN': { return 'warning' }
      case 'RESOLVED': { return 'success' }
      case 'DISMISSED': { return 'grey' }
      case 'REFUNDED': { return 'info' }
      default: { return 'grey' }
    }
  }

  async function loadPendingEdits () {
    if (!hasModerationAccess.value || !selectedTenant.value) return
    loadingEdits.value = true
    try {
      const res = await fetchPendingEdits(selectedTenant.value, pendingPage.value - 1, 20)
      pendingEdits.value = res.content
      pendingPages.value = Math.max(1, res.totalPages)
      pendingTotal.value = res.totalElements
    } catch (error: any) {
      notify(error.message, 'error')
    } finally {
      loadingEdits.value = false
    }
  }

  async function loadCases () {
    if (!hasModerationAccess.value || !selectedTenant.value) return
    loadingCases.value = true
    try {
      cases.value = await fetchModerationCases(selectedTenant.value, 200)
      disputesByCase.value = {}
    } catch (error: any) {
      notify(error.message, 'error')
    } finally {
      loadingCases.value = false
    }
  }

  async function loadDisputes (c: ModerationCaseDto) {
    if (disputesByCase.value[c.id]) return
    loadingDisputes.value = c.id
    try {
      disputesByCase.value = { ...disputesByCase.value, [c.id]: await fetchCaseDisputes(selectedTenant.value, c.id) }
    } catch (error: any) {
      notify(error.message, 'error')
    } finally {
      loadingDisputes.value = null
    }
  }

  async function approveEdit (entry: EntryDto) {
    busy.value = entry.id
    try {
      await approvePendingVersion(selectedTenant.value, entry.id)
      notify('Edit approved and published')
      await loadPendingEdits()
    } catch (error: any) {
      notify(error.message, 'error')
    } finally {
      busy.value = null
    }
  }

  function openRejectEdit (entry: EntryDto) {
    rejectTarget.value = entry
    justification.value = ''
    rejectDialog.value = true
  }

  async function rejectEdit () {
    if (!rejectTarget.value || !justification.value.trim()) return
    busy.value = rejectTarget.value.id
    try {
      await rejectPendingVersion(selectedTenant.value, rejectTarget.value.id, justification.value.trim())
      notify('Edit rejected — published content unchanged', 'warning')
      rejectDialog.value = false
      await loadPendingEdits()
    } catch (error: any) {
      notify(error.message, 'error')
    } finally {
      busy.value = null
    }
  }

  async function resolveOne (c: ModerationCaseDto, d: DisputeDto, resolution: 'RESOLVED' | 'DISMISSED') {
    try {
      await resolveDispute(selectedTenant.value, d.id, resolution)
      delete disputesByCase.value[c.id]
      await loadDisputes(c)
      notify(`Dispute ${resolution.toLowerCase()}`)
    } catch (error: any) {
      notify(error.message, 'error')
    }
  }

  async function resolveAll (c: ModerationCaseDto, resolution: 'RESOLVED' | 'DISMISSED') {
    try {
      const res = await resolveCase(selectedTenant.value, c.id, resolution)
      delete disputesByCase.value[c.id]
      await loadDisputes(c)
      notify(`${res.updated} dispute(s) ${resolution.toLowerCase()}`)
    } catch (error: any) {
      notify(error.message, 'error')
    }
  }

  function loadAll () {
    pendingPage.value = 1
    loadPendingEdits()
    loadCases()
  }

  watch(() => authStore.activeTenantId, newId => {
    if (!newId || newId === selectedTenant.value) return
    selectedTenant.value = newId
  })
  watch(selectedTenant, loadAll)

  onMounted(async () => {
    if (isSuperadmin.value) {
      try {
        tenantIds.value = await fetchTenantIds()
      } catch {
        tenantIds.value = []
      }
    }
    loadAll()
  })
</script>

<style scoped>
.edit-diff td:first-child {
  width: 120px;
}
</style>
