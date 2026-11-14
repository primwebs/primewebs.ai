# Supabase database setup — PRIME WEBS AI

This is the first isolated database foundation for the existing PRIME WEBS AI repository. It does not replace the dashboard or its current browser storage.

## Included
- profiles: identity and database-controlled roles
- credit_accounts: per-user credits; owner account is unlimited
- projects: website JSON, history, future state and chat
- customers and user_settings
- credit_transactions: usage ledger
- Row-level security so ordinary users can access only their own records
- Supabase Auth trigger that creates a profile and credit account at signup
- Atomic credit spending through the spend_credits database function

## Owner account
The trigger assigns the owner role only when the email in Supabase Auth exactly matches primewebssupport@gmail.com (case-insensitive). Configure Supabase to require verified email addresses. The role is assigned by a database trigger, not editable user metadata. The owner receives unlimited credits. No password is stored in source code or GitHub.

## Apply it
1. Create a Supabase project in the owner's own Supabase account.
2. Open SQL Editor → New query.
3. Copy and run supabase/migrations/20261115000100_initial_schema.sql.
4. In Authentication → Providers, enable Google and Email. Configure Google OAuth credentials in Supabase and add the callback URL shown in Supabase to the Google Cloud OAuth client's authorized redirect URIs.
5. In Authentication → URL Configuration, set the production site URL and allowed redirect URLs for the PRIME WEBS AI deployment.
6. Add the Supabase project URL and publishable/anon key to deployment environment variables only. Keep the service-role key secret and server-side only.

## Important status
This migration is a database schema foundation, not a completed production login integration. The existing app still uses localStorage and has a separate optional GitHub OAuth flow. Do not announce database persistence, Google login, or user isolation as live until application integration is implemented, environment variables are configured, the migration is applied, and end-to-end tests pass.

## Safety
- Never commit Supabase keys, OAuth client secrets, passwords, or session secrets.
- Do not enable public table access.
- Do not delete or overwrite existing local project data during migration. Future sync must import and verify it before switching reads and writes to the database.
- Test with a non-owner account to verify cross-account reads and writes are denied.
