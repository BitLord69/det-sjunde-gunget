# Guide: Koppla bandets domän på Loopia till Vercel inför lansering

**Fråga:** För att lansera nu till helgen och koppla in sajten på vår egna domän – var gör man bäst ändringen, på Vercel eller på Loopia?

**Svar:** Man gör ändringen på **båda ställena i samarbete**. Det bästa och säkraste är att **behålla Loopia som DNS-hanterare** och peka om trafiken till Vercel med A- och CNAME-poster. 

> 🚨 **KRITISK UPPTÄCKT (LÖSNING PÅ DINA PROBLEM):**
> Just nu är `sjundegunget.se` inställd på **"Dold vidarebefordran (Ram/Frameset)"** i Loopia. Detta innebär att besökarens webbläsare laddar Vercel inuti en HTML-iframe/ram. Modern säkerhet i webbläsare (Chrome, Safari, Edge) **blockerar alla tredjepartscookies i iframes**! Det är därför:
> 1. Cookie-bannern poppar upp vid varje sidvisning (webbläsaren tillåter inte att spara cookie i iframe).
> 2. Admin och gig-sparning tappar session/inloggning eller blockeras.
> 3. Favicon saknas (Loopias yttre ramsida saknar favicon).
> 4. Facebook & bildfiler blockeras p.g.a. cross-origin/iframe-skydd.
> 
> **Lösning:** Stäng omedelbart av Loopias "Dold vidarebefordran" och lägg istället in de två DNS-posterna (A-post och CNAME) enligt guiden nedan!

---

### Steg 1: På Vercel (Janis gör detta)
1. Logga in på [Vercel Dashboard](https://vercel.com) och gå till projektet `det-sjunde-gunget`.
2. Gå till **Settings** -> **Domains**.
3. **Huvuddomän (`sjundegunget.se`):**
   - Klicka **Add** och skriv `sjundegunget.se`.
   - Vercel föreslår automatiskt att även lägga till `www.sjundegunget.se` och sätta en automatisk redirect till huvudadressen (rekommenderat: `www.sjundegunget.se` redirectar till `sjundegunget.se`).
4. **Extra domän (`detsjundegunget.se`):**
   - Klicka **Add** och skriv `detsjundegunget.se`.
   - Välj **Redirect to `sjundegunget.se`** (Status code: 308 eller 301 Permanent Redirect).
   - Klicka **Add** igen och skriv `www.detsjundegunget.se` med **Redirect to `sjundegunget.se`**.
5. Nu har ni alla 4 adresser registrerade i Vercel med automatisk SSL och vidarebefordran!

---

### Steg 2: På Loopia (Jonas gör detta i Loopia Kundzon)
Gör följande för **BÅDA** domänerna (`sjundegunget.se` och `detsjundegunget.se`):

1. Logga in på [Loopia Kundzon](https://www.loopia.se).
2. Klicka på domännamnet.
3. Kontrollera under fliken **Webbplats** att det **INTE** finns någon aktiv "Dold vidarebefordran (Ram/Frameset)". Om det finns: stäng av den omedelbart!
4. Gå in på **DNS-editor** (under domäninställningar).
5. Lägg till eller ändra följande två poster:

#### 1. Rotdomänen (huvudadressen utan www)
- **Subdomän:** Lämna tomt (eller `@`)
- **Typ:** `A`
- **Värde / IP:** `216.198.79.1` *(Vercels aktuella Anycast-IP som visas på er Vercel Dashboard – använd inte den äldre 76.76.21.21)*
- **TTL:** 3600 (eller standard)

#### 2. WWW-adressen
- **Subdomän:** `www`
- **Typ:** `CNAME`
- **Värde / Mål:** `cname.vercel-dns.com.` *(notera eventuell punkt i slutet beroende på Loopias gränssnitt)*
- **TTL:** 3600 (eller standard)

*(Repetera samma sak för `detsjundegunget.se` så att även den pekar A-post och CNAME till Vercel).*

---

### Vad händer sen?
1. DNS-ändringarna sprids normalt på **5–30 minuter** (ibland upp till ett par timmar).
2. Vercel känner automatiskt av när posterna pekar rätt och visar gröna bockar (✅ *Valid Configuration*) på alla 4 domänvarianter.
3. Vercel genererar automatiskt kostnadsfria och förnybara **SSL/HTTPS-certifikat** för samtliga adresser.
4. Oavsett om en besökare skriver `sjundegunget.se`, `www.sjundegunget.se`, `detsjundegunget.se` eller `www.detsjundegunget.se` hamnar de direkt på bandets officiella sajt med perfekt kryptering, sparade kakor och full funktionalitet! 🎸🚀
