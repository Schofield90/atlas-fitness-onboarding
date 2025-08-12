#!/usr/bin/env tsx

/**
 * Queue Workers Startup Script
 * 
 * This script initializes and starts the enhanced BullMQ queue system
 * for the Atlas Fitness CRM platform.
 * 
 * Usage:
 *   npm run queue:start
 *   tsx scripts/start-queue-workers.ts
 *   node --loader tsx/esm scripts/start-queue-workers.ts
 */

import { config } from 'dotenv';
import { initializeQueueSystem, shutdownQueueSystem, checkEnvironment } from '../app/lib/queue';

// Load environment variables
config();

async function main() {
  console.log('🚀 Atlas Fitness CRM - Queue Workers Startup');
  console.log('==========================================');
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📅 Started at: ${new Date().toISOString()}`);
  console.log(`🏷️  Process ID: ${process.pid}`);
  console.log();

  try {
    // Check environment configuration
    console.log('🔍 Checking environment configuration...');
    const envCheck = checkEnvironment();
    
    if (!envCheck.valid) {
      console.error('❌ Environment configuration issues found:');
      envCheck.issues.forEach(issue => console.error(`   - ${issue}`));
      console.log();
      console.log('📋 Current configuration:');
      console.log(JSON.stringify(envCheck.config, null, 2));
      process.exit(1);
    }
    
    console.log('✅ Environment configuration validated');
    console.log('📋 Configuration summary:');
    console.log(`   - Redis: ${envCheck.config.redis.host}:${envCheck.config.redis.port}`);
    console.log(`   - Queue Prefix: ${envCheck.config.queuePrefix}`);
    console.log(`   - TLS: ${envCheck.config.redis.tls ? 'Enabled' : 'Disabled'}`);
    console.log();

    // Initialize the queue system
    console.log('⚡ Initializing enhanced queue system...');
    await initializeQueueSystem();
    
    console.log();
    console.log('🎉 Queue system startup completed successfully!');
    console.log('📊 System is now processing jobs...');
    console.log();
    console.log('Available commands:');
    console.log('  - Ctrl+C: Graceful shutdown');
    console.log('  - SIGTERM: Graceful shutdown');
    console.log('  - SIGUSR1: System status');
    console.log('  - SIGUSR2: Health check');
    console.log();
    console.log('🔍 Monitor the system at: http://localhost:3000/api/health');
    console.log('📊 Queue statistics: http://localhost:3000/api/queues/stats');
    
    // Keep the process running
    process.stdin.resume();
    
  } catch (error) {
    console.error('❌ Failed to start queue workers:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Graceful shutdown handling
let isShuttingDown = false;

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) {
    console.log('🔄 Shutdown already in progress...');
    return;
  }
  
  isShuttingDown = true;
  console.log();
  console.log(`🛑 Received ${signal}, starting graceful shutdown...`);
  
  try {
    const shutdownStart = Date.now();
    
    // Shutdown the queue system
    await shutdownQueueSystem();
    
    const shutdownTime = Date.now() - shutdownStart;
    console.log(`✅ Graceful shutdown completed in ${shutdownTime}ms`);
    console.log('👋 Atlas Fitness CRM Queue Workers stopped');
    
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Emergency shutdown for uncaught errors
async function emergencyShutdown(error: any, type: string) {
  console.error();
  console.error(`💥 ${type}:`, error);
  console.error('🚨 Initiating emergency shutdown...');
  
  try {
    await shutdownQueueSystem();
    console.error('🚨 Emergency shutdown completed');
  } catch (shutdownError) {
    console.error('💀 Emergency shutdown failed:', shutdownError);
  }
  
  process.exit(1);
}

// System status handler
function logSystemStatus() {
  console.log();
  console.log('📊 System Status at', new Date().toISOString());
  console.log(`   - Uptime: ${Math.floor(process.uptime())} seconds`);
  console.log(`   - Memory: ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`);
  console.log(`   - CPU Usage: ${process.cpuUsage()}`);
  console.log(`   - Process ID: ${process.pid}`);
  console.log();
}

// Health check trigger
async function triggerHealthCheck() {
  try {
    console.log();
    console.log('🏥 Triggering manual health check...');
    
    const { performHealthCheck } = await import('../app/lib/queue');
    await performHealthCheck();
    
    console.log('✅ Health check initiated');
    console.log();
  } catch (error) {
    console.error('❌ Health check failed:', error);
  }
}

// Signal handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));

// Development signals (nodemon, PM2)
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2'));

// Status and health check signals
process.on('SIGUSR1', logSystemStatus);
process.on('SIGQUIT', triggerHealthCheck);

// Emergency shutdown handlers
process.on('uncaughtException', (error) => {
  emergencyShutdown(error, 'Uncaught Exception');
});

process.on('unhandledRejection', (reason, promise) => {
  emergencyShutdown({ reason, promise }, 'Unhandled Promise Rejection');
});

// Handle worker thread errors
process.on('worker', (worker) => {
  worker.on('error', (error) => {
    console.error('👷 Worker error:', error);
  });
  
  worker.on('exit', (code) => {
    if (code !== 0) {
      console.error(`👷 Worker stopped with exit code ${code}`);
    }
  });
});

// Start the system
main().catch((error) => {
  console.error('💥 Startup failed:', error);
  process.exit(1);
});

// Log process events for debugging
if (process.env.NODE_ENV === 'development') {
  process.on('warning', (warning) => {
    console.warn('⚠️  Process warning:', warning.name, warning.message);
  });
  
  // Log every 30 seconds in development
  setInterval(() => {
    const usage = process.memoryUsage();
    console.log(`📊 Memory: RSS ${Math.round(usage.rss / 1024 / 1024)}MB, Heap ${Math.round(usage.heapUsed / 1024 / 1024)}MB`);
  }, 30000);
}