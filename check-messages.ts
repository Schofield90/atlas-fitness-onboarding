#!/usr/bin/env npx tsx
import TelegramBot from 'node-telegram-bot-api'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const token = process.env.TELEGRAM_BOT_TOKEN!
const chatId = process.env.DEVELOPER_TELEGRAM_ID!

async function checkMessages() {
  const bot = new TelegramBot(token, { polling: false })
  
  try {
    // Get updates (messages)
    const updates = await bot.getUpdates()
    
    if (updates.length === 0) {
      console.log('No new messages')
      return
    }
    
    console.log(`📥 Found ${updates.length} message(s):\n`)
    
    // Show recent messages
    updates.slice(-5).forEach((update, index) => {
      if (update.message) {
        const msg = update.message
        const time = new Date(msg.date * 1000).toLocaleTimeString()
        console.log(`Message ${index + 1}:`)
        console.log(`  From: ${msg.from?.first_name} (@${msg.from?.username})`)
        console.log(`  Time: ${time}`)
        console.log(`  Text: "${msg.text}"`)
        console.log('')
      }
    })
    
    // Clear processed messages
    if (updates.length > 0) {
      const lastUpdateId = updates[updates.length - 1].update_id
      await bot.getUpdates({ offset: lastUpdateId + 1 })
    }
    
  } catch (error) {
    console.error('❌ Failed to check messages:', error)
  }
}

checkMessages()