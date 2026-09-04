# Task 10 Report: GitHub releases client

## TDD RED

- Added `src/lib/__tests__/github-releases.test.ts` before production code.
- Ran `npm test -- src/lib/__tests__/github-releases.test.ts`.
- Expected failure observed: Vitest could not resolve the not-yet-created `@/lib/github/releases` module (exit code 1).

## TDD GREEN

- Added `src/lib/github/releases.ts` with the exact interfaces from the brief.
- Implemented open pull-request listing, field mapping, Vercel preview URL extraction, list error handling, and pull-request merging through injected `fetchFn`.
- Focused verification: `npm test -- src/lib/__tests__/github-releases.test.ts` — 1 file passed, 5 tests passed.
- Full verification: `npm test` — 47 files passed, 312 tests passed.
- Lint verification: `npm run lint -- src/lib/github/releases.ts src/lib/__tests__/github-releases.test.ts` — exit code 0.
