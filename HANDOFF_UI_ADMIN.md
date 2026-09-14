# Handoff — resumed and verified 2026-09-14

User resumed from this file. Admin fixes, isolated API tests, production build and desktop/mobile browser smoke QA are complete. See [docs/UI_ADMIN_QA.md](docs/UI_ADMIN_QA.md) for scope, validation and remaining limits.

- Preview: http://localhost:3000/quan-tri (frontend PID 1032); backend listening on 8000 (uvicorn worker PID 17788, launcher 2468). Chrome QA closed after completion.
- Tests: `node scripts/admin-routes.test.cjs` in frontend/clinic (10/10 passed). No mutation tests against live DB.
- Browser report/screenshots: `artifacts/admin-qa/`. All 18 modules checked at 1440px and 390px; no page overflow or runtime exceptions.
- Added dialog focus management, accent-insensitive menu search, draft preservation on refresh, account mutation error handling, safer pagination/JSON/cancellation validation, stable Vietnam dates.
- Existing uncommitted/staged/untracked changes remain preserved. No commits made.

The previous paused handoff below is historical; its stopped-server and unverified-build status no longer applies.

---

# Handoff — paused at user request

User asks to improve Vietnamese management function names and add missing management features as top priority; replace simplistic human body SVG with a realistic anatomy image inspired by https://scienceshop.vascsc.org/product/learn-human-body-organ-50-sets/. Then user explicitly requested pause to switch agents. Do not restart work until user resumes.

## Current state

- Prior existing changes and untracked files must be preserved. Do not reset the worktree. No commits made.
- TypeScript passed after latest edits: `npx tsc --noEmit --incremental false --pretty false` in frontend/clinic.
- **Latest admin changes NOT production-built or browser-verified yet.** Previous production build on disk predates this management redesign.
- Preview frontend PID 5760 and backend PID 17180 stopped at user's request (ports 3000, 8000).

## Changes this turn

- Replaced app/quan-tri/page.tsx with sidebar workspace, 18 Vietnamese business modules grouped into operations, clinical catalog, care/content, resources/reports, system. Added app/quan-tri/admin.css (responsive, scoped outside `.clinic-page`).
- Extracted existing doctors/specialties/services/tenant/inventory/maintenance editors into components/admin/CatalogEditors.tsx; preserved original editor functionality. Added empty-dataset creation forms and network error responses; translated stock movement/maintenance labels; inventory adjustment supports zero.
- Added lib/admin-types.ts and lib/admin-labels.ts (role/status/audit labels, appointment transition map, Vietnam local date utility).
- Added AdminTable.tsx (client search, pagination, CSV of loaded/filtered rows with formula-prefix escaping), AdminOverview.tsx (real daily/all-time counts, 7-day appointment chart, low-stock/expiry and maintenance alerts), AppointmentManager.tsx (server filtering/pagination and detail dialog with state updates/cancellation reason), ContentReview.tsx (669 entries audit, missing data filters, persistent internal editorial notes).
- Added app/api/admin/operations/route.ts: super-admin-only GET overview, paginated appointments, content completeness; PATCH editorial notes using existing system_settings table and audit log. Notes do not change public disease content or assert clinician review.
- Existing app/api/admin/route.ts: Vietnamese auth denial; guarded appointment transition and expectedStatus check, check-in/completion timestamps and cancellation reason; corrected specialty INSERT placeholder count; allowed zero for inventory adjustment only.
- UserDirectory.tsx translates displayed role codes and appointment status.
- Imagegen skill read and used. Generated realistic classroom anatomy mannequin head/torso with organs (not a photo of an actual person). File public/images/human-anatomy-model-v2.png. BodyAtlasExplorer.tsx now uses Next Image and 44px region targets at head/chest/abdomen; other groups remain filters. Image transparently labeled AI illustration.
- Reference URL failed in web tool; PowerShell read did not yield usable images. Do not claim copied or matched original photograph exactly.

## Resume priorities

1. Inspect and verify latest diffs. New UI has not been visually inspected. Check menu, every module, account drawer and appointment modal keyboard focus, loading/error states, mobile overflow; existing editor internals contain legacy minified JSX and any types.
2. Run meaningful route tests against **isolated SQLite**, never create fake appointments/payments/roles in live DB. Verify auth 401/403, specialty creation (fixed SQL), zero inventory adjust vs invalid negative/outbound, appointment transitions/races/timestamps/cancellation, editorial note persistence. Existing DB initializer lib/auth/db.ts uses cwd/data/auth.db; no seeds except schema. Can set isolated cwd with loader/transpiled TS and mock session for unit integration tests.
3. Known items to inspect: appointment dialog lacks focus trap; admin sidebar search currently plain case-insensitive rather than accent-insensitive; daily chart date helper en-CA check; existing parent reload can reset editor drafts. Generic export only exports loaded arrays, while appointments use full server pagination. Several existing datasets capped at 30/50/100/200 and labels state limits. Do not overclaim full records/reports.
4. Build `npm run build` with filesystem escalation needed for D drive. Avoid build while production Next instance uses same .next. Then start preview hidden on 3000 (next start) and backend 8000 only when user resumes and wants it; earlier launch logs artifacts/ui-preview.stdout.log, ui-preview.stderr.log, api-preview.stdout.log, api-preview.stderr.log.
5. Browser QA can use Chrome CDP, node v24 native WebSocket. Real mobile viewport requires Emulation.setDeviceMetricsOverride; --window-size alone gave cropped false overflow in prior run. Existing scripts/capture-admin.cjs has local test login configuration; do not print credentials or reset accounts. Use read-only real admin checks, isolated DB for mutations.
6. Preserve generated image and add concise provenance/prompt if needed. Prompt used: scientific educational studio photograph of inanimate classroom anatomy mannequin, head and torso with brain, lungs, heart, liver, stomach, intestines, ivory background, portrait 2:3, no labels/UI. Built-in imagegen output also under C:/Users/tohka/.codex/generated_images/01a09fce-9010-7b62-ad5a-a107f6a466b0/exec-0cbabb39-442b-4332-98cb-a4f838db37f6.png.

No agent delegation authorized. User prioritizes management, not more cosmetic public-home changes.
