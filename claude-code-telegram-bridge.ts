#!/usr/bin/env tsx
import TelegramBot from 'node-telegram-bot-api'
import OpenAI from 'openai'
import * as fs from 'fs/promises'
import * as path from 'path'
import FormData from 'form-data'
import axios from 'axios'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

// Environment configuration
const config = {
  telegramToken: process.env.TELEGRAM_BOT_TOKEN!,
  developerChatId: process.env.DEVELOPER_TELEGRAM_ID!,
  openaiApiKey: process.env.OPENAI_API_KEY!,
  projectPath: process.env.PROJECT_PATH || process.cwd(),
  anthropicApiKey: process.env.ANTHROPIC_API_KEY!,
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
}

// Validate configuration
function validateConfig() {
  const required = ['telegramToken', 'developerChatId', 'openaiApiKey']
  const missing = required.filter(key => !config[key as keyof typeof config])
  
  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing)
    console.error('Please set them in your .env file')
    process.exit(1)
  }
}

// Initialize services
validateConfig()
const bot = new TelegramBot(config.telegramToken, { polling: true })
const openai = new OpenAI({ apiKey: config.openaiApiKey })

// Development state tracking
interface DevelopmentState {
  currentTask: string | null
  progress: number
  lastActivity: Date
  errors: Array<{ timestamp: Date; error: string; suggestion: string }>
  activeFiles: string[]
  gitStatus: string
  testResults: { passed: number; failed: number; total: number }
}

const devState: DevelopmentState = {
  currentTask: null,
  progress: 0,
  lastActivity: new Date(),
  errors: [],
  activeFiles: [],
  gitStatus: 'clean',
  testResults: { passed: 0, failed: 0, total: 0 }
}

// Voice message transcription
async function transcribeVoiceMessage(fileId: string): Promise<string> {
  try {
    // Get file info from Telegram
    const file = await bot.getFile(fileId)
    const fileUrl = `https://api.telegram.org/file/bot${config.telegramToken}/${file.file_path}`
    
    // Download the voice file
    const response = await axios.get(fileUrl, { responseType: 'arraybuffer' })
    const buffer = Buffer.from(response.data)
    
    // Save temporarily
    const tempPath = path.join('/tmp', `voice_${Date.now()}.ogg`)
    await fs.writeFile(tempPath, buffer)
    
    // Transcribe with OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: await fs.readFile(tempPath),
      model: 'whisper-1',
      language: 'en'
    })
    
    // Clean up temp file
    await fs.unlink(tempPath).catch(() => {})
    
    return transcription.text
  } catch (error) {
    console.error('Voice transcription error:', error)
    return 'Failed to transcribe voice message'
  }
}

// Progress visualization
function generateProgressBar(percentage: number): string {
  const filled = Math.round(percentage / 10)
  const empty = 10 - filled
  return '█'.repeat(filled) + '░'.repeat(empty)
}

// Communication Functions for Other Claude Code Session
export const TelegramBridge = {
  // Notify task start
  async notifyTaskStart(task: string, estimatedTime?: string) {
    devState.currentTask = task
    devState.progress = 0
    devState.lastActivity = new Date()
    
    const message = `🚀 **Starting Task**\n\n📋 ${task}\n${estimatedTime ? `⏱ Estimated: ${estimatedTime}` : ''}`
    await bot.sendMessage(config.developerChatId, message, { parse_mode: 'Markdown' })
  },

  // Report progress
  async reportProgress(step: string, percentage: number, details?: string) {
    devState.progress = percentage
    devState.lastActivity = new Date()
    
    const progressBar = generateProgressBar(percentage)
    const message = `📊 **Progress Update**\n\n${progressBar} ${percentage}%\n\n📍 ${step}${details ? `\n\n💡 ${details}` : ''}`
    await bot.sendMessage(config.developerChatId, message, { parse_mode: 'Markdown' })
  },

  // Ask for decision
  async askForDecision(question: string, options: string[]): Promise<string> {
    const keyboard = {
      inline_keyboard: options.map(option => [{
        text: option,
        callback_data: `decision_${option}`
      }])
    }
    
    await bot.sendMessage(config.developerChatId, `❓ **Decision Required**\n\n${question}`, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    })
    
    return new Promise((resolve) => {
      bot.once('callback_query', (query) => {
        const decision = query.data?.replace('decision_', '') || options[0]
        bot.answerCallbackQuery(query.id, { text: `Selected: ${decision}` })
        resolve(decision)
      })
    })
  },

  // Report error
  async reportError(error: string, suggestedFixes: string[]) {
    devState.errors.push({
      timestamp: new Date(),
      error,
      suggestion: suggestedFixes[0] || 'No suggestion available'
    })
    
    const keyboard = suggestedFixes.length > 0 ? {
      inline_keyboard: suggestedFixes.map(fix => [{
        text: `🔧 ${fix}`,
        callback_data: `fix_${fix}`
      }])
    } : undefined
    
    await bot.sendMessage(config.developerChatId, 
      `❌ **Error Encountered**\n\n\`\`\`\n${error}\n\`\`\`\n\n${suggestedFixes.length > 0 ? '**Suggested Fixes:**' : ''}`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      }
    )
  },

  // Share code snippet
  async shareCodeSnippet(title: string, code: string, language: string = 'typescript') {
    const message = `📝 **Code Update: ${title}**\n\n\`\`\`${language}\n${code.substring(0, 3000)}${code.length > 3000 ? '\n... (truncated)' : ''}\n\`\`\``
    await bot.sendMessage(config.developerChatId, message, { parse_mode: 'Markdown' })
  },

  // Notify task complete
  async notifyTaskComplete(task: string, summary: string) {
    devState.currentTask = null
    devState.progress = 100
    
    await bot.sendMessage(config.developerChatId, 
      `✅ **Task Completed!**\n\n📋 ${task}\n\n📊 Summary:\n${summary}`,
      { parse_mode: 'Markdown' }
    )
  },

  // Send database update
  async sendDatabaseUpdate(operation: string, table: string, details: string) {
    await bot.sendMessage(config.developerChatId,
      `🗄 **Database Update**\n\n⚙️ Operation: ${operation}\n📊 Table: ${table}\n📝 Details: ${details}`,
      { parse_mode: 'Markdown' }
    )
  },

  // Send test results
  async sendTestResults(results: { passed: number; failed: number; total: number }, failures?: string[]) {
    devState.testResults = results
    
    const successRate = Math.round((results.passed / results.total) * 100)
    const statusEmoji = results.failed === 0 ? '✅' : '⚠️'
    
    let message = `${statusEmoji} **Test Results**\n\n`
    message += `✅ Passed: ${results.passed}\n`
    message += `❌ Failed: ${results.failed}\n`
    message += `📊 Total: ${results.total}\n`
    message += `📈 Success Rate: ${successRate}%`
    
    if (failures && failures.length > 0) {
      message += `\n\n**Failed Tests:**\n${failures.map(f => `• ${f}`).join('\n')}`
    }
    
    await bot.sendMessage(config.developerChatId, message, { parse_mode: 'Markdown' })
  }
}

// Message handlers
bot.on('message', async (msg) => {
  const chatId = msg.chat.id.toString()
  
  // Only respond to the developer
  if (chatId !== config.developerChatId) {
    await bot.sendMessage(msg.chat.id, '❌ Unauthorized. This bot is for development use only.')
    return
  }
  
  const text = msg.text?.toLowerCase() || ''
  
  // Handle text commands
  if (text === 'status' || text === '/status') {
    const status = `📊 **Development Status**\n\n` +
      `📋 Current Task: ${devState.currentTask || 'Idle'}\n` +
      `📈 Progress: ${generateProgressBar(devState.progress)} ${devState.progress}%\n` +
      `🕐 Last Activity: ${devState.lastActivity.toLocaleTimeString()}\n` +
      `❌ Recent Errors: ${devState.errors.length}\n` +
      `📁 Active Files: ${devState.activeFiles.length}\n` +
      `🧪 Tests: ✅ ${devState.testResults.passed} / ❌ ${devState.testResults.failed}`
    
    await bot.sendMessage(chatId, status, { parse_mode: 'Markdown' })
  }
  
  else if (text === 'help' || text === '/help') {
    const help = `🤖 **Available Commands**\n\n` +
      `📊 \`status\` - Current development status\n` +
      `⏸ \`pause\` - Pause development\n` +
      `▶️ \`resume\` - Resume development\n` +
      `📝 \`show code\` - Show recent changes\n` +
      `❌ \`errors\` - Show recent errors\n` +
      `🧪 \`tests\` - Run tests\n` +
      `📁 \`files\` - Show active files\n` +
      `🎤 Send voice note for commands`
    
    await bot.sendMessage(chatId, help, { parse_mode: 'Markdown' })
  }
  
  else if (text === 'pause' || text === '/pause') {
    await bot.sendMessage(chatId, '⏸ Development paused. Send "resume" to continue.')
    // Signal to other Claude Code session
    await fs.writeFile(path.join(config.projectPath, '.dev-paused'), 'true')
  }
  
  else if (text === 'resume' || text === '/resume') {
    await bot.sendMessage(chatId, '▶️ Development resumed!')
    // Signal to other Claude Code session
    await fs.unlink(path.join(config.projectPath, '.dev-paused')).catch(() => {})
  }
  
  else if (text === 'errors' || text === '/errors') {
    if (devState.errors.length === 0) {
      await bot.sendMessage(chatId, '✅ No recent errors!')
    } else {
      const recentErrors = devState.errors.slice(-5)
      const errorList = recentErrors.map(e => 
        `• ${e.timestamp.toLocaleTimeString()}: ${e.error.substring(0, 100)}...`
      ).join('\n')
      await bot.sendMessage(chatId, `❌ **Recent Errors:**\n\n${errorList}`, { parse_mode: 'Markdown' })
    }
  }
  
  else if (text === 'files' || text === '/files') {
    if (devState.activeFiles.length === 0) {
      await bot.sendMessage(chatId, '📁 No active files')
    } else {
      const fileList = devState.activeFiles.map(f => `• ${f}`).join('\n')
      await bot.sendMessage(chatId, `📁 **Active Files:**\n\n${fileList}`, { parse_mode: 'Markdown' })
    }
  }
})

// Handle voice messages
bot.on('voice', async (msg) => {
  const chatId = msg.chat.id.toString()
  
  if (chatId !== config.developerChatId) {
    return
  }
  
  await bot.sendMessage(chatId, '🎤 Transcribing voice message...')
  
  const transcription = await transcribeVoiceMessage(msg.voice!.file_id)
  await bot.sendMessage(chatId, `📝 Transcription: "${transcription}"`)
  
  // Process voice command
  const command = transcription.toLowerCase()
  
  if (command.includes('status') || command.includes('how') || command.includes('going')) {
    bot.emit('message', { ...msg, text: 'status' } as any)
  } else if (command.includes('pause') || command.includes('stop')) {
    bot.emit('message', { ...msg, text: 'pause' } as any)
  } else if (command.includes('continue') || command.includes('resume')) {
    bot.emit('message', { ...msg, text: 'resume' } as any)
  } else if (command.includes('error')) {
    bot.emit('message', { ...msg, text: 'errors' } as any)
  } else if (command.includes('file')) {
    bot.emit('message', { ...msg, text: 'files' } as any)
  } else {
    await bot.sendMessage(chatId, `🤔 Command not recognized. Try saying "status", "pause", "resume", or "show errors"`)
  }
})

// Callback query handler for inline buttons
bot.on('callback_query', async (query) => {
  const data = query.data || ''
  
  if (data.startsWith('fix_')) {
    const fix = data.replace('fix_', '')
    await bot.answerCallbackQuery(query.id, { text: `Applying fix: ${fix}` })
    await bot.sendMessage(config.developerChatId, `🔧 Applying fix: ${fix}`)
  }
})

// File watcher for monitoring changes
async function watchProjectFiles() {
  const chokidar = await import('chokidar').catch(() => null)
  if (!chokidar) return
  
  const watcher = chokidar.watch(config.projectPath, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
    ignoreInitial: true
  })
  
  watcher.on('change', (filepath) => {
    const relativePath = path.relative(config.projectPath, filepath)
    if (!devState.activeFiles.includes(relativePath)) {
      devState.activeFiles.push(relativePath)
      if (devState.activeFiles.length > 10) {
        devState.activeFiles.shift()
      }
    }
    devState.lastActivity = new Date()
  })
}

// Periodic status updates
setInterval(async () => {
  if (devState.currentTask && Date.now() - devState.lastActivity.getTime() > 5 * 60 * 1000) {
    await bot.sendMessage(config.developerChatId, 
      `👀 No activity for 5 minutes on task: ${devState.currentTask}\n\nEverything okay?`,
      { parse_mode: 'Markdown' }
    )
  }
}, 5 * 60 * 1000)

// Initialize the bridge
async function initialize() {
  console.log('🤖 Telegram Bridge Starting...')
  
  try {
    // Test bot connection
    const me = await bot.getMe()
    console.log(`✅ Bot connected: @${me.username}`)
    
    // Start file watcher
    await watchProjectFiles()
    
    // Send initialization message
    await bot.sendMessage(config.developerChatId, 
      `🤖 **Telegram Bridge Online!**\n\n` +
      `✅ Voice transcription ready\n` +
      `✅ Progress reporting ready\n` +
      `✅ Decision prompts ready\n` +
      `✅ Error notifications ready\n` +
      `✅ Code sharing ready\n\n` +
      `Your CRM development can now be monitored and controlled remotely.\n\n` +
      `**Test Commands:**\n` +
      `• Send 'status' for current info\n` +
      `• Send voice note saying "test voice"\n` +
      `• Type 'help' for available commands\n\n` +
      `Ready to bridge with your ongoing CRM development! 🚀`,
      { parse_mode: 'Markdown' }
    )
    
    console.log('✅ Telegram Bridge Ready!')
    console.log(`📱 Developer Chat ID: ${config.developerChatId}`)
    console.log('📁 Monitoring project:', config.projectPath)
    
  } catch (error) {
    console.error('❌ Failed to initialize Telegram Bridge:', error)
    process.exit(1)
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down Telegram Bridge...')
  await bot.sendMessage(config.developerChatId, '👋 Telegram Bridge shutting down...').catch(() => {})
  bot.stopPolling()
  process.exit(0)
})

// Start the bridge
initialize()

// Export for use by other Claude Code session
export default TelegramBridge