import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/app/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 10; // 10 seconds max

// In-memory dedupe for rapid retries within a single lambda/container lifetime
const processedLeadIds = new Set<string>();

// Generate a unique request ID for tracing
function generateRequestId(): string {
  return `fb_webhook_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

function safeJsonParse<T = any>(text: string): T | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function verifySignature(
  body: string,
  signatureHeader: string | null,
): boolean {
  const appSecret =
    process.env.FACEBOOK_APP_SECRET || process.env.META_WEBHOOK_SECRET || "";

  // In development, allow without signature if no secret configured
  if (!appSecret) {
    const isDev = process.env.NODE_ENV !== "production";
    if (isDev) {
      console.log(
        "[fb_leadgen_webhook] Signature verification skipped (dev mode, no secret)",
      );
    }
    return isDev;
  }

  if (!signatureHeader) {
    console.warn("[fb_leadgen_webhook] Missing X-Hub-Signature-256 header");
    return false;
  }

  const expected = crypto
    .createHmac("sha256", appSecret)
    .update(body, "utf8")
    .digest("hex");
  const provided = signatureHeader.replace("sha256=", "");

  try {
    const isValid = crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(provided, "hex"),
    );
    if (!isValid) {
      console.warn("[fb_leadgen_webhook] Invalid signature");
    }
    return isValid;
  } catch (err) {
    console.error("[fb_leadgen_webhook] Signature verification error:", err);
    return false;
  }
}

// Handle Facebook webhook verification (GET)
export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  // Use META_VERIFY_TOKEN as primary, fallback to other vars
  const expectedToken =
    process.env.META_VERIFY_TOKEN ||
    process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN ||
    process.env.META_WEBHOOK_VERIFY_TOKEN;

  console.log("[fb_leadgen_webhook_verify]", {
    requestId,
    mode,
    tokenMatch: token === expectedToken,
    hasChallenge: !!challenge,
    hasExpectedToken: !!expectedToken,
  });

  // Check if this is a subscribe request with the correct token
  if (mode === "subscribe" && token === expectedToken && challenge) {
    console.log("[fb_leadgen_webhook_verify] ✅ Verification successful", {
      requestId,
      challengeLength: challenge.length,
    });
    // Return ONLY the challenge as plain text, no JSON, no newline
    return new Response(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  console.warn("[fb_leadgen_webhook_verify] ❌ Verification failed", {
    requestId,
    mode,
    tokenProvided: !!token,
    tokenMatches: token === expectedToken,
    hasExpectedToken: !!expectedToken,
  });
  return new Response("Forbidden", { status: 403 });
}

// Handle actual lead webhooks (POST)
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const startedAt = Date.now();

  console.log("[fb_leadgen_webhook_received] 📥 POST request received", {
    requestId,
    timestamp: new Date().toISOString(),
    headers: {
      "content-type": request.headers.get("content-type"),
      "x-hub-signature-256":
        request.headers.get("x-hub-signature-256")?.substring(0, 20) + "...",
      "user-agent": request.headers.get("user-agent"),
    },
  });

  try {
    // Parse body
    const rawBody = await request.text();
    const bodySize = rawBody.length;

    console.log("[fb_leadgen_webhook] Body received", {
      requestId,
      bodySize,
      preview: rawBody.substring(0, 100) + (bodySize > 100 ? "..." : ""),
    });

    // Verify signature (but still accept if invalid to avoid Meta disabling)
    const signature = request.headers.get("x-hub-signature-256");
    const signatureValid = verifySignature(rawBody, signature);

    if (!signatureValid) {
      console.warn(
        "[fb_leadgen_webhook] ⚠️ Invalid signature, processing anyway",
        { requestId },
      );
    }

    // Parse JSON
    const payload = safeJsonParse<any>(rawBody);
    if (!payload) {
      console.error("[fb_leadgen_webhook] ❌ Malformed JSON", {
        requestId,
        bodyPreview: rawBody.substring(0, 200),
      });
      // Still return 200 to avoid retries
      return new Response("OK", { status: 200 });
    }

    // Validate payload structure
    if (payload.object !== "page" || !Array.isArray(payload.entry)) {
      console.log("[fb_leadgen_webhook] Non-leadgen event, ignoring", {
        requestId,
        object: payload.object,
        entryCount: Array.isArray(payload.entry) ? payload.entry.length : 0,
      });
      return new Response("OK", { status: 200 });
    }

    const admin = createAdminClient();
    let processedCount = 0;
    let skippedCount = 0;

    // Process each entry
    for (const entry of payload.entry) {
      const pageId = entry.id;
      const entryTime = entry.time;

      if (!Array.isArray(entry.changes)) {
        console.log("[fb_leadgen_webhook] No changes in entry", {
          requestId,
          pageId,
        });
        continue;
      }

      for (const change of entry.changes) {
        if (change.field !== "leadgen" || !change.value) {
          console.log("[fb_leadgen_webhook] Non-leadgen change", {
            requestId,
            field: change.field,
          });
          continue;
        }

        const value = change.value as {
          leadgen_id: string;
          form_id: string;
          page_id: string;
          created_time: number;
          ad_id?: string;
          adset_id?: string;
          campaign_id?: string;
        };

        const leadId = value.leadgen_id;
        if (!leadId) {
          console.warn("[fb_leadgen_webhook] Missing leadgen_id", {
            requestId,
          });
          continue;
        }

        // Log the leadgen event
        console.log("[fb_leadgen_webhook] 🎯 Lead received", {
          requestId,
          eventType: "leadgen",
          page_id: value.page_id,
          form_id: value.form_id,
          leadgen_id: leadId,
          created_time: new Date(value.created_time * 1000).toISOString(),
          ad_id: value.ad_id,
          campaign_id: value.campaign_id,
        });

        // Idempotency check (in-memory)
        if (processedLeadIds.has(leadId)) {
          console.log(
            "[fb_leadgen_webhook] Duplicate lead (in-memory), skipping",
            {
              requestId,
              leadgen_id: leadId,
            },
          );
          skippedCount++;
          continue;
        }
        processedLeadIds.add(leadId);

        // Create unique webhook ID for DB idempotency
        const webhookId = `${pageId}_${entryTime}_leadgen_${leadId}`;

        // Store webhook event (non-blocking, ignore errors)
        admin
          .from("facebook_webhooks")
          .upsert(
            {
              organization_id: null, // Will be determined later when processing
              webhook_id: webhookId,
              object_type: "page",
              event_type: "leadgen",
              event_data: {
                page_id: value.page_id,
                form_id: value.form_id,
                leadgen_id: value.leadgen_id,
                created_time: value.created_time,
                ad_id: value.ad_id,
                adset_id: value.adset_id,
                campaign_id: value.campaign_id,
              },
              processing_status: "received",
              received_at: new Date().toISOString(),
            } as any,
            { onConflict: "webhook_id" },
          )
          .then(({ error }) => {
            if (error) {
              console.error(
                "[fb_leadgen_webhook] Failed to store webhook event",
                {
                  requestId,
                  webhookId,
                  error: error.message,
                },
              );
            } else {
              console.log("[fb_leadgen_webhook] ✅ Webhook event stored", {
                requestId,
                webhookId,
              });
            }
          })
          .catch((err) => {
            console.error("[fb_leadgen_webhook] DB error", {
              requestId,
              error: err.message,
            });
          });

        processedCount++;
      }
    }

    const elapsedMs = Date.now() - startedAt;

    console.log("[fb_leadgen_webhook] ✅ Processing complete", {
      requestId,
      processedCount,
      skippedCount,
      elapsedMs,
      timestamp: new Date().toISOString(),
    });

    // Warn if slow
    if (elapsedMs > 2000) {
      console.warn("[fb_leadgen_webhook] ⚠️ Slow response", {
        requestId,
        elapsedMs,
      });
    }

    // Always return 200 OK quickly
    return new Response("OK", {
      status: 200,
      headers: {
        "X-Request-Id": requestId,
      },
    });
  } catch (error) {
    const elapsedMs = Date.now() - startedAt;
    console.error("[fb_leadgen_webhook] ❌ Handler error", {
      requestId,
      error: (error as Error).message,
      stack: (error as Error).stack,
      elapsedMs,
    });

    // Still return 200 to avoid Meta retries
    return new Response("OK", {
      status: 200,
      headers: {
        "X-Request-Id": requestId,
      },
    });
  }
}
