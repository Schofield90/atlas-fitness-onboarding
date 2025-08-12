#!/usr/bin/env npx tsx
import TelegramBot from 'node-telegram-bot-api'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const token = process.env.TELEGRAM_BOT_TOKEN!
const chatId = process.env.DEVELOPER_TELEGRAM_ID!

async function replyTwo() {
  const bot = new TelegramBot(token, { polling: false })
  
  try {
    await bot.sendMessage(chatId, 'two')
    console.log('✅ Replied with: "two"')
  } catch (error) {
    console.error('❌ Failed:', error)
  }
}

replyTwo()