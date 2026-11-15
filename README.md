# PRIME WEBS AI

**Åbn dashboardets filer**
- [PRIME WEBS AI – dashboard (HTML)](dashboard/primewebs-dashboard.html)
- [Dashboardets startfil](index.html)
- [Projektets noter](docs/PRIME-WEBS-AI-projektnoter.md)

**Repository:** https://github.com/primwebs/primewebs.ai

> Bemærk: HTML-filen på GitHub viser kildekoden. For at køre dashboardet som en hjemmeside skal projektet publiceres via en hostingtjeneste.

## Sådan sætter du AI-serveren op (Vercel)
1. Importér repositoryet i Vercel (Add New → Project).
2. Under Settings → Environment Variables tilføjer du:
   - `ANTHROPIC_API_KEY`: din nøgle fra console.anthropic.com
   - `ACCESS_CODE`: en adgangskode, du selv vælger (lang og svær at gætte)
   - `ANTHROPIC_MODEL` (valgfri): standard er `claude-sonnet-5-5`
3. Deploy igen. Åbn dashboardet, gå til **Indstillinger**, og skriv samme adgangskode i feltet **AI-adgangskode**.

Uden nøgle eller adgangskode kører dashboardet i **demo-tilstand** med testgeneratoren, så alt kan stadig prøves.

## Sikkerhed
- Læg aldrig nøgler eller adgangskoder i filerne eller i en chat. Repositoryet er offentligt.
- `api/ai.js` kræver adgangskoden, begrænser antallet af kald pr. minut og validerer AI'ens svar, før de når dashboardet.
- Hjemmesider, kunder og indstillinger gemmes i browseren. Brug **Admin Panel → Lav sikkerhedskopi** jævnligt. Adgangskoden er ikke med i sikkerhedskopien.

## Filer
- `index.html`, `app.js`, `styles.css`: dashboardet (den version, der er i brug)
- `api/ai.js`: serverfunktion til AI (nøglen forlader aldrig serveren)
- `dashboard/` og `primewebs-dashboard.html`: ældre kopier, bevaret som arkiv og ikke opdateret
- `website/primewebs.html`, `primewebs.html`: salgssiden
- `docs/`: projektnoter

## Login og database (Supabase)

Dashboardet bruger Supabase Auth med e-mail-loginlink. Projekter, kunder, brugerindstillinger og credits synkroniseres til Supabase; finansposter og billeddata bliver foreløbigt gemt lokalt i browseren.

Vercel har brug for disse offentlige variabler (de er allerede oprettet på projektet):
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`

I Supabase → Authentication → URL Configuration skal Site URL sættes til den primære dashboardadresse, og Redirect URLs skal tillade:
- `https://primewebsai.vercel.app/**`
- `https://primewebsai-git-feature-supabase-auth-cloud-sync-primwebs.vercel.app/**`

Ejerkontoen `primewebssupport@gmail.com` får rollen `owner` og ubegrænsede credits via database-triggeren. Andre brugere får egne data og en almindelig credit-konto. RLS er aktiveret på tabellerne.

## AI-server

For rigtig AI-generering skal du selv tilføje følgende hemmelige miljøvariabler i Vercel:
- `ANTHROPIC_API_KEY`: API-nøgle fra Anthropic Console (må aldrig lægges i GitHub eller browseren).
- `ACCESS_CODE`: en lang, selvvalgt adgangskode. Den samme kode indtastes i dashboardets AI-indstillinger.

Uden disse to værdier falder AI-generatoren tilbage til demo-tilstand.