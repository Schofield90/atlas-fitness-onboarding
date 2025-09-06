/**
 * @jest-environment node
 */
import crypto from "crypto";

// Mock NextRequest before importing the route
class MockNextRequest {
  url: string;
  method: string;
  headers: Map<string, string>;
  body: any;

  constructor(url: string | URL, init?: RequestInit) {
    this.url = url.toString();
    this.method = init?.method || "GET";
    this.headers = new Map();
    if (init?.headers) {
      const headers = init.headers as Record<string, string>;
      Object.entries(headers).forEach(([key, value]) => {
        this.headers.set(key.toLowerCase(), value);
      });
    }
    this.body = init?.body;
  }

  text() {
    return Promise.resolve(this.body);
  }

  json() {
    return Promise.resolve(JSON.parse(this.body));
  }
}

// Mock next/server
jest.mock("next/server", () => ({
  NextRequest: MockNextRequest,
  NextResponse: {
    json: (data: any, init?: ResponseInit) => {
      return new Response(JSON.stringify(data), {
        ...init,
        headers: { "content-type": "application/json", ...init?.headers },
      });
    },
  },
}));

import { GET, POST } from "@/app/api/webhooks/facebook-leads/route";

// Mock the Supabase admin client
jest.mock("@/app/lib/supabase/admin", () => ({
  createAdminClient: jest.fn(() => ({
    from: jest.fn(() => ({
      upsert: jest.fn(() => Promise.resolve({ error: null })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() => ({
              single: jest.fn(() =>
                Promise.resolve({ data: null, error: { code: "PGRST116" } }),
              ),
            })),
          })),
        })),
      })),
    })),
  })),
}));

// Helper to create NextRequest
function makeRequest(body: any, headers: Record<string, string> = {}) {
  const url = "http://localhost/api/webhooks/facebook-leads";
  const payload = JSON.stringify(body);
  return new MockNextRequest(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: payload,
  }) as any;
}

describe("Facebook Leads Webhook", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    // Set test environment variables
    process.env.META_VERIFY_TOKEN = "test_verify_token";
    process.env.FACEBOOK_APP_SECRET = "test_app_secret";
    process.env.NODE_ENV = "test";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("GET (Meta Webhook Verification Handshake)", () => {
    it("should verify webhook with correct token and return raw challenge", async () => {
      const url = new URL("http://localhost:3000/api/webhooks/facebook-leads");
      url.searchParams.set("hub.mode", "subscribe");
      url.searchParams.set("hub.verify_token", "test_verify_token");
      url.searchParams.set("hub.challenge", "test_challenge_123");

      const request = new MockNextRequest(url) as any;
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("text/plain");
      const text = await response.text();
      // Must return ONLY the challenge, no JSON, no newline
      expect(text).toBe("test_challenge_123");
      expect(text).not.toContain("\n");
      expect(text).not.toContain("{");
    });

    it("should reject verification with incorrect token", async () => {
      const url = new URL("http://localhost:3000/api/webhooks/facebook-leads");
      url.searchParams.set("hub.mode", "subscribe");
      url.searchParams.set("hub.verify_token", "wrong_token");
      url.searchParams.set("hub.challenge", "test_challenge_123");

      const request = new MockNextRequest(url) as any;
      const response = await GET(request);

      expect(response.status).toBe(403);
      const text = await response.text();
      expect(text).toBe("Forbidden");
    });

    it("should reject verification with missing parameters", async () => {
      const url = new URL("http://localhost:3000/api/webhooks/facebook-leads");
      url.searchParams.set("hub.mode", "subscribe");
      // Missing hub.verify_token and hub.challenge

      const request = new MockNextRequest(url) as any;
      const response = await GET(request);

      expect(response.status).toBe(403);
    });

    it("should reject verification with wrong mode", async () => {
      const url = new URL("http://localhost:3000/api/webhooks/facebook-leads");
      url.searchParams.set("hub.mode", "unsubscribe"); // Wrong mode
      url.searchParams.set("hub.verify_token", "test_verify_token");
      url.searchParams.set("hub.challenge", "test_challenge_123");

      const request = new MockNextRequest(url) as any;
      const response = await GET(request);

      expect(response.status).toBe(403);
    });

    it("should use META_VERIFY_TOKEN env variable as primary", async () => {
      // Temporarily set multiple env vars to test priority
      process.env.META_VERIFY_TOKEN = "meta_token";
      process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN = "facebook_token";
      
      const url = new URL("http://localhost:3000/api/webhooks/facebook-leads");
      url.searchParams.set("hub.mode", "subscribe");
      url.searchParams.set("hub.verify_token", "meta_token"); // Should match META_VERIFY_TOKEN
      url.searchParams.set("hub.challenge", "test_challenge_456");

      const request = new MockNextRequest(url) as any;
      const response = await GET(request);

      expect(response.status).toBe(200);
      const text = await response.text();
      expect(text).toBe("test_challenge_456");
    });
  });

  describe("POST (Lead Webhook)", () => {
    const createSignature = (body: string, secret: string) => {
      return (
        "sha256=" +
        crypto.createHmac("sha256", secret).update(body, "utf8").digest("hex")
      );
    };

    const validLeadgenPayload = {
      object: "page",
      entry: [
        {
          id: "123456789",
          time: 1234567890,
          changes: [
            {
              field: "leadgen",
              value: {
                leadgen_id: "lead_123",
                form_id: "form_456",
                page_id: "page_789",
                created_time: 1234567890,
                ad_id: "ad_111",
                campaign_id: "campaign_222",
              },
            },
          ],
        },
      ],
    };

    it("returns 200 for valid payload quickly", async () => {
      const payload = {
        object: "page",
        entry: [
          {
            id: "123",
            time: 1700000000,
            changes: [
              {
                field: "leadgen",
                value: {
                  page_id: "123",
                  form_id: "f1",
                  leadgen_id: "l1",
                  created_time: 1700000000,
                },
              },
            ],
          },
        ],
      };
      const start = Date.now();
      const res = await POST(makeRequest(payload));
      const elapsed = Date.now() - start;
      expect(res.status).toBe(200);
      expect(elapsed).toBeLessThan(2000);
    });

    it("should accept valid leadgen webhook with signature", async () => {
      const body = JSON.stringify(validLeadgenPayload);
      const signature = createSignature(body, "test_app_secret");

      const request = new MockNextRequest(
        "http://localhost:3000/api/webhooks/facebook-leads",
        {
          method: "POST",
          body: body,
          headers: {
            "Content-Type": "application/json",
            "X-Hub-Signature-256": signature,
          },
        },
      ) as any;

      const response = await POST(request);

      expect(response.status).toBe(200);
      const text = await response.text();
      expect(text).toBe("OK");
      expect(response.headers.get("X-Request-Id")).toMatch(/^fb_webhook_/);
    });

    it("should handle duplicate leadgen_id (idempotency)", async () => {
      const body = JSON.stringify(validLeadgenPayload);
      const signature = createSignature(body, "test_app_secret");

      // Clear the in-memory set by creating a new module context would be needed
      // For this test, we're testing that the handler doesn't crash

      // First request
      const request1 = new NextRequest(
        "http://localhost:3000/api/webhooks/facebook-leads",
        {
          method: "POST",
          body: body,
          headers: {
            "Content-Type": "application/json",
            "X-Hub-Signature-256": signature,
          },
        },
      );

      const response1 = await POST(request1);
      expect(response1.status).toBe(200);

      // Duplicate request with same leadgen_id
      const request2 = new NextRequest(
        "http://localhost:3000/api/webhooks/facebook-leads",
        {
          method: "POST",
          body: body,
          headers: {
            "Content-Type": "application/json",
            "X-Hub-Signature-256": signature,
          },
        },
      );

      const response2 = await POST(request2);
      expect(response2.status).toBe(200);
      // Should still return OK for idempotency
    });

    it("should return 200 even with invalid signature to avoid Meta disabling", async () => {
      const body = JSON.stringify(validLeadgenPayload);
      const invalidSignature = "sha256=invalid_signature";

      const request = new MockNextRequest(
        "http://localhost:3000/api/webhooks/facebook-leads",
        {
          method: "POST",
          body: body,
          headers: {
            "Content-Type": "application/json",
            "X-Hub-Signature-256": invalidSignature,
          },
        },
      ) as any;

      const response = await POST(request);

      expect(response.status).toBe(200);
      const text = await response.text();
      expect(text).toBe("OK");
    });

    it("should return 200 for malformed JSON to avoid retries", async () => {
      const malformedBody = '{"invalid json';

      const request = new MockNextRequest(
        "http://localhost:3000/api/webhooks/facebook-leads",
        {
          method: "POST",
          body: malformedBody,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ) as any;

      const response = await POST(request);

      expect(response.status).toBe(200);
      const text = await response.text();
      expect(text).toBe("OK");
    });

    it("should ignore non-leadgen events", async () => {
      const nonLeadgenPayload = {
        object: "page",
        entry: [
          {
            id: "123456789",
            time: 1234567890,
            changes: [
              {
                field: "feed",
                value: {
                  item: "status",
                  verb: "add",
                },
              },
            ],
          },
        ],
      };

      const body = JSON.stringify(nonLeadgenPayload);
      const signature = createSignature(body, "test_app_secret");

      const request = new MockNextRequest(
        "http://localhost:3000/api/webhooks/facebook-leads",
        {
          method: "POST",
          body: body,
          headers: {
            "Content-Type": "application/json",
            "X-Hub-Signature-256": signature,
          },
        },
      ) as any;

      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it("should handle multiple leadgen events in one payload", async () => {
      const multiLeadPayload = {
        object: "page",
        entry: [
          {
            id: "123456789",
            time: 1234567890,
            changes: [
              {
                field: "leadgen",
                value: {
                  leadgen_id: "lead_001",
                  form_id: "form_456",
                  page_id: "page_789",
                  created_time: 1234567890,
                },
              },
              {
                field: "leadgen",
                value: {
                  leadgen_id: "lead_002",
                  form_id: "form_456",
                  page_id: "page_789",
                  created_time: 1234567891,
                },
              },
            ],
          },
        ],
      };

      const body = JSON.stringify(multiLeadPayload);
      const signature = createSignature(body, "test_app_secret");

      const request = new MockNextRequest(
        "http://localhost:3000/api/webhooks/facebook-leads",
        {
          method: "POST",
          body: body,
          headers: {
            "Content-Type": "application/json",
            "X-Hub-Signature-256": signature,
          },
        },
      ) as any;

      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });
});
