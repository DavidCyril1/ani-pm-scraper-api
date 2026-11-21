const express = require('express');
const { aniGet } = require('./client');
const { normalizeAnime, normalizeEpisode, absUrl } = require('./normalize');
const { getStream, getBootstrap } = require('./stream');

const router = express.Router();

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({
      name: 'ani.pm Scraper API',
      version: '1.2.0',
      description:
        'Reverse-engineered metadata + streaming bootstrap for ani.pm',
      endpoints: {
        'GET /api/home': 'Homepage feed',
        'GET /api/new-episodes': 'Recently released episodes',
        'GET /api/activity': 'Live site stats',
        'GET /api/search?q=': 'Search',
        'GET /api/browse | /api/catalog':
          'Catalog (sort, page, genre, year, status, format)',
        'GET /api/anime/:id': 'Series details + episodes (with routeId)',
        'GET /api/anime/:id/episodes?from=&to=': 'Episode descriptions',
        'GET /api/recommend?context=anime:ID': 'Recommendations',
        'GET /api/stream/:id/:episode?lang=sub|dub':
          '⭐ Resolve playable embedUrl',
        'GET /api/stream/:id/:episode/bootstrap': 'Raw playback bootstrap',
        'GET /api/cover?key=&w=': 'Cover image redirect',
        'GET /health': 'Health check',
      },
      notes: [
        'Stream endpoint returns time-limited embedUrl from embed.settlar.io',
        'Re-request /api/stream when expiresAt passes',
        'Respect ani.pm ToS and content owners',
      ],
    });
  })
);

router.get(
  '/home',
  asyncHandler(async (req, res) => {
    const data = await aniGet('/api/anime/home-feed', {
      content: req.query.content || 3,
    });
    if (req.query.raw === '1') return res.json(data);
    const feed = {};
    for (const [key, section] of Object.entries(data.feed || {})) {
      feed[key] = section?.items
        ? { items: section.items.map(normalizeAnime) }
        : section;
    }
    res.json({ v: data.v, at: data.at, feed });
  })
);

router.get(
  '/new-episodes',
  asyncHandler(async (req, res) => {
    const data = await aniGet('/api/anime/new-episodes');
    res.json({
      items: (data.items || []).map((item) => ({
        ...normalizeAnime(item),
        newEpisode: item.newEpisode,
      })),
    });
  })
);

router.get(
  '/activity',
  asyncHandler(async (req, res) => {
    res.json(await aniGet('/api/site/activity'));
  })
);

router.get(
  '/search',
  asyncHandler(async (req, res) => {
    const q = req.query.q;
    if (!q) return res.status(400).json({ error: 'Missing query parameter q' });
    const data = await aniGet('/api/anime/search', { q });
    res.json({
      items: (data.items || []).map(normalizeAnime),
      studios: data.studios,
      genres: data.genres,
      tags: data.tags,
      intent: data.intent,
      didYouMean: data.didYouMean,
    });
  })
);

router.get(
  ['/browse', '/catalog'],
  asyncHandler(async (req, res) => {
    const params = {
      sort: req.query.sort || 'trending',
      page: req.query.page || 1,
      ...(req.query.genre && { genre: req.query.genre }),
      ...(req.query.year && { year: req.query.year }),
      ...(req.query.status && { status: req.query.status }),
      ...(req.query.format && { format: req.query.format }),
      ...(req.query.avail && { avail: req.query.avail }),
    };
    const path = req.path.includes('browse')
      ? '/api/anime/browse'
      : '/api/anime/catalog';
    const data = await aniGet(path, params);
    res.json({
      items: (data.items || []).map(normalizeAnime),
      page: data.page,
      lastPage: data.lastPage,
      total: data.total,
      hasNextPage: data.hasNextPage,
      availability: data.availability,
    });
  })
);

router.get(
  '/anime/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const params = { routes: 'e4' };
    if (req.query.phase) params.phase = req.query.phase;
    const data = await aniGet(`/api/anime/series/${id}`, params);

    const normalized = normalizeAnime(data);
    normalized.episodes = (data.episodes || []).map(normalizeEpisode);
    normalized.relations = data.relations || [];
    normalized.recommendations = data.recommendations || [];
    normalized.nextAiring = data.nextAiring;
    normalized.airing = data.airing;
    normalized.plannedEpisodes = data.plannedEpisodes;
    normalized.providerTitles = data.providerTitles;
    normalized.routeId = data.routeId;
    normalized.logo = absUrl(data.logo);
    normalized.heroBackdrop = absUrl(data.heroBackdrop);

    res.json(normalized);
  })
);

router.get(
  '/anime/:id/episodes',
  asyncHandler(async (req, res) => {
    const data = await aniGet(
      `/api/anime/series/${req.params.id}/episode-descriptions`,
      {
        from: req.query.from || 1,
        to: req.query.to || 50,
        routes: 'e4',
      }
    );
    res.json(data);
  })
);

router.get(
  '/recommend',
  asyncHandler(async (req, res) => {
    const context = req.query.context;
    if (!context)
      return res
        .status(400)
        .json({ error: 'Missing context (e.g. anime:1642)' });
    const data = await aniGet('/api/recommend', {
      context,
      limit: req.query.limit || 20,
    });
    if (data.items) data.items = data.items.map(normalizeAnime);
    res.json(data);
  })
);

/** ⭐ Stream resolution */
router.get(
  '/stream/:id/:episode',
  asyncHandler(async (req, res) => {
    const result = await getStream(req.params.id, req.params.episode, {
      lang: req.query.lang,
      source: req.query.source,
      routeId: req.query.routeId,
    });
    res.json(result);
  })
);

router.get(
  '/stream/:id/:episode/bootstrap',
  asyncHandler(async (req, res) => {
    const result = await getBootstrap(req.params.id, req.params.episode, {
      lang: req.query.lang,
      source: req.query.source,
      routeId: req.query.routeId,
    });
    res.json(result);
  })
);

router.get(
  '/cover',
  asyncHandler(async (req, res) => {
    const { key, w = 220, format = 'webp' } = req.query;
    if (!key) return res.status(400).json({ error: 'Missing key' });
    const { BASE } = require('./client');
    res.redirect(
      `${BASE}/api/anime/cover?key=${encodeURIComponent(key)}&w=${w}&format=${format}`
    );
  })
);

module.exports = router;
