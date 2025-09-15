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
  console.log('⚠️  Usage: node import-attendance-csv.js <csv-file>');
  console.log('\nExpected CSV columns (flexible - will try to match):');
  console.log('  - Date/Class Date/Attendance Date');
  console.log('  - Time/Class Time/Start Time');
  console.log('  - Client Name/Member Name/Full Name/Name');
  console.log('  - Email (optional)');
  console.log('  - Class Name/Class Type/Activity (optional)');
  console.log('  - Status/Attendance Status (optional)');
  console.log('  - Instructor (optional)');
  console.log('\nExample: node import-attendance-csv.js attendance_data.csv');
  process.exit(1);
}

if (!fs.existsSync(csvFile)) {
  console.error(`❌ Error: File "${csvFile}" not found`);
  process.exit(1);
}

async function importAttendance() {
  console.log('🚀 Starting attendance data import...\n');
  console.log(`📄 Reading file: ${csvFile}\n`);

  try {
    // 1. Load all clients for matching
    console.log('1. Loading existing clients...');
    const { data: clients } = await supabase
      .from('clients')
      .select('id, name, first_name, last_name, email')
      .eq('organization_id', organizationId);

    // Create lookup maps for client matching
    const clientByName = new Map();
    const clientByEmail = new Map();
    
    clients?.forEach(client => {
      // Match by full name
      clientByName.set(client.name.toLowerCase(), client.id);
      
      // Also try first + last name combination
      if (client.first_name && client.last_name) {
        const fullName = `${client.first_name} ${client.last_name}`.toLowerCase();
        clientByName.set(fullName, client.id);
      }
      
      // Match by email if available
      if (client.email) {
        clientByEmail.set(client.email.toLowerCase(), client.id);
      }
    });

    console.log(`Loaded ${clients?.length || 0} clients for matching`);

    // 2. Parse CSV and collect attendance records
    console.log('\n2. Parsing CSV file...');
    const attendanceRecords = [];
    
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvFile)
        .pipe(csv())
        .on('data', (row) => {
          // Try to extract data from various possible column names
          const record = {
            date: row['Date'] || row['Class Date'] || row['Attendance Date'] || row['date'] || '',
            time: row['Time'] || row['Class Time'] || row['Start Time'] || row['time'] || '',
            clientName: row['Client Name'] || row['Member Name'] || row['Full Name'] || row['Name'] || row['client'] || '',
            email: row['Email'] || row['email'] || row['Email Address'] || '',
            className: row['Class Name'] || row['Class Type'] || row['Activity'] || row['class'] || 'General Class',
            instructor: row['Instructor'] || row['Coach'] || row['Trainer'] || '',
            status: row['Status'] || row['Attendance Status'] || row['status'] || 'attended',
            originalData: row
          };
          
          if (record.clientName && record.date) {
            attendanceRecords.push(record);
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    console.log(`Parsed ${attendanceRecords.length} attendance records`);

    // 3. Show sample of parsed data
    if (attendanceRecords.length > 0) {
      console.log('\nSample parsed records:');
      attendanceRecords.slice(0, 3).forEach((record, i) => {
        console.log(`  ${i + 1}. ${record.clientName} - ${record.date} ${record.time} - ${record.className}`);
      });
    }

    // 4. Process attendance records
    console.log('\n3. Processing attendance records...');
    let processed = 0;
    let matched = 0;
    let created = 0;
    let failed = 0;
    const unmatchedClients = new Set();
    const errors = new Map();

    for (const record of attendanceRecords) {
      try {
        // Try to match client
        let clientId = null;
        
        // First try email if available
        if (record.email) {
          clientId = clientByEmail.get(record.email.toLowerCase());
        }
        
        // If no match by email, try name
        if (!clientId) {
          clientId = clientByName.get(record.clientName.toLowerCase());
        }
        
        if (!clientId) {
          unmatchedClients.add(record.clientName);
          failed++;
          continue;
        }

        matched++;

        // Parse date and time
        let attendanceDate = record.date;
        let attendanceTime = record.time;
        
        // Try to parse date in various formats
        if (attendanceDate.includes('/')) {
          // Handle MM/DD/YYYY or DD/MM/YYYY
          const parts = attendanceDate.split('/');
          if (parts.length === 3) {
            // Assume MM/DD/YYYY for now (can be adjusted)
            const month = parts[0].padStart(2, '0');
            const day = parts[1].padStart(2, '0');
            const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
            attendanceDate = `${year}-${month}-${day}`;
          }
        }
        
        // Combine date and time for attended_at timestamp
        let attendedAt = attendanceDate;
        if (attendanceTime) {
          // Ensure time is in HH:MM format
          if (attendanceTime.match(/^\d{1,2}:\d{2}/)) {
            attendedAt = `${attendanceDate}T${attendanceTime}:00`;
          } else {
            attendedAt = `${attendanceDate}T12:00:00`; // Default to noon if time format unclear
          }
        } else {
          attendedAt = `${attendanceDate}T12:00:00`;
        }

        // Create attendance record in class_bookings table
        const bookingData = {
          organization_id: organizationId,
          client_id: clientId,
          booking_status: 'completed',
          payment_status: 'succeeded',
          booking_type: 'attendance_import',
          amount: 0,
          notes: `Imported attendance: ${record.className}${record.instructor ? ` (Instructor: ${record.instructor})` : ''}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          booked_at: attendedAt,
          attended_at: attendedAt,
          booking_date: attendanceDate,
          booking_time: attendanceTime || '12:00'
        };

        // Check if this attendance record already exists
        const { data: existing } = await supabase
          .from('class_bookings')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('client_id', clientId)
          .eq('booking_date', attendanceDate)
          .eq('booking_type', 'attendance_import')
          .single();

        if (!existing) {
          const { error: insertError } = await supabase
            .from('class_bookings')
            .insert(bookingData);

          if (insertError) {
            throw insertError;
          }
          created++;
          
          if (created <= 10 || created % 50 === 0) {
            console.log(`  ✓ Imported: ${record.clientName} - ${attendanceDate} - ${record.className}`);
          }
        }
      } catch (error) {
        failed++;
        const errorMsg = error.message.substring(0, 50);
        errors.set(errorMsg, (errors.get(errorMsg) || 0) + 1);
      }
      
      processed++;
      if (processed % 100 === 0) {
        console.log(`  ... Processed ${processed}/${attendanceRecords.length} records`);
      }
    }

    // 5. Show results
    console.log('\n' + '='.repeat(50));
    console.log('✅ ATTENDANCE IMPORT COMPLETE!');
    console.log('='.repeat(50));
    console.log(`📄 Total records in CSV: ${attendanceRecords.length}`);
    console.log(`✅ Matched to clients: ${matched}`);
    console.log(`➕ Created new attendance records: ${created}`);
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
    }

    if (errors.size > 0) {
      console.log('\n⚠️  Error summary:');
      errors.forEach((count, error) => {
        console.log(`  - ${error}... (${count} times)`);
      });
    }

    // 6. Show attendance summary for a few clients
    if (created > 0) {
      console.log('\n📊 Client attendance summary (top 5):');
      const { data: topClients } = await supabase
        .from('class_bookings')
        .select('client_id, clients!class_bookings_client_id_fkey(name)')
        .eq('organization_id', organizationId)
        .eq('booking_type', 'attendance_import')
        .not('attended_at', 'is', null);

      // Count attendance per client
      const attendanceCounts = {};
      topClients?.forEach(booking => {
        const clientName = booking.clients?.name || 'Unknown';
        attendanceCounts[clientName] = (attendanceCounts[clientName] || 0) + 1;
      });

      // Sort and show top 5
      const sorted = Object.entries(attendanceCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      sorted.forEach(([name, count]) => {
        console.log(`  ${name}: ${count} attendances`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

importAttendance();