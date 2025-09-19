import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient } from '@/lib/ai/openai-client';

interface Response {
  questionId: string;
  value: string | string[];
}

interface RequestBody {
  responses: Response[];
  askedQuestions: string[];
}

interface Question {
  id: string;
  type: 'text' | 'number' | 'select' | 'textarea' | 'multiselect';
  question: string;
  options?: string[];
  required: boolean;
  category: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { responses, askedQuestions } = body;

    // Get OpenAI client
    const openai = getOpenAIClient();

    // Create context from existing responses
    const responseContext = responses.map(r =>
      `${r.questionId}: ${Array.isArray(r.value) ? r.value.join(', ') : r.value}`
    ).join('\n');

    const askedQuestionsContext = askedQuestions.join(', ');

    // AI prompt to generate personalized follow-up questions
    const prompt = `
You are a nutrition expert creating personalized follow-up questions for a fitness client's nutrition assessment.

Current responses:
${responseContext}

Already asked questions: ${askedQuestionsContext}

Based on the client's responses, generate 2-3 highly specific, relevant follow-up questions that will help create a better nutrition plan.

Rules:
1. Questions must be directly related to their responses and goals
2. Never repeat questions from the "already asked" list
3. Focus on practical, actionable information
4. Consider their specific goals, activity level, and current situation
5. Questions should help determine: food preferences, dietary restrictions, meal timing, cooking habits, supplement needs, hydration, or specific challenges

Return a JSON array of question objects with this exact structure:
[
  {
    "id": "unique_snake_case_id",
    "type": "select|text|number|textarea",
    "question": "Clear, specific question text",
    "options": ["option1", "option2"] (only for select type),
    "required": true,
    "category": "advanced"
  }
]

Generate meaningful questions that dive deeper into their specific situation.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a nutrition expert who generates personalized follow-up questions for fitness clients. Always return valid JSON arrays."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const aiResponse = completion.choices[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('No response from OpenAI');
    }

    // Parse the AI response as JSON
    let generatedQuestions: Question[];
    try {
      generatedQuestions = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse);
      // Fallback questions if AI response is malformed
      generatedQuestions = [
        {
          id: 'meal_frequency',
          type: 'select',
          question: 'How many meals do you typically eat per day?',
          options: ['2-3 meals', '4-5 small meals', '6+ small meals', 'Intermittent fasting'],
          required: true,
          category: 'advanced'
        },
        {
          id: 'dietary_restrictions',
          type: 'textarea',
          question: 'Do you have any food allergies, intolerances, or dietary restrictions?',
          required: false,
          category: 'advanced'
        }
      ];
    }

    // Validate and filter questions
    const validQuestions = generatedQuestions.filter(q =>
      q.id &&
      q.question &&
      q.type &&
      !askedQuestions.includes(q.id)
    ).slice(0, 3); // Limit to 3 questions

    return NextResponse.json({
      success: true,
      data: {
        questions: validQuestions
      }
    });

  } catch (error) {
    console.error('Error generating adaptive questions:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to generate adaptive questions'
    }, { status: 500 });
  }
}