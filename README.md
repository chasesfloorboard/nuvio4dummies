# Nuvio 4 Dummies

Beginner setup guide for Nuvio, served on Google Cloud Run.

- `public/index.html` – the site
- `public/collections/` – Nuvio collections, built by `node tools/build-collection.js`:
  `homepage.json` (services + genres, what the site's main button copies), `streaming-services.json`, `genres.json`
- `public/full-setup/` – optional shared AIOMetadata files (setup + collections export, API keys excluded); the Full steps that need them stay hidden until they exist
- `tools/validate-collection.js` – checks a collection against Nuvio's import rules

Pushing to `main` redeploys the site automatically (Cloud Run continuous deployment).

## Auto-deploy

`.github/workflows/deploy.yml` deploys on every push to `main`, using keyless
Workload Identity Federation. One-time Google Cloud setup, run in Cloud Shell:

    curl -s https://raw.githubusercontent.com/chasesfloorboard/nuvio4dummies/main/tools/setup-auto-deploy.sh | bash
