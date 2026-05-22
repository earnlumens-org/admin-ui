/**
 * Vuetify theme catalogue for the admin "Theme defaults" editor.
 *
 * Source of truth is media-store-ui's `src/plugins/vuetify.ts`. We do NOT
 * import that file (admin-ui must not depend on storefront code), so this
 * catalogue is a hand-curated mirror — when a theme is added or removed in
 * vuetify.ts, update this file and `admin-api`'s {@code ThemeCatalog.java}
 * in the same commit so the three layers stay aligned.
 *
 * Each entry carries enough color metadata to render a compact swatch
 * preview ("gamma" of the theme) without depending on Vuetify being
 * configured with the storefront's theme objects.
 */
export interface ThemeMeta {
  /** Vuetify theme key. Persisted verbatim in the tenant document. */
  key: string
  /** Human label for the picker card. Title-cased English. */
  label: string
  /** Matches the {@code dark} flag in vuetify.ts. */
  mode: 'light' | 'dark'
  /** Hex colors used to render the swatch strip in the picker. */
  colors: {
    background: string
    surface: string
    primary: string
    secondary: string
    accent: string
    /** Color used for foreground text inside the swatch tile. */
    onBackground: string
  }
}

export const THEMES: ThemeMeta[] = [
  { key: 'nord', label: 'Nord', mode: 'light', colors: { background: '#ECEFF4', surface: '#E5E9F0', primary: '#5E81AC', secondary: '#81A1C1', accent: '#8FBCBB', onBackground: '#2E3440' } },
  { key: 'nordDark', label: 'Nord Dark', mode: 'dark', colors: { background: '#2E3440', surface: '#3B4252', primary: '#88C0D0', secondary: '#81A1C1', accent: '#8FBCBB', onBackground: '#ECEFF4' } },
  { key: 'dracula', label: 'Dracula', mode: 'dark', colors: { background: '#282A36', surface: '#44475A', primary: '#BD93F9', secondary: '#FF79C6', accent: '#8BE9FD', onBackground: '#F8F8F2' } },
  { key: 'gruvbox', label: 'Gruvbox', mode: 'dark', colors: { background: '#282828', surface: '#3C3836', primary: '#FABD2F', secondary: '#83A598', accent: '#D3869B', onBackground: '#EBDBB2' } },
  { key: 'solarizedDark', label: 'Solarized Dark', mode: 'dark', colors: { background: '#002B36', surface: '#073642', primary: '#268BD2', secondary: '#2AA198', accent: '#B58900', onBackground: '#EEE8D5' } },
  { key: 'catppuccinMocha', label: 'Catppuccin Mocha', mode: 'dark', colors: { background: '#1E1E2E', surface: '#313244', primary: '#CBA6F7', secondary: '#89B4FA', accent: '#94E2D5', onBackground: '#CDD6F4' } },
  { key: 'rosePineDawn', label: 'Rosé Pine Dawn', mode: 'light', colors: { background: '#FAF4ED', surface: '#F2E9E1', primary: '#B4637A', secondary: '#D7827E', accent: '#907AA9', onBackground: '#464261' } },
  { key: 'everforestDark', label: 'Everforest Dark', mode: 'dark', colors: { background: '#2D353B', surface: '#343F44', primary: '#A7C080', secondary: '#83C092', accent: '#DBBC7F', onBackground: '#D3C6AA' } },
  { key: 'amoledBlack', label: 'AMOLED Black', mode: 'dark', colors: { background: '#000000', surface: '#0A0A0A', primary: '#BB86FC', secondary: '#03DAC6', accent: '#CF6679', onBackground: '#FFFFFF' } },
  { key: 'amoledGray', label: 'AMOLED Gray', mode: 'dark', colors: { background: '#000000', surface: '#121212', primary: '#F09C49', secondary: '#D45E67', accent: '#FFD08A', onBackground: '#F7F2EA' } },
  { key: 'earthGaia', label: 'Earth Gaia', mode: 'light', colors: { background: '#F4F7EE', surface: '#EAF0E4', primary: '#2F855A', secondary: '#4C9F70', accent: '#C2A14A', onBackground: '#233027' } },
  { key: 'corporateClassic', label: 'Corporate Classic', mode: 'light', colors: { background: '#F5F7FA', surface: '#FFFFFF', primary: '#1E3A8A', secondary: '#64748B', accent: '#0891B2', onBackground: '#2C3E50' } },
  { key: 'anime', label: 'Anime', mode: 'light', colors: { background: '#FFF5F7', surface: '#FFFFFF', primary: '#FF3366', secondary: '#3357FF', accent: '#FFD700', onBackground: '#1A1A2E' } },
  { key: 'darkVoid', label: 'Dark Void', mode: 'dark', colors: { background: '#0A0A0F', surface: '#15151F', primary: '#8B5CF6', secondary: '#6B21A8', accent: '#DC2626', onBackground: '#E0D5E8' } },
  { key: 'neoBrutalArt', label: 'Neo Brutal Art', mode: 'light', colors: { background: '#FFFEF9', surface: '#F5F5F0', primary: '#E77D30', secondary: '#004E89', accent: '#F5E600', onBackground: '#000000' } },
  { key: 'softPastel', label: 'Soft Pastel', mode: 'light', colors: { background: '#FFF0F5', surface: '#FFE4EC', primary: '#D81B60', secondary: '#EC407A', accent: '#F06292', onBackground: '#3D1F2E' } },
  { key: 'lavenderDreams', label: 'Lavender Dreams', mode: 'light', colors: { background: '#F7F4FF', surface: '#EDE7F6', primary: '#7B1FA2', secondary: '#8E24AA', accent: '#9C27B0', onBackground: '#2A1A3A' } },
  { key: 'mintFresh', label: 'Mint Fresh', mode: 'light', colors: { background: '#F1FFF8', surface: '#E0F7ED', primary: '#00897B', secondary: '#00796B', accent: '#26A69A', onBackground: '#1B2E23' } },
  { key: 'peachCream', label: 'Peach Cream', mode: 'light', colors: { background: '#FFF8F0', surface: '#FFE5D9', primary: '#E64A19', secondary: '#FF5722', accent: '#FF7043', onBackground: '#3A2A1A' } },
  { key: 'skyBlush', label: 'Sky Blush', mode: 'light', colors: { background: '#F0F8FF', surface: '#E1F5FE', primary: '#0277BD', secondary: '#0288D1', accent: '#039BE5', onBackground: '#1A2A3A' } },
  { key: 'vanillaLatte', label: 'Vanilla Latte', mode: 'light', colors: { background: '#FBF8F3', surface: '#F5F0E8', primary: '#5D4037', secondary: '#6D4C41', accent: '#795548', onBackground: '#2A1F12' } },
  { key: 'lilacMist', label: 'Lilac Mist', mode: 'light', colors: { background: '#FBF7FF', surface: '#F3E5F5', primary: '#8E24AA', secondary: '#9C27B0', accent: '#AB47BC', onBackground: '#2A1A2F' } },
  { key: 'coralSunset', label: 'Coral Sunset', mode: 'light', colors: { background: '#FFF5F5', surface: '#FFEBE6', primary: '#D32F2F', secondary: '#E53935', accent: '#F44336', onBackground: '#3A1A1A' } },
  { key: 'butterscotch', label: 'Butterscotch', mode: 'light', colors: { background: '#FFFEF5', surface: '#FFF9E6', primary: '#F57C00', secondary: '#FB8C00', accent: '#FF9800', onBackground: '#3A2F0D' } },
  { key: 'roseQuartz', label: 'Rose Quartz', mode: 'light', colors: { background: '#FFF5F8', surface: '#F8E8EE', primary: '#C2185B', secondary: '#D81B60', accent: '#E91E63', onBackground: '#3A1A25' } },
  { key: 'matrix', label: 'Matrix', mode: 'dark', colors: { background: '#030603', surface: '#0A120A', primary: '#00FF41', secondary: '#00C853', accent: '#76FF03', onBackground: '#C9FFD8' } },
  { key: 'tokyoNight', label: 'Tokyo Night', mode: 'dark', colors: { background: '#1A1B26', surface: '#16161E', primary: '#7AA2F7', secondary: '#BB9AF7', accent: '#73DACA', onBackground: '#A9B1D6' } },
  { key: 'cyberpunk', label: 'Cyberpunk', mode: 'dark', colors: { background: '#0D0221', surface: '#1B1035', primary: '#FF2A6D', secondary: '#05D9E8', accent: '#FAFF00', onBackground: '#F8F8FF' } },
  { key: 'cyberpunkNeon', label: 'Cyberpunk Neon', mode: 'dark', colors: { background: '#06020A', surface: '#12081E', primary: '#00F5D4', secondary: '#FF2A6D', accent: '#B6FF00', onBackground: '#F7F4FF' } },
  { key: 'synthwave84', label: 'Synthwave \'84', mode: 'dark', colors: { background: '#262335', surface: '#2A2139', primary: '#FF7EDB', secondary: '#03EDF9', accent: '#FEDE5D', onBackground: '#FFFFFF' } },
  { key: 'nebula', label: 'Nebula', mode: 'dark', colors: { background: '#0B1020', surface: '#141B2D', primary: '#7C3AED', secondary: '#60A5FA', accent: '#22D3EE', onBackground: '#E6EDF7' } },
  { key: 'constellations', label: 'Constellations', mode: 'dark', colors: { background: '#070B1A', surface: '#10172A', primary: '#A78BFA', secondary: '#38BDF8', accent: '#FDE047', onBackground: '#EAF2FF' } },
  { key: 'kawaiiPastel', label: 'Kawaii Pastel', mode: 'light', colors: { background: '#FFF0F6', surface: '#FFE4F1', primary: '#FF8CCB', secondary: '#FFB3C6', accent: '#FFD6A5', onBackground: '#4A2C3A' } },
  { key: 'zen', label: 'Zen', mode: 'light', colors: { background: '#F7F3EA', surface: '#F0EBE1', primary: '#6B8F71', secondary: '#A7C4A0', accent: '#C2A878', onBackground: '#2F3A2F' } },
  { key: 'motivation', label: 'Motivation', mode: 'light', colors: { background: '#FFF6E8', surface: '#FFFFFF', primary: '#FF6B6B', secondary: '#FFD93D', accent: '#4ECDC4', onBackground: '#1F2328' } },
  { key: 'cozy', label: 'Cozy', mode: 'dark', colors: { background: '#1C1410', surface: '#2A1E18', primary: '#D08C60', secondary: '#C9A227', accent: '#8BB174', onBackground: '#F6E7D8' } },
  { key: 'melancholy', label: 'Melancholy', mode: 'dark', colors: { background: '#0B1020', surface: '#101A33', primary: '#6C8CFF', secondary: '#38BDF8', accent: '#A78BFA', onBackground: '#D7E1FF' } },
  { key: 'academicClean', label: 'Academic Clean', mode: 'light', colors: { background: '#FFFFFF', surface: '#F6F8FA', primary: '#0969DA', secondary: '#6E7781', accent: '#8250DF', onBackground: '#24292F' } },
  { key: 'gamerArena', label: 'Gamer Arena', mode: 'dark', colors: { background: '#070A12', surface: '#0E1529', primary: '#00C853', secondary: '#7C4DFF', accent: '#00B8D4', onBackground: '#EAF0FF' } },
  { key: 'fintechPro', label: 'Fintech Pro', mode: 'dark', colors: { background: '#060B14', surface: '#0B1220', primary: '#00D4AA', secondary: '#38BDF8', accent: '#A78BFA', onBackground: '#E6EEF8' } },
  { key: 'urbanStreet', label: 'Urban Street', mode: 'dark', colors: { background: '#0F1115', surface: '#1A1D24', primary: '#FF3D00', secondary: '#FFD600', accent: '#2979FF', onBackground: '#F5F7FA' } },
  { key: 'creativeStudio', label: 'Creative Studio', mode: 'light', colors: { background: '#F8FAFC', surface: '#FFFFFF', primary: '#3B82F6', secondary: '#6366F1', accent: '#F59E0B', onBackground: '#1F2933' } },
  { key: 'institutional', label: 'Institutional', mode: 'light', colors: { background: '#F4F6F8', surface: '#FFFFFF', primary: '#0F2A44', secondary: '#5C6F82', accent: '#C9A227', onBackground: '#1F2933' } },
]

export const LIGHT_THEMES: ThemeMeta[] = THEMES.filter(t => t.mode === 'light')
export const DARK_THEMES: ThemeMeta[] = THEMES.filter(t => t.mode === 'dark')

const BY_KEY = new Map<string, ThemeMeta>(THEMES.map(t => [t.key, t]))

export function getTheme (key: string | null | undefined): ThemeMeta | null {
  if (!key) {
    return null
  }
  return BY_KEY.get(key) ?? null
}
