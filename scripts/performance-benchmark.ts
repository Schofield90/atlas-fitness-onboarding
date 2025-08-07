#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'

// Load environment variables
dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: 'public' },
  auth: { persistSession: false }
})

interface BenchmarkResult {
  operation: string
  avgTime: number
  minTime: number
  maxTime: number
  samples: number
  queries: string[]
  status: 'PASS' | 'FAIL'
  threshold: number
}

class PerformanceBenchmark {
  private results: BenchmarkResult[] = []
  private testOrganizationId?: string
  
  async setup() {
    console.log('🔧 Setting up benchmark data...')
    
    // Get or create test organization
    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('name', 'Benchmark Test Org')
      .single()
    
    if (org) {
      this.testOrganizationId = org.id
    } else {
      const { data: newOrg } = await supabase
        .from('organizations')
        .insert({ name: 'Benchmark Test Org', slug: 'benchmark-test' })
        .select()
        .single()
      
      this.testOrganizationId = newOrg?.id
    }
    
    // Create test data if needed
    const { count } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', this.testOrganizationId)
    
    if (!count || count < 100) {
      console.log('   Creating test leads...')
      const testLeads = Array.from({ length: 100 }, (_, i) => ({
        organization_id: this.testOrganizationId,
        name: `Benchmark Lead ${i}`,
        email: `benchmark${i}@example.com`,
        phone: `+44777${i.toString().padStart(7, '0')}`,
        status: i % 3 === 0 ? 'contacted' : 'new'
      }))
      
      await supabase.from('leads').insert(testLeads)
    }
  }
  
  async cleanup() {
    console.log('🧹 Cleaning up benchmark data...')
    
    if (this.testOrganizationId) {
      await supabase
        .from('leads')
        .delete()
        .eq('organization_id', this.testOrganizationId)
      
      await supabase
        .from('organizations')
        .delete()
        .eq('id', this.testOrganizationId)
    }
  }
  
  async benchmark(
    name: string, 
    operation: () => Promise<any>, 
    samples: number = 10,
    threshold: number = 100
  ): Promise<BenchmarkResult> {
    const times: number[] = []
    const queries: string[] = []
    
    // Warm up
    await operation()
    
    // Run benchmarks
    for (let i = 0; i < samples; i++) {
      const start = performance.now()
      await operation()
      const end = performance.now()
      times.push(end - start)
    }
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length
    const minTime = Math.min(...times)
    const maxTime = Math.max(...times)
    
    const result: BenchmarkResult = {
      operation: name,
      avgTime,
      minTime,
      maxTime,
      samples,
      queries,
      status: avgTime <= threshold ? 'PASS' : 'FAIL',
      threshold
    }
    
    this.results.push(result)
    return result
  }
  
  async runBenchmarks() {
    console.log('\n🏃 Running Performance Benchmarks...\n')
    
    // 1. Simple queries with indexes
    console.log('📊 Testing indexed queries...')
    
    await this.benchmark(
      'Query by organization_id',
      async () => {
        await supabase
          .from('leads')
          .select('*')
          .eq('organization_id', this.testOrganizationId)
          .limit(50)
      },
      10,
      50 // 50ms threshold
    )
    
    await this.benchmark(
      'Query by email (indexed)',
      async () => {
        await supabase
          .from('leads')
          .select('*')
          .eq('email', 'benchmark50@example.com')
          .single()
      },
      10,
      20 // 20ms threshold
    )
    
    await this.benchmark(
      'Query by date range',
      async () => {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        
        await supabase
          .from('leads')
          .select('*')
          .gte('created_at', yesterday)
          .lte('created_at', tomorrow)
          .limit(50)
      },
      10,
      100 // 100ms threshold
    )
    
    // 2. Complex queries
    console.log('\n📊 Testing complex queries...')
    
    await this.benchmark(
      'Multi-condition query',
      async () => {
        await supabase
          .from('leads')
          .select('*')
          .eq('organization_id', this.testOrganizationId)
          .eq('status', 'new')
          .order('created_at', { ascending: false })
          .limit(20)
      },
      10,
      75 // 75ms threshold
    )
    
    // 3. Join queries
    console.log('\n📊 Testing join queries...')
    
    await this.benchmark(
      'Join with organizations',
      async () => {
        await supabase
          .from('leads')
          .select(`
            *,
            organizations (
              name,
              slug
            )
          `)
          .eq('organization_id', this.testOrganizationId)
          .limit(20)
      },
      10,
      150 // 150ms threshold
    )
    
    // 4. Aggregation queries
    console.log('\n📊 Testing aggregation queries...')
    
    await this.benchmark(
      'Count with filters',
      async () => {
        await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', this.testOrganizationId)
          .eq('status', 'new')
      },
      10,
      50 // 50ms threshold
    )
    
    // 5. Write operations
    console.log('\n📊 Testing write operations...')
    
    await this.benchmark(
      'Single insert',
      async () => {
        const { data } = await supabase
          .from('leads')
          .insert({
            organization_id: this.testOrganizationId,
            name: 'Benchmark Insert',
            email: `bench-${Date.now()}@example.com`,
            phone: '+447777777777',
            status: 'new'
          })
          .select()
          .single()
        
        // Clean up immediately
        if (data) {
          await supabase.from('leads').delete().eq('id', data.id)
        }
      },
      5,
      100 // 100ms threshold
    )
    
    await this.benchmark(
      'Bulk insert (10 records)',
      async () => {
        const records = Array.from({ length: 10 }, (_, i) => ({
          organization_id: this.testOrganizationId,
          name: `Bulk Insert ${i}`,
          email: `bulk-${Date.now()}-${i}@example.com`,
          phone: '+447777777777',
          status: 'new'
        }))
        
        const { data } = await supabase
          .from('leads')
          .insert(records)
          .select()
        
        // Clean up
        if (data) {
          const ids = data.map(d => d.id)
          await supabase.from('leads').delete().in('id', ids)
        }
      },
      5,
      200 // 200ms threshold
    )
  }
  
  generateReport() {
    console.log('\n' + '='.repeat(60))
    console.log('⚡ PERFORMANCE BENCHMARK REPORT')
    console.log('='.repeat(60))
    console.log(`Generated: ${new Date().toLocaleString()}`)
    console.log(`Database: ${SUPABASE_URL}\n`)
    
    // Summary
    const passed = this.results.filter(r => r.status === 'PASS').length
    const failed = this.results.filter(r => r.status === 'FAIL').length
    const avgPerformance = this.results.reduce((sum, r) => sum + r.avgTime, 0) / this.results.length
    
    console.log(`📊 Summary:`)
    console.log(`   ✅ Passed: ${passed}/${this.results.length}`)
    console.log(`   ❌ Failed: ${failed}/${this.results.length}`)
    console.log(`   ⏱️  Average: ${avgPerformance.toFixed(2)}ms\n`)
    
    // Detailed results
    console.log('📋 Detailed Results:\n')
    
    this.results.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : '❌'
      const status = result.avgTime <= result.threshold ? 'PASS' : 'FAIL'
      
      console.log(`${icon} ${result.operation}`)
      console.log(`   Average: ${result.avgTime.toFixed(2)}ms (threshold: ${result.threshold}ms)`)
      console.log(`   Min: ${result.minTime.toFixed(2)}ms | Max: ${result.maxTime.toFixed(2)}ms`)
      console.log(`   Samples: ${result.samples}`)
      
      if (result.status === 'FAIL') {
        const slowness = ((result.avgTime / result.threshold - 1) * 100).toFixed(0)
        console.log(`   ⚠️  ${slowness}% slower than threshold`)
      }
      console.log('')
    })
    
    // Recommendations
    const slowQueries = this.results.filter(r => r.status === 'FAIL')
    if (slowQueries.length > 0) {
      console.log('💡 Performance Recommendations:\n')
      
      slowQueries.forEach(result => {
        console.log(`   ${result.operation}:`)
        
        if (result.operation.includes('join')) {
          console.log('      - Consider denormalizing data for faster queries')
          console.log('      - Add composite indexes on join columns')
        } else if (result.operation.includes('bulk')) {
          console.log('      - Use database transactions for consistency')
          console.log('      - Consider batch processing for large operations')
        } else {
          console.log('      - Review and optimize query indexes')
          console.log('      - Consider query result caching')
        }
        console.log('')
      })
    }
    
    // Save report
    const report = {
      timestamp: new Date().toISOString(),
      database: SUPABASE_URL,
      summary: {
        totalTests: this.results.length,
        passed,
        failed,
        averageResponseTime: avgPerformance
      },
      results: this.results,
      recommendations: this.generateRecommendations()
    }
    
    fs.writeFileSync('performance-benchmark-report.json', JSON.stringify(report, null, 2))
    console.log('📄 Detailed report saved to: performance-benchmark-report.json')
  }
  
  generateRecommendations(): string[] {
    const recommendations = []
    
    const slowQueries = this.results.filter(r => r.status === 'FAIL')
    const avgPerformance = this.results.reduce((sum, r) => sum + r.avgTime, 0) / this.results.length
    
    if (avgPerformance > 100) {
      recommendations.push('Overall performance needs improvement - average query time exceeds 100ms')
    }
    
    if (slowQueries.some(q => q.operation.includes('organization_id'))) {
      recommendations.push('Ensure organization_id indexes are being used effectively')
    }
    
    if (slowQueries.some(q => q.operation.includes('join'))) {
      recommendations.push('Consider materialized views for complex joins')
    }
    
    recommendations.push(
      'Monitor query performance in production using Supabase dashboard',
      'Set up alerts for slow queries exceeding thresholds',
      'Review and optimize database indexes monthly',
      'Consider implementing query result caching for frequently accessed data'
    )
    
    return recommendations
  }
}

async function main() {
  const benchmark = new PerformanceBenchmark()
  
  console.log('⚡ Performance Benchmark Tool')
  console.log('=============================\n')
  
  try {
    await benchmark.setup()
    await benchmark.runBenchmarks()
    benchmark.generateReport()
    
    // Cleanup unless --keep-data flag is passed
    if (!process.argv.includes('--keep-data')) {
      await benchmark.cleanup()
    }
    
    console.log('\n✅ Benchmark complete!')
    
  } catch (error) {
    console.error('❌ Benchmark failed:', error)
    await benchmark.cleanup()
    process.exit(1)
  }
}

main().catch(console.error)