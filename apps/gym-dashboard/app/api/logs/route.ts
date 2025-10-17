import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { level, message, data, timestamp, userAgent, url } = body;

    const logData = {
      type: "CLIENT_LOG",
      level,
      message,
      data,
      timestamp,
      userAgent,
      url,
    };

    // Log based on level
    if (level === "error") {
      logger.error(logData, `Client Error: ${message}`);
    } else if (level === "warn") {
      logger.warn(logData, `Client Warning: ${message}`);
    } else {
      logger.info(logData, `Client Info: ${message}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(
      { type: "LOG_ENDPOINT_ERROR", error },
      "Failed to process client log",
    );
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
