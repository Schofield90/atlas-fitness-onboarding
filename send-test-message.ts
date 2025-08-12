#!/usr/bin/env npx tsx
import TelegramBot from 'node-telegram-bot-api'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const token = process.env.TELEGRAM_BOT_TOKEN!
const chatId = process.env.DEVELOPER_TELEGRAM_ID!

async function sendTestMessage() {
  console.log('Sending test message to Telegram...')
  
  // Create bot instance without polling to avoid conflicts
  const bot = new TelegramBot(token, { polling: false })
  
  try {
    // Send the initial message
    await bot.sendMessage(chatId, 
      `🤖 *Telegram Bridge Online!*

✅ Voice transcription ready
✅ Progress reporting ready  
✅ Decision prompts ready
✅ Error notifications ready
✅ Code sharing ready

Your CRM development can now be monitored and controlled remotely.

*Test Commands:*
• Send 'status' for current info
• Send voice note saying "test voice"
• Type 'help' for available commands

Ready to bridge with your ongoing CRM development! 🚀`,
      { parse_mode: 'Markdown' }
    )
    
    console.log('✅ Test message sent successfully!')
    console.log('📱 Check your Telegram app!')
    
  } catch (error) {
    console.error('❌ Failed to send message:', error)
  }
}

sendTestMessage()