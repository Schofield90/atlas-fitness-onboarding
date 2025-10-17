import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

/**
 * Test endpoint to verify Anthropic API key is set in production
 * DELETE THIS FILE after testing!
 *
 * Test URL: https://login.gymleadhub.co.uk/api/test/anthropic-env
 */
export async function GET() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  const result = {
    env_var_exists: !!apiKey,
    env_var_length: apiKey?.length || 0,
    env_var_prefix: apiKey?.substring(0, 15) || 'NOT_SET',
    all_env_vars: Object.keys(process.env).filter(k => k.includes('ANTHROPIC')),
  };

  // Try to make a real API call
  if (apiKey) {
    try {
      const client = new Anthropic({ apiKey });
      const response = await client.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }],
      });

      return NextResponse.json({
        ...result,
        api_test: 'SUCCESS',
        model: response.model,
        response_length: response.content[0].text?.length || 0,
      });
    } catch (error: any) {
      return NextResponse.json({
        ...result,
        api_test: 'FAILED',
        error: error.message,
        error_type: error.constructor.name,
        error_status: error.status,
      });
    }
  }

  return NextResponse.json({
    ...result,
    api_test: 'SKIPPED - NO API KEY',
  });
}
