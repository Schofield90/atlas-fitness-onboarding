/**
 * Unit test for refresh-form-questions route
 */
import { POST as refresh } from '@/app/api/integrations/facebook/refresh-form-questions/route'

// Simple mock for Supabase client factory used in route
jest.mock('@/app/lib/supabase/server', () => {
  const auth = { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) }
  const from = jest.fn()
  const client = {
    auth,
    from: (table: string) => ({
      select: (sel: string) => ({
        eq: () => ({
          eq: () => ({
            single: async () => {
              if (table === 'facebook_integrations') {
                return { data: { access_token: 'INTEGRATION_TOKEN' } }
              }
              if (table === 'facebook_lead_forms') {
                return { data: { page_id: 'PAGE_ROW_ID', form_name: 'Test Form' } }
              }
              if (table === 'facebook_pages') {
                return { data: { facebook_page_id: '123', access_token: 'PAGE_TOKEN' } }
              }
              return { data: null }
            }
          })
        })
      }),
      update: () => ({
        eq: () => ({ eq: () => ({}) })
      })
    })
  }
  return { createClient: async () => client }
})

jest.mock('@/app/lib/organization-server', () => ({
  getCurrentUserOrganization: async () => ({ organizationId: 'org1' })
}))

describe('refresh-form-questions route', () => {
  beforeEach(() => {
    ;(global as any).fetch = jest.fn(async () => new Response(
      JSON.stringify({ id: 'TEST_FORM', name: 'Test Form', status: 'ACTIVE', questions: [{ key: 'full_name', label: 'Full Name' }] }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    ))
  })

  it('fetches questions and updates DB', async () => {
    const req = {
      json: async () => ({ formId: 'TEST_FORM' })
    } as any
    const res = await refresh(req)
    const json = await (res as any).json()
    expect((res as any).status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.questions?.length).toBeGreaterThan(0)
  })
})

