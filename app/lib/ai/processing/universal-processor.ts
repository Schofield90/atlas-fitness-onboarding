import { createClient } from '@/app/lib/supabase/server'
import { AIMemorySystem } from '../consciousness/memory'
import { aiClient } from '../providers/openai-client'

export interface ProcessedData {
  id: string
  type: string
  content: string
  embedding: number[]
  entities: ExtractedEntity[]
  attributes: any
  connections: DataConnection[]
  timestamp: Date
}

export interface ExtractedEntity {
  type: string
  value: string
  confidence: number
}

export interface DataConnection {
  targetId: string
  targetType: string
  relationshipType: string
  strength: number
}

export class UniversalDataProcessor {
  private memory: AIMemorySystem
  
  constructor() {
    this.memory = new AIMemorySystem()
  }
  
  async process(data: any, dataType: string, organizationId: string): Promise<ProcessedData> {
    // 1. Understand the data
    const understanding = await this.understand(data, dataType)
    
    // 2. Generate embedding
    const embedding = await this.embed(understanding.content)
    
    // 3. Extract entities
    const entities = await this.extractEntities(data, dataType)
    
    // 4. Find connections
    const connections = await this.findConnections(data, dataType, organizationId)
    
    // 5. Store in memory
    await this.storeInMemory(
      organizationId,
      understanding,
      embedding,
      entities,
      connections,
      dataType,
      data.id
    )
    
    return {
      id: data.id,
      type: dataType,
      content: understanding.content,
      embedding,
      entities,
      attributes: understanding.attributes,
      connections,
      timestamp: new Date(data.created_at || Date.now())
    }
  }
  
  async processHistoricalData(organizationId: string): Promise<void> {
    const supabase = await createClient()
    
    console.log(`Starting historical data processing for organization: ${organizationId}`)
    
    // Process leads
    await this.processTableData(organizationId, 'leads', async (lead) => ({
      id: lead.id,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      source: lead.source,
      status: lead.status,
      created_at: lead.created_at
    }))
    
    // Process bookings
    await this.processTableData(organizationId, 'bookings', async (booking) => ({
      id: booking.id,
      customer_id: booking.customer_id,
      class_session_id: booking.class_session_id,
      status: booking.status,
      created_at: booking.created_at
    }))
    
    // Process payments
    await this.processTableData(organizationId, 'payment_transactions', async (payment) => ({
      id: payment.id,
      customer_id: payment.customer_id,
      amount_pennies: payment.amount_pennies,
      payment_type: payment.payment_type,
      status: payment.status,
      created_at: payment.created_at
    }))
    
    // Process emails
    await this.processTableData(organizationId, 'email_logs', async (email) => ({
      id: email.id,
      to_email: email.to_email,
      from_email: email.from_email,
      subject: email.subject,
      body: email.body?.slice(0, 500), // Limit body size
      status: email.status,
      created_at: email.created_at
    }))
    
    // Process WhatsApp messages
    await this.processTableData(organizationId, 'whatsapp_logs', async (message) => ({
      id: message.id,
      phone_number: message.phone_number,
      message: message.message,
      direction: message.direction,
      status: message.status,
      created_at: message.created_at
    }))
    
    // Process SMS messages
    await this.processTableData(organizationId, 'sms_logs', async (message) => ({
      id: message.id,
      phone_number: message.phone_number,
      message: message.message,
      direction: message.direction,
      status: message.status,
      created_at: message.created_at
    }))
    
    // Process staff
    await this.processTableData(organizationId, 'staff', async (staff) => ({
      id: staff.id,
      first_name: staff.first_name,
      last_name: staff.last_name,
      email: staff.email,
      role: staff.role,
      department: staff.department,
      created_at: staff.created_at
    }))
    
    // Process programs/classes
    await this.processTableData(organizationId, 'programs', async (program) => ({
      id: program.id,
      name: program.name,
      description: program.description,
      capacity: program.capacity,
      price_pennies: program.price_pennies,
      created_at: program.created_at
    }))
    
    console.log(`Completed historical data processing for organization: ${organizationId}`)
  }
  
  private async processTableData(
    organizationId: string,
    tableName: string,
    transformer: (row: any) => Promise<any>
  ): Promise<void> {
    const supabase = await createClient()
    const batchSize = 100
    let offset = 0
    let hasMore = true
    
    console.log(`Processing ${tableName}...`)
    
    while (hasMore) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('organization_id', organizationId)
        .range(offset, offset + batchSize - 1)
        .order('created_at', { ascending: true })
      
      if (error) {
        console.error(`Error fetching ${tableName}:`, error)
        break
      }
      
      if (!data || data.length === 0) {
        hasMore = false
        break
      }
      
      // Process batch
      for (const row of data) {
        try {
          const transformedData = await transformer(row)
          await this.process(transformedData, tableName, organizationId)
        } catch (error) {
          console.error(`Error processing ${tableName} row ${row.id}:`, error)
        }
      }
      
      console.log(`Processed ${offset + data.length} ${tableName} records`)
      
      offset += batchSize
      hasMore = data.length === batchSize
      
      // Small delay to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }
  
  private async understand(data: any, dataType: string): Promise<any> {
    // Create a structured understanding based on data type
    const understanding: any = {
      content: '',
      attributes: {}
    }
    
    switch (dataType) {
      case 'leads':
        understanding.content = `Lead: ${data.name || 'Unknown'} (${data.email || data.phone || 'No contact'}) from ${data.source || 'unknown source'} with status ${data.status || 'new'}`
        understanding.attributes = {
          hasEmail: !!data.email,
          hasPhone: !!data.phone,
          source: data.source,
          status: data.status
        }
        break
        
      case 'bookings':
        understanding.content = `Booking ${data.id} for customer ${data.customer_id} in session ${data.class_session_id} with status ${data.status}`
        understanding.attributes = {
          status: data.status,
          isActive: ['confirmed', 'attended'].includes(data.status)
        }
        break
        
      case 'payment_transactions':
        understanding.content = `Payment of ${data.amount_pennies / 100} GBP from customer ${data.customer_id} via ${data.payment_type} with status ${data.status}`
        understanding.attributes = {
          amount: data.amount_pennies / 100,
          isSuccessful: data.status === 'succeeded'
        }
        break
        
      case 'email_logs':
        understanding.content = `Email to ${data.to_email} with subject "${data.subject}" - ${data.body?.slice(0, 100) || ''}`
        understanding.attributes = {
          hasOpened: data.opened_at != null,
          hasClicked: data.clicked_at != null
        }
        break
        
      case 'whatsapp_logs':
      case 'sms_logs':
        understanding.content = `${dataType === 'whatsapp_logs' ? 'WhatsApp' : 'SMS'} ${data.direction} message ${data.direction === 'inbound' ? 'from' : 'to'} ${data.phone_number}: ${data.message?.slice(0, 100)}`
        understanding.attributes = {
          direction: data.direction,
          isInbound: data.direction === 'inbound'
        }
        break
        
      case 'staff':
        understanding.content = `Staff member: ${data.first_name} ${data.last_name} - ${data.role} in ${data.department || 'unassigned'}`
        understanding.attributes = {
          role: data.role,
          department: data.department,
          isActive: data.status === 'active'
        }
        break
        
      case 'programs':
        understanding.content = `Program: ${data.name} - ${data.description || 'No description'} (Capacity: ${data.capacity}, Price: £${data.price_pennies / 100})`
        understanding.attributes = {
          capacity: data.capacity,
          price: data.price_pennies / 100,
          isActive: data.is_active
        }
        break
        
      default:
        understanding.content = `${dataType} record: ${JSON.stringify(data).slice(0, 200)}`
        understanding.attributes = data
    }
    
    return understanding
  }
  
  private async embed(content: string): Promise<number[]> {
    try {
      return await aiClient.createEmbedding(content)
    } catch (error) {
      console.error('Error generating embedding:', error)
      return []
    }
  }
  
  private async extractEntities(data: any, dataType: string): Promise<ExtractedEntity[]> {
    const entities: ExtractedEntity[] = []
    
    // Extract common entities
    if (data.email) {
      entities.push({
        type: 'email',
        value: data.email,
        confidence: 1.0
      })
    }
    
    if (data.phone || data.phone_number) {
      entities.push({
        type: 'phone',
        value: data.phone || data.phone_number,
        confidence: 1.0
      })
    }
    
    if (data.name) {
      entities.push({
        type: 'person',
        value: data.name,
        confidence: 0.9
      })
    }
    
    if (data.first_name && data.last_name) {
      entities.push({
        type: 'person',
        value: `${data.first_name} ${data.last_name}`,
        confidence: 1.0
      })
    }
    
    // Extract data-type specific entities
    switch (dataType) {
      case 'payment_transactions':
        if (data.amount_pennies) {
          entities.push({
            type: 'monetary_amount',
            value: `${data.amount_pennies / 100} GBP`,
            confidence: 1.0
          })
        }
        break
        
      case 'bookings':
        if (data.class_session_id) {
          entities.push({
            type: 'class_session',
            value: data.class_session_id,
            confidence: 1.0
          })
        }
        break
    }
    
    return entities
  }
  
  private async findConnections(
    data: any,
    dataType: string,
    organizationId: string
  ): Promise<DataConnection[]> {
    const connections: DataConnection[] = []
    const supabase = await createClient()
    
    switch (dataType) {
      case 'bookings':
        if (data.customer_id) {
          connections.push({
            targetId: data.customer_id,
            targetType: 'customer',
            relationshipType: 'booked_by',
            strength: 1.0
          })
        }
        if (data.class_session_id) {
          connections.push({
            targetId: data.class_session_id,
            targetType: 'class_session',
            relationshipType: 'booking_for',
            strength: 1.0
          })
        }
        break
        
      case 'payment_transactions':
        if (data.customer_id) {
          connections.push({
            targetId: data.customer_id,
            targetType: 'customer',
            relationshipType: 'paid_by',
            strength: 1.0
          })
        }
        break
        
      case 'email_logs':
      case 'sms_logs':
      case 'whatsapp_logs':
        // Try to find associated lead/customer
        if (data.lead_id) {
          connections.push({
            targetId: data.lead_id,
            targetType: 'lead',
            relationshipType: 'communication_with',
            strength: 0.8
          })
        } else if (data.to_email || data.phone_number) {
          // Try to match to a lead
          const contact = data.to_email || data.phone_number
          const { data: lead } = await supabase
            .from('leads')
            .select('id')
            .eq('organization_id', organizationId)
            .or(`email.eq.${contact},phone.eq.${contact}`)
            .limit(1)
            .single()
          
          if (lead) {
            connections.push({
              targetId: lead.id,
              targetType: 'lead',
              relationshipType: 'communication_with',
              strength: 0.7
            })
          }
        }
        break
    }
    
    return connections
  }
  
  private async storeInMemory(
    organizationId: string,
    understanding: any,
    embedding: number[],
    entities: ExtractedEntity[],
    connections: DataConnection[],
    dataType: string,
    entityId: string
  ): Promise<void> {
    await this.memory.storeMemory(
      organizationId,
      'data',
      dataType,
      understanding.content,
      {
        attributes: understanding.attributes,
        entities,
        connections
      },
      entityId
    )
  }
}