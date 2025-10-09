/**
 * AI Agents Type Definitions
 */

export interface Agent {
  id: string;
  organization_id: string;
  role: string;
  name: string;
  description: string;
  avatar_url?: string;
  system_prompt: string;
  model: string;
  temperature: number;
  max_tokens: number;
  allowed_tools: string[];
  enabled: boolean;
  metadata: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  tool_calls?: ToolCall[];
  tool_results?: ToolResult[];
  tokens_used?: number;
  cost_usd?: number;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolResult {
  tool_call_id: string;
  content: string;
  is_error?: boolean;
}

export interface Conversation {
  id: string;
  organization_id: string;
  agent_id: string;
  user_id?: string;
  title: string;
  status: "active" | "archived" | "deleted";
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  agent?: Agent;
}

export interface SendMessageResponse {
  success: boolean;
  userMessage?: Message;
  assistantMessage?: Message;
  cost?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    costUsd: number;
    model: string;
  };
  conversationId?: string;
  error?: string;
}

export interface MessagesResponse {
  success: boolean;
  messages?: Message[];
  conversationId?: string;
  total?: number;
  page?: number;
  limit?: number;
  hasMore?: boolean;
  error?: string;
}
