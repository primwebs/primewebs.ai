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

## Login: kun én e-mail har adgang (valgfrit)
Uden login kan alle, der kender adressen, åbne dashboardet. Sådan begrænser du adgangen til én e-mail:

1. GitHub → Settings → Developer settings → OAuth Apps → New OAuth App. Homepage URL: din Vercel-adresse. Callback URL: `<din Vercel-adresse>/api/auth/callback`. Kopiér Client ID, og opret en Client secret.
2. Vercel → Settings → Environment Variables, tilføj `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `SESSION_SECRET` (en tilfældig tekst på mindst 32 tegn), `ALLOWED_EMAIL` (den e-mail, der må logge ind, og som er bekræftet på din GitHub-konto) og helst `PUBLIC_URL`. Deploy igen.
3. Når alle fire er sat, kræver både dashboardet og AI-generatoren login. Kun en GitHub-konto med den bekræftede e-mail slipper ind.
4. Kommer du til at låse dig ude: slet en af variablerne i Vercel, og deploy igen. Så er login slået fra.

E-mailen ligger kun i Vercel og står ikke i koden. Koden i dette repository er offentlig, så login beskytter brugen af siden og AI-generatoren, ikke selve kildekoden.
