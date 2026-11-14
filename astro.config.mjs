import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// Preview builds consume the isolated Preview Wrangler config.
// Production builds continue to use wrangler.json by default.
const isBrokerPalPreview = process.env.BROKER_PAL_PREVIEW === '1';

// https://astro.build/config
export default defineConfig({
  site: 'https://yourbrokerpal.com',
  output: 'server',
  adapter: cloudflare({
    configPath: isBrokerPalPreview ? 'wrangler.preview.json' : 'wrangler.json',
    // Use build-time image processing to avoid a Cloudflare Images service binding.
    imageService: 'compile'
  }),
  // Resolve the preview flag at build time; page components must not read
  // Cloudflare runtime locals while rendering the homepage.
  define: {
    'import.meta.env.SITE_ENV': JSON.stringify(isBrokerPalPreview ? 'preview' : 'production')
  },
  // The site does not use Astro sessions. Disable them in every environment
  // so the adapter does not require or provision an unused KV namespace.
  session: false
});
