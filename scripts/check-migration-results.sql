-- Check migration results for your organization
-- Organization ID: 63589490-8f55-4157-bd3a-e141594b748e

-- 1. Check total clients imported
SELECT 
  COUNT(*) as total_clients,
  COUNT(DISTINCT email) as unique_emails,
  MIN(created_at) as first_import,
  MAX(created_at) as last_import
FROM public.clients
WHERE organization_id = '63589490-8f55-4157-bd3a-e141594b748e';

-- 2. Check recent clients (last 10)
SELECT 
  id,
  name,
  email,
  phone,
  source,
  created_at
FROM public.clients
WHERE organization_id = '63589490-8f55-4157-bd3a-e141594b748e'
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check attendance/bookings imported
SELECT 
  COUNT(*) as total_bookings,
  COUNT(DISTINCT client_id) as unique_clients_with_bookings,
  MIN(booking_date) as earliest_booking,
  MAX(booking_date) as latest_booking
FROM public.bookings
WHERE organization_id = '63589490-8f55-4157-bd3a-e141594b748e';

-- 4. Check recent bookings (last 10)
SELECT 
  b.id,
  c.name as client_name,
  b.booking_date,
  b.booking_type,
  b.booking_status,
  b.created_at
FROM public.bookings b
JOIN public.clients c ON b.client_id = c.id
WHERE b.organization_id = '63589490-8f55-4157-bd3a-e141594b748e'
ORDER BY b.created_at DESC
LIMIT 10;

-- 5. Check migration job status
SELECT 
  id,
  source_system,
  status,
  total_records,
  successful_records,
  processed_records,
  failed_records,
  metadata,
  created_at,
  completed_at
FROM public.migration_jobs
WHERE organization_id = '63589490-8f55-4157-bd3a-e141594b748e'
ORDER BY created_at DESC
LIMIT 5;

-- 6. Check migration files uploaded
SELECT 
  mf.id,
  mf.file_name,
  mf.file_type,
  mf.status,
  mf.row_count,
  mf.created_at
FROM public.migration_files mf
JOIN public.migration_jobs mj ON mf.migration_job_id = mj.id
WHERE mj.organization_id = '63589490-8f55-4157-bd3a-e141594b748e'
ORDER BY mf.created_at DESC
LIMIT 10;