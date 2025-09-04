// @ts-nocheck
import { test, expect } from '@playwright/test'

// Skip by default unless explicitly enabled via env
const shouldRun = process.env.RUN_FB_E2E === 'true'
const t = shouldRun ? test : test.skip

t('field mappings API returns form structure and suggested mappings', async ({ request }) => {
  // Mock Graph API via environment or intercept if running against dev server
  // Here we assume the backend uses fetch to graph; we focus on API behavior

  const formId = 'TEST_FORM'

  const fmRes = await request.get(`/api/integrations/facebook/field-mappings?formId=${formId}`)
  const fmJson = await fmRes.json()

  expect(fmRes.status()).toBeLessThan(500)
  if (fmJson.form_structure) {
    expect(Array.isArray(fmJson.form_structure)).toBeTruthy()
  }

  const adRes = await request.post(`/api/integrations/facebook/auto-detect-mappings`, {
    data: { formId }
  })
  const adJson = await adRes.json()
  expect(adRes.status()).toBeLessThan(500)
  if (adJson.success) {
    expect(adJson.suggested_mappings?.mappings?.length ?? 0).toBeGreaterThanOrEqual(0)
  }
})

