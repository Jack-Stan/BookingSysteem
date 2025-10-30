# BookingSysteem

This repository contains a Vite + Vue frontend and an Express + TypeScript backend for a small booking system.


# Demo / Deploy

To quickly show the frontend to others we added a Netlify config.

Quick deploy steps:

1. Push your repository to GitHub (or any Git host) and make sure the `frontend` folder is included.
2. Open Netlify (https://app.netlify.com) and click "New site from Git" → connect your Git provider and select this repo.
3. In the Netlify UI the defaults are already set by `netlify.toml`, but verify:
   - Base directory: `frontend`
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Deploy — Netlify will build the frontend and publish the SPA. The `netlify.toml` also contains a redirect rule to serve `index.html` for client-side routes.

Notes:
- The Netlify build only deploys the frontend; the backend is a separate Node/Express app. For a full end-to-end demo you can deploy the backend separately (e.g., on Render, Heroku, Railway) or implement Netlify Functions next.
- If you want API requests from the deployed frontend to reach a deployed backend, set the backend URL as an environment variable in your frontend (or replace `/api` calls with the full URL). I can add a small runtime config to read an env var like `VITE_API_BASE` and update the frontend to use it.
