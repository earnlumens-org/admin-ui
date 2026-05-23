<!--
  /settings/theme — per-tenant default light & dark Vuetify themes.

  Two independent pickers, one card per theme, with a compact swatch strip
  that previews the palette (background, surface, primary, secondary,
  accent + foreground text) without faking a full storefront render. The
  light and dark catalogues are split at the source so a dark theme can
  never be picked as the "light default" (and vice-versa).

  Saving goes through the same composable as every other settings page —
  admin-api invalidates the storefront cache on success, so the visitor
  picks up the new defaults on their next page load.
-->
<template>
  <v-container class="pa-4 pa-sm-6" fluid>
    <v-breadcrumbs
      class="px-0 pt-0"
      :items="[
        { title: 'earnlumens', disabled: true },
        { title: 'settings', to: '/settings' },
        { title: 'theme', disabled: true },
      ]"
    />

    <div class="d-flex align-center mb-1">
      <v-btn
        class="me-2"
        icon="mdi-arrow-left"
        size="small"
        to="/settings"
        variant="text"
      />

      <div class="text-h6">Theme defaults</div>
    </div>

    <div class="text-body-2 text-medium-emphasis mb-4">
      Pick the light and dark themes your storefront should start with.
      Returning visitors who already chose a theme keep their selection;
      first-time visitors and the dark/light toggle pick from the defaults
      below.
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
        <v-btn size="small" variant="text" @click="loadTenant">Retry</v-btn>
      </template>
    </v-alert>

    <v-form
      v-else-if="tenant"
      ref="form"
      @submit.prevent="save"
    >
      <v-row>
        <v-col cols="12" lg="6">
          <v-card>
            <v-card-item>
              <template #prepend>
                <v-icon color="amber-darken-2" icon="mdi-white-balance-sunny" size="large" />
              </template>

              <v-card-title>Light theme default</v-card-title>

              <v-card-subtitle>
                Used when the visitor lands in light mode and has not picked a
                theme yet.
              </v-card-subtitle>
            </v-card-item>

            <v-card-text>
              <v-btn
                v-if="draft.defaultLightTheme"
                class="mb-3"
                prepend-icon="mdi-restore"
                size="small"
                variant="text"
                @click="draft.defaultLightTheme = null"
              >
                Use platform default
              </v-btn>

              <div class="theme-grid">
                <button
                  v-for="t in LIGHT_THEMES"
                  :key="t.key"
                  class="theme-card"
                  :class="{ 'theme-card--selected': draft.defaultLightTheme === t.key }"
                  type="button"
                  @click="draft.defaultLightTheme = t.key"
                >
                  <ThemeSwatch :theme="t" />

                  <div class="theme-card__label">
                    {{ t.label }}
                    <v-icon
                      v-if="draft.defaultLightTheme === t.key"
                      color="primary"
                      icon="mdi-check-circle"
                      size="small"
                    />
                  </div>
                </button>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" lg="6">
          <v-card>
            <v-card-item>
              <template #prepend>
                <v-icon color="indigo-lighten-2" icon="mdi-weather-night" size="large" />
              </template>

              <v-card-title>Dark theme default</v-card-title>

              <v-card-subtitle>
                Used when the visitor lands in dark mode and has not picked a
                theme yet.
              </v-card-subtitle>
            </v-card-item>

            <v-card-text>
              <v-btn
                v-if="draft.defaultDarkTheme"
                class="mb-3"
                prepend-icon="mdi-restore"
                size="small"
                variant="text"
                @click="draft.defaultDarkTheme = null"
              >
                Use platform default
              </v-btn>

              <div class="theme-grid">
                <button
                  v-for="t in DARK_THEMES"
                  :key="t.key"
                  class="theme-card"
                  :class="{ 'theme-card--selected': draft.defaultDarkTheme === t.key }"
                  type="button"
                  @click="draft.defaultDarkTheme = t.key"
                >
                  <ThemeSwatch :theme="t" />

                  <div class="theme-card__label">
                    {{ t.label }}
                    <v-icon
                      v-if="draft.defaultDarkTheme === t.key"
                      color="primary"
                      icon="mdi-check-circle"
                      size="small"
                    />
                  </div>
                </button>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <div class="d-flex align-center justify-end ga-2 mt-4 flex-wrap">
        <span class="text-caption text-medium-emphasis">
          Refresh the tenant site to apply. Defaults activate via
          <v-icon icon="mdi-theme-light-dark" size="small" />.
        </span>

        <v-btn :disabled="!isDirty || saving" variant="text" @click="reset">
          Discard
        </v-btn>

        <v-btn
          color="primary"
          :disabled="!isDirty"
          :loading="saving"
          type="submit"
          variant="flat"
        >
          Save changes
        </v-btn>
      </div>
    </v-form>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000">
      {{ snackbarText }}
    </v-snackbar>
  </v-container>
</template>

<script lang="ts" setup>
  import type { TenantSummary, UpdateTenantSettingsPayload } from '@/api/tenants'
  import type { ThemeMeta } from '@/config/themeCatalog'

  import { computed, defineComponent, h, reactive, ref, watch } from 'vue'

  import { useTenantSettings } from '@/composables/useTenantSettings'
  import { DARK_THEMES, LIGHT_THEMES } from '@/config/themeCatalog'

  const {
    tenant, loading, loadError, saving, loadTenant, saveTenant,
    snackbar, snackbarText, snackbarColor,
  } = useTenantSettings()

  const form = ref<any>(null)

  const draft = reactive<{
    defaultLightTheme: string | null
    defaultDarkTheme: string | null
  }>({
    defaultLightTheme: null,
    defaultDarkTheme: null,
  })

  // Inline functional swatch — kept here (rather than its own file) because
  // it has no consumers outside this page and we want the markup co-located
  // with the picker that depends on it.
  const ThemeSwatch = defineComponent({
    props: {
      theme: { type: Object as () => ThemeMeta, required: true },
    },
    setup (props) {
      return () => {
        const c = props.theme.colors
        return h('div', {
          class: 'theme-swatch',
          style: {
            background: c.background,
            color: c.onBackground,
          },
        }, [
          h('div', { class: 'theme-swatch__row' }, [
            h('span', { class: 'theme-swatch__pill', style: { background: c.surface, color: c.onBackground } }, 'Aa'),
            h('span', { class: 'theme-swatch__dot', style: { background: c.primary } }),
            h('span', { class: 'theme-swatch__dot', style: { background: c.secondary } }),
            h('span', { class: 'theme-swatch__dot', style: { background: c.accent } }),
          ]),
          h('div', { class: 'theme-swatch__bar', style: { background: c.primary } }),
        ])
      }
    },
  })

  function snapshot (t: TenantSummary) {
    draft.defaultLightTheme = t.defaultLightTheme ?? null
    draft.defaultDarkTheme = t.defaultDarkTheme ?? null
  }

  function reset () {
    if (tenant.value) snapshot(tenant.value)
  }

  watch(tenant, t => {
    if (t) snapshot(t)
  }, { immediate: true })

  const isDirty = computed(() => {
    if (!tenant.value) return false
    return draft.defaultLightTheme !== (tenant.value.defaultLightTheme ?? null)
      || draft.defaultDarkTheme !== (tenant.value.defaultDarkTheme ?? null)
  })

  async function save () {
    if (!tenant.value) return

    // Empty string clears the override server-side; null/unchanged is
    // omitted so we only send fields the user actually modified.
    const payload: UpdateTenantSettingsPayload = {}
    if (draft.defaultLightTheme !== (tenant.value.defaultLightTheme ?? null)) {
      payload.defaultLightTheme = draft.defaultLightTheme ?? ''
    }
    if (draft.defaultDarkTheme !== (tenant.value.defaultDarkTheme ?? null)) {
      payload.defaultDarkTheme = draft.defaultDarkTheme ?? ''
    }

    const updated = await saveTenant(payload)
    if (updated) snapshot(updated)
  }
</script>

<style scoped>
.theme-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}

.theme-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0;
  background: transparent;
  border: 2px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 10px;
  cursor: pointer;
  overflow: hidden;
  text-align: left;
  transition: border-color 120ms ease, transform 120ms ease;
}

.theme-card:hover {
  border-color: rgb(var(--v-theme-primary));
  transform: translateY(-1px);
}

.theme-card--selected {
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 2px rgba(var(--v-theme-primary), 0.35);
}

.theme-card__label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 6px 10px 8px;
  font-size: 13px;
  font-weight: 500;
}

.theme-swatch {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  min-height: 80px;
}

.theme-swatch__row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.theme-swatch__pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.theme-swatch__dot {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.theme-swatch__bar {
  height: 4px;
  border-radius: 2px;
  opacity: 0.85;
}
</style>
