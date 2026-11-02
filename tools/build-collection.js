// Builds public/collections/streaming-services.json in Nuvio's collection import format.
// Format taken from Nuvio's own source:
//   TV:     app/src/main/java/com/nuvio/tv/data/local/CollectionsDataStore.kt (SerializableCollection/Folder/Source)
//   Mobile: composeApp/src/commonMain/kotlin/com/nuvio/app/features/collection/CollectionModels.kt
// Sources use Nuvio's built-in TMDB "Discover" with streaming-provider filters,
// so visitors need no extra addon, API key or account.
//
// Run: node tools/build-collection.js

const fs = require('fs');
const path = require('path');

// TMDB watch-provider IDs for the US region. "|" means "any of these".
const services = [
  { id: 'netflix',     title: 'Netflix',     providers: '8|1796',         art: 'https://i.postimg.cc/kgkTFbtw/Netflix.png' },
  { id: 'prime-video', title: 'Prime Video', providers: '9|2100',         art: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/prime-video-light.png' },
  { id: 'disney-plus', title: 'Disney+',     providers: '337',            art: 'https://i.postimg.cc/W1Q56kJB/Disney.png' },
  { id: 'hbo-max',     title: 'HBO Max',     providers: '1899',           art: 'https://i.postimg.cc/cLVFMn8X/HBO-Max.png' },
  { id: 'apple-tv',    title: 'Apple TV+',   providers: '350',            art: 'https://i.postimg.cc/4xrWb9hS/Apple-TV.png' },
  { id: 'paramount',   title: 'Paramount+',  providers: '531|2303|2616',  art: 'https://i.postimg.cc/RZjgQHn8/Paramount.png' },
  { id: 'hulu',        title: 'Hulu',        providers: '15',             art: 'https://i.postimg.cc/CxWcHqfv/Hulu.png' },
  { id: 'peacock',     title: 'Peacock',     providers: '386|387',        art: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/peacock-light.png' },
  { id: 'crunchyroll', title: 'Crunchyroll', providers: '283',            art: 'https://i.postimg.cc/Hkf64y7P/Crunchyroll.png' },
];

// "Latest" rows sort by release date. A minimum vote count keeps
// unreleased placeholder titles out of the row.
const rows = [
  { label: 'Popular Movies', mediaType: 'MOVIE', sortBy: 'popularity.desc' },
  { label: 'Popular Series', mediaType: 'TV',    sortBy: 'popularity.desc' },
  { label: 'Latest Movies',  mediaType: 'MOVIE', sortBy: 'primary_release_date.desc', voteCountGte: 10 },
  { label: 'Latest Series',  mediaType: 'TV',    sortBy: 'first_air_date.desc',       voteCountGte: 10 },
];

const collection = {
  id: 'nuvio4dummies-streaming-services',
  title: 'Streaming Services',
  pinToTop: false,
  viewMode: 'TABBED_GRID',
  showAllTab: true,
  folders: services.map(s => {
    const folder = {
      id: `n4d-${s.id}`,
      title: s.title,
      tileShape: 'LANDSCAPE',
      hideTitle: false,
      sources: rows.map(r => {
        const filters = { watchRegion: 'US', withWatchProviders: s.providers };
        if (r.voteCountGte) filters.voteCountGte = r.voteCountGte;
        return {
          provider: 'tmdb',
          tmdbSourceType: 'DISCOVER',
          title: `${s.title} ${r.label}`,
          mediaType: r.mediaType,
          sortBy: r.sortBy,
          filters,
        };
      }),
    };
    if (s.art) folder.coverImageUrl = s.art;
    return folder;
  }),
};

const out = path.join(__dirname, '..', 'public', 'collections', 'streaming-services.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify([collection], null, 2) + '\n');
console.log('Wrote', path.relative(process.cwd(), out));
