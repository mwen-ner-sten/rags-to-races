# Development and Release Workflow

## Purpose

Rags to Races is both a game project and a place to practice web delivery. The
three long-lived environment branches are intentional: they provide stable URLs,
separate browser storage, and repeated experience with integration, acceptance,
and production promotion.

The workflow optimizes for deliberate practice and recoverability rather than the
fewest possible Git operations.

## Environments

| Branch | Role | Expected stability | Deployment |
| --- | --- | --- | --- |
| `dev` | Integration and active gameplay experiments | Runnable, may contain unfinished work | Stable development URL |
| `uat` | Release candidate and deliberate playtesting | Coherent and testable | Stable acceptance URL |
| `main` | Known-good production build | Highest | Production URL |

Pull requests get ephemeral preview deployments in addition to the stable branch
deployments.

## Branches

Normal work branches from `dev`:

- `feature/<slug>` for player-facing additions
- `fix/<slug>` for ordinary fixes
- `chore/<slug>` for maintenance
- `codex/<slug>` for Codex-assisted work

Environment-specific exceptions are deliberately narrow:

- `uat-fix/<slug>` branches from and targets `uat`
- `hotfix/<slug>` branches from and targets `main`

Do not commit directly to `dev`, `uat`, or `main`.

## Merge Methods

Feature integration and environment promotion have different history needs.

| Target | Merge method | Why |
| --- | --- | --- |
| `dev` | Squash | One reviewable integration commit per feature or fix |
| `uat` | Merge commit | Preserve the exact `dev` commits that entered acceptance |
| `main` | Merge commit | Preserve the exact UAT ancestry that reached production |

Do not squash `dev` into `uat` or `uat` into `main`. Squashing the same release at
each gate creates new unrelated commits and makes the branches appear to contain
different work even when their files match.

## Normal Delivery

1. Create a work branch from the latest `dev`.
2. Open a pull request to `dev`.
3. Let CI and the preview deployment complete.
4. Squash-merge the completed slice into `dev`.
5. Test the stable development deployment as needed.
6. Open a release PR from `dev` to `uat`.
7. Merge with a merge commit after CI and the UAT checklist pass.
8. Test the stable UAT deployment with the intended save scenarios.
9. Open a production PR from `uat` to `main`.
10. Merge with a merge commit after the production checklist passes.
11. Verify the production deployment and visible build SHA.

Development does not need a calendar release cadence. A change can remain in
`dev` or `uat` until it represents a coherent, enjoyable release.

## UAT Fixes

When acceptance testing finds a release-specific problem:

1. Branch `uat-fix/<slug>` from `uat`.
2. Fix and validate the smallest safe change.
3. Merge it into `uat` through a PR.
4. Port the same fix to `dev` immediately, normally by cherry-picking the fix
   commit onto a new `fix/<slug>` branch and opening a PR.
5. Continue the normal `uat` to `main` promotion after retesting.

Porting the fix back prevents it from disappearing from the next release.

## Production Hotfixes

Use `hotfix/<slug>` only when production should not wait for a normal promotion.

1. Branch from `main` and open a PR back to `main`.
2. Run the full automated gate and the smallest relevant manual test.
3. Merge and verify production.
4. Port the exact fix to both `uat` and `dev` immediately.

Hotfixes are exceptions, not an alternate feature-delivery path.

## Automated Gate

The required `check` job runs:

- TypeScript type checking
- ESLint
- Vitest
- Next.js production build

The branch rules require this job to pass and require the pull request to be up to
date with its target branch. No approval count is required for this solo project;
the PR, checks, and deployment are the learning checkpoints.

The Promotion Policy workflow permits:

- `dev` or `uat-fix/*` into `uat`
- `uat` or `hotfix/*` into `main`

## Manual Promotion Gate

Every environment promotion records:

- Build/version displayed in the tested deployment
- Stable URL that was tested
- Fresh-save result
- Existing-save or imported-save result
- Relevant desktop and mobile result
- Known issues intentionally accepted

For gameplay changes, the PR also states which player decision, pacing target, or
reward loop changed.

## Rollback Practice

Production rollback is a normal learning exercise:

1. Identify the production merge commit that introduced the regression.
2. Revert it in a `hotfix/revert-<slug>` PR rather than rewriting branch history.
3. Verify the production deployment.
4. Reproduce the correction in `uat` and `dev` so the reverted behavior does not
   return during the next promotion.

Never force-push an environment branch.
