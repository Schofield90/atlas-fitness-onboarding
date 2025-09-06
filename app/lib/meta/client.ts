import { encrypt, decrypt } from '@/app/lib/encryption'

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v18.0'
const BASE_URL = `https://graph.facebook.com/${GRAPH_VERSION}`

export interface MetaPage {
  id: string
  name: string
  access_token: string
  category: string
  tasks: string[]
}

export interface MetaMessage {
  id: string
  text?: string
  attachments?: Array<{
    type: string
    payload: {
      url?: string
      sticker_id?: string
    }
  }>
}

export interface MetaWebhookEntry {
  id: string
  time: number
  messaging?: Array<{
    sender: { id: string }
    recipient: { id: string }
    timestamp: number
    message?: MetaMessage
    delivery?: {
      mids: string[]
      watermark: number
    }
    read?: {
      watermark: number
    }
    postback?: {
      title: string
      payload: string
    }
  }>
}

export class MetaMessengerClient {
  private accessToken: string

  constructor(encryptedToken?: string) {
    if (encryptedToken) {
      this.accessToken = decrypt(encryptedToken)
    } else {
      this.accessToken = ''
    }
  }

  /**
   * Exchange OAuth code for user access token
   */
  static async exchangeCodeForToken(code: string, redirectUri: string): Promise<string> {
    const params = new URLSearchParams({
      client_id: process.env.META_APP_ID!,
      client_secret: process.env.META_APP_SECRET!,
      redirect_uri: redirectUri,
      code
    })

    const response = await fetch(
      `${BASE_URL}/oauth/access_token?${params.toString()}`,
      { method: 'GET' }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to exchange code: ${error}`)
    }

    const data = await response.json()
    return data.access_token
  }

  /**
   * Get user's Facebook Pages
   */
  async getUserPages(userAccessToken: string): Promise<MetaPage[]> {
    const response = await fetch(
      `${BASE_URL}/me/accounts?access_token=${userAccessToken}`,
      { method: 'GET' }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to get pages: ${error}`)
    }

    const data = await response.json()
    return data.data || []
  }

  /**
   * Subscribe Page to webhooks
   */
  async subscribePageToWebhooks(pageId: string, pageAccessToken: string): Promise<void> {
    const params = new URLSearchParams({
      access_token: pageAccessToken,
      subscribed_fields: 'messages,messaging_postbacks,message_deliveries,message_reads'
    })

    const response = await fetch(
      `${BASE_URL}/${pageId}/subscribed_apps?${params.toString()}`,
      { method: 'POST' }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to subscribe webhooks: ${error}`)
    }
  }

  /**
   * Unsubscribe Page from webhooks
   */
  async unsubscribePageFromWebhooks(pageId: string, pageAccessToken: string): Promise<void> {
    const response = await fetch(
      `${BASE_URL}/${pageId}/subscribed_apps?access_token=${pageAccessToken}`,
      { method: 'DELETE' }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to unsubscribe webhooks: ${error}`)
    }
  }

  /**
   * Send text message to user
   */
  async sendMessage(recipientId: string, text: string): Promise<string> {
    const body = {
      recipient: { id: recipientId },
      message: { text },
      messaging_type: 'RESPONSE' // Within 24-hour window
    }

    const response = await fetch(
      `${BASE_URL}/me/messages?access_token=${this.accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }
    )

    if (!response.ok) {
      const error = await response.json()
      if (error.error?.code === 10) {
        throw new Error('OUTSIDE_WINDOW: Cannot send message outside 24-hour window')
      }
      throw new Error(`Failed to send message: ${JSON.stringify(error)}`)
    }

    const data = await response.json()
    return data.message_id
  }

  /**
   * Send message with attachment
   */
  async sendAttachment(
    recipientId: string,
    attachmentType: 'image' | 'video' | 'audio' | 'file',
    attachmentUrl: string
  ): Promise<string> {
    const body = {
      recipient: { id: recipientId },
      message: {
        attachment: {
          type: attachmentType,
          payload: { url: attachmentUrl, is_reusable: true }
        }
      },
      messaging_type: 'RESPONSE'
    }

    const response = await fetch(
      `${BASE_URL}/me/messages?access_token=${this.accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to send attachment: ${JSON.stringify(error)}`)
    }

    const data = await response.json()
    return data.message_id
  }

  /**
   * Get user profile information
   */
  async getUserProfile(psid: string): Promise<{
    first_name?: string
    last_name?: string
    profile_pic?: string
  }> {
    const response = await fetch(
      `${BASE_URL}/${psid}?fields=first_name,last_name,profile_pic&access_token=${this.accessToken}`,
      { method: 'GET' }
    )

    if (!response.ok) {
      // User profile might not be available
      return {}
    }

    return await response.json()
  }

  /**
   * Mark message as seen
   */
  async markSeen(recipientId: string): Promise<void> {
    const body = {
      recipient: { id: recipientId },
      sender_action: 'mark_seen'
    }

    await fetch(
      `${BASE_URL}/me/messages?access_token=${this.accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }
    )
  }

  /**
   * Show typing indicator
   */
  async showTypingIndicator(recipientId: string, on: boolean): Promise<void> {
    const body = {
      recipient: { id: recipientId },
      sender_action: on ? 'typing_on' : 'typing_off'
    }

    await fetch(
      `${BASE_URL}/me/messages?access_token=${this.accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }
    )
  }

  /**
   * Verify webhook challenge
   */
  static verifyWebhookChallenge(
    mode: string,
    token: string,
    challenge: string
  ): string | null {
    const verifyToken = process.env.META_VERIFY_TOKEN

    if (mode === 'subscribe' && token === verifyToken) {
      return challenge
    }

    return null
  }
}