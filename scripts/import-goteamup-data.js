const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const organizationId = '63589490-8f55-4157-bd3a-e141594b748e';

// Parse UK date format (DD/MM/YYYY)
function parseUKDate(dateStr) {
  const [day, month, year] = dateStr.split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

// Parse amount to pennies
function parseAmount(amountStr) {
  const amount = parseFloat(amountStr.replace(/[£,]/g, ''));
  return Math.round(amount * 100); // Convert to pennies
}

// Import payments from CSV
async function importPayments(filePath) {
  console.log('\n📊 Importing Payments from:', filePath);
  console.log('=' .repeat(60));

  const payments = [];

  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        payments.push(row);
      })
      .on('end', async () => {
        console.log(`Found ${payments.length} payments to import\n`);

        let successCount = 0;
        let errorCount = 0;
        let skippedCount = 0;

        for (const payment of payments) {
          try {
            // Find client by name and email
            const nameParts = payment['Client Name'].split(' ');
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(' ');

            // Try to find client
            const { data: client } = await supabase
              .from('clients')
              .select('id')
              .eq('email', payment.Email)
              .eq('org_id', organizationId)
              .single();

            if (!client) {
              console.log(`⚠️ Client not found: ${payment['Client Name']} (${payment.Email})`);
              skippedCount++;
              continue;
            }

            // Check if payment already exists
            const paymentDate = parseUKDate(payment.Date);
            const amount = parseAmount(payment.Amount);

            const { data: existingPayment } = await supabase
              .from('payments')
              .select('id')
              .eq('client_id', client.id)
              .eq('payment_date', paymentDate)
              .eq('amount', amount)
              .single();

            if (existingPayment) {
              console.log(`⏭️ Payment already exists: ${payment['Client Name']} - £${payment.Amount} on ${payment.Date}`);
              skippedCount++;
              continue;
            }

            // Insert payment
            const { error } = await supabase
              .from('payments')
              .insert({
                organization_id: organizationId,
                client_id: client.id,
                amount: amount, // Already in pennies
                payment_date: paymentDate,
                payment_method: payment['Payment Method'].toLowerCase().replace(' ', '_'),
                payment_status: payment.Status.toLowerCase(),
                description: payment.Description,
                payment_type: 'membership',
                created_at: new Date().toISOString()
              });

            if (error) {
              console.error(`❌ Error importing payment for ${payment['Client Name']}:`, error.message);
              errorCount++;
            } else {
              console.log(`✅ Imported payment: ${payment['Client Name']} - £${payment.Amount} on ${payment.Date}`);
              successCount++;
            }

          } catch (error) {
            console.error(`❌ Error processing payment for ${payment['Client Name']}:`, error.message);
            errorCount++;
          }
        }

        console.log('\n📊 Payment Import Summary:');
        console.log(`   ✅ Success: ${successCount}`);
        console.log(`   ⏭️ Skipped: ${skippedCount}`);
        console.log(`   ❌ Errors: ${errorCount}`);
        console.log(`   📋 Total: ${payments.length}`);

        resolve({ successCount, errorCount, skippedCount });
      })
      .on('error', reject);
  });
}

// Import attendance from CSV
async function importAttendance(filePath) {
  console.log('\n🏋️ Importing Attendance from:', filePath);
  console.log('=' .repeat(60));

  const attendances = [];

  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        attendances.push(row);
      })
      .on('end', async () => {
        console.log(`Found ${attendances.length} attendance records to import\n`);

        let successCount = 0;
        let errorCount = 0;
        let skippedCount = 0;

        for (const attendance of attendances) {
          try {
            // Find client by name and email
            const nameParts = attendance['Client Name'].split(' ');
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(' ');

            // Try to find client
            const { data: client } = await supabase
              .from('clients')
              .select('id')
              .eq('email', attendance.Email)
              .eq('org_id', organizationId)
              .single();

            if (!client) {
              console.log(`⚠️ Client not found: ${attendance['Client Name']} (${attendance.Email})`);
              skippedCount++;
              continue;
            }

            // Check if attendance already exists
            const bookingDate = parseUKDate(attendance.Date);
            const bookingTime = attendance.Time;

            const { data: existingBooking } = await supabase
              .from('class_bookings')
              .select('id')
              .eq('client_id', client.id)
              .eq('booking_date', bookingDate)
              .eq('booking_time', bookingTime)
              .single();

            if (existingBooking) {
              console.log(`⏭️ Attendance already exists: ${attendance['Client Name']} - ${attendance['Class Name']} on ${attendance.Date}`);
              skippedCount++;
              continue;
            }

            // Insert attendance as class booking
            const attendedAt = `${bookingDate}T${bookingTime}:00`;

            const { error } = await supabase
              .from('class_bookings')
              .insert({
                organization_id: organizationId,
                client_id: client.id,
                customer_id: client.id, // Also set customer_id for compatibility
                booking_date: bookingDate,
                booking_time: bookingTime,
                booking_status: 'completed',
                booking_type: 'attendance_import',
                attended_at: attendedAt,
                notes: `${attendance['Class Name']} - ${attendance.Instructor}`,
                payment_status: 'succeeded',
                created_at: new Date().toISOString()
              });

            if (error) {
              console.error(`❌ Error importing attendance for ${attendance['Client Name']}:`, error.message);
              errorCount++;
            } else {
              console.log(`✅ Imported attendance: ${attendance['Client Name']} - ${attendance['Class Name']} on ${attendance.Date}`);
              successCount++;
            }

          } catch (error) {
            console.error(`❌ Error processing attendance for ${attendance['Client Name']}:`, error.message);
            errorCount++;
          }
        }

        console.log('\n🏋️ Attendance Import Summary:');
        console.log(`   ✅ Success: ${successCount}`);
        console.log(`   ⏭️ Skipped: ${skippedCount}`);
        console.log(`   ❌ Errors: ${errorCount}`);
        console.log(`   📋 Total: ${attendances.length}`);

        resolve({ successCount, errorCount, skippedCount });
      })
      .on('error', reject);
  });
}

// Update client statistics after import
async function updateClientStatistics() {
  console.log('\n📈 Updating Client Statistics...');
  console.log('=' .repeat(60));

  // Get all clients
  const { data: clients } = await supabase
    .from('clients')
    .select('id, first_name, last_name')
    .eq('org_id', organizationId);

  if (!clients || clients.length === 0) {
    console.log('No clients found');
    return;
  }

  for (const client of clients) {
    // Calculate lifetime value from payments
    const { data: payments } = await supabase
      .from('payments')
      .select('amount')
      .eq('client_id', client.id);

    const lifetimeValue = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

    // Count total visits from class_bookings
    const { data: bookings } = await supabase
      .from('class_bookings')
      .select('id, booking_date')
      .eq('client_id', client.id)
      .not('attended_at', 'is', null);

    const totalVisits = bookings?.length || 0;
    const lastVisit = bookings && bookings.length > 0
      ? bookings.sort((a, b) => new Date(b.booking_date) - new Date(a.booking_date))[0].booking_date
      : null;

    // Update client record
    const { error } = await supabase
      .from('clients')
      .update({
        lifetime_value: lifetimeValue,
        total_visits: totalVisits,
        last_visit: lastVisit
      })
      .eq('id', client.id);

    if (!error) {
      console.log(`✅ Updated ${client.first_name} ${client.last_name}: £${(lifetimeValue/100).toFixed(2)} lifetime, ${totalVisits} visits`);
    }
  }
}

// Main import function
async function main() {
  console.log('\n🚀 GoTeamUp Data Import Tool');
  console.log('=' .repeat(60));

  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help') {
    console.log('\nUsage:');
    console.log('  node import-goteamup-data.js payments <csv-file>   - Import payments');
    console.log('  node import-goteamup-data.js attendance <csv-file> - Import attendance');
    console.log('  node import-goteamup-data.js all                   - Import sample data');
    console.log('  node import-goteamup-data.js update-stats          - Update client statistics');
    console.log('\nExamples:');
    console.log('  node import-goteamup-data.js payments payments.csv');
    console.log('  node import-goteamup-data.js attendance attendance.csv');
    console.log('  node import-goteamup-data.js all');
    return;
  }

  try {
    switch (command) {
      case 'payments': {
        const csvFile = args[1];
        if (!csvFile) {
          console.error('❌ Please provide a CSV file path');
          return;
        }
        await importPayments(csvFile);
        await updateClientStatistics();
        break;
      }

      case 'attendance': {
        const csvFile = args[1];
        if (!csvFile) {
          console.error('❌ Please provide a CSV file path');
          return;
        }
        await importAttendance(csvFile);
        await updateClientStatistics();
        break;
      }

      case 'all': {
        // Import sample data
        const paymentsFile = path.join(__dirname, '..', 'sample-payments.csv');
        const attendanceFile = path.join(__dirname, '..', 'sample-attendance.csv');

        if (fs.existsSync(paymentsFile)) {
          await importPayments(paymentsFile);
        } else {
          console.log('⚠️ sample-payments.csv not found');
        }

        if (fs.existsSync(attendanceFile)) {
          await importAttendance(attendanceFile);
        } else {
          console.log('⚠️ sample-attendance.csv not found');
        }

        await updateClientStatistics();
        break;
      }

      case 'update-stats': {
        await updateClientStatistics();
        break;
      }

      default:
        console.error(`❌ Unknown command: ${command}`);
        console.log('Run "node import-goteamup-data.js help" for usage');
    }

    console.log('\n✅ Import process completed!');

  } catch (error) {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  }
}

// Run the import
main();