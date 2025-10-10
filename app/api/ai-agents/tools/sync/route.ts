/**
 * API endpoint to sync AI agent tools from code to database
 * This should be called once after deployment to populate the ai_agent_tools table
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncToolsToDatabase, getRegistryStats } from '@/lib/ai-agents/tools/registry';

export async function POST(request: NextRequest) {
  try {
    console.log('[Tool Sync] Starting tool synchronization...');

    // Get stats before sync
    const beforeStats = getRegistryStats();
    console.log('[Tool Sync] Registry stats:', beforeStats.stats);
    console.log('[Tool Sync] Total tools in code:', beforeStats.tools.all.length);

    // Sync tools to database
    const result = await syncToolsToDatabase();

    console.log('[Tool Sync] Sync complete:', result);

    return NextResponse.json({
      success: result.success,
      data: {
        toolsCreated: result.toolsCreated,
        toolsUpdated: result.toolsUpdated,
        totalTools: beforeStats.tools.all.length,
        errors: result.errors.length > 0 ? result.errors : undefined,
        registryStats: beforeStats.stats,
        toolsByCategory: beforeStats.tools.byCategory,
      },
      message: `Successfully synced ${result.toolsCreated + result.toolsUpdated} tools (${result.toolsCreated} created, ${result.toolsUpdated} updated)`
    });

  } catch (error: any) {
    console.error('[Tool Sync] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
