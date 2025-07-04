// $lib/utils/images.ts
import { dev } from '$app/environment';

// We'll set this via environment variable in production
const RESIZER_URL = dev ? null : process.env.RESIZER_URL;

/**
 * Generate a resized image URL using our Lambda function
 */
export function getResizedImageUrl(originalUrl: string, width: number = 400): string {
  if (!originalUrl) return '';
  
  // In dev mode or if no resizer URL, just return the original URL
  if (dev || !RESIZER_URL) {
    return originalUrl;
  }
  
  const params = new URLSearchParams({
    url: originalUrl,
    w: width.toString()
  });
  
  return `${RESIZER_URL}?${params.toString()}`;
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