import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  site: 'https://yourbrokerpal.com',
  output: 'server',
  session: false,
  compressHTML: true,
  adapter: cloudflare({ imageService: 'compile' })
});
