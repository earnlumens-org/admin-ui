<template>
  <v-container class="pa-4 pa-sm-6" fluid>
    <v-breadcrumbs class="px-0 pt-0" :items="[{ title: 'earnlumens', disabled: true }, { title: 'moderation', disabled: true }]" />

    <div class="d-flex flex-column flex-sm-row align-sm-center justify-space-between mb-1">
      <div>
        <div class="text-h6">Moderation</div>
        <div class="text-body-2 text-medium-emphasis mb-4 mb-sm-0">
          Review and moderate content entries
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
        @update:model-value="loadEntries"
      />
    </div>

    <!-- Stats chips -->
    <div v-if="stats" class="d-flex flex-wrap ga-2 mb-4">
      <v-chip color="warning" prepend-icon="mdi-clock-outline" size="small" variant="tonal">
        {{ stats.inReview }} in review
      </v-chip>
      <v-chip color="success" prepend-icon="mdi-check-circle-outline" size="small" variant="tonal">
        {{ stats.published }} published
      </v-chip>
      <v-chip color="error" prepend-icon="mdi-cancel" size="small" variant="tonal">
        {{ stats.suspended }} suspended
      </v-chip>
      <v-chip prepend-icon="mdi-close-circle-outline" size="small" variant="tonal">
        {{ stats.rejected }} rejected
      </v-chip>
      <v-chip color="grey" prepend-icon="mdi-archive-outline" size="small" variant="tonal">
        {{ stats.archived }} archived
      </v-chip>
    </div>

    <v-divider class="mb-4" />

    <v-tabs v-model="tab" class="mb-4" @update:model-value="onTabChange">
      <v-tab value="in-review">
        In Review
        <v-badge
          v-if="stats && stats.inReview > 0"
          class="ml-1"
          color="warning"
          :content="stats.inReview"
          inline
        />
      </v-tab>
      <v-tab value="all">All Entries</v-tab>
    </v-tabs>

    <!-- Status filter for "All Entries" tab -->
    <div v-if="tab === 'all'" class="d-flex flex-wrap ga-2 mb-4">
      <v-chip
        v-for="s in statusFilters"
        :key="s.value"
        :color="s.color"
        size="small"
        :variant="statusFilter === s.value ? 'flat' : 'outlined'"
        @click="statusFilter = s.value; loadEntries()"
      >
        {{ s.label }}
      </v-chip>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="d-flex justify-center py-12">
      <v-progress-circular indeterminate />
    </div>

    <!-- Empty state -->
    <v-card v-else-if="entries.length === 0" class="pa-8 text-center" variant="tonal">
      <v-icon color="medium-emphasis" size="48">mdi-file-check-outline</v-icon>
      <div class="text-body-1 mt-4">
        {{ tab === 'in-review' ? 'No entries to review' : 'No entries found' }}
      </div>
      <div class="text-body-2 text-medium-emphasis mt-1">
        {{ tab === 'in-review'
          ? 'Entries submitted for review will appear here.'
          : 'Try changing the status filter or tenant.'
        }}
      </div>
    </v-card>

    <!-- Entry list -->
    <div v-else class="d-flex flex-column ga-3">
      <v-card
        v-for="entry in entries"
        :key="entry.id"
        class="entry-card"
        variant="outlined"
      >
        <div class="d-flex flex-column flex-sm-row">
          <!-- Thumbnail -->
          <div class="entry-thumb flex-shrink-0" @click="openDetail(entry)">
            <v-img
              v-if="entry.thumbnailR2Key"
              :aspect-ratio="16/9"
              class="rounded-ts rounded-te rounded-sm-ts rounded-sm-bs rounded-sm-te-0"
              cover
              :src="cdnUrl(entry.thumbnailR2Key)"
            >
              <template #placeholder>
                <div class="d-flex align-center justify-center fill-height bg-surface-light">
                  <v-icon color="medium-emphasis">mdi-image-outline</v-icon>
                </div>
              </template>
              <!-- Duration badge -->
              <div v-if="entry.durationSec" class="entry-duration">
                {{ formatDuration(entry.durationSec) }}
              </div>
            </v-img>
            <div v-else class="d-flex align-center justify-center fill-height bg-surface-light rounded-ts rounded-te rounded-sm-ts rounded-sm-bs rounded-sm-te-0">
              <v-icon color="medium-emphasis" size="32">{{ typeIcon(entry.type) }}</v-icon>
            </div>
          </div>

          <!-- Content -->
          <div class="flex-grow-1 pa-3 pa-sm-4 d-flex flex-column" style="min-width: 0">
            <div class="d-flex align-start justify-space-between ga-2">
              <div style="min-width: 0; flex: 1">
                <div class="text-body-1 font-weight-medium text-truncate cursor-pointer" @click="openDetail(entry)">
                  {{ entry.title }}
                </div>
                <div class="d-flex align-center flex-wrap ga-2 mt-1">
                  <span class="text-body-2 text-medium-emphasis">
                    @{{ entry.authorUsername || 'unknown' }}
                  </span>
                  <v-chip :color="typeColor(entry.type)" label size="x-small" variant="tonal">
                    {{ entry.type }}
                  </v-chip>
                  <v-chip :color="statusColor(entry.status)" label size="x-small" variant="tonal">
                    {{ entry.status }}
                  </v-chip>
                  <v-chip
                    v-if="entry.paid"
                    color="info"
                    label
                    size="x-small"
                    variant="tonal"
                  >
                    {{ formatPrice(entry) }}
                  </v-chip>
                </div>
              </div>

              <!-- Actions menu -->
              <v-menu>
                <template #activator="{ props }">
                  <v-btn v-bind="props" icon="mdi-dots-vertical" size="small" variant="text" />
                </template>
                <v-list density="compact">
                  <v-list-item
                    prepend-icon="mdi-eye-outline"
                    title="View details"
                    @click="openDetail(entry)"
                  />
                  <v-list-item
                    v-if="entry.status === 'IN_REVIEW'"
                    prepend-icon="mdi-check"
                    title="Approve"
                    @click="handleApprove(entry)"
                  />
                  <v-list-item
                    v-if="entry.status === 'IN_REVIEW'"
                    prepend-icon="mdi-close"
                    title="Reject..."
                    @click="openRejectDialog(entry)"
                  />
                  <v-list-item
                    v-if="entry.status === 'PUBLISHED' || entry.status === 'APPROVED'"
                    prepend-icon="mdi-cancel"
                    title="Suspend..."
                    @click="openSuspendDialog(entry)"
                  />
                </v-list>
              </v-menu>
            </div>

            <!-- Meta row -->
            <div class="d-flex align-center flex-wrap ga-2 mt-auto pt-2">
              <span class="text-caption text-medium-emphasis">
                {{ formatDate(entry.createdAt) }}
              </span>
              <span v-if="entry.tenantId !== selectedTenant" class="text-caption text-medium-emphasis">
                · {{ entry.tenantId }}
              </span>
              <span v-if="entry.contentLanguage" class="text-caption text-medium-emphasis">
                · {{ entry.contentLanguage.toUpperCase() }}
              </span>
              <span class="text-caption text-medium-emphasis">
                · {{ entry.viewCount.toLocaleString() }} views
              </span>
            </div>
          </div>
        </div>
      </v-card>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="d-flex justify-center mt-2">
        <v-pagination
          v-model="currentPage"
          density="compact"
          :length="totalPages"
          :total-visible="5"
          @update:model-value="loadEntries"
        />
      </div>
    </div>

    <!-- Detail drawer -->
    <v-navigation-drawer
      v-model="detailDrawer"
      location="right"
      temporary
      :width="Math.min(480, windowWidth - 16)"
    >
      <template v-if="detailEntry">
        <v-toolbar color="transparent" density="compact">
          <v-toolbar-title class="text-body-1">Entry Details</v-toolbar-title>
          <v-btn icon="mdi-close" variant="text" @click="detailDrawer = false" />
        </v-toolbar>

        <div class="pa-4">
          <!-- Content player -->
          <div class="mb-4">
            <!-- Loading content URL -->
            <div v-if="contentLoading" class="d-flex align-center justify-center bg-surface-light rounded" style="aspect-ratio: 16/9">
              <v-progress-circular indeterminate size="28" />
            </div>

            <!-- Video player -->
            <video
              v-else-if="contentInfo?.hasContent && isVideoContent"
              class="w-100 rounded"
              controls
              crossorigin="anonymous"
              playsinline
              :poster="detailEntry.thumbnailR2Key ? cdnUrl(detailEntry.thumbnailR2Key) : undefined"
              :src="contentInfo.contentUrl"
              style="max-height: 320px; background: #000"
            />

            <!-- Audio player -->
            <div v-else-if="contentInfo?.hasContent && isAudioContent" class="rounded bg-surface-light pa-3">
              <v-img
                v-if="detailEntry.thumbnailR2Key"
                :aspect-ratio="16/9"
                class="rounded mb-3"
                cover
                :src="cdnUrl(detailEntry.thumbnailR2Key)"
              />
              <audio
                class="w-100"
                controls
                crossorigin="anonymous"
                :src="contentInfo.contentUrl"
              />
            </div>

            <!-- Image viewer -->
            <v-img
              v-else-if="contentInfo?.hasContent && isImageContent"
              :aspect-ratio="16/9"
              class="rounded bg-surface-light"
              contain
              :src="contentInfo.contentUrl"
              style="max-height: 400px"
            />

            <!-- Resource content (rich text) -->
            <div
              v-else-if="detailEntry.type === 'RESOURCE' && detailEntry.resourceContent"
              class="rounded bg-surface-light pa-4 resource-content"
              style="max-height: 400px; overflow-y: auto"
              v-html="detailEntry.resourceContent"
            />

            <!-- Fallback: thumbnail only -->
            <v-img
              v-else-if="detailEntry.thumbnailR2Key"
              :aspect-ratio="16/9"
              class="rounded"
              cover
              :src="cdnUrl(detailEntry.thumbnailR2Key)"
            />

            <!-- No content -->
            <div
              v-else
              class="d-flex flex-column align-center justify-center bg-surface-light rounded pa-4"
              style="aspect-ratio: 16/9"
            >
              <v-icon color="medium-emphasis" size="32">{{ typeIcon(detailEntry.type) }}</v-icon>
              <span class="text-caption text-medium-emphasis mt-2">No preview available</span>
            </div>

            <!-- Content error -->
            <div v-if="contentError" class="text-caption text-error mt-1">
              {{ contentError }}
            </div>

            <!-- Download button — only for RESOURCE attachments, not for paid media -->
            <v-btn
              v-if="detailEntry?.type === 'RESOURCE' && contentInfo?.hasContent && contentInfo?.contentUrl"
              class="mt-2"
              :download="contentInfo.fileName || 'download'"
              :href="contentInfo.contentUrl"
              prepend-icon="mdi-download"
              size="small"
              target="_blank"
              variant="tonal"
            >
              Download {{ contentInfo.fileName || 'file' }}
            </v-btn>
          </div>

          <div class="text-h6 mb-2">{{ detailEntry.title }}</div>

          <!-- Info table -->
          <v-table class="mb-4" density="compact">
            <tbody>
              <tr><td class="text-medium-emphasis" style="width: 120px">Author</td><td>@{{ detailEntry.authorUsername || '—' }}</td></tr>
              <tr><td class="text-medium-emphasis">Status</td><td><v-chip :color="statusColor(detailEntry.status)" label size="x-small" variant="tonal">{{ detailEntry.status }}</v-chip></td></tr>
              <tr><td class="text-medium-emphasis">Type</td><td><v-chip :color="typeColor(detailEntry.type)" label size="x-small" variant="tonal">{{ detailEntry.type }}</v-chip></td></tr>
              <tr><td class="text-medium-emphasis">Tenant</td><td>{{ detailEntry.tenantId }}</td></tr>
              <tr><td class="text-medium-emphasis">Visibility</td><td>{{ detailEntry.visibility }}</td></tr>
              <tr><td class="text-medium-emphasis">Created</td><td>{{ formatDate(detailEntry.createdAt) }}</td></tr>
              <tr v-if="detailEntry.publishedAt"><td class="text-medium-emphasis">Published</td><td>{{ formatDate(detailEntry.publishedAt) }}</td></tr>
              <tr><td class="text-medium-emphasis">Views</td><td>{{ detailEntry.viewCount.toLocaleString() }}</td></tr>
              <tr v-if="detailEntry.durationSec"><td class="text-medium-emphasis">Duration</td><td>{{ formatDuration(detailEntry.durationSec) }}</td></tr>
              <tr v-if="detailEntry.contentLanguage"><td class="text-medium-emphasis">Language</td><td>{{ detailEntry.contentLanguage.toUpperCase() }}</td></tr>
              <tr v-if="detailEntry.paid"><td class="text-medium-emphasis">Price</td><td>{{ formatPrice(detailEntry) }}</td></tr>
              <tr v-if="detailEntry.pricingMode"><td class="text-medium-emphasis">Pricing Mode</td><td>{{ detailEntry.pricingMode }}</td></tr>
              <tr v-if="detailEntry.hlsReady"><td class="text-medium-emphasis">HLS</td><td><v-chip color="success" label size="x-small" variant="tonal">Ready</v-chip></td></tr>
              <tr><td class="text-medium-emphasis">Entry ID</td><td class="text-caption" style="word-break: break-all">{{ detailEntry.id }}</td></tr>
              <tr><td class="text-medium-emphasis">User ID</td><td class="text-caption" style="word-break: break-all">{{ detailEntry.userId }}</td></tr>
            </tbody>
          </v-table>

          <!-- Tags -->
          <div v-if="detailEntry.tags?.length" class="mb-4">
            <div class="text-caption text-medium-emphasis mb-1">Tags</div>
            <div class="d-flex flex-wrap ga-1">
              <v-chip
                v-for="t in detailEntry.tags"
                :key="t"
                label
                size="x-small"
                variant="outlined"
              >
                {{ t }}
              </v-chip>
            </div>
          </div>

          <!-- Description -->
          <div v-if="detailEntry.description" class="mb-4">
            <div class="text-caption text-medium-emphasis mb-1">Description</div>
            <div class="text-body-2">{{ detailEntry.description }}</div>
          </div>

          <!-- Actions -->
          <div class="d-flex flex-wrap ga-2 mt-4">
            <v-btn
              v-if="detailEntry.status === 'IN_REVIEW'"
              color="success"
              :loading="actionLoading"
              prepend-icon="mdi-check"
              variant="flat"
              @click="handleApprove(detailEntry)"
            >
              Approve
            </v-btn>
            <v-btn
              v-if="detailEntry.status === 'IN_REVIEW'"
              color="error"
              prepend-icon="mdi-close"
              variant="outlined"
              @click="openRejectDialog(detailEntry)"
            >
              Reject
            </v-btn>
            <v-btn
              v-if="detailEntry.status === 'PUBLISHED' || detailEntry.status === 'APPROVED'"
              color="warning"
              prepend-icon="mdi-cancel"
              variant="outlined"
              @click="openSuspendDialog(detailEntry)"
            >
              Suspend
            </v-btn>
          </div>
        </div>
      </template>
    </v-navigation-drawer>

    <!-- Reject dialog -->
    <v-dialog v-model="rejectDialog" max-width="440">
      <v-card>
        <v-card-title class="text-h6">Reject Entry</v-card-title>
        <v-card-text>
          <div class="text-body-2 text-medium-emphasis mb-3">
            Provide a reason for rejecting "{{ actionTarget?.title }}".
            The creator will see this justification.
          </div>
          <v-textarea
            v-model="justification"
            counter
            label="Justification"
            rows="3"
            :rules="[v => !!v?.trim() || 'Justification is required']"
            variant="outlined"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="rejectDialog = false">Cancel</v-btn>
          <v-btn
            color="error"
            :disabled="!justification?.trim()"
            :loading="actionLoading"
            variant="flat"
            @click="handleReject"
          >
            Reject
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Suspend dialog -->
    <v-dialog v-model="suspendDialog" max-width="440">
      <v-card>
        <v-card-title class="text-h6">Suspend Entry</v-card-title>
        <v-card-text>
          <div class="text-body-2 text-medium-emphasis mb-3">
            Provide a reason for suspending "{{ actionTarget?.title }}".
            This will remove it from public visibility.
          </div>
          <v-textarea
            v-model="justification"
            counter
            label="Justification"
            rows="3"
            :rules="[v => !!v?.trim() || 'Justification is required']"
            variant="outlined"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="suspendDialog = false">Cancel</v-btn>
          <v-btn
            color="warning"
            :disabled="!justification?.trim()"
            :loading="actionLoading"
            variant="flat"
            @click="handleSuspend"
          >
            Suspend
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000">
      {{ snackbarText }}
    </v-snackbar>
  </v-container>
</template>

<script lang="ts" setup>
  import { computed, onMounted, ref } from 'vue'
  import {
    approveEntry,
    type ContentUrlResponse,
    type EntryDto,
    fetchContentUrl,
    fetchEntries,
    fetchModerationStats,
    fetchTenantIds,
    type ModerationStats,
    rejectEntry,
    suspendEntry,
  } from '@/api/moderation'
  import { useWindowSize } from '@/composables/useWindowSize'
  import { CDN_BASE_URL } from '@/config/env'

  const { width: windowWidth } = useWindowSize()

  // State
  const tab = ref('in-review')
  const selectedTenant = ref('earnlumens')
  const tenantIds = ref<string[]>([])
  const entries = ref<EntryDto[]>([])
  const stats = ref<ModerationStats | null>(null)
  const loading = ref(false)
  const currentPage = ref(1)
  const totalPages = ref(0)
  const statusFilter = ref('')

  // Detail drawer
  const detailDrawer = ref(false)
  const detailEntry = ref<EntryDto | null>(null)
  const contentInfo = ref<ContentUrlResponse | null>(null)
  const contentLoading = ref(false)
  const contentError = ref('')

  const isVideoContent = computed(() =>
    contentInfo.value?.contentType?.startsWith('video/') || contentInfo.value?.type === 'VIDEO',
  )
  const isAudioContent = computed(() =>
    contentInfo.value?.contentType?.startsWith('audio/') || contentInfo.value?.type === 'AUDIO',
  )
  const isImageContent = computed(() =>
    contentInfo.value?.contentType?.startsWith('image/') || contentInfo.value?.type === 'IMAGE',
  )

  // Action dialogs
  const rejectDialog = ref(false)
  const suspendDialog = ref(false)
  const actionTarget = ref<EntryDto | null>(null)
  const justification = ref('')
  const actionLoading = ref(false)

  // Snackbar
  const snackbar = ref(false)
  const snackbarText = ref('')
  const snackbarColor = ref('')

  const statusFilters = [
    { value: '', label: 'All', color: undefined },
    { value: 'IN_REVIEW', label: 'In Review', color: 'warning' },
    { value: 'APPROVED', label: 'Approved', color: 'info' },
    { value: 'PUBLISHED', label: 'Published', color: 'success' },
    { value: 'REJECTED', label: 'Rejected', color: undefined },
    { value: 'SUSPENDED', label: 'Suspended', color: 'error' },
    { value: 'UNLISTED', label: 'Unlisted', color: 'blue-grey' },
    { value: 'ARCHIVED', label: 'Archived', color: 'grey' },
  ]

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

  function typeIcon (type: string): string {
    switch (type) {
      case 'VIDEO': { return 'mdi-video-outline'
      }
      case 'AUDIO': { return 'mdi-music-note'
      }
      case 'IMAGE': { return 'mdi-image-outline'
      }
      case 'RESOURCE': { return 'mdi-file-document-outline'
      }
      default: { return 'mdi-file-outline'
      }
    }
  }

  function typeColor (type: string): string | undefined {
    switch (type) {
      case 'VIDEO': { return 'purple'
      }
      case 'AUDIO': { return 'deep-orange'
      }
      case 'IMAGE': { return 'teal'
      }
      case 'RESOURCE': { return 'blue-grey'
      }
      default: { return undefined
      }
    }
  }

  function statusColor (status: string): string | undefined {
    switch (status) {
      case 'IN_REVIEW': { return 'warning'
      }
      case 'APPROVED': { return 'info'
      }
      case 'PUBLISHED': { return 'success'
      }
      case 'REJECTED': { return undefined
      }
      case 'SUSPENDED': { return 'error'
      }
      case 'UNLISTED': { return 'blue-grey'
      }
      case 'ARCHIVED': { return 'grey'
      }
      default: { return undefined
      }
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

  function formatDuration (sec: number): string {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  function formatPrice (entry: EntryDto): string {
    if (entry.priceUsd != null) return `$${entry.priceUsd}`
    if (entry.priceXlm != null) return `${entry.priceXlm} XLM`
    return 'Paid'
  }

  function showSnackbar (text: string, color: string) {
    snackbarText.value = text
    snackbarColor.value = color
    snackbar.value = true
  }

  async function loadEntries () {
    loading.value = true
    try {
      const [pageData, statsData] = await Promise.all([
        fetchEntries(
          selectedTenant.value,
          tab.value,
          currentPage.value - 1,
          20,
          tab.value === 'all' ? statusFilter.value || undefined : undefined,
        ),
        fetchModerationStats(selectedTenant.value),
      ])
      entries.value = pageData.content
      totalPages.value = pageData.totalPages
      stats.value = statsData
    } catch {
      showSnackbar('Failed to load entries', 'error')
    } finally {
      loading.value = false
    }
  }

  function onTabChange () {
    currentPage.value = 1
    statusFilter.value = ''
    loadEntries()
  }

  function openDetail (entry: EntryDto) {
    detailEntry.value = entry
    detailDrawer.value = true
    contentInfo.value = null
    contentError.value = ''
    loadContentUrl(entry)
  }

  async function loadContentUrl (entry: EntryDto) {
    contentLoading.value = true
    try {
      contentInfo.value = await fetchContentUrl(selectedTenant.value, entry.id)
    } catch {
      contentError.value = 'Could not load content'
    } finally {
      contentLoading.value = false
    }
  }

  async function handleApprove (entry: EntryDto) {
    actionLoading.value = true
    try {
      await approveEntry(selectedTenant.value, entry.id)
      showSnackbar('Entry approved', 'success')
      detailDrawer.value = false
      loadEntries()
    } catch (error: any) {
      showSnackbar(error.message, 'error')
    } finally {
      actionLoading.value = false
    }
  }

  function openRejectDialog (entry: EntryDto) {
    actionTarget.value = entry
    justification.value = ''
    rejectDialog.value = true
  }

  async function handleReject () {
    if (!actionTarget.value || !justification.value.trim()) return
    actionLoading.value = true
    try {
      await rejectEntry(selectedTenant.value, actionTarget.value.id, justification.value.trim())
      showSnackbar('Entry rejected', 'success')
      rejectDialog.value = false
      detailDrawer.value = false
      loadEntries()
    } catch (error: any) {
      showSnackbar(error.message, 'error')
    } finally {
      actionLoading.value = false
    }
  }

  function openSuspendDialog (entry: EntryDto) {
    actionTarget.value = entry
    justification.value = ''
    suspendDialog.value = true
  }

  async function handleSuspend () {
    if (!actionTarget.value || !justification.value.trim()) return
    actionLoading.value = true
    try {
      await suspendEntry(selectedTenant.value, actionTarget.value.id, justification.value.trim())
      showSnackbar('Entry suspended', 'warning')
      suspendDialog.value = false
      detailDrawer.value = false
      loadEntries()
    } catch (error: any) {
      showSnackbar(error.message, 'error')
    } finally {
      actionLoading.value = false
    }
  }

  onMounted(async () => {
    try {
      tenantIds.value = await fetchTenantIds()
    } catch {
      // If tenants fail to load, we still default to earnlumens
    }
    loadEntries()
  })
</script>

<style scoped>
  .tenant-select {
    max-width: 220px;
    min-width: 180px;
  }

  .entry-card:hover {
    border-color: rgb(var(--v-theme-primary));
  }

  .entry-thumb {
    width: 100%;
    height: 140px;
    cursor: pointer;
  }

  @media (min-width: 600px) {
    .entry-thumb {
      width: 200px;
      min-width: 200px;
      height: auto;
    }
  }

  .entry-duration {
    position: absolute;
    bottom: 6px;
    right: 6px;
    background: rgba(0, 0, 0, 0.75);
    color: white;
    font-size: 11px;
    padding: 1px 5px;
    border-radius: 3px;
  }

  .cursor-pointer {
    cursor: pointer;
  }

  .resource-content {
    font-size: 14px;
    line-height: 1.6;
  }

  .resource-content :deep(img) {
    max-width: 100%;
    border-radius: 4px;
  }

  .resource-content :deep(a) {
    color: rgb(var(--v-theme-primary));
  }

  .resource-content :deep(pre) {
    overflow-x: auto;
    padding: 8px;
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.1);
  }
</style>
