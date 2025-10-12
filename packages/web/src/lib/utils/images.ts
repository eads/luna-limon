// $lib/utils/images.ts
import { dev } from '$app/environment';

// We'll set this via environment variable in production (used by server proxy)
const HAS_RESIZER = !dev && Boolean(process.env.RESIZER_URL);
const CDN_RESIZER_PATH = '/_image';

/**
 * Generate a resized image URL using our Lambda function
 */
export function getResizedImageUrl(originalUrl: string, width: number = 400): string {
  if (!originalUrl) return '';

  // In dev mode or if the resizer isn't configured, fall back to original URL
  if (dev || !HAS_RESIZER) {
    return originalUrl;
  }

  const params = new URLSearchParams({ url: originalUrl });
  if (width) params.set('w', width.toString());

  return `${CDN_RESIZER_PATH}?${params.toString()}`;
}

/**
 * Get multiple sizes for responsive images
 */
export function getResponsiveImageSizes(originalUrl: string) {
  if (!originalUrl) return { small: '', medium: '', large: '' };
  
  return {
    small: getResizedImageUrl(originalUrl, 200),   // thumbnail
    medium: getResizedImageUrl(originalUrl, 400),  // card size  
    large: getResizedImageUrl(originalUrl, 800)    // detail view
  };
}
