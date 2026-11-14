import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

const isBrokerPalPreview = process.env.BROKER_PAL_PREVIEW === '1';

// https://astro.build/config
export default defineConfig({
  site: 'https://yourbrokerpal.com',
  output: 'server',
  adapter: cloudflare({ imageService: 'compile' }),
  define: {
    'import.meta.env.SITE_ENV': JSON.stringify(isBrokerPalPreview ? 'preview' : 'production')
  }
});
