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
    imageService: 'compile',
    // No site code uses Astro sessions; keep Preview independent of any KV namespace.
    session: isBrokerPalPreview ? false : true
  })
});
