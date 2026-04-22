---
name: feature-navigator
description: >
  Feature navigator skill for SubStack RU. Reads feature-roadmap.json and shows
  sprint progress, current work, next recommended features, and blockers.
  Use when deciding what to work on next or checking project status.
  Trigger: "what's next", "next feature", "sprint status", "what should I work on".
version: "1.0"
maturity: production
---

# Feature Navigator: SubStack RU

## Protocol

When invoked, read `.claude/feature-roadmap.json` and present the feature landscape.

## Reading the Roadmap

```
read() .claude/feature-roadmap.json
```

Extract:
- `current_sprint` — active sprint name
- `features` — array of feature objects with `id`, `status`, `priority`, `depends_on`

## Priority Rules

Features are surfaced in this order:

1. **`in_progress`** — Show first. Never abandon in-progress work without explicit instruction.
2. **`next`** — Show as immediate candidates. Verify `depends_on` are `done` before recommending.
3. **`planned`** — Show filtered: only those whose all `depends_on` are `done` or `in_progress`.
4. **`blocked`** — Show with the blocker identified.
5. **`done`** — Show count only.

## Dependency Validation

Before recommending a feature, check its `depends_on` array:
- All listed `depends_on` must be `done` for the feature to be recommended as "ready"
- If a `depends_on` is `in_progress`, mark the feature as "ready soon"
- If a `depends_on` is `planned` or `blocked`, mark the feature as "blocked"

## Output Format

```
═══════════════════════════════════════════════════════
  SubStack RU — Sprint: [current_sprint]
═══════════════════════════════════════════════════════

IN PROGRESS
  [feature-id] — [feature name]
    → [brief description of what's happening]

READY TO START (depends_on satisfied)
  1. [feature-id] — [feature name] ([priority])
  2. [feature-id] — [feature name] ([priority])
  3. [feature-id] — [feature name] ([priority])

WAITING ON DEPENDENCIES
  [feature-id] — waiting for: [depends_on list]

BLOCKED
  [feature-id] — blocked by: [reason]

DONE THIS SPRINT ([N] features)
  ✓ [feature-id], ✓ [feature-id], ...

───────────────────────────────────────────────────────
TOP 3 SUGGESTED ACTIONS:
  1. [Specific recommendation with rationale]
  2. [Specific recommendation with rationale]
  3. [Specific recommendation with rationale]
═══════════════════════════════════════════════════════
```

## Suggestion Logic

Generate top 3 suggestions based on:

1. **Unblock chain:** If completing feature X unblocks 2+ other features, prioritize X
2. **MoSCoW Must first:** `must` priority features before `should` and `could`
3. **Shortest path to revenue:** Features on the path to `paid-subscriptions` → `author-payouts`
   get a +1 priority boost (these are the core monetization chain)

## SubStack RU Feature Dependency Map

For reference (also stored in roadmap.json):

```
auth-registration ──────────────────────┬──→ paid-subscriptions ──→ author-payouts
                                        │                        ──→ recommendation-engine ──→ referral-program
                                        │                        ──→ micro-tipping
                                        └──→ csv-export

publication-setup (independent)

article-editor ──→ email-delivery ──→ author-analytics
              └──→ yandex-seo

ai-copilot (independent)
admin-panel (independent)
```

## Status Update

When a feature status changes, update `.claude/feature-roadmap.json`:

```typescript
// Status transitions
planned → next        // sprint planning
next → in_progress    // work started
in_progress → done    // feature complete
any → blocked         // dependency or issue
blocked → next        // blocker resolved
```

After updating status, re-run the navigator to show refreshed state.
