import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(request: NextRequest) {
  try {
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

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: description
        }
      ]
    });
    
    // Extract the JSON from the response
    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }
    
    // Parse the JSON from the response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    
    const formSchema = JSON.parse(jsonMatch[0]);
    
    // TODO: Save the form schema to the database
    
    return NextResponse.json({
      success: true,
      form: formSchema
    });
    
  } catch (error) {
    console.error('Error generating form:', error);
    return NextResponse.json(
      { error: 'Failed to generate form' },
      { status: 500 }
    );
  }
}