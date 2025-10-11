import { NextRequest, NextResponse } from 'next/server';
import { AnthropicProvider } from '@/app/lib/ai-agents/providers/anthropic-provider';
import { createClient } from '@/app/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { description } = body;

    if (!description) {
      return NextResponse.json({ error: 'Missing description' }, { status: 400 });
    }

    // Check authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get organization
    const { data: orgData } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!orgData) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 503 });
    }

    const anthropic = new AnthropicProvider(process.env.ANTHROPIC_API_KEY);

    const systemPrompt = `You are an expert landing page designer specializing in high-converting fitness business websites.

Your task: Create a UNIQUE, compelling landing page with diverse colors, layouts, and content.

IMPORTANT RULES:
1. NEVER use the same colors twice - each page must have a unique color scheme
2. Vary backgrounds: use gradients, dark themes, light themes, colored sections
3. Mix up layouts: left-aligned, center-aligned, right-aligned, asymmetric
4. Create original, specific content - NO generic placeholder text
5. Use these component types: hero, features, testimonials, cta, text, spacer
6. Return ONLY valid JSON array, no markdown code blocks

Color palette options (choose 2-3 that work together):
- Vibrant: #FF6B6B, #4ECDC4, #45B7D1, #FFA07A, #98D8C8
- Professional: #2C3E50, #34495E, #16A085, #27AE60, #2980B9
- Energetic: #E74C3C, #E67E22, #F39C12, #D35400, #C0392B
- Modern: #8E44AD, #9B59B6, #3498DB, #1ABC9C, #F1C40F
- Dark mode: #1A1A2E, #16213E, #0F3460, #533483, #E94560

Component structure:
- hero: title, subtitle, description, primaryButton{label,href}, backgroundColor, textColor, alignment, height
- features: title, items[{icon,title,description}], backgroundColor, layout
- testimonials: title, testimonials[{name,role,content,rating}], backgroundColor
- cta: title, description, primaryButton, backgroundColor, textColor
- text: content, backgroundColor, textColor
- spacer: height`;

    const userPrompt = `Design a unique landing page for: ${description}

Requirements:
1. Choose a color scheme that reflects the business (energetic gym = bold colors, yoga studio = calming, etc)
2. Write specific, compelling copy that addresses the target audience
3. Include 4-6 components: hero + features + testimonials + cta (minimum)
4. Use realistic business names, benefits, and social proof
5. Make it conversion-focused with clear calls-to-action

Return JSON array of components with unique IDs, diverse colors, and original content.`;

    console.log('[AI Generate] Starting generation with Sonnet 4.5...');
    console.log('[AI Generate] Description:', description);

    const result = await anthropic.execute([{ role: 'user', content: userPrompt }], {
      model: 'claude-sonnet-4-20250514',
      temperature: 0.9,
      max_tokens: 16000, // Increased for more complex pages
      system: systemPrompt
    });

    console.log('[AI Generate] Generation complete:', {
      success: result.success,
      stopReason: result.stopReason,
      tokens: result.cost?.totalTokens,
      costCents: result.cost?.costBilledCents
    });

    if (!result.success || !result.content) {
      console.error('[AI Generate] Generation failed:', result.error);
      return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
    }

    const textContent = result.content.find(c => c.type === 'text');
    if (!textContent?.text) {
      console.error('[AI Generate] No text content in response');
      return NextResponse.json({ error: 'No content' }, { status: 500 });
    }

    console.log('[AI Generate] Raw response length:', textContent.text.length);

    let components;
    try {
      let jsonText = textContent.text;
      console.log('[AI Generate] Parsing JSON response...');

      const match = jsonText.match(/```(?:json)?\s*(\[[\s\S]*\])\s*```/);
      if (match) {
        console.log('[AI Generate] Found markdown code block, extracting...');
        jsonText = match[1];
      }

      components = JSON.parse(jsonText);
      if (!Array.isArray(components)) throw new Error('Not an array');

      console.log('[AI Generate] Parsed components:', {
        count: components.length,
        types: components.map(c => c.type),
        colors: components.map(c => c.props?.backgroundColor).filter(Boolean)
      });

      components = components.map((c, i) => ({ ...c, id: c.id || `c-${Date.now()}-${i}` }));
    } catch (e) {
      console.error('[AI Generate] Parse error:', e);
      console.error('[AI Generate] Raw text (first 500 chars):', textContent.text.substring(0, 500));
      return NextResponse.json({ error: 'Parse failed' }, { status: 500 });
    }

    // Extract title from first hero component for page name
    const heroComponent = components.find(c => c.type === 'hero');
    const pageTitle = heroComponent?.props?.title || 'AI Generated Page';

    // Save to database
    const slug = `ai-${Date.now()}`;
    const { data: newPage, error: dbError } = await supabase
      .from('landing_pages')
      .insert({
        organization_id: orgData.organization_id,
        name: pageTitle.substring(0, 100),
        slug,
        title: pageTitle,
        description: description.substring(0, 500),
        content: components,
        status: 'draft',
      })
      .select()
      .single();

    if (dbError || !newPage) {
      console.error('DB error:', dbError);
      return NextResponse.json({ error: 'Failed to save page' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: newPage,
      components,
      cost: result.cost
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}