<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth',
})

useSeoMeta({
  title: 'Hjälp & Bandmanual | Det 7:e Gunget Admin',
})

const searchQuery = ref('')

const printManual = () => {
  if (import.meta.client) {
    window.print()
  }
}

const scrollTo = (id: string) => {
  if (import.meta.client) {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }
}
</script>

<template>
  <div class="mx-auto max-w-7xl px-6 pt-3 pb-10 lg:px-10 space-y-6 font-sans">
    <!-- Top Navigation Bar for Admin Pages -->
    <AdminNavBar />

    <!-- Header Section -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-primary/20">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <span class="text-2xl">🎸</span>
          <h1 class="font-heading text-2xl sm:text-3xl text-primary font-bold tracking-wide">
            Hjälp & Manual för Bandet
          </h1>
        </div>
        <p class="text-sm text-base-content/80">
          En komplett guide till alla funktioner, inställningar och arbetsflöden på <strong class="text-primary">Det 7:e Gunget</strong>.
        </p>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          class="btn btn-outline btn-primary btn-sm rounded-full font-bold flex items-center gap-1.5"
          @click="printManual"
        >
          <span>🖨️</span>
          <span>Skriv ut / Spara PDF</span>
        </button>
        <NuxtLink
          to="/"
          target="_blank"
          class="btn btn-secondary btn-sm rounded-full font-bold flex items-center gap-1.5"
        >
          <span>🌐</span>
          <span>Öppna Publika Sajten ↗</span>
        </NuxtLink>
      </div>
    </div>

    <!-- Quick Navigation / Innehållsförteckning -->
    <div class="bg-base-200/80 p-5 rounded-2xl border border-primary/20 shadow-lg space-y-4">
      <h2 class="font-heading text-lg text-primary font-bold flex items-center gap-2">
        <span>📑</span> Snabbnavigering i Manualen
      </h2>
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs font-bold">
        <button
          type="button"
          class="btn btn-sm btn-ghost bg-base-100 hover:bg-primary/20 text-left justify-start border border-primary/10 rounded-xl"
          @click="scrollTo('sec-filosofi')"
        >
          1. Filosofi & Översikt
        </button>
        <button
          type="button"
          class="btn btn-sm btn-ghost bg-base-100 hover:bg-primary/20 text-left justify-start border border-primary/10 rounded-xl"
          @click="scrollTo('sec-publika-sidor')"
        >
          2. Publika Sidor
        </button>
        <button
          type="button"
          class="btn btn-sm btn-ghost bg-base-100 hover:bg-primary/20 text-left justify-start border border-primary/10 rounded-xl"
          @click="scrollTo('sec-paskagg')"
        >
          3. Påskägg & Interaktivitet
        </button>
        <button
          type="button"
          class="btn btn-sm btn-ghost bg-base-100 hover:bg-primary/20 text-left justify-start border border-primary/10 rounded-xl"
          @click="scrollTo('sec-admin')"
        >
          4. Admin-kontrollrummet
        </button>
        <button
          type="button"
          class="btn btn-sm btn-ghost bg-base-100 hover:bg-primary/20 text-left justify-start border border-primary/10 rounded-xl"
          @click="scrollTo('sec-arbetsfloden')"
        >
          5. Arbetsflöden (Scenarion)
        </button>
        <button
          type="button"
          class="btn btn-sm btn-ghost bg-base-100 hover:bg-primary/20 text-left justify-start border border-primary/10 rounded-xl"
          @click="scrollTo('sec-drift')"
        >
          6. Teknisk Drift
        </button>
      </div>
    </div>

    <!-- Sektion 1: Filosofi & Översikt -->
    <section id="sec-filosofi" class="space-y-4 pt-4">
      <div class="flex items-center gap-2 border-b border-primary/30 pb-2">
        <span class="text-xl">🎙️</span>
        <h2 class="font-heading text-xl sm:text-2xl text-primary font-bold">1. Översikt & Webbplatsens Filosofi</h2>
      </div>
      <div class="bg-base-200/50 p-5 sm:p-6 rounded-2xl border border-primary/20 space-y-3 text-sm leading-relaxed">
        <p>
          Webbplatsen för <strong>Det 7:e Gunget</strong> är skräddarsydd för ett 4-manna bluesrockband (alla 50+) med glimten i ögat. Tonen är varm, bluesig, humoristisk och modern – inte en dammig, stel kliché, utan full av energi och personlighet.
        </p>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div class="bg-base-100 p-4 rounded-xl border border-primary/10 space-y-1">
            <span class="text-primary font-bold text-sm">👌 Enkelt för alla fyra</span>
            <p class="text-xs text-base-content/80">Alla i bandet har eget konto och kan lägga in spelningar, foton, ackord och låtidéer direkt i mobilen eller datorn utan att kunna koda.</p>
          </div>
          <div class="bg-base-100 p-4 rounded-xl border border-primary/10 space-y-1">
            <span class="text-primary font-bold text-sm">📱 Mobilanpassat</span>
            <p class="text-xs text-base-content/80">Optimerat för fans som kollar speldatum på bussen och för bandmedlemmar som snabbt vill spela in ett riff under ett jam i replokalen.</p>
          </div>
          <div class="bg-base-100 p-4 rounded-xl border border-primary/10 space-y-1">
            <span class="text-primary font-bold text-sm">⚡ Allt samlat</span>
            <p class="text-xs text-base-content/80">Inga spridda papperslappar eller försvunna röstmemon. Repertoar, texter, bokningar och setlists finns säkert i molnet.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Sektion 2: Publika Sidor -->
    <section id="sec-publika-sidor" class="space-y-4 pt-4">
      <div class="flex items-center gap-2 border-b border-primary/30 pb-2">
        <span class="text-xl">🌐</span>
        <h2 class="font-heading text-xl sm:text-2xl text-primary font-bold">2. De Publika Sidorna (Vad besökaren ser)</h2>
      </div>
      <div class="overflow-x-auto bg-base-200/50 rounded-2xl border border-primary/20 shadow-md">
        <table class="table table-sm w-full text-left">
          <thead class="bg-base-300 text-primary text-xs font-mono uppercase tracking-wider">
            <tr>
              <th class="py-3 px-4">Sida</th>
              <th class="py-3 px-4">Länk</th>
              <th class="py-3 px-4">Beskrivning & Innehåll</th>
              <th class="py-3 px-4 text-right">Direktlänk</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-primary/10 text-xs sm:text-sm">
            <tr class="hover:bg-base-100/50">
              <td class="font-bold text-primary px-4 py-3">Hem</td>
              <td class="font-mono text-secondary px-4 py-3">/</td>
              <td class="px-4 py-3">Startsida med stor videohjälte/bandfoto, snabbpuff för nästa gig, senaste nytt och interaktiv munspelslogga.</td>
              <td class="px-4 py-3 text-right">
                <NuxtLink to="/" target="_blank" class="btn btn-ghost btn-xs text-primary underline">Öppna ↗</NuxtLink>
              </td>
            </tr>
            <tr class="hover:bg-base-100/50">
              <td class="font-bold text-primary px-4 py-3">Om Bandet</td>
              <td class="font-mono text-secondary px-4 py-3">/about</td>
              <td class="px-4 py-3">Presentation av de fyra medlemmarna, instrument, historia och bandets karaktär.</td>
              <td class="px-4 py-3 text-right">
                <NuxtLink to="/about" target="_blank" class="btn btn-ghost btn-xs text-primary underline">Öppna ↗</NuxtLink>
              </td>
            </tr>
            <tr class="hover:bg-base-100/50">
              <td class="font-bold text-primary px-4 py-3">Jukebox</td>
              <td class="font-mono text-secondary px-4 py-3">/music</td>
              <td class="px-4 py-3">Retro Jukebox med vinylsinglar. A-sida (egna låtar) och B-sida (covers). Inbäddade Spotify- och YouTube-spelare.</td>
              <td class="px-4 py-3 text-right">
                <NuxtLink to="/music" target="_blank" class="btn btn-ghost btn-xs text-primary underline">Öppna ↗</NuxtLink>
              </td>
            </tr>
            <tr class="hover:bg-base-100/50">
              <td class="font-bold text-primary px-4 py-3">Spelningar</td>
              <td class="font-mono text-secondary px-4 py-3">/gigs</td>
              <td class="px-4 py-3">Kommande och tidigare spelningar, datum, spellokal, biljettlänkar samt 1-klicks export till Google Kalender och .ics.</td>
              <td class="px-4 py-3 text-right">
                <NuxtLink to="/gigs" target="_blank" class="btn btn-ghost btn-xs text-primary underline">Öppna ↗</NuxtLink>
              </td>
            </tr>
            <tr class="hover:bg-base-100/50">
              <td class="font-bold text-primary px-4 py-3">Låttexter</td>
              <td class="font-mono text-secondary px-4 py-3">/lyrics</td>
              <td class="px-4 py-3">Sökbar låtbank med bandets texter, verser och låthistorier.</td>
              <td class="px-4 py-3 text-right">
                <NuxtLink to="/lyrics" target="_blank" class="btn btn-ghost btn-xs text-primary underline">Öppna ↗</NuxtLink>
              </td>
            </tr>
            <tr class="hover:bg-base-100/50">
              <td class="font-bold text-primary px-4 py-3">Galleri</td>
              <td class="font-mono text-secondary px-4 py-3">/gallery</td>
              <td class="px-4 py-3">Livefoton och bandbilder i retro fotoramar med förstoringsfunktion (lightbox).</td>
              <td class="px-4 py-3 text-right">
                <NuxtLink to="/gallery" target="_blank" class="btn btn-ghost btn-xs text-primary underline">Öppna ↗</NuxtLink>
              </td>
            </tr>
            <tr class="hover:bg-base-100/50">
              <td class="font-bold text-primary px-4 py-3">Fan Central</td>
              <td class="font-mono text-secondary px-4 py-3">/fancentral</td>
              <td class="px-4 py-3">Humorfylld sida som hyllar fansen – både hängivna konsertbesökare och roterande elektriska bordsfläktar.</td>
              <td class="px-4 py-3 text-right">
                <NuxtLink to="/fancentral" target="_blank" class="btn btn-ghost btn-xs text-primary underline">Öppna ↗</NuxtLink>
              </td>
            </tr>
            <tr class="hover:bg-base-100/50">
              <td class="font-bold text-primary px-4 py-3">Kontakt & Bokning</td>
              <td class="font-mono text-secondary px-4 py-3">/contact</td>
              <td class="px-4 py-3">Bokningsförfrågningar för arrangörer samt kontaktformulär skyddat med antispam-filter.</td>
              <td class="px-4 py-3 text-right">
                <NuxtLink to="/contact" target="_blank" class="btn btn-ghost btn-xs text-primary underline">Öppna ↗</NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Sektion 3: Påskägg & Interaktivitet -->
    <section id="sec-paskagg" class="space-y-4 pt-4">
      <div class="flex items-center gap-2 border-b border-primary/30 pb-2">
        <span class="text-xl">✨</span>
        <h2 class="font-heading text-xl sm:text-2xl text-primary font-bold">3. Interaktiva Funktioner & Påskägg</h2>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="bg-base-200/60 p-5 rounded-2xl border border-primary/20 space-y-2">
          <div class="flex items-center gap-2">
            <span class="text-xl">🎶</span>
            <h3 class="font-heading text-base font-bold text-primary">Blues Harp Easter Egg</h3>
          </div>
          <p class="text-xs sm:text-sm text-base-content/80">
            Klicka på bandets runda logotyp högst upp på startsidan! Webbläsaren genererar ett bluesigt Chicago-munspelslick med tonböjning i realtid via Web Audio API.
          </p>
        </div>

        <div class="bg-base-200/60 p-5 rounded-2xl border border-primary/20 space-y-2">
          <div class="flex items-center gap-2">
            <span class="text-xl">📻</span>
            <h3 class="font-heading text-base font-bold text-primary">Retro Title Strips & Jukebox-knappsats</h3>
          </div>
          <p class="text-xs sm:text-sm text-base-content/80">
            På musiksidan sorteras låtarna som i en klassisk Wurlitzer-jukebox: A-sidor (egna låtar) till vänster och B-sidor (covers) till höger. Besökare kan knappa in A1, B2 osv. på knappsatsen för att välja spår.
          </p>
        </div>

        <div class="bg-base-200/60 p-5 rounded-2xl border border-primary/20 space-y-2">
          <div class="flex items-center gap-2">
            <span class="text-xl">📅</span>
            <h3 class="font-heading text-base font-bold text-primary">1-klicks Kalenderknappar</h3>
          </div>
          <p class="text-xs sm:text-sm text-base-content/80">
            Under spelningar kan besökare med ett klick spara datumet i sin mobil (Google Calendar eller standardiserad <code class="text-primary font-mono">.ics</code>-fil för Apple & Outlook).
          </p>
        </div>

        <div class="bg-base-200/60 p-5 rounded-2xl border border-primary/20 space-y-2">
          <div class="flex items-center gap-2">
            <span class="text-xl">🌓</span>
            <h3 class="font-heading text-base font-bold text-primary">Mörkt & Ljust Läge</h3>
          </div>
          <p class="text-xs sm:text-sm text-base-content/80">
            Sajten anpassar sig automatiskt efter besökarens mobilläge och kan växlas manuellt. Båda lägena är optimerade för hög kontrast enligt WCAG AA.
          </p>
        </div>
      </div>
    </section>

    <!-- Sektion 4: Administrationspanelen -->
    <section id="sec-admin" class="space-y-6 pt-4">
      <div class="flex items-center gap-2 border-b border-primary/30 pb-2">
        <span class="text-xl">🛠️</span>
        <h2 class="font-heading text-xl sm:text-2xl text-primary font-bold">4. Administrationspanelen – Bandets Kontrollrum</h2>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <!-- Spelningar -->
        <div class="bg-base-200/70 p-5 rounded-2xl border border-primary/30 flex flex-col justify-between space-y-3 hover:border-primary transition-all">
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="badge badge-primary font-mono font-bold text-xs">/admin/gigs</span>
              <span class="text-xl">🗓️</span>
            </div>
            <h3 class="font-heading text-lg font-bold text-primary">Spelningar & Gigs</h3>
            <p class="text-xs text-base-content/80">
              Lägg till nya spelningar, uppdatera tider, spelställe, ort och biljettlänkar. Innehåller autopost samt en direktknapp (<strong>📱 Dela</strong>) för att publicera valfritt sparat gig direkt till Facebook & Instagram med valbara hashtags och förhandsgranskning.
            </p>
          </div>
          <NuxtLink to="/admin/gigs" class="btn btn-sm btn-outline btn-primary rounded-xl font-bold w-full">
            Gå till Spelningar →
          </NuxtLink>
        </div>

        <!-- Låtar & Repertoar -->
        <div class="bg-base-200/70 p-5 rounded-2xl border border-primary/30 flex flex-col justify-between space-y-3 hover:border-primary transition-all">
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="badge badge-primary font-mono font-bold text-xs">/admin/songs</span>
              <span class="text-xl">🎵</span>
            </div>
            <h3 class="font-heading text-lg font-bold text-primary">Låtar & Repertoar</h3>
            <p class="text-xs text-base-content/80">
              Hantera hela repertoaren. Ange text & ackord, AI Single Cover Studio för vintage vinylomslag, samt direktknappen (<strong>📱 Dela</strong>) för att dela valfri låt direkt till Facebook.
            </p>
          </div>
          <NuxtLink to="/admin/songs" class="btn btn-sm btn-outline btn-primary rounded-xl font-bold w-full">
            Gå till Låtar →
          </NuxtLink>
        </div>

        <!-- Setlist & Scenpapper -->
        <div class="bg-base-200/70 p-5 rounded-2xl border border-primary/30 flex flex-col justify-between space-y-3 hover:border-primary transition-all">
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="badge badge-primary font-mono font-bold text-xs">/admin/setlist</span>
              <span class="text-xl">📋</span>
            </div>
            <h3 class="font-heading text-lg font-bold text-primary">Setlist & Scenpapper</h3>
            <p class="text-xs text-base-content/80">
              Dra & släpp låtar i önskad ordning. Se beräknad total speltid, exportera ren textfil (.txt) eller skriv ut anpassat A4-scenpapper för monitorerna!
            </p>
          </div>
          <NuxtLink to="/admin/setlist" class="btn btn-sm btn-outline btn-primary rounded-xl font-bold w-full">
            Gå till Setlist →
          </NuxtLink>
        </div>

        <!-- Riff & Idébanken -->
        <div class="bg-base-200/70 p-5 rounded-2xl border border-primary/30 flex flex-col justify-between space-y-3 hover:border-primary transition-all">
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="badge badge-primary font-mono font-bold text-xs">/admin/ideas</span>
              <span class="text-xl">🎙️</span>
            </div>
            <h3 class="font-heading text-lg font-bold text-primary">Riff- & Idébanken</h3>
            <p class="text-xs text-base-content/80">
              Replokalsarkivet! Spela in röstmemo med live VU-mätare direkt i mobilen. Innehåller tap-tempo, tonartsväljare och 0.75x slow-down för att planka licks.
            </p>
          </div>
          <NuxtLink to="/admin/ideas" class="btn btn-sm btn-outline btn-primary rounded-xl font-bold w-full">
            Gå till Idébanken →
          </NuxtLink>
        </div>

        <!-- Galleri & Fan Central -->
        <div class="bg-base-200/70 p-5 rounded-2xl border border-primary/30 flex flex-col justify-between space-y-3 hover:border-primary transition-all">
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="badge badge-primary font-mono font-bold text-xs">/admin/gallery</span>
              <span class="text-xl">📷</span>
            </div>
            <h3 class="font-heading text-lg font-bold text-primary">Galleri & Bilder</h3>
            <p class="text-xs text-base-content/80">
              Ladda upp livefoton, bandbilder och fläktfoton. Välj ramstil och använd knappen (<strong>📱 Dela</strong>) på valfritt foto för att skicka fotot direkt till Facebook.
            </p>
          </div>
          <NuxtLink to="/admin/gallery" class="btn btn-sm btn-outline btn-primary rounded-xl font-bold w-full">
            Gå till Galleri →
          </NuxtLink>
        </div>

        <!-- Sociala Taggar & Inlägg -->
        <div class="bg-base-200/70 p-5 rounded-2xl border border-primary/30 flex flex-col justify-between space-y-3 hover:border-primary transition-all">
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="badge badge-primary font-mono font-bold text-xs">/admin/hashtags</span>
              <span class="text-xl">🏷️</span>
            </div>
            <h3 class="font-heading text-lg font-bold text-primary">Sociala Medier & Taggar</h3>
            <p class="text-xs text-base-content/80">
              Kategoriserade hashtags för Facebook & Instagram. Välj relevanta taggar och kopiera komplett inläggstext med ett enda klick.
            </p>
          </div>
          <NuxtLink to="/admin/hashtags" class="btn btn-sm btn-outline btn-primary rounded-xl font-bold w-full">
            Gå till Taggar →
          </NuxtLink>
        </div>

        <!-- Bokningsförfrågningar -->
        <div class="bg-base-200/70 p-5 rounded-2xl border border-primary/30 flex flex-col justify-between space-y-3 hover:border-primary transition-all">
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="badge badge-primary font-mono font-bold text-xs">/admin/messages</span>
              <span class="text-xl">📬</span>
            </div>
            <h3 class="font-heading text-lg font-bold text-primary">Bokningar & Meddelanden</h3>
            <p class="text-xs text-base-content/80">
              Inkorg för alla inkommande förfrågningar från kontaktformuläret. Markera som lästa, arkivera och svara arrangörer.
            </p>
          </div>
          <NuxtLink to="/admin/messages" class="btn btn-sm btn-outline btn-primary rounded-xl font-bold w-full">
            Gå till Bokningar →
          </NuxtLink>
        </div>

        <!-- Nyhetsbrev -->
        <div class="bg-base-200/70 p-5 rounded-2xl border border-primary/30 flex flex-col justify-between space-y-3 hover:border-primary transition-all">
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="badge badge-primary font-mono font-bold text-xs">/admin/subscribers</span>
              <span class="text-xl">💌</span>
            </div>
            <h3 class="font-heading text-lg font-bold text-primary">Nyhetsbrevsprenumeranter</h3>
            <p class="text-xs text-base-content/80">
              Lista på alla fans som registrerat sig för nyhetsbrevet. Synkroniseras automatiskt med e-postplattformen Brevo.
            </p>
          </div>
          <NuxtLink to="/admin/subscribers" class="btn btn-sm btn-outline btn-primary rounded-xl font-bold w-full">
            Gå till Nyhetsbrev →
          </NuxtLink>
        </div>

        <!-- Merch -->
        <div class="bg-base-200/70 p-5 rounded-2xl border border-primary/30 flex flex-col justify-between space-y-3 hover:border-primary transition-all">
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="badge badge-primary font-mono font-bold text-xs">/admin/merch</span>
              <span class="text-xl">👕</span>
            </div>
            <h3 class="font-heading text-lg font-bold text-primary">Merch & Produkter</h3>
            <p class="text-xs text-base-content/80">
              Hantera visning av bandets t-shirts, kepsar och muggar med länkar till bandets Spreadshirt-webbutik.
            </p>
          </div>
          <NuxtLink to="/admin/merch" class="btn btn-sm btn-outline btn-primary rounded-xl font-bold w-full">
            Gå till Merch →
          </NuxtLink>
        </div>

        <!-- Bandprofiler -->
        <div class="bg-base-200/70 p-5 rounded-2xl border border-primary/30 flex flex-col justify-between space-y-3 hover:border-primary transition-all">
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="badge badge-primary font-mono font-bold text-xs">/admin/band</span>
              <span class="text-xl">👥</span>
            </div>
            <h3 class="font-heading text-lg font-bold text-primary">Bandmedlemmar</h3>
            <p class="text-xs text-base-content/80">
              Uppdatera medlemmarnas presentationer, instrument, utrustning och profilbilder på "Om oss"-sidan.
            </p>
          </div>
          <NuxtLink to="/admin/band" class="btn btn-sm btn-outline btn-primary rounded-xl font-bold w-full">
            Gå till Bandmedlemmar →
          </NuxtLink>
        </div>

        <!-- Sajtinställningar -->
        <div class="bg-base-200/70 p-5 rounded-2xl border border-primary/30 flex flex-col justify-between space-y-3 hover:border-primary transition-all">
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="badge badge-primary font-mono font-bold text-xs">/admin/settings</span>
              <span class="text-xl">⚙️</span>
            </div>
            <h3 class="font-heading text-lg font-bold text-primary">Inställningar & Notiser</h3>
            <p class="text-xs text-base-content/80">
              Ställ in Discord-aviseringar, kontakt-e-post, startsidans innehåll samt slå på/av testläge (Mock Mode) för Facebook och Instagram!
            </p>
          </div>
          <NuxtLink to="/admin/settings" class="btn btn-sm btn-outline btn-primary rounded-xl font-bold w-full">
            Gå till Inställningar →
          </NuxtLink>
        </div>

        <!-- Administratörer -->
        <div class="bg-base-200/70 p-5 rounded-2xl border border-primary/30 flex flex-col justify-between space-y-3 hover:border-primary transition-all">
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="badge badge-primary font-mono font-bold text-xs">/admin/admins</span>
              <span class="text-xl">👥</span>
            </div>
            <h3 class="font-heading text-lg font-bold text-primary">Administratörer & Konton</h3>
            <p class="text-xs text-base-content/80">
              Översikt över bandets alla administratörer och behörigheter. Här kan du bjuda in nya bandmedlemmar eller ta bort tidigare konton.
            </p>
          </div>
          <NuxtLink to="/admin/admins" class="btn btn-sm btn-outline btn-primary rounded-xl font-bold w-full">
            Gå till Admins →
          </NuxtLink>
        </div>

        <!-- Min Profil & Kontoinställningar -->
        <div class="bg-base-200/70 p-5 rounded-2xl border border-primary/30 flex flex-col justify-between space-y-3 hover:border-primary transition-all">
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="badge badge-primary font-mono font-bold text-xs">/admin/profile</span>
              <span class="text-xl">👤</span>
            </div>
            <h3 class="font-heading text-lg font-bold text-primary">Min Profil & Inloggningar</h3>
            <p class="text-xs text-base-content/80">
              Ändra din egen inloggnings-e-post, namn, profilbild, byt lösenord samt koppla Google-, GitHub- och Facebook-konton.
            </p>
          </div>
          <NuxtLink to="/admin/profile" class="btn btn-sm btn-outline btn-primary rounded-xl font-bold w-full">
            Gå till Min Profil →
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Sektion 5: Steg-för-steg Guider (Vanliga arbetsflöden) -->
    <section id="sec-arbetsfloden" class="space-y-4 pt-4">
      <div class="flex items-center gap-2 border-b border-primary/30 pb-2">
        <span class="text-xl">💡</span>
        <h2 class="font-heading text-xl sm:text-2xl text-primary font-bold">5. Steg-för-steg Guider (Vanliga arbetsflöden)</h2>
      </div>

      <div class="space-y-4">
        <!-- Scenario A -->
        <div class="bg-base-200/60 p-5 rounded-2xl border border-primary/20 space-y-2">
          <div class="flex items-center gap-2 font-bold text-primary">
            <span class="badge badge-primary badge-sm">Scenario A</span>
            <h3 class="font-heading text-base">"Vi har bokat ett nytt gig – hur lägger jag upp det?"</h3>
          </div>
          <ol class="list-decimal list-inside text-xs sm:text-sm text-base-content/90 space-y-1.5 pl-2">
            <li>Gå till <NuxtLink to="/admin/gigs" class="text-primary font-bold underline">Spelningar (/admin/gigs)</NuxtLink> och klicka på <strong class="text-primary">+ Ny Spelning</strong>.</li>
            <li>Fyll i datum, starttid, spelställe (venue), ort och eventuell biljett- eller Facebook-länk.</li>
            <li>Koppla eventuellt en specifik setlist om ni redan vet ordningen.</li>
            <li>Klicka på <strong>Spara</strong>. Spelningen syns nu omedelbart på startsidan och under <code class="text-secondary">/gigs</code>!</li>
          </ol>
        </div>

        <!-- Scenario B -->
        <div class="bg-base-200/60 p-5 rounded-2xl border border-primary/20 space-y-2">
          <div class="flex items-center gap-2 font-bold text-primary">
            <span class="badge badge-primary badge-sm">Scenario B</span>
            <h3 class="font-heading text-base">"Inför spelningen – hur fixar vi spellista & scenpapper?"</h3>
          </div>
          <ol class="list-decimal list-inside text-xs sm:text-sm text-base-content/90 space-y-1.5 pl-2">
            <li>Gå till <NuxtLink to="/admin/setlist" class="text-primary font-bold underline">Setlist (/admin/setlist)</NuxtLink>.</li>
            <li>Dra och släpp låtarna i önskad ordning och kontrollera den sammanlagda speltiden.</li>
            <li>Klicka på <strong>Skriv ut scenpapper</strong> – sidan ställer om till ett tydligt, högkontrastigt A4-format med stora låttitlar redo att tejpas på monitorerna.</li>
            <li>Vill ni skicka listan i bandchatten? Klicka på <strong>Exportera .txt</strong> för att kopiera en ren textlista.</li>
          </ol>
        </div>

        <!-- Scenario C -->
        <div class="bg-base-200/60 p-5 rounded-2xl border border-primary/20 space-y-2">
          <div class="flex items-center gap-2 font-bold text-primary">
            <span class="badge badge-primary badge-sm">Scenario C</span>
            <h3 class="font-heading text-base">"Vi hittade på ett fett riff i replokalen!"</h3>
          </div>
          <ol class="list-decimal list-inside text-xs sm:text-sm text-base-content/90 space-y-1.5 pl-2">
            <li>Öppna mobilen och gå till <NuxtLink to="/admin/ideas" class="text-primary font-bold underline">Idébanken (/admin/ideas)</NuxtLink>.</li>
            <li>Tryck på den röda <strong>Spela in</strong>-knappen. Live VU-mätaren visar att mikrofonen tar upp ljudet.</li>
            <li>Klicka på <strong>Tap Tempo</strong> i takt med musiken för att automatiskt fånga BPM och välj tonart.</li>
            <li>Tryck på <strong>Spara</strong> och ge idén ett arbetsnamn. Nu kan alla i bandet lyssna och sakta ner riffet med 0.75x för att öva hemma!</li>
          </ol>
        </div>

        <!-- Scenario D -->
        <div class="bg-base-200/60 p-5 rounded-2xl border border-primary/20 space-y-2">
          <div class="flex items-center gap-2 font-bold text-primary">
            <span class="badge badge-primary badge-sm">Scenario D</span>
            <h3 class="font-heading text-base">"Jag vill byta lösenord, uppdatera min e-post eller logga in med Google/GitHub/Facebook!"</h3>
          </div>
          <ol class="list-decimal list-inside text-xs sm:text-sm text-base-content/90 space-y-1.5 pl-2">
            <li><strong>Glömt lösenord:</strong> Gå till inloggningssidan (<NuxtLink to="/admin/login" class="text-primary font-bold underline">/admin/login</NuxtLink>), klicka på <strong class="text-primary">Glömt lösenord?</strong> och fyll i din e-post. Du får en säker återställningslänk i din inkorg giltig i 1 timme.</li>
            <li><strong>Byta lösenord / e-post när du är inloggad:</strong> Gå till <NuxtLink to="/admin/profile" class="text-primary font-bold underline">Min Profil (/admin/profile)</NuxtLink> genom att klicka på ditt namn uppe till höger. Där byter du e-post och lösenord direkt.</li>
            <li><strong>Social inloggning:</strong> På samma profilsida klickar du på <strong>+ Koppla</strong> bredvid Google, GitHub eller Facebook. Därefter loggar du in med 1 klick!</li>
          </ol>
        </div>
      </div>
    </section>

    <!-- Sektion 6: Teknisk Drift -->
    <section id="sec-drift" class="space-y-4 pt-4">
      <div class="flex items-center gap-2 border-b border-primary/30 pb-2">
        <span class="text-xl">☁️</span>
        <h2 class="font-heading text-xl sm:text-2xl text-primary font-bold">6. Teknisk Drift & Bra att veta</h2>
      </div>

      <div class="bg-base-200/50 p-5 sm:p-6 rounded-2xl border border-primary/20 text-xs sm:text-sm space-y-3 leading-relaxed">
        <p>
          Webbplatsen är byggd med modern teknik (Nuxt 4, Vue 3, Tailwind CSS & DaisyUI) som ger blixtsnabb prestanda och hög driftsäkerhet.
        </p>
        <ul class="space-y-2 list-disc list-inside text-base-content/85">
          <li><strong>Databas & Säkerhet:</strong> Drivs av Turso (krypterad SQLite i molnet). Ändringar sparas omedelbart och är skyddade med säker inloggning.</li>
          <li><strong>Hosting:</strong> Sidan driftas på Vercels globala servrar med automatisk SSL-kryptering (HTTPS) och automatisk optimering av alla bilder.</li>
          <li><strong>Nyhetsbrev & E-post:</strong> Formulär på sajten skickar bekräftelser och sparar prenumeranter via Brevo.</li>
          <li><strong>Ingen kod i vardagen:</strong> Allt innehåll uppdateras via detta administrationsgränssnitt!</li>
        </ul>
      </div>
    </section>

    <!-- Footer Quote -->
    <div class="text-center py-6 border-t border-primary/20 space-y-1">
      <p class="font-heading text-primary font-bold">Det 7:e Gunget — Keep on bluesin'!</p>
      <p class="text-xs text-base-content/60">Manual skapad för bandet. Uppdateras automatiskt vid nya funktioner.</p>
    </div>
  </div>
</template>

<style scoped>
@media print {
  body {
    background: white !important;
    color: black !important;
  }
}
</style>
