## Description

<!-- What changed and why? Keep it concise. -->

## Type of Change

<!-- Mark relevant options with an "x" -->

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Refactoring (no functional changes)

## Checklist

<!-- Mark completed items with an "x" -->

### Code Quality

- [ ] **Solution works** - The code solves the problem/implements the feature as intended
- [ ] **Minimal changes** - PR is scoped to one issue/feature (no unrelated modifications)
- [ ] **No lint/type errors** - Code passes `npm run typecheck` and `npm run lint`

### Testing

- [ ] **Tests added/updated** - Unit tests and/or E2E tests cover the changes
- [ ] **All tests passing** - `npm test` and `npm run test:e2e` succeed
- [ ] **Coverage maintained** - New code has adequate test coverage

### Security & Performance

- [ ] **No secrets in code** - API keys, passwords, tokens are in env vars only
- [ ] **Auth respected** - All new routes/APIs have proper authentication
- [ ] **Inputs validated** - User inputs are sanitized and validated
- [ ] **No performance issues** - No O(n²+) algorithms, N+1 queries, or memory leaks

### UI/UX (if applicable)

- [ ] **Accessibility** - WCAG 2.1 AA standards met (labels, contrast, keyboard nav)
- [ ] **Responsive design** - Works on mobile and desktop
- [ ] **Loading states** - Proper loading indicators and error handling
- [ ] **User feedback** - Success/error messages are clear

### Documentation

- [ ] **Code commented** - Complex logic has explanatory comments
- [ ] **Docs updated** - README/API docs updated if needed
- [ ] **CHANGELOG entry** - Added entry if user-facing change

## Testing Instructions

<!-- How did you test these changes? -->

1.
2.
3.

## Risks & Follow-ups

<!-- Any known issues, risks, or required follow-up work? -->

-

## Screenshots/Videos

<!-- If UI changes, include before/after screenshots -->

## AI Review Status

<!-- If you used Cursor AI agents, note their findings -->

- [ ] Bug Hunt passed
- [ ] Code Review passed
- [ ] Security Review passed

<!--
Before requesting review:
1. Run: npm run typecheck && npm run lint && npm test
2. Use Cursor: /code-review
3. Address any critical issues found
-->
