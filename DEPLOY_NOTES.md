# GitHub Pages Deployment Notes

## Problem Summary

During the first GitHub Pages deployment, the page loaded only the static HTML shell:

- Search bar was visible.
- Weather stayed at `Loading weather...`.
- Artwork stayed at `Loading daily artwork...`.
- Quick links did not render.
- Top shortcut icons did not render.
- Shiba pet did not appear.

This means the main JavaScript app did not run correctly.

## Root Cause

Two deployment states were mixed together:

1. GitHub Pages was not consistently serving the GitHub Actions `dist/` output yet.
2. The browser or GitHub Pages CDN still had an older `index.html` cached.

The broken page referenced the source-mode script:

```html
<script type="module" src="./js/main.js"></script>
```

The correct Vite build output should reference a bundled asset:

```html
<script type="module" crossorigin src="./assets/index-xxxx.js"></script>
```

When the source-mode page was served, some Vite-only or build-output paths were not available in the same shape on GitHub Pages, so the app failed before rendering dynamic UI.

The Node.js 20 warning shown by GitHub Actions was not the cause. It was only a future deprecation warning for GitHub Actions runtime behavior.

## How To Diagnose

Open the deployed page source or fetch `index.html`.

If it contains this, Pages is serving raw source:

```html
./js/main.js
```

If it contains this, Pages is serving the Vite build artifact:

```html
./assets/index-xxxx.js
```

Also check the browser console and Network tab:

- `js/main.js` 404 means raw source paths are being requested but not served correctly.
- `assets/index-xxxx.js` 200 means the Vite bundle is being loaded.
- If HTML is old but assets exist, force refresh or use a cache-busting URL.

Useful test URLs:

```text
https://USERNAME.github.io/REPO/
https://USERNAME.github.io/REPO/index.html
https://USERNAME.github.io/REPO/index.html?v=COMMIT_SHA
```

## Fix Applied

The app was made tolerant of both deployment shapes.

For artwork data, it now tries both:

```text
artworks/artworks.json
public/artworks/artworks.json
```

For pet assets, it now tries both:

```text
pets/shiba/
public/pets/shiba/
```

This prevents a temporary Pages source mismatch from breaking the whole app.

The favicon links were also changed back to stable relative paths:

```html
<link rel="icon" type="image/png" href="./favicon.png" />
<link rel="shortcut icon" type="image/png" href="./favicon.png" />
<link rel="apple-touch-icon" href="./favicon.png" />
```

## Prevention Checklist For Future Custom Versions

Before deploying:

1. Keep `vite.config.js` using:

```js
base: './'
```

2. Run:

```bash
npm run build
```

3. Inspect `dist/index.html` and confirm it references:

```html
./assets/index-xxxx.js
```

4. Make sure GitHub Pages is configured as:

```text
Settings > Pages > Build and deployment > Source > GitHub Actions
```

5. Deploy with the GitHub Actions workflow.

6. After deployment, open:

```text
https://USERNAME.github.io/REPO/index.html?v=COMMIT_SHA
```

7. If the page looks stale, hard refresh:

```text
Ctrl + F5
```

or test in an incognito window.

## Expected Healthy Page

A working deployment should show:

- Search bar.
- Quick links.
- Top shortcut icons on desktop.
- Weather card result or location fallback message.
- Daily artwork image.
- Shiba pet.
- No fatal console errors.

