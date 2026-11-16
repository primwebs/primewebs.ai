# PRIME WEBS AI – byggejournal

Sidst opdateret: 16. november 2026

## Arbejdsregler
- Fortsæt i den eksisterende kodebase; start ikke forfra.
- Arbejd på `work/primewebs-ai-completion`, ikke direkte på `main`.
- Ingen nye betalte tjenester eller køb uden særskilt godkendelse.
- Claude API-nøglen tilføjes først til sidst og kun som Vercel server-side environment variable.
- Owner/admin skal have ubegrænsede credits; almindelige brugere skal have deres egne creditkonti.
- Påstå ikke at en funktion virker, før den er testet.

## Gennemført i denne arbejdsrunde
- Oprettet separat GitHub-arbejdsgren: `work/primewebs-ai-completion`.
- Tilføjet et visuelt designlag til `styles.css`: mørk premium workspace, lilla accent, tydeligere hierarki, kort, formularer, navigation, editor og mobiltilpasning. Eksisterende light theme er bevaret.
- Tilføjet ZIP-eksport i projektets filområde. ZIP indeholder `index.html`, `site.json` og `README.md`.
- Vercel preview-deployment er bygget og har status READY:
  - URL: https://primewebs-8w6dmtwwf-primwebs.vercel.app
  - Branch: `work/primewebs-ai-completion`
  - Commit: `4731adf25be382a22085f5aa7dceb640364fd4f5`
- Produktionsgrenen `main` er ikke ændret, og ingen produktionsdeployment er foretaget.

## Kendte mangler, som stadig skal bygges eller testes
- Rigtig Claude-generering og chatredigering: serveradapteren findes, men mangler ejerens `ANTHROPIC_API_KEY`; den tilføjes til sidst.
- Projektfiler er foreløbig genererede downloads; en fuld kodeeditor med filskrivning, preview-refresh og versionsstyring mangler.
- Domænecenteret er UI/placeholder; ingen live domænesøgning, køb, DNS, SSL eller automatisk deployment pr. kunde.
- Booking er i øjeblikket en e-mailforespørgsel, ikke et rigtigt bookingsystem med kalender, tilgængelighed og bekræftelser.
- Betaling og abonnementer er ikke tilsluttet. Ingen udbyder vælges eller aktiveres uden særskilt godkendelse.
- Lead Finder og Finance skal gennemgås for cloud persistence, adgangskontrol og test; nuværende visning beskriver dele som lokale data.
- Gennemgå Supabase RLS, roller, credit-transaktioner, session/login og sikkerhedsrådgivninger før offentlig lancering.
- Test på mobil og desktop, herunder login, oprettelse, redigering, eksport, dataisolering og fejlhåndtering.

## Næste prioritet
1. Gennemgå hele appens navigation og alle knapper for placeholder-/døde handlinger.
2. Gør projektdata, kunder, leads, indstillinger og finance konsekvent cloud-baserede og brugerafgrænsede.
3. Byg robust fil-/kodeeditor og projektversioner.
4. Byg reel publiceringspipeline uden domænekøb som forudsætning (Vercel preview/publicering på eksisterende host).
5. Forbered betaling som en adapter, men vent med aktivering til ejerens valg.
6. Tilslut Claude API-nøglen til sidst og gennemfør ende-til-ende test.

