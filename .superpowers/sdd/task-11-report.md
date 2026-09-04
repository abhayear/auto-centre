# Task 11 Report: Releases API and UI

## Status

Implemented the staff releases workflow.

- Added an observed `/api/releases` GET/POST route with staff-role authorization.
- Added GitHub configuration handling, pull-request listing, input validation, and merge result responses.
- Replaced the placeholder releases page with a role-aware panel.
- Added preview and GitHub links, merge confirmation, loading/empty/configuration states, and toast feedback.
- Junior developers can review releases but cannot see merge actions.

## Verification

- `npx vitest run` — 48 files passed, 326 tests passed.
- `npx eslint "src/app/api/releases/route.ts" "src/app/admin/(protected)/releases/page.tsx" "src/components/admin/ReleasesPanel.tsx" "src/lib/__tests__/releases-route.test.ts"` — passed.
- Added 11 route tests covering authorization, unconfigured state, repository configuration, validation, merge failure, and merge success.

## Review Fix Verification

Command:

```text
npx vitest run src/lib/__tests__/releases-route.test.ts
```

Output:

```text
 RUN  v4.1.9 C:/Users/akshay/projects/auto-centre

 Test Files  1 passed (1)
      Tests  12 passed (12)
   Duration  1.45s
```

Command:

```text
npx vitest run
```

Output:

```text
 RUN  v4.1.9 C:/Users/akshay/projects/auto-centre

 Test Files  48 passed (48)
      Tests  327 passed (327)
   Duration  30.22s
```
