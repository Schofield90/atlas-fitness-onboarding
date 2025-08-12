
// Simple API to communicate with Telegram Bridge
import * as fs from 'fs/promises'
import * as path from 'path'

export const TelegramAPI = {
  // Send message to developer
  async sendToDeveloper(message: string) {
    const queueFile = path.join(process.cwd(), '.telegram-outbox')
    await fs.appendFile(queueFile, message + '\n')
  },
  
  // Check for developer messages
  async getFromDeveloper(): Promise<string[]> {
    const inboxFile = path.join(process.cwd(), '.telegram-inbox')
    try {
      const content = await fs.readFile(inboxFile, 'utf-8')
      await fs.unlink(inboxFile) // Clear after reading
      return content.split('\n').filter(Boolean)
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
