import { POST } from '@/app/api/webhooks/facebook-leads/route'

function makeRequest(body: any, headers: Record<string, string> = {}) {
  const url = 'http://localhost/api/webhooks/facebook-leads'
  const payload = JSON.stringify(body)
  const req = new Request(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
    body: payload,
  }) as any
  return req
}

describe('facebook-leads webhook', () => {
  it('returns 200 for valid payload quickly', async () => {
    const payload = {
      object: 'page',
      entry: [
        {
          id: '123',
          time: 1700000000,
          changes: [
            {
              field: 'leadgen',
              value: {
                page_id: '123',
                form_id: 'f1',
                leadgen_id: 'l1',
                created_time: 1700000000,
              },
            },
          ],
        },
      ],
    }
    const start = Date.now()
    const res: Response = await (POST as any)(makeRequest(payload))
    const elapsed = Date.now() - start
    expect(res.status).toBe(200)
    expect(elapsed).toBeLessThan(2000)
  })
})

