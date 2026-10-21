# Guide: Koppla bandets domän på Loopia till Vercel inför lansering

**Fråga:** För att lansera nu till helgen och koppla in sajten på vår egna domän – var gör man bäst ändringen, på Vercel eller på Loopia?

**Svar:** Man gör ändringen på **båda ställena i samarbete**. Det bästa och säkraste är att **behålla Loopia som DNS-hanterare** och peka om trafiken till Vercel med A- och CNAME-poster. 

> ⚠️ **OBS till Jonas:** Byt **inte** namnservrar helt till Vercel, för då slutar all band-e-post på domänen att fungera om den ligger hos Loopia. Följ bara stegen nedan!

---

### Steg 1: På Vercel (Janis gör detta)
1. Logga in på [Vercel Dashboard](https://vercel.com) och gå till projektet `det-sjunde-gunget`.
2. Gå till **Settings** -> **Domains**.
3. Lägg till er domän (t.ex. `det7egunget.se`).
4. Vercel föreslår automatiskt att även lägga till `www.det7egunget.se` (där den ena redirectar till den andra). Välj vilken ni vill ha som huvudadress.

---

### Steg 2: På Loopia (Jonas gör detta i Loopia Kundzon)
1. Logga in på [Loopia Kundzon](https://www.loopia.se).
2. Klicka på domännamnet och gå in på **DNS-editor** (under domäninställningar).
3. Lägg till eller ändra följande två poster:

#### 1. Rotdomänen (huvudadressen utan www)
- **Subdomän:** Lämna tomt (eller `@`)
- **Typ:** `A`
- **Värde / IP:** `76.76.21.21`
- **TTL:** 3600 (eller standard)

#### 2. WWW-adressen
- **Subdomän:** `www`
- **Typ:** `CNAME`
- **Värde / Mål:** `cname.vercel-dns.com.` *(notera eventuell punkt i slutet beroende på Loopias gränssnitt)*
- **TTL:** 3600 (eller standard)

*(Tips: Om det finns någon aktiv vidarebefordran, "Under konstruktion"-sida eller parkerad sida påslagen i Loopia under fliken Webbplats/E-post, se till att den inte blockerar DNS-inställningarna).*

---

### Vad händer sen?
1. DNS-ändringen sprids normalt på **5–30 minuter** (ibland upp till ett par timmar).
2. Vercel känner automatiskt av när posterna pekar rätt och visar en grön bock (✅ *Valid Configuration*).
3. Vercel genererar automatiskt ett kostnadsfritt och förnybart **SSL/HTTPS-certifikat** (det gröna hänglåset i webbläsaren).
4. Sajten är därefter helt live på er officiella domän! 🎸🚀
