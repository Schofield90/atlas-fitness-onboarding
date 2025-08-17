#!/usr/bin/env npx tsx
/**
 * Notification script for Sam about deployment status and Facebook integration
 * Run this after setting TELEGRAM_BOT_TOKEN and DEVELOPER_TELEGRAM_ID in .env.local
 */

import TelegramBot from 'node-telegram-bot-api'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

async function notifySam() {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.DEVELOPER_TELEGRAM_ID
  
  // Check if credentials are configured
  if (!token || !chatId || token === '' || chatId === '') {
    console.log(`
📱 TELEGRAM NOT CONFIGURED

To send this message via Telegram, add these to .env.local:
TELEGRAM_BOT_TOKEN=your_bot_token_here
DEVELOPER_TELEGRAM_ID=your_chat_id_here

See TELEGRAM_BRIDGE_SETUP.md for instructions.

📋 MESSAGE TO SEND:
=====================================

✅ **Deployment Successful - Site is Live!**

🌐 **Live URL:** https://atlas-fitness-onboarding.vercel.app

🔍 **Facebook Integration Diagnosis:**
❌ NO integration exists in database

📋 **Action Required - Please Complete These Steps:**

1️⃣ Go to: https://atlas-fitness-onboarding.vercel.app/public-fb-debug
2️⃣ Click "Clear All Data & Re-login" 
3️⃣ Log in to the app
4️⃣ Navigate to /connect-facebook to reconnect

⚠️ **Root Cause Identified:**
The Facebook integration record was completely missing from the database (not a token expiration issue as initially suspected).

The debug page will help you clean any cached data and establish a fresh connection to Facebook.

=====================================
`)
    return
  }

  // Send via Telegram
  console.log('📱 Sending message to Sam via Telegram...')
  
  const bot = new TelegramBot(token, { polling: false })
  
  const message = `✅ **Deployment Successful - Site is Live!**

🌐 **Live URL:** https://atlas-fitness-onboarding.vercel.app

🔍 **Facebook Integration Diagnosis:**
❌ NO integration exists in database

📋 **Action Required - Please Complete These Steps:**

1️⃣ Go to: https://atlas-fitness-onboarding.vercel.app/public-fb-debug
2️⃣ Click "Clear All Data & Re-login" 
3️⃣ Log in to the app
4️⃣ Navigate to /connect-facebook to reconnect

⚠️ **Root Cause Identified:**
The Facebook integration record was completely missing from the database (not a token expiration issue as initially suspected).

The debug page will help you clean any cached data and establish a fresh connection to Facebook.`

  try {
    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' })
    console.log('✅ Message sent successfully to Sam!')
    console.log('📱 Check your Telegram app!')
  } catch (error) {
    console.error('❌ Failed to send Telegram message:', error)
    console.error('💡 Check your bot token and chat ID are correct')
  }
}

notifySam()