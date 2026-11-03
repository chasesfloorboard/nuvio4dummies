// Builds Nuvio collection files in Nuvio's collection import format:
//   public/collections/streaming-services.json  Streaming Services only
//   public/collections/genres.json              Genres only
//   public/collections/homepage.json            both (what the site's main button copies)
// Format taken from Nuvio's own source:
//   TV:     app/src/main/java/com/nuvio/tv/data/local/CollectionsDataStore.kt (SerializableCollection/Folder/Source)
//   Mobile: composeApp/src/commonMain/kotlin/com/nuvio/app/features/collection/CollectionModels.kt
// Every row uses Nuvio's built-in TMDB "Discover", so visitors need no extra
// addon, API key or account, and nothing depends on a third-party addon server.
//
// Run: node tools/build-collection.js

const fs = require('fs');
const path = require('path');

// TMDB watch-provider IDs for the US region. "|" means "any of these".
const services = [
  { id: 'netflix',     title: 'Netflix',     providers: '8|1796',         art: 'https://i.postimg.cc/kgkTFbtw/Netflix.png' },
  { id: 'prime-video', title: 'Prime Video', providers: '9|2100',         art: 'https://nuvio4dummies-187076934426.us-west1.run.app/art/prime-video.png' },
  { id: 'disney-plus', title: 'Disney+',     providers: '337',            art: 'https://i.postimg.cc/W1Q56kJB/Disney.png' },
  { id: 'hbo-max',     title: 'HBO Max',     providers: '1899',           art: 'https://i.postimg.cc/cLVFMn8X/HBO-Max.png' },
  { id: 'apple-tv',    title: 'Apple TV+',   providers: '350',            art: 'https://i.postimg.cc/4xrWb9hS/Apple-TV.png' },
  { id: 'paramount',   title: 'Paramount+',  providers: '531|2303|2616',  art: 'https://i.postimg.cc/RZjgQHn8/Paramount.png' },
  { id: 'hulu',        title: 'Hulu',        providers: '15',             art: 'https://i.postimg.cc/CxWcHqfv/Hulu.png' },
  { id: 'peacock',     title: 'Peacock',     providers: '386|387',        art: 'https://nuvio4dummies-187076934426.us-west1.run.app/art/peacock.png' },
  { id: 'crunchyroll', title: 'Crunchyroll', providers: '283',            art: 'https://i.postimg.cc/Hkf64y7P/Crunchyroll.png' },
];

// "Latest" rows sort by release date. A minimum vote count keeps
// unreleased placeholder titles out of the row.
const serviceRows = [
  { label: 'Popular Movies', mediaType: 'MOVIE', sortBy: 'popularity.desc' },
  { label: 'Popular Series', mediaType: 'TV',    sortBy: 'popularity.desc' },
  { label: 'Latest Movies',  mediaType: 'MOVIE', sortBy: 'primary_release_date.desc', voteCountGte: 10 },
  { label: 'Latest Series',  mediaType: 'TV',    sortBy: 'first_air_date.desc',       voteCountGte: 10 },
];

// TMDB genre IDs differ between movies and TV. `tv: null` means TMDB has no
// matching TV genre, so that folder gets movie rows only.
const genres = [
  { id: 'action',      title: 'Action',        emoji: '💥', movie: { withGenres: '28' },    tv: { withGenres: '10759' } },
  { id: 'animation',   title: 'Animation',     emoji: '🎨', movie: { withGenres: '16', withoutKeywords: '210024' }, tv: { withGenres: '16', withoutKeywords: '210024' } },
  { id: 'anime',       title: 'Anime',         emoji: '🍥', movie: { withGenres: '16', withOriginalLanguage: 'ja' }, tv: { withGenres: '16', withOriginalLanguage: 'ja' } },
  { id: 'comedy',      title: 'Comedy',        emoji: '😂', movie: { withGenres: '35' },    tv: { withGenres: '35' } },
  { id: 'documentary', title: 'Documentary',   emoji: '🎥', movie: { withGenres: '99' },    tv: { withGenres: '99' } },
  { id: 'drama',       title: 'Drama',         emoji: '🎭', movie: { withGenres: '18' },    tv: { withGenres: '18' } },
  { id: 'family',      title: 'Family',        emoji: '👨‍👩‍👧', movie: { withGenres: '10751' }, tv: { withGenres: '10751' } },
  { id: 'horror',      title: 'Horror',        emoji: '👻', movie: { withGenres: '27' },    tv: null },
  { id: 'korean',      title: 'Korean/Kdrama', emoji: '🇰🇷', movie: { withOriginalLanguage: 'ko' }, tv: { withGenres: '18', withOriginalLanguage: 'ko' } },
  { id: 'mystery',     title: 'Mystery',       emoji: '🔍', movie: { withGenres: '9648' },  tv: { withGenres: '9648' } },
  { id: 'romance',     title: 'Romance',       emoji: '💘', movie: { withGenres: '10749' }, tv: null },
  { id: 'sci-fi',      title: 'Sci-Fi',        emoji: '🚀', movie: { withGenres: '878' },   tv: { withGenres: '10765' } },
  { id: 'thriller',    title: 'Thriller',      emoji: '🔪', movie: { withGenres: '53' },    tv: null },
];

// "Top Rated" needs a vote floor, otherwise titles with one 10/10 vote win.
const genreRows = [
  { label: 'Popular Movies',   mediaType: 'MOVIE', sortBy: 'popularity.desc' },
  { label: 'Popular Series',   mediaType: 'TV',    sortBy: 'popularity.desc' },
  { label: 'Top Rated Movies', mediaType: 'MOVIE', sortBy: 'vote_average.desc', voteCountGte: 500 },
  { label: 'Top Rated Series', mediaType: 'TV',    sortBy: 'vote_average.desc', voteCountGte: 200 },
];

const tmdbSource = (title, row, filters) => ({
  provider: 'tmdb',
  tmdbSourceType: 'DISCOVER',
  title,
  mediaType: row.mediaType,
  sortBy: row.sortBy,
  filters: row.voteCountGte ? { ...filters, voteCountGte: row.voteCountGte } : filters,
});

const streamingServices = {
  id: 'nuvio4dummies-streaming-services',
  title: 'Streaming Services',
  viewMode: 'TABBED_GRID',
  showAllTab: true,
  folders: services.map(s => {
    const folder = {
      id: `n4d-${s.id}`,
      title: s.title,
      tileShape: 'LANDSCAPE',
      sources: serviceRows.map(r =>
        tmdbSource(`${s.title} ${r.label}`, r, { watchRegion: 'US', withWatchProviders: s.providers })),
    };
    if (s.art) folder.coverImageUrl = s.art;
    return folder;
  }),
};

const genreCollection = {
  id: 'nuvio4dummies-genres',
  title: 'Genres',
  viewMode: 'TABBED_GRID',
  showAllTab: true,
  folders: genres.map(g => ({
    id: `n4d-genre-${g.id}`,
    title: g.title,
    tileShape: 'LANDSCAPE',
    coverEmoji: g.emoji,
    sources: genreRows
      .filter(r => (r.mediaType === 'MOVIE' ? g.movie : g.tv))
      .map(r => tmdbSource(`${g.title} ${r.label}`, r, r.mediaType === 'MOVIE' ? g.movie : g.tv)),
  })),
};

const outDir = path.join(__dirname, '..', 'public', 'collections');
fs.mkdirSync(outDir, { recursive: true });
const files = {
  'streaming-services.json': [streamingServices],
  'genres.json': [genreCollection],
  'homepage.json': [streamingServices, genreCollection],
};
for (const [name, data] of Object.entries(files)) {
  const out = path.join(outDir, name);
  // Minified on purpose: Samsung's keyboard cuts pasted text at 20,000
  // characters, so homepage.json must stay under that (guard at 19,000).
  const text = JSON.stringify(data);
  if (name === 'homepage.json' && text.length > 19000) throw new Error(`homepage.json is ${text.length} chars; keep it under 19000`);
  fs.writeFileSync(out, text + '\n');
  console.log('Wrote', path.relative(process.cwd(), out));
}
