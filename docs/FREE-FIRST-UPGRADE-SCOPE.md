# PRIME WEBS AI — free-first upgrade scope

This branch adds no new paid vendor, API key, subscription, or payment integration.

## Implemented in this branch

- Automatic Lead Finder using public OpenStreetMap/Nominatim + Overpass data.
- Search by area and business category, with 25/50/100 result caps.
- Website-missing filter, available public phone/email/address fields, opportunity score, and save-to-Lead-History actions.
- Basic request throttling and short server-side result caching.
- OpenStreetMap attribution and clear warnings that missing website data is not proof that a business has no website.
- Local Design Agent presets that apply coordinated colors, gradient backgrounds, surfaces, typography and radius without an AI API call.
- Drag-and-drop section reordering in the Visual Editor; the existing move-up/move-down controls remain available for touch devices.
- Existing manual lead creation, Lead History, Ring and Only Call are retained.

## Cost and data limitations

- OpenStreetMap data is open data; public Nominatim and Overpass servers are shared community infrastructure, not a guaranteed commercial SLA. The scanner is deliberately rate-limited and should be treated as a low-volume starter tool. Coverage and contact details vary by city and contributor data.
- Real AI generation and AI chat continue to use the existing Anthropic API route. Those calls can incur usage charges. The new Design Agent presets do not call an AI API.
- No Google Maps scraping or Google Places billing has been added.
- No Instagram/social publishing, paid API, payment processor, subscription checkout, or paid domain registration has been added.

## Publishing boundary

- Existing HTML/ZIP export remains available.
- The current domain centre is not a live registrar or hosting integration.
- Vercel Hobby is documented for personal, non-commercial use, so it should not be treated as a free commercial hosting solution for customer sites.
- Cloudflare Pages offers a free static hosting tier with published limits, but automatic customer-site publishing still requires the owner's Cloudflare account and a server-side API token. It is not enabled in this branch.
- A custom domain still needs to be owned/registered and configured. No domain is purchased by this code.

## Payment and invoices

- Finance remains a manual ledger. It is not connected to a bank, checkout, card processor, recurring billing, tax calculation, or automatic payouts.
- Automatic revenue collection requires a payment provider and normally incurs transaction fees. No provider has been connected.
- A future no-subscription-cost option is to generate downloadable invoices locally, but that is separate from accepting payments.

## Validation

- app.js syntax parsed in the V8 JavaScript parser.
- api/lead-finder.js syntax parsed in the V8 JavaScript parser.
- The scanner endpoint was exercised with mocked Nominatim and Overpass responses; it returned normalized business records.
- Browser testing against live OpenStreetMap services, Supabase persistence, and end-to-end testing on a deployed preview remain outstanding.
