import { NextResponse } from "next/server";

/**
 * Middleware to block debug endpoints in production
 * Add this to the top of every debug endpoint
 */
export function blockInProduction() {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production"
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return null;
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production"
  );
}
