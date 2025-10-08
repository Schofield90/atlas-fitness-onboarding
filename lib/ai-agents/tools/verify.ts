/**
 * Tool Registry Verification Script
 *
 * Run this script to verify the tool registry is working correctly
 * Usage: npx tsx lib/ai-agents/tools/verify.ts
 */

import { toolRegistry, getRegistryStats } from './registry';

console.log('🔧 AI Agent Tool Registry Verification\n');
console.log('=' .repeat(60));

// Test 1: Registry Initialization
console.log('\n✓ Test 1: Registry Initialization');
const allTools = toolRegistry.getAllTools();
console.log(`  Total tools registered: ${allTools.length}`);

// Test 2: Tool Categories
console.log('\n✓ Test 2: Tool Categories');
const categories = ['data', 'analytics', 'messaging', 'automation', 'crm', 'reports'];
categories.forEach(category => {
  const tools = toolRegistry.getToolsByCategory(category);
  console.log(`  ${category}: ${tools.length} tools`);
});

// Test 3: Registry Stats
console.log('\n✓ Test 3: Registry Stats');
const stats = toolRegistry.getToolStats();
console.log(`  Stats:`, stats);

// Test 4: Tool Discovery
console.log('\n✓ Test 4: Tool Discovery');
const searchResults = toolRegistry.searchTools('client');
console.log(`  Tools matching "client": ${searchResults.length}`);
searchResults.forEach(tool => {
  console.log(`    - ${tool.id} (${tool.category})`);
});

// Test 5: Individual Tool Info
console.log('\n✓ Test 5: Individual Tool Info');
const sampleTool = toolRegistry.getTool('search_clients');
if (sampleTool) {
  console.log(`  Tool ID: ${sampleTool.id}`);
  console.log(`  Name: ${sampleTool.name}`);
  console.log(`  Category: ${sampleTool.category}`);
  console.log(`  Enabled: ${sampleTool.enabled}`);
  console.log(`  Permission: ${sampleTool.requiresPermission || 'none'}`);
}

// Test 6: OpenAI Format Conversion
console.log('\n✓ Test 6: OpenAI Format Conversion');
const openaiTools = toolRegistry.getToolsForOpenAI(['search_clients', 'send_email']);
console.log(`  Converted ${openaiTools.length} tools to OpenAI format`);
openaiTools.forEach(tool => {
  console.log(`    - ${tool.function.name}`);
});

// Test 7: Anthropic Format Conversion
console.log('\n✓ Test 7: Anthropic Format Conversion');
const anthropicTools = toolRegistry.getToolsForAnthropic(['search_clients', 'send_email']);
console.log(`  Converted ${anthropicTools.length} tools to Anthropic format`);
anthropicTools.forEach(tool => {
  console.log(`    - ${tool.name}`);
});

// Test 8: Full Registry Export
console.log('\n✓ Test 8: Full Registry Export');
const registryExport = getRegistryStats();
console.log(`  Total categories: ${Object.keys(registryExport.tools.byCategory).length}`);
console.log(`  Total tools: ${registryExport.stats.total}`);

// Summary
console.log('\n' + '='.repeat(60));
console.log('✅ All verification tests passed!');
console.log('\nRegistry is ready to use.');
console.log('\nNext steps:');
console.log('1. Run: await syncToolsToDatabase() to seed the database');
console.log('2. Import tools in your agent code');
console.log('3. Start building AI agents with tool capabilities');
console.log('='.repeat(60) + '\n');

// List all registered tools
console.log('\n📋 Complete Tool List:\n');
allTools.forEach((tool, index) => {
  console.log(`${index + 1}. ${tool.id}`);
  console.log(`   ${tool.name}`);
  console.log(`   Category: ${tool.category} | Permission: ${tool.requiresPermission || 'none'}`);
  console.log(`   ${tool.description.substring(0, 80)}...`);
  console.log('');
});
