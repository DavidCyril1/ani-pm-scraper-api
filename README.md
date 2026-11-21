# ani.pm Scraper API

Full reverse-engineered **Node.js + Express** API for [ani.pm](https://ani.pm).

Provides clean REST endpoints for:

- Homepage / catalog / search / series metadata  
- Episode lists (with `routeId`)  
- **Streaming resolution** → time-limited `embedUrl` from `embed.settlar.io` (same path the website uses)

> This project only resolves the same public session/embed the site uses. It does not host video files.

## Quick start

```bash
git clone https://github.com/<you>/ani-pm-scraper-api.git
cd ani-pm-scraper-api
cp .env.example .env
npm install
npm start
# → http://localhost:3000
```

## Streaming

```bash
# One Piece episode 1 (sub)
curl "http://localhost:3000/api/stream/1642/1?lang=sub"

# Dub
curl "http://localhost:3000/api/stream/1642/1?lang=dub"
```

**Response shape:**

```json
{
  "id": 1642,
  "episode": 1,
  "lang": "sub",
  "embedUrl": "https://embed.settlar.io/embed/v1?t=...",
  "expiresAt": 1795014592,
  "expiresInSeconds": 3600,
  "provider": "anipm",
  "skip": {
    "op": { "start": 0.13, "end": 109.44 },
    "ed": { "start": 1374.94, "end": 1442.46 },
    "dur": 1477.98
  },
  "availability": { "sub": true, "dub": true },
  "selection": "2....",
  "routeId": "e1...."
}
```

- Open / embed `embedUrl` to play.
- When `expiresAt` passes, call the endpoint again.

### How streaming works (reversed)

1. Series endpoint → each episode has a `routeId`
2. `GET /api/anime/playback-bootstrap/{source}/{id}?ep={routeId}&lang=`
3. `GET /api/anime/settlar/session?selection=...&provider=anipm&ep=&channel=`
4. → `{ embedUrl, expiresAt }`

## All endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api` | Overview |
| GET | `/api/home` | Homepage feed |
| GET | `/api/new-episodes` | New episodes |
| GET | `/api/activity` | Live stats |
| GET | `/api/search?q=` | Search |
| GET | `/api/browse` / `/api/catalog` | Catalog + filters |
| GET | `/api/anime/:id` | Series + full episode list |
| GET | `/api/anime/:id/episodes` | Episode descriptions |
| GET | `/api/recommend?context=anime:ID` | Recommendations |
| GET | `/api/stream/:id/:episode` | **Stream embed** |
| GET | `/api/stream/:id/:episode/bootstrap` | Raw bootstrap |
| GET | `/api/cover?key=` | Cover redirect |
| GET | `/health` | Health |

### Catalog filters

`sort`, `page`, `genre`, `year`, `status`, `format`, `avail`

Example:

```bash
curl "http://localhost:3000/api/catalog?genre=Romance&sort=trending&page=1"
```

## Environment

See `.env.example`:

- `PORT` (default 3000)
- `ANIPM_BASE` (default `https://ani.pm`)
- `ANIPM_TIMEOUT_MS`
- `ANIPM_UA` (optional User-Agent override)

## Deploy

Works on any Node host (Railway, Render, Fly, VPS, etc.):

```bash
npm install --omit=dev
npm start
```

For an edge/worker-native version, see the companion repo `ani-pm-scraper-worker`.

## Disclaimer

- Cloudflare may challenge automated traffic. Rate-limit and use realistic headers.
- Respect ani.pm’s Terms of Service and the rights of content owners.
- This tool is for educational / personal use of the public metadata & session APIs.

## License

MIT
