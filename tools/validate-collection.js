// Checks a collection file against the same rules Nuvio's import code applies.
//   TV app:    CollectionsDataStore.validateCollectionsJson + SerializableSource.toDomainSource
//   Phone app: CollectionRepository.validateImportModel
// Run: node tools/validate-collection.js public/collections/streaming-services.json

const fs = require('fs');

const TMDB_TYPES = ['LIST', 'COLLECTION', 'COMPANY', 'NETWORK', 'DISCOVER', 'PERSON', 'DIRECTOR'];
const MEDIA_TYPES = ['MOVIE', 'TV'];
const TV_SHAPES = ['POSTER', 'LANDSCAPE', 'SQUARE', 'poster', 'wide', 'square'];
const VIEW_MODES = ['tabbed_grid', 'rows', 'follow_layout'];
const SORTS = ['original', 'popularity.desc', 'vote_average.desc', 'vote_count.desc', 'primary_release_date.desc', 'first_air_date.desc'];

function validate(data) {
  const errors = [];
  const fail = m => errors.push(m);
  if (!Array.isArray(data)) return ['Top level must be an array'];
  if (!data.length) return ['Array is empty'];
  const collectionIds = new Set();
  let folders = 0, sources = 0;

  data.forEach((c, ci) => {
    const at = `Collection ${ci + 1}`;
    if (typeof c.id !== 'string' || !c.id.trim()) fail(`${at}: missing id`);
    else if (collectionIds.has(c.id)) fail(`${at}: duplicate id ${c.id}`);
    collectionIds.add(c.id);
    if (typeof c.title !== 'string' || !c.title.trim()) fail(`${at}: missing title`);
    if (!Array.isArray(c.folders)) return fail(`${at}: folders must be an array`);
    if (c.viewMode && !VIEW_MODES.includes(String(c.viewMode).toLowerCase())) fail(`${at}: unknown viewMode ${c.viewMode}`);

    const folderIds = new Set();
    c.folders.forEach((f, fi) => {
      const fat = `${at}, folder ${fi + 1} (${f && f.title})`;
      if (!f || typeof f !== 'object') return fail(`${fat}: invalid`);
      if (typeof f.id !== 'string' || !f.id.trim()) fail(`${fat}: missing id`);
      else if (folderIds.has(f.id)) fail(`${fat}: duplicate folder id ${f.id}`);
      folderIds.add(f.id);
      if (typeof f.title !== 'string' || !f.title.trim()) fail(`${fat}: missing title`);
      if (f.tileShape != null && !TV_SHAPES.includes(f.tileShape)) fail(`${fat}: tileShape ${f.tileShape} rejected by TV app`);
      const list = f.sources || f.catalogSources;
      if (!Array.isArray(list)) return fail(`${fat}: sources must be an array`);
      if (!list.length) fail(`${fat}: no sources (folder would be empty)`);
      folders++;

      list.forEach((s, si) => {
        const sat = `${fat}, source ${si + 1}`;
        sources++;
        const provider = (s.provider || 'addon').toLowerCase();
        if (provider === 'tmdb') {
          if (typeof s.tmdbSourceType !== 'string') return fail(`${sat}: missing tmdbSourceType`);
          // TV app silently drops sources whose enum values don't parse.
          if (!TMDB_TYPES.includes(s.tmdbSourceType.toUpperCase())) fail(`${sat}: unknown tmdbSourceType ${s.tmdbSourceType}`);
          if (s.mediaType && !MEDIA_TYPES.includes(s.mediaType.toUpperCase())) fail(`${sat}: unknown mediaType ${s.mediaType}`);
          if (s.sortBy && !SORTS.includes(s.sortBy)) fail(`${sat}: unknown sortBy ${s.sortBy}`);
          if (s.tmdbSourceType.toUpperCase() === 'DISCOVER' && !s.filters) fail(`${sat}: DISCOVER with no filters shows everything`);
        } else if (provider === 'trakt') {
          if (!(Number(s.traktListId) > 0)) fail(`${sat}: invalid traktListId`);
        } else {
          for (const k of ['addonId', 'type', 'catalogId']) if (typeof s[k] !== 'string' || !s[k].trim()) fail(`${sat}: missing ${k}`);
        }
      });
    });
  });
  return errors.length ? errors : { collections: data.length, folders, sources };
}

const file = process.argv[2];
const result = validate(JSON.parse(fs.readFileSync(file, 'utf8')));
if (Array.isArray(result)) { console.error('INVALID\n' + result.join('\n')); process.exit(1); }
console.log(`VALID: ${result.collections} collection, ${result.folders} folders, ${result.sources} sources`);

module.exports = { validate };
