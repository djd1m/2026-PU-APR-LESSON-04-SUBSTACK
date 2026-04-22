---
description: Show next features to work on from the project roadmap.
  Quick overview of sprint progress and top suggested tasks.
  $ARGUMENTS: optional — "update" to refresh statuses, or feature-id to mark as done
---

# /next $ARGUMENTS

## Default: Show Next Steps

1. Read `.claude/feature-roadmap.json`
2. Show current sprint progress (% complete)
3. List top 3 suggested next tasks based on priority and dependencies
4. Show any blocking issues
5. Ask which task to start

Format as a brief, actionable list.

### Display Format

```
═══════════════════════════════════════════════════════════
📋 SubStack RU — Feature Roadmap
   Sprint: [Sprint Name] — [N/M] complete ([X]%)
═══════════════════════════════════════════════════════════

🔨 In Progress:
   • [Feature Name] — [description]
     Files: [file paths]

⏭️ Top 3 Suggested Next:
   1. [Feature Name] — [brief actionable description]
   2. [Feature Name] — [brief actionable description]
   3. [Feature Name] — [brief actionable description]

🚫 Blocked:
   • [Feature Name] — waiting on: [dependency]

🕐 Recent Work:
   [git log last 3 commits]
═══════════════════════════════════════════════════════════

Which one shall we tackle? (1/2/3 or describe your own)
```

### Priority Rules

- `blocked` items → show but don't suggest (explain what's blocking)
- `in_progress` → suggest continuing (highest priority)
- `next` → suggest starting (second priority)
- `planned` → only suggest if no `next` items remain
- Respect `depends_on` — never suggest a feature whose dependencies aren't `done`

## /next update

Review the current codebase state and conversation history:
1. Check which features appear to be implemented (scan for key files/modules)
2. Scan `apps/`, `packages/`, `src/` for implemented functionality
3. Suggest status updates for features that may be done
4. Present proposed changes:
   ```
   Proposed status updates:
   • [feature-id]: planned → next (dependency [other-id] is now done)
   • [feature-id]: in_progress → done (implementation detected in src/)

   Apply these updates? (yes/no/select)
   ```
5. Apply updates after user confirmation
6. Show updated roadmap state

## /next [feature-id]

Mark a specific feature as done:
1. Update status to `"done"` in `.claude/feature-roadmap.json`
2. Check if this unblocks any dependent features → update those to `"next"`
3. Show updated sprint progress
4. Suggest the next feature to work on

```
✅ [feature-id] marked as done.
🔓 Unblocked: [dependent-feature] is now "next"

Sprint progress: [N/M] ([X]%) — was [X-1]%

Suggested next: [feature-name] — [description]
Start with /feature [feature-name] or /go [feature-name]?
```

## Notes

- Roadmap data lives in `.claude/feature-roadmap.json`
- Roadmap auto-commits on session end via Stop hook
- For full interactive roadmap view: ask "show me the full roadmap"
- To implement the next task: `/go` (auto-selects pipeline) or `/feature [name]`
