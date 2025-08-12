#!/usr/bin/env npx tsx
import TelegramBot from 'node-telegram-bot-api'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const token = process.env.TELEGRAM_BOT_TOKEN!
const chatId = process.env.DEVELOPER_TELEGRAM_ID!

async function reply() {
  const bot = new TelegramBot(token, { polling: false })
  
  try {
    await bot.sendMessage(chatId, '3')
    console.log('✅ Sent: "3"')
  } catch (error) {
    console.error('❌ Failed:', error)
  }
}

reply()