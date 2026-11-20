import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// Build a Preview-specific Worker using only wrangler.preview.json bindings.
// This prevents the generated dist/server/wrangler.json from inheriting
// Production D1 or other Production resource bindings. Preview also disables
// sessions and uses passthrough images to avoid auto-provisioned services.
export default defineConfig({
  site: 'https://yourbrokerpal.com',
  output: 'server',
  session: false,
  adapter: cloudflare({ configPath: 'wrangler.preview.json', imageService: 'passthrough' })
});
