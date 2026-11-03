# Nuvio 4 Dummies

Four-step setup guide for Nuvio (install, homepage, Cinemeta, Comet), served on Google Cloud Run.

Short download links: `/android` (Nuvio for phones) and `/tv` (Nuvio TV), both pointing at the latest official GitHub releases.

- `public/index.html` – the site
- `public/collections/` – Nuvio collections, built by `node tools/build-collection.js`:
  `homepage.json` (services + genres, what the site's main button copies), `streaming-services.json`, `genres.json`
- `tools/validate-collection.js` – checks a collection against Nuvio's import rules

Pushing to `main` redeploys the site automatically (Cloud Run continuous deployment).

## Auto-deploy

`.github/workflows/deploy.yml` deploys on every push to `main`, using keyless
Workload Identity Federation. One-time Google Cloud setup, run in Cloud Shell:

    curl -s https://raw.githubusercontent.com/chasesfloorboard/nuvio4dummies/main/tools/setup-auto-deploy.sh | bash
