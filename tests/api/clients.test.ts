import { describe, it, expect, beforeEach, jest } from '@jest/globals'

// Mock requireAuth to always return a fixed user and org
jest.mock('@/app/lib/api/auth-check', () => ({
  requireAuth: jest.fn(async () => ({
    id: 'user-1',
    email: 'user@example.com',
    organizationId: 'org-123',
    role: 'owner'
  }))
}))

// Utilities to create a minimal thenable query builder mock
type QueryResult<T> = { data: T | null; error: any; count?: number | null }

function createThenable<T>(resolver: () => QueryResult<T>) {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    then: function (resolve: any) {
      return Promise.resolve(resolve(resolver()))
    }
  }
}

describe('/api/clients GET', () => {
  let GET: (req: any) => Promise<any>

  beforeEach(() => {
    jest.resetModules()
  })

  it('returns members via legacy org_id when organization_id query is empty', async () => {
    // Mock NextResponse.json
    jest.doMock('next/server', () => ({
      NextResponse: {
        json: (body: any, init?: any) => ({ json: async () => body, status: init?.status ?? 200 })
      }
    }))

    const orgId = 'org-123'

    // First query by organization_id returns empty, fallback by org_id returns 2 records
    const clientsOrgIdEmpty: QueryResult<any[]> = { data: [], error: null, count: 0 }
    const clientsLegacy: QueryResult<any[]> = {
      data: [
        { id: 'c1', first_name: 'Ada', last_name: 'Lovelace', email: 'ada@example.com', org_id: orgId },
        { id: 'c2', first_name: 'Alan', last_name: 'Turing', email: 'alan@example.com', org_id: orgId }
      ],
      error: null,
      count: 2
    }

    // memberships and plans queries
    const membershipsEmpty: QueryResult<any[]> = { data: [], error: null }
    const plansEmpty: QueryResult<any[]> = { data: [], error: null }

    let clientQueryCallCount = 0
    const fromMock = jest.fn((table: string) => {
      if (table === 'clients') {
        // The API first builds a query with organization_id, awaits it, then falls back to org_id
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockImplementation(function () { return this }),
          order: jest.fn().mockReturnThis(),
          range: jest.fn().mockReturnThis(),
          then: (resolve: any) => {
            const result = clientQueryCallCount === 0 ? clientsOrgIdEmpty : clientsLegacy
            clientQueryCallCount++
            return Promise.resolve(resolve(result))
          }
        }
      }
      if (table === 'memberships') {
        return createThenable(() => membershipsEmpty)
      }
      if (table === 'membership_plans') {
        return createThenable(() => plansEmpty)
      }
      return createThenable(() => ({ data: [], error: null }))
    })

    jest.doMock('@/app/lib/supabase/server', () => ({
      createClient: jest.fn(() => ({ from: fromMock }))
    }))

    ;({ GET } = require('@/app/api/clients/route'))

    const req: any = { url: 'http://localhost:3000/api/clients?page=1&page_size=50' }
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(Array.isArray(json.clients)).toBe(true)
    expect(json.clients.length).toBe(2)
  })

  it('returns empty array when no members exist in either column', async () => {
    // Mock NextResponse.json
    jest.doMock('next/server', () => ({
      NextResponse: {
        json: (body: any, init?: any) => ({ json: async () => body, status: init?.status ?? 200 })
      }
    }))

    const empty: QueryResult<any[]> = { data: [], error: null, count: 0 }

    const fromMock = jest.fn((table: string) => {
      if (table === 'clients') {
        // Both primary and fallback return empty
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          range: jest.fn().mockReturnThis(),
          then: (resolve: any) => Promise.resolve(resolve(empty))
        }
      }
      return createThenable(() => empty)
    })

    jest.doMock('@/app/lib/supabase/server', () => ({
      createClient: jest.fn(() => ({ from: fromMock }))
    }))

    ;({ GET } = require('@/app/api/clients/route'))

    const req: any = { url: 'http://localhost:3000/api/clients' }
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(Array.isArray(json.clients)).toBe(true)
    expect(json.clients.length).toBe(0)
  })
})

