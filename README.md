# Coven docs

Documentation for [Coven](https://coven.network), published at [docs.coven.network](https://docs.coven.network).

Built with [Astro](https://astro.build) and [Starlight](https://starlight.astro.build).

## Run it

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # static site in dist/
npm run preview
```

## Writing

Pages live in `src/content/docs` as Markdown, one file per page. The sidebar is defined in `astro.config.mjs`; a new page has to be listed there to appear.

Front matter needs a title and a description:

```md
---
title: Swapping
description: How Coven prices a trade and what protects the person making it.
---
```

Search is built at compile time, so no service is involved.

## Publishing

`npm run build` produces a static site in `dist/`, which any static host serves. On Cloudflare Pages, Vercel or Netlify, set the build command to `npm run build` and the output directory to `dist`, then point `docs.coven.network` at it.

`site` in `astro.config.mjs` is set to `https://docs.coven.network`, which the generated sitemap and canonical URLs use. Change it if the domain changes.
