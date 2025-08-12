import { ActionConfig, ExecutionContext, NodeExecutionResult } from '../types';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

export async function aiGenerateAction(
  config: ActionConfig,
  context: ExecutionContext
): Promise<NodeExecutionResult> {
  const { parameters } = config;
  
  if (!parameters.prompt) {
    throw new Error('Prompt is required for AI generation');
  }
  
  try {
    const prompt = interpolateValue(parameters.prompt, context);
    const model = parameters.model || 'gpt-3.5-turbo';
    const temperature = parameters.temperature || 0.7;
    const maxTokens = parameters.maxTokens || 500;
    const systemPrompt = parameters.systemPrompt ? 
      interpolateValue(parameters.systemPrompt, context) : null;
    
    let result: string;
    
    if (model.startsWith('gpt')) {
      // OpenAI
      const messages: any[] = [];
      
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      
      messages.push({ role: 'user', content: prompt });
      
      const completion = await openai.chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        n: 1
      });
      
      result = completion.choices[0].message.content || '';
      
    } else if (model.startsWith('claude')) {
      // Anthropic
      const message = systemPrompt 
        ? `${systemPrompt}\n\nHuman: ${prompt}\n\nAssistant:`
        : `Human: ${prompt}\n\nAssistant:`;
      
      const completion = await anthropic.messages.create({
        model: model as any,
        messages: [{ role: 'user', content: message }],
        max_tokens: maxTokens,
        temperature
      });
      
      result = completion.content[0].type === 'text' 
        ? completion.content[0].text 
        : '';
    } else {
      throw new Error(`Unsupported AI model: ${model}`);
    }
    
    // Parse JSON if requested
    if (parameters.responseFormat === 'json') {
      try {
        const parsed = JSON.parse(result);
        return {
          success: true,
          output: {
            model,
            response: parsed,
            format: 'json',
            tokensUsed: result.length // Approximate
          }
        };
      } catch (e) {
        throw new Error('AI response was not valid JSON');
      }
    }
    
    // Extract fields if requested
    if (parameters.extractFields && Array.isArray(parameters.extractFields)) {
      const extracted: Record<string, any> = {};
      
      for (const field of parameters.extractFields) {
        // Simple extraction - in production would use better parsing
        const regex = new RegExp(`${field}:\\s*([^\\n]+)`, 'i');
        const match = result.match(regex);
        if (match) {
          extracted[field] = match[1].trim();
        }
      }
      
      return {
        success: true,
        output: {
          model,
          response: result,
          extracted,
          format: 'extracted',
          tokensUsed: result.length
        }
      };
    }
    
    return {
      success: true,
      output: {
        model,
        response: result,
        format: 'text',
        tokensUsed: result.length
      }
    };
    
  } catch (error) {
    console.error('AI generate action failed:', error);
    return {
      success: false,
      error: error.message,
      output: { error: error.message }
    };
  }
}

export async function aiAnalyzeAction(
  config: ActionConfig,
  context: ExecutionContext
): Promise<NodeExecutionResult> {
  const { parameters } = config;
  
  if (!parameters.data || !parameters.analysisType) {
    throw new Error('Data and analysis type are required');
  }
  
  try {
    const data = interpolateValue(parameters.data, context);
    const analysisType = parameters.analysisType;
    const model = parameters.model || 'gpt-3.5-turbo';
    
    let prompt: string;
    let systemPrompt: string;
    
    switch (analysisType) {
      case 'sentiment':
        systemPrompt = 'You are a sentiment analysis expert. Analyze the sentiment of the provided text and return a JSON object with sentiment (positive/negative/neutral), confidence (0-1), and key phrases.';
        prompt = `Analyze the sentiment of this text: ${JSON.stringify(data)}`;
        break;
        
      case 'lead_scoring':
        systemPrompt = 'You are a lead scoring expert for a fitness business. Analyze the lead data and return a JSON object with score (0-100), factors (array of scoring factors), and recommended_actions (array of next steps).';
        prompt = `Score this lead based on their likelihood to convert: ${JSON.stringify(data)}`;
        break;
        
      case 'content_moderation':
        systemPrompt = 'You are a content moderation expert. Analyze the text for inappropriate content and return a JSON object with is_appropriate (boolean), categories (array of any issues found), and confidence (0-1).';
        prompt = `Moderate this content: ${JSON.stringify(data)}`;
        break;
        
      case 'data_extraction':
        systemPrompt = 'You are a data extraction expert. Extract structured information from the provided text and return it as a JSON object.';
        prompt = `Extract structured data from: ${JSON.stringify(data)}`;
        if (parameters.extractionSchema) {
          prompt += `\n\nExpected schema: ${JSON.stringify(parameters.extractionSchema)}`;
        }
        break;
        
      case 'classification':
        systemPrompt = 'You are a classification expert. Classify the provided data into the appropriate category.';
        prompt = `Classify this data: ${JSON.stringify(data)}`;
        if (parameters.categories) {
          prompt += `\n\nAvailable categories: ${parameters.categories.join(', ')}`;
        }
        break;
        
      default:
        throw new Error(`Unknown analysis type: ${analysisType}`);
    }
    
    // Call AI
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ];
    
    const completion = await openai.chat.completions.create({
      model,
      messages,
      temperature: 0.3, // Lower temperature for analysis
      max_tokens: 500,
      response_format: { type: 'json_object' }
    });
    
    const result = completion.choices[0].message.content || '{}';
    let analysis;
    
    try {
      analysis = JSON.parse(result);
    } catch (e) {
      throw new Error('AI analysis did not return valid JSON');
    }
    
    return {
      success: true,
      output: {
        analysisType,
        model,
        analysis,
        dataAnalyzed: typeof data === 'string' ? data.substring(0, 100) + '...' : data
      }
    };
    
  } catch (error) {
    console.error('AI analyze action failed:', error);
    return {
      success: false,
      error: error.message,
      output: { error: error.message }
    };
  }
}

function interpolateValue(template: string | any, context: ExecutionContext): any {
  if (typeof template !== 'string') return template;
  
  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const keys = path.trim().split('.');
    let value = context;
    
    for (const key of keys) {
      value = value?.[key];
      if (value === undefined) break;
    }
    
    return value !== undefined ? String(value) : match;
  });
}