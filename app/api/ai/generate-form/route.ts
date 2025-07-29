import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/app/lib/supabase/server';
import { requireAuth } from '@/app/lib/api/auth-check';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(request: NextRequest) {
  try {
    // Check if API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not set');
      return NextResponse.json(
        { error: 'AI service is not configured. Please set OPENAI_API_KEY.' },
        { status: 500 }
      );
    }

    const userWithOrg = await requireAuth();
    const supabase = await createClient();
    
    const { description } = await request.json();
    
    if (!description) {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      );
    }
    
    const systemPrompt = `You are a form builder assistant for a gym management system. Your task is to create form schemas based on user descriptions. 

Generate a JSON form schema with the following structure:
{
  "title": "Form Title",
  "description": "Brief description",
  "fields": [
    {
      "id": "unique_field_id",
      "label": "Field Label",
      "type": "text|email|tel|number|date|select|checkbox|textarea|signature",
      "required": true/false,
      "placeholder": "Optional placeholder",
      "options": ["option1", "option2"] // Only for select type
    }
  ]
}

Focus on creating comprehensive, legally sound forms for gym operations.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: description
        }
      ]
    });
    
    // Extract the JSON from the response
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response content from OpenAI');
    }
    
    // Parse the JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    
    const formSchema = JSON.parse(jsonMatch[0]);
    
    // Determine form type based on title/description
    let formType = 'custom';
    const titleLower = formSchema.title.toLowerCase();
    if (titleLower.includes('waiver') || titleLower.includes('liability')) {
      formType = 'waiver';
    } else if (titleLower.includes('contract') || titleLower.includes('agreement')) {
      formType = 'contract';
    } else if (titleLower.includes('health') || titleLower.includes('medical')) {
      formType = 'health';
    } else if (titleLower.includes('policy') || titleLower.includes('rules')) {
      formType = 'policy';
    }
    
    // Save the form to the database
    const { data: savedForm, error } = await supabase
      .from('forms')
      .insert({
        organization_id: userWithOrg.organizationId,
        title: formSchema.title,
        description: formSchema.description,
        type: formType,
        schema: formSchema,
        is_active: true
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error saving form:', error);
      throw new Error('Failed to save form to database');
    }
    
    return NextResponse.json({
      success: true,
      form: savedForm
    });
    
  } catch (error: any) {
    console.error('Error generating form:', error);
    
    // Return more detailed error for debugging
    const errorMessage = error.message || 'Failed to generate form';
    const isAnthropicError = error.message?.includes('Anthropic') || error.message?.includes('API');
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}