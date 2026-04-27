<template>
  <v-container class="pa-4 pa-sm-6" fluid>
    <v-breadcrumbs class="px-0 pt-0" :items="[{ title: 'earnlumens', disabled: true }, { title: 'reports', disabled: true }]" />

    <!-- Users with no moderation membership land here on a deep link or stale
         tab — render an explicit empty state instead of querying the root
         tenant on their behalf. -->
    <v-card v-if="!hasModerationAccess" class="pa-8 text-center" variant="tonal">
      <v-icon class="mb-3" color="medium-emphasis" size="48">mdi-shield-lock-outline</v-icon>
      <div class="text-h6 mb-1">Reports aren't available yet</div>
      <div class="text-body-2 text-medium-emphasis mb-4">
        You'll see content reports once you create your own tenant or accept a moderation invitation.
      </div>
      <v-btn v-if="canCreateTenant" color="primary" to="/tenants" variant="flat">
        Go to tenants
      </v-btn>
    </v-card>

    <template v-else>
      <div class="d-flex flex-column flex-sm-row align-sm-center justify-space-between mb-4">
        <div>
          <div class="text-h6">Reports</div>
          <div class="text-body-2 text-medium-emphasis mb-4 mb-sm-0">
            User-submitted content reports — ordered by priority
          </div>
        </div>
        <v-select
          v-model="selectedTenant"
          class="tenant-select"
          density="compact"
          hide-details
          item-title="title"
          item-value="value"
          :items="tenantOptions"
          variant="outlined"
          @update:model-value="loadReports"
        />
      </div>

      <!-- Filter tabs -->
      <v-tabs v-model="tab" class="mb-4" density="compact" @update:model-value="loadReports">
        <v-tab value="OPEN">
          Open
          <v-badge
            v-if="openCount > 0"
            class="ml-2"
            color="error"
            :content="openCount"
            inline
          />
        </v-tab>
        <v-tab value="ALL">All</v-tab>
      </v-tabs>

      <!-- Loading -->
      <v-progress-linear v-if="loading" class="mb-4" indeterminate />

      <!-- Report list -->
      <div v-if="reports.length > 0" class="d-flex flex-column ga-2">
        <v-card v-for="report in reports" :key="report.id" class="report-card" variant="outlined">
          <div class="d-flex flex-column flex-sm-row">
            <!-- Media -->
            <div class="report-media flex-shrink-0">
              <v-img
                v-if="report.snapshot?.thumbnailR2Key"
                :aspect-ratio="16/9"
                class="fill-height rounded-ts rounded-te rounded-sm-ts rounded-sm-bs rounded-sm-te-0"
                cover
                :src="cdnUrl(report.snapshot.thumbnailR2Key)"
              >
                <template #placeholder>
                  <div class="d-flex align-center justify-center fill-height bg-surface-light">
                    <v-icon color="medium-emphasis">mdi-image-outline</v-icon>
                  </div>
                </template>
              </v-img>
              <div v-else class="d-flex flex-column align-center justify-center fill-height bg-surface-light rounded-ts rounded-te rounded-sm-ts rounded-sm-bs rounded-sm-te-0">
                <v-icon color="medium-emphasis" size="36">mdi-file-document-outline</v-icon>
              </div>
            </div>

            <!-- Content -->
            <div class="flex-grow-1 pa-3 d-flex flex-column" style="min-width: 0">
              <!-- Row 1: title + actions menu -->
              <div class="d-flex align-start justify-space-between ga-2">
                <div style="min-width: 0; flex: 1">
                  <div class="text-body-2 font-weight-medium text-truncate">
                    {{ report.snapshot?.title || report.entryId }}
                  </div>
                  <div class="d-flex align-center flex-wrap ga-1 mt-1">
                    <v-chip
                      :color="severityColor(report.severity)"
                      label
                      size="x-small"
                      variant="flat"
                    >
                      {{ report.severity }}
                    </v-chip>
                    <v-chip label size="x-small" variant="tonal">
                      {{ report.reason }}
                    </v-chip>
                    <v-chip
                      :color="resolutionColor(report.resolution)"
                      label
                      size="x-small"
                      variant="tonal"
                    >
                      {{ report.resolution }}
                    </v-chip>
                    <span class="text-caption text-disabled">
                      P{{ report.priorityScore }}
                    </span>
                  </div>
                </div>

                <!-- Actions menu for open reports -->
                <v-menu v-if="report.resolution === 'OPEN'">
                  <template #activator="{ props }">
                    <v-btn
                      v-bind="props"
                      density="compact"
                      icon="mdi-dots-vertical"
                      size="x-small"
                      variant="text"
                    />
                  </template>
                  <v-list density="compact">
                    <v-list-item
                      prepend-icon="mdi-close-circle-outline"
                      title="Dismiss"
                      @click="openConfirm(report, 'DISMISSED')"
                    />
                    <v-list-item
                      class="text-warning"
                      prepend-icon="mdi-alert-outline"
                      title="Sanction"
                      @click="openConfirm(report, 'SANCTIONED')"
                    />
                    <v-list-item
                      class="text-error"
                      prepend-icon="mdi-delete-outline"
                      title="Remove"
                      @click="openConfirm(report, 'REMOVED')"
                    />
                    <v-divider />
                    <v-list-item
                      prepend-icon="mdi-arrow-right"
                      title="View in Moderation"
                      @click="goToEntry(report)"
                    />
                  </v-list>
                </v-menu>
              </div>

              <!-- Reporter note -->
              <div
                v-if="report.comment"
                class="note-indicator d-flex align-start ga-2 mt-2"
              >
                <v-icon class="flex-shrink-0 mt-px" color="medium-emphasis" size="14">mdi-message-text-outline</v-icon>
                <div
                  class="text-caption text-medium-emphasis note-text"
                  :class="{ 'note-clamped': !expandedNotes.has(report.id) }"
                  @click.stop="toggleNote(report.id)"
                >
                  {{ report.comment }}
                </div>
              </div>

              <!-- Meta row -->
              <div class="d-flex align-center flex-wrap ga-2 mt-auto pt-2">
                <span class="text-caption text-medium-emphasis">
                  by <strong>{{ report.reporterUsername || report.reporterUserId }}</strong>
                </span>
                <span v-if="report.snapshot?.authorUsername" class="text-caption text-medium-emphasis">
                  · re: @{{ report.snapshot.authorUsername }}
                </span>
                <span class="text-caption text-disabled">
                  · {{ formatDate(report.createdAt) }}
                </span>
                <span v-if="report.resolvedBy" class="text-caption text-disabled">
                  · {{ report.resolvedBy }}
                </span>
              </div>
            </div>
          </div>
        </v-card>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="d-flex justify-center mt-4">
          <v-pagination
            v-model="currentPage"
            density="compact"
            :length="totalPages"
            :total-visible="5"
            @update:model-value="loadReports"
          />
        </div>
      </div>

      <!-- Empty state -->
      <v-card v-else-if="!loading" class="text-center pa-8" variant="tonal">
        <v-icon class="mb-3" color="success" size="48">
          {{ tab === 'OPEN' ? 'mdi-check-circle-outline' : 'mdi-flag-off-outline' }}
        </v-icon>
        <div class="text-body-1 font-weight-medium">
          {{ tab === 'OPEN' ? 'No open reports' : 'No reports yet' }}
        </div>
        <div class="text-body-2 text-medium-emphasis mt-1">
          {{ tab === 'OPEN' ? 'All user reports have been resolved.' : 'No content has been reported by users.' }}
        </div>
      </v-card>
    </template>
  </v-container>

  <!-- Confirmation dialog -->
  <v-dialog v-model="confirmDialog" max-width="480" persistent>
    <v-card>
      <v-card-title class="d-flex align-center ga-2">
        <v-icon :color="confirmMeta.color" :icon="confirmMeta.icon" />
        {{ confirmMeta.title }}
      </v-card-title>
      <v-card-text>
        <div class="text-body-2 mb-3">{{ confirmMeta.description }}</div>
        <v-alert
          class="mb-3"
          color="warning"
          density="compact"
          icon="mdi-account-eye"
          variant="tonal"
        >
          This action will be recorded under your admin username.
        </v-alert>
        <div v-if="confirmReport" class="text-caption text-medium-emphasis">
          Entry: <strong>{{ confirmReport.snapshot?.title || confirmReport.entryId }}</strong><br>
          Reason: <strong>{{ confirmReport.reason }}</strong> · Priority: <strong>{{ confirmReport.priorityScore }}</strong>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="confirmDialog = false">Cancel</v-btn>
        <v-btn
          :color="confirmMeta.color"
          :loading="resolveLoading !== null"
          variant="flat"
          @click="executeResolve"
        >
          {{ confirmMeta.action }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
  import type { ReportDto } from '@/api/moderation'

  import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
  import { useRouter } from 'vue-router'

  import {
    fetchReports,
    fetchTenantIds,
    resolveReport,
  } from '@/api/moderation'
  import { useSidebarBadges } from '@/composables/useSidebarBadges'
  import { useTenantLabels } from '@/composables/useTenantLabels'
  import { CDN_BASE_URL } from '@/config/env'
  import { allUserTenants, useAuthStore } from '@/stores/auth'

  const router = useRouter()
  const { refresh: refreshBadges } = useSidebarBadges()
  const authStore = useAuthStore()
  const isSuperadmin = computed(() => authStore.user?.role === 'SUPERADMIN')
  const isTenantOwner = computed(() => (authStore.user?.tenantAdminOf?.length ?? 0) > 0)
  const isModerator = computed(() => (authStore.user?.moderatorOf?.length ?? 0) > 0)
  const canCreateTenant = computed(() => authStore.user?.canCreateTenant === true)
  const hasModerationAccess = computed(
    () => isSuperadmin.value || isTenantOwner.value || isModerator.value,
  )
  const { labelFor: tenantLabel } = useTenantLabels()

  function defaultTenant (): string {
    if (authStore.activeTenantId) return authStore.activeTenantId
    if (authStore.user?.role === 'SUPERADMIN') return 'earnlumens'
    const accessible = allUserTenants(authStore.user)
    // Empty string is fine: the page is gated by hasModerationAccess, so no
    // request is ever issued in this branch. We deliberately do NOT fall
    // back to 'earnlumens' here — that was the source of a privilege bug.
    return accessible[0] ?? ''
  }

  const selectedTenant = ref(defaultTenant())
  const tenantIds = ref<string[]>([])
  const tab = ref('OPEN')
  const loading = ref(false)
  const reports = ref<ReportDto[]>([])
  const currentPage = ref(1)
  const totalPages = ref(1)
  const openCount = ref(0)
  const resolveLoading = ref<string | null>(null)
  const expandedNotes = ref(new Set<string>())

  function toggleNote (reportId: string) {
    const next = new Set(expandedNotes.value)
    if (next.has(reportId)) next.delete(reportId)
    else next.add(reportId)
    expandedNotes.value = next
  }

  // Confirmation dialog
  const confirmDialog = ref(false)
  const confirmReport = ref<ReportDto | null>(null)
  const confirmResolution = ref('')

  interface ResolutionInfo {
    title: string
    description: string
    action: string
    icon: string
    color: string
  }

  const RESOLUTION_META: Record<string, ResolutionInfo> = {
    DISMISSED: {
      title: 'Dismiss Report',
      description: 'The report will be closed with no action taken. The reported content stays published. This may lower the reporter\'s reputation score for future reports.',
      action: 'Dismiss report',
      icon: 'mdi-close-circle-outline',
      color: 'grey',
    },
    SANCTIONED: {
      title: 'Sanction Content',
      description: 'The reported content will be suspended immediately. The author will see a "suspended" status on their entry. The reporter\'s reputation score will increase for future reports.',
      action: 'Sanction & suspend',
      icon: 'mdi-alert-outline',
      color: 'warning',
    },
    REMOVED: {
      title: 'Remove Content',
      description: 'The reported content will be suspended immediately for removal. The author will see a "suspended" status and the content will no longer be publicly visible. The reporter\'s reputation score will increase for future reports.',
      action: 'Remove & suspend',
      icon: 'mdi-delete-outline',
      color: 'error',
    },
  }

  const confirmMeta = computed(() => RESOLUTION_META[confirmResolution.value] ?? RESOLUTION_META.DISMISSED)

  const tenantOptions = computed(() => {
    if (!isSuperadmin.value) {
      const accessible = allUserTenants(authStore.user)
      return accessible.map(t => ({ title: tenantLabel(t), value: t }))
    }

    const opts = [{ title: 'All tenants', value: '_all' }]
    for (const t of tenantIds.value) {
      opts.push({ title: tenantLabel(t), value: t })
    }
    if (!tenantIds.value.includes('earnlumens')) {
      opts.splice(1, 0, { title: 'earnlumens (root)', value: 'earnlumens' })
    }
    return opts
  })

  function cdnUrl (r2Key: string): string {
    return `${CDN_BASE_URL}/${r2Key}`
  }

  function severityColor (severity: string) {
    switch (severity) {
      case 'HIGH': { return 'error' }
      case 'MEDIUM': { return 'warning' }
      case 'LOW': { return 'info' }
      default: { return 'grey' }
    }
  }

  function resolutionColor (resolution: string) {
    switch (resolution) {
      case 'OPEN': { return 'warning' }
      case 'DISMISSED': { return 'grey' }
      case 'SANCTIONED': { return 'orange' }
      case 'REMOVED': { return 'error' }
      default: { return 'grey' }
    }
  }

  function formatDate (iso: string): string {
    if (!iso) return '—'
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  async function loadReports () {
    if (!hasModerationAccess.value || !selectedTenant.value) return
    loading.value = true
    try {
      const resolution = tab.value === 'OPEN' ? 'OPEN' : null
      const res = await fetchReports(selectedTenant.value, resolution, currentPage.value - 1, 20)
      reports.value = res.content
      totalPages.value = res.totalPages

      // Also fetch open count for the badge
      if (tab.value === 'OPEN') {
        openCount.value = res.totalElements
      } else {
        try {
          const openRes = await fetchReports(selectedTenant.value, 'OPEN', 0, 1)
          openCount.value = openRes.totalElements
        } catch {
          openCount.value = 0
        }
      }
    } catch {
      reports.value = []
    } finally {
      loading.value = false
    }
  }

  function openConfirm (report: ReportDto, resolution: string) {
    confirmReport.value = report
    confirmResolution.value = resolution
    confirmDialog.value = true
  }

  async function executeResolve () {
    if (!confirmReport.value) return
    resolveLoading.value = confirmReport.value.id
    try {
      await resolveReport(confirmReport.value.id, confirmResolution.value)
      confirmDialog.value = false
      await loadReports()
      refreshBadges()
    } catch {
      // silent
    } finally {
      resolveLoading.value = null
    }
  }

  function goToEntry (report: ReportDto) {
    router.push({ path: '/moderation', query: { tab: 'all', entryId: report.entryId, tenantId: report.tenantId } })
  }

  let pollId: ReturnType<typeof setInterval> | null = null

  // Mirror the global tenant context (top-right TenantSwitcher) into the
  // in-page filter so reports always reflect the tenant currently selected
  // globally instead of forcing the user to pick again here.
  watch(() => authStore.activeTenantId, newId => {
    if (!newId || newId === selectedTenant.value) return
    selectedTenant.value = newId
    currentPage.value = 1
    loadReports()
  })

  onMounted(async () => {
    try {
      tenantIds.value = await fetchTenantIds()
    } catch {
      // fallback
    }
    await loadReports()
    pollId = setInterval(loadReports, 30_000)
  })

  onUnmounted(() => {
    if (pollId) {
      clearInterval(pollId)
      pollId = null
    }
  })
</script>

<style scoped>
  .tenant-select {
    max-width: 220px;
    min-width: 180px;
  }

  .report-card:hover {
    border-color: rgb(var(--v-theme-primary));
  }

  .report-media {
    width: 100%;
    height: 120px;
    overflow: hidden;
  }

  @media (min-width: 600px) {
    .report-media {
      width: 180px;
      min-width: 180px;
      height: auto;
    }
  }

  .note-indicator {
    padding: 6px 10px;
    border-radius: 6px;
    background: rgba(var(--v-theme-on-surface), 0.04);
  }

  .note-text {
    cursor: pointer;
  }

  .note-text:hover {
    text-decoration: underline;
    text-decoration-style: dotted;
  }

  .note-clamped {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
