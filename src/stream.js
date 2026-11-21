/**
 * Streaming resolution for ani.pm
 *
 * Flow (reversed from the site):
 * 1. Series → episode.routeId
 * 2. GET /api/anime/playback-bootstrap/{source}/{id}?ep={routeId}&lang=
 *    → settlarSelection + skip times
 * 3. GET /api/anime/settlar/session?selection=&provider=anipm&ep=&channel=
 *    → { embedUrl, expiresAt, provider }
 */
const { aniGet } = require('./client');

async function getEpisodeRouteId(id, episode, sourceHint) {
  const series = await aniGet(`/api/anime/series/${id}`, {
    phase: 'core',
    routes: 'e4',
  });
  const ep = (series.episodes || []).find((e) => e.number === episode);
  if (!ep?.routeId) {
    const err = new Error(`Episode ${episode} not found or missing routeId`);
    err.status = 404;
    throw err;
  }
  return {
    routeId: ep.routeId,
    source: series.source || sourceHint || 'settlar',
    title: series.title,
  };
}

async function resolveStream({
  source = 'settlar',
  id,
  routeId,
  episodeNumber,
  lang = 'sub',
}) {
  const bootstrap = await aniGet(
    `/api/anime/playback-bootstrap/${source}/${id}`,
    { ep: routeId, lang }
  );

  const selection = bootstrap.settlarSelection;
  if (!selection) {
    const err = new Error(
      'No settlarSelection returned — episode may be unavailable'
    );
    err.status = 404;
    throw err;
  }

  const channel = lang === 'dub' ? 'dub' : 'sub';
  const epNum = episodeNumber || bootstrap.episode || 1;

  const session = await aniGet('/api/anime/settlar/session', {
    selection,
    provider: 'anipm',
    ep: String(epNum),
    channel,
    telemetry: '0',
  });

  return {
    embedUrl: session.embedUrl,
    expiresAt: session.expiresAt,
    provider: session.provider || 'anipm',
    language: bootstrap.effectiveLanguage || lang,
    availability: bootstrap.availability,
    skip: bootstrap.skip || null,
    episode: bootstrap.episode,
    selection,
    core: bootstrap.core
      ? {
          id: bootstrap.core.id,
          title: bootstrap.core.title,
          source: bootstrap.core.source,
        }
      : null,
  };
}

/**
 * High-level: id + episode number → full stream payload
 */
async function getStream(id, episode, { lang = 'sub', source, routeId } = {}) {
  const epNum = Number(episode);
  if (!Number.isFinite(epNum) || epNum < 1) {
    const err = new Error('Invalid episode number');
    err.status = 400;
    throw err;
  }

  let resolvedRouteId = routeId;
  let resolvedSource = source || 'settlar';

  if (!resolvedRouteId) {
    const info = await getEpisodeRouteId(id, epNum, resolvedSource);
    resolvedRouteId = info.routeId;
    resolvedSource = info.source;
  }

  const stream = await resolveStream({
    source: resolvedSource,
    id,
    routeId: resolvedRouteId,
    episodeNumber: epNum,
    lang: lang === 'dub' ? 'dub' : 'sub',
  });

  const now = Math.floor(Date.now() / 1000);

  return {
    id: Number(id),
    episode: epNum,
    lang: stream.language,
    embedUrl: stream.embedUrl,
    expiresAt: stream.expiresAt,
    expiresInSeconds: stream.expiresAt
      ? Math.max(0, stream.expiresAt - now)
      : null,
    provider: stream.provider,
    skip: stream.skip,
    availability: stream.availability,
    selection: stream.selection,
    routeId: resolvedRouteId,
    source: resolvedSource,
  };
}

async function getBootstrap(id, episode, { lang = 'sub', source, routeId } = {}) {
  const epNum = Number(episode);
  let resolvedRouteId = routeId;
  let resolvedSource = source || 'settlar';

  if (!resolvedRouteId) {
    const info = await getEpisodeRouteId(id, epNum, resolvedSource);
    resolvedRouteId = info.routeId;
    resolvedSource = info.source;
  }

  const bootstrap = await aniGet(
    `/api/anime/playback-bootstrap/${resolvedSource}/${id}`,
    { ep: resolvedRouteId, lang: lang === 'dub' ? 'dub' : 'sub' }
  );

  return {
    ...bootstrap,
    routeId: resolvedRouteId,
    source: resolvedSource,
    selection: bootstrap.settlarSelection,
  };
}

module.exports = { getStream, getBootstrap, resolveStream, getEpisodeRouteId };
