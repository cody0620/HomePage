# AI Project Notes

## Project Goal

- This is a personal browser homepage.
- The main theme is a dark starry sky.
- The special feature is daily world artwork with Shiba Inu edited versions.
- The user does not want the stock module as part of the current product direction.

## Main Features

- Search bar.
- Quick links with favicons.
- Weather card.
- Daily artwork card.
- Shiba Inu edited artwork mode.
- Draggable Shiba pet on the page.
- Settings panel for background, search, links, weather, artwork, and appearance.
- Starfield canvas background with meteors.
- Nebula glow layer.
- Theme options:
  - black starry sky
  - deep blue
  - deep forest
  - pink romance

## Important Interaction

- The Shiba pet appears at the bottom-right of the page.
- The user can drag the Shiba pet.
- If the Shiba pet is dropped on a quick link, that link opens.
- If the Shiba pet is dropped on the artwork card, the artwork toggles between:
  - original artwork
  - Shiba edited artwork
- The Shiba artwork mode is saved in `localStorage`.

## File Structure

- `index.html`
  - Main HTML shell.
  - Contains the canvas, nebula layer, search area, quick links, weather card, artwork card, and settings panel.

- `style.css`
  - All page styling.
  - Includes layout, glass cards, themes, artwork card, weather card, settings panel, and Shiba pet styles.

- `js/main.js`
  - Main app entry.
  - Loads settings.
  - Starts stars, weather, artwork, and Shiba pet.
  - Handles search and quick links.
  - Listens for the Shiba artwork toggle event.

- `js/settings.js`
  - Default settings.
  - Loads and saves settings from `localStorage`.
  - Builds the settings panel UI.
  - Applies appearance CSS variables and theme classes.

- `js/stars.js`
  - Draws the starfield and meteors on the canvas.

- `js/weather.js`
  - Shows weather data.
  - Uses browser geolocation or a manual city.
  - Uses Open-Meteo APIs.

- `js/artwork.js`
  - Loads the artwork list from `/artworks/artworks.json`.
  - Picks one artwork per day.
  - Shows the original image or the Shiba edited image.
  - Saves Shiba mode in `localStorage`.

- `js/pet.js`
  - Loads the Shiba pet spritesheet.
  - Creates the draggable pet.
  - Handles pet animation.
  - Handles drop targets for quick links and artwork toggle.

- `public/artworks/artworks.json`
  - Main artwork database.
  - Each artwork has title, artist, source URL, original image, and Shiba image.
  - Current state: 35 artworks, all 35 have Shiba edited images.

- `public/artworks/`
  - Original artwork images.

- `public/artworks/shiba/`
  - Shiba edited artwork images.
  - Current state: 35 PNG files.

- `public/pets/shiba/pet.json`
  - Shiba pet metadata.

- `public/pets/shiba/spritesheet.webp`
  - Shiba pet animation spritesheet.

## Data Rules

- Artwork image paths in `artworks.json` use absolute public paths.
- Example original image path:
  - `/artworks/van-gogh-sunflowers.jpg`
- Example Shiba image path:
  - `/artworks/shiba/van-gogh-sunflowers-shiba.png`
- Shiba image file names should follow this pattern:
  - `{artwork-slug}-shiba.png`

## Artwork State

- Total artworks: 35.
- Total Shiba edited artworks connected in JSON: 35.
- Missing Shiba edited artworks: 0.
- Shiba treatment types:
  - `face-replacement`
  - `landscape-shiba`
  - `custom-shiba`

## Build And Run

- Install dependencies:
  - `npm install`
- Start dev server:
  - `npm run dev`
- Build production files:
  - `npm run build`
- Build output folder:
  - `dist/`

## Known Legacy Code

- The old stock feature is still present in some files.
- Current user direction: do not use the stock module.
- Legacy stock-related files and code:
  - `js/stocks.js`
  - `api/stock.js`
  - stock CSS in `style.css`
  - stock defaults in `js/settings.js`
  - `lightweight-charts` dependency
  - stock text in `README.md`
- The stock UI is not connected on the page.
- Do not expand the stock feature unless the user asks.

## Notes For Future AI

- Prefer small changes.
- Do not remove user assets.
- Do not rename artwork files unless needed.
- If adding artwork, update both:
  - `public/artworks/artworks.json`
  - image files under `public/artworks/` and `public/artworks/shiba/`
- After editing artwork data, check:
  - JSON parses correctly.
  - Every `shibaImage` path exists.
  - `npm run build` succeeds.
