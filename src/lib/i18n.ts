import { register, init, waitLocale } from 'svelte-i18n';

// Which locales you support
export const LOCALES = ['en', 'es'] as const;
export type Locale = (typeof LOCALES)[number];

// Where the cron drops the bundles (S3, CloudFront, etc.)
const CDN = 'https://cdn.example.com/messages';

for (const l of LOCALES) {
  // dynamic loader – runs only once per locale
  register(l, () => fetch(`${CDN}/${l}.json`, { cache: 'no-store' })
    .then(r => r.json()));
}

init({
  fallbackLocale: 'es',
  initialLocale: undefined  // we’ll set it in the hooks
});

// optional helper so pages can await it
export const ready = waitLocale();
