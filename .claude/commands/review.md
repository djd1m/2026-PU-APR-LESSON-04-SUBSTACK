---
description: On-demand code review using the code-reviewer agent and brutal-honesty-review skill.
  Scopes: file path, directory, "all" (full codebase), or "staged" (git staged changes).
  $ARGUMENTS: file path | directory path | "all" | "staged"
---

# /review $ARGUMENTS

## Purpose

Trigger a rigorous code review on demand. Uses the `code-reviewer` agent with
`brutal-honesty-review` skill — no sugar-coating, just honest assessment.

> **BLOCKING RULE:** Always use brutal-honesty-review skill — NEVER self-review without it.
> Read: `.claude/skills/brutal-honesty-review/SKILL.md`

## Step 1: Determine Scope

```
IF $ARGUMENTS is a file path (e.g., "apps/api/src/auth/auth.service.ts"):
    scope = "file"
    target = $ARGUMENTS

IF $ARGUMENTS is a directory (e.g., "apps/api/src/newsletter"):
    scope = "directory"
    target = all *.ts files in $ARGUMENTS

IF $ARGUMENTS == "all":
    scope = "full"
    target = entire source codebase (apps/, packages/)

IF $ARGUMENTS == "staged":
    scope = "staged"
    target = `git diff --cached --name-only` output

IF $ARGUMENTS is empty:
    Ask: "What should I review? (file path / directory / 'all' / 'staged')"
```

## Step 2: Load Code Reviewer Agent

```
Read: .claude/agents/code-reviewer.md
Read: .claude/skills/brutal-honesty-review/SKILL.md
```

If agents are not available, proceed with built-in review criteria below.

## Step 3: Gather Files

```bash
# For "staged" scope:
git diff --cached --name-only --diff-filter=ACM

# For "file" scope:
# Read single file

# For "directory" scope:
# Read all .ts, .tsx, .js, .jsx files in target directory

# For "all" scope:
# Read key files from: apps/api/src/, apps/web/src/, packages/
```

## Step 4: Run Review

Use swarm of review agents for comprehensive coverage:

| Agent | Scope | Focus |
|-------|-------|-------|
| code-quality | Source code | Clean code, naming, patterns, complexity |
| architecture | Module structure | NestJS module boundaries, Next.js conventions |
| security | Auth surface, APIs | Input validation, SQL injection, CSRF, Resend key exposure |
| performance | Hot paths | N+1 queries, missing Redis cache, blocking operations |
| testing | Test coverage | Missing tests, untested edge cases, mock quality |

**Run all review agents in parallel** (Task tool).

## Step 5: Apply brutal-honesty-review

For each issue found:
- Classify: CRITICAL / MAJOR / MINOR / SUGGESTION
- Be specific: file, line number, exact problem
- Provide actionable fix — not just "improve this"

## Step 6: Present Findings

```
═══════════════════════════════════════════════════════════
🔍 Code Review: [scope] — [target]
═══════════════════════════════════════════════════════════

🔴 CRITICAL (must fix before merge):
  [file:line] — [issue] → [fix]

🟡 MAJOR (fix soon):
  [file:line] — [issue] → [fix]

🟢 MINOR (nice to have):
  [file:line] — [issue] → [suggestion]

💡 SUGGESTIONS:
  [pattern improvement, refactoring opportunity]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Summary: [N] critical, [N] major, [N] minor, [N] suggestions
Overall: ✅ Approved / ⚠️ Fix before merge / ❌ Major rework needed
═══════════════════════════════════════════════════════════
```

## Step 7: Fix Issues (if requested)

After presenting findings, ask:
```
Fix all critical/major issues now? (yes/no/critical-only)
```

If yes:
1. Fix CRITICAL issues first (use Task tool for parallel fixes)
2. Fix MAJOR issues
3. Commit fixes: `fix(<scope>): code review corrections`
4. Re-review changed files to verify fixes

## Review Criteria for SubStack RU

### NestJS (apps/api)
- [ ] Modules are properly isolated (no circular dependencies)
- [ ] Services are singletons — circuit breakers/rate limiters MUST be singletons
- [ ] DTOs have validation decorators (`class-validator`)
- [ ] Guards applied to protected routes
- [ ] No raw SQL string interpolation — use parameterized queries
- [ ] Resend API key never logged or exposed in responses
- [ ] Redis used for session/cache (not in-memory singletons per request)

### Next.js (apps/web)
- [ ] Server Components vs Client Components split is correct
- [ ] Sensitive data not leaked to client bundle
- [ ] API route handlers validate input
- [ ] `\w` regex patterns checked — use `\p{L}` for Cyrillic support

### General TypeScript
- [ ] No `as any` casting (use `unknown` → proper type)
- [ ] Async error handling (try/catch or `.catch()`)
- [ ] No `Promise<unknown>` left uncast
- [ ] Jest mocks use `mockResolvedValue` not `jest.fn(async () => ...)`

### Security
- [ ] Environment variables used for all secrets
- [ ] Input validation at API boundaries
- [ ] No SQL injection vectors
- [ ] CORS configured appropriately

## Notes

- Check `myinsights/1nsights.md` for known project-specific patterns before reviewing
- Review is non-destructive — no files changed without explicit confirmation
- For automated review during `/feature` lifecycle, Phase 4 runs this automatically
- For quick pre-commit check: `/review staged`
