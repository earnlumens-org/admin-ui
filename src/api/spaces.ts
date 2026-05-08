import { API_BASE_URL } from '@/config/env'
import { getToken } from '@/services/tokenWorkerClient'

async function authHeaders (): Promise<Record<string, string>> {
  const result = await getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  }
  if (result.accessToken) {
    headers.Authorization = `Bearer ${result.accessToken}`
  }
  return headers
}

// =====================================================================
//  Types — mirror admin-api SpaceResponse / SpaceTranslationJob shapes.
// =====================================================================

export type SpaceStatus = 'ACTIVE' | 'ARCHIVED'
export type SpacePublishRule = 'ALL' | 'VERIFIED_BLUE' | 'VERIFIED_GOLD'
/** Provenance of a translated name. STALE = base English name changed since translation. */
export type SpaceTranslationStatus = 'AI' | 'REVIEWED' | 'STALE'

export interface SpaceResponse {
  id: string
  tenantId: string
  key: string
  systemSpace: boolean
  status: SpaceStatus
  showInSidebar: boolean
  allowPublishing: boolean
  sortOrder: number
  icon: string
  /** null only for the system Explore space (its name is global i18n). */
  baseName: string | null
  translations: Record<string, string>
  translationStatus: Record<string, SpaceTranslationStatus>
  whoCanPublish: SpacePublishRule
  paidPublishEnabled: boolean
  createdAt: string
  updatedAt: string
  archivedAt: string | null
}

export interface CreateSpacePayload {
  /** English, 1–40 chars. The server runs a Latin-script heuristic to reject obviously non-English input. */
  baseName: string
  /** mdi-name from the curated catalog. */
  icon: string
  whoCanPublish?: SpacePublishRule
  showInSidebar?: boolean
  allowPublishing?: boolean
}

export interface UpdateSpacePayload {
  baseName?: string
  icon?: string
  whoCanPublish?: SpacePublishRule
  showInSidebar?: boolean
  allowPublishing?: boolean
}

export interface ReorderSpacesPayload {
  orderedIds: string[]
}

export type TranslationJobStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'DEAD_LETTER'

export interface SpaceTranslationJob {
  id: string
  tenantId: string
  spaceId: string
  locale: string
  baseName: string
  status: TranslationJobStatus
  attempts: number
  nextAttemptAt: string | null
  claimedAt: string | null
  lastError: string | null
  createdAt: string
  updatedAt: string
}

export interface SupportedLanguage {
  code: string
  /** English display name resolved by the JDK; may be null for exotic codes. */
  name?: string | null
  enabled: boolean
  addedAt?: string
  updatedAt?: string
}

export class SpaceApiError extends Error {
  readonly code: string
  readonly status: number

  constructor (code: string, status: number, message?: string) {
    super(message ?? code)
    this.code = code
    this.status = status
  }
}

async function parseError (res: Response): Promise<SpaceApiError> {
  let code = 'unknown_error'
  try {
    const body = await res.json()
    if (body && typeof body.error === 'string') {
      code = body.error
    }
  } catch {
    // non-JSON body
  }
  return new SpaceApiError(code, res.status)
}

// =====================================================================
//  CRUD — every endpoint is tenant-scoped. The server re-checks ownership
//  against the database on every call regardless of any cached JWT
//  claim, so a transferred or revoked owner loses access immediately.
// =====================================================================

const base = (tenantId: string) => `${API_BASE_URL}/api/spaces/${encodeURIComponent(tenantId)}`

export async function listSpaces (tenantId: string): Promise<SpaceResponse[]> {
  const res = await fetch(base(tenantId), {
    credentials: 'include',
    headers: await authHeaders(),
  })
  if (!res.ok) throw await parseError(res)
  return res.json()
}

export async function getSpace (tenantId: string, spaceId: string): Promise<SpaceResponse> {
  const res = await fetch(`${base(tenantId)}/${encodeURIComponent(spaceId)}`, {
    credentials: 'include',
    headers: await authHeaders(),
  })
  if (!res.ok) throw await parseError(res)
  return res.json()
}

export async function createSpace (tenantId: string, payload: CreateSpacePayload): Promise<SpaceResponse> {
  const res = await fetch(base(tenantId), {
    method: 'POST',
    credentials: 'include',
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw await parseError(res)
  return res.json()
}

/**
 * Real-time AI language hint used by the create/edit dialog while the
 * admin is typing a name.
 *
 * <p>{@code english=null} means "the AI couldn't decide" (typically:
 * Gemini disabled or call failed). The UI should NOT block the form on
 * this — it's purely advisory; the server still validates on submit.
 */
export interface NameValidationResult {
  english: boolean | null
  detectedLanguageCode: string | null
  detectedLanguageName: string | null
  englishSuggestion: string | null
  confidence: number
}

export async function validateSpaceName (
  tenantId: string,
  name: string,
  signal?: AbortSignal,
): Promise<NameValidationResult> {
  const res = await fetch(`${base(tenantId)}/validate-name`, {
    method: 'POST',
    credentials: 'include',
    headers: await authHeaders(),
    body: JSON.stringify({ name }),
    signal,
  })
  if (!res.ok) throw await parseError(res)
  return res.json()
}

export async function updateSpace (
  tenantId: string,
  spaceId: string,
  payload: UpdateSpacePayload,
): Promise<SpaceResponse> {
  const res = await fetch(`${base(tenantId)}/${encodeURIComponent(spaceId)}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw await parseError(res)
  return res.json()
}

/** Soft-delete: server marks status=ARCHIVED. Restorable via {@link restoreSpace}. */
export async function archiveSpace (tenantId: string, spaceId: string): Promise<SpaceResponse> {
  const res = await fetch(`${base(tenantId)}/${encodeURIComponent(spaceId)}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: await authHeaders(),
  })
  if (!res.ok) throw await parseError(res)
  return res.json()
}

export async function restoreSpace (tenantId: string, spaceId: string): Promise<SpaceResponse> {
  const res = await fetch(`${base(tenantId)}/${encodeURIComponent(spaceId)}/restore`, {
    method: 'POST',
    credentials: 'include',
    headers: await authHeaders(),
  })
  if (!res.ok) throw await parseError(res)
  return res.json()
}

export async function reorderSpaces (
  tenantId: string,
  orderedIds: string[],
): Promise<SpaceResponse[]> {
  const res = await fetch(`${base(tenantId)}/order`, {
    method: 'PUT',
    credentials: 'include',
    headers: await authHeaders(),
    body: JSON.stringify({ orderedIds } satisfies ReorderSpacesPayload),
  })
  if (!res.ok) throw await parseError(res)
  return res.json()
}

// =====================================================================
//  Translation management
// =====================================================================

/**
 * Mark a translation as human-reviewed. {@code value=undefined} locks in the
 * existing AI translation; passing a string overrides + locks it in.
 *
 * Once a translation is REVIEWED, the AI pipeline never overwrites it
 * unless the admin calls {@link regenerateTranslations} with {@code force=true}.
 */
export async function reviewTranslation (
  tenantId: string,
  spaceId: string,
  locale: string,
  value?: string,
): Promise<SpaceResponse> {
  const res = await fetch(
    `${base(tenantId)}/${encodeURIComponent(spaceId)}/translations/${encodeURIComponent(locale)}/review`,
    {
      method: 'PUT',
      credentials: 'include',
      headers: await authHeaders(),
      body: JSON.stringify(value === undefined ? {} : { value }),
    },
  )
  if (!res.ok) throw await parseError(res)
  return res.json()
}

export async function regenerateTranslations (
  tenantId: string,
  spaceId: string,
  force = false,
): Promise<{ enqueued: number, force: boolean }> {
  const res = await fetch(
    `${base(tenantId)}/${encodeURIComponent(spaceId)}/translations/regenerate`,
    {
      method: 'POST',
      credentials: 'include',
      headers: await authHeaders(),
      body: JSON.stringify({ force }),
    },
  )
  if (!res.ok) throw await parseError(res)
  return res.json()
}

export async function listTranslationJobs (tenantId: string): Promise<SpaceTranslationJob[]> {
  const res = await fetch(`${base(tenantId)}/translation-jobs`, {
    credentials: 'include',
    headers: await authHeaders(),
  })
  if (!res.ok) throw await parseError(res)
  return res.json()
}

export async function retryTranslationJob (
  tenantId: string,
  jobId: string,
): Promise<SpaceTranslationJob> {
  const res = await fetch(
    `${base(tenantId)}/translation-jobs/${encodeURIComponent(jobId)}/retry`,
    {
      method: 'POST',
      credentials: 'include',
      headers: await authHeaders(),
    },
  )
  if (!res.ok) throw await parseError(res)
  return res.json()
}

// =====================================================================
//  Languages — drives the translation editor's locale list. Available
//  to any authenticated caller (the write side is superadmin-only).
// =====================================================================

export async function listEnabledLanguages (): Promise<SupportedLanguage[]> {
  const res = await fetch(`${API_BASE_URL}/api/i18n/languages/enabled`, {
    credentials: 'include',
    headers: await authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch enabled languages')
  return res.json()
}

/** Superadmin-only: every language including disabled ones. */
export async function listAllLanguages (): Promise<SupportedLanguage[]> {
  const res = await fetch(`${API_BASE_URL}/api/i18n/languages`, {
    credentials: 'include',
    headers: await authHeaders(),
  })
  if (!res.ok) throw await parseError(res)
  return res.json()
}

/** Superadmin-only. `code` is BCP-47 (e.g. `es`, `zh-CN`). */
export async function addLanguage (code: string): Promise<SupportedLanguage> {
  const res = await fetch(`${API_BASE_URL}/api/i18n/languages`, {
    method: 'POST',
    credentials: 'include',
    headers: await authHeaders(),
    body: JSON.stringify({ code }),
  })
  if (!res.ok) throw await parseError(res)
  return res.json()
}

/** Superadmin-only: enable / disable a language without deleting translations. */
export async function setLanguageEnabled (
  code: string,
  enabled: boolean,
): Promise<SupportedLanguage> {
  const res = await fetch(
    `${API_BASE_URL}/api/i18n/languages/${encodeURIComponent(code)}/enabled`,
    {
      method: 'PUT',
      credentials: 'include',
      headers: await authHeaders(),
      body: JSON.stringify({ enabled }),
    },
  )
  if (!res.ok) throw await parseError(res)
  return res.json()
}

/** Superadmin-only. Removes the language entirely; existing translations stay. */
export async function deleteLanguage (code: string): Promise<void> {
  const res = await fetch(
    `${API_BASE_URL}/api/i18n/languages/${encodeURIComponent(code)}`,
    {
      method: 'DELETE',
      credentials: 'include',
      headers: await authHeaders(),
    },
  )
  if (!res.ok) throw await parseError(res)
}
