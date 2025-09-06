export interface TwilioConfig {
  account_sid: string
  auth_token: string
  phone_number: string
  webhook_url?: string
  status_callback_url?: string
  available_numbers?: TwilioPhoneNumber[]
}

export interface TwilioPhoneNumber {
  phoneNumber: string
  friendlyName?: string
  capabilities: string[]
  monthlyPrice?: string
  status?: string
}

export interface TwilioSettings {
  id?: string
  organization_id: string
  provider: 'twilio'
  is_active: boolean
  config: TwilioConfig
  credentials: {
    account_sid?: string
    auth_token?: string
  }
  sync_status: 'connected' | 'disconnected' | 'error'
  last_sync_at?: string
  error_message?: string
  created_at?: string
  updated_at?: string
}

export interface TwilioConnectionTestResult {
  success: boolean
  accountInfo?: {
    sid: string
    friendlyName: string
    status: string
    type: string
    dateCreated: string
  }
  balance?: {
    currency: string
    balance: string
  }
  phoneNumber?: {
    phoneNumber: string
    friendlyName: string
    capabilities: Record<string, boolean>
    status: string
  }
  availableNumbers?: TwilioPhoneNumber[]
  warnings?: string[]
  recommendations?: string[]
  error?: string
}

export interface TwilioCapabilities {
  voice: boolean
  sms: boolean
  mms: boolean
  fax: boolean
}

export interface TwilioMessage {
  sid: string
  from: string
  to: string
  body: string
  status: string
  direction: 'inbound' | 'outbound'
  dateCreated: string
  dateSent?: string
  errorCode?: number
  errorMessage?: string
}

export interface TwilioWebhookEvent {
  MessageSid: string
  MessageStatus: 'queued' | 'failed' | 'sent' | 'delivered' | 'undelivered' | 'receiving' | 'received'
  To: string
  From: string
  Body?: string
  NumMedia?: string
  AccountSid: string
  ApiVersion: string
  SmsSid?: string
  SmsStatus?: string
  ErrorCode?: string
  ErrorMessage?: string
}

export type TwilioSetupStep = 'account' | 'credentials' | 'phone-number' | 'test'

export interface TwilioSetupState {
  currentStep: TwilioSetupStep
  accountCreated: boolean
  credentialsValid: boolean
  phoneNumberConfigured: boolean
  connectionTested: boolean
}