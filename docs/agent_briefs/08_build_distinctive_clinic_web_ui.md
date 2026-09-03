# Agent brief 08 — Build a distinctive clinic website with an integrated triage assistant

> **Superseded for the current rebuild.** Use
> `docs/agent_briefs/09_rebuild_clinic_ui_auth_figma.md`. Brief 09 adds the
> mandatory Figma gate, current-UI audit, full authentication system, stricter
> anti-template rules, and end-to-end acceptance requirements.

## Mission

Design and implement a production-quality Vietnamese clinic website whose central
experience is an AI symptom-triage assistant backed by the existing BotMedical
retrieval API. The result must feel calm, credible, editorial, and recognizably
custom-made — not a generic SaaS landing page assembled from repetitive banners,
three-column card grids, floating glass panels, or oversized empty hero blocks.

This is a **UI/product implementation task**, not a model-training task. Do not
modify V3 training, model weights, evaluation datasets, clinical thresholds, or
the production V2 retrieval configuration.

Read these files before changing anything:

- `design/WEB_UI_SPEC.md`
- `src/web/app.py`
- `src/web/static/index.html`
- `docs/V3_FREEZE_STATUS.md`
- `config/settings.yaml`

## Product truth and medical language

The product is a symptom-assessment and triage assistant, not an autonomous
doctor. In user-facing Vietnamese, do not claim that it can diagnose a disease.
Avoid: “chẩn đoán”, “kết luận”, “chắc chắn là”, “bạn bị”. Prefer: “gợi ý liên
quan”, “định hướng ban đầu”, “mức độ cần đi khám”, and “cần được bác sĩ kiểm tra”.

The current runtime is:

- model: `bge-m3-medical-v2-recovered-a050-fp16`
- knowledge base: 652 entries
- routine route: hybrid retrieval
- emergency route: deterministic regex hard override + dense retrieval
- V3: paused, not deployed, and must not appear as the active model
- semantic emergency guardrail: advisory, not an automatic trigger

Never invent doctors, licences, patient counts, clinical accreditations, reviews,
or outcome statistics. Use clearly marked placeholders when real clinic content
has not been supplied.

## Figma input protocol

If a Figma file URL and permission are available, inspect it before coding. If no
URL or access is available, continue from this brief and record which assets need
to be replaced later; do not block the build and do not pretend that Figma was
read.

Required Figma workflow:

1. Inventory pages, frames, variables, text styles, components, variants, and
   exported assets. Identify the exact node IDs used.
2. Extract design tokens first: colors, typography, spacing, radius, shadows,
   container widths, breakpoints, and motion notes.
3. Fetch only relevant sections or components. Do not import an entire community
   kit or mix several unrelated visual systems.
4. Rebuild layout as semantic React components. Never place a screenshot of a
   Figma frame into the webpage.
5. Reuse real logo, clinic photography, illustrations, and branded vector assets
   when the file contains them. Preserve aspect ratios and export SVG/WebP/AVIF
   appropriately.
6. Map every reused item in `design/FIGMA_MAPPING.md` using: page name, node ID,
   local component, local asset, and any intentional deviation.
7. If the Figma design conflicts with emergency visibility, accessibility, or
   medical disclaimers, safety requirements win and the deviation must be noted.

Inputs to request only when they actually exist:

```text
FIGMA_FILE_URL=
FIGMA_PAGE_OR_NODE_IDS=
CLINIC_NAME=
CLINIC_LOGO=
REAL_CLINIC_PHOTOS=
DOCTOR_PROFILES_AND_CREDENTIALS=
ADDRESS_PHONE_OPENING_HOURS=
```

## Visual direction — “Clinical Pathway”

Use a continuous visual pathway rather than a stack of boxed sections. The page
should feel like a calm guided consultation: one fine line begins in the hero,
moves through specialties and care steps, then enters the assistant interface.
At important points it branches into small labelled nodes, like a restrained
clinical decision map. This line is a navigation and storytelling device, not a
decorative ECG animation.

Core visual characteristics:

- Editorial asymmetry: generous margins, deliberate off-grid moments, varied
  content widths, and strong type hierarchy.
- White or cool-neutral canvas with deep ink text and one medical blue brand
  color. Emergency red is reserved exclusively for real emergency state.
- Thin structural rules, numbered wayfinding, subtle anatomical/clinical line
  illustration, and quiet data-like details.
- Rounded surfaces are allowed only where they communicate containment: input,
  consultation transcript, appointment form, and result item. Do not put every
  paragraph in a card.
- Use one strong real clinic image or an original restrained illustration in the
  hero. Do not use stock imagery of smiling doctors with crossed arms.
- Avoid gradients as page backgrounds. A very subtle localized radial light may
  be used inside the assistant visualization only if contrast remains correct.
- Avoid “rectangle soup”: no repeated full-width CTA ribbons, no grid of six
  identical feature cards, no badge cloud, no carousel that moves by itself, and
  no floating chatbot bubble covering content.

The visual identity must still use the color, type, spacing, dark-mode, and
accessibility constraints in `design/WEB_UI_SPEC.md`. Treat this concept as a
composition refinement, not permission to discard those tokens.

## Information architecture

Implement these routes in a separate frontend application, leaving the existing
FastAPI tester intact:

```text
frontend/clinic/
  app/
    page.tsx                 clinic home
    tro-ly/page.tsx          full symptom-assessment experience
    chuyen-khoa/page.tsx     specialty index
    bac-si/page.tsx          verified team data or honest placeholders
    dat-lich/page.tsx        appointment flow
    lien-he/page.tsx         map/contact/opening hours
  components/
    clinic/
    triage/
    motion/
    ui/
  lib/
    botmedical-api.ts
    design-tokens.ts
```

Use Next.js 15 App Router + TypeScript + Tailwind CSS v4. Use Radix/shadcn only
for accessible primitives; customize their appearance. Use Lucide outline icons.
Use Framer Motion only for the motion choreography specified below. Do not add a
second design system.

## Home-page composition

The home page should be a single composed narrative, not eight disconnected
marketing blocks.

### Opening frame

- Place a precise, human headline on the left and a clinic image/illustration on
  the right, but let the image crop break the conventional two-column rectangle.
- Primary action: “Đặt lịch khám”. Secondary textual action: “Thử trợ lý triệu
  chứng”. Only one filled brand button in the viewport.
- Keep “Gọi 115” reachable in the header in one action without making the whole
  header look like an emergency warning.
- Add a small live system note such as “Trợ lý đang dùng 652 mục kiến thức” only
  when fetched from `/api/status`; never hard-code fake availability.

### Specialty navigator

Do not use a generic card grid. Build an interactive index: specialty names form
a vertical rail; selecting one changes a single adjacent illustration and concise
description. Keyboard focus must provide the same behavior as hover. On mobile,
this becomes a native-feeling horizontal tab list with snap, not a carousel.

### Care pathway

Use the continuous pathway line for four steps: describe symptoms, receive a
triage suggestion, choose an appropriate specialty, and book a visit. Animate the
line drawing once as it enters view. Keep every step readable without animation.

### Assistant preview

Make the assistant a substantial editorial demo embedded in the page, not a
floating bottom-right bubble. Let users enter one symptom description and then
navigate to `/tro-ly` with the text carried in session state. Place the medical
limitation immediately beneath the input.

### Doctors and trust

Use a composed portrait strip with varied crop widths and a quiet typographic
credential panel. No auto-play carousel. Do not show a person until their real
name, specialty, qualification, and photo are supplied. If data is absent, show a
clearly labelled content placeholder only in development mode.

### Contact ending

Finish with address, opening hours, booking action, and emergency number arranged
as a restrained footer composition. Do not add another oversized CTA banner.

## Triage assistant experience

The assistant is the product core and must use the real existing endpoints:

- `GET /api/status`
- `POST /api/search` with `{ query, top_k, mode }`

Do not fabricate model responses or candidate results in production mode. Add a
typed API adapter and explicit loading, empty, offline, index-building, success,
and emergency states.

Desktop layout should feel like a consultation desk rather than a chat clone:

- Left 65–70%: conversational symptom history with a sticky composer.
- Right 30–35%: a “clinical map” showing captured symptom chips, retrieval route,
  urgency, and at most three related knowledge entries.
- Technical scores are hidden by default behind “Xem dữ liệu retrieval”. State
  clearly that scores rank entries within one query and are not probabilities.
- Never display a confidence percentage.
- Provide an obvious “Bắt đầu lại” action that clears local session state.
- Do not persist health text to analytics, browser logs, URL query strings, or
  server access logs.

On mobile, keep the conversation full width. Open the clinical map in an
accessible bottom sheet; urgency status remains visible without opening it.

### Emergency state — build this first

When the backend returns `emergency.is_emergency=true`:

- Replace normal chrome with a fixed, full-width emergency strip using the
  reserved emergency color and `aria-live="assertive"`.
- Show the backend-safe message, the matched red-flag description, and a minimum
  56px-high `<a href="tel:115">Gọi 115 ngay</a>`.
- Disable the composer and say “Vui lòng gọi cấp cứu ngay — trợ lý tạm dừng”.
- Reduce visual prominence of the remaining interface without hiding prior text.
- Use only a single 200ms fade-in. No pulse, shake, flashing, countdown, or
  celebratory motion.

## Motion choreography

Motion should create spatial continuity, never decorate every element.

- Page entrance: title and first visual settle from 12px with opacity, 320ms.
- Pathway line: SVG stroke reveal once, 600–900ms, only when 20% visible.
- Section transitions: one shared element or mask transition, maximum 480ms.
- Specialty change: old illustration fades 120ms; new illustration resolves with
  a 6px vertical movement over 240ms.
- Chat message: 8px upward settle + fade over 200ms.
- New symptom chip: scale 0.96 to 1 + one background-color settle over 400ms.
- Result list: stagger at most the first three items, 50ms apart.
- Buttons move up at most 1px on hover; never scale.
- No parallax, magnetic cursor, 3D tilt, continuous marquee, auto-play video, or
  infinite animation except a loading indicator.
- Implement the exact `prefers-reduced-motion` override from
  `design/WEB_UI_SPEC.md`; the experience must remain complete with motion off.

## Responsive and accessibility requirements

- Validate at 375px, 768px, 1024px, and 1440px in light and dark modes.
- Minimum interactive target: 44×44px; emergency call action: 56px high.
- WCAG AA for normal UI and AAA contrast for the emergency strip.
- Proper landmarks, heading order, skip link, labelled controls, focus-visible
  states, and keyboard-operable specialty navigator/sheets/dialogs.
- Chat history uses `role="log"` and `aria-live="polite"`; do not announce
  decorative animation.
- Vietnamese text must render with correct diacritics; self-host fonts and use
  `font-display: swap`.
- Avoid layout shift: reserve media dimensions and result skeleton height.

## Data, privacy, and integration boundaries

- Proxy API requests server-side so the browser never learns internal model paths.
- Do not expose `.env`, API keys, local filesystem paths, clinical-review files,
  or holdout cases.
- Add a visible development badge only in non-production builds.
- Do not enable semantic automatic escalation; deterministic emergency rules own
  the hard override until a calibration is deployment-approved.
- Do not change the production model label from V2 or imply that V3 exists for
  users.
- Do not add diagnosis history or patient profiles until authentication,
  encryption, retention, deletion, and consent requirements are specified.

## Performance targets

- LCP under 2.0s on a representative 4G profile for the marketing home page.
- CLS below 0.05 and INP below 200ms.
- Initial client JavaScript below 180KB gzip where practical.
- Lazy-load the assistant visualization, doctor photography, and non-critical
  motion code.
- The model/index must be pre-warmed before deployment traffic is admitted. Do
  not make the first public user build the vector index.
- Show a useful index-building/offline state rather than leaving the composer in
  an indefinite spinner.

## Implementation order

1. Audit Figma if available and write `design/FIGMA_MAPPING.md`.
2. Create tokens, root layouts, fonts, light/dark mode, header, and footer.
3. Implement `EmergencyBanner` and test keyboard/screen-reader behavior.
4. Implement the typed API adapter and all assistant state machines.
5. Build `/tro-ly` with real API data before styling the marketing preview.
6. Build the continuous pathway home composition and specialty navigator.
7. Add booking/contact routes using only real or explicitly placeholder data.
8. Add motion after the static experience is complete and accessible.
9. Run responsive, accessibility, performance, API, and visual-regression tests.

## Required tests

- Unit tests for API response mapping, urgency labels, route display, and score
  disclosure.
- Component tests for empty/loading/offline/index-building/success/emergency.
- End-to-end tests for a routine query and an emergency query against a mocked
  deterministic API contract.
- Keyboard-only navigation test through header, specialty navigator, composer,
  clinical map, restart action, and emergency call link.
- Automated accessibility scan with no serious/critical violations.
- Visual snapshots at 375, 768, and 1440px in both themes.
- Verify that production bundles contain no fake doctors, fake metrics, Figma
  access tokens, health queries, or V3 deployment claims.

## Definition of done

- The design reads as one continuous custom composition, not a sequence of
  interchangeable templates or banners.
- Figma-derived parts are traceable to exact nodes, or missing access is recorded
  honestly.
- The real BotMedical API powers status, retrieval results, route, urgency, and
  emergency state.
- Emergency behavior is visually dominant, accessible, and cannot be missed.
- No user-facing medical overclaim or invented clinic authority exists.
- All responsive, reduced-motion, dark-mode, accessibility, integration, and
  visual-regression checks pass.
- The handoff report includes screenshots at all required widths, performance
  measurements, test commands/results, known placeholders, Figma mapping, and a
  list of any remaining production-security work.

## Handoff format

Report the implemented routes, component inventory, source Figma node IDs,
backend endpoints used, screenshots, accessibility results, performance numbers,
test results, placeholder content still needed from the clinic, and known risks.
Do not describe the site as clinically validated and do not claim that retrieval
quality proves diagnostic accuracy.
