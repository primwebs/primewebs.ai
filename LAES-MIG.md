# PRIME WEBS AI – komplet kopi

Dato for kopien: 10. november 2026

## Sådan starter du dashboardet
1. Pak ZIP-filen ud (højreklik, Udpak alle).
2. Dobbeltklik på `dashboard/primewebs-dashboard.html`. Den åbner i din browser. Der skal ikke installeres noget, og den kræver ikke internet.

`dashboard/src/` indeholder den samme kode delt op i `index.html`, `styles.css` og `app.js`, hvis du vil redigere dem hver for sig. Åbn `dashboard/src/index.html` for at starte den opdelte version.

## Indhold
- `dashboard/primewebs-dashboard.html`: hele dashboardet i én fil (12 menusider, AI Website Builder, AI Chat Editor, kunder og credits, statistik, indstillinger, Admin Panel, sikkerhedskopi/gendannelse). Du er OWNER/ADMIN med ubegrænsede credits.
- `dashboard/src/`: samme kode opdelt i HTML, CSS og JavaScript.
- `website/primewebs.html`: den offentlige salgsside.
- `docs/PRIME-WEBS-AI-projektnoter.md`: instruktioner, arkitektur, status og næste skridt.
- `checksums.txt`: kontrolsummer, så du kan se, at filerne er uændrede.

## Dine data
Hjemmesider, kunder og indstillinger gemmes i browseren, ikke i filerne. En fil på din PC starter derfor tom, første gang den åbnes. Flyt dine eksisterende data således:
1. Åbn det udgivne dashboard, gå til **Admin Panel**, klik **Lav sikkerhedskopi**, og kopiér teksten ind i en fil, fx `backup.json`.
2. Åbn dashboardet fra din PC, gå til **Admin Panel**, indsæt teksten under **Gendan**, og bekræft.
Lav en ny sikkerhedskopi jævnligt. Data ligger separat i hver browser, og hvis du rydder browserdata, forsvinder det.

## Hvad der ikke er med (findes ikke endnu)
Claude API, server, database, rigtigt login, rigtig publicering og egne domæner, betaling. AI'en i dashboardet er en testgenerator. Der er ikke tilsluttet nogen betalte tjenester.
