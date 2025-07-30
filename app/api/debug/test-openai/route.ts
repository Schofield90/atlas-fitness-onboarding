import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function GET(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ 
        error: 'OPENAI_API_KEY not configured',
        hasKey: false 
      });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Test with a simple completion
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant. Respond with a simple JSON object.'
        },
        {
          role: 'user',
          content: 'Create a simple form field JSON with id, label, and type properties.'
        }
      ],
      temperature: 0.7,
      max_tokens: 150
    });

    const content = response.choices[0]?.message?.content;

    return NextResponse.json({
      success: true,
      hasKey: true,
      keyPrefix: process.env.OPENAI_API_KEY.substring(0, 10) + '...',
      response: content,
      model: response.model,
      usage: response.usage
    });

  } catch (error: any) {
    console.error('OpenAI test error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      errorType: error.constructor.name,
      errorCode: error.code,
      errorStatus: error.status,
      errorResponse: error.response?.data
    }, { status: 500 });
  }
}