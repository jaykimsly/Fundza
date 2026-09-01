# Fundza V2 Phase 21–22

The original V2 execution plan ends at Phase 20. These two phases extend the plan without changing the frozen application architecture.

## Phase 21: Release Hardening

- Baseline browser security headers enabled in `next.config.ts`.
- Preview deployment must track `develop-v2`.
- Production remains isolated from `develop-v2`.
- CI gates remain lint, typecheck, tests, and build.
- Mobile navigation and overflow protections remain release requirements.
- No provider migration is introduced here.
- No database migration is introduced here unless a verified release defect requires it.

## Phase 22: Launch Readiness

Before declaring Fundza V2 released:

- CI passes on the release commit.
- Vercel Preview deployment is Ready from `develop-v2`.
- Preview smoke test passes on mobile and desktop.
- Authentication and protected routes work.
- Study, Practice, Progress, Exams, Review, Profile and People entry points load.
- No horizontal page overflow on common mobile widths.
- Critical API failures degrade safely.
- Supabase RLS/security checks are verified.
- No secrets are committed to Git.
- Production is promoted only after Preview verification.

## Exit rule

Phase 21 and Phase 22 are not marked complete merely because the repository accepts the commit. CI and a successful Vercel Preview deployment are required evidence for release readiness.
