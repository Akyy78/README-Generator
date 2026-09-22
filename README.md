# README Studio

**README Studio** is a fast, zero-dependency web app that creates polished GitHub `README.md` files without requiring users to know Markdown.

Fill in the project details, see the README update live, then copy the Markdown or download the finished file.

## Highlights

- Live GitHub-style preview
- Professional, Minimal, Open Source, CLI and App templates
- Import metadata from any public GitHub repository
- Optional `package.json` enrichment for version and npm scripts
- Automatic GitHub badges
- README quality score with improvement hints
- Reorderable and optional sections
- FAQ, roadmap, scripts and custom sections
- Browser-only autosave — no account or backend
- Light and dark themes
- Copy Markdown or download a real `.md` file
- Responsive desktop/mobile UI
- `Ctrl/Cmd + S` shortcut for instant download
- No framework, no build step, no runtime dependencies

## Run locally

You only need a static HTTP server because the app uses ES modules.

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173`.

## Tests

Requires a recent Node.js version with the built-in test runner.

```bash
npm test
```

## Deploy

The project is entirely static, so it can be hosted on **GitHub Pages**, Cloudflare Pages, Netlify, Vercel or any static hosting provider.

For GitHub Pages, publish the repository root from the `main` branch.

## Privacy

README Studio has no backend. Drafts are stored in the browser's `localStorage`. GitHub import requests are made directly from the browser to GitHub's public API.

## Structure

```text
.
├── index.html
├── styles.css
├── app.js
├── generator.js
├── tests/
│   └── generator.test.js
├── package.json
├── .nojekyll
└── README.md
```

## License

MIT
