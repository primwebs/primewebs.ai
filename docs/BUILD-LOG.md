# PRIME WEBS AI — build log

Last updated: 2026-11-16

## Active development branch

- Repository: `primwebs/primewebs.ai`
- Branch: `feature/sitedrop-modernization`
- Draft pull request: https://github.com/primwebs/primewebs.ai/pull/13
- PR #13 is stacked on `feature/modern-dashboard-finance-readiness` (draft PR #12 to `main`).
- Neither PR is merged. Nothing in this log is a claim of production deployment.

## Work completed on this branch

1. Login visual redesign:
   - Responsive desktop split layout and mobile layout.
   - New brand panel, refined form fields, focus states, accessible status message and reduced-motion support.
   - Existing login form IDs and handlers preserved. No auth credentials or login behavior changed.
2. Project source editor:
   - Editable `index.html`, `styles.css`, and `script.js` tabs added beside `site.json`.
   - Source files are included in the sandboxed preview and generated HTML download.
   - Basic JS syntax check, CSS brace check, 500 KB per-file cap, and source download.
   - Capped source snapshot history and a one-step restore action.
3. Supabase project persistence:
   - Source files and source history are stored as reserved properties inside the existing `projects.site` JSONB value.
   - Load/save serialization extracts and removes those reserved keys before exposing `site.json` to the editor.
   - No schema, RLS, grants, auth, or production database changes were made.
4. SEO:
   - Visual builder controls for description, language, social preview image, and canonical URL.
   - Generated HTML includes description, Open Graph title/description/image, Twitter card, and canonical URL where supplied.
   - URL controls require HTTPS.
5. Documentation:
   - `docs/INTEGRATION-READINESS.md` updated with completed work and the next implementation queue.

## Verification completed

- `app.js` parses with V8.
- `pw-supabase.js` parses with V8.
- Existing login form/input/status IDs each appear exactly once.
- Tested source-file pack/unpack round-trip: source and history persist in the existing JSONB payload and reserved fields are stripped from editor-facing site JSON.
- Tested HTML/CSS/JS injection into preview output, including HTML fixtures with and without head/body tags.
- Responsive login and editor CSS selectors confirmed present.

## Not done / do not claim as complete

- No production deployment; Vercel team access previously returned an authorization error.
- No merge to `main`.
- No live Anthropic key or real AI generation. Claude API key intentionally deferred.
- No payment provider, checkout, webhook, or payouts.
- No public customer-site host routing, wildcard DNS, or automatic custom-domain SSL.
- No lead-data provider.
- No transactional email/contact-form delivery provider.
- No arbitrary file tree, multi-page site routing, language-aware editor diagnostics, or safe AI file patch engine.
- No Supabase schema/RLS/security policy changes.

## Next safe work items

1. Add an actual preview/build test harness for source editor cases.
2. Build multi-page project structure and navigation.
3. Add validated AI file patch operations and rollback once AI provider credentials are authorized.
4. Build secure public publishing and domain-to-project resolution.
5. Add sitemap/robots generation as part of the public publishing pipeline.
6. Add contact-form submissions and transactional email adapter.
7. Connect legitimate lead discovery provider and enforce source/API usage limits.
8. Add cloud finance records and payment integration after provider and legal onboarding.
9. Complete Supabase security review and enable leaked-password protection after checking current Auth settings.
10. Re-test, review PR #12 and PR #13 together, then request Vercel team authorization before any production deployment.
