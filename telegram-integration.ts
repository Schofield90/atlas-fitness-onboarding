/**
 * Telegram Integration Helper for Claude Code Development
 * 
 * This file provides easy-to-use functions for the Claude Code session
 * to communicate with the developer via Telegram
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import * as path from 'path'

const execAsync = promisify(exec)

// Helper to check if bridge is running
async function isBridgeRunning(): Promise<boolean> {
  try {
    const { stdout } = await execAsync('pgrep -f claude-code-telegram-bridge')
    return stdout.trim().length > 0
  } catch {
    return false
  }
}

// Start the bridge if not running
async function ensureBridgeRunning() {
  if (!(await isBridgeRunning())) {
    console.log('Starting Telegram bridge...')
    exec('tsx claude-code-telegram-bridge.ts', { detached: true })
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
}

// Main integration object for easy import
export const TelegramNotifier = {
  /**
   * Notify when starting a new task
   */
  async startTask(task: string, estimatedTime?: string) {
    try {
      await ensureBridgeRunning()
      const TelegramBridge = await import('./claude-code-telegram-bridge').then(m => m.default)
      await TelegramBridge.notifyTaskStart(task, estimatedTime)
    } catch (error) {
      console.error('Failed to notify task start:', error)
    }
  },

  /**
   * Update progress on current task
   */
  async updateProgress(step: string, percentage: number, details?: string) {
    try {
      const TelegramBridge = await import('./claude-code-telegram-bridge').then(m => m.default)
      await TelegramBridge.reportProgress(step, percentage, details)
    } catch (error) {
      console.error('Failed to update progress:', error)
    }
  },

  /**
   * Ask developer for a decision
   */
  async askDecision(question: string, options: string[]): Promise<string> {
    try {
      const TelegramBridge = await import('./claude-code-telegram-bridge').then(m => m.default)
      return await TelegramBridge.askForDecision(question, options)
    } catch (error) {
      console.error('Failed to ask decision:', error)
      return options[0]
    }
  },

  /**
   * Report an error with suggested fixes
   */
  async reportError(error: string | Error, suggestedFixes: string[] = []) {
    try {
      const TelegramBridge = await import('./claude-code-telegram-bridge').then(m => m.default)
      const errorMessage = error instanceof Error ? error.message : error
      await TelegramBridge.reportError(errorMessage, suggestedFixes)
    } catch (err) {
      console.error('Failed to report error:', err)
    }
  },

  /**
   * Share a code snippet
   */
  async shareCode(title: string, code: string, language: string = 'typescript') {
    try {
      const TelegramBridge = await import('./claude-code-telegram-bridge').then(m => m.default)
      await TelegramBridge.shareCodeSnippet(title, code, language)
    } catch (error) {
      console.error('Failed to share code:', error)
    }
  },

  /**
   * Mark task as complete
   */
  async completeTask(task: string, summary: string) {
    try {
      const TelegramBridge = await import('./claude-code-telegram-bridge').then(m => m.default)
      await TelegramBridge.notifyTaskComplete(task, summary)
    } catch (error) {
      console.error('Failed to notify task completion:', error)
    }
  },

  /**
   * Send database operation update
   */
  async databaseUpdate(operation: string, table: string, details: string) {
    try {
      const TelegramBridge = await import('./claude-code-telegram-bridge').then(m => m.default)
      await TelegramBridge.sendDatabaseUpdate(operation, table, details)
    } catch (error) {
      console.error('Failed to send database update:', error)
    }
  },

  /**
   * Send test results
   */
  async testResults(passed: number, failed: number, total: number, failures?: string[]) {
    try {
      const TelegramBridge = await import('./claude-code-telegram-bridge').then(m => m.default)
      await TelegramBridge.sendTestResults({ passed, failed, total }, failures)
    } catch (error) {
      console.error('Failed to send test results:', error)
    }
  },

  /**
   * Check if development is paused
   */
  async isPaused(): Promise<boolean> {
    try {
      await fs.access(path.join(process.cwd(), '.dev-paused'))
      return true
    } catch {
      return false
    }
  },

  /**
   * Wait if development is paused
   */
  async waitIfPaused() {
    while (await this.isPaused()) {
      console.log('Development paused. Waiting for resume signal...')
      await new Promise(resolve => setTimeout(resolve, 5000))
    }
  }
}

// Example usage for Claude Code session:
/*
import { TelegramNotifier } from './telegram-integration'

// At the start of a task
await TelegramNotifier.startTask('Implementing user authentication', '30 minutes')

// Update progress
await TelegramNotifier.updateProgress('Setting up Supabase auth', 25, 'Configuring providers')

// Ask for decision
const dbChoice = await TelegramNotifier.askDecision(
  'Which database should we use?',
  ['PostgreSQL', 'MySQL', 'MongoDB']
)

// Report error
await TelegramNotifier.reportError(
  new Error('Failed to connect to database'),
  ['Check connection string', 'Verify database is running', 'Check firewall settings']
)

// Share code
await TelegramNotifier.shareCode(
  'New API endpoint',
  `export async function POST(request: Request) {
    // Handle request
  }`,
  'typescript'
)

// Complete task
await TelegramNotifier.completeTask(
  'User authentication',
  'Implemented login, signup, and password reset with Supabase'
)

// Check if paused
await TelegramNotifier.waitIfPaused()
*/

export default TelegramNotifier