# PRIME WEBS AI — SiteDrop competitive audit

Audit date: 2026-11-21  
Scope: current `redesign/site-inspired-v1` source, connected Supabase project metadata/table inventory, and SiteDrop's public product pages and November 2026 changelog.

## Executive summary

Build on the existing platform. Do not recreate existing capabilities or replace the database. The most important next product improvement is the unified Website Studio: AI chat, live preview, responsive preview controls, and the existing section editor in one workspace.

The current redesign branch is a draft PR (#33) against `main`; it is not production. The audit and changes in this branch must not alter production or Supabase records.

## Existing PRIME WEBS AI capabilities verified in source

| Area | Verified implementation | Limitations / next step |
|---|---|---|
| AI site generation | `app.js` calls `/api/ai`; server adapter in `api/ai.js` supports generate/edit and provider selection | Verify deployed provider credentials and run end-to-end generation test |
| AI chat editing | `AI.edit` updates site JSON; chat transcript and undo history are stored per project | Chat and visual editor are separate screens; unified workspace is now being added |
| Live preview | Renderer builds the site into iframe `srcdoc` | Responsive controls currently limited; add tablet/mobile and improve refresh/selection |
| Visual section editor | Existing add/remove/reorder/edit controls and blocks for hero, services, pricing, team, FAQ, gallery, booking, map and 3D | Preserve this; do not rebuild it |
| Design and motion | Theme controls, animation levels, 3D blocks, image tools | Broaden curated design systems and image workflow |
| Templates | Existing template library and categories | Expand library and quality checks |
| Version history | `history[]` and `future[]`, undo/redo, per-project chat | Retain and expose clearly in the unified studio |
| Export | Existing HTML export and file area | ZIP/source export and deployment pipeline are separate missing tasks |
| Projects and customers | Project/customer adapters; Supabase sync for projects/customers | Test multi-user ownership and customer portal before scaling |
| Login and profiles | Supabase Auth client, profile and role model | Confirm production auth flow and role restrictions |
| Credits | Credit account/transaction schema and owner-unlimited logic | Verify all mutations are server-authoritative and transactionally safe |
| Booking requests | Public booking submission calls Supabase RPC; booking request table exists | No booking rows at audit time; test public submit, owner listing and status updates |
| Finance | Finance UI and local `pw.finance` storage | Manual/local records only; no payment processor, invoice delivery or subscription billing |
| Domains | Domain center UI and local domain fields | Search/availability/purchase/DNS/SSL are explicitly not connected; displayed prices are illustrative |
| Lead Finder | New preview-branch workspace: Google Maps query launcher, manual lead capture, searchable saved-lead list, delete action, and lead count | Live business search/results, deduplication, enrichment, provider-backed contact data and export are not connected; Google Maps opens externally |
| Social scheduler | No verified scheduler/publishing integration in the main app | Not implemented |
| Third-party connectors | No verified connector framework in the main app | Not implemented |

## Supabase inventory verified (read-only)

Project: `kovinmyvsjzunymapxxm`  
Status: `ACTIVE_HEALTHY`  
Database: PostgreSQL 17, region `eu-north-1`

Public tables (RLS enabled on all listed tables):
- `profiles` — 1 row
- `credit_accounts` — 1 row
- `customers` — 0 rows
- `projects` — 15 rows
- `user_settings` — 1 row
- `credit_transactions` — 0 rows
- `admin_code_attempts` — 0 rows
- `admin_login_attempts` — 0 rows
- `booking_requests` — 0 rows

No schema or data mutations were made during this audit.

## SiteDrop public product benchmark

Sources reviewed:
- https://sitedrop.ai/
- https://sitedrop.ai/whats-new
- https://sitedrop.live/
- https://sitedrop.live/pricing

SiteDrop's visible product areas include:
1. Dashboard/work-mode selection (websites for clients vs own website/app).
2. AI builder with prompt-led generation, guided wizard, templates and ZIP/HTML/Figma import.
3. Chat and visual editing, file attachments, queued prompts, photo studio and version history.
4. Live previews and responsive device sizes.
5. Hosting, instant publishing, custom domains, SSL and CDN.
6. Lead Finder with local business listings and website-presence filtering.
7. Finance: one-off invoices, recurring billing, user subscriptions and payment balances.
8. Post scheduler for Instagram, TikTok, Facebook and YouTube.
9. Project connectors (18 listed in November 2026 changelog), including Google Sheets/Docs/Drive, Notion, Trello, HubSpot, Typeform, Slack, Discord, Twilio, Cal.com, Calendly, Mapbox, Cloudinary, ElevenLabs, Algolia, Firecrawl and Exa.
10. Learning/help resources, plan/credit management and form-submission handling.
11. Premium photo-to-walkthrough video generation.

## Priority plan — avoid duplicate work

### P0 — Unified Website Studio (in progress)
- Put AI chat and live preview side by side in the existing visual builder.
- Keep existing section editing below the preview/chat workspace.
- Keep per-project chat, credits, history, and renderer unchanged.
- Add responsive preview sizes and ensure mobile layout remains usable.

### P1 — Quality and reliability
- Test AI generation and editing against the real server.
- Test saved projects, history/undo, preview rendering, image preservation, booking forms and mobile responsiveness.
- Verify Supabase ownership/RLS and server-side credit enforcement.
- Add error states and progress states without claiming unverified success.

### P2 — Publishing and domains
- Deploy each site to an isolated URL.
- Add custom-domain connection, DNS verification, SSL status and rollback/version publishing.
- Do not imply domain availability or prices until a real registrar API is connected.

### P3 — Lead Finder
- Preview branch now has a manual lead pipeline and Google Maps search launcher; no live search data is fabricated.
- Connect a legitimate business-data provider for in-app results.
- Search by location/category and filter no-website or outdated-website prospects.
- Add provider-backed save, deduplicate, export and convert leads to projects.

### P4 — Finance and billing
- Invoice creation/PDF/email and payment-status tracking.
- Recurring customer billing and subscription plans only after owner approval and provider selection.
- Do not invent payment success from locally recorded entries.

### P5 — Scheduler and integrations
- OAuth-based account connections and scheduled publishing.
- Add integrations one at a time with secure secret storage and clear scopes.
- Add photo/video walkthrough generation only after core builder/publishing is stable.

## Non-goals / safeguards

- Do not copy SiteDrop's source code, proprietary assets, exact text or brand identity.
- Match the broad product quality, workflow and design language using PRIME WEBS AI branding and original implementation.
- Do not remove or recreate existing editor, project, customer, booking, credit or Supabase functionality.
- Do not touch `main`, production deployment, Supabase schema or user data during preview work.
- Do not activate paid services or payment systems without the owner's approval.

## 2026-11-21 — current SiteDrop benchmark refresh

The current SiteDrop product update (November 2026) adds or emphasizes:
- An onboarding choice between building client websites and building a site/app for the user's own business.
- A dashboard that adapts to that work mode, with the ability to switch later.
- Payments on the user's own site, including one-off products and recurring plans.
- Photo-to-walkthrough video creation and scheduled social publishing.
- A broader integrations catalog (SiteDrop advertises 18 connected tools).

### PRIME WEBS AI implementation status
- Updated the workspace navigation order to put Dashboard, Builder, Templates, Lead Finder, Domains, Finance and University first, following SiteDrop's current core workflow.
- Existing routes are retained; no existing project/editor/customer/booking data is migrated or deleted by this navigation update.
- This navigation change does not imply that payments, video generation, social scheduling or the 18 integrations are implemented.

### Next build sequence
1. Add the first-run work-mode chooser (client websites vs own website/app) and make the dashboard/navigation adapt to the saved choice.
2. Complete the builder workflow: multi-page/app generation, chat edits, visual editor, responsive preview, version history and rollback.
3. Finish Lead Finder with a real licensed business-data provider, filters, contact enrichment, saved leads and lead-to-project creation.
4. Implement domains/hosting with DNS status, SSL status, publish history and verified deployment actions.
5. Build invoices and payment tracking first; add Stripe-powered customer checkout/subscriptions only after explicit owner approval and secure webhook implementation.
6. Add media/video generation, social scheduling and integrations only through real connected providers, OAuth scopes, secure secret storage and tested jobs.
7. Run end-to-end desktop/mobile QA and accessibility checks before production promotion.

Do not represent placeholder cards, local browser storage, or external search launchers as live provider integrations or completed SaaS features.
