/**
 * AI Agent Tool Registry - Usage Examples
 *
 * This file demonstrates how to use the tool registry system
 */

import { toolRegistry, loadToolsToDatabase, syncToolsToDatabase } from './registry';

// ============================================================================
// Example 1: Execute a tool directly
// ============================================================================

export async function exampleExecuteTool() {
  const result = await toolRegistry.executeTool(
    'search_clients',
    {
      query: 'john@example.com',
      limit: 10,
      status: 'active'
    },
    {
      organizationId: '123e4567-e89b-12d3-a456-426614174000',
      agentId: '987fcdeb-51a2-43e1-b456-426614174abc',
      userId: '456e7890-e89b-12d3-a456-426614174def'
    }
  );

  if (result.success) {
    console.log('Found clients:', result.data);
    console.log('Execution time:', result.metadata?.executionTimeMs, 'ms');
  } else {
    console.error('Error:', result.error);
  }

  return result;
}

// ============================================================================
// Example 2: Get tools for OpenAI
// ============================================================================

export function exampleGetToolsForOpenAI() {
  const tools = toolRegistry.getToolsForOpenAI([
    'search_clients',
    'send_email',
    'generate_revenue_report'
  ]);

  console.log('OpenAI Tools:', JSON.stringify(tools, null, 2));

  // Use with OpenAI:
  // const completion = await openai.chat.completions.create({
  //   model: 'gpt-4',
  //   messages: [...],
  //   tools: tools
  // });

  return tools;
}

// ============================================================================
// Example 3: Get tools for Anthropic
// ============================================================================

export function exampleGetToolsForAnthropic() {
  const tools = toolRegistry.getToolsForAnthropic([
    'search_clients',
    'create_support_ticket',
    'generate_churn_report'
  ]);

  console.log('Anthropic Tools:', JSON.stringify(tools, null, 2));

  // Use with Anthropic:
  // const message = await anthropic.messages.create({
  //   model: 'claude-3-5-sonnet-20241022',
  //   messages: [...],
  //   tools: tools
  // });

  return tools;
}

// ============================================================================
// Example 4: Browse and discover tools
// ============================================================================

export function exampleBrowseTools() {
  // Get all tools
  const allTools = toolRegistry.getAllTools();
  console.log(`Total tools: ${allTools.length}`);

  // Get tools by category
  const dataTools = toolRegistry.getToolsByCategory('data');
  console.log(`Data tools: ${dataTools.length}`);

  const analyticsTools = toolRegistry.getToolsByCategory('analytics');
  console.log(`Analytics tools: ${analyticsTools.length}`);

  // Search tools
  const clientTools = toolRegistry.searchTools('client');
  console.log('Tools related to "client":', clientTools.map(t => t.id));

  // Get registry stats
  const stats = toolRegistry.getToolStats();
  console.log('Registry stats:', stats);

  return { allTools, dataTools, analyticsTools, clientTools, stats };
}

// ============================================================================
// Example 5: Sync tools to database (one-time setup)
// ============================================================================

export async function exampleSyncToolsToDatabase() {
  console.log('Syncing tools to database...');

  const result = await syncToolsToDatabase();

  console.log(`Updated: ${result.toolsUpdated} tools`);
  console.log(`Created: ${result.toolsCreated} tools`);

  if (result.errors.length > 0) {
    console.error('Errors:', result.errors);
  }

  return result;
}

// ============================================================================
// Example 6: Load tools to database (initial setup)
// ============================================================================

export async function exampleLoadToolsToDatabase() {
  console.log('Loading tools to database (initial setup)...');

  const result = await loadToolsToDatabase();

  console.log(`Loaded: ${result.toolsLoaded} tools`);

  if (result.errors.length > 0) {
    console.error('Errors:', result.errors);
  }

  return result;
}

// ============================================================================
// Example 7: Execute multiple tools in sequence
// ============================================================================

export async function exampleMultiToolWorkflow() {
  const context = {
    organizationId: '123e4567-e89b-12d3-a456-426614174000',
    agentId: '987fcdeb-51a2-43e1-b456-426614174abc',
    userId: '456e7890-e89b-12d3-a456-426614174def'
  };

  // Step 1: Search for a client
  const searchResult = await toolRegistry.executeTool(
    'search_clients',
    { query: 'john@example.com', limit: 1 },
    context
  );

  if (!searchResult.success || !searchResult.data.length) {
    return { error: 'Client not found' };
  }

  const clientId = searchResult.data[0].id;

  // Step 2: Get client profile
  const profileResult = await toolRegistry.executeTool(
    'view_client_profile',
    { clientId },
    context
  );

  // Step 3: Get client bookings
  const bookingsResult = await toolRegistry.executeTool(
    'view_client_bookings',
    { clientId, limit: 10 },
    context
  );

  // Step 4: Calculate engagement score
  const engagementResult = await toolRegistry.executeTool(
    'calculate_engagement_score',
    { clientId, periodDays: 30 },
    context
  );

  return {
    client: profileResult.data,
    recentBookings: bookingsResult.data,
    engagement: engagementResult.data
  };
}

// ============================================================================
// Example 8: Get specific tool information
// ============================================================================

export function exampleGetToolInfo() {
  const tool = toolRegistry.getTool('search_clients');

  if (!tool) {
    console.error('Tool not found');
    return null;
  }

  console.log('Tool ID:', tool.id);
  console.log('Tool Name:', tool.name);
  console.log('Description:', tool.description);
  console.log('Category:', tool.category);
  console.log('Required Permission:', tool.requiresPermission);
  console.log('Enabled:', tool.enabled);

  // Get OpenAI format
  const openaiFormat = tool.toOpenAIFunction();
  console.log('OpenAI Format:', JSON.stringify(openaiFormat, null, 2));

  // Get Anthropic format
  const anthropicFormat = tool.toAnthropicTool();
  console.log('Anthropic Format:', JSON.stringify(anthropicFormat, null, 2));

  return { tool, openaiFormat, anthropicFormat };
}

// ============================================================================
// Example 9: Execute tool with error handling
// ============================================================================

export async function exampleExecuteToolWithErrorHandling() {
  try {
    const result = await toolRegistry.executeTool(
      'send_email',
      {
        to: ['client@example.com'],
        subject: 'Welcome to our gym!',
        body: 'Thank you for joining...'
      },
      {
        organizationId: '123e4567-e89b-12d3-a456-426614174000',
        agentId: '987fcdeb-51a2-43e1-b456-426614174abc'
      }
    );

    if (result.success) {
      console.log('Email queued successfully');
      console.log('Email IDs:', result.data.emailIds);
    } else {
      console.error('Failed to queue email:', result.error);
    }

    return result;
  } catch (error) {
    console.error('Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// ============================================================================
// Example 10: Filter tools by permission
// ============================================================================

export function exampleFilterToolsByPermission() {
  const allTools = toolRegistry.getAllTools();

  // Tools that require no permission
  const publicTools = allTools.filter(t => !t.requiresPermission);
  console.log('Public tools:', publicTools.map(t => t.id));

  // Tools that require specific permissions
  const clientReadTools = allTools.filter(t => t.requiresPermission === 'clients:read');
  console.log('Client read tools:', clientReadTools.map(t => t.id));

  const clientWriteTools = allTools.filter(t => t.requiresPermission === 'clients:write');
  console.log('Client write tools:', clientWriteTools.map(t => t.id));

  return { publicTools, clientReadTools, clientWriteTools };
}

// ============================================================================
// Run examples (for testing)
// ============================================================================

if (require.main === module) {
  (async () => {
    console.log('=== AI Agent Tool Registry Examples ===\n');

    // Example 4: Browse tools
    console.log('\n--- Example 4: Browse Tools ---');
    exampleBrowseTools();

    // Example 8: Get tool info
    console.log('\n--- Example 8: Get Tool Info ---');
    exampleGetToolInfo();

    // Example 10: Filter by permission
    console.log('\n--- Example 10: Filter by Permission ---');
    exampleFilterToolsByPermission();

    // Example 2: Get tools for OpenAI
    console.log('\n--- Example 2: Get Tools for OpenAI ---');
    exampleGetToolsForOpenAI();

    // Example 3: Get tools for Anthropic
    console.log('\n--- Example 3: Get Tools for Anthropic ---');
    exampleGetToolsForAnthropic();
  })();
}
