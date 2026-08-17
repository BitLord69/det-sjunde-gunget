# Asset drop-in guide

## Images

Place temporary/local images under `public/media/`:

- `public/media/brand/` - logo files and badge artwork
- `public/media/band/` - member portraits and band photos
- `public/media/gallery/` - live and general gallery photos
- `public/media/fan-central/` - fan photos and the literal fan joke photos
- `public/media/og/` - the social sharing image

Place the heading font at `public/fonts/counte-extra-bold-italic.woff2`. The
filename is already wired into the CSS. Keep the licensed font file out of
public repositories if its licence requires that, and use the same path in a
deployment asset step instead.

Files in `public/` are served from the site root. For example:

```text
public/media/brand/logo.png -> /media/brand/logo.png
public/media/band/live-01.jpg -> /media/band/live-01.jpg
```

Use descriptive lowercase names with hyphens. Keep the original high-resolution files outside the repository as a backup. These local files are a staging solution; production uploads will eventually go to Vercel Blob through the admin UI.

Preferred formats:

- Logo: SVG if available, otherwise transparent PNG
- Photos: JPG or WebP
- Social image: JPG or PNG, ideally 1200 x 630 pixels

## YouTube links

YouTube links do not go in `public/`. Send the video URLs, titles, and short descriptions as text. They will be stored in the database and rendered through consent-gated embed components.

Example information to provide:

```text
Title: Sommarkväll på Svängen
URL: https://www.youtube.com/watch?v=example
Type: live clip
Description: Det 7:e Gunget live på Kulturhuset Svängen.
```

Spotify, Bandcamp, shop, and social links follow the same rule: provide the URL and the label or title; they belong in CMS/database content rather than an image folder.
