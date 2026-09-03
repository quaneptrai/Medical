# Agent brief 09 — Rebuild An Lạc Clinic as a fully original, Figma-led product

> **Authority:** This brief supersedes brief 08 for all visual, UX, Figma, auth,
> responsive, and acceptance decisions. Preserve only verified backend behavior,
> medical safety logic, and truthful data. Do not incrementally “polish” the
> current homepage. Recompose it from first principles.

## 1. Outcome

Build a complete Vietnamese clinic product with:

- an original, calm, high-end visual identity that does not resemble an AI-made
  SaaS template;
- a public clinic website;
- a real symptom-triage experience connected to BotMedical;
- complete registration, login, verification, password recovery, session, and
  protected-account flows;
- appointment booking connected to an authenticated account where appropriate;
- excellent mobile behavior, accessibility, performance, and failure states;
- exact traceability to approved Figma nodes and assets.

The result must feel designed for one specific clinic by a strong product team.
It must not look like a collection of generic Tailwind examples, shadcn cards,
dashboard widgets, AI status pills, gradient heroes, or full-width CTA bands.

This is not permission to claim medical accuracy, fabricate clinic credentials,
or call retrieval a diagnosis. User-facing copy must describe the assistant as
symptom triage, preliminary guidance, or related knowledge retrieval.

## 2. Stop conditions — do not code past these

### 2.1 Figma is mandatory

Before editing visual components, obtain all of the following:

```text
FIGMA_FILE_URL=
FIGMA_PAGE_IDS=
FIGMA_REQUIRED_NODE_IDS=
FIGMA_ACCESS_METHOD=MCP | API | Dev Mode | approved export
```

If the link, access token, connector, or node permissions are unavailable:

1. stop visual implementation;
2. tell the user exactly what is missing;
3. request access or an exported `.fig`/PDF/PNG asset package;
4. continue only with non-visual audits or backend bug fixes;
5. never say “Figma-inspired”, “matched Figma”, or “fetched from Figma”.

Do not silently skip this phase. Do not use Dribbble, Behance, a community kit,
or another clinic website as a substitute without explicit approval.

### 2.2 Clinic facts are mandatory

Request verified content before publishing:

```text
LEGAL_CLINIC_NAME=
LICENSE_NUMBER_AND_SOURCE=
ADDRESS=
PHONE=
EMAIL=
OPENING_HOURS=
DOCTOR_DATA_SOURCE=
SPECIALTY_DATA_SOURCE=
REAL_PHOTO_FOLDER_OR_FIGMA_NODES=
APPOINTMENT_CONFIRMATION_PROCESS=
PRIVACY_POLICY_OWNER=
```

If these facts are absent, use neutral development placeholders labelled
`[NỘI DUNG CHỜ XÁC MINH]`. Placeholders must be impossible to ship in production:
the production build must fail when any remain.

Never invent a clinic name, licence, street address, doctor, hospital affiliation,
degree, insurance partner, response time, patient count, years of operation, or
satisfaction statistic.

### 2.3 Authentication architecture must be approved

Before implementing auth, document the selected maintained authentication
library, database, email provider, session model, and deployment environment.
Do not build production auth from localStorage, a JSON file, a client-only mock,
or homemade cryptography.

## 3. Mandatory current-state audit

Read and inspect:

- `frontend/clinic/`
- `src/web/app.py`
- `config/settings.yaml`
- `design/WEB_UI_SPEC.md`
- `docs/V3_FREEZE_STATUS.md`
- `artifacts/ui-home-1440.png`
- `artifacts/ui-home-390.png`

Create `design/CURRENT_UI_AUDIT.md` before implementation. It must include exact
screenshots at 390×844, 768×1024, 1024×768, and 1440×1200, plus a table with
issue, affected component, severity, and rebuild decision.

The current implementation is already known to fail for these reasons; do not
spend time debating whether they are acceptable:

1. Dark mode renders major headline text with extremely weak contrast against an
   almost-black background.
2. The 390px view has horizontal overflow and clipped header, copy, input, chips,
   and actions.
3. The opening viewport is overloaded: status pill, huge headline, AI copy,
   symptom console, quick chips, two CTAs, a dark AI architecture panel, three
   workflow cards, and three metric cards compete simultaneously.
4. It uses the most recognizable AI-template patterns: blue gradient text,
   blurred radial glow, pulsing green status dots, dark indigo “AI engine” card,
   icon circles, pills, mini dashboards, monospaced model labels, and repeated
   rounded cards.
5. The page continues as a sequence of trust strip, specialty block, process
   block, doctor-card grid, FAQ block, and a full-width blue CTA banner. This is
   section soup, not an authored composition.
6. It exposes implementation jargon such as BGE-M3, Dense, BM25, engine status,
   route architecture, and milliseconds to patients.
7. It contains unverified/fabricated claims including “18+”, “120.000+”, “45+”,
   “100% bác sĩ”, “~35 ms”, doctor identities, licence, addresses, insurance
   partners, and hospital affiliations.
8. Registration and login routes do not exist.
9. The browser previously called the backend directly and produced
   `Failed to fetch`; status fallback falsely reported the backend as ready.
10. Navigation and dense hero content crowd mobile before the user reaches the
    main task.

The rebuild must remove these patterns rather than reskin them.

## 4. Preserve versus replace

### Preserve

- `GET /api/status` and `POST /api/search` same-origin proxy behavior.
- Production model identity: V2 only.
- Knowledge-base/index status from the real API.
- Deterministic emergency hard override and 115 action.
- No query persistence in the current retrieval tester.
- Valid medical disclaimers and accessibility fundamentals.
- Tested routine and emergency API contracts.

### Replace

- Current hero composition.
- AI architecture panel and technical labels.
- Trust metric strip.
- All unverified `clinic-data.ts` people, statistics, affiliations, addresses,
  insurance, licence, and service claims.
- Repeated pill labels above every heading.
- Repeated card grids and full-width colored CTA ending.
- Gradient logo, gradient headline, glows, and pulsing availability dots.
- Current dark-mode mapping.
- Generic ChatGPT-style bubbles where a more appropriate consultation record can
  communicate the same information.

Do not preserve a component solely because code already exists.

## 5. Figma audit gate

Create `design/FIGMA_AUDIT.md` containing all of the following before coding:

### File inventory

- Figma file name, URL, version/date, pages, and accessed node IDs.
- Component sets and variants.
- Variables and modes.
- Local text and color styles.
- Grid definitions and breakpoints.
- Prototype interactions and overlays.
- Exportable brand assets and their licence/ownership.
- Missing states/pages that must be designed.

### Token extraction

Record raw Figma values and their code mapping:

| Figma variable/style | Node/source | Light | Dark | Code token | Notes |
|---|---|---:|---:|---|---|

Cover color, type, spacing, grid, radius, border, shadow, opacity, and motion.
Do not round values or replace them with framework defaults without documenting
why.

### Node-to-component mapping

Create `design/FIGMA_MAPPING.md`:

| Page | Figma node ID | Intended component | States | Asset export | Status |
|---|---|---|---|---|---|

Every implemented major component must map to a Figma node or be explicitly
marked `NEW — approved gap design`.

### Asset handling

- Export logos and line artwork as clean SVG.
- Export photography as AVIF/WebP with a high-resolution original retained.
- Remove hidden layers and metadata not needed at runtime.
- Never use a screenshot as a web component.
- Never redraw a branded mark with an approximate Lucide icon.
- Store assets under `frontend/clinic/public/brand/` or
  `frontend/clinic/public/media/` with descriptive names.

### Figma approval checkpoint

Before coding, present three screenshots or style tiles extracted from or built
inside the approved Figma file:

1. homepage first fold at 1440px;
2. homepage first fold at 390px;
3. triage workspace at 1440px and 390px;
4. login and registration screens;
5. emergency state.

Do not proceed until the user chooses/approves the direction.

## 6. Original design direction — “The Care Journal”

Use this only if it is compatible with the approved Figma direction. It is the
fallback art direction to prevent generic AI output, not a licence to bypass
Figma.

The site should resemble a carefully typeset care journal: warm, quiet, precise,
and human. Its signature element is a narrow annotated margin that runs through
selected pages. Section numbers, short clinical notes, time/location annotations,
and restrained line drawings can live in this margin. Main content sits on a
clean editorial field. This creates continuity without full-width banners or
dozens of cards.

### Visual signature

- Warm paper background rather than pure white everywhere.
- Deep green-black ink for text rather than navy-on-black.
- Muted mineral green as the main action color.
- One soft clay accent for human warmth, never for medical urgency.
- Hairline rules, editorial captions, folio/page numbers, and modest notched
  corners used sparingly.
- Large Vietnamese serif headlines paired with a highly readable sans-serif body.
- Real clinic photography with documentary cropping and factual captions.
- Hand-authored line illustration only when real photography is unavailable.
- No visual metaphor involving neural networks, glowing nodes, robot heads,
  holograms, data dashboards, or AI circuitry.

### Provisional palette

Replace these values only with approved Figma tokens of equal or better contrast:

```css
--paper:          #F5F1E8;
--paper-raised:   #FBF9F4;
--ink:            #17211F;
--ink-muted:      #59625E;
--line:           #D7D2C7;
--mineral:        #285E55;
--mineral-hover:  #1F4A43;
--sage:           #DDE6DF;
--clay:           #B96F54;
--clay-soft:      #F0DED5;
--emergency:      #971E26;
--emergency-soft: #F8E7E8;
```

Rules:

- At least 70% of the page is neutral paper/ink.
- Mineral green is used for the single primary action in a viewport, active
  navigation, and meaningful focus—not as a section background.
- Clay is limited to small editorial accents and must never look like an error.
- Emergency red appears only for emergency content and the always-accessible 115
  link.
- No gradients, neon colors, colored glows, glassmorphism, or blurred blobs.
- Every text/background pair must be measured, not judged by eye.

### Typography

- Heading candidate: a Vietnamese-capable editorial serif such as Noto Serif;
  verify every Vietnamese diacritic before approval.
- Body/UI candidate: Be Vietnam Pro.
- Self-host WOFF2 subsets; no runtime font CDN request.
- Maximum two font families and four weights total.
- Headline line-height 1.05–1.15; body line-height 1.55–1.75.
- Body copy must never be below 16px on mobile.
- Patient-facing copy width: 56–68 characters.
- Do not use monospaced text on patient-facing pages.
- Do not use all-caps micro-labels repeatedly above section headings.

### Geometry

- Default radius: 4–8px, not 16–24px everywhere.
- Pill shapes are reserved for selected filters or verified statuses, maximum one
  visible group per viewport.
- Use borders and whitespace before shadows.
- No more than three elevated surfaces visible in the first desktop viewport.
- At least 70% of major content must not be enclosed in cards.
- No repeated three-card or four-card marketing grids.
- Avoid perfectly centered section title + paragraph + grid composition.

## 7. Homepage composition

The homepage must read as one continuous authored page. Do not wrap each item in
a full-width `<section>` with alternating backgrounds.

### 7.1 Header

Desktop:

- 72–80px high, paper background, one bottom hairline.
- Real logo/wordmark from Figma on the left.
- Four primary navigation destinations maximum in the center/left.
- Text links for “Đăng nhập”; quiet bordered action for “Đăng ký” or booking.
- 115 remains one click away but is not pulsing or flashing.
- No pill-shaped navigation container.
- No model name, KB count, green status dot, or AI badge in the brand area.

Mobile:

- Logo, 115 affordance, and menu fit within 390px with no clipping.
- Authentication links live inside the menu, with current session identity shown
  after login.
- Menu traps focus, closes on Escape, restores focus, and locks background scroll.

### 7.2 Opening composition

Do not build a conventional “huge heading left + dashboard card right” hero.

Compose the fold as an editorial spread:

- A narrow margin annotation introduces the clinic’s verified promise.
- The main headline occupies 5–6 grid columns and must fit in 2–4 lines.
- A real documentary clinic image occupies an offset 4–5-column folio crop with
  a small factual caption.
- A compact intake prompt sits on the baseline below the headline—not inside a
  large rounded console. It contains one textarea/input and one action.
- Maximum two calls to action above the fold.
- No quick symptom chip cloud above the fold.
- No metrics, AI architecture, engine status, or technical diagram above the fold.
- The first fold must have one clear focal point from a five-second squint test.

### 7.3 Specialty index

Build one typographic index rather than cards:

- Specialty names form a numbered vertical list.
- Focus/selection updates one adjacent real image or anatomical line illustration,
  a 2–3 sentence description, and a truthful service link.
- Use hairline dividers; no icon circles.
- Keyboard and touch interactions have identical information access.
- On mobile, use an accordion/list, not a clipped horizontal carousel.

### 7.4 Care journey

Integrate three or four care steps along the journal margin. The progression can
use a single line and changing folio number, but must not become four identical
cards. Keep steps concise and factual.

### 7.5 Doctors

- Render only verified doctors from an approved source.
- Use one portrait-led editorial feature plus a simple index, not a card grid.
- Show name, verified qualification, specialty, and availability only.
- No “45+”, “100%”, generic avatars, or invented hospital affiliations.
- If no verified doctors exist, omit the public section entirely.

### 7.6 Triage introduction

Introduce the assistant once. Do not repeat an AI demo in the hero and again in a
separate promotional block. Explain what it can and cannot do using plain
Vietnamese. Keep technical retrieval information in a developer disclosure on
the triage page only.

### 7.7 FAQ and ending

- FAQ can use an editorial disclosure list separated by rules.
- The page ends naturally in contact/booking information and the footer.
- No full-width blue/green CTA banner.
- No fake urgency, countdown, limited availability, or promotional popup.

## 8. Triage experience — “Consultation Record”, not ChatGPT clone

The triage route is `/tro-ly`. It must use the real same-origin endpoints:

- `GET /api/status`
- `POST /api/search`

### Patient-facing layout

Desktop:

- Left/main column: a structured consultation record, not alternating speech
  bubbles. Patient entries and system guidance are differentiated by typography,
  margin, and rule position.
- Right margin: a compact evolving summary containing extracted descriptions,
  urgency, and at most three related knowledge entries.
- Sticky composer at bottom with a clear privacy note.
- A quiet session reset action.

Mobile:

- One content column with no fixed pixel-width children.
- Summary opens as an accessible sheet and never causes horizontal overflow.
- Composer remains visible above the virtual keyboard.
- 115 action remains reachable in one interaction.

### Remove from patient UI

- BGE-M3, BM25, dense, hybrid, alpha, model path, milliseconds, embedding score,
  “engine ready”, technical route names, and developer jargon.
- Confidence percentages or score-like progress bars.
- Pulsing online dots and bot avatars.
- Fake conversational prose generated from retrieval fields.

If a developer disclosure exists, it must be behind an explicitly labelled
“Thông tin kỹ thuật” control and disabled in production by default.

### Response presentation

- Use “Mục kiến thức có thể liên quan”, never “bệnh bạn mắc”.
- Show at most three candidates initially.
- Display urgency using text + icon; color is supplemental.
- Explain that ranking is retrieval similarity, not probability.
- Never transform candidate symptoms into claims that the user reported them.
- Do not synthesize a treatment plan or medication recommendation.

### API state matrix

Implement and test every state:

| State | UI behavior | Allowed action |
|---|---|---|
| Loading status | compact skeleton; composer disabled briefly | retry after timeout |
| Backend offline | honest offline notice; never show fake ready | retry; 115 always visible |
| Index building | show real `count/target` and explanation | refresh status |
| Model cold start | bounded progress copy without fake percentage | cancel/retry |
| Search success | consultation entry + related knowledge | continue/reset/book |
| Empty result | ask for a clearer description | edit/retry |
| Validation error | place error beside composer | correct input |
| Network timeout | preserve typed text | retry |
| Emergency | hard emergency state | call 115 only/leave page |

Never catch an exception and return fabricated model status or fake clinical
results. Never parse the same request body twice. Browser requests must use the
same-origin Next.js proxy; internal backend URLs remain server-only.

### Emergency state

- Deterministic backend result is authoritative.
- Display an assertive emergency region fixed at the top of the workspace.
- Use the reserved emergency color with measured AAA contrast.
- Provide a 56px minimum call action: `<a href="tel:115">Gọi 115 ngay</a>`.
- Disable the composer and clearly state why.
- Preserve prior content but reduce its prominence.
- No pulse, flash, shake, siren animation, timer, or decorative transition.
- Do not implement a partial client regex and label it as the backend guardrail.
- When the backend is offline, show a general safety instruction without
  pretending an emergency classification occurred.

## 9. Complete authentication and account system

Required routes:

```text
/dang-nhap
/dang-ky
/xac-minh-email
/quen-mat-khau
/dat-lai-mat-khau
/tai-khoan
/tai-khoan/ho-so
/tai-khoan/lich-hen
/tai-khoan/bao-mat
```

### Registration

- Request only email, password, password confirmation, optional display name,
  acceptance of terms, and acknowledgement of privacy policy.
- Do not request symptoms, diagnosis history, national ID, insurance, date of
  birth, address, or phone during initial registration.
- Validate email and password server-side.
- Use a password manager-friendly form: correct autocomplete tokens, visible
  labels, show/hide password, Caps Lock hint, and paste allowed.
- Explain password requirements before submission.
- Prevent email enumeration with neutral responses.
- Send a single-use email verification token with expiry.
- Offer resend with rate limiting and a clear cooldown.
- Do not create an authenticated medical-data session before required verification.

### Login

- Email/password plus a clear password-recovery link.
- Optional “remember this device” only if session policy supports it.
- Neutral invalid-credential message.
- Rate limit by account and risk-aware network signal.
- Record security-relevant events without storing passwords or health text.
- Redirect safely to the intended internal page; reject open redirects.

### Password reset

- Single-use, hashed, expiring reset token.
- Invalidate existing reset tokens after success.
- Offer session revocation after reset.
- Never reveal whether an email exists.

### Sessions

- Server-issued session stored in `HttpOnly`, `Secure` in production,
  `SameSite=Lax` or stricter cookie.
- Rotate session identifiers on authentication and privilege changes.
- Server-side logout and “logout all devices”.
- CSRF protection for state-changing requests.
- Protected-route checks must run server-side, not only in React.
- No auth token in localStorage or URL.

### Password storage and database

- Use a maintained auth library and a database-backed adapter.
- Hash passwords with a current memory-hard algorithm such as Argon2id using
  documented parameters.
- At minimum model users, sessions, verification tokens, password-reset tokens,
  and consent records.
- Commit schema and migrations.
- Provide local development infrastructure for the approved database and email
  capture tool; production credentials remain environment-only.
- Never commit secrets or real patient data.

### Account area

- Dashboard greets the verified user without generic metric cards.
- Profile edits require re-authentication for sensitive fields.
- Security page lists active sessions and supports revocation.
- Appointment history shows only real records belonging to that account.
- Provide data export and account-deletion request entry points once retention
  behavior is implemented and approved.
- Do not save triage history by default. Require explicit, informed opt-in and a
  separate privacy review before associating health text with an account.

### Auth visual design

- Auth pages are part of the same Care Journal system, not centered glass cards
  over a gradient blob.
- Desktop uses an editorial split with a factual clinic image/caption and a quiet
  form column.
- Mobile shows the form immediately without decorative content pushing it below
  the fold.
- One primary action, plain text secondary links, and no social-login buttons
  unless providers are actually configured.

## 10. Appointment flow

Use three explicit, URL-addressable steps:

1. specialty/visit reason;
2. verified practitioner and available time;
3. contact details, consent, and review.

Requirements:

- Availability must come from a real scheduling source or be labelled demo data.
- Do not claim a booking is confirmed until the backend confirms it.
- Preserve data when navigating back.
- Prevent double submission.
- Show timezone and clinic location.
- Require login only at a point agreed by product; do not discard guest progress.
- Confirmation includes a real reference ID and cancellation/reschedule path.
- Never promise a callback time without an operational SLA.

## 11. Motion system

Motion should feel like a journal opening and annotations settling into place.
It must not advertise “AI”.

Allowed:

- page title reveal using opacity + 8px vertical movement, 240–320ms;
- documentary image reveal with a restrained rectangular clip, 400–520ms;
- a hairline drawing once through the care journey, 500–700ms;
- margin annotation settling 6px, 180–240ms;
- list insertion fade/position transition, 160–220ms;
- menu/sheet entrance, 200–280ms;
- cross-route shared wordmark transition only if it does not delay navigation.

Forbidden:

- infinite pulse except a conventional loading indicator;
- animated gradients, glowing orbs, neural particles, floating cards;
- parallax, 3D tilt, cursor followers, magnetic buttons;
- stagger of more than four items or more than 180ms total delay;
- scroll-jacking, auto-play carousel, marquee, number-counting animation;
- animation on emergency medical content;
- motion that hides content until JavaScript runs.

Use one motion-token module. Respect `prefers-reduced-motion` everywhere and test
the full product with animation disabled.

## 12. Responsive specification

Test at 320, 360, 390, 430, 768, 1024, 1280, and 1440px.

Global rules:

- No horizontal overflow at any supported width.
- No fixed-width child wider than its container.
- Use `min-width: 0` on flexible text columns.
- Long Vietnamese words, email addresses, IDs, and doctor titles wrap safely.
- Inputs remain at least 16px on mobile to prevent iOS zoom.
- Touch targets are at least 44×44px.
- Sticky elements must not overlap focused fields or the virtual keyboard.
- Safe-area insets are respected.
- Mobile does not simply stack every desktop block into a very long page; it
  reprioritizes content.

Specific 390px acceptance:

- logo, 115, and menu visible without clipping;
- headline fully readable with no cropped last word;
- intake input and submit action fit within viewport;
- no horizontally clipped chip row;
- no off-screen secondary CTA;
- triage composer and send control fully visible;
- auth forms require no horizontal pan;
- screenshots show no content beyond the right edge.

## 13. Light and dark themes

- Light is the primary art direction.
- Dark mode is not a mechanical inversion of token names.
- Define semantic surface/text tokens for each mode.
- Persist explicit user choice; use OS preference only before a choice exists.
- Check every heading, muted paragraph, border, disabled control, input
  placeholder, link, and emergency message with automated contrast tooling.
- Minimum 4.5:1 normal text, 3:1 large text/UI boundaries, 7:1 emergency strip.
- Dark screenshots must be reviewed separately at 390 and 1440px.
- A build fails if headline or body text is visually lost as in the current dark
  screenshot.

## 14. Content and medical-safety rules

- No “chẩn đoán bởi AI”, “chẩn đoán chính xác”, “chuẩn xác”, “100%”, or similar
  certainty language.
- No fake testimonials or patient portraits.
- No copied medical marketing claims.
- No result percentage presented as certainty.
- No medication or treatment plan generated from retrieval.
- Disclaimer appears at assistant entry and after results without dominating the
  entire site.
- 115 is reachable within one action on every route.
- User-facing content never claims V3 is deployed.
- Production UI never exposes model filesystem paths.

Add a production content scanner that fails on:

```text
[NỘI DUNG CHỜ XÁC MINH]
120.000+
45+
100% bác sĩ
~35 ms
0892/SYT-GPHĐ
anlacclinic.vn
```

unless each string is explicitly allowlisted with a verified source record.

## 15. Accessibility

- Semantic landmarks and correct heading hierarchy.
- Skip link visible on focus.
- Focus indicator never removed.
- Full keyboard operation for navigation, specialty index, dialog, sheet, triage,
  auth, and booking.
- Focus trap and restoration for overlays.
- Form errors linked using `aria-describedby`; summary receives focus after failed
  submission.
- Live regions used sparingly: polite for search progress/results, assertive only
  for emergency.
- Images use meaningful Vietnamese alt text; decorative line art uses empty alt.
- Do not communicate urgency, validation, or selected state with color alone.
- Screen-reader test with NVDA on Windows and VoiceOver on mobile Safari when
  available.

## 16. Security and privacy

- Same-origin proxy for BotMedical; internal URL server-only.
- Explicit request timeout and structured error mapping.
- No fake success fallback when backend is unavailable.
- Do not place health text in query-string URLs. The current hero behavior that
  forwards symptoms using `?q=` must be replaced with short-lived in-memory or
  session transfer that is reviewed for privacy.
- Do not include health text in analytics, server logs, error telemetry, session
  replay, or third-party scripts.
- Set CSP, frame restrictions, referrer policy, permissions policy, and secure
  response headers.
- Validate and bound all inputs server-side.
- Rate-limit auth, search, password reset, verification resend, and appointment
  submission endpoints.
- Secrets remain in environment variables and secret management.
- Threat-model account takeover, email enumeration, CSRF, XSS, open redirects,
  excessive health-data retention, and accidental logging.

## 17. Performance budget

- Home LCP ≤2.0s on a representative mobile 4G profile.
- Auth LCP ≤1.8s.
- CLS <0.05.
- INP <200ms.
- Initial JS ≤180KB gzip; lower on auth pages.
- No third-party scripts before consent except essential infrastructure.
- Self-host fonts with preload only for required first-fold weights.
- Responsive AVIF/WebP images with fixed dimensions.
- Lazy-load below-fold media and non-critical motion.
- Pre-warm BotMedical model/index before serving traffic.

## 18. Implementation phases and approval gates

### Phase 0 — audit only

- Capture current screenshots.
- Complete code, content, responsive, API, and accessibility audit.
- Identify all fabricated data.
- No visual implementation.

### Phase 1 — Figma

- Fetch and document Figma.
- Extract tokens/assets/nodes.
- Prepare required first-fold, triage, auth, and emergency frames.
- Get user approval.

### Phase 2 — truth and architecture

- Remove fabricated content.
- Approve auth/data/email/deployment architecture.
- Define API contracts and error schema.
- Define route map and permission matrix.

### Phase 3 — foundation

- Build semantic tokens, typography, grid, header/footer, responsive shell.
- Implement light/dark theme with contrast tests.
- Build content scanner.

### Phase 4 — auth first

- Implement registration, verification, login, reset, session, logout, protected
  routes, and security/account screens.
- Pass auth integration and security tests before appointment/account features.

### Phase 5 — triage core

- Implement API state matrix and emergency state first.
- Pass routine and emergency end-to-end flows.
- Then implement the consultation-record presentation.

### Phase 6 — public and appointment pages

- Implement approved homepage composition, specialty index, verified doctors,
  booking, and contact.
- No placeholder may silently become production content.

### Phase 7 — motion and polish

- Add approved motion only after static UX and accessibility pass.
- Compare implementation against Figma at every target viewport.

### Phase 8 — final audit

- Visual regression, accessibility, responsive, performance, content, security,
  and E2E gates.
- Produce handoff evidence.

## 19. Required automated tests

### Visual

- Screenshot tests at 390, 768, 1024, and 1440px in light and dark.
- Pixel/overlay comparison against approved Figma exports.
- Explicit horizontal-overflow assertion on every route.
- No screenshot accepted with missing fonts, clipped text, or loading placeholders.

### BotMedical

- Status ready, offline, building, and timeout.
- Routine query returns related knowledge through `/api/search`.
- Emergency query returns dense route + emergency banner + working 115 link.
- Backend offline never returns fake ready or fake candidates.
- Typed query survives network failure.
- No internal backend URL in the client bundle.
- No health query in URL, logs, analytics payload, or error telemetry.

### Authentication

- Register, verify email, login, logout.
- Invalid credentials and enumeration-safe messaging.
- Verification resend rate limit.
- Password reset success, expired token, reused token.
- Session rotation and logout-all-devices.
- Protected-route redirect and safe return URL.
- CSRF rejection.
- XSS input handling.
- Account deletion/export entry points according to approved policy.

### Booking

- Guest/authenticated policy.
- Back navigation preserves state.
- No duplicate submission.
- Server rejection and slot conflict.
- Confirmed booking contains real reference ID.

### Accessibility

- Automated axe scan with zero serious/critical issues.
- Keyboard scripts for header/menu, auth, triage, sheet, booking, and emergency.
- Reduced-motion screenshots and behavior.

### Build/content

- Typecheck, lint, unit, integration, and production build.
- Content scanner detects every prohibited placeholder/fabricated claim.
- Client-bundle scanner rejects secrets, internal URLs, V3 claims, and health
  fixture text.

## 20. Visual anti-template gate

The build fails review if any of these remain without an approved Figma reason:

- gradient headline or logo;
- blurred glow/orb behind a hero;
- dark indigo AI architecture/dashboard card;
- pulsing green online/ready dots;
- model name or latency in patient UI;
- pill label above most headings;
- three nearly identical icon cards in a row;
- metric strip with large invented numbers;
- full-width brand-color CTA banner;
- generic doctor initials inside circles;
- glassmorphism or excessive large rounded rectangles;
- centered heading/paragraph/grid repeated more than once;
- chatbot floating bubble;
- ChatGPT-style generic alternating bubbles as the whole triage design;
- auth form inside a floating glass card over a gradient;
- testimonial carousel or stock doctor imagery;
- decorative medical crosses repeated as filler;
- more than one primary filled CTA in the same viewport;
- any horizontal overflow at 390px;
- any dark-mode text below required contrast.

The agent must include a `design/ANTI_TEMPLATE_REVIEW.md` checklist with a
before/after screenshot and evidence for every item.

## 21. Definition of done

“Done” means all of the following, not merely that `next build` succeeds:

- Figma access and exact node mapping are documented.
- User approved desktop/mobile homepage, triage, auth, and emergency frames.
- Current generic visual composition was replaced, not reskinned.
- No fabricated clinic fact remains.
- Registration/login/recovery/session/account flows work end-to-end with a real
  database and email verification mechanism.
- Routine and emergency triage work through `localhost:3000` without
  `Failed to fetch`.
- Offline backend is reported honestly.
- All required pages are responsive and have no horizontal overflow.
- Light/dark/reduced-motion/accessibility gates pass.
- Performance budgets are measured and met or deviations approved.
- Security/privacy checklist and threat model are complete.
- Production build and all automated tests pass.

## 22. Handoff report

Provide:

1. implemented route map;
2. Figma file/page/node inventory and mapping;
3. before/after screenshots at all required viewports/themes;
4. verified-content sources and omitted placeholders;
5. auth architecture, database migrations, email setup, and session policy;
6. BotMedical proxy/API contract and E2E results;
7. accessibility and keyboard evidence;
8. Lighthouse/Web Vitals measurements;
9. visual regression result;
10. anti-template checklist;
11. security/privacy threat-model summary;
12. exact commands to run locally and deploy;
13. known limitations and work still awaiting clinic/legal approval.

Do not claim completion when only mock auth, fake content, or static screens exist.
