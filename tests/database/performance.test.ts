import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { testDb, setupTestData, cleanupTestData, testOrganization } from '../setup/test-database'

describe('Database Performance Tests', () => {
  const PERFORMANCE_THRESHOLD_MS = 100 // 100ms threshold
  
  beforeAll(async () => {
    await setupTestData()
    
    // Create test data for performance testing
    const promises = []
    for (let i = 0; i < 100; i++) {
      promises.push(
        testDb.from('leads').insert({
          organization_id: testOrganization.id,
          name: `Test Lead ${i}`,
          email: `lead${i}@example.com`,
          phone: `+4477777${i.toString().padStart(5, '0')}`,
          status: 'new'
        })
      )
    }
    await Promise.all(promises)
  })
  
  afterAll(async () => {
    // Clean up test leads
    await testDb
      .from('leads')
      .delete()
      .eq('organization_id', testOrganization.id)
    
    await cleanupTestData()
  })
  
  describe('Index Performance', () => {
    it('should query leads by organization_id efficiently', async () => {
      const start = Date.now()
      
      const { data, error } = await testDb
        .from('leads')
        .select('*')
        .eq('organization_id', testOrganization.id)
        .limit(50)
      
      const duration = Date.now() - start
      
      expect(error).toBeNull()
      expect(data).toHaveLength(50)
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS)
      
      console.log(`Query by organization_id took ${duration}ms`)
    })
    
    it('should query leads by email efficiently', async () => {
      const start = Date.now()
      
      const { data, error } = await testDb
        .from('leads')
        .select('*')
        .eq('email', 'lead50@example.com')
        .single()
      
      const duration = Date.now() - start
      
      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS)
      
      console.log(`Query by email took ${duration}ms`)
    })
    
    it('should query leads by created_at range efficiently', async () => {
      const start = Date.now()
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      
      const { data, error } = await testDb
        .from('leads')
        .select('*')
        .gte('created_at', yesterday)
        .lte('created_at', tomorrow)
        .limit(50)
      
      const duration = Date.now() - start
      
      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS)
      
      console.log(`Query by date range took ${duration}ms`)
    })
  })
  
  describe('Composite Query Performance', () => {
    it('should handle complex queries with multiple conditions efficiently', async () => {
      const start = Date.now()
      
      const { data, error } = await testDb
        .from('leads')
        .select('*')
        .eq('organization_id', testOrganization.id)
        .eq('status', 'new')
        .order('created_at', { ascending: false })
        .limit(20)
      
      const duration = Date.now() - start
      
      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS * 1.5) // Allow slightly more time for complex queries
      
      console.log(`Complex query took ${duration}ms`)
    })
  })
  
  describe('Bulk Operation Performance', () => {
    it('should insert multiple records efficiently', async () => {
      const records = Array.from({ length: 50 }, (_, i) => ({
        organization_id: testOrganization.id,
        name: `Bulk Lead ${i}`,
        email: `bulk${i}@example.com`,
        phone: `+4478888${i.toString().padStart(5, '0')}`,
        status: 'new'
      }))
      
      const start = Date.now()
      
      const { error } = await testDb
        .from('leads')
        .insert(records)
      
      const duration = Date.now() - start
      
      expect(error).toBeNull()
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS * 5) // Allow more time for bulk insert
      
      console.log(`Bulk insert of 50 records took ${duration}ms`)
      
      // Clean up
      await testDb
        .from('leads')
        .delete()
        .like('email', 'bulk%')
    })
    
    it('should update multiple records efficiently', async () => {
      const start = Date.now()
      
      const { error } = await testDb
        .from('leads')
        .update({ status: 'contacted' })
        .eq('organization_id', testOrganization.id)
        .eq('status', 'new')
        .limit(20)
      
      const duration = Date.now() - start
      
      expect(error).toBeNull()
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS * 2)
      
      console.log(`Bulk update took ${duration}ms`)
    })
  })
  
  describe('Index Coverage', () => {
    const indexedTables = [
      { table: 'leads', columns: ['organization_id', 'email', 'created_at'] },
      { table: 'bookings', columns: ['organization_id', 'class_session_id', 'customer_id'] },
      { table: 'class_sessions', columns: ['start_time'] },
      { table: 'sms_logs', columns: ['to'] },
      { table: 'whatsapp_logs', columns: ['to'] },
      { table: 'tasks', columns: ['organization_id'] },
      { table: 'memberships', columns: ['organization_id'] }
    ]
    
    indexedTables.forEach(({ table, columns }) => {
      columns.forEach(column => {
        it(`should have index on ${table}.${column}`, async () => {
          const { data, error } = await testDb
            .rpc('check_index_exists', { 
              table_name: table,
              column_name: column
            })
          
          expect(error).toBeNull()
          expect(data).toBe(true)
        })
      })
    })
  })
})