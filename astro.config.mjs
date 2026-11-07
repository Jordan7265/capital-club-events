// @ts-check
import { defineConfig } from 'astro/config';

// Fully static build: no adapter, no server routes, no sitemap (the site must not be indexed).
export default defineConfig({
  output: 'static',
  trailingSlash: 'ignore',
  build: {
    format: 'directory',
  },
});
