import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

// Force dynamic rendering to handle cookies and request properties
export const dynamic = "force-dynamic";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { formId, pageId } = body;

    if (!formId) {
      return NextResponse.json(
        { error: "Form ID is required" },
        { status: 400 },
      );
    }

    // Retrieve the stored access token from secure cookie
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get("fb_token_data");

    if (!tokenCookie?.value) {
      return NextResponse.json(
        { error: "Facebook not connected" },
        { status: 401 },
      );
    }

    const tokenData = JSON.parse(tokenCookie.value);
    let accessToken = tokenData.access_token;

    // Get page token if pageId provided
    if (pageId) {
      try {
        const pageResponse = await fetch(
          `https://graph.facebook.com/v18.0/${pageId}?fields=access_token&access_token=${accessToken}`,
        );
        const pageData = await pageResponse.json();
        if (pageData.access_token) {
          accessToken = pageData.access_token;
        }
      } catch (error) {
        console.error("Error getting page token:", error);
      }
    }

    console.log(`📊 Getting actual lead count for form: ${formId}`);

    let totalCount = 0;
    let hasMore = true;
    let nextUrl = `https://graph.facebook.com/v18.0/${formId}/leads?limit=100&access_token=${accessToken}`;
    let pageCount = 0;
    const maxPages = 50; // Prevent infinite loops

    // Count all leads by paginating through results
    while (hasMore && pageCount < maxPages) {
      try {
        const response = await fetch(nextUrl);
        const data = await response.json();

        if (data.error) {
          return NextResponse.json(
            {
              success: false,
              error: data.error.message,
              code: data.error.code,
              formId,
            },
            { status: 400 },
          );
        }

        if (data.data) {
          totalCount += data.data.length;
          console.log(
            `Page ${pageCount + 1}: Found ${data.data.length} leads (total so far: ${totalCount})`,
          );
        }

        // Check for next page
        if (data.paging?.next) {
          nextUrl = data.paging.next;
          pageCount++;
        } else {
          hasMore = false;
        }
      } catch (error) {
        console.error("Error fetching page:", error);
        hasMore = false;
      }
    }

    return NextResponse.json({
      success: true,
      formId,
      leadCount: totalCount,
      pagesChecked: pageCount + 1,
      hasMore: pageCount >= maxPages,
      message:
        pageCount >= maxPages
          ? `Found at least ${totalCount} leads (stopped at ${maxPages} pages)`
          : `Found exactly ${totalCount} leads`,
    });
  } catch (error) {
    console.error("Count error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
