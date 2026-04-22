# Feature Lifecycle — SubStack RU

## 4-Phase Protocol

Every feature follows this sequence without exception:

```
/feature → PLAN → VALIDATE → IMPLEMENT → REVIEW
```

---

## Phase 1: PLAN

**Trigger:** `/feature [feature-name]`

**Actions:**
1. Read `docs/Specification.md` for the feature's user stories and acceptance criteria
2. Read `docs/PRD.md` for MoSCoW priority and product context
3. Read `docs/Pseudocode.md` for relevant algorithm structures
4. Check `.claude/feature-roadmap.json` for dependencies and current status
5. Create implementation plan at `docs/plans/[feature-name]-plan.md`

**Output:** Implementation plan with steps, acceptance criteria checklist, risk table.

**Gate:** Plan must be reviewed before proceeding. Do not start implementation without a plan.

---

## Phase 2: VALIDATE

**Actions:**
1. Score the plan against Specification.md acceptance criteria
2. Check Architecture.md for constraint violations
3. Verify 152-FZ compliance for any PII-touching features
4. Minimum validation score: **70/100**

**Scoring dimensions:**
- Acceptance criteria coverage (0–30 pts)
- Architecture alignment (0–25 pts)
- Security requirements met (0–25 pts)
- 152-FZ compliance (0–20 pts)

**Gate:** Score < 70 → return to PLAN phase with specific gaps identified.
Score ≥ 70 → proceed to IMPLEMENT.

**Commit docs before implementation:**
```
docs([feature-name]): add implementation plan and validation
```

---

## Phase 3: IMPLEMENT

**Actions:**
1. Follow implementation plan steps in order
2. Write tests alongside implementation (not after)
3. Commit after each logical sub-step
4. Update `feature-roadmap.json` status to `in_progress`

**Commit pattern during implementation:**
```
feat([scope]): [specific change]
test([scope]): [what is tested]
```

**Do not:**
- Skip tests for "speed"
- Implement out of order (respect `depends_on` in roadmap)
- Leave TODO comments without a linked task

---

## Phase 4: REVIEW

**Actions:**
1. Run code-reviewer agent against all changed files
2. Fix all Critical Issues
3. Address Warnings (or document why not)
4. Update `feature-roadmap.json` status to `done`
5. Final commit:

```
feat([scope]): complete [feature-name] implementation
```

---

## SPARC Documentation Requirement

All features get SPARC documentation before implementation:

| Doc | Location | Required For |
|-----|----------|-------------|
| Specification (user stories) | `docs/Specification.md` | All features |
| Pseudocode (algorithms) | `docs/Pseudocode.md` | Complex logic |
| Architecture notes | `docs/Architecture.md` | New modules/services |

If a feature is not in the existing SPARC docs, add it before starting PLAN phase.

---

## Feature Status Transitions

```
planned → next → in_progress → done
                      ↓
                  blocked
```

Update `.claude/feature-roadmap.json` at each transition.
