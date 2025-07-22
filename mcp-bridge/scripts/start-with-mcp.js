#!/usr/bin/env node

/**
 * Start MCP Bridge with proper MCP connection
 * Attempts to connect to existing Claude MCP server
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const MCP_PATHS = [
  '/Users/samschofield/claude-meta-mcp',
  '/Users/samschofield/claude-meta-mcp/server.py',
  '/Users/samschofield/claude-meta-mcp/app.py'
];

const BRIDGE_CONFIG = {
  PORT: 3000,
  MCP_SERVER_URL: 'ws://localhost:8080',
  LOG_LEVEL: 'info',
  NODE_ENV: 'development'
};

async function findMCPServer() {
  console.log('🔍 Looking for Claude MCP server...');
  
  for (const mcpPath of MCP_PATHS) {
    if (fs.existsSync(mcpPath)) {
      console.log(`✅ Found MCP at: ${mcpPath}`);
      return mcpPath;
    }
  }
  
  console.log('⚠️  Claude MCP server not found in expected locations');
  return null;
}

async function startMCPServer(mcpPath) {
  return new Promise((resolve, reject) => {
    console.log('🚀 Starting Claude MCP server...');
    
    const isDirectory = fs.lstatSync(mcpPath).isDirectory();
    const workingDir = isDirectory ? mcpPath : path.dirname(mcpPath);
    const scriptName = isDirectory ? 'app.py' : path.basename(mcpPath);
    
    const mcpProcess = spawn('python', [scriptName], {
      cwd: workingDir,
      stdio: 'pipe',
      env: {
        ...process.env,
        PYTHONPATH: workingDir,
        PORT: '8080'
      }
    });
    
    let serverReady = false;
    
    mcpProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`MCP: ${output.trim()}`);
      
      if (output.includes('Running on') || output.includes('listening') || output.includes('8080')) {
        serverReady = true;
        resolve(mcpProcess);
      }
    });
    
    mcpProcess.stderr.on('data', (data) => {
      const error = data.toString();
      console.log(`MCP Error: ${error.trim()}`);
      
      if (error.includes('Running on') || error.includes('listening')) {
        serverReady = true;
        resolve(mcpProcess);
      }
    });
    
    mcpProcess.on('error', (error) => {
      console.log(`❌ Failed to start MCP server: ${error.message}`);
      reject(error);
    });
    
    mcpProcess.on('exit', (code) => {
      if (!serverReady) {
        console.log(`❌ MCP server exited with code ${code}`);
        reject(new Error(`MCP server failed to start (exit code ${code})`));
      }
    });
    
    // Give the server time to start
    setTimeout(() => {
      if (!serverReady) {
        console.log('⏰ MCP server taking longer than expected...');
        // Don't reject, just warn
        resolve(mcpProcess);
      }
    }, 10000);
  });
}

async function startBridgeService() {
  return new Promise((resolve, reject) => {
    console.log('🌉 Starting MCP Bridge Service...');
    
    const env = {
      ...process.env,
      ...BRIDGE_CONFIG
    };
    
    const bridgeProcess = spawn('node', ['src/server.js'], {
      cwd: '/Users/samschofield/mcp-bridge',
      stdio: 'pipe',
      env
    });
    
    bridgeProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`Bridge: ${output.trim()}`);
      
      if (output.includes('MCP Bridge Service started')) {
        resolve(bridgeProcess);
      }
    });
    
    bridgeProcess.stderr.on('data', (data) => {
      const error = data.toString();
      console.log(`Bridge Error: ${error.trim()}`);
    });
    
    bridgeProcess.on('error', (error) => {
      console.log(`❌ Failed to start Bridge service: ${error.message}`);
      reject(error);
    });
    
    bridgeProcess.on('exit', (code) => {
      console.log(`🌉 Bridge service exited with code ${code}`);
    });
  });
}

async function main() {
  console.log('🚀 Starting MCP Bridge Service with Claude MCP...\n');
  
  try {
    // Find MCP server
    const mcpPath = await findMCPServer();
    
    let mcpProcess = null;
    
    if (mcpPath) {
      try {
        mcpProcess = await startMCPServer(mcpPath);
        console.log('✅ MCP server started successfully\n');
        
        // Wait a bit for MCP to be ready
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (error) {
        console.log('⚠️  MCP server failed to start, continuing anyway...\n');
      }
    } else {
      console.log('⚠️  No MCP server found, you may need to start it manually\n');
    }
    
    // Start bridge service
    const bridgeProcess = await startBridgeService();
    console.log('✅ MCP Bridge Service started successfully\n');
    
    console.log('🎉 Services are running:');
    console.log(`   - MCP Bridge: http://localhost:${BRIDGE_CONFIG.PORT}`);
    console.log(`   - Health Check: http://localhost:${BRIDGE_CONFIG.PORT}/health`);
    console.log(`   - API Docs: http://localhost:${BRIDGE_CONFIG.PORT}/docs`);
    console.log('');
    console.log('📝 Next steps:');
    console.log('   1. Test the connection: node scripts/test-mcp-connection.js');
    console.log('   2. Update your n8n workflows to use HTTP Request nodes');
    console.log('   3. Point n8n to: http://localhost:3000/mcp');
    console.log('');
    console.log('Press Ctrl+C to stop all services');
    
    // Handle shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down services...');
      
      if (bridgeProcess) {
        bridgeProcess.kill('SIGTERM');
      }
      
      if (mcpProcess) {
        mcpProcess.kill('SIGTERM');
      }
      
      setTimeout(() => {
        console.log('✅ Services stopped');
        process.exit(0);
      }, 2000);
    });
    
    // Keep the process running
    await new Promise(() => {});
    
  } catch (error) {
    console.error('❌ Failed to start services:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);