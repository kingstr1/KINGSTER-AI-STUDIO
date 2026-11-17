# KINGSTER AI STUDIO

A small, static website for gaming, creative ideas and a browser-based gameplay video montage maker.

## Features

- Home, Gaming, Arcade, AI, Creative, Tools, Help and About pages
- Responsive navigation with keyboard focus support
- Midnight aurora visual theme across the studio
- Homepage quick start and Help & FAQ for the editor
- Search engine sitemap and robots file
- Neon Reflex: a 30-second, touch-friendly mini game with a locally saved high score
- Local video montage export to WebM in supported browsers
- 30 selectable editing tools for motion, color, framing and titles
- Portrait, landscape and square formats; duration limit; optional music and overlay text
- Basic cuts, fade-style transitions, slow playback, grayscale and colour effects

## Run locally

No build step or package installation is needed. Open `index.html` in a current browser. For the most reliable video recording support, use current desktop Chrome or Edge. Some browsers restrict media features when a page is opened directly from disk; if that happens, serve this folder with a local static web server.

## Use the editor

Open **Gaming**, choose a few short video clips (up to 500 MB each), optionally select an audio track, adjust the settings and generate. The result downloads as a WebM file. Rendering uses device memory and processing power, so shorter clips are more reliable.

The edit description is currently a planning note and does not affect the export. This project does not use AI to analyse clips or find highlights. The editor does not upload selected media; processing happens in your browser. Only use media that you own or have permission to use.

## Publish with GitHub Pages

1. Create a GitHub repository for the project.
2. Add the files in this folder to the repository's root and commit them.
3. In the repository settings, open **Pages** and choose deployment from the `main` branch and root folder.
4. Save the setting and wait for GitHub Pages to publish the site. The Pages panel shows the published address.

The site is static and does not need a server, API key or build command. Do not add passwords, API keys or other secrets to the repository.

## Project files

- `index.html` — home page
- `gaming.html` — gaming page and video editor
- `arcade.html`, `arcade.js` — Neon Reflex mini game
- `help.html` — video editor and Arcade help
- `ai.html`, `creative.html`, `tools.html`, `about.html` — studio information pages
- `style.css`, `script.js` — shared styling and browser interactions
- `404.html` — GitHub Pages not-found page
- `favicon.svg` — site icon
- `sitemap.xml`, `robots.txt` — search indexing guidance
