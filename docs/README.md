# Form Genome — landing page

Static landing page for [Form Genome PDF Analyzer](https://chromewebstore.google.com/detail/nldiinpemmdlllpofiohjieoocchfdji) — the AI-powered PDF form analyzer Chrome extension. Source at [jnimbles03/formgenome](https://github.com/jnimbles03/formgenome).

The page is a single self-contained `index.html` with a WebGL noise-shader background that responds to cursor position. No build step.

## Deploy on GitHub Pages

1. Copy `index.html` into a `docs/` folder at the root of `jnimbles03/formgenome`.
2. Commit and push to `main`.
3. **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main` / `/docs`**.
4. Site goes live at `https://jnimbles03.github.io/formgenome/` in about 30 seconds.

## Custom domain (optional)

1. Add a `CNAME` file inside `docs/` containing your domain (e.g. `formgenome.com`).
2. At your DNS provider, add a `CNAME` record pointing your domain to `jnimbles03.github.io`. For an apex domain, use four `A` records pointing to GitHub's Pages IPs (`185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`).
3. **Settings → Pages → Custom domain** — enter the domain. Wait for DNS check, then enable **Enforce HTTPS**.

## Local preview

```bash
cd docs && python3 -m http.server 8000
```

Visit `http://localhost:8000`. The download CTA links to GitHub releases; the rest is fully static.

Opening `index.html` directly via `file://` also works — WebGL doesn't require a server — but a server is closer to production.

## Re-enabling the URL submission form

The page used to have a URL input that POSTed to `/api/analyze` and returned a generated dashboard. It's currently disabled because the public Cloud Run endpoint isn't ready (IAP-gated; Wave 2 will carve out a public path with rate limiting + Turnstile).

To turn it back on:

1. In `index.html`, uncomment the `<form class="submit">` block in the hero.
2. In the `<script>` near the bottom, uncomment the `=================== Submit (disabled) ===================` block.
3. Update `CONFIG.analyzeEndpoint` to the absolute Cloud Run URL (e.g. `https://form-genome-xxx.run.app/api/analyze`).
4. On the backend, set CORS headers so the browser allows the cross-origin POST:
   - `Access-Control-Allow-Origin: https://jnimbles03.github.io` (or your custom domain)
   - `Access-Control-Allow-Methods: POST, OPTIONS`
   - `Access-Control-Allow-Headers: Content-Type`
   - Handle the `OPTIONS` preflight.

The form expects the backend to return either:
- `text/html` — the dashboard HTML directly (delivered as a blob URL in a new tab), or
- `application/json` with `{ dashboard_url }` for sync, or `{ job_id }` for async (the page polls `CONFIG.statusEndpoint` until `status: "done"`).

## File layout

```
docs/
├── index.html      — the landing page (self-contained, no build)
└── README.md       — this file
```

## Updating

Edit `index.html` and push. GitHub Pages rebuilds automatically — usually live in under a minute.
