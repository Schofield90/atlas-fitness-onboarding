const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const organizationId = '63589490-8f55-4157-bd3a-e141594b748e';

// Parse command line arguments
const csvFile = process.argv[2];

if (!csvFile) {
  console.log('⚠️  Usage: node import-payments-csv.js <csv-file>');
  console.log('\nExpected CSV columns (flexible - will try to match):');
  console.log('  - Date/Payment Date/Transaction Date');
  console.log('  - Client Name/Customer Name/Member Name/Name');
  console.log('  - Email (optional but helps with matching)');
  console.log('  - Amount/Payment Amount/Total');
  console.log('  - Payment Method/Method/Type (optional)');
  console.log('  - Description/Notes/Reference (optional)');
  console.log('  - Status (optional, e.g., Paid, Pending, Failed)');
  console.log('  - Invoice Number/Invoice ID (optional)');
  console.log('\nExample: node import-payments-csv.js payments_data.csv');
  process.exit(1);
}

if (!fs.existsSync(csvFile)) {
  console.error(`❌ Error: File "${csvFile}" not found`);
  process.exit(1);
}

async function importPayments() {
  console.log('💳 Starting payment data import...\n');
  console.log(`📄 Reading file: ${csvFile}\n`);

  try {
    // 1. Load all clients for matching
    console.log('1. Loading existing clients for matching...');
    const { data: clients } = await supabase
      .from('clients')
      .select('id, name, first_name, last_name, email, phone')
      .eq('organization_id', organizationId);

    // Create lookup maps for client matching
    const clientByName = new Map();
    const clientByEmail = new Map();
    const clientByPhone = new Map();

    clients?.forEach(client => {
      // Match by full name (case-insensitive)
      clientByName.set(client.name.toLowerCase().trim(), client.id);

      // Also try variations of the name
      if (client.first_name && client.last_name) {
        const fullName = `${client.first_name} ${client.last_name}`.toLowerCase().trim();
        clientByName.set(fullName, client.id);
        // Try last, first format
        const reverseName = `${client.last_name}, ${client.first_name}`.toLowerCase().trim();
        clientByName.set(reverseName, client.id);
      }

      // Match by email
      if (client.email) {
        clientByEmail.set(client.email.toLowerCase().trim(), client.id);
      }

      // Match by phone (normalize phone numbers)
      if (client.phone) {
        const normalizedPhone = client.phone.replace(/[^0-9+]/g, '');
        clientByPhone.set(normalizedPhone, client.id);
      }
    });

    console.log(`Loaded ${clients?.length || 0} clients for matching`);

    // 2. Parse CSV and collect payment records
    console.log('\n2. Parsing CSV file...');
    const paymentRecords = [];

    await new Promise((resolve, reject) => {
      fs.createReadStream(csvFile)
        .pipe(csv())
        .on('data', (row) => {
          // Try to extract data from various possible column names
          const record = {
            date: row['Date'] || row['Payment Date'] || row['Transaction Date'] ||
                  row['date'] || row['payment_date'] || row['transaction_date'] || '',
            clientName: row['Client Name'] || row['Customer Name'] || row['Member Name'] ||
                        row['Name'] || row['Full Name'] || row['client'] || row['customer'] || '',
            email: row['Email'] || row['email'] || row['Email Address'] || '',
            phone: row['Phone'] || row['phone'] || row['Phone Number'] || '',
            amount: row['Amount'] || row['Payment Amount'] || row['Total'] ||
                    row['amount'] || row['payment_amount'] || row['Price'] || '0',
            method: row['Payment Method'] || row['Method'] || row['Type'] ||
                    row['payment_method'] || row['Payment Type'] || 'Unknown',
            description: row['Description'] || row['Notes'] || row['Reference'] ||
                        row['description'] || row['notes'] || row['Memo'] || '',
            status: row['Status'] || row['status'] || row['Payment Status'] || 'completed',
            invoiceNumber: row['Invoice Number'] || row['Invoice ID'] || row['invoice'] || '',
            originalData: row
          };

          // Only add if we have a client name and amount
          if (record.clientName && record.date) {
            paymentRecords.push(record);
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    console.log(`Parsed ${paymentRecords.length} payment records`);

    // 3. Show sample of parsed data
    if (paymentRecords.length > 0) {
      console.log('\nSample parsed records:');
      paymentRecords.slice(0, 3).forEach((record, i) => {
        const amount = parseFloat(record.amount.replace(/[£$,]/g, '')) || 0;
        console.log(`  ${i + 1}. ${record.clientName} - ${record.date} - £${amount.toFixed(2)} - ${record.method}`);
      });
    }

    // 4. Process payment records
    console.log('\n3. Processing payment records...');
    let processed = 0;
    let matched = 0;
    let created = 0;
    let failed = 0;
    const unmatchedClients = new Set();
    const errors = new Map();
    const clientPaymentSummary = new Map(); // Track total payments per client

    for (const record of paymentRecords) {
      try {
        // Try to match client
        let clientId = null;

        // First try email if available
        if (record.email) {
          clientId = clientByEmail.get(record.email.toLowerCase().trim());
        }

        // If no match by email, try phone
        if (!clientId && record.phone) {
          const normalizedPhone = record.phone.replace(/[^0-9+]/g, '');
          clientId = clientByPhone.get(normalizedPhone);
        }

        // If still no match, try name
        if (!clientId) {
          clientId = clientByName.get(record.clientName.toLowerCase().trim());
        }

        // Try partial name match as last resort
        if (!clientId) {
          // Check if any client name contains or is contained in the record name
          for (const [name, id] of clientByName.entries()) {
            if (name.includes(record.clientName.toLowerCase()) ||
                record.clientName.toLowerCase().includes(name)) {
              clientId = id;
              break;
            }
          }
        }

        if (!clientId) {
          unmatchedClients.add(record.clientName);
          failed++;
          continue;
        }

        matched++;

        // Parse amount (remove currency symbols and convert to number)
        let amount = record.amount.toString().replace(/[£$,]/g, '').trim();
        amount = parseFloat(amount) || 0;

        // Convert to pennies for storage
        const amountPennies = Math.round(amount * 100);

        // Parse date in various formats
        let paymentDate = record.date;

        // Try to parse date in various formats
        if (paymentDate.includes('/')) {
          // Handle MM/DD/YYYY or DD/MM/YYYY
          const parts = paymentDate.split('/');
          if (parts.length === 3) {
            // Assume DD/MM/YYYY for UK format
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
            paymentDate = `${year}-${month}-${day}`;
          }
        } else if (paymentDate.includes('-') && !paymentDate.match(/^\d{4}-/)) {
          // Handle DD-MM-YYYY format
          const parts = paymentDate.split('-');
          if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
            paymentDate = `${year}-${month}-${day}`;
          }
        }

        // Ensure date is valid
        const dateObj = new Date(paymentDate);
        if (isNaN(dateObj.getTime())) {
          console.log(`  ⚠️  Invalid date for ${record.clientName}: ${record.date}`);
          paymentDate = new Date().toISOString().split('T')[0]; // Use today as fallback
        }

        // Determine payment status
        const status = record.status.toLowerCase();
        let paymentStatus = 'completed';
        if (status.includes('pend')) paymentStatus = 'pending';
        else if (status.includes('fail')) paymentStatus = 'failed';
        else if (status.includes('refund')) paymentStatus = 'refunded';
        else if (status.includes('cancel')) paymentStatus = 'cancelled';

        // Create transaction record (only required fields for this table)
        const transactionData = {
          client_id: clientId,
          type: 'payment',
          amount: amountPennies,
          created_at: new Date().toISOString()
        };

        // Store additional payment details in a description field if it exists
        const paymentDetails = `${record.method || 'Unknown method'} - ${record.description || 'Payment'} - ${paymentStatus}`;
        // We'll try adding optional fields, but won't fail if they don't exist
        const optionalFields = {
          currency: 'GBP',
          status: paymentStatus,
          description: paymentDetails,
          reference: record.invoiceNumber || null,
          transaction_date: paymentDate,
          updated_at: new Date().toISOString()
        };

        // Check if this transaction already exists (avoid duplicates)
        // Since we might not have transaction_date field, check by client and amount on same date
        const dateStart = new Date(paymentDate);
        dateStart.setHours(0, 0, 0, 0);
        const dateEnd = new Date(paymentDate);
        dateEnd.setHours(23, 59, 59, 999);

        const { data: existing } = await supabase
          .from('transactions')
          .select('id')
          .eq('client_id', clientId)
          .eq('amount', amountPennies)
          .gte('created_at', dateStart.toISOString())
          .lte('created_at', dateEnd.toISOString())
          .single();

        if (!existing) {
          // First try with all fields
          let { error: insertError } = await supabase
            .from('transactions')
            .insert({ ...transactionData, ...optionalFields });

          if (insertError) {
            // If that fails, try with just required fields
            ({ error: insertError } = await supabase
              .from('transactions')
              .insert(transactionData));

            if (insertError) {
              throw insertError;
            }
          }
          created++;

          // Track payment summary
          if (!clientPaymentSummary.has(clientId)) {
            const clientName = Array.from(clientByName.entries())
              .find(([_, id]) => id === clientId)?.[0] || 'Unknown';
            clientPaymentSummary.set(clientId, {
              name: clientName,
              count: 0,
              total: 0
            });
          }
          const summary = clientPaymentSummary.get(clientId);
          summary.count++;
          summary.total += amount;

          if (created <= 10 || created % 50 === 0) {
            console.log(`  ✓ Imported: ${record.clientName} - ${paymentDate} - £${amount.toFixed(2)}`);
          }
        } else {
          // Skip duplicate
          if (processed < 5) {
            console.log(`  ↺ Skipped duplicate: ${record.clientName} - ${paymentDate} - £${amount.toFixed(2)}`);
          }
        }
      } catch (error) {
        failed++;
        const errorMsg = error.message.substring(0, 50);
        errors.set(errorMsg, (errors.get(errorMsg) || 0) + 1);
      }

      processed++;
      if (processed % 100 === 0) {
        console.log(`  ... Processed ${processed}/${paymentRecords.length} records`);
      }
    }

    // 5. Show results
    console.log('\n' + '='.repeat(50));
    console.log('✅ PAYMENT IMPORT COMPLETE!');
    console.log('='.repeat(50));
    console.log(`📄 Total records in CSV: ${paymentRecords.length}`);
    console.log(`✅ Matched to clients: ${matched}`);
    console.log(`➕ Created new transactions: ${created}`);
    console.log(`❌ Failed: ${failed}`);

    if (unmatchedClients.size > 0) {
      console.log('\n⚠️  Unmatched client names (need to be imported first):');
      const unmatchedList = Array.from(unmatchedClients).slice(0, 10);
      unmatchedList.forEach(name => {
        console.log(`  - ${name}`);
      });
      if (unmatchedClients.size > 10) {
        console.log(`  ... and ${unmatchedClients.size - 10} more`);
      }
      console.log('\n💡 Tip: Make sure clients are imported first, or check for name variations');
    }

    if (errors.size > 0) {
      console.log('\n⚠️  Error summary:');
      errors.forEach((count, error) => {
        console.log(`  - ${error}... (${count} times)`);
      });
    }

    // 6. Show payment summary for top clients
    if (clientPaymentSummary.size > 0) {
      console.log('\n📊 Payment Summary (Top 10 clients by total):');
      const sortedSummary = Array.from(clientPaymentSummary.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      sortedSummary.forEach(summary => {
        const formattedName = summary.name.split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        console.log(`  ${formattedName}: ${summary.count} payments, Total: £${summary.total.toFixed(2)}`);
      });

      // Calculate totals
      const totalAmount = Array.from(clientPaymentSummary.values())
        .reduce((sum, s) => sum + s.total, 0);
      const totalPayments = Array.from(clientPaymentSummary.values())
        .reduce((sum, s) => sum + s.count, 0);

      console.log('\n💰 Grand Total:');
      console.log(`  Payments imported: ${totalPayments}`);
      console.log(`  Total amount: £${totalAmount.toFixed(2)}`);
      console.log(`  Average payment: £${(totalAmount / totalPayments).toFixed(2)}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

importPayments();