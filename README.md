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
   - `ANTHROPIC_MODEL` (valgfri): standard er `claude-sonnet-5-5`
3. Deploy igen. Brug Supabase-e-mail-loginlinket på dashboardet.

Uden Anthropic-nøglen kører AI-generatoren i **demo-tilstand** med testgeneratoren, så dashboardets øvrige funktioner kan afprøves.

## Sikkerhed
- Læg aldrig nøgler eller adgangskoder i filerne eller i en chat. Repositoryet er offentligt.
- `api/ai.js` kontrollerer Supabase-sessionen, begrænser antallet af kald pr. minut og validerer AI'ens svar, før de når dashboardet.
- Projekter, kunder, brugerindstillinger og credits synkroniseres til Supabase. Finansposter og billeddata gemmes foreløbigt lokalt i browseren. Brug **Admin Panel → Lav sikkerhedskopi** jævnligt.

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

For rigtig AI-generering skal du tilføje `ANTHROPIC_API_KEY` som en hemmelig miljøvariabel i Vercel. Nøglen fra Anthropic Console må aldrig lægges i GitHub eller browseren. Uden nøglen falder AI-generatoren tilbage til demo-tilstand.