import { browser } from '$app/environment';

type GoogleNamespace = any;

let loaderPromise: Promise<GoogleNamespace> | null = null;

function buildUrl(apiKey: string, language = 'es') {
  const base = new URL('https://maps.googleapis.com/maps/api/js');
  base.searchParams.set('key', apiKey);
  base.searchParams.set('language', language);
  base.searchParams.set('region', 'CO');
  base.searchParams.set('v', 'weekly');
  base.searchParams.set('loading', 'async');
  base.searchParams.set('callback', '__initGoogleMapsPlaces');
  return base.toString();
}

export function loadGooglePlaces(apiKey: string, language = 'es') {
  if (!browser) return Promise.reject(new Error('Places SDK unavailable during SSR'));
  const globalGoogle = (window as any).google;
  if (globalGoogle?.maps?.places?.Autocomplete) {
    return Promise.resolve(globalGoogle as GoogleNamespace);
  }
  if (!loaderPromise) {
    loaderPromise = new Promise((resolve, reject) => {
      if (!apiKey) {
        reject(new Error('Google Places API key is missing'));
        return;
      }
      const existingScript = document.querySelector<HTMLScriptElement>('#google-places-sdk');
      if (existingScript && (window as any).__googlePlacesReady) {
        resolve((window as any).__googlePlacesReady as GoogleNamespace);
        return;
      }
      (window as any).__initGoogleMapsPlaces = () => {
        (window as any).__googlePlacesReady = (window as any).google;
        resolve((window as any).google as GoogleNamespace);
      };
      const script = existingScript ?? document.createElement('script');
      if (!existingScript) {
        script.id = 'google-places-sdk';
        script.src = buildUrl(apiKey, language);
        script.async = true;
        script.defer = true;
        script.onerror = (event) => {
          reject(event);
        };
        document.head.appendChild(script);
      }
    });
  }
  return loaderPromise.then(async (google: GoogleNamespace) => {
    if (google?.maps?.importLibrary) {
      try {
        await google.maps.importLibrary('places');
      } catch (err) {
        console.warn('google.maps.importLibrary("places") failed', err);
      }
    }
    return google as GoogleNamespace;
  });
}
