# Git Workflow — SubStack RU

## Commit Message Format

```
type(scope): description
```

**Description:** imperative mood, lowercase, no period, max 72 characters.

## Commit Types

| Type | When to Use |
|------|------------|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `refactor` | Code restructure without behavior change |
| `test` | Adding or updating tests |
| `docs` | Documentation changes |
| `chore` | Build, config, dependency updates |

## Scopes (SubStack RU)

| Scope | Area |
|-------|------|
| `auth` | Authentication, registration, JWT |
| `articles` | Article editor, publishing |
| `email` | Resend integration, email delivery |
| `payments` | CloudPayments, SBP, YooKassa |
| `subscriptions` | Paid subscription management |
| `analytics` | Author analytics, metrics |
| `seo` | Yandex SEO, meta tags |
| `admin` | Admin panel |
| `infra` | Docker, CI/CD, deployment |
| `db` | Prisma schema, migrations |
| `api` | General API changes |
| `ui` | Frontend components |

## Commit Discipline

### DO
- Commit after each logical, self-contained change
- Commit working code (tests pass before committing)
- Push frequently (at minimum end of each session)
- Reference feature ID in body when relevant: `Refs: auth-registration`

### DO NOT
- Combine unrelated changes in one commit
- Commit broken code to main
- Use vague messages like "fix stuff", "wip", "updates"
- Commit secrets, `.env` files, or API keys

## Examples

```
feat(auth): add email verification on registration
fix(payments): correct CloudPayments HMAC signature validation
refactor(articles): extract slug generation to utility function
test(email): add Resend delivery mock for unit tests
docs(api): update subscription endpoint documentation
chore(infra): upgrade PostgreSQL image to 16.2
db(subscriptions): add paid_until field to subscribers table
```

## Branch Strategy

- `main` — production-ready code, always deployable
- `feat/[feature-name]` — feature branches
- `fix/[issue-description]` — bug fix branches
- `chore/[task]` — maintenance branches

## Merge Rules

- Squash merge for feature branches (clean history on main)
- Direct push to main only for hotfixes and chore commits
- PR required for all feat/ branches (self-review acceptable at MVP stage)
