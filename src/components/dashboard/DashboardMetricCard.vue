<template>
  <v-col cols="12" lg="3" sm="6">
    <v-card
      class="h-100"
      :link="!!actionTo"
      :to="actionTo"
      variant="elevated"
    >
      <v-card-item>
        <template v-if="icon" #prepend>
          <v-avatar :color="color || 'surface-variant'" rounded size="36" variant="tonal">
            <v-icon :icon="icon" />
          </v-avatar>
        </template>
        <v-card-title class="text-h5">
          <template v-if="loading">
            <v-progress-circular indeterminate size="20" width="2" />
          </template>
          <template v-else-if="placeholder || value === null || value === undefined">
            —
          </template>
          <template v-else>
            {{ formatted }}
          </template>
        </v-card-title>
        <v-card-subtitle>{{ label }}</v-card-subtitle>
        <div
          v-if="caption && !loading && !placeholder"
          class="text-caption text-medium-emphasis text-truncate mt-1"
          :title="caption"
        >
          {{ caption }}
        </div>
      </v-card-item>
    </v-card>
  </v-col>
</template>

<script lang="ts" setup>
  import { computed } from 'vue'

  const props = defineProps<{
    label: string
    value?: number | string | null
    icon?: string
    color?: string
    actionTo?: string
    loading?: boolean
    /** When true, render a placeholder em-dash instead of the value (no data wired yet). */
    placeholder?: boolean
    /** Optional small caption shown under the label (e.g. "earnlumens" for top tenant). */
    caption?: string | null
  }>()

  const formatted = computed(() => {
    if (typeof props.value === 'number') {
      return new Intl.NumberFormat().format(props.value)
    }
    return props.value ?? '—'
  })
</script>
