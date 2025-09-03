#!/usr/bin/env node

/**
 * One-time script to fix membership prices that were incorrectly stored
 * If a price looks like it's been multiplied by 100 twice (e.g., 10000 for £1), fix it
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixMembershipPrices() {
  console.log('Fetching all membership plans...')
  
  const { data: plans, error } = await supabase
    .from('membership_plans')
    .select('id, name, price_pennies, organization_id')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching plans:', error)
    return
  }
  
  if (!plans || plans.length === 0) {
    console.log('No membership plans found')
    return
  }
  
  console.log(`Found ${plans.length} membership plans`)
  
  const plansToFix = []
  
  for (const plan of plans) {
    // Check if price seems incorrectly high (e.g., 10000 instead of 100 for £1)
    // If a price is exactly divisible by 10000, it's likely been multiplied twice
    if (plan.price_pennies >= 10000 && plan.price_pennies % 100 === 0) {
      const likelyCorrectPrice = Math.round(plan.price_pennies / 100)
      
      console.log(`\nPlan: ${plan.name}`)
      console.log(`  Current price_pennies: ${plan.price_pennies} (displays as £${plan.price_pennies / 100})`)
      console.log(`  Likely correct price_pennies: ${likelyCorrectPrice} (would display as £${likelyCorrectPrice / 100})`)
      
      plansToFix.push({
        id: plan.id,
        name: plan.name,
        current: plan.price_pennies,
        corrected: likelyCorrectPrice
      })
    }
  }
  
  if (plansToFix.length === 0) {
    console.log('\nNo plans need fixing')
    return
  }
  
  console.log(`\n${plansToFix.length} plans appear to have incorrect prices`)
  console.log('\nWould you like to fix these prices? (y/n)')
  
  // For automated script, we'll just show what would be fixed
  console.log('\nTo fix these prices, run:')
  console.log('npm run fix-prices:confirm')
  
  // Show the SQL that would be run
  console.log('\nSQL that would be executed:')
  for (const plan of plansToFix) {
    console.log(`UPDATE membership_plans SET price_pennies = ${plan.corrected} WHERE id = '${plan.id}';`)
  }
}

// Check if this is being run with --confirm flag
const shouldFix = process.argv.includes('--confirm')

if (shouldFix) {
  console.log('Fixing prices...')
  
  async function applyFixes() {
    const { data: plans, error: fetchError } = await supabase
      .from('membership_plans')
      .select('id, name, price_pennies')
      .gte('price_pennies', 10000)
    
    if (fetchError || !plans) {
      console.error('Error fetching plans:', fetchError)
      return
    }
    
    for (const plan of plans) {
      if (plan.price_pennies >= 10000 && plan.price_pennies % 100 === 0) {
        const correctedPrice = Math.round(plan.price_pennies / 100)
        
        const { error: updateError } = await supabase
          .from('membership_plans')
          .update({ price_pennies: correctedPrice })
          .eq('id', plan.id)
        
        if (updateError) {
          console.error(`Error updating plan ${plan.name}:`, updateError)
        } else {
          console.log(`✓ Fixed ${plan.name}: ${plan.price_pennies} → ${correctedPrice} pence`)
        }
      }
    }
    
    console.log('\nPrice fix complete!')
  }
  
  applyFixes().catch(console.error)
} else {
  fixMembershipPrices().catch(console.error)
}