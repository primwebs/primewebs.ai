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
- Hero/about images and gallery images can render when valid image URLs or stored image references already exist.
- A Three.js scene renderer exists. It supports built-in shapes and can load an uploaded GLB/GLTF model supplied as data.
- The app has local project helpers, project deduplication logic, browser storage, and a Supabase persistence adapter.
- Supabase tables include profiles, credit_accounts, projects, customers, user_settings, credit_transactions and booking_requests (verify exact live schema before any migration).
- Existing UI modules include finance/invoice screens, lead tools and domain screens; their presence does not prove external payment, lead-data or hosting integrations exist.

## 30 improvement opportunities — without duplicating existing work

### AI understanding, conversation and editing
1. **Longer, more useful edit memory — IMPLEMENTED ON THIS BRANCH.** Edit requests now include up to 14 recent chat messages, 1,600 characters each, with a 16 KB cap (previously 10 messages / 1,200 characters / 10 KB). Verify against real multi-turn edits.
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
