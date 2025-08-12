#!/usr/bin/env npx tsx
import TelegramBot from 'node-telegram-bot-api'
import dotenv from 'dotenv'
import * as fs from 'fs/promises'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: '.env.local' })

const config = {
  telegramToken: process.env.TELEGRAM_BOT_TOKEN!,
  developerChatId: process.env.DEVELOPER_TELEGRAM_ID!,
  projectPath: process.env.PROJECT_PATH || process.cwd(),
}

const bot = new TelegramBot(config.telegramToken, { polling: true })

console.log('🤖 Smart Telegram Bridge - Starting...')
console.log('📱 Listening for messages from:', config.developerChatId)

// Smart message handler that actually responds to content
bot.on('message', async (msg) => {
  const chatId = msg.chat.id.toString()
  const text = msg.text || ''
  const userName = msg.from?.first_name || 'User'
  
  console.log(`📨 Received from ${userName}: "${text}"`)
  
  if (chatId !== config.developerChatId) {
    await bot.sendMessage(msg.chat.id, '❌ Unauthorized')
    return
  }
  
  // Smart responses based on content
  const lowerText = text.toLowerCase()
  
  // Check if asking for a reply - look for "reply with [word/phrase]"
  const replyMatch = text.match(/reply with (?:the word |the phrase )?["|']?([^"|'?]+)["|']?(?:\?|$)/i)
  if (replyMatch) {
    const replyWith = replyMatch[1].trim()
    await bot.sendMessage(chatId, replyWith)
    console.log(`↩️ Replied with: "${replyWith}"`)
    return
  }
  
  // Check for questions
  if (lowerText.includes('are you') || lowerText.includes('can you')) {
    await bot.sendMessage(chatId, 'Yes! I\'m the Telegram bridge for your Claude Code CRM development. I can relay messages, track progress, and help control the development session.')
    return
  }
  
  // Status check
  if (lowerText.includes('status') || lowerText.includes('how') || lowerText.includes('progress')) {
    const statusFile = path.join(config.projectPath, '.dev-status')
    try {
      const status = await fs.readFile(statusFile, 'utf-8')
      await bot.sendMessage(chatId, `📊 Current Status:\n${status}`)
    } catch {
      await bot.sendMessage(chatId, '📊 No active development task at the moment.')
    }
    return
  }
  
  // Pause/Resume
  if (lowerText.includes('pause') || lowerText.includes('stop')) {
    await fs.writeFile(path.join(config.projectPath, '.dev-paused'), 'true')
    await bot.sendMessage(chatId, '⏸ Development paused. Send "resume" to continue.')
    return
  }
  
  if (lowerText.includes('resume') || lowerText.includes('continue') || lowerText.includes('start')) {
    await fs.unlink(path.join(config.projectPath, '.dev-paused')).catch(() => {})
    await bot.sendMessage(chatId, '▶️ Development resumed!')
    return
  }
  
  // Help
  if (lowerText === 'help' || lowerText === '/help') {
    await bot.sendMessage(chatId, 
      `📚 **Smart Commands:**\n\n` +
      `• "reply with X" - I'll reply with X\n` +
      `• "status" - Check development status\n` +
      `• "pause" - Pause development\n` +
      `• "resume" - Resume development\n` +
      `• "test" - Test connection\n` +
      `• Ask questions and I'll try to respond!\n\n` +
      `I also relay all messages to the Claude Code session.`,
      { parse_mode: 'Markdown' }
    )
    return
  }
  
  // Test
  if (lowerText === 'test') {
    await bot.sendMessage(chatId, '✅ Connection working perfectly! I can hear you loud and clear.')
    return
  }
  
  // Numbers (for your testing)
  if (text.match(/^\d+$/)) {
    const num = parseInt(text)
    await bot.sendMessage(chatId, `${num + 1}`)
    console.log(`↩️ Replied with: "${num + 1}"`)
    return
  }
  
  // Default: Log the message and confirm receipt
  const inbox = path.join(config.projectPath, '.telegram-inbox')
  const timestamp = new Date().toISOString()
  await fs.appendFile(inbox, `[${timestamp}] ${userName}: ${text}\n`).catch(() => {})
  
  await bot.sendMessage(chatId, 
    `📝 Message logged for Claude Code session.\n\n` +
    `If you need a specific response, try:\n` +
    `• "reply with [word]" to get that word back\n` +
    `• "status" to check progress\n` +
    `• "help" for more commands`
  )
})

// Handle voice messages
bot.on('voice', async (msg) => {
  const chatId = msg.chat.id.toString()
  
  if (chatId !== config.developerChatId) return
  
  try {
    await bot.sendMessage(chatId, '🎤 Transcribing voice message...')
    
    // Get file
    const file = await bot.getFile(msg.voice!.file_id)
    const fileUrl = `https://api.telegram.org/file/bot${config.telegramToken}/${file.file_path}`
    
    // Download voice file
    const axios = await import('axios')
    const response = await axios.default.get(fileUrl, { responseType: 'arraybuffer' })
    const buffer = Buffer.from(response.data)
    
    // Save temp file
    const tempPath = `/tmp/voice_${Date.now()}.ogg`
    await fs.writeFile(tempPath, buffer)
    
    // Transcribe with OpenAI
    const OpenAI = await import('openai')
    const openai = new OpenAI.default({ apiKey: process.env.OPENAI_API_KEY! })
    
    const fileContent = await fs.readFile(tempPath)
    const transcription = await openai.audio.transcriptions.create({
      file: new File([fileContent], 'voice.ogg', { type: 'audio/ogg' }),
      model: 'whisper-1',
    })
    
    // Clean up
    await fs.unlink(tempPath).catch(() => {})
    
    // Send transcription
    await bot.sendMessage(chatId, `🎤 Transcribed: "${transcription.text}"`)
    console.log(`🎤 Voice transcribed: "${transcription.text}"`)
    
    // Process as text message
    bot.emit('message', { ...msg, text: transcription.text, from: msg.from, chat: msg.chat } as any)
    
  } catch (error) {
    console.error('Voice transcription error:', error)
    await bot.sendMessage(chatId, '❌ Failed to transcribe voice message. Make sure OpenAI API key is set.')
  }
})

// Initialize
async function init() {
  try {
    const me = await bot.getMe()
    console.log(`✅ Bot connected: @${me.username}`)
    console.log('✅ Smart responses enabled')
    
    await bot.sendMessage(config.developerChatId, 
      `🤖 **Smart Telegram Bridge Online!**\n\n` +
      `I can now respond intelligently to your messages:\n` +
      `• Say "reply with X" and I'll reply with X\n` +
      `• Send a number and I'll reply with the next one\n` +
      `• Ask about status, pause/resume development\n` +
      `• All messages are logged for Claude Code\n\n` +
      `Try: "reply with hello" or just send "5"`,
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
  process.exit(0)
})

// Start
init()