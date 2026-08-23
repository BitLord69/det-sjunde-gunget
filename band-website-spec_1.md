# Det 7:e Gunget — Website Specification

## 1. Overview

A full website for **Det 7:e Gunget** ("The Seventh Groove"), a four-piece blues/rock band (all members over 50), performing a mix of covers and original material. Tone: **bluesy, fun, humoristic, modern** — not a stiff "serious blues bar" cliché, but warm, characterful, and easy to navigate.

## 2. Tech Stack

- **Framework:** Nuxt 4 (Vue 3, Composition API)
- **Package manager:** pnpm
- **Styling:** Tailwind CSS + DaisyUI
- **Image optimization:** `@nuxt/image` — handles resizing/optimization for the photo galleries (relevant since one of the band members is a keen photographer, so real high-res photos are likely)
- **Linting/formatting:** ESLint + Prettier
- **Database:** Turso (libSQL/SQLite, edge-hosted)
- **ORM:** Drizzle ORM (schema definitions + migrations for Turso)
- **CMS:** Custom-built lightweight admin (Nuxt server routes + Drizzle + Turso + BetterAuth — see §5)
- **Social Media Publishing:** Yes/No switch in admin CRUD to automatically cross-post announcements to Facebook and Instagram (planned for CMS Refinements §5)
- **File/image storage:** Vercel Blob
- **Email:** Brevo (transactional email for contact form + fan mailing list)
- **Analytics:** Vercel Web Analytics (free within Hobby-tier limits, no cookie banner required — privacy-friendly by default)
- **Hosting/Deploy:** Vercel — reusing the existing auto-deploy setup from your other project

## 3. Sections / Pages

| Page | Purpose | Content Source |
|---|---|---|
| **Home** | First impression — band photo/video hero, tagline, upcoming gig teaser, latest news | CMS |
| **About/Bio** | Band story, member bios/photos, humor allowed here | CMS |
| **Music/Songs** | Embedded Spotify/Bandcamp/YouTube players for tracks (covers + originals) — no self-hosted audio, sidesteps mechanical licensing concerns for covers | CMS + external embeds |
| **Gigs/Tour Dates** | List of upcoming (and optionally past) shows: date, venue, city, ticket link | CMS |
| **Photos/Gallery** | Live shots, band photos, maybe fan-submitted | CMS |
| **Videos** | YouTube/Vimeo embeds — live clips, music videos | CMS + external embeds |
| **Merch** | Showcase items, links out to existing online shop (no checkout on this site) | CMS or hardcoded list |
| **Fan Central** | Playful gallery — photos of fans (the human kind, and the literal spinny-air kind), leans into the band's humor | CMS |
| **Contact** | Booking inquiries, socials, contact form, newsletter signup | CMS (basic info) + form |

## 4. Design Direction

- **Vibe:** Bluesy + fun + humoristic + modern
- **Logo:** Circular vintage badge — distressed cream/tan lettering on black, ornate flourishes, harmonica (Blues Harp) and Shure 55 mic illustrated within the badge. This sets the visual anchor for the whole site.
- **Color palette:** Black + cream/tan/gold as the core pairing (pulled from the logo), with room for a warm accent (amber/rust) for CTAs and highlights
- **Texture:** Subtle distressed/grain texture (echoing the logo) balanced against clean modern layout and typography — vintage accents, not a full vintage pastiche
- **Typography:** Heading font: **Arvo** (via Google Fonts / `@nuxt/fonts`), paired with **Inter** for body text. Implement the heading font as a CSS variable (e.g. `--font-heading`) or a single Tailwind theme token, rather than hardcoding the font name across components — makes it a one-line swap later if the pairing doesn't stick once applied to the real layout.
- **Logo usage:** Full circular badge reserved for spots with room to breathe — hero section, footer, favicon/app icon (simplified/cropped for very small sizes if needed). Nav bar uses a **text wordmark** in Alfa Slab One instead of a shrunk badge — the badge's flourishes and fine details (harmonica, "Blues Harp" text) don't hold up at nav-bar scale.
- **Motion:** mixed approach — subtle by default (gentle fades, hover states) with punchier, noticeable transitions reserved for moments that reinforce the fun/humoristic tone (e.g. Fan Central page, playful microcopy reveals, maybe a hero entrance animation). Not applied uniformly everywhere.
- **Dark/light mode:** DaisyUI's built-in theme switching. Defaults to the visitor's system preference (`prefers-color-scheme`) on first visit; if they manually toggle it, that choice overrides the system preference and is stored in a cookie. Both themes derived from the same black/cream/gold palette, tuned for WCAG AA contrast in each mode.
- **Mobile navigation:** bottom tab bar (thumb-friendly, always visible) rather than a hamburger menu — fits a site people browse one-handed at a gig. Likely tabs: Home, Gigs, Music, More (overflow menu for the remaining pages) to keep the bar from overcrowding.
- Room for personality: playful microcopy, self-aware humor about "four guys over 50" fits naturally with this vintage-badge aesthetic
- Fully responsive — assume a chunk of traffic comes from mobile (fans checking gig dates on the go)
- DaisyUI theme: build a **custom DaisyUI theme** using the black/cream/gold palette from the logo, rather than a stock theme

## 5. Content Management

All four band members need to add/edit content (gigs, photos, bio, news) **without touching code**.

**Approach:** Custom-built lightweight CMS, since Turso is the database of choice:
- **Data layer:** Turso (libSQL) holds tables for gigs, bio/members, gallery images, videos, news/posts, merch links
- **ORM:** Drizzle ORM defines the schema (`drizzle-orm/libsql`), handles migrations (`drizzle-kit`), and gives type-safe queries throughout the server routes
- **API layer:** Nuxt server routes (`server/api/*`) handle CRUD operations against Turso via Drizzle
- **Admin UI:** A simple `/admin` section (Nuxt pages, DaisyUI forms/tables) behind authentication, where any of the 4 members can log in and add/edit/delete content
- **Social Media Cross-Posting Switch:** When creating or editing gigs, news posts, songs, or gallery items in the admin dashboard, provide a **Yes/No switch** ("Posta automatiskt till Facebook & Instagram"). When enabled, the publish action prepares and dispatches the post to the band's connected Facebook Page and Instagram accounts.
- **Auth:** BetterAuth (using its Drizzle adapter against the same Turso DB) — handles login/session for the 4 band members via **email/password**. Social login providers (Google, GitHub, Facebook) configured as well for admin convenience, and to lay groundwork for potential future fan-facing accounts. Fan login/accounts are **not** in scope for v1, but the schema and auth setup should not preclude adding it later.
- **Image storage:** Vercel Blob holds actual photo/video files, referenced by URL in the DB

Public-facing pages fetch from the same Turso DB (via Drizzle) using server routes — no separate CMS service, one deploy target (Vercel), one data source, type-safe end to end.

## 6. Functional Requirements

- **Gigs list**: sortable by date, auto-hide/archive past shows (or move to a "past shows" tab)
- **Music player**: embedded Spotify/Bandcamp/YouTube players per track (no self-hosted audio) — sidesteps mechanical licensing questions that come with hosting cover recordings directly
- **Video embeds**: standard YouTube embeds (not the privacy-enhanced `nocookie` domain), which means a **cookie consent banner** is required site-wide before the embed's cookies are set (see §7)
- **Photo gallery**: grid layout, lightbox on click
- **Fan Central**: separate gallery in the same style as Photos, but scoped to the "fans" joke (human fans at shows + literal electric/air fans) — same underlying gallery component and data model as Photos/Gallery, just a distinct category/tag so it can render as its own page
- **Merch**: simple card grid linking out to existing shop — no cart/checkout needed
- **Contact form**: simple form (name, email, message) — submits to a Nuxt server route, stores in Turso, and sends a notification via Brevo (transactional email)
- **Newsletter signup**: standalone form (separate from the contact form), fans subscribe with just an email; subscriptions sync to a Brevo list for future gig/release announcements. Every campaign email includes a Brevo-managed unsubscribe link (Brevo handles this natively — no custom build needed), and the unsubscribe should also update the subscriber's status in the local Turso table so admin views stay in sync.
  - **Placement**: lives in the site footer (persistent, on every page) as the primary spot, plus contextual blurb placements on relevant pages — e.g. Music page ("Don't want to miss new music? Subscribe"), possibly Gigs page too. Same underlying form component, different surrounding copy per placement.
- **Admin access**: CMS handles this — all 4 members get login access to add/edit content
- **Past gigs**: same gigs table as upcoming shows, filtered by date — no separate archive system needed
- **Spam protection**: contact form and newsletter signup are public and bot-exposed, so both get a honeypot field (invisible field bots fill in, humans don't — cheap, no extra dependency) plus optional escalation to Cloudflare Turnstile if spam becomes an actual problem post-launch. Start simple, add Turnstile only if needed.

## 7. SEO & Cookie Consent

- Meta tags (title, description) per page, driven by CMS content where relevant (e.g. gig pages)
- Open Graph tags + a dedicated OG share image (likely built from the logo/hero imagery) so shared links look good on Facebook/Instagram
- `sitemap.xml` and `robots.txt` (Nuxt has modules for auto-generating these — `@nuxtjs/sitemap`)
- Semantic HTML structure and reasonable heading hierarchy throughout, which also helps accessibility
- **Favicon:** placeholder set generated by resizing the full logo (favicon.ico, 16/32/48px, apple-touch-icon 180px, PWA icons 192/512px) — lives in `public/` per Nuxt convention, so swapping in a cleaner icon-only version later is a straight file replace, no code changes. Note: at true tab size (16-32px) the badge's fine lettering isn't legible, just reads as a dark circular mark — fine as a placeholder, worth revisiting once a proper icon-only asset exists.
- **Cookie consent banner:** required because standard YouTube embeds (chosen over the privacy-enhanced `nocookie` variant) set cookies on page load. Vercel Web Analytics itself stays cookie-free and doesn't need consent, but the site-wide banner is still necessary due to the video embeds. A lightweight consent module (e.g. `vue-cookie-comply` or a small custom component) gates the YouTube iframe until consent is given. Accompanying **privacy policy page** covers this plus the contact form and newsletter data handling.

## 8. Internationalization (i18n)

Primary language is **Swedish** (the band is Swedish, name is Swedish), with **English** as a secondary language to be added — not necessarily at v1 launch, but the architecture must support it from day one to avoid a rework.

- **Library:** `@nuxtjs/i18n` (the standard Nuxt i18n module) — handles UI string translation, locale routing (`/en/...` prefix or domain-based), and locale switching out of the box
- **UI strings:** all static UI text (nav labels, buttons, form labels, microcopy) goes through the i18n system from the start, even though only `sv` ships initially — never hardcode Swedish strings directly in components
- **CMS content:** dynamic content (bio text, gig descriptions, news posts) is trickier — the database schema should account for this early. Recommended approach: locale-suffixed columns or a separate `translations` table keyed by content ID + locale, rather than retrofitting it later. Content can be Swedish-only at first (empty/fallback English), but the schema shape should already support multiple locales per record.
- **Default behavior:** site defaults to Swedish; English becomes available once the admin team decides to translate content (English UI strings can exist without English content, falling back to Swedish where content isn't yet translated)

## 9. Open Decisions

- [ ] Actual domain name / DNS setup on Vercel (confirmed you already own one)

## 10. Resolved Decisions (for reference)

- **Newsletter form**: standalone, not bundled into Contact. Footer placement site-wide, plus contextual blurbs on relevant pages (Music, possibly Gigs). Unsubscribe handled via Brevo's built-in link, synced back to the local subscriber record.
- **Social Media Workflow**: Built via Social Hashtags Manager with category tagging, active toggles, post-level chip selectors and 1-click clipboard post copy.
- **Jukebox & Title Strips Ordering**: Authentically sequenced A-side (A1..An originals) and B-side (B1..Bn covers) with 1's strictly on left and 2's on right in 2-column grid and sequential keypad.
- **Setlist Export & Stage Sheet Print**: 1-click plain text file (.txt) download for band setlists (both site-wide and per-gig) and high-contrast vintage `@media print` stage print layout (A4 format with Det 7:e Gunget logo and large clear song titles ready to print and tape to stage monitors).
- **Calendar Integration**: 1-click Google Calendar event generation and standard iCalendar (.ics) download on gig cards and ticket stubs.
- **Blues Harp Easter Egg**: Interactive Chicago blues harmonica bend lick & visual animation on landing page logo click using Web Audio API synthesis.
- **OAuth credentials**: you already have provider accounts; new OAuth apps will be registered per-provider when we reach the auth implementation step. Not a blocker.
- **Deployment**: reusing existing Vercel auto-deploy setup from another project — no new CI/CD to configure.
- **Testing**: no automated test suite for v1 — site has limited end-user functionality (mainly content display + two forms), so manual testing is sufficient for now. Revisit if/when the forum ships.
- **Error monitoring**: skipped for v1 (e.g. Sentry) — can be added later with minimal setup if bugs become hard to track down via user reports alone.
- **Music/video licensing**: Music page uses embedded Spotify/Bandcamp/YouTube players rather than self-hosted audio, avoiding mechanical licensing questions around cover songs. Standard (non-privacy-enhanced) YouTube embeds are used **deliberately** — chosen over `youtube-nocookie.com` specifically to retain YouTube-side view/engagement analytics on the band's videos — which necessitates a cookie consent banner site-wide (see §7). This is a considered tradeoff, not an oversight.
- **Default theme**: matches visitor's system preference (`prefers-color-scheme`) on first visit; manual toggle overrides and persists via cookie.

## 11. Future Considerations & Ideas Backlog

- **Discord & Multi-Channel Instant Alerts**: Real-time Discord server/channel notifications (via configurable Webhook URL in Admin Settings) alongside Brevo emails for new booking requests, contact messages, fan photo submissions, and guestbook entries. Includes test button and per-event toggle switches.
- **Fan Song Request Box ("Önska en låt till nästa gig")**: (Planerad för senare fas) Publik funktion på `/music` eller `/gigs` där fans kan önska/rösta på låtar ur repertoaren inför kommande spelningar. Visar "Fansen önskar!"-indikator i admin när låtlistan byggs.
- **Replokals-arkiv & Röstmemo-inspelare ("Riff- & Idébank")**: (Framtida verktyg) Enkel mobil inspelningsfunktion i admin för att snabbt spela in och spara 30-sekunders riff-, munspels- och sångidéer direkt från replokalen kopplat till låtutkast.
- **Fan Photo Submission (Fan Central)**: A fan submission form to upload concert or electric fan photos directly into an admin review/approval queue (on hold for band discussion regarding moderation workload).
- **Fan Community / Guestbook ("Gästbok / Blues Log")**: Lightweight guestbook where fans can leave messages or gig reviews with moderation support.
- **Stage Rider / Press Kit (EPK)**: Dedicated downloadable or viewable page for venue arrangers/promoters with channel list (4 musicians, drums, bass, guitars, harmonica mic, DI boxes) and high-res press photos.
- **Interactive Retro Blues Soundboard**: Retro stompbox widget (footer or Fan Central) triggering blues riffs, harmonica licks, and band catchphrases.
- **Interactive Sweden Gig Tour Map ("Sverigeturnén")**: Visual map with pins for past/upcoming gigs, venue info, and mileage counter.
- **Spotify / Apple Music Setlist Playlist Sync**: 1-click link to listen to the band's live setlist directly on streaming platforms.
- **Gig Countdown & Ticket Reminder**: Dynamic countdown banner for the next upcoming show.
- **Sharable / Printable Vintage Gig Posters**: Auto-generated gig poster creator in admin for social sharing & print.
- **Fan accounts/login**: not needed now, but auth is being set up (BetterAuth + social providers) in a way that supports adding fan-facing accounts later without a rework
- **Forum**: a fan/community forum is a planned future feature — not built in v1, but worth a small "coming soon" teaser somewhere on the site (e.g. Fan Central or Contact) to gauge interest.

## 12. Content Status

- **Ready:** Bio text, photoshoot band images, setlist repertoire, lyrics & chords, Spreadshirt shop link, social links.
- **Placeholder needed:** Production domain DNS setup.


