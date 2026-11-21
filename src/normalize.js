const { BASE } = require('./client');

function absUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return BASE + path;
}

function normalizeAnime(item) {
  if (!item) return null;
  return {
    id: item.id,
    source: item.source,
    slug: item.slug || null,
    routeId: item.routeId || null,
    title: item.title,
    nativeTitle: item.native || null,
    poster: absUrl(item.poster),
    banner: absUrl(item.banner),
    year: item.year,
    score: item.score,
    rating: item.rating,
    duration: item.duration,
    status: item.status,
    type: item.type,
    genres: item.genres || [],
    studios: item.studios || [],
    episodeCount: item.episodeCount,
    subCount: item.subCount,
    dubCount: item.dubCount,
    synopsis: item.synopsis,
    malId: item.malId,
    anilistId: item.anilistId,
    season: item.season,
    rank: item.rank,
    views: item.views,
    tags: item.tags || [],
    hasDub: item.hasDub,
  };
}

function normalizeEpisode(ep) {
  if (!ep) return null;
  return {
    number: ep.number,
    sourceNumber: ep.sourceNumber,
    title: ep.title,
    thumbnail: ep.thumbnail,
    description: ep.description,
    sub: !!ep.sub,
    dub: !!ep.dub,
    subExact: ep.subExact,
    dubExact: ep.dubExact,
    runtimeSeconds: ep.runtimeSeconds,
    routeId: ep.routeId,
  };
}

module.exports = { normalizeAnime, normalizeEpisode, absUrl };
