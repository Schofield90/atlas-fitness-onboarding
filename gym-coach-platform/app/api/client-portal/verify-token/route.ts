import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    // Create admin client
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Find access by magic link token
    const { data: access, error } = await supabase
      .from('client_portal_access')
      .select(`
        *,
        client:clients(*)
      `)
      .eq('magic_link_token', token)
      .eq('is_claimed', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !access) {
      return NextResponse.json(
        { error: 'Invalid or expired access token' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      client: {
        id: access.client.id,
        name: access.client.name,
        email: access.client.email
      },
      access: {
        id: access.id,
        expires_at: access.expires_at
      }
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    return NextResponse.json(
      { error: 'Failed to verify token' },
      { status: 500 }
    );
  }
}