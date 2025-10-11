import { NextRequest, NextResponse } from "next/server";
import { requireAuthWithOrg } from "@/app/lib/api/auth-check-org";
import { createClient } from "@/app/lib/supabase/server";
import OpenAI from "openai";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

// POST - Generate landing page from text description
export async function POST(request: NextRequest) {
  let authUser;
  try {
    authUser = await requireAuthWithOrg();
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: userId, organizationId } = authUser;
  const { description } = await request.json();

  if (!description || description.trim().length < 10) {
    return NextResponse.json(
      { error: "Please provide a description (at least 10 characters)" },
      { status: 400 },
    );
  }

  // Use service role client to bypass RLS after auth/authorization check
  const { createServiceRoleClient } = await import("@/app/lib/supabase/server");
  const supabase = createServiceRoleClient();

  try {
    // Instantiate OpenAI client directly in function (avoid minification issues)
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = `
You are an expert landing page builder. Create a landing page configuration based on this description:

"${description}"

IMPORTANT: Component type names MUST be lowercase.

Generate a landing page with these component types:
- header (navigation with logo and menu items)
- hero (main banner with headline, subtitle, CTA)
- text (text blocks)
- features (feature grid with icons)
- testimonials (customer testimonials)
- pricing (pricing tiers)
- faq (frequently asked questions)
- cta (call-to-action section)
- footer (footer with links and social)

Return ONLY valid JSON with this structure:
{
  "name": "Page name based on description",
  "description": "Brief page description",
  "components": [
    {
      "id": "component-unique-id",
      "type": "lowercase-component-type",
      "props": { /* component-specific props */ }
    }
  ],
  "meta": {
    "title": "page title for SEO",
    "description": "meta description"
  }
}

Component prop interfaces (type names are lowercase):
- header: { logoText: string, menuItems: [{label, href}], ctaButton: {label, href} }
- hero: { title: string, subtitle: string, description: string, primaryButton: {label, href}, backgroundImage?: string }
- text: { content: string (HTML allowed), fontSize?: string, textAlign?: string }
- features: { title: string, subtitle?: string, features: [{icon: string, title: string, description: string}] }
- testimonials: { title: string, testimonials: [{name: string, role: string, company: string, content: string, image?: string}] }
- pricing: { title: string, subtitle?: string, plans: [{name: string, price: string, period: string, features: string[], ctaText: string, ctaUrl: string, highlighted?: boolean}] }
- faq: { title: string, faqs: [{question: string, answer: string}] }
- cta: { title: string, description: string, primaryButton: {label, href}, secondaryButton?: {label, href} }
- footer: { companyName: string, description?: string, links: [{title: string, items: [{label, href}]}], social?: [{platform: string, url: string}] }

Make the content relevant to the description. Use realistic, engaging copy. Include at least 3-5 components.
Return ONLY valid JSON, no additional text or markdown.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an expert landing page builder. Create beautiful, conversion-focused landing pages. Always return valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.8,
      max_tokens: 4000,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No response from AI");

    const generatedTemplate = JSON.parse(content);

    // Create the landing page
    const { data: landingPage, error: pageError } = await supabase
      .from("landing_pages")
      .insert({
        organization_id: organizationId,
        name: generatedTemplate.name || "AI Generated Page",
        slug: `ai-${Date.now()}`,
        title: generatedTemplate.meta?.title || generatedTemplate.name,
        description:
          generatedTemplate.meta?.description || generatedTemplate.description,
        content: generatedTemplate.components,
        styles: {},
        settings: {},
        meta_title: generatedTemplate.meta?.title,
        meta_description: generatedTemplate.meta?.description,
        status: "draft",
        created_by: userId,
        updated_by: userId,
      })
      .select()
      .single();

    if (pageError) {
      throw new Error(pageError.message);
    }

    return NextResponse.json({
      success: true,
      data: landingPage,
      message: "Successfully generated landing page from description",
    });
  } catch (error: any) {
    console.error("AI build error:", error);

    return NextResponse.json(
      {
        error: error.message || "Failed to generate landing page",
      },
      { status: 500 },
    );
  }
}
