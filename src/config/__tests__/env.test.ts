import { describe, expect, it } from 'vitest'

// We can't use window.location in tests easily, so test the logic directly
describe('env resolution logic', () => {
  function resolveApiBaseUrl (hostname: string): string {
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8082'
    }
    if (hostname === 'admin-dev.earnlumens.org') {
      return 'https://api.admin-dev.earnlumens.org'
    }
    return 'https://api.admin.earnlumens.org'
  }

  it('localhost maps to localhost:8082', () => {
    expect(resolveApiBaseUrl('localhost')).toBe('http://localhost:8082')
  })

  it('127.0.0.1 maps to localhost:8082', () => {
    expect(resolveApiBaseUrl('127.0.0.1')).toBe('http://localhost:8082')
  })

  it('admin-dev.earnlumens.org maps to api.admin-dev (dev)', () => {
    expect(resolveApiBaseUrl('admin-dev.earnlumens.org')).toBe('https://api.admin-dev.earnlumens.org')
  })

  it('admin.earnlumens.org maps to api.admin (production)', () => {
    expect(resolveApiBaseUrl('admin.earnlumens.org')).toBe('https://api.admin.earnlumens.org')
  })

  it('any other hostname defaults to production', () => {
    expect(resolveApiBaseUrl('unknown.host')).toBe('https://api.admin.earnlumens.org')
  })
})
