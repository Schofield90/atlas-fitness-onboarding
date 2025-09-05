# Design Consistency Checklist

Use this checklist in PRs and QA passes to ensure production-ready polish. Keep it pragmatic: if an item doesn’t apply, mark N/A.

## 1) Defaults & Placeholders
- [ ] All selects have meaningful defaults (not "Select Option").
- [ ] Inputs have helpful placeholder examples that reflect real data.
- [ ] Date/time pickers prefill sensible ranges (e.g., last 7 days).
- [ ] Empty states provide guidance and at least one primary action.
- [ ] Form resets restore defaults consistently.

## 2) Responsive Design
- [ ] Tables are scrollable or stacked on small screens (≤ 640px).
- [ ] Modals fit the viewport on mobile: max-height with internal scroll; no horizontal scroll.
- [ ] Typography scales with breakpoints; line length remains readable (~45–75 chars).
- [ ] Interactive targets respect minimum size (44×44 px on touch).
- [ ] Layouts use fluid containers and avoid fixed widths that cause overflow.

## 3) Button Spacing & Alignment
- [ ] Consistent 8-pt spacing system (4/8/12/16/24/32, etc.).
- [ ] Button groups align to grid; equal spacing between siblings.
- [ ] Primary action is visually distinct and placed consistently (e.g., right side in modals).
- [ ] Icon buttons align text baselines; icon+label have 8px gap.
- [ ] Disabled, hover, focus, active states are implemented and consistent.

## 4) Loading States
- [ ] Lists/tables use skeletons; detail views use spinners or skeleton blocks.
- [ ] Avoid layout shift: reserve space equal to loaded content.
- [ ] Buttons show inline loading (spinner + disabled) on async actions.
- [ ] Retry and error states are present with clear messaging.
- [ ] Perceived performance: show something within 100–200ms.

## 5) Internationalization (i18n)
- [ ] All user-facing strings moved to translation files.
- [ ] No concatenated strings for sentences; use interpolation tokens.
- [ ] Date, number, and currency formatting localized.
- [ ] Text expands gracefully (±30%); check German/Spanish as proxies.
- [ ] RTL readiness verified where applicable (mirrored layouts, icons).

## 6) Accessibility (bonus but recommended)
- [ ] Keyboard navigable: focus order makes sense; no traps.
- [ ] Visible focus styles meet contrast; outlines not removed without replacement.
- [ ] Semantic roles/labels for interactive elements and inputs.
- [ ] Color contrast ≥ 4.5:1 for text; ≥ 3:1 for large text and UI components.
- [ ] Motion and animations respect reduced motion settings.

## 7) Visual Consistency
- [ ] Use tokenized colors, spacing, typography—no hardcoded values.
- [ ] Component variants match design system (sizes, radii, shadows).
- [ ] Consistent border radii and dividers (1px, theme color).
- [ ] Error/success/warning states use consistent colors and icons.
- [ ] Avatars, badges, chips share spacing and size scale.

## 8) Content & Microcopy
- [ ] Buttons use action verbs; avoid jargon.
- [ ] Titles are sentence case (or chosen house style) consistently.
- [ ] Helper text clarifies, not repeats labels; error text is actionable.
- [ ] Empty states set expectations and next steps.
- [ ] Tooltips explain abbreviations and edge-case behavior.

## 9) Performance & Network UX
- [ ] Debounce search inputs; optimistic UI where safe.
- [ ] Prefetch critical data/routes where appropriate.
- [ ] Split heavy modals/pages; lazy-load non-critical assets.
- [ ] Cache policies prevent refetch thrashing; show last-updated times.
- [ ] Avoid blocking toasts/snackbars; use non-intrusive confirmations.

---

How to use
- For each PR, paste this checklist into the description and check the relevant items.
- If an item is N/A, add a quick note why (keeps review focused).
- For regressions, link to a screenshot or recording before/after.