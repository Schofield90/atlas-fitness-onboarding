### Facebook Lead Forms → CRM Field Mapping: Deploy Checklist

- Apply migration in Supabase: `20250904075315_facebook_field_mappings_complete.sql`
  - Use Supabase SQL editor or CLI. Ensure `facebook_lead_forms.questions`, `field_mappings`, and `custom_field_mappings` exist.
- In the app: Settings → Facebook → open the gear icon for a form.
  - Click “Load Form Fields from Facebook” to fetch and persist `questions`.
  - Map fields in “Standard Field Mappings” and save.
- Test end-to-end:
  - Submit a test lead in the Facebook form.
  - Verify the lead appears in CRM with email/phone/name populated per mappings.

Notes
- Runtime guards will auto-attempt to refresh form structure if `questions` is missing and log `FB_MAP` warnings.
- All code paths now use `questions` (no `form_questions`).
- If you see a migration error in API responses, apply the migration and retry.

