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

## Review fix: Vercel preview URL punctuation

- Added regression coverage for Markdown links, trailing prose punctuation, and deceptive `.vercel.app.evil.com` hostnames.
- Updated preview extraction to remove trailing Markdown/prose punctuation before parsing while retaining the URL hostname suffix check.
- Preserved injected `fetchFn`; tests perform no live network requests.

### TDD RED

Command:

```text
npx vitest run src/lib/__tests__/github-releases.test.ts
```

Output (exit code 1):

```text
RUN  v4.1.9 C:/Users/akshay/projects/auto-centre

❯ src/lib/__tests__/github-releases.test.ts (8 tests | 2 failed) 71ms
    × strips Markdown link wrapping from a Vercel preview URL 17ms
    × strips trailing prose punctuation from Vercel preview URLs 15ms

FAIL  src/lib/__tests__/github-releases.test.ts > listOpenPullRequests > strips Markdown link wrapping from a Vercel preview URL
AssertionError: expected null to be 'https://demo.vercel.app' // Object.is equality

FAIL  src/lib/__tests__/github-releases.test.ts > listOpenPullRequests > strips trailing prose punctuation from Vercel preview URLs
AssertionError: expected [ Array(2) ] to deeply equal [ 'https://foo.vercel.app', …(1) ]

Test Files  1 failed (1)
     Tests  2 failed | 6 passed (8)
Duration  2.06s
```

### Focused verification

Command:

```text
npx vitest run src/lib/__tests__/github-releases.test.ts
```

Output (exit code 0):

```text
RUN  v4.1.9 C:/Users/akshay/projects/auto-centre

Test Files  1 passed (1)
     Tests  8 passed (8)
Duration  1.18s
```

### Full verification

Command:

```text
npx vitest run
```

Output (exit code 0):

```text
RUN  v4.1.9 C:/Users/akshay/projects/auto-centre

Test Files  47 passed (47)
     Tests  315 passed (315)
Duration  31.32s
```
