# PRIME WEBS AI — AI Builder and product quality audit
**Date:** 2026-11-26  
**Scope:** Existing main-branch implementation, with the current AI editor context improvement recorded on `feature/ai-visual-chat-upgrade-20261126`. This is an implementation audit, not a claim that every item has passed browser-level QA.

## Guardrails
- Keep the existing app entry point (`index.html` + `app.js` + `styles.css`) and existing Supabase project/data.
- Do not rebuild existing modules or add parallel dashboard/editor systems.
- Do not change production/main while reviewing. Work on this feature branch and use a pull request for review.
- Payments, the full Lead Finder, and hosting/publication/domain automation are intentionally deferred to the final phase.
- A feature shown in the UI is not counted as complete until its real action and persistence are verified.

## Existing capabilities confirmed in source
- The current app contains an AI editor that calls `/api/ai`; it does not silently fall back to the demo generator when the API fails.
- The server supports Gemini generation with Anthropic fallback, and an optional Anthropic conversational reply layer when Gemini is the active website provider.
- Edit requests include the current site JSON and recent chat history.
- The renderer already supports multi-page site data and blocks including hero, features, about, services, pricing, team, steps, FAQ, CTA, gallery, booking, contact, reviews, map and threeD.
- Existing `ensureIndustry3D` adds industry-matched built-in 3D shapes (for example barber chair/pole, salon bottle/scissors, car/engine); `ensureIndustryImages` validates supplied image URLs/data and `keepImages` preserves existing images during edits. None of these functions retrieves new stock photographs or realistic 3D model files.
- Hero/about images and gallery images can render when valid image URLs or stored image references already exist.
- A Three.js scene renderer exists. It supports built-in shapes and can load an uploaded GLB/GLTF model supplied as data.
- The app has local project helpers, project deduplication logic, browser storage, and a Supabase persistence adapter.
- Supabase tables include profiles, credit_accounts, projects, customers, user_settings, credit_transactions and booking_requests (verify exact live schema before any migration).
- Existing UI modules include finance/invoice screens, lead tools and domain screens; their presence does not prove external payment, lead-data or hosting integrations exist.

## 30 improvement opportunities — without duplicating existing work

### AI understanding, conversation and editing
1. **Longer, more useful edit memory — IMPLEMENTED ON THIS BRANCH.** The frontend now sends up to 13 previous chat messages plus the current request; the server accepts up to 14 messages, 1,600 characters each, with a 16 KB cap (previously the frontend sent only 9 previous messages and the server allowed 10 / 1,200 characters / 10 KB). Verify against real multi-turn edits.
2. **Structured conversation memory — NEXT.** Preserve explicit preferences (language, colours, style, target audience, requested pages, constraints) as compact context instead of relying only on raw chat text.
3. **Intent classification — NEXT.** Distinguish questions, content edits, visual redesigns, new pages, image requests and functional requests before changing site JSON.
4. **Clarifying-question discipline — NEXT.** Ask one focused question only when a missing fact blocks a safe result; otherwise make a reasonable design decision.
5. **Change summaries — NEXT.** Return a concise, accurate summary of the actual changed blocks/pages, not a generic success message.
6. **Edit-scope protection — NEXT.** For a targeted edit, compare before/after and preserve unrelated page/block IDs, content and settings.
7. **Safer whole-site edits — NEXT.** Require all pages to be returned and validate that navigation, slugs and cross-page links remain connected.
8. **Repair/retry for malformed JSON — NEXT.** Add a bounded JSON-repair/validation retry for truncated or malformed model output, without silently replacing the real AI with demo output.
9. **Provider observability — NEXT.** Record provider, latency, retry/fallback and validation outcomes without logging secrets or sensitive site content.
10. **Regression prompt suite — NEXT.** Add repeatable Danish and English test cases for generation, short follow-ups, targeted edits, full redesigns, booking and multi-page preservation.

### Visual quality, images and 3D
11. **Real stock-image retrieval — BLOCKED BY MISSING PROVIDER.** The renderer accepts image URLs, but the AI prompt currently forbids inventing URLs and only permits existing images. There is no confirmed stock-image search provider/API in the current server code. Add a server-side image provider (for example Pexels/Unsplash with a server-side key) before promising automatic real photos.
12. **Image intent and placement — NEXT AFTER PROVIDER.** Search by business type, service, location/style and section; select relevant hero/service/gallery images rather than random decoration.
13. **Image quality and licensing metadata — NEXT AFTER PROVIDER.** Keep source, creator/credit and source URL where required; reject broken, irrelevant or low-resolution results.
14. **Responsive image delivery — NEXT.** Use suitable image sizes, lazy loading, aspect ratios and fallbacks; avoid huge base64 images in saved project JSON.
15. **Background-image support — PARTIAL.** The current hero/about renderer supports an image beside content, but there is no confirmed general-purpose section background-image schema. Add it only with explicit sanitizer and renderer support.
16. **3D asset library — MISSING.** Current Three.js renderer supports built-in primitive/illustrative shapes and uploaded GLB/GLTF data. It does not contain a verified catalog of realistic barber chairs, clippers, cars or other industry models.
17. **Realistic 3D defaults — NEXT.** Prefer a relevant, polished model when an asset exists; otherwise use a carefully styled image or illustration rather than presenting a crude box as realistic 3D.
18. **3D loading and failure states — NEXT.** Verify CDN/module loading, WebGL fallback, model parsing, sizing, lighting, controls, memory cleanup and mobile performance.
19. **Motion/accessibility controls — PARTIAL.** Animation preferences and reduced-motion guidance exist. Verify every animation respects reduced motion and does not block scrolling, text or CTAs.
20. **Visual design system — NEXT.** Improve varied section composition, typography, contrast, spacing and industry-specific art direction while preserving the current supported block schema.

### Builder, pages and reliability
21. **Multi-page navigation QA — NEEDS RUNTIME TEST.** Confirm page links, slugs, direct navigation, refresh and back navigation work for generated and edited pages.
22. **Booking flow QA — NEEDS RUNTIME TEST.** Confirm the booking page and form save real requests to the existing booking backend; distinguish request capture from calendar availability.
23. **Form delivery and validation — NEEDS RUNTIME TEST.** Verify success/error states, validation, spam protection and persistence for contact/booking forms.
24. **Responsive visual QA — NEEDS RUNTIME TEST.** Test 320, 375, 390, 768, 1024 and desktop widths, including overflow, navigation, images, tables and the chat/preview split.
25. **Editor save/reload QA — NEEDS RUNTIME TEST.** Verify every edit persists across refresh, sign-out/sign-in and a second device; confirm history undo/redo and project identity.
26. **Project deduplication safety — NEEDS TEST.** Existing content-based dedupe is present. Test genuinely different projects with similar content and ensure no valid project is removed or merged.
27. **Error states and diagnostics — NEXT.** Surface actionable provider/network/session errors, request IDs and safe diagnostic details rather than vague generic errors.
28. **Automated checks — MISSING/UNCONFIRMED.** The current package manifest contains no test scripts or dependency list. Add syntax/schema tests first, then browser smoke tests for critical flows.

### Deferred until the final phase (do not start now)
29. **Payments, subscriptions and automated invoicing — DEFERRED.** Existing Finance and invoice UI is not proof of a connected payment processor or recurring billing.
30. **Full Lead Finder and hosting/publication/domains — DEFERRED.** Existing Lead Finder/Domain screens are not proof of automated business-data retrieval, production hosting, SSL, DNS or one-click publication.

## Recommended implementation order
1. Finish the AI editor context/intent and safe-edit improvements (items 2–10).
2. Add a real image provider and image asset pipeline (items 11–15). Do not fabricate image URLs or claim this works until a provider is configured and tested.
3. Improve the existing 3D implementation and realistic asset path (items 16–19), not a second 3D engine.
4. Test and improve the existing builder, pages, forms, persistence and responsive behavior (items 20–28).
5. Only after those are solid, return to the deferred payments, full Lead Finder and hosting/publication work (items 29–30).

## Validation status
- Source inspection: completed for the current app entry point, AI API, renderer, styling and Supabase adapter at a preliminary code-review level.
- Live browser QA: not performed in this audit.
- Production deployment: not changed by this branch.
- Database schema/data: not changed.


## Live Supabase checks (read-only, 2026-11-26)
The connected project was inspected without changing schema or data.

- Confirmed tables: `profiles`, `credit_accounts`, `customers`, `projects`, `user_settings`, `credit_transactions`, `admin_code_attempts`, `admin_login_attempts`, `booking_requests`.
- RLS is enabled on all listed public tables. User-facing tables have owner/self policies. The two admin-attempt tables have no RLS policies; this is consistent with server-only access only if browser roles cannot access them. Keep that invariant and verify API access paths.
- Existing migrations include profile-role locking, admin login rate limiting and public booking submission.
- `spend_credits` checks `auth.uid()`, locks the caller's credit row, refuses invalid amounts and records transactions. Its SECURITY DEFINER warning should be treated as a privilege-review item, not blindly removed; confirm EXECUTE grants remain limited to authenticated users.
- `is_primewebs_owner` checks the caller's own profile role. Review its EXECUTE grants and SECURITY DEFINER ownership/search_path; do not remove it without replacing the existing RLS owner logic.
- `submit_booking` is intentionally callable by the public booking page and uses a per-site public key, validates input lengths/date and writes an owner-linked booking request. Its anon SECURITY DEFINER warning is therefore potentially intentional. Review key entropy/rotation, rate limiting and whether project selection is unambiguous before changing grants.
- Supabase security advisor also reports leaked-password protection disabled. This is an Auth dashboard setting, not a schema migration; enable after confirming the desired login policy.
- Performance advisor reports 9 RLS policies that re-evaluate `auth.uid()` per row and 4 currently unused indexes. These are optimization candidates only; do not rewrite policies or drop indexes without testing query plans and access behavior.
- Current table row counts show the workspace is lightly populated. Do not treat unused indexes as proof they are unnecessary; low traffic can explain this.


## Additional confirmed source-level findings
- **Resolved on main (2026-11-26):** the Website Studio now reads `S.miniTab` and provides working Design, Billeder, Preview and Versioner panels. Design controls update the site theme and animation settings; Billeder lists hero/about/gallery image references and lets the user replace URLs; Preview supports desktop/mobile; Versioner can restore a snapshot. The media panel is not a stock-photo search or upload provider.
- **Resolved/expanded on main (2026-11-26):** the existing visual section editor is now visible below the AI chat and live preview, with add/reorder/remove controls and editable fields. The GLB/GLTF upload input is now wired to FileReader and saves an embedded model up to 2 MB; external GLTF textures/files remain unsupported. This is still not a curated 3D asset library.
- The current 3D built-in barber chair is assembled from `BoxGeometry` and `CylinderGeometry` primitives. That explains why it can look blocky even though a Three.js scene and rotation controls exist. A realistic barber chair requires a proper model asset, not another primitive shape.
- **Partially resolved on main (2026-11-26):** the Billeder panel is now a working manager for existing image URLs across the homepage and subpages. Automatic stock-photo retrieval, licensing metadata, image upload/storage optimization and image search are still not connected.
- The generated contact form currently prepares a `mailto:` message and asks the visitor to press Send in their email app. It is not a server-delivered contact form. Booking requests, by contrast, have a Supabase RPC and a booking-request table.
- Statistics currently describe local workspace/project counts and AI edit activity; they are not real visitor analytics from Google Analytics or another traffic provider.
- The Domains UI explicitly says its search service is not active; displayed example TLD prices are static UI content and must not be treated as live quotes.


## Follow-up changes applied to production main (2026-11-26)

- **Project identity:** corrected the Supabase adapter UUID validator. The previous pattern omitted a UUID separator/segment length, so valid IDs could be regenerated during cloud reconciliation. A mock Supabase integration test now confirms valid IDs remain stable, an offline local project is merged into a non-empty cloud project list, and a newly generated project is upserted with the correct owner ID.
- **Project persistence:** local/cloud reconciliation now runs for each login and merges by stable project ID and updated timestamp rather than importing only when the cloud table is empty. Project/customer sync no longer deletes remote rows merely because a stale browser cache omitted them; explicit delete actions issue targeted database deletes. New project creation and AI edits wait for the write queue and surface a cloud-sync warning if the write fails.
- **Workspace data:** finance records, leads, image references, saved invoices, invoice draft, invoice lines, finance profile, billing-period preference and work-mode preference are included in the existing owner user_settings JSON payload. Invoice draft writes occur on change/blur rather than on every keystroke.
- **RLS performance:** applied migration 20261126225829_optimize_rls_auth_calls, wrapping stable auth helper calls in scalar SELECT expressions for nine policies. The performance advisor no longer reports the nine per-row auth re-evaluation warnings. Four unused indexes remain intentionally untouched because the workspace has low row counts and two indexes support admin rate-limit tables.
- **Website Studio:** exposed the pre-existing visual section editor, added working Design/Billeder/Preview/Versioner tabs, made the 3D upload input functional, added multiline text editing and retained the existing chat/preview layout. Dashboard card typography and spacing received a restrained polish; the existing overall visual direction was preserved.
- **Supabase media storage:** created the public-read `primewebs-media` bucket (20 MB file limit) with authenticated user-folder write/update/delete policies and owner access. The Billeder panel can upload JPG/PNG/WebP/GIF assets, and the 3D editor can upload GLB/GLTF files; project JSON stores public asset URLs rather than large image/model data URIs. Stock-photo search, automatic optimization and attribution management remain open.
- **AI model and image discipline:** switched the default Claude fallback to the currently active `claude-sonnet-5` API model. The image pipeline no longer creates a gallery on every new website; by default it uses a small set of relevant unique images, and only adds a gallery when the user explicitly asks for images or an existing gallery needs filling. Automotive sites are excluded from generic stock imagery and generic 3D blocks; the dedicated garage experience remains their only animation.
- **Automated checks:** added npm test source validation and a GitHub Actions workflow on pushes and pull requests. This is syntax and source-contract validation, not a substitute for browser-level end-to-end testing.

## Updated SiteDrop parity gaps

Based on SiteDrop's public November 2026 product notes, the largest remaining gaps are:
1. Stock-photo search/provider and automatic image optimization; direct user uploads now use Supabase Storage, with attribution preserved for sourced photos.
2. Full publication/hosting with isolated site URLs, custom-domain purchase/connection, DNS, SSL and rollback.
3. A provider-backed Lead Finder with real business results, website-presence filtering, deduplication and export.
4. A real contact-form inbox/server delivery and visitor analytics.
5. Integrated payments, recurring subscriptions and invoice/payment tracking.
6. A post scheduler for Instagram/TikTok/Facebook/YouTube.
7. Project-level connectors (SiteDrop lists 18 integrations) and a secure connector credential model.
8. Photo-to-walkthrough video generation.

Do not count these as implemented until the provider/backend action is connected and tested. Preserve the existing PrimeWebs architecture and Supabase project; do not add mock controls that imply an integration exists.
