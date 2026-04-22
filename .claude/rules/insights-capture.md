# Insights Capture — SubStack RU

## Error-First Lookup Protocol

**BEFORE debugging any error or issue, ALWAYS grep the insights file first.**

```bash
grep -i "[error-keyword]" myinsights/1nsights.md
```

If a match is found:
1. Apply the documented solution
2. Increment the hit counter on that entry: `hits: N → hits: N+1`
3. Note if the solution needed adjustment — update the entry if so

If no match found: debug normally, then consider capturing if the criteria below are met.

## When to Suggest Capturing an Insight

Suggest adding to `myinsights/1nsights.md` when ALL of the following are true:

1. **Non-obvious:** The solution required more than 2 steps or wasn't in official docs
2. **Repeatable:** The same issue could plausibly occur again in this project
3. **Specific:** The insight is specific to SubStack RU's stack (NestJS + Prisma + Resend + CloudPayments, etc.)
4. **Resolved:** The issue is fully solved, not a workaround
5. **Time cost:** Took more than 10 minutes to debug

**Trigger phrase to user:** "This took a while to figure out. Want me to capture this in insights for next time?"

## When NOT to Suggest Capturing

Do NOT suggest capturing when:

1. The issue is trivially documented (first Google result, official docs example)
2. The solution is project-specific one-time setup that won't repeat
3. The error is a typo or obvious syntax mistake
4. The insight would be too generic to be useful (e.g., "restart Docker if containers are stuck")

## Insights Entry Format

```markdown
## [Short Title of Issue]
- **hits:** 1
- **context:** [Where in the codebase this occurs]
- **symptom:** [Exact error message or behavior]
- **root-cause:** [Why it happens]
- **solution:** [Step-by-step fix]
- **prevention:** [How to avoid in future]
- **tags:** [nestjs|prisma|payments|email|auth|docker|nextjs]
```

## SubStack RU Known Insight Categories

Priority tags to watch for capture opportunities:

- `payments` — CloudPayments, SBP, YooKassa webhook edge cases
- `prisma` — migration conflicts, transaction deadlocks, N+1 queries
- `nestjs` — DI circular dependencies, guard execution order, interceptor issues
- `email` — Resend delivery failures, template rendering issues
- `docker` — container networking, volume permission issues on VPS
- `152-fz` — compliance edge cases, data residency gotchas
- `nextjs` — App Router hydration issues, Server/Client Component boundary errors
- `auth` — JWT refresh race conditions, bcrypt performance

## Insights File Location

Primary: `myinsights/1nsights.md`

If the file doesn't exist yet, create it with:
```markdown
# SubStack RU — Dev Insights
> Error-First Lookup: grep this file before debugging

---
```
