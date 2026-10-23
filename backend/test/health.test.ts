import { describe, expect, it } from 'vitest'
import app from '../index'

describe('GET /api/health', () => {
  it('responds ok', async () => {
    const res = await app.request('/api/health')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })

  it('returns JSON 404 for unknown API routes', async () => {
    const res = await app.request('/api/nope')
    expect(res.status).toBe(404)
  })
})
