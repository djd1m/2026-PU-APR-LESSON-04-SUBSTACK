---
description: Lightweight implementation planning. Saves plan to docs/plans/ with
  auto-commit via Stop hook. Use for tasks too small for full /feature lifecycle
  but complex enough to need a written plan.
  $ARGUMENTS: task name or brief description
---

# /plan $ARGUMENTS

## Purpose

Create a lightweight implementation plan for a specific task. Saves to `docs/plans/`
so it persists across sessions and auto-commits on session end.

> **USE THIS WHEN:** Task is clear, touches ≤5 files, no new API contracts, < 2 hours.
> **USE /feature WHEN:** New endpoint, new DB entity, new user-facing feature, or > 2 hours.

## Step 1: Clarify Task

If `$ARGUMENTS` is vague, ask 2-3 focused questions before planning:
- What is the exact goal?
- What files/modules are involved?
- Are there any constraints or dependencies?

## Step 2: Generate Plan

Create plan file: `docs/plans/<task-slug>.md`

Use this template:

```markdown
# Plan: <Task Name>

**Date:** YYYY-MM-DD
**Status:** 🟡 In Progress
**Estimated time:** X hours

## Goal

[One paragraph: what will be built/fixed/changed and why]

## Tasks

- [ ] Task 1 — [brief description]
  - Files: `src/path/to/file.ts`
- [ ] Task 2 — [brief description]
  - Files: `apps/api/src/module/service.ts`
- [ ] Task 3 — [brief description]
- [ ] Write/update tests
- [ ] Update documentation if needed

## Files Involved

| File | Action | Notes |
|------|--------|-------|
| `apps/api/src/...` | Create / Modify / Delete | [what changes] |
| `apps/web/src/...` | Create / Modify / Delete | [what changes] |
| `packages/shared/...` | Create / Modify / Delete | [what changes] |

## Dependencies

- [ ] Dependency 1 (library, service, feature) — [status]
- [ ] Dependency 2 — [status]
- None (if standalone)

## Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| [Risk description] | Low/Medium/High | [How to handle] |
| Breaking existing functionality | Low | Run full test suite after |

## Implementation Notes

[Optional: key technical decisions, gotchas, references to check]

- Check `myinsights/1nsights.md` for related issues before starting
- Stack context: Next.js App Router + NestJS modules + PostgreSQL + Redis + Resend
```

## Step 3: Review and Confirm

Show the plan to the user:
```
📋 Plan saved: docs/plans/<task-slug>.md

Tasks: N items
Estimated: X hours
Files: N files

Proceed with implementation? (yes/no/modify)
```

## Step 4: Implement (if confirmed)

If user confirms, implement the plan:
1. Read plan from `docs/plans/<task-slug>.md`
2. Check `myinsights/1nsights.md` for relevant existing insights
3. Execute tasks in order, or use Task tool for parallel independent tasks
4. Commit after each logical chunk: `feat/fix/refactor(<scope>): <description>`
5. Update plan task checkboxes as work completes
6. Mark plan as done: update `**Status:**` to `✅ Done`

## Step 5: Notify Completion

```
✅ Plan completed: <task-name>

📄 docs/plans/<task-slug>.md — marked done
💾 Commits: N
🔄 Plan will auto-commit on session end (Stop hook)

💡 If you encountered tricky issues: /myinsights [title]
```

## Notes

- Plans auto-commit via Stop hook — no manual `git add docs/plans/` needed
- Use `@planner` agent for complex multi-step breakdown
- Plans are lightweight — no SPARC docs required
- For features requiring proper API design or DB schema, use `/feature` instead
