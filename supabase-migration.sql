-- Migration to add new fields to employees table for Xero integration
-- Run this in your Supabase SQL editor

ALTER TABLE employees ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS postcode TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS national_insurance_number TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS account_holder_name TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS account_number TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS sort_code TEXT;