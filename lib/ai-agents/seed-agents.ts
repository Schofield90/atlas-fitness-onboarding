/**
 * AI Agent Seeding System
 * Seeds default agents for organizations
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { DEFAULT_AGENT_TEMPLATES } from './default-agents';

export interface SeedAgentsOptions {
  organizationId: string;
  skipExisting?: boolean; // Skip if default agents already exist
}

export interface SeedAgentsResult {
  success: boolean;
  agentsCreated: number;
  agentsSkipped: number;
  agents: any[];
  errors: string[];
}

/**
 * Seed default agents for an organization
 */
export async function seedDefaultAgents(
  options: SeedAgentsOptions
): Promise<SeedAgentsResult> {
  const { organizationId, skipExisting = true } = options;

  const supabase = createAdminClient();
  const result: SeedAgentsResult = {
    success: true,
    agentsCreated: 0,
    agentsSkipped: 0,
    agents: [],
    errors: []
  };

  try {
    // Check if default agents already exist for this org
    if (skipExisting) {
      const { data: existingAgents, error: checkError } = await supabase
        .from('ai_agents')
        .select('id, role')
        .eq('organization_id', organizationId)
        .eq('is_default', true);

      if (checkError) {
        result.errors.push(`Failed to check existing agents: ${checkError.message}`);
        result.success = false;
        return result;
      }

      if (existingAgents && existingAgents.length > 0) {
        result.agentsSkipped = existingAgents.length;
        result.agents = existingAgents;
        return result;
      }
    }

    // Create default agents
    for (const template of DEFAULT_AGENT_TEMPLATES) {
      try {
        const { data: agent, error: insertError } = await supabase
          .from('ai_agents')
          .insert({
            organization_id: organizationId,
            name: template.name,
            description: template.description,
            avatar_url: template.avatar_url,
            role: template.role,
            system_prompt: template.system_prompt,
            model: template.model,
            temperature: template.temperature,
            max_tokens: template.max_tokens,
            enabled: true,
            is_default: true,
            allowed_tools: template.allowed_tools,
            metadata: template.metadata
          })
          .select()
          .single();

        if (insertError) {
          result.errors.push(
            `Failed to create ${template.name}: ${insertError.message}`
          );
          result.success = false;
          continue;
        }

        result.agents.push(agent);
        result.agentsCreated++;
      } catch (error: any) {
        result.errors.push(
          `Exception creating ${template.name}: ${error.message}`
        );
        result.success = false;
      }
    }

    return result;
  } catch (error: any) {
    result.errors.push(`Seeding failed: ${error.message}`);
    result.success = false;
    return result;
  }
}

/**
 * Seed default agents for all organizations that don't have them
 */
export async function seedDefaultAgentsForAllOrgs(): Promise<{
  success: boolean;
  totalOrgs: number;
  orgsSeeded: number;
  totalAgentsCreated: number;
  errors: string[];
}> {
  const supabase = createAdminClient();

  const aggregateResult = {
    success: true,
    totalOrgs: 0,
    orgsSeeded: 0,
    totalAgentsCreated: 0,
    errors: [] as string[]
  };

  try {
    // Get all organizations
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('id, name');

    if (orgsError) {
      aggregateResult.errors.push(`Failed to fetch orgs: ${orgsError.message}`);
      aggregateResult.success = false;
      return aggregateResult;
    }

    if (!orgs || orgs.length === 0) {
      return aggregateResult;
    }

    aggregateResult.totalOrgs = orgs.length;

    // Seed each organization
    for (const org of orgs) {
      const seedResult = await seedDefaultAgents({
        organizationId: org.id,
        skipExisting: true
      });

      if (seedResult.agentsCreated > 0) {
        aggregateResult.orgsSeeded++;
        aggregateResult.totalAgentsCreated += seedResult.agentsCreated;
      }

      if (seedResult.errors.length > 0) {
        aggregateResult.errors.push(
          `${org.name}: ${seedResult.errors.join(', ')}`
        );
        aggregateResult.success = false;
      }
    }

    return aggregateResult;
  } catch (error: any) {
    aggregateResult.errors.push(`Bulk seeding failed: ${error.message}`);
    aggregateResult.success = false;
    return aggregateResult;
  }
}

/**
 * Update default agents for an organization (re-sync prompts and configs)
 */
export async function updateDefaultAgents(
  organizationId: string
): Promise<SeedAgentsResult> {
  const supabase = createAdminClient();

  const result: SeedAgentsResult = {
    success: true,
    agentsCreated: 0,
    agentsSkipped: 0,
    agents: [],
    errors: []
  };

  try {
    // Get existing default agents for this org
    const { data: existingAgents, error: fetchError } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_default', true);

    if (fetchError) {
      result.errors.push(`Failed to fetch agents: ${fetchError.message}`);
      result.success = false;
      return result;
    }

    if (!existingAgents || existingAgents.length === 0) {
      // No default agents exist, seed them
      return await seedDefaultAgents({ organizationId });
    }

    // Update existing agents with latest templates
    for (const existingAgent of existingAgents) {
      const template = DEFAULT_AGENT_TEMPLATES.find(
        t => t.role === existingAgent.role
      );

      if (!template) {
        result.errors.push(`No template found for role: ${existingAgent.role}`);
        continue;
      }

      const { data: updatedAgent, error: updateError } = await supabase
        .from('ai_agents')
        .update({
          description: template.description,
          system_prompt: template.system_prompt,
          model: template.model,
          temperature: template.temperature,
          max_tokens: template.max_tokens,
          allowed_tools: template.allowed_tools,
          metadata: template.metadata
        })
        .eq('id', existingAgent.id)
        .select()
        .single();

      if (updateError) {
        result.errors.push(
          `Failed to update ${existingAgent.name}: ${updateError.message}`
        );
        result.success = false;
        continue;
      }

      result.agents.push(updatedAgent);
      result.agentsCreated++;
    }

    return result;
  } catch (error: any) {
    result.errors.push(`Update failed: ${error.message}`);
    result.success = false;
    return result;
  }
}
