import { NextRequest, NextResponse } from "next/server";
import { requireAuthWithOrg } from "@/app/lib/api/auth-check-org";
import { createClient } from "@/app/lib/supabase/server";
import { AnthropicProvider } from '@/app/lib/ai-agents/providers/anthropic-provider';

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
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 503 });
    }

    const anthropic = new AnthropicProvider(process.env.ANTHROPIC_API_KEY);

    const prompt = `
You are an expert landing page builder specializing in high-converting, visually diverse pages.

Create a UNIQUE landing page for: "${description}"

CRITICAL RULES FOR UNIQUENESS:
1. NEVER use the same colors twice - each page must have a unique color scheme
2. Choose colors that reflect the business type (energetic = bold, calming = soft blues/greens, professional = navy/gray)
3. Vary visual styles: gradients, dark themes, light themes, colored sections
4. Add backgroundColor to ALL visual components (hero, features, testimonials, pricing, cta)
5. Use engaging, specific copy - NO generic placeholder text

Color palette options (choose 2-3 colors that work together):
- Vibrant: #FF6B6B, #4ECDC4, #45B7D1, #FFA07A, #98D8C8
- Professional: #2C3E50, #34495E, #16A085, #27AE60, #2980B9
- Energetic: #E74C3C, #E67E22, #F39C12, #D35400, #C0392B
- Modern: #8E44AD, #9B59B6, #3498DB, #1ABC9C, #F1C40F
- Dark mode: #1A1A2E, #16213E, #0F3460, #533483, #E94560

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
- header: { logoText: string, menuItems: [{label, href}], ctaButton: {label, href}, backgroundColor?: string, textColor?: string }
- hero: { title: string, subtitle: string, description: string, primaryButton: {label, href}, backgroundColor: string, textColor: string, backgroundImage?: string }
- text: { content: string (HTML allowed), backgroundColor?: string, textColor?: string, fontSize?: string, textAlign?: string }
- features: { title: string, subtitle?: string, backgroundColor: string, textColor?: string, features: [{icon: string, title: string, description: string}] }
- testimonials: { title: string, backgroundColor: string, textColor?: string, testimonials: [{name: string, role: string, company: string, content: string, image?: string}] }
- pricing: { title: string, subtitle?: string, backgroundColor: string, textColor?: string, plans: [{name: string, price: string, period: string, features: string[], ctaText: string, ctaUrl: string, highlighted?: boolean}] }
- faq: { title: string, backgroundColor?: string, textColor?: string, faqs: [{question: string, answer: string}] }
- cta: { title: string, description: string, backgroundColor: string, textColor: string, primaryButton: {label, href}, secondaryButton?: {label, href} }
- footer: { companyName: string, description?: string, backgroundColor?: string, textColor?: string, links: [{title: string, items: [{label, href}]}], social?: [{platform: string, url: string}] }

Make the content relevant to the description. Use realistic, engaging copy. Include at least 3-5 components.
Return ONLY valid JSON, no additional text or markdown.`;

    console.log('[AI Build] Starting Claude Sonnet 4.5 generation...');
    console.log('[AI Build] Description:', description);
    console.log('[AI Build] Prompt length:', prompt.length);

    const systemPrompt = "You are an expert landing page builder. Create beautiful, conversion-focused landing pages with UNIQUE colors each time. Always return valid JSON only.";

    const result = await anthropic.execute([{ role: 'user', content: prompt }], {
      model: 'claude-sonnet-4-20250514',
      temperature: 0.9,
      max_tokens: 16000,
      system: systemPrompt
    });

    console.log('[AI Build] Claude response received:', {
      success: result.success,
      stopReason: result.stopReason,
      tokens: result.cost?.totalTokens,
      costCents: result.cost?.costBilledCents
    });

    if (!result.success || !result.content) {
      console.error('[AI Build] Generation failed:', result.error);
      throw new Error('Generation failed');
    }

    const textContent = result.content.find(c => c.type === 'text');
    if (!textContent?.text) {
      throw new Error("No text content in response");
    }

    console.log('[AI Build] Response length:', textContent.text.length);

    let content = textContent.text;

    // Claude may return JSON wrapped in markdown code blocks - extract if needed
    const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    if (jsonMatch) {
      content = jsonMatch[1];
      console.log('[AI Build] Extracted JSON from markdown code block');
    }

    const generatedTemplate = JSON.parse(content);

    // Log colors for debugging uniqueness
    const colors = generatedTemplate.components
      ?.map((c: any) => c.props?.backgroundColor)
      .filter(Boolean) || [];

    console.log('[AI Build] Generated components:', {
      count: generatedTemplate.components?.length || 0,
      types: generatedTemplate.components?.map((c: any) => c.type) || [],
      colors: colors
    });

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
