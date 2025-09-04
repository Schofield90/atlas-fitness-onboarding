# Comprehensive Code Review

Perform a thorough review of the pull request changes using this checklist.

## Review Checklist

### ✅ Functionality
- [ ] Code solves the stated problem
- [ ] Meets acceptance criteria
- [ ] No regressions introduced
- [ ] Edge cases handled

### 📏 Minimalism
- [ ] Changes are scoped to one issue/feature
- [ ] No unrelated modifications
- [ ] No unnecessary refactoring
- [ ] Diff is as small as possible

### 🧪 Testing
- [ ] Unit tests added/updated
- [ ] E2E tests cover user flows
- [ ] Tests are passing in CI
- [ ] Test coverage adequate for changes

### 🎨 UI & Accessibility (if frontend)
- [ ] Components meet WCAG 2.1 AA standards
- [ ] Proper labels and alt text
- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] Error messages clear and actionable
- [ ] Loading states announced to screen readers

### ⚡ Performance
- [ ] No N+1 queries
- [ ] No unnecessary re-renders
- [ ] Efficient algorithms used
- [ ] Bundle size impact acceptable
- [ ] Database queries optimized

### 🔒 Security
- [ ] No secrets or API keys in code
- [ ] Authentication/authorization correct
- [ ] Input validation thorough
- [ ] SQL injection prevented
- [ ] XSS vulnerabilities addressed
- [ ] Multi-tenant isolation maintained

### 📝 Documentation
- [ ] Complex logic commented
- [ ] README updated if needed
- [ ] API documentation current
- [ ] CHANGELOG entry added

## Output Format

For each section with issues:

**[Section Name]**
- ❌ [Specific issue found]
  - File: `path/to/file.ts:123`
  - Suggestion: [How to fix]

For sections that pass:
- ✅ [Section Name]: No issues found

## Additional Notes
- Reference specific line numbers
- Provide actionable suggestions
- Focus on correctness over style
- Consider maintainability impact