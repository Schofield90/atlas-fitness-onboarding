import { GET, POST } from "@/app/api/webhooks/facebook-leads/route";
import { NextRequest } from "next/server";
import crypto from "crypto";

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
  return new NextRequest(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: payload,
  });
}

describe("Facebook Leads Webhook", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    // Set test environment variables
    process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN = "test_verify_token";
    process.env.FACEBOOK_APP_SECRET = "test_app_secret";
    process.env.NODE_ENV = "test";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("GET (Webhook Verification)", () => {
    it("should verify webhook with correct token and return challenge", async () => {
      const url = new URL("http://localhost:3000/api/webhooks/facebook-leads");
      url.searchParams.set("hub.mode", "subscribe");
      url.searchParams.set("hub.verify_token", "test_verify_token");
      url.searchParams.set("hub.challenge", "test_challenge_123");

      const request = new NextRequest(url);
      const response = await GET(request);

      expect(response.status).toBe(200);
      const text = await response.text();
      expect(text).toBe("test_challenge_123");
    });

    it("should reject verification with incorrect token", async () => {
      const url = new URL("http://localhost:3000/api/webhooks/facebook-leads");
      url.searchParams.set("hub.mode", "subscribe");
      url.searchParams.set("hub.verify_token", "wrong_token");
      url.searchParams.set("hub.challenge", "test_challenge_123");

      const request = new NextRequest(url);
      const response = await GET(request);

      expect(response.status).toBe(403);
      const text = await response.text();
      expect(text).toBe("Forbidden");
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

      const request = new NextRequest(
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

      const request = new NextRequest(
        "http://localhost:3000/api/webhooks/facebook-leads",
        {
          method: "POST",
          body: body,
          headers: {
            "Content-Type": "application/json",
            "X-Hub-Signature-256": invalidSignature,
          },
        },
      );

      const response = await POST(request);

      expect(response.status).toBe(200);
      const text = await response.text();
      expect(text).toBe("OK");
    });

    it("should return 200 for malformed JSON to avoid retries", async () => {
      const malformedBody = '{"invalid json';

      const request = new NextRequest(
        "http://localhost:3000/api/webhooks/facebook-leads",
        {
          method: "POST",
          body: malformedBody,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

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

      const request = new NextRequest(
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

      const request = new NextRequest(
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

      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });
});
