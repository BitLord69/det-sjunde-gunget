---
name: prestanda
description: Utför en fullständig och djupgående teknisk revision av projektet med fokus på Modularitet, Kodkvalitet, Säkerhet och Prestanda. Triggas direkt vid kommandot /prestanda, eller när användaren efterfrågar en prestandakoll, säkerhetsrevision, kodkvalitetsgranskning eller arkitekturgenomgång.
---

# Prestanda- & Kvalitetsgranskning (/prestanda)

När användaren anropar `/prestanda` eller ber om en genomgång av prestanda, modularitet, säkerhet och kodkvalitet, ska följande steg och principer följas:

## Arbetsflöde & Granskningsområden

1. **Modularitet & Arkitektur:**
   - Granska komponentstrukturen och återanvändning (t.ex. delade formulär, rubriker, navigering).
   - Identifiera eventuell duplicerad affärslogik eller hjälpfunktioner och överväg composables/utilities.
   - Kontrollera att design-tokens och ikoner är enhetliga och inte hårdkodas på flera ställen.

2. **Kodkvalitet & Typsäkerhet:**
   - Kör typkontroll (`pnpm nuxi typecheck` eller projektets motsvarighet).
   - Kör projektets linter (`pnpm lint`) och analysera fel samt varningar.
   - Kontrollera hantering av `any`, outnyttjade importer och felhantering i API:er och composables.
   - Säkerställ att internationalisering (i18n) är synkroniserad mellan språkfiler och fri från kompileringsfel.

3. **Säkerhet:**
   - Granska administrativa endpoints så att sessionskontroll och autentisering alltid anropas överst.
   - Kontrollera filuppladdnings-endpoints (säker filnamnsgenerering, strikt MIME-typs-whitelisting och maxstorleksgränser).
   - Inspektera input-validering (t.ex. Zod-scheman) och skydd mot XSS/HTML-injektion och SQL-injektion.
   - Verifiera lösenordshashning (PBKDF2/Argon2/bcrypt) och konstanttidsjämförelser (`timingSafeEqual`).

4. **Prestanda & Resursanvändning:**
   - Inspektera bildhantering (användning av dedikerade bildoptimerare som `<NuxtImg>`, moderna format som WebP/AVIF och `loading="lazy"`).
   - Kontrollera typsnittsladdning och layout-skiftningar (CLS).
   - Verifiera HTTP Cache-Control headers på publika data- och innehålls-API:er för att minimera onödiga databasfrågor.
   - Granska rendering och eventuella onödiga omrenderingar eller hydreringsproblem.

## Rapport & Åtgärdsregler

- **Inga automatiska ändringar:** Utför ALDRIG några ändringar i koden under revisionen utan användarens explicita godkännande ("OK").
- **Språk:** Alltid på ren och professionell **svenska**.
- **Kopierbart Markdown-format:** Rapporten ska alltid levereras innesluten i ett enda kopierbart kodblock med språktaggen `markdown`:
  ````markdown
  # Teknisk Granskning — [Projektnamn] (/prestanda)
  
  ## 1. Modularitet & Arkitektur
  ...
  ## 2. Kodkvalitet & Typsäkerhet
  ...
  ## 3. Säkerhet
  ...
  ## 4. Prestanda & Laddtider
  ...
  ## 5. Konkreta Förbättringsförslag (Kräver godkännande innan åtgärd)
  ...
  ````
- **Dedikerad Idésektion:** Nya idéer och optimeringar ska alltid samlas under en separat rubrik och invänta användarens godkännande innan de införs.
