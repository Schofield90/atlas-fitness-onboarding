const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function cleanupMembers() {
  console.log('Starting members cleanup...')
  
  try {
    // Step 1: Get all clients
    const { data: allClients, error: fetchError } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: true })
    
    if (fetchError) {
      console.error('Error fetching clients:', fetchError)
      return
    }
    
    console.log(`Found ${allClients.length} total clients`)
    
    // Step 2: Find Sam Schofield entries
    const samEntries = allClients.filter(client => 
      client.email === 'samschofield90@hotmail.co.uk' ||
      (client.first_name?.toLowerCase() === 'sam' && client.last_name?.toLowerCase() === 'schofield')
    )
    
    console.log(`Found ${samEntries.length} Sam Schofield entries`)
    
    // Step 3: Keep only the oldest Sam Schofield entry with samschofield90@hotmail.co.uk email
    let keepSamId = null
    const samWithCorrectEmail = samEntries.find(s => s.email === 'samschofield90@hotmail.co.uk')
    
    if (samWithCorrectEmail) {
      keepSamId = samWithCorrectEmail.id
      console.log(`Keeping Sam Schofield with ID: ${keepSamId}`)
    } else if (samEntries.length > 0) {
      // If no entry with correct email, keep the oldest Sam entry and update its email
      const oldestSam = samEntries[0]
      keepSamId = oldestSam.id
      
      const { error: updateError } = await supabase
        .from('clients')
        .update({ email: 'samschofield90@hotmail.co.uk' })
        .eq('id', keepSamId)
      
      if (updateError) {
        console.error('Error updating Sam email:', updateError)
      } else {
        console.log(`Updated Sam Schofield ID ${keepSamId} with correct email`)
      }
    }
    
    // Step 4: Delete all other clients
    const idsToDelete = allClients
      .filter(client => client.id !== keepSamId)
      .map(client => client.id)
    
    if (idsToDelete.length > 0) {
      console.log(`Deleting ${idsToDelete.length} clients...`)
      
      // Delete in batches to avoid timeout
      const batchSize = 100
      for (let i = 0; i < idsToDelete.length; i += batchSize) {
        const batch = idsToDelete.slice(i, i + batchSize)
        
        const { error: deleteError } = await supabase
          .from('clients')
          .delete()
          .in('id', batch)
        
        if (deleteError) {
          console.error(`Error deleting batch ${i / batchSize + 1}:`, deleteError)
        } else {
          console.log(`Deleted batch ${i / batchSize + 1} (${batch.length} clients)`)
        }
      }
    }
    
    // Step 5: Verify final state
    const { data: finalClients, error: finalError } = await supabase
      .from('clients')
      .select('*')
    
    if (finalError) {
      console.error('Error checking final state:', finalError)
    } else {
      console.log(`\nCleanup complete! ${finalClients.length} client(s) remaining:`)
      finalClients.forEach(client => {
        console.log(`- ${client.first_name} ${client.last_name} (${client.email})`)
      })
    }
    
  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

cleanupMembers()