# Form Genome

AI-powered Chrome extension that analyzes PDF forms — detecting complexity, field counts, entities, action types, and more.

## Install

1. Download the latest `.zip` from [Releases](https://github.com/jnimbles03/formgenome/releases/latest)
2. Unzip the file
3. Go to `chrome://extensions` and enable **Developer mode**
4. Click **Load unpacked** and select the extracted `chrome-extension` folder
5. Pin the extension — you're ready to go

## Features

- **PDF Detection** — Automatically finds PDF links on any page
- **AI Analysis** — Instant complexity scoring, field counts, entity detection
- **Team Dashboard** — Collaborative view with filtering and CSV export
- **Batch Processing** — Analyze multiple PDFs with progress tracking
- **Smart Filtering** — Auto-filter guides, disclosures, and marketing docs
- **Deep Scan** — Discover PDFs across neighboring pages

## Development

```bash
npm install
npm run dev          # Watch mode (Chrome)
npm run build:all    # Production build (Chrome + Firefox)
npm test             # Run tests
```

## Landing Page

The landing page at [genome.meyerinterests.com](https://genome.meyerinterests.com) is served from the `docs/` folder via GitHub Pages.

---

