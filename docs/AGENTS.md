# Multi-agent dev workflow

This project's primary contributor is David Smereski, augmented by Claude (Opus 4.x + Sonnet 4.x). The workflow below treats the LLMs as a small team: opus plans + reviews, sonnet codes.

## Roles

- **Opus (planner)** — drafts implementation plans, decomposes specs into bite-sized tasks, picks the architecture for a sub-phase.
- **Sonnet (coder)** — executes plans task-by-task. Writes the code + tests called for in each step. Does not invent new design.
- **Opus (reviewer)** — reviews sonnet's PRs before merge. Reads the diff against the plan, flags drift, asks for fixes.

The human (David) is in the loop at:
1. Plan approval (before code lands).
2. Mid-implementation steering (when sonnet hits an unexpected blocker).
3. PR review (with opus reviewer's notes in hand).
4. Final merge + deploy.

## Per sub-phase loop

1. **Spec.** A program-level spec section identifies the sub-phase boundary (e.g., "Phase 1: platform skeleton"). Lives at `docs/superpowers/specs/*.md`.
2. **Plan.** Invoke `superpowers:brainstorming` and `superpowers:writing-plans` (opus). Output: a plan at `docs/superpowers/plans/<date>-<phase>.md`. David approves.
3. **Worktree.** `git worktree add ../platform-<phase> -b feat/<phase>` to isolate sub-phase work.
4. **Execute.** Sonnet runs `superpowers:executing-plans` (inline) or `superpowers:subagent-driven-development` (spawned). One task at a time. Commits after each task per the plan.
5. **Review.** When all tasks complete, opus reviewer runs `code-review` or a manual review pass. Findings flagged inline. Sonnet fixes them as new commits in the same branch.
6. **Smoke.** David smoke-tests against the staging deploy.
7. **Merge.** Squash-merge or merge-with-history depending on commit hygiene. Push to main. Auto-deploy to staging.
8. **Manual prod cut.** Once green on staging, David promotes to prod (Cloudflare DNS does not change; tag the image, update `docker-compose.yml`, `docker compose pull && docker compose up -d`).

## Branch hygiene

- Each sub-phase has one branch: `feat/<sub-phase-slug>`.
- Commits in that branch may include sonnet-authored work + opus-reviewer fix commits + human edits.
- Branch is merged or rebased onto main only after CI is green and opus reviewer signs off.
- No work on main directly except hot-fixes.

## Worktrees

Worktrees keep agents from stepping on each other when multiple sub-phases run in parallel:

```
C:\Projects\platform\          (main)
C:\Projects\platform-3a\       (Phase 3 sub-phase a: forums)
C:\Projects\platform-3b\       (Phase 3 sub-phase b: members + ranks)
C:\Projects\platform-4\        (Phase 4: marketing site)
```

Sonnet operating in `platform-3a` cannot accidentally edit `platform-3b` files. Each worktree has its own running dev server on its own port.

## Reviewer checklist (opus)

For each PR:

- [ ] Diff matches the plan task-by-task (no scope drift).
- [ ] Tests cover the changes (unit + integration where applicable).
- [ ] Multi-tenant code uses `db(ctx).*` — no direct prisma calls.
- [ ] Feature flag enforcement is in place for new routes.
- [ ] Permissions calls correct tier.
- [ ] No secrets committed.
- [ ] No `--no-verify` commits.
- [ ] No dead code or commented-out blocks.
- [ ] Imports clean, no unused.
- [ ] Commit messages follow `feat:`, `fix:`, `test:`, `docs:`, etc.

## When sonnet is blocked

- Sonnet should NOT invent new design. If a plan step is ambiguous, sonnet pauses and asks David.
- If sonnet discovers the plan is wrong (e.g., a referenced function doesn't exist), sonnet flags it, David re-invokes the planner if needed.

## When to bypass this workflow

- One-line bug fixes — David can hand-edit + commit directly.
- Documentation typos — same.
- Emergency hot-fixes — direct to main, retroactively brought into the next plan if pattern emerges.

## Phase 0 retrospective (lessons baked in)

Phase 0 execution surfaced concrete gotchas worth carrying forward:

- **Pin major dep versions in the plan.** `prisma init` pulled Prisma 7 (breaking) when the plan assumed 6; an implementer adapted to v7 and drifted (URL moved to `prisma.config.ts`, client emitted into `app/generated/`). Fix was to pin `prisma@6`. Always `pnpm add <pkg>@<major>` for load-bearing deps.
- **Confine test-env workarounds to tests.** Vitest 4 can't `new` an arrow-function mock, and `lib/db.ts` constructs `new PrismaClient()` eagerly at module load — so the mock factory runs during the hoisted import (TDZ). The right fix is `vi.hoisted()` + a `new`-safe constructor mock in the TEST, never a try/catch shim or lazy-init in production `db.ts`.
- **Live-test the integration capstone.** Build/typecheck/unit-tests all passed while a tenant-render assertion looked broken — but the chain (middleware → request header → server component → DB → config → render) actually worked; the test assertion was wrong. Drive a real request before declaring an integration done.
- **`workflow` scope.** Pushing `.github/workflows/*` needs a gh token with `workflow` scope, not just `repo`. Re-auth with `gh auth refresh -h github.com -s workflow` before the first CI push.
- **pnpm 11 lockfile.** The Dockerfile must pin the same pnpm major that wrote `pnpm-lock.yaml` (11.x), or `--frozen-lockfile` fails to read it.
