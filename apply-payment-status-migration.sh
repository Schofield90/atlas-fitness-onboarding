#!/bin/bash

# Apply the payment_status column migration

npx supabase db execute --file supabase/migrations/20251006_add_payment_status_column.sql
