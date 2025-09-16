# GoTeamUp Data Import Guide

## Overview

This guide explains how to import data from GoTeamUp (or similar gym management systems) into the Atlas Fitness CRM.

## Prerequisites

1. **Export your data from GoTeamUp** in CSV format:
   - Payments/Transactions data
   - Attendance/Class bookings data
   - Member/Client data (should already be imported)

2. **Ensure clients are already imported** - The import script matches payments and attendance to existing clients by email address.

## CSV File Formats

### Payments CSV Format

Your payments CSV should have these columns:

```
Date,Client Name,Email,Amount,Payment Method,Description,Status
```

Example:

```csv
15/01/2025,Sam Schofield,sam@example.com,129.00,Direct Debit,Monthly membership - January,Paid
```

### Attendance CSV Format

Your attendance CSV should have these columns:

```
Date,Time,Client Name,Email,Class Name,Instructor,Status
```

Example:

```csv
01/15/2025,09:00,Sam Schofield,sam@example.com,Morning HIIT,John Smith,attended
```

## Import Process

### 1. Import Payments

```bash
node scripts/import-goteamup-data.js payments your-payments.csv
```

### 2. Import Attendance

```bash
node scripts/import-goteamup-data.js attendance your-attendance.csv
```

### 3. Import Everything (Sample Data)

```bash
node scripts/import-goteamup-data.js all
```

### 4. Update Client Statistics Only

```bash
node scripts/import-goteamup-data.js update-stats
```

## What the Import Does

### For Payments:

- Converts amounts to pennies (£1.00 = 100 pennies)
- Matches clients by email address
- Skips duplicate payments (same client, date, and amount)
- Updates client lifetime value

### For Attendance:

- Creates class_booking records with `attended_at` timestamp
- Matches clients by email address
- Skips duplicate attendance records
- Updates client total visits and last visit date

## Data Mapping

### Payment Fields:

- `Date` → `payment_date` (converted from DD/MM/YYYY to YYYY-MM-DD)
- `Amount` → `amount` (converted to pennies)
- `Payment Method` → `payment_method` (lowercase, spaces replaced with underscores)
- `Status` → `payment_status` (lowercase)
- `Description` → `description`

### Attendance Fields:

- `Date` → `booking_date` (converted from DD/MM/YYYY to YYYY-MM-DD)
- `Time` → `booking_time`
- `Class Name + Instructor` → `notes`
- `Status` → `booking_status` (set to 'completed' for attended)
- Creates `attended_at` timestamp from date + time

## Troubleshooting

### Clients Not Found

If you see "Client not found" warnings:

1. Check that the email addresses match exactly
2. Ensure clients are imported first
3. Verify the organization_id is correct

### Duplicate Records

The import automatically skips duplicates based on:

- Payments: client_id + date + amount
- Attendance: client_id + date + time

### View Imported Data

Check imported data in the CRM:

1. Go to Members section
2. Click on any client profile
3. Check "Payments" tab for payment history
4. Check "Class Bookings" tab for attendance history

## Sample Files

Sample CSV files are provided for testing:

- `sample-payments.csv` - Example payment data
- `sample-attendance.csv` - Example attendance data

Run `node scripts/import-goteamup-data.js all` to import sample data.

## Support

For issues or questions:

1. Check the console output for specific error messages
2. Verify CSV format matches the expected structure
3. Ensure all clients exist in the system before importing their data
