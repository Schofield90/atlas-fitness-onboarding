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

    // Generate random seed for color selection to ensure variety
    // But respect user's color preferences if mentioned in description
    const descriptionLower = description.toLowerCase();

    let colorSeed: number;
    if (descriptionLower.includes('blue') || descriptionLower.includes('ocean')) {
      colorSeed = Math.random() < 0.5 ? 0 : 1; // Ocean Blues
    } else if (descriptionLower.includes('green') || descriptionLower.includes('forest') || descriptionLower.includes('nature')) {
      colorSeed = 2; // Forest Green
    } else if (descriptionLower.includes('coral') || descriptionLower.includes('sunset') || descriptionLower.includes('peach')) {
      colorSeed = 3; // Sunset Coral
    } else if (descriptionLower.includes('purple') || descriptionLower.includes('violet') || descriptionLower.includes('royal')) {
      colorSeed = 4; // Royal Purple
    } else if (descriptionLower.includes('dark') || descriptionLower.includes('midnight') || descriptionLower.includes('black')) {
      colorSeed = 5; // Midnight Dark
    } else if (descriptionLower.includes('yellow') || descriptionLower.includes('sunny') || descriptionLower.includes('gold')) {
      colorSeed = 6; // Sunny Yellow
    } else if (descriptionLower.includes('teal') || descriptionLower.includes('mint') || descriptionLower.includes('cyan')) {
      colorSeed = 7; // Teal Mint
    } else if (descriptionLower.includes('pink') || descriptionLower.includes('berry') || descriptionLower.includes('magenta')) {
      colorSeed = 8; // Berry Pink
    } else if (descriptionLower.includes('orange') || descriptionLower.includes('burnt')) {
      colorSeed = 9; // Burnt Orange
    } else {
      // No color preference - random selection
      colorSeed = Math.floor(Math.random() * 10);
    }

    // Map colorSeed to actual palette
    const colorPalettes = {
      0: { name: 'Ocean Blues', primary: '#0077BE', secondary: '#00A8E8', accent: '#48CAE4', dark: '#023E8A', light: '#CAF0F8' },
      1: { name: 'Ocean Blues', primary: '#0077BE', secondary: '#00A8E8', accent: '#48CAE4', dark: '#023E8A', light: '#CAF0F8' },
      2: { name: 'Forest Green', primary: '#2D6A4F', secondary: '#40916C', accent: '#52B788', dark: '#1B4332', light: '#D8F3DC' },
      3: { name: 'Sunset Coral', primary: '#FF6B6B', secondary: '#FFB4A2', accent: '#FFC6AC', dark: '#CC5252', light: '#FFE5D9' },
      4: { name: 'Royal Purple', primary: '#7209B7', secondary: '#B5179E', accent: '#F72585', dark: '#560BAD', light: '#E0AAFF' },
      5: { name: 'Midnight Dark', primary: '#14213D', secondary: '#1F2937', accent: '#E5E7EB', dark: '#0F172A', light: '#F9FAFB' },
      6: { name: 'Sunny Yellow', primary: '#FFB700', secondary: '#FFCB47', accent: '#FFD60A', dark: '#9A7B00', light: '#FFF4CC' },
      7: { name: 'Teal Mint', primary: '#06B6D4', secondary: '#14B8A6', accent: '#2DD4BF', dark: '#0E7490', light: '#CCFBF1' },
      8: { name: 'Berry Pink', primary: '#DB2777', secondary: '#EC4899', accent: '#F472B6', dark: '#9F1239', light: '#FCE7F3' },
      9: { name: 'Burnt Orange', primary: '#EA580C', secondary: '#FB923C', accent: '#FDBA74', dark: '#C2410C', light: '#FED7AA' }
    };

    const palette = colorPalettes[colorSeed as keyof typeof colorPalettes];

    const prompt = `
You are an expert landing page builder specializing in high-converting, visually diverse pages.

Create a UNIQUE landing page for: "${description}"

🎨 MANDATORY COLOR PALETTE - YOU MUST USE THESE EXACT COLORS:
Theme: ${palette.name}
- Primary: ${palette.primary} (use for main CTAs, important buttons)
- Secondary: ${palette.secondary} (use for secondary elements, hover states)
- Accent: ${palette.accent} (use for highlights, borders, icons)
- Dark: ${palette.dark} (use for text on light backgrounds)
- Light: ${palette.light} (use for backgrounds, light sections)

CRITICAL RULES:
1. EVERY component MUST have a backgroundColor from the palette above
2. Use Primary color for at least 2 components
3. Use Secondary color for at least 2 components
4. Use Light color for at least 2 components
5. Mix Dark and Light text colors based on background (Dark text on Light bg, Light text on Dark bg)
6. NO default colors allowed - every component needs explicit backgroundColor and textColor
7. Vary the component layout and structure - don't use the same pattern every time

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
- header: { logoText: string, menuItems: [{label, href}], ctaButton: {label, href}, backgroundColor?: string, textColor?: string, buttonColor?: string }
- hero: { title: string, subtitle: string, description: string, primaryButton: {label, href}, backgroundColor: string, textColor: string, buttonColor: string, backgroundImage?: string }
- text: { content: string (HTML allowed), backgroundColor?: string, textColor?: string, fontSize?: string, textAlign?: string }
- features: { title: string, subtitle?: string, backgroundColor: string, textColor?: string, features: [{icon: string, title: string, description: string}] }
- testimonials: { title: string, backgroundColor: string, textColor?: string, testimonials: [{name: string, role: string, company: string, content: string, image?: string}] }
- pricing: { title: string, subtitle?: string, backgroundColor: string, textColor?: string, buttonColor?: string, plans: [{name: string, price: string, period: string, features: string[], ctaText: string, ctaUrl: string, highlighted?: boolean}] }
- faq: { title: string, backgroundColor?: string, textColor?: string, faqs: [{question: string, answer: string}] }
- cta: { title: string, description: string, backgroundColor: string, textColor: string, buttonColor?: string, primaryButton: {label, href}, secondaryButton?: {label, href} }
- footer: { companyName: string, description?: string, backgroundColor?: string, textColor?: string, links: [{title: string, items: [{label, href}]}], social?: [{platform: string, url: string}] }

Make the content relevant to the description. Use realistic, engaging copy. Include at least 3-5 components.
Return ONLY valid JSON, no additional text or markdown.`;

    console.log('[AI Build] Starting Claude Sonnet 4.5 generation...');
    console.log('[AI Build] Description:', description);
    console.log('[AI Build] Color Seed:', colorSeed);
    console.log('[AI Build] Prompt length:', prompt.length);

    const systemPrompt = `You are an expert landing page builder who creates visually diverse, high-converting pages.

CRITICAL MANDATORY RULES:
1. You MUST use ONLY the 5 colors provided in the mandatory color palette (Primary, Secondary, Accent, Dark, Light)
2. EVERY single component must have an explicit backgroundColor property set to one of the palette colors
3. EVERY single component must have an explicit textColor property
4. DO NOT use any colors outside the provided palette
5. DO NOT use generic colors like "#FFFFFF" or "#000000" unless they match the palette
6. Each page must look completely different due to the unique color combinations
7. Return ONLY valid JSON, no markdown, no explanations`;

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
    console.error("Error stack:", error.stack);
    console.error("Error name:", error.name);

    // Return detailed error in development, generic in production
    const errorMessage = error.message || "Failed to generate landing page";
    const errorDetails = process.env.NODE_ENV === 'development' ? {
      stack: error.stack,
      name: error.name,
      cause: error.cause
    } : undefined;

    return NextResponse.json(
      {
        error: errorMessage,
        details: errorDetails,
        timestamp: new Date().toISOString()
      },
      { status: 500 },
    );
  }
}
