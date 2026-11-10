# PRIME WEBS AI – projektnoter

## Mål
Egen AI website-builder-platform (på niveau med SiteDrop AI): kunder opretter projekter, AI genererer komplette hjemmesider, de redigeres via chat, og ændringer ses live. Senere: login, gemte projekter, credits, abonnementer, admin, publicering, egne domæner og eksport.

## Faste regler for udviklingen
- Byg altid videre på den eksisterende kode. Start aldrig forfra, og bevar eksisterende funktioner og projekter.
- Ejeren er ikke programmør: teknisk arbejde klares af Claude. Brugerfladen er på dansk.
- Ejerens konto har rollen OWNER/ADMIN og ubegrænsede interne credits, som aldrig trækkes.
- Tilslut ikke betalte tjenester eller betalingssystemer uden ejerens godkendelse.
- Platformen skal kunne hostes selv; kode og data ejes af ejeren. Undgå afhængighed af eksterne website-buildere.
- Påstå aldrig, at noget er gemt, bygget eller virker, hvis det ikke er verificeret.

## Arkitektur
- Hjemmesider er JSON (`site.meta.theme` + `site.blocks[]`, blokke: hero, features, about, contact). En renderer laver JSON om til HTML. Samme renderer bruges til preview, eksport og senere udgivelse.
- Adaptere, der skiftes ud, når backend kommer: `Storage` (localStorage nu, database senere), `Session` (lokal ejer nu, login senere), `Credits`, `Projects`, `Customers`, `Settings`, `AI` (testgenerator nu, Claude API via server senere).
- Claude API-nøglen må kun ligge på serveren.
- Projektobjekt: `{v, id, ownerId, customerId, name, status, domain, plan, site, history[], future[], chat[]}`.
- Data gemmes i browseren under nøglerne `pw.projects`, `pw.customers`, `pw.settings`, `pw.credits`.

## Filer
- `primewebs.html`: den offentlige salgsside (uændret).
- `primewebs-dashboard.html`: platformens dashboard (én fil, vanilla JS).

## Menu (12 sider)
Dashboard, Mine hjemmesider, Opret ny hjemmeside, AI Website Builder (redigér blokke direkte), AI Chat Editor (chat + live preview), Skabeloner, Domæner og publicering (domænenavn, status, HTML-eksport), Credits og abonnementer (udkast), Kunder og projekter (kunder med egne credits, tildeling), Statistik og analyser, Indstillinger, Admin Panel (roller, sikkerhedskopi, gendannelse).

## Status
Færdigt: testgenerator, JSON-sider, live preview, chat-redigering, blok-bygger, fortryd/gentag, ejerrolle med ubegrænsede credits, kunder med manuelle credits, skabeloner, HTML-eksport, sikkerhedskopi/gendan.
Mangler: Claude API via server, rigtigt login og database, rigtig publicering og egne domæner (DNS, SSL), betaling og abonnementer (kræver godkendelse), besøgsstatistik, ZIP-eksport.

## Næste skridt (forslag)
1. Lille server med Claude API (nøgle skjult) bag `AI.generate` / `AI.edit`.
2. Database og login (egen hosting), så projekter følger kunden.
3. Publicering og egne domæner.
4. Abonnementer, først efter ejerens godkendelse.
