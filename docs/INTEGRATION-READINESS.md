# PRIME WEBS AI — integration readiness

This document records what is implemented and what still needs a real provider, secret, or deployment step. It is a checklist, not a claim that integrations are live.

## Current verified state

- Existing dashboard, project list, project workspace, visual section editor, AI chat UI, templates, project-file viewer, customer records, credits view, Finance view, and Supabase client are present.
- The AI server route `/api/ai` exists and expects `ANTHROPIC_API_KEY`; the Claude key is intentionally not configured yet.
- The AI route falls back to the local demo generator when the server reports a missing configuration (503/404). Demo output is not production AI generation.
- Supabase has `profiles`, `projects`, `customers`, `user_settings`, `credit_accounts`, and `credit_transactions`. The owner credit account has `unlimited=true` and a starting balance of 50. The transaction ledger currently has no rows.
- The credit account and ledger tables exist, but no payment provider currently creates checkout sessions, verifies payment webhooks, or grants credits after payment.
- Finance entries are currently stored in browser-local storage. They are not bank transactions, payment-provider payouts, or a cloud accounting ledger.
- No Stripe/Paddle/Lemon Squeezy integration or live payment keys were found in the reviewed project configuration.
- Customer publishing still needs a secure host-to-project resolver and public-only published-site delivery. Domain fields/UI alone do not publish a customer website.
- The project-file panel now includes a persistent editable JSON source file (`site.json`) with basic schema checks and project history. The generated HTML output and README remain read-only. A full raw HTML/CSS/JS editor and arbitrary file tree are still missing.

## Current pricing — preserve unless owner approves a change

| Plan | Credits | Price |
| --- | ---: | ---: |
| Free | 50 one-time | €0 |
| Starter | 120 / month | €29 / month |
| Pro | 250 / month | €67 / month |
| Business | 500 / month | €126 / month |

The owner account must retain unlimited credits. New customer accounts should start with 50 credits.

## Payment integration sequence

1. Confirm the payment provider can onboard the account holder in Spain and confirm the business/tax requirements with a Spanish gestor before selling subscriptions.
2. Create provider products/prices matching the approved plan table.
3. Implement server-only checkout-session creation and customer portal/session management.
4. Implement signed webhook verification and idempotency for successful payments, renewals, cancellations, failed payments, refunds, and disputes.
5. Grant monthly credits only after verified provider events; record every grant and spend in `credit_transactions`.
6. Keep provider secrets only in Vercel Environment Variables. Never put them in browser settings, client JavaScript, Git, or a public document.
7. Test all flows in provider sandbox/test mode, including duplicate webhooks and failed/late payments.
8. Configure payout bank details directly in the verified payment-provider account. A provider generally settles funds to the configured bank on its payout schedule; this is not necessarily instant per transaction.
9. Only switch to live mode after the owner explicitly approves the provider, account status, legal setup, prices, and live credentials.

## Secret placeholders — do not populate until provider is selected

- `ANTHROPIC_API_KEY` — server-side AI provider key (deferred until core builder is ready).
- `PAYMENT_PROVIDER` — selected provider identifier.
- `PAYMENT_SECRET_KEY` — server-side provider secret.
- `PAYMENT_WEBHOOK_SECRET` — webhook signature secret.
- `PAYMENT_PRICE_FREE`, `PAYMENT_PRICE_STARTER`, `PAYMENT_PRICE_PRO`, `PAYMENT_PRICE_BUSINESS` — provider price IDs, if the selected provider uses them.
- `PUBLIC_APP_URL` — canonical app URL, currently `https://primewebs.site`.

These are architectural placeholders only; they are not current environment variables.

## Remaining product work

### Builder core
- Replace demo fallback with real AI only after the API key is safely configured.
- Build persistent source files (HTML/CSS/JS or a structured app source tree) with editable code and save/version history.
- Add safe AI file operations, preview/build validation, rollback, and export.
- Add multi-page routing and a secure publishing pipeline.

### Publishing and domains
- Resolve each verified hostname to one project server-side.
- Only serve projects explicitly marked public/published.
- Validate custom-domain ownership and configure wildcard DNS/SSL before advertising free subdomains as working.
- Add sitemap, robots.txt, canonical URLs, metadata, and public crawlable pages.

### Finance and subscriptions
- Replace browser-local manual entries with cloud-backed accounting records.
- Separate manual bookkeeping from verified payment events and payout records.
- Add invoices/receipts, subscription status, refunds, tax reports, and reconciliation.
- Do not display a payment as successful until a verified provider webhook confirms it.

### Security review items
- Two internal login-attempt tables have RLS enabled without client policies; keep them inaccessible to public client roles unless there is a demonstrated need.
- Review the SECURITY DEFINER grants on `public.is_primewebs_owner()` and `public.spend_credits(...)` before changing them; they may be intentional backend functions. Verify least privilege and owner checks.
- Enable leaked-password protection in Supabase Auth after reviewing the Auth settings.
- Re-run Supabase security and performance advisors after each approved schema/security change.
