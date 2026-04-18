<template>
  <v-container class="pa-4 pa-sm-6" fluid>
    <v-breadcrumbs class="px-0 pt-0" :items="[{ title: 'earnlumens', disabled: true }, { title: 'reports', disabled: true }]" />

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
    <div v-if="reports.length > 0">
      <v-card v-for="report in reports" :key="report.id" class="mb-3" variant="outlined">
        <v-card-text class="pa-3 pa-sm-4">
          <div class="d-flex flex-column flex-sm-row ga-3">
            <!-- Snapshot thumbnail -->
            <v-img
              v-if="report.snapshot?.thumbnailR2Key"
              class="rounded flex-shrink-0"
              cover
              height="80"
              :src="cdnUrl(report.snapshot.thumbnailR2Key)"
              width="120"
            />
            <v-icon
              v-else
              class="flex-shrink-0 d-none d-sm-flex"
              color="medium-emphasis"
              size="40"
            >
              mdi-file-document-outline
            </v-icon>

            <div class="flex-grow-1" style="min-width: 0">
              <!-- Header: chips row -->
              <div class="d-flex flex-wrap align-center ga-1 mb-1">
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
                <span class="text-caption text-medium-emphasis">
                  Priority {{ report.priorityScore }}
                </span>
              </div>

              <!-- Entry title from snapshot -->
              <div v-if="report.snapshot?.title" class="text-body-2 font-weight-medium text-truncate">
                {{ report.snapshot.title }}
              </div>

              <!-- Reporter + author info -->
              <div class="text-caption text-medium-emphasis mt-1">
                Reported by <strong>{{ report.reporterUsername || report.reporterUserId }}</strong>
                <span v-if="report.snapshot?.authorUsername">
                  · Author: <strong>{{ report.snapshot.authorUsername }}</strong>
                </span>
              </div>

              <!-- Comment -->
              <div v-if="report.comment" class="text-caption text-medium-emphasis mt-1" style="max-width: 500px">
                "{{ report.comment }}"
              </div>

              <!-- Date + resolved info -->
              <div class="text-caption text-disabled mt-1">
                {{ formatDate(report.createdAt) }}
                <span v-if="report.resolvedBy"> · Resolved by {{ report.resolvedBy }}</span>
              </div>

              <!-- Actions for open reports -->
              <div v-if="report.resolution === 'OPEN'" class="d-flex flex-wrap ga-1 mt-2">
                <v-btn
                  color="grey"
                  :loading="resolveLoading === report.id"
                  size="x-small"
                  variant="tonal"
                  @click="handleResolve(report.id, 'DISMISSED')"
                >
                  Dismiss
                </v-btn>
                <v-btn
                  color="warning"
                  :loading="resolveLoading === report.id"
                  size="x-small"
                  variant="tonal"
                  @click="handleResolve(report.id, 'SANCTIONED')"
                >
                  Sanction
                </v-btn>
                <v-btn
                  color="error"
                  :loading="resolveLoading === report.id"
                  size="x-small"
                  variant="tonal"
                  @click="handleResolve(report.id, 'REMOVED')"
                >
                  Remove
                </v-btn>
                <v-spacer />
                <v-btn
                  size="x-small"
                  variant="text"
                  @click="goToEntry(report)"
                >
                  View in Moderation
                  <v-icon end size="14">mdi-arrow-right</v-icon>
                </v-btn>
              </div>
            </div>
          </div>
        </v-card-text>
      </v-card>

      <!-- Pagination -->
      <div class="d-flex justify-center mt-4">
        <v-pagination
          v-model="currentPage"
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
  </v-container>
</template>

<script lang="ts" setup>
  import type { ReportDto } from '@/api/moderation'

  import { computed, onMounted, ref } from 'vue'
  import { useRouter } from 'vue-router'

  import {
    fetchReports,
    fetchTenantIds,
    resolveReport,
  } from '@/api/moderation'
  import { useSidebarBadges } from '@/composables/useSidebarBadges'
  import { CDN_BASE_URL } from '@/config/env'

  const router = useRouter()
  const { refresh: refreshBadges } = useSidebarBadges()

  const selectedTenant = ref('earnlumens')
  const tenantIds = ref<string[]>([])
  const tab = ref('OPEN')
  const loading = ref(false)
  const reports = ref<ReportDto[]>([])
  const currentPage = ref(1)
  const totalPages = ref(1)
  const openCount = ref(0)
  const resolveLoading = ref<string | null>(null)

  const tenantOptions = computed(() => {
    const opts = [{ title: 'All tenants', value: '_all' }]
    for (const t of tenantIds.value) {
      opts.push({ title: t === 'earnlumens' ? 'earnlumens (root)' : t, value: t })
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

  async function handleResolve (reportId: string, resolution: string) {
    resolveLoading.value = reportId
    try {
      await resolveReport(reportId, resolution)
      await loadReports()
      refreshBadges()
    } catch {
      // silent
    } finally {
      resolveLoading.value = null
    }
  }

  function goToEntry (report: ReportDto) {
    router.push({ path: '/moderation', query: { entryId: report.entryId } })
  }

  onMounted(async () => {
    try {
      tenantIds.value = await fetchTenantIds()
    } catch {
      // fallback
    }
    await loadReports()
  })
</script>

<style scoped>
  .tenant-select {
    max-width: 220px;
    min-width: 180px;
  }
</style>
