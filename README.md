# Nuvio 4 Dummies

Beginner setup guide for Nuvio, served on Google Cloud Run.

- `public/index.html` – the site
- `public/collections/streaming-services.json` – Nuvio collection (built by `node tools/build-collection.js`)
- `public/full-setup/` – shared AIOMetadata files (setup + collections export, API keys excluded)
- `tools/validate-collection.js` – checks a collection against Nuvio's import rules

Pushing to `main` redeploys the site automatically (Cloud Run continuous deployment).
