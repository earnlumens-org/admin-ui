<template>
  <v-container class="pa-4 pa-sm-6" fluid>
    <v-breadcrumbs class="px-0 pt-0" :items="[{ title: 'earnlumens', disabled: true }, { title: 'moderation', disabled: true }]" />

    <!-- Users with no moderation membership land here on a deep link or stale
         tab — render an explicit empty state instead of querying the root
         tenant on their behalf. -->
    <v-card v-if="!hasModerationAccess" class="pa-8 text-center" variant="tonal">
      <v-icon class="mb-3" color="medium-emphasis" size="48">mdi-shield-lock-outline</v-icon>
      <div class="text-h6 mb-1">Moderation isn't available yet</div>
      <div class="text-body-2 text-medium-emphasis mb-4">
        You'll see this queue once you create your own tenant or accept a moderation invitation.
      </div>
      <v-btn v-if="canCreateTenant" color="primary" to="/tenants" variant="flat">
        Go to tenants
      </v-btn>
    </v-card>

    <template v-else>
      <div class="d-flex flex-column flex-sm-row align-sm-center justify-space-between mb-1">
        <div>
          <div class="text-h6">Moderation</div>
          <div class="text-body-2 text-medium-emphasis mb-4 mb-sm-0">
            Content moderation pipeline — AI first, then human review
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
          @update:model-value="() => loadEntries()"
        />
      </div>

      <!-- Pipeline visualization -->
      <v-card class="mb-4" color="surface-variant" variant="tonal">
        <v-card-text class="py-3 px-4">
          <div class="d-flex align-center justify-center flex-wrap ga-3 ga-sm-4">
            <div class="d-flex align-center ga-1 text-body-2">
              <v-icon color="medium-emphasis" size="18">mdi-upload</v-icon>
              <span>New Upload</span>
            </div>
            <v-icon color="medium-emphasis" size="14">mdi-arrow-right</v-icon>
            <div
              class="d-flex align-center ga-1 text-body-2 pipeline-step cursor-pointer"
              :class="{ 'pipeline-active': tab === 'ai-processing' }"
              @click="switchTab('ai-processing')"
            >
              <v-progress-circular
                v-if="(stats?.aiProcessing ?? 0) > 0"
                color="info"
                indeterminate
                size="14"
                width="2"
              />
              <v-icon v-else color="info" size="18">mdi-robot-outline</v-icon>
              <span class="font-weight-medium">AI Analysis</span>
              <v-chip color="info" size="x-small" variant="tonal">
                {{ stats?.aiProcessing ?? 0 }}
              </v-chip>
            </div>
            <v-icon color="medium-emphasis" size="14">mdi-arrow-right</v-icon>
            <div
              class="d-flex align-center ga-1 text-body-2 pipeline-step cursor-pointer"
              :class="{ 'pipeline-active': tab === 'in-review' }"
              @click="switchTab('in-review')"
            >
              <v-icon color="warning" size="18">mdi-account-eye-outline</v-icon>
              <span class="font-weight-medium">Human Review</span>
              <v-chip color="warning" size="x-small" variant="tonal">
                {{ stats?.inReview ?? 0 }}
              </v-chip>
            </div>
            <v-icon color="medium-emphasis" size="14">mdi-arrow-right</v-icon>
            <div class="d-flex align-center ga-1 text-body-2">
              <v-icon color="success" size="18">mdi-check-circle-outline</v-icon>
              <span>Published</span>
            </div>
          </div>
        </v-card-text>
      </v-card>

      <!-- Stats chips -->
      <div v-if="stats" class="d-flex flex-wrap ga-2 mb-4">
        <v-chip prepend-icon="mdi-robot-outline" size="small" variant="tonal">
          {{ stats.aiProcessing ?? 0 }} AI processing
        </v-chip>
        <v-chip
          :color="(stats.inReview ?? 0) > 0 ? 'warning' : undefined"
          prepend-icon="mdi-clock-outline"
          size="small"
          variant="tonal"
        >
          {{ stats.inReview }} needs review
        </v-chip>
        <v-chip prepend-icon="mdi-check-circle-outline" size="small" variant="tonal">
          {{ stats.published }} published
        </v-chip>
        <v-chip
          :color="(stats.openReports ?? 0) > 0 ? 'deep-orange' : undefined"
          prepend-icon="mdi-flag-outline"
          size="small"
          variant="tonal"
        >
          {{ stats.openReports ?? 0 }} open reports
        </v-chip>
        <v-chip prepend-icon="mdi-cancel" size="small" variant="tonal">
          {{ stats.suspended }} suspended
        </v-chip>
        <v-chip prepend-icon="mdi-close-circle-outline" size="small" variant="tonal">
          {{ stats.rejected }} rejected
        </v-chip>
        <v-chip prepend-icon="mdi-archive-outline" size="small" variant="tonal">
          {{ stats.archived }} archived
        </v-chip>
        <v-chip prepend-icon="mdi-trash-can-outline" size="small" variant="tonal" color="error">
          {{ stats.deleted ?? 0 }} deleted
        </v-chip>
      </div>

      <v-divider class="mb-4" />

      <v-tabs v-model="tab" class="mb-4" @update:model-value="onTabChange">
        <v-tab value="ai-processing">
          <v-icon class="mr-1" size="16">mdi-robot-outline</v-icon>
          AI Processing
          <v-badge
            v-if="stats && (stats.aiProcessing ?? 0) > 0"
            class="ml-1"
            color="info"
            :content="stats.aiProcessing"
            inline
          />
        </v-tab>
        <v-tab value="in-review">
          <v-icon class="mr-1" size="16">mdi-account-eye-outline</v-icon>
          Human Queue
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

      <!-- Tab contextual banners -->
      <v-alert
        v-if="tab === 'ai-processing'"
        class="mb-4"
        color="info"
        density="compact"
        icon="mdi-shield-lock-outline"
        variant="tonal"
      >
        These entries are being analyzed by the automated moderation system. No human action is possible until AI processing completes.
      </v-alert>
      <v-alert
        v-if="tab === 'in-review'"
        class="mb-4"
        color="warning"
        density="compact"
        icon="mdi-alert-outline"
        variant="tonal"
      >
        These entries were flagged by the AI system and require human review.
      </v-alert>

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
        <v-icon color="medium-emphasis" size="48">
          {{ tab === 'ai-processing' ? 'mdi-robot-happy-outline' : tab === 'in-review' ? 'mdi-check-decagram-outline' : 'mdi-file-check-outline' }}
        </v-icon>
        <div class="text-body-1 mt-4">
          {{ tab === 'ai-processing'
            ? 'No entries in AI processing'
            : tab === 'in-review'
              ? 'No entries awaiting human review'
              : 'No entries found'
          }}
        </div>
        <div class="text-body-2 text-medium-emphasis mt-1">
          {{ tab === 'ai-processing'
            ? 'New uploads will appear here while the automated system analyzes them.'
            : tab === 'in-review'
              ? 'All flagged entries have been reviewed. Great work!'
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
          :class="{ 'entry-card-locked': tab === 'ai-processing' }"
          variant="outlined"
        >
          <div class="d-flex flex-column flex-sm-row">
            <!-- Media -->
            <div class="entry-media flex-shrink-0 cursor-pointer" @click="openDetail(entry)">
              <v-img
                v-if="entry.thumbnailR2Key"
                :aspect-ratio="16/9"
                class="fill-height rounded-ts rounded-te rounded-sm-ts rounded-sm-bs rounded-sm-te-0"
                cover
                :src="cdnUrl(entry.thumbnailR2Key)"
              >
                <template #placeholder>
                  <div class="d-flex align-center justify-center fill-height bg-surface-light">
                    <v-icon color="medium-emphasis">mdi-image-outline</v-icon>
                  </div>
                </template>
                <div v-if="entry.durationSec" class="entry-duration">
                  {{ formatDuration(entry.durationSec) }}
                </div>
                <div v-if="tab === 'ai-processing'" class="entry-processing-overlay d-flex align-center justify-center">
                  <v-progress-circular color="white" indeterminate size="24" width="2" />
                </div>
              </v-img>
              <div v-else class="d-flex flex-column align-center justify-center fill-height bg-surface-light rounded-ts rounded-te rounded-sm-ts rounded-sm-bs rounded-sm-te-0">
                <v-icon color="medium-emphasis" size="36">{{ typeIcon(entry.type) }}</v-icon>
              </div>
            </div>

            <!-- Content -->
            <div class="flex-grow-1 pa-3 d-flex flex-column" style="min-width: 0">
              <div class="d-flex align-start justify-space-between ga-2">
                <div style="min-width: 0; flex: 1">
                  <div class="text-body-2 font-weight-medium text-truncate cursor-pointer" @click="openDetail(entry)">
                    {{ entry.title }}
                  </div>
                  <div class="d-flex align-center flex-wrap ga-1 mt-1">
                    <span class="text-caption text-medium-emphasis">
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
                <v-menu v-if="tab !== 'ai-processing'">
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
                      prepend-icon="mdi-eye-outline"
                      title="View details"
                      @click="openDetail(entry)"
                    />
                    <v-list-item
                      v-if="entry.moderationFeedback && (entry.status === 'REJECTED' || entry.status === 'SUSPENDED')"
                      class="text-warning"
                      prepend-icon="mdi-alert-circle-outline"
                      title="View moderation feedback"
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
                <!-- Locked indicator for AI processing -->
                <v-tooltip v-else location="top" text="Locked — AI is analyzing this entry">
                  <template #activator="{ props: tooltipProps }">
                    <v-icon v-bind="tooltipProps" color="info" size="16">mdi-lock-outline</v-icon>
                  </template>
                </v-tooltip>
              </div>

              <!-- AI flag / AI unavailable -->
              <div
                v-if="jobSummaries[entry.id]?.decision === 'MANUAL_QUEUE'"
                class="flag-indicator d-flex align-start ga-2 mt-2"
                :class="isAiUnavailable(jobSummaries[entry.id].categoriesDetected) ? 'flag-unavailable' : 'flag-ai'"
              >
                <v-icon
                  class="flex-shrink-0 mt-px"
                  :color="isAiUnavailable(jobSummaries[entry.id].categoriesDetected) ? 'warning' : 'error'"
                  size="14"
                >
                  {{ isAiUnavailable(jobSummaries[entry.id].categoriesDetected) ? 'mdi-cloud-off-outline' : 'mdi-alert-decagram' }}
                </v-icon>
                <div style="min-width: 0; flex: 1">
                  <span class="text-caption font-weight-medium">
                    {{ isAiUnavailable(jobSummaries[entry.id].categoriesDetected)
                      ? 'AI unavailable — needs human review'
                      : `Flagged by ${jobSummaries[entry.id].decidingStep || 'AI'}` }}
                  </span>
                  <span
                    v-if="jobSummaries[entry.id].confidence != null && !isAiUnavailable(jobSummaries[entry.id].categoriesDetected)"
                    class="text-caption text-medium-emphasis"
                  >
                    · {{ Math.round((jobSummaries[entry.id].confidence ?? 0) * 100) }}%
                  </span>
                  <div
                    v-if="jobSummaries[entry.id].decisionReason"
                    class="text-caption text-medium-emphasis reason-text"
                    :class="{ 'reason-clamped': !expandedReasons.has(entry.id) }"
                    @click.stop="toggleReason(entry.id)"
                  >
                    {{ jobSummaries[entry.id].decisionReason }}
                  </div>
                  <div v-if="(jobSummaries[entry.id].categoriesDetected?.length ?? 0) > 0" class="d-flex flex-wrap ga-1 mt-1">
                    <v-chip
                      v-for="cat in jobSummaries[entry.id].categoriesDetected"
                      :key="cat"
                      :color="isAiUnavailable([cat]) ? 'warning' : 'error'"
                      size="x-small"
                      variant="flat"
                    >
                      {{ cat }}
                    </v-chip>
                  </div>
                </div>
              </div>

              <!-- User reports -->
              <div
                v-if="reportSummaries[entry.id]"
                class="flag-indicator flag-report d-flex align-center ga-2 mt-2"
              >
                <v-icon class="flex-shrink-0" :color="severityColor(reportSummaries[entry.id].maxSeverity)" size="14">mdi-flag</v-icon>
                <span class="text-caption font-weight-medium">
                  {{ reportSummaries[entry.id].reportCount }} report{{ reportSummaries[entry.id].reportCount > 1 ? 's' : '' }}
                  · P{{ reportSummaries[entry.id].maxPriority }}
                </span>
                <div v-if="reportSummaries[entry.id].reasons.length > 0" class="d-flex flex-wrap ga-1">
                  <v-chip
                    v-for="reason in reportSummaries[entry.id].reasons"
                    :key="reason"
                    :color="severityColor(reportSummaries[entry.id].maxSeverity)"
                    size="x-small"
                    variant="flat"
                  >
                    {{ reason }}
                  </v-chip>
                </div>
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
                <v-spacer />
                <!-- Moderation actor badge -->
                <v-chip
                  v-if="tab === 'ai-processing'"
                  color="info"
                  label
                  size="x-small"
                  variant="tonal"
                >
                  <v-progress-circular class="mr-1" indeterminate size="10" width="1" />
                  AI analyzing
                </v-chip>
                <v-chip
                  v-else-if="getActorInfo(entry).type !== 'unknown'"
                  :color="getActorInfo(entry).color"
                  label
                  :prepend-icon="getActorInfo(entry).icon"
                  size="x-small"
                  variant="tonal"
                >
                  {{ getActorInfo(entry).label }}
                </v-chip>
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
            @update:model-value="() => loadEntries()"
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

            <!-- Moderation actor highlight -->
            <v-card
              class="mb-4 pa-3"
              :color="getActorInfo(detailEntry).type === 'ai' ? 'info' : getActorInfo(detailEntry).type === 'human' ? 'primary' : 'warning'"
              density="compact"
              variant="tonal"
            >
              <div class="d-flex align-center ga-2">
                <v-icon size="18">{{ getActorInfo(detailEntry).icon }}</v-icon>
                <div>
                  <div class="text-caption font-weight-medium">{{ getActorInfo(detailEntry).actionLabel }}</div>
                  <div class="text-caption text-medium-emphasis">{{ getActorInfo(detailEntry).label }}</div>
                </div>
              </div>
            </v-card>

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

            <!-- Moderation feedback -->
            <v-alert
              v-if="detailEntry.moderationFeedback"
              class="mb-4"
              :color="detailEntry.status === 'SUSPENDED' ? 'warning' : 'error'"
              density="compact"
              :icon="detailEntry.status === 'SUSPENDED' ? 'mdi-alert-circle-outline' : 'mdi-close-circle-outline'"
              :title="detailEntry.status === 'SUSPENDED' ? 'Suspension reason' : 'Rejection reason'"
              variant="tonal"
            >
              {{ detailEntry.moderationFeedback }}
            </v-alert>

            <!-- Attached Assets -->
            <div v-if="entryAssets.length > 0" class="mb-4">
              <div class="text-caption text-medium-emphasis mb-2">Attached Files ({{ entryAssets.length }})</div>
              <v-card
                v-for="asset in entryAssets"
                :key="asset.id"
                class="mb-2 pa-3"
                density="compact"
                variant="outlined"
              >
                <div class="d-flex align-center ga-2">
                  <v-icon :color="assetKindColor(asset.kind)" size="18">{{ assetKindIcon(asset.kind) }}</v-icon>
                  <div class="flex-grow-1" style="min-width: 0">
                    <div class="text-caption font-weight-medium text-truncate">{{ asset.fileName || asset.r2Key }}</div>
                    <div class="text-caption text-medium-emphasis">
                      {{ asset.kind }}
                      <span v-if="asset.contentType"> · {{ asset.contentType }}</span>
                      <span v-if="asset.fileSizeBytes"> · {{ formatFileSize(asset.fileSizeBytes) }}</span>
                    </div>
                  </div>
                  <v-chip :color="asset.status === 'READY' ? 'success' : 'warning'" label size="x-small" variant="tonal">{{ asset.status }}</v-chip>
                </div>
              </v-card>
            </div>

            <!-- AI Moderation Jobs -->
            <div v-if="moderationJobs.length > 0" class="mb-4">
              <div class="text-caption text-medium-emphasis mb-2">AI Moderation History</div>
              <v-card
                v-for="job in moderationJobs"
                :key="job.id"
                class="mb-2"
                density="compact"
                variant="tonal"
              >
                <v-card-text class="pa-3">
                  <div class="d-flex align-center flex-wrap ga-2 mb-2">
                    <v-chip
                      :color="job.status === 'COMPLETED' ? (job.decision === 'APPROVE' ? 'success' : job.decision === 'REJECT' ? 'error' : 'warning') : job.status === 'DEAD' || job.status === 'FAILED' ? 'error' : 'info'"
                      label
                      size="x-small"
                      variant="flat"
                    >
                      {{ job.status }}
                    </v-chip>
                    <v-chip
                      v-if="job.decision"
                      :color="job.decision === 'APPROVE' ? 'success' : job.decision === 'REJECT' ? 'error' : 'warning'"
                      label
                      size="x-small"
                      variant="outlined"
                    >
                      {{ job.decision }}
                    </v-chip>
                    <v-chip
                      v-if="job.confidence != null"
                      label
                      size="x-small"
                      variant="outlined"
                    >
                      {{ (job.confidence * 100).toFixed(0) }}% confidence
                    </v-chip>
                  </div>

                  <div v-if="job.decidingStep" class="text-caption mb-1">
                    <span class="text-medium-emphasis">Pipeline step:</span> {{ job.decidingStep }}
                  </div>
                  <div v-if="job.decisionReason" class="text-caption mb-1">
                    <span class="text-medium-emphasis">Reason:</span> {{ job.decisionReason }}
                  </div>
                  <div v-if="job.categoriesDetected?.length" class="d-flex flex-wrap ga-1 mb-1">
                    <v-chip
                      v-for="cat in job.categoriesDetected"
                      :key="cat"
                      color="deep-orange"
                      label
                      size="x-small"
                      variant="tonal"
                    >
                      {{ cat }}
                    </v-chip>
                  </div>
                  <div v-if="job.errorMessage" class="text-caption text-error mb-1">
                    Error: {{ job.errorMessage }}
                  </div>
                  <div v-if="job.retryCount > 0" class="text-caption text-medium-emphasis mb-1">
                    Retries: {{ job.retryCount }}/{{ job.maxRetries }}
                  </div>

                  <v-divider class="my-2" />
                  <div class="d-flex flex-wrap ga-3 text-caption text-medium-emphasis">
                    <span>Created: {{ formatDate(job.createdAt) }}</span>
                    <span v-if="job.dispatchedAt">Dispatched: {{ formatDate(job.dispatchedAt) }}</span>
                    <span v-if="job.processingStartedAt">Started: {{ formatDate(job.processingStartedAt) }}</span>
                    <span v-if="job.completedAt">Completed: {{ formatDate(job.completedAt) }}</span>
                  </div>
                </v-card-text>
              </v-card>
            </div>

            <!-- User Reports -->
            <div v-if="detailReports.length > 0" class="mb-4">
              <div class="text-caption text-medium-emphasis mb-2">
                User Reports ({{ detailReports.length }})
              </div>
              <v-card
                v-for="report in detailReports"
                :key="report.id"
                class="mb-2"
                density="compact"
                variant="tonal"
              >
                <v-card-text class="pa-3">
                  <div class="d-flex align-center ga-2 mb-1">
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
                      :color="report.resolution === 'OPEN' ? 'warning' : report.resolution === 'DISMISSED' ? 'grey' : 'success'"
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
                  <div class="text-caption">
                    Reporter: <strong>{{ report.reporterUsername || report.reporterUserId }}</strong>
                  </div>
                  <div v-if="report.comment" class="text-caption text-medium-emphasis mt-1" style="max-width: 380px">
                    {{ report.comment }}
                  </div>
                  <div class="text-caption text-disabled mt-1">
                    {{ formatDate(report.createdAt) }}
                    <span v-if="report.resolvedBy"> · Resolved by {{ report.resolvedBy }}</span>
                  </div>
                  <!-- Resolve actions for open reports -->
                  <div v-if="report.resolution === 'OPEN'" class="d-flex ga-2 mt-3">
                    <v-btn
                      color="grey"
                      prepend-icon="mdi-close-circle-outline"
                      size="small"
                      variant="tonal"
                      @click="openReportConfirm(report, 'DISMISSED')"
                    >
                      Dismiss
                    </v-btn>
                    <v-btn
                      color="warning"
                      prepend-icon="mdi-alert-outline"
                      size="small"
                      variant="flat"
                      @click="openReportConfirm(report, 'SANCTIONED')"
                    >
                      Sanction
                    </v-btn>
                    <v-btn
                      color="error"
                      prepend-icon="mdi-delete-outline"
                      size="small"
                      variant="flat"
                      @click="openReportConfirm(report, 'REMOVED')"
                    >
                      Remove
                    </v-btn>
                  </div>
                </v-card-text>
              </v-card>
            </div>

            <!-- Status History -->
            <div v-if="detailEntry.statusHistory?.length" class="mb-4">
              <div class="text-caption text-medium-emphasis mb-2">Status History</div>
              <v-timeline density="compact" side="end">
                <v-timeline-item
                  v-for="(record, idx) in detailEntry.statusHistory"
                  :key="idx"
                  :dot-color="statusColor(record.toStatus) || 'grey'"
                  size="x-small"
                >
                  <div class="text-caption">
                    <v-chip :color="statusColor(record.fromStatus)" label size="x-small" variant="tonal">{{ record.fromStatus }}</v-chip>
                    <v-icon class="mx-1" size="x-small">mdi-arrow-right</v-icon>
                    <v-chip :color="statusColor(record.toStatus)" label size="x-small" variant="tonal">{{ record.toStatus }}</v-chip>
                    <span v-if="record.actor" class="text-medium-emphasis ml-2">by {{ record.actor }}</span>
                  </div>
                  <div v-if="record.reason" class="text-caption text-medium-emphasis mt-1" style="max-width: 340px">
                    {{ record.reason }}
                  </div>
                  <div class="text-caption text-disabled mt-1">
                    {{ formatDate(record.timestamp) }}
                  </div>
                </v-timeline-item>
              </v-timeline>
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

      <!-- Report resolve confirmation -->
      <v-dialog v-model="reportConfirmDialog" max-width="480" persistent>
        <v-card>
          <v-card-title class="d-flex align-center ga-2">
            <v-icon :color="reportConfirmMeta.color" :icon="reportConfirmMeta.icon" />
            {{ reportConfirmMeta.title }}
          </v-card-title>
          <v-card-text>
            <div class="text-body-2 mb-3">{{ reportConfirmMeta.description }}</div>
            <v-alert
              class="mb-3"
              color="warning"
              density="compact"
              icon="mdi-account-eye"
              variant="tonal"
            >
              This action will be recorded under your admin username.
            </v-alert>
            <div v-if="reportConfirmTarget" class="text-caption text-medium-emphasis">
              Reason: <strong>{{ reportConfirmTarget.reason }}</strong> · Priority: <strong>{{ reportConfirmTarget.priorityScore }}</strong>
            </div>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="reportConfirmDialog = false">Cancel</v-btn>
            <v-btn
              :color="reportConfirmMeta.color"
              :loading="resolveLoading !== null"
              variant="flat"
              @click="executeResolveReport"
            >
              {{ reportConfirmMeta.action }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Snackbar -->
      <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000">
        {{ snackbarText }}
      </v-snackbar>
    </template>
  </v-container>
</template>

<script lang="ts" setup>
  import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
  import { useRoute } from 'vue-router'
  import {
    approveEntry,
    type AssetDto,
    type ContentUrlResponse,
    type EntryDto,
    fetchContentUrl,
    fetchEntries,
    fetchEntry,
    fetchEntryAssets,
    fetchEntryReports,
    fetchJobSummaries,
    fetchModerationJobs,
    fetchModerationStats,
    fetchReportSummaries,
    fetchTenantIds,
    type ModerationJobDto,
    type ModerationStats,
    rejectEntry,
    type ReportDto,
    type ReportSummary,
    resolveReport,
    suspendEntry,
  } from '@/api/moderation'
  import { useSidebarBadges } from '@/composables/useSidebarBadges'
  import { useTenantLabels } from '@/composables/useTenantLabels'
  import { useWindowSize } from '@/composables/useWindowSize'
  import { CDN_BASE_URL } from '@/config/env'
  import { allUserTenants, useAuthStore } from '@/stores/auth'

  const { width: windowWidth } = useWindowSize()
  const { refresh: refreshBadges } = useSidebarBadges()
  const route = useRoute()

  // Report resolve confirmation
  const reportConfirmDialog = ref(false)
  const reportConfirmTarget = ref<ReportDto | null>(null)
  const reportConfirmResolution = ref('')

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

  const reportConfirmMeta = computed(() => RESOLUTION_META[reportConfirmResolution.value] ?? RESOLUTION_META.DISMISSED)

  const authStore = useAuthStore()
  const isSuperadmin = computed(() => authStore.user?.role === 'SUPERADMIN')
  const isTenantOwner = computed(() => (authStore.user?.tenantAdminOf?.length ?? 0) > 0)
  const isModerator = computed(() => (authStore.user?.moderatorOf?.length ?? 0) > 0)
  const canCreateTenant = computed(() => authStore.user?.canCreateTenant === true)
  // Gate the whole page: blue-credential creators that haven't created a
  // tenant yet have no business hitting any tenant's moderation queue, and
  // defaulting them to 'earnlumens' would silently leak the root tenant.
  const hasModerationAccess = computed(
    () => isSuperadmin.value || isTenantOwner.value || isModerator.value,
  )
  const { labelFor: tenantLabel } = useTenantLabels()

  // Initial tenant: respect the central tenant context (top-right switcher)
  // when set; otherwise superadmin keeps the legacy 'earnlumens' default and
  // anyone else lands on the first tenant their JWT actually grants access to,
  // so the first API call doesn't 403 against a tenant they can't see.
  function defaultTenant (): string {
    if (authStore.activeTenantId) return authStore.activeTenantId
    if (authStore.user?.role === 'SUPERADMIN') return 'earnlumens'
    const accessible = allUserTenants(authStore.user)
    // Empty string is fine: the page is gated by hasModerationAccess, so no
    // request is ever issued in this branch. We deliberately do NOT fall
    // back to 'earnlumens' here — that was the source of a privilege bug.
    return accessible[0] ?? ''
  }

  // State
  const tab = ref('in-review')
  const selectedTenant = ref(defaultTenant())
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
  const moderationJobs = ref<ModerationJobDto[]>([])
  const entryAssets = ref<AssetDto[]>([])
  const jobSummaries = ref<Record<string, ModerationJobDto>>({})
  const reportSummaries = ref<Record<string, ReportSummary>>({})
  const detailReports = ref<ReportDto[]>([])
  const resolveLoading = ref<string | null>(null)
  const expandedReasons = ref(new Set<string>())

  function toggleReason (entryId: string) {
    const next = new Set(expandedReasons.value)
    if (next.has(entryId)) next.delete(entryId)
    else next.add(entryId)
    expandedReasons.value = next
  }

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
    { value: 'DELETED', label: 'Deleted', color: 'error' },
  ]

  const tenantOptions = computed(() => {
    // Non-superadmin (tenant owner / moderator): restrict the dropdown to the
    // tenants the JWT actually grants access to. Hide the "All tenants" pseudo
    // option entirely so they can't try to query content they don't own/moderate.
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
      case 'DELETED': { return 'error'
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

  function formatFileSize (bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }

  function assetKindIcon (kind: string): string {
    switch (kind) {
      case 'FULL': { return 'mdi-file' }
      case 'THUMBNAIL': { return 'mdi-image' }
      case 'PREVIEW': { return 'mdi-eye' }
      default: { return 'mdi-file-question' }
    }
  }

  function assetKindColor (kind: string): string {
    switch (kind) {
      case 'FULL': { return 'primary' }
      case 'THUMBNAIL': { return 'info' }
      case 'PREVIEW': { return 'secondary' }
      default: { return 'grey' }
    }
  }

  interface ActorInfo {
    type: 'ai' | 'human' | 'pending' | 'unknown'
    label: string
    icon: string
    color: string
    actionLabel: string
  }

  // GEMINI_UNAVAILABLE (current) / GEMINI_ERROR (legacy) mean the AI
  // provider itself was down or errored — the content was never actually
  // evaluated, so we MUST NOT label it "flagged by AI". Surfacing them as
  // a distinct "AI unavailable" state stops moderators from assuming the
  // model has an opinion when it doesn't.
  function isAiUnavailable (categories: string[] | null | undefined): boolean {
    if (!categories || categories.length === 0) return false
    return categories.some(c => c === 'GEMINI_UNAVAILABLE' || c === 'GEMINI_ERROR')
  }

  function getActorInfo (entry: EntryDto): ActorInfo {
    if (entry.status === 'IN_REVIEW') {
      const job = jobSummaries.value[entry.id]
      if (job?.decision === 'MANUAL_QUEUE') {
        if (isAiUnavailable(job.categoriesDetected)) {
          return {
            type: 'pending',
            label: 'AI unavailable — awaiting human review',
            icon: 'mdi-cloud-off-outline',
            color: 'warning',
            actionLabel: 'AI Unavailable',
          }
        }
        const categories = job.categoriesDetected?.join(', ') || ''
        const label = categories
          ? `AI flagged: ${categories}`
          : 'AI flagged for review'
        return { type: 'ai', label, icon: 'mdi-alert-decagram-outline', color: 'error', actionLabel: 'AI Flagged' }
      }
      return { type: 'pending', label: 'Awaiting human review', icon: 'mdi-clock-outline', color: 'warning', actionLabel: 'Pending' }
    }

    const history = (entry.statusHistory || []).toReversed()
    const decision = history.find(r =>
      ['APPROVED', 'PUBLISHED', 'REJECTED', 'SUSPENDED'].includes(r.toStatus),
    )

    if (!decision) {
      return { type: 'unknown', label: '', icon: 'mdi-help-circle-outline', color: 'grey', actionLabel: '' }
    }

    const actionMap: Record<string, string> = {
      APPROVED: 'Approved',
      PUBLISHED: 'Published',
      REJECTED: 'Rejected',
      SUSPENDED: 'Suspended',
    }
    const action = actionMap[decision.toStatus] || decision.toStatus

    if (decision.actor) {
      return {
        type: 'human',
        label: decision.actor,
        icon: 'mdi-account-check',
        color: 'primary',
        actionLabel: `${action} by moderator`,
      }
    }

    return {
      type: 'ai',
      label: 'AI System',
      icon: 'mdi-robot-outline',
      color: 'info',
      actionLabel: `Auto-${action.toLowerCase()}`,
    }
  }

  function switchTab (value: string) {
    tab.value = value
    onTabChange()
  }

  function showSnackbar (text: string, color: string) {
    snackbarText.value = text
    snackbarColor.value = color
    snackbar.value = true
  }

  async function loadEntries (silent = false) {
    if (!hasModerationAccess.value || !selectedTenant.value) return
    // Silent refreshes (background polling) intentionally skip the
    // full-screen spinner so a moderator who is reviewing an entry is
    // not bounced back to a loading state every 30 seconds. The list
    // is replaced atomically when the new page arrives.
    if (!silent) loading.value = true
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

      // Fetch AI job summaries for in-review entries
      if (tab.value === 'in-review' && pageData.content.length > 0) {
        try {
          const ids = pageData.content.map(e => e.id)
          jobSummaries.value = await fetchJobSummaries(selectedTenant.value, ids)
        } catch {
          jobSummaries.value = {}
        }
      } else {
        jobSummaries.value = {}
      }

      // Fetch report summaries for all visible entries
      if (pageData.content.length > 0) {
        try {
          const ids = pageData.content.map(e => e.id)
          reportSummaries.value = await fetchReportSummaries(selectedTenant.value, ids)
        } catch {
          reportSummaries.value = {}
        }
      } else {
        reportSummaries.value = {}
      }
    } catch {
      showSnackbar('Failed to load entries', 'error')
    } finally {
      if (!silent) loading.value = false
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
    moderationJobs.value = []
    entryAssets.value = []
    detailReports.value = []
    loadContentUrl(entry)
    loadModerationJobs(entry)
    loadEntryReports(entry)
    loadEntryAssets(entry)
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

  async function loadModerationJobs (entry: EntryDto) {
    try {
      moderationJobs.value = await fetchModerationJobs(selectedTenant.value, entry.id)
    } catch {
      moderationJobs.value = []
    }
  }

  async function loadEntryAssets (entry: EntryDto) {
    try {
      entryAssets.value = await fetchEntryAssets(selectedTenant.value, entry.id)
    } catch {
      entryAssets.value = []
    }
  }

  async function loadEntryReports (entry: EntryDto) {
    try {
      detailReports.value = await fetchEntryReports(selectedTenant.value, entry.id)
    } catch {
      detailReports.value = []
    }
  }

  function openReportConfirm (report: ReportDto, resolution: string) {
    reportConfirmTarget.value = report
    reportConfirmResolution.value = resolution
    reportConfirmDialog.value = true
  }

  async function executeResolveReport () {
    if (!reportConfirmTarget.value) return
    resolveLoading.value = reportConfirmTarget.value.id
    try {
      await resolveReport(reportConfirmTarget.value.id, reportConfirmResolution.value)
      reportConfirmDialog.value = false
      if (detailEntry.value) {
        await loadEntryReports(detailEntry.value)
        // Reload entry if it was suspended
        if (reportConfirmResolution.value !== 'DISMISSED') {
          const refreshed = await fetchEntry(selectedTenant.value, detailEntry.value.id)
          detailEntry.value = refreshed
        }
      }
      showSnackbar(`Report ${reportConfirmResolution.value.toLowerCase()}`, 'success')
      refreshBadges()
      loadEntries()
    } catch (error: any) {
      showSnackbar(error.message, 'error')
    } finally {
      resolveLoading.value = null
    }
  }

  function severityColor (severity: string) {
    switch (severity) {
      case 'HIGH': { return 'error' }
      case 'MEDIUM': { return 'warning' }
      case 'LOW': { return 'info' }
      default: { return 'grey' }
    }
  }

  async function handleApprove (entry: EntryDto) {
    actionLoading.value = true
    try {
      await approveEntry(selectedTenant.value, entry.id)
      showSnackbar('Entry approved', 'success')
      detailDrawer.value = false
      loadEntries()
      refreshBadges()
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
      refreshBadges()
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
      refreshBadges()
    } catch (error: any) {
      showSnackbar(error.message, 'error')
    } finally {
      actionLoading.value = false
    }
  }

  let pollId: ReturnType<typeof setInterval> | null = null

  // Keep this page in sync with the global tenant context. When the user picks
  // a tenant in the top-right TenantSwitcher we mirror the choice into the
  // in-page filter and reload, so the moderation queue always reflects the
  // tenant currently selected globally.
  watch(() => authStore.activeTenantId, newId => {
    if (!newId || newId === selectedTenant.value) return
    selectedTenant.value = newId
    currentPage.value = 1
    loadEntries()
  })

  onMounted(async () => {
    // Only superadmin needs the cross-tenant list — everyone else either has
    // a single owned tenant (TENANT_ADMIN) or a fixed moderator scope, so the
    // backend deliberately 403s the all-tenants endpoint for them.
    if (isSuperadmin.value) {
      try {
        tenantIds.value = await fetchTenantIds()
      } catch {
        // If tenants fail to load, we still default to earnlumens
      }
    }

    // Deep link: /moderation?tab=all&entryId=xxx&tenantId=yyy
    const qTab = route.query.tab as string | undefined
    const qEntryId = route.query.entryId as string | undefined
    const qTenantId = route.query.tenantId as string | undefined

    if (qTenantId) selectedTenant.value = qTenantId
    if (qTab) tab.value = qTab

    await loadEntries()

    if (qEntryId) {
      try {
        const entry = await fetchEntry(selectedTenant.value, qEntryId)
        openDetail(entry)
      } catch {
        showSnackbar('Entry not found', 'error')
      }
    }

    pollId = setInterval(() => loadEntries(true), 30_000)
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

  .entry-card:hover {
    border-color: rgb(var(--v-theme-primary));
  }

  .entry-media {
    width: 100%;
    height: 120px;
    overflow: hidden;
  }

  @media (min-width: 600px) {
    .entry-media {
      width: 180px;
      min-width: 180px;
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

  .flag-indicator {
    padding: 6px 10px;
    border-radius: 6px;
  }

  .flag-ai {
    background: rgba(var(--v-theme-error), 0.08);
  }

  .flag-unavailable {
    background: rgba(var(--v-theme-warning), 0.08);
  }

  .flag-report {
    background: rgba(var(--v-theme-warning), 0.08);
  }

  .reason-text {
    cursor: pointer;
  }

  .reason-text:hover {
    text-decoration: underline;
    text-decoration-style: dotted;
  }

  .reason-clamped {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
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

  .pipeline-step {
    padding: 4px 8px;
    border-radius: 6px;
    transition: background-color 0.2s;
  }

  .pipeline-step:hover {
    background: rgba(var(--v-theme-on-surface), 0.05);
  }

  .pipeline-active {
    background: rgba(var(--v-theme-on-surface), 0.08);
  }

  .entry-card-locked {
    opacity: 0.75;
    border-style: dashed !important;
  }

  .entry-card-locked:hover {
    border-color: rgb(var(--v-theme-info)) !important;
  }

  .entry-processing-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    border-radius: inherit;
  }
</style>
