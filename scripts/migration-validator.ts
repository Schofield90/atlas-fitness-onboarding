#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: 'public' },
  auth: { persistSession: false }
})

interface MigrationValidation {
  file: string
  status: 'VALID' | 'INVALID' | 'WARNING'
  issues: string[]
  suggestions: string[]
}

class MigrationValidator {
  private validations: MigrationValidation[] = []
  
  async validateMigrationFile(filePath: string): Promise<MigrationValidation> {
    const fileName = path.basename(filePath)
    const content = fs.readFileSync(filePath, 'utf-8')
    const validation: MigrationValidation = {
      file: fileName,
      status: 'VALID',
      issues: [],
      suggestions: []
    }
    
    // Check file naming convention
    if (!fileName.match(/^\d{8}_[\w_]+\.sql$/)) {
      validation.issues.push('File name should follow pattern: YYYYMMDD_description.sql')
      validation.status = 'INVALID'
    }
    
    // Check for dangerous operations
    const dangerousPatterns = [
      { pattern: /DROP\s+TABLE\s+(?!IF\s+EXISTS)/i, message: 'DROP TABLE without IF EXISTS is dangerous' },
      { pattern: /DELETE\s+FROM\s+\w+\s*;/i, message: 'DELETE without WHERE clause will delete all records' },
      { pattern: /TRUNCATE\s+TABLE/i, message: 'TRUNCATE TABLE is dangerous in production' },
      { pattern: /DROP\s+COLUMN/i, message: 'DROP COLUMN is destructive - consider deprecation first' }
    ]
    
    dangerousPatterns.forEach(({ pattern, message }) => {
      if (pattern.test(content)) {
        validation.issues.push(message)
        validation.status = 'WARNING'
      }
    })
    
    // Check for best practices
    if (!content.includes('BEGIN;') && !content.includes('COMMIT;')) {
      validation.suggestions.push('Consider wrapping migration in BEGIN/COMMIT transaction')
    }
    
    if (content.includes('ALTER TABLE') && !content.includes('IF NOT EXISTS')) {
      validation.suggestions.push('Consider using IF NOT EXISTS for idempotent migrations')
    }
    
    // Check for organization_id in new tables
    if (content.includes('CREATE TABLE')) {
      const tableMatches = content.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/gi)
      tableMatches?.forEach(match => {
        const tableName = match.split(/\s+/).pop()
        if (tableName && !content.includes(`${tableName}.*organization_id`)) {
          validation.suggestions.push(`Table ${tableName} might need organization_id for multi-tenancy`)
        }
      })
    }
    
    // Check for RLS policies
    if (content.includes('CREATE TABLE') && !content.includes('ENABLE ROW LEVEL SECURITY')) {
      validation.suggestions.push('New tables should have RLS enabled for security')
    }
    
    // Check for indexes on foreign keys
    const foreignKeyPattern = /REFERENCES\s+(\w+)\s*\((\w+)\)/g
    let fkMatch
    while ((fkMatch = foreignKeyPattern.exec(content)) !== null) {
      const [_, refTable, refColumn] = fkMatch
      if (!content.includes(`CREATE INDEX`) || !content.includes(refColumn)) {
        validation.suggestions.push(`Consider adding index for foreign key referencing ${refTable}.${refColumn}`)
      }
    }
    
    return validation
  }
  
  async validateAllMigrations(): Promise<void> {
    const migrationDirs = [
      'supabase/migrations',
      'scripts/migrations',
      'database/migrations'
    ]
    
    for (const dir of migrationDirs) {
      const fullPath = path.join(process.cwd(), dir)
      if (fs.existsSync(fullPath)) {
        console.log(`\n📁 Checking migrations in ${dir}...`)
        
        const files = fs.readdirSync(fullPath)
          .filter(f => f.endsWith('.sql'))
          .sort()
        
        for (const file of files) {
          const validation = await this.validateMigrationFile(path.join(fullPath, file))
          this.validations.push(validation)
          
          // Print immediate feedback
          const icon = validation.status === 'VALID' ? '✅' : 
                      validation.status === 'WARNING' ? '⚠️' : '❌'
          console.log(`   ${icon} ${file}`)
          
          if (validation.issues.length > 0) {
            validation.issues.forEach(issue => {
              console.log(`      ❌ ${issue}`)
            })
          }
          
          if (validation.suggestions.length > 0 && process.env.VERBOSE) {
            validation.suggestions.forEach(suggestion => {
              console.log(`      💡 ${suggestion}`)
            })
          }
        }
      }
    }
  }
  
  async checkMigrationHistory(): Promise<void> {
    console.log('\n📊 Checking migration history...')
    
    try {
      // Check if migrations table exists
      const { data: tables } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'schema_migrations')
        .single()
      
      if (!tables) {
        console.log('   ⚠️  No schema_migrations table found')
        console.log('   💡 Consider creating a migration tracking system')
        return
      }
      
      // Get applied migrations
      const { data: applied, error } = await supabase
        .from('schema_migrations')
        .select('version, applied_at')
        .order('version', { ascending: false })
        .limit(10)
      
      if (error) {
        console.log('   ❌ Error checking migration history:', error.message)
        return
      }
      
      console.log(`   ✅ Found ${applied?.length || 0} applied migrations`)
      applied?.slice(0, 5).forEach(m => {
        console.log(`      - ${m.version} (${new Date(m.applied_at).toLocaleDateString()})`)
      })
      
    } catch (err) {
      console.log('   ℹ️  Migration tracking not set up')
    }
  }
  
  generateReport(): void {
    console.log('\n' + '='.repeat(60))
    console.log('📋 MIGRATION VALIDATION REPORT')
    console.log('='.repeat(60))
    
    const valid = this.validations.filter(v => v.status === 'VALID').length
    const warnings = this.validations.filter(v => v.status === 'WARNING').length
    const invalid = this.validations.filter(v => v.status === 'INVALID').length
    
    console.log(`\n📈 Summary:`)
    console.log(`   ✅ Valid: ${valid}`)
    console.log(`   ⚠️  Warnings: ${warnings}`)
    console.log(`   ❌ Invalid: ${invalid}`)
    console.log(`   📄 Total: ${this.validations.length}`)
    
    // Show problematic files
    const problematic = this.validations.filter(v => v.status !== 'VALID')
    if (problematic.length > 0) {
      console.log('\n⚠️  Files requiring attention:')
      problematic.forEach(v => {
        console.log(`\n   ${v.file} (${v.status})`)
        v.issues.forEach(issue => console.log(`      ❌ ${issue}`))
        v.suggestions.forEach(suggestion => console.log(`      💡 ${suggestion}`))
      })
    }
    
    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      summary: { valid, warnings, invalid, total: this.validations.length },
      validations: this.validations
    }
    
    fs.writeFileSync('migration-validation-report.json', JSON.stringify(report, null, 2))
    console.log('\n📄 Detailed report saved to: migration-validation-report.json')
  }
  
  async createMigrationTemplate(): Promise<void> {
    const template = `-- Migration: [Description]
-- Author: [Your Name]
-- Date: ${new Date().toISOString().split('T')[0]}

-- ================================================
-- MIGRATION UP
-- ================================================

BEGIN;

-- Add your migration SQL here
-- Example:
-- CREATE TABLE IF NOT EXISTS new_table (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   organization_id UUID NOT NULL REFERENCES organizations(id),
--   name VARCHAR(255) NOT NULL,
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- Enable RLS
-- ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- CREATE POLICY "Users can view their organization's records" ON new_table
--   FOR SELECT USING (organization_id IN (
--     SELECT organization_id FROM users WHERE id = auth.uid()
--   ));

-- Create indexes
-- CREATE INDEX idx_new_table_organization_id ON new_table(organization_id);

COMMIT;

-- ================================================
-- MIGRATION DOWN (Rollback)
-- ================================================
-- BEGIN;
-- DROP TABLE IF EXISTS new_table;
-- COMMIT;
`
    
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '')
    const fileName = `${date}_migration_template.sql`
    const filePath = path.join(process.cwd(), 'supabase/migrations', fileName)
    
    // Create directory if it doesn't exist
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    
    fs.writeFileSync(filePath, template)
    console.log(`\n✅ Created migration template: ${fileName}`)
  }
}

async function main() {
  const validator = new MigrationValidator()
  
  console.log('🚀 Migration Validation System')
  console.log('==============================\n')
  
  const args = process.argv.slice(2)
  
  if (args.includes('--create-template')) {
    await validator.createMigrationTemplate()
    return
  }
  
  await validator.validateAllMigrations()
  await validator.checkMigrationHistory()
  validator.generateReport()
  
  console.log('\n💡 Tips:')
  console.log('   - Run with VERBOSE=true for detailed suggestions')
  console.log('   - Use --create-template to create a new migration file')
  console.log('   - Always test migrations in a development environment first')
}

main().catch(console.error)