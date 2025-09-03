### Summary
What changed and why (link to issue if any).

### Risk / Scope
- DB schema or RLS touched? ☐ No ☐ Yes (describe + tests)
- Payments/Stripe Connect changed? ☐ No ☐ Yes (describe)
- Queue/automation engine semantics changed? ☐ No ☐ Yes
- Public API contracts changed? ☐ No ☐ Yes (list endpoints)

### Tests
- Unit & Integration run locally/in agent: ☐
- Playwright E2E for critical flows (sign-in → create workflow → test mode → messaging → booking): ☐
- New/updated tests for changed code paths: ☐
- Regression test added for any bug fix: ☐

### Security / Privacy
- RLS preserved or updated with tests: ☐
- Webhook/OAuth signatures verified where applicable: ☐
- No secrets logged or committed: ☐

### Performance / UX
- Hot paths assessed (notes if any): ☐
- UI changes include screenshots/GIFs: ☐

### Migrations (if any)
- Up/Down scripts present: ☐
- Rollback plan noted: ☐

### Automation
- Bugbot review requested / addressed: ☐
- CI green: ☐