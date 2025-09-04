## Facebook Field Mappings Migration

If Facebook lead-form field mapping or integration pages do not load or show no fields, ensure the following migration has been applied to your Supabase project:

- `supabase/migrations/20250904075315_facebook_field_mappings_complete.sql`

This migration adds the `questions`, `field_mappings`, and `custom_field_mappings` columns and related indexes, views, and functions.

To apply all migrations locally:

```bash
supabase db reset --project-id <your-project-id>
# or
supabase db push
```

In CI/production, run your deployment workflow or use the provided helper script:

```bash
node scripts/apply-migrations-via-api.js
```

Ensure your `facebook_lead_forms` table contains the `questions` column. If not, re-run the migration.
