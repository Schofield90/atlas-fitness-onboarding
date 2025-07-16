import OpenAI from 'openai';
import { Lead } from './supabase';

// Initialize OpenAI client only when needed and key is available
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  
  if (!openai) {
    throw new Error('OpenAI API key is not configured');
  }
  
  return openai;
}

// Helper function to check if OpenAI is available
export function isOpenAIAvailable(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export interface AIQualificationResult {
  score: number; // 0-100 qualification score
  reasoning: string;
  recommendations: string[];
  urgency: 'low' | 'medium' | 'high';
  likelihood: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  next_actions: string[];
  tags: string[];
  ideal_plan: 'basic' | 'premium' | 'vip' | 'custom';
}

export class AIQualificationService {
  private static instance: AIQualificationService;

  public static getInstance(): AIQualificationService {
    if (!AIQualificationService.instance) {
      AIQualificationService.instance = new AIQualificationService();
    }
    return AIQualificationService.instance;
  }

  async qualifyLead(lead: Partial<Lead>, additionalContext?: string): Promise<AIQualificationResult> {
    const prompt = this.buildQualificationPrompt(lead, additionalContext);
    
    try {
      const client = getOpenAIClient();
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert fitness industry lead qualification specialist for Atlas Fitness, a premium gym business. 
            Your task is to analyze leads and provide detailed qualification scores and recommendations.
            
            Consider these factors:
            - Budget indicators and price sensitivity
            - Fitness goals and motivation level
            - Previous gym experience
            - Time availability and commitment potential
            - Demographics and location relevance
            - Urgency of fitness needs
            - Communication preferences and responsiveness
            
            Respond with a JSON object containing:
            - score: number (0-100)
            - reasoning: string explaining the score
            - recommendations: array of specific recommendations
            - urgency: 'low'|'medium'|'high'
            - likelihood: 'very_low'|'low'|'medium'|'high'|'very_high'
            - next_actions: array of immediate actions to take
            - tags: array of relevant tags
            - ideal_plan: 'basic'|'premium'|'vip'|'custom'`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1000
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      // Parse the JSON response
      const result = JSON.parse(content) as AIQualificationResult;
      
      // Validate and sanitize the result
      return this.validateResult(result);
    } catch (error) {
      console.error('AI qualification error:', error);
      // Return a fallback result
      return this.getFallbackResult(lead);
    }
  }

  private buildQualificationPrompt(lead: Partial<Lead>, additionalContext?: string): string {
    const leadInfo = [
      `Name: ${lead.first_name} ${lead.last_name}`,
      `Email: ${lead.email || 'Not provided'}`,
      `Phone: ${lead.phone || 'Not provided'}`,
      `Source: ${lead.source || 'Unknown'}`,
      `Goals: ${lead.goals || 'Not specified'}`,
      `Budget Range: ${lead.budget_range || 'Not specified'}`,
      `Interests: ${lead.interests?.join(', ') || 'Not specified'}`,
      `Preferred Contact: ${lead.preferred_contact_method || 'Not specified'}`,
      `Notes: ${lead.notes || 'No additional notes'}`
    ].join('\n');

    let prompt = `Please analyze this fitness lead and provide a detailed qualification assessment:

LEAD INFORMATION:
${leadInfo}

CAMPAIGN CONTEXT:
${lead.utm_source ? `UTM Source: ${lead.utm_source}` : ''}
${lead.utm_medium ? `UTM Medium: ${lead.utm_medium}` : ''}
${lead.utm_campaign ? `UTM Campaign: ${lead.utm_campaign}` : ''}
${lead.utm_content ? `UTM Content: ${lead.utm_content}` : ''}

BUSINESS CONTEXT:
Atlas Fitness is a premium gym in York, UK offering:
- Basic Membership (£29.99/month): Gym access, locker room
- Premium Membership (£49.99/month): Gym access, group classes, nutrition guidance
- VIP Membership (£99.99/month): Full access, personal training, priority booking

Target demographics: Adults 25-50, middle to upper-middle class, health-conscious individuals.
Peak conversion factors: Clear fitness goals, realistic budget, local to York area, previous gym experience.`;

    if (additionalContext) {
      prompt += `\n\nADDITIONAL CONTEXT:\n${additionalContext}`;
    }

    return prompt;
  }

  private validateResult(result: AIQualificationResult): AIQualificationResult {
    // Ensure score is within bounds
    const score = Math.max(0, Math.min(100, result.score || 0));
    
    // Validate enum values
    const validUrgency = ['low', 'medium', 'high'];
    const validLikelihood = ['very_low', 'low', 'medium', 'high', 'very_high'];
    const validPlans = ['basic', 'premium', 'vip', 'custom'];
    
    return {
      score,
      reasoning: result.reasoning || 'No reasoning provided',
      recommendations: Array.isArray(result.recommendations) ? result.recommendations : [],
      urgency: validUrgency.includes(result.urgency) ? result.urgency : 'medium',
      likelihood: validLikelihood.includes(result.likelihood) ? result.likelihood : 'medium',
      next_actions: Array.isArray(result.next_actions) ? result.next_actions : [],
      tags: Array.isArray(result.tags) ? result.tags : [],
      ideal_plan: validPlans.includes(result.ideal_plan) ? result.ideal_plan : 'basic'
    };
  }

  private getFallbackResult(lead: Partial<Lead>): AIQualificationResult {
    // Simple fallback scoring based on available data
    let score = 30; // Base score
    
    if (lead.email) score += 20;
    if (lead.phone) score += 20;
    if (lead.goals) score += 15;
    if (lead.budget_range) score += 15;
    
    return {
      score: Math.min(100, score),
      reasoning: 'Automated fallback qualification due to AI service unavailability',
      recommendations: [
        'Contact lead within 24 hours',
        'Gather more information about fitness goals',
        'Assess budget and membership preferences'
      ],
      urgency: 'medium',
      likelihood: 'medium',
      next_actions: [
        'Schedule initial consultation',
        'Send welcome email with gym information'
      ],
      tags: ['needs_qualification', 'new_lead'],
      ideal_plan: 'basic'
    };
  }

  async generateFollowUpMessage(lead: Partial<Lead>, qualification: AIQualificationResult): Promise<string> {
    const prompt = `Generate a personalized follow-up message for this gym lead:

Lead: ${lead.first_name} ${lead.last_name}
Goals: ${lead.goals || 'Not specified'}
Qualification Score: ${qualification.score}/100
Recommended Plan: ${qualification.ideal_plan}
Urgency: ${qualification.urgency}

Create a friendly, professional message that:
- Addresses their specific fitness goals
- Mentions relevant membership benefits
- Includes a clear call-to-action
- Feels personal and not templated
- Is 2-3 sentences maximum

Tone: Enthusiastic but professional, focused on helping them achieve their goals.`;

    try {
      const client = getOpenAIClient();
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a fitness sales specialist at Atlas Fitness. Create engaging, personalized follow-up messages that convert leads to members.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 200
      });

      return response.choices[0]?.message?.content || this.getFallbackMessage(lead);
    } catch (error) {
      console.error('Error generating follow-up message:', error);
      return this.getFallbackMessage(lead);
    }
  }

  private getFallbackMessage(lead: Partial<Lead>): string {
    return `Hi ${lead.first_name}, thanks for your interest in Atlas Fitness! I'd love to help you achieve your fitness goals. Would you like to schedule a quick call to discuss which membership option would work best for you?`;
  }

  async batchQualifyLeads(leads: Partial<Lead>[]): Promise<Map<string, AIQualificationResult>> {
    const results = new Map<string, AIQualificationResult>();
    
    // Process in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < leads.length; i += batchSize) {
      const batch = leads.slice(i, i + batchSize);
      const batchPromises = batch.map(async (lead) => {
        if (!lead.id) return null;
        const result = await this.qualifyLead(lead);
        return { id: lead.id, result };
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          results.set(result.value.id, result.value.result);
        }
      });
      
      // Add delay between batches
      if (i + batchSize < leads.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }
}

export const aiQualificationService = AIQualificationService.getInstance();