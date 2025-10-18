import { NextRequest, NextResponse } from 'next/server';
import { AgentOrchestrator } from '@/app/lib/ai-agents/orchestrator';
import { createAdminClient } from '@/app/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const agentId = '1b44af8e-d29d-4fdf-98a8-ab586a289e5e'; // Aimee's Place agent

  const supabase = createAdminClient();
  const { data: agent } = await supabase
    .from('ai_agents')
    .select('*')
    .eq('id', agentId)
    .single();

  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  // Create orchestrator and call loadAgentSystemPrompt via a test conversation
  const orchestrator = new AgentOrchestrator();

  // Access the private method via any to bypass TypeScript
  const systemPrompt = await (orchestrator as any).loadAgentSystemPrompt(
    agent.id,
    agent.system_prompt,
    agent.organization_id
  );

  return NextResponse.json({
    agentId: agent.id,
    agentName: agent.name,
    organizationId: agent.organization_id,
    systemPromptLength: systemPrompt.length,
    systemPromptPreview: systemPrompt.substring(0, 1000),
    hasDateHeader: systemPrompt.includes('CURRENT DATE/TIME'),
    hasDayOfWeek: systemPrompt.includes('Day of Week'),
    hasTimezone: systemPrompt.includes('Timezone:'),
  });
}
