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

    const systemPrompt = 'You are an expert landing page designer. Generate a complete landing page as JSON array of components. Use these types: hero, features, testimonials, cta. Return ONLY valid JSON, no markdown.';

    const userPrompt = `Create landing page for: ${description}

Return JSON array like:
[{"id":"hero-1","type":"hero","props":{"title":"...","subtitle":"...","description":"...","primaryButton":{"label":"Get Started","href":"#"},"backgroundColor":"#3B82F6","textColor":"#ffffff","alignment":"center","height":"large"}}]`;

    const result = await anthropic.execute([{ role: 'user', content: userPrompt }], {
      model: 'claude-sonnet-4-20250514',
      temperature: 0.9,
      max_tokens: 8000,
      system: systemPrompt
    });

    if (!result.success || !result.content) {
      return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
    }

    const textContent = result.content.find(c => c.type === 'text');
    if (!textContent?.text) {
      return NextResponse.json({ error: 'No content' }, { status: 500 });
    }

    let components;
    try {
      let jsonText = textContent.text;
      const match = jsonText.match(/```(?:json)?\s*(\[[\s\S]*\])\s*```/);
      if (match) jsonText = match[1];
      components = JSON.parse(jsonText);
      if (!Array.isArray(components)) throw new Error('Not an array');
      components = components.map((c, i) => ({ ...c, id: c.id || `c-${Date.now()}-${i}` }));
    } catch (e) {
      console.error('Parse error:', e);
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