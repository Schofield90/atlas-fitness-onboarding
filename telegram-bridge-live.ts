#!/usr/bin/env npx tsx
import TelegramBot from 'node-telegram-bot-api'
import OpenAI from 'openai'
import * as fs from 'fs/promises'
import * as path from 'path'
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
}

// Initialize services
const bot = new TelegramBot(config.telegramToken, { polling: true })
const openai = new OpenAI({ apiKey: config.openaiApiKey })

// Development state
const devState = {
  currentTask: null as string | null,
  progress: 0,
  lastActivity: new Date(),
  isPaused: false,
  messageQueue: [] as string[],
}

console.log('🤖 Telegram Bridge Live - Starting...')
console.log('📱 Listening for messages from:', config.developerChatId)

// Message handler - REAL-TIME
bot.on('message', async (msg) => {
  const chatId = msg.chat.id.toString()
  const text = msg.text || ''
  const userName = msg.from?.first_name || 'User'
  
  console.log(`📨 Received from ${userName}: "${text}"`)
  
  // Only respond to the developer
  if (chatId !== config.developerChatId) {
    await bot.sendMessage(msg.chat.id, '❌ Unauthorized. This bot is for development use only.')
    return
  }
  
  // Store message for other Claude session to see
  devState.messageQueue.push(`[${new Date().toISOString()}] ${userName}: ${text}`)
  
  // Handle commands
  const command = text.toLowerCase()
  
  if (command === 'status') {
    const status = `📊 **Current Status**\n` +
      `Task: ${devState.currentTask || 'None'}\n` +
      `Progress: ${devState.progress}%\n` +
      `Paused: ${devState.isPaused ? 'Yes' : 'No'}\n` +
      `Last Activity: ${devState.lastActivity.toLocaleTimeString()}`
    await bot.sendMessage(chatId, status, { parse_mode: 'Markdown' })
  }
  
  else if (command === 'pause') {
    devState.isPaused = true
    await fs.writeFile(path.join(config.projectPath, '.dev-paused'), 'true')
    await bot.sendMessage(chatId, '⏸ Development paused')
  }
  
  else if (command === 'resume' || command === 'continue') {
    devState.isPaused = false
    await fs.unlink(path.join(config.projectPath, '.dev-paused')).catch(() => {})
    await bot.sendMessage(chatId, '▶️ Development resumed')
  }
  
  else if (command === 'help') {
    await bot.sendMessage(chatId, 
      `📚 **Available Commands:**\n` +
      `• status - Current development status\n` +
      `• pause - Pause development\n` +
      `• resume - Resume development\n` +
      `• messages - Show recent messages\n` +
      `• clear - Clear message queue\n` +
      `• test - Test two-way communication`,
      { parse_mode: 'Markdown' }
    )
  }
  
  else if (command === 'messages') {
    if (devState.messageQueue.length === 0) {
      await bot.sendMessage(chatId, 'No messages in queue')
    } else {
      const recent = devState.messageQueue.slice(-10).join('\n')
      await bot.sendMessage(chatId, `📬 Recent messages:\n\`\`\`\n${recent}\n\`\`\``, { parse_mode: 'Markdown' })
    }
  }
  
  else if (command === 'clear') {
    devState.messageQueue = []
    await bot.sendMessage(chatId, '🗑 Message queue cleared')
  }
  
  else if (command === 'test') {
    await bot.sendMessage(chatId, '✅ Two-way communication working! I received your test message.')
  }
  
  else {
    // Echo back any other message to confirm receipt
    await bot.sendMessage(chatId, `📝 Received: "${text}"\n\nThis message has been logged for the development session.`)
  }
  
  // Update activity
  devState.lastActivity = new Date()
})

// Handle voice messages
bot.on('voice', async (msg) => {
  const chatId = msg.chat.id.toString()
  
  if (chatId !== config.developerChatId) return
  
  try {
    await bot.sendMessage(chatId, '🎤 Processing voice message...')
    
    // Get file
    const file = await bot.getFile(msg.voice!.file_id)
    const fileUrl = `https://api.telegram.org/file/bot${config.telegramToken}/${file.file_path}`
    
    // Download
    const response = await axios.get(fileUrl, { responseType: 'arraybuffer' })
    const buffer = Buffer.from(response.data)
    
    // Save temp file
    const tempPath = `/tmp/voice_${Date.now()}.ogg`
    await fs.writeFile(tempPath, buffer)
    
    // Transcribe
    const fileContent = await fs.readFile(tempPath)
    const transcription = await openai.audio.transcriptions.create({
      file: new File([fileContent], 'voice.ogg', { type: 'audio/ogg' }),
      model: 'whisper-1',
    })
    
    // Clean up
    await fs.unlink(tempPath).catch(() => {})
    
    // Process as text message
    await bot.sendMessage(chatId, `🎤 Transcribed: "${transcription.text}"`)
    
    // Store in message queue
    devState.messageQueue.push(`[${new Date().toISOString()}] Voice: ${transcription.text}`)
    
    // Handle as command
    bot.emit('message', { ...msg, text: transcription.text } as any)
    
  } catch (error) {
    console.error('Voice transcription error:', error)
    await bot.sendMessage(chatId, '❌ Failed to transcribe voice message')
  }
})

// Callback query handler for buttons
bot.on('callback_query', async (query) => {
  const data = query.data || ''
  const chatId = query.message?.chat.id
  
  if (!chatId) return
  
  await bot.answerCallbackQuery(query.id, { text: `Selected: ${data}` })
  await bot.sendMessage(chatId, `✅ You selected: ${data}`)
  
  // Store decision in queue
  devState.messageQueue.push(`[${new Date().toISOString()}] Decision: ${data}`)
})

// Error handler
bot.on('polling_error', (error) => {
  console.error('Polling error:', error)
})

// API for other Claude Code session to send messages
export const BridgeAPI = {
  sendMessage: async (text: string) => {
    try {
      await bot.sendMessage(config.developerChatId, text, { parse_mode: 'Markdown' })
      return true
    } catch (error) {
      console.error('Failed to send:', error)
      return false
    }
  },
  
  getMessages: () => {
    const messages = [...devState.messageQueue]
    devState.messageQueue = [] // Clear after reading
    return messages
  },
  
  isPaused: () => devState.isPaused,
  
  updateTask: (task: string, progress: number) => {
    devState.currentTask = task
    devState.progress = progress
    devState.lastActivity = new Date()
  }
}

// Write a simple API file for easy integration
const apiInterface = `
// Simple API to communicate with Telegram Bridge
import * as fs from 'fs/promises'
import * as path from 'path'

export const TelegramAPI = {
  // Send message to developer
  async sendToDeveloper(message: string) {
    const queueFile = path.join(process.cwd(), '.telegram-outbox')
    await fs.appendFile(queueFile, message + '\\n')
  },
  
  // Check for developer messages
  async getFromDeveloper(): Promise<string[]> {
    const inboxFile = path.join(process.cwd(), '.telegram-inbox')
    try {
      const content = await fs.readFile(inboxFile, 'utf-8')
      await fs.unlink(inboxFile) // Clear after reading
      return content.split('\\n').filter(Boolean)
    } catch {
      return []
    }
  },
  
  // Check if paused
  async isPaused(): Promise<boolean> {
    try {
      await fs.access(path.join(process.cwd(), '.dev-paused'))
      return true
    } catch {
      return false
    }
  }
}
`

fs.writeFile(
  path.join(config.projectPath, 'telegram-api.ts'),
  apiInterface
).catch(console.error)

// File watcher for outgoing messages from other Claude session
async function watchOutbox() {
  const outboxFile = path.join(config.projectPath, '.telegram-outbox')
  
  setInterval(async () => {
    try {
      const content = await fs.readFile(outboxFile, 'utf-8')
      if (content) {
        const messages = content.split('\n').filter(Boolean)
        for (const msg of messages) {
          await bot.sendMessage(config.developerChatId, msg, { parse_mode: 'Markdown' })
        }
        await fs.writeFile(outboxFile, '') // Clear after sending
      }
    } catch {
      // File doesn't exist yet
    }
  }, 2000) // Check every 2 seconds
}

// File writer for incoming messages
async function updateInbox() {
  const inboxFile = path.join(config.projectPath, '.telegram-inbox')
  
  setInterval(async () => {
    if (devState.messageQueue.length > 0) {
      const messages = devState.messageQueue.join('\n')
      await fs.writeFile(inboxFile, messages)
      devState.messageQueue = [] // Clear after writing
    }
  }, 1000) // Update every second
}

// Initialize
async function init() {
  try {
    const me = await bot.getMe()
    console.log(`✅ Bot connected: @${me.username}`)
    console.log('✅ Real-time messaging active')
    console.log('📱 Send "help" for available commands')
    
    // Start file watchers
    await watchOutbox()
    await updateInbox()
    
    // Send startup message
    await bot.sendMessage(config.developerChatId, 
      `🤖 **Telegram Bridge Live!**\n\n` +
      `✅ Real-time two-way messaging active\n` +
      `✅ Voice transcription ready\n` +
      `✅ File sync enabled\n\n` +
      `Send "help" for commands\n` +
      `Send "test" to verify connection`,
      { parse_mode: 'Markdown' }
    )
    
  } catch (error) {
    console.error('❌ Failed to initialize:', error)
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down...')
  bot.stopPolling()
  await bot.sendMessage(config.developerChatId, '👋 Bridge shutting down').catch(() => {})
  process.exit(0)
})

// Start
init()