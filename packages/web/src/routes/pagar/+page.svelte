<script lang="ts">
import { onMount } from 'svelte';
import { cart, type Product as CartProduct } from '$lib/cart';
import { goto } from '$app/navigation';
import { useI18n } from '$lib/i18n/context';
import Icon from '@iconify/svelte';
import whatsappIcon from '@iconify-icons/mdi/whatsapp';
const { t } = useI18n();
// locale-based selectors for product fields
import { getLocale } from '$lib/paraglide/runtime.js';
import { loadGooglePlaces } from '$lib/utils/googlePlaces';
import { PUBLIC_GOOGLE_PLACES_KEY } from '$env/static/public';
  const nameOf = (p: CartProduct) => {
    const n: any = (p as any)?.nombre;
    if (!n) return '';
    if (typeof n === 'string') return n;
    const loc = getLocale() as 'es' | 'en';
    return n[loc] ?? n.es ?? n.en ?? '';
  };
  const imageOf = (p: any): string => {
    const raw = p?.imagen;
    if (!raw) return '';
    if (typeof raw === 'string') return raw;
    if (Array.isArray(raw) && raw.length) {
      const first = raw[0];
      if (typeof first === 'string') return first;
      if (first && typeof first === 'object') {
        // Airtable attachment object shapes
        const obj = first as any;
        if (obj.url) return obj.url as string;
        if (obj.thumbnails?.large?.url) return obj.thumbnails.large.url as string;
        if (obj.thumbnails?.full?.url) return obj.thumbnails.full.url as string;
      }
    }
    if (raw && typeof raw === 'object' && 'url' in raw) return raw.url as string;
    return '';
  };
  import { getResizedImageUrl } from '$lib/utils/images';
  // Prefer a robust image getter that falls back to server-provided calendar image
  function imageFor(p: any): string {
    const cal = data?.calendar;
    // To avoid hydration mismatch on the calendar item, always prefer
    // the server-provided calendar image when ids match.
    if (cal && p?.id === cal.id) {
      return imageOf({ imagen: cal.imagen });
    }
    const u = imageOf(p);
    if (u) return u;
    return '';
  }
  // Prefer server-provided calendar name to avoid stale localStorage cart names
  function displayName(p: CartProduct): string {
    const cal = data?.calendar;
    if (cal && p?.id === cal.id) return cal.nombre;
    return nameOf(p);
  }
  type SrvProduct = { id: string; nombre: string; descripción: string; precio: number; imagen?: any };
  let { data } = $props<{ data: { calendar?: SrvProduct } }>();
  // No fallbacks: all strings must exist in the DB
  
  // Currency formatter for Colombian pesos
  const fmtCOP = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  });
  function fetchPredictions(input: string) {
    if (!autocompleteService) return;
    const placesNs = (window as any).google?.maps?.places;
    ensureSession(placesNs);
    autocompleteService.getPlacePredictions(
      {
        input,
        componentRestrictions: { country: ['co'] },
        sessionToken,
        types: ['geocode'],
        language: 'es'
      },
      (results: any[], status: any) => {
        if (status !== placesNs?.PlacesServiceStatus?.OK || !results?.length) {
          clearSuggestions();
          return;
        }
        suggestions = results;
        highlightedIndex = -1;
        suggestionsOpen = true;
      }
    );
  }
  function selectPrediction(prediction: any) {
    if (!prediction) return;
    if (placesService) {
      placesService.getDetails(
        {
          placeId: prediction.place_id,
          fields: ['address_components', 'formatted_address'],
          sessionToken
        },
        (place: any, status: any) => {
          const okStatus = (window as any).google?.maps?.places?.PlacesServiceStatus?.OK;
          if (status === okStatus && place) {
            applyPlace(place);
          } else {
            checkoutLog('getDetails fallback using prediction description');
            applyPlace({ formatted_address: prediction.description });
          }
          clearSuggestions();
          sessionToken = null;
        }
      );
    } else {
      applyPlace({ formatted_address: prediction.description });
      clearSuggestions();
    }
  }
  function handleDireccionInput(event: Event) {
    const value = (event.currentTarget as HTMLInputElement).value;
    direccion_envio = value;
    persistToStorage();
    if (!value.trim()) {
      clearSuggestions();
      return;
    }
    fetchPredictions(value.trim());
  }
  function handleDireccionKeydown(event: KeyboardEvent) {
    if (!suggestionsOpen || !suggestions.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      highlightedIndex = (highlightedIndex + 1) % suggestions.length;
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      highlightedIndex = highlightedIndex <= 0 ? suggestions.length - 1 : highlightedIndex - 1;
    } else if (event.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        event.preventDefault();
        selectPrediction(suggestions[highlightedIndex]);
      }
    } else if (event.key === 'Escape') {
      clearSuggestions();
    }
  }
  function handleDireccionBlur() {
    setTimeout(() => {
      clearSuggestions();
    }, 120);
  }

  // Customer fields
  let nombre = $state('');
  let correo_electronico = $state('');
  let numero_whatsapp = $state('');
  let direccion_envio = $state('');
  // Additional address fields for shipping quotes
  let ciudad = $state('');
  let departamento = $state('');
  let codigo_postal = $state('');
  let notas_cliente = $state('');

  let direccionInputEl: HTMLInputElement | null = null;
  let detachAddressAutocomplete: (() => void) | null = null;
  let autocompleteService: any = null;
  let placesService: any = null;
  let sessionToken: any = null;
  let suggestions = $state<any[]>([]);
  let suggestionsOpen = $state(false);
  let highlightedIndex = $state(-1);

  let submitting = $state(false);
  let errorMsg = $state('');
  let submitAttempted = $state(false);

  // Local storage persistence (best-effort; browser-only)
  const LS_KEY = 'checkout_info_v1';
  function loadFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const obj = JSON.parse(raw || '{}');
      if (obj.nombre) nombre = obj.nombre;
      if (obj.correo_electronico) correo_electronico = obj.correo_electronico;
      if (obj.numero_whatsapp) numero_whatsapp = obj.numero_whatsapp;
      if (obj.direccion_envio) direccion_envio = obj.direccion_envio;
      if (obj.ciudad) ciudad = obj.ciudad;
      if (obj.departamento) departamento = obj.departamento;
      if (obj.codigo_postal) codigo_postal = obj.codigo_postal;
      // Do not restore delivery date to avoid accidental reuse
      if (obj.notas_cliente) notas_cliente = obj.notas_cliente;
    } catch {}
  }
  function persistToStorage() {
    if (typeof window === 'undefined') return;
    try {
      const obj = {
        nombre,
        correo_electronico,
        numero_whatsapp,
        direccion_envio,
        ciudad,
        departamento,
        codigo_postal,
        // Do not persist delivery date to encourage fresh intent each time
        notas_cliente
      };
      localStorage.setItem(LS_KEY, JSON.stringify(obj));
    } catch {}
  }
  // load once
  if (typeof window !== 'undefined') {
    loadFromStorage();
  }

  // Validation helpers
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
  function isValidEmail(v: string) { return emailRe.test((v || '').trim()); }
  function normalizePhoneCO(v: string) {
    const digits = (v || '').replace(/\D+/g, '');
    if (digits.startsWith('57')) return `+${digits}`; // already has country code
    if (digits.length === 10) return `+57${digits}`; // local mobile format
    if (digits.length === 12 && digits.startsWith('57')) return `+${digits}`;
    return v.trim();
  }
  function isValidPhoneCO(v: string) {
    const d = (v || '').replace(/\D+/g, '');
    if (d.startsWith('57') && d.length === 12) return true; // 57 + 10
    if (d.length === 10) return true;
    return false;
  }
  function minDeliveryDate(): string {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  const isNonEmpty = (s: string) => (s || '').trim().length > 0;
  function validateAll() {
    const okNombre = isNonEmpty(nombre);
    const okEmail = isValidEmail(correo_electronico);
    const okPhone = isValidPhoneCO(numero_whatsapp);
    const okDir = true;
    const okCiudad = isNonEmpty(ciudad);
    const okDepto = isNonEmpty(departamento);
    return { okNombre, okEmail, okPhone, okCiudad, okDepto, all: okNombre && okEmail && okPhone && okCiudad && okDepto };
  }
  function scrollToFirstInvalid() {
    const v = validateAll();
    const order = [
      ['nombre', v.okNombre],
      ['correo', v.okEmail],
      ['whatsapp', v.okPhone],
      ['ciudad', v.okCiudad],
      ['departamento', v.okDepto]
    ] as const;
    for (const [id, ok] of order) {
      if (!ok) {
        const el = document.getElementById(`fld-${id}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          (el as HTMLInputElement | HTMLTextAreaElement).focus();
        }
        break;
      }
    }
  }
  const items = $derived($cart as unknown as { product: CartProduct; quantity: number }[]);
  const calendarAsCart = $derived(data.calendar ? ({
    id: data.calendar.id,
    nombre: { es: data.calendar.nombre, en: data.calendar.nombre },
    descripción: { es: data.calendar.descripción, en: data.calendar.descripción },
    precio: data.calendar.precio,
    imagen: data.calendar.imagen
  } satisfies CartProduct) : null);
  const renderItems = $derived(items.length ? items : (calendarAsCart ? [{ product: calendarAsCart, quantity: 0 }] : []));
  const total = $derived(items.reduce((sum, i) => sum + i.product.precio * i.quantity, 0));
  // No auto-add; we show a zero-qty preview when cart is empty

  const BASE_QUANTITY_OPTIONS = Array.from({ length: 13 }, (_, i) => i);
  const MAX_BASE_QUANTITY = BASE_QUANTITY_OPTIONS[BASE_QUANTITY_OPTIONS.length - 1];
  const quantityText = $derived(() => {
    const raw = t('carrito.checkout.labels.quantity');
    if (raw && raw.trim().length) return raw;
    return 'Cantidad';
  });
  const checkoutLog = (...args: unknown[]) => {
    if (import.meta.env.DEV) {
      console.info('[checkout]', ...args);
      return;
    }
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.getAll('debug').includes('checkout')) {
      console.info('[checkout]', ...args);
    }
  };
  type CityDirectoryEntry = { ciudad: string; departamento: string };
  const CITY_DIRECTORY: CityDirectoryEntry[] = [
    { ciudad: 'Bogotá', departamento: 'Cundinamarca' },
    { ciudad: 'Medellín', departamento: 'Antioquia' },
    { ciudad: 'Cali', departamento: 'Valle del Cauca' },
    { ciudad: 'Barranquilla', departamento: 'Atlántico' },
    { ciudad: 'Cartagena', departamento: 'Bolívar' },
    { ciudad: 'Bucaramanga', departamento: 'Santander' },
    { ciudad: 'Manizales', departamento: 'Caldas' },
    { ciudad: 'Pereira', departamento: 'Risaralda' },
    { ciudad: 'Cúcuta', departamento: 'Norte de Santander' },
    { ciudad: 'Ibagué', departamento: 'Tolima' },
    { ciudad: 'Santa Marta', departamento: 'Magdalena' },
    { ciudad: 'Villavicencio', departamento: 'Meta' },
    { ciudad: 'Neiva', departamento: 'Huila' },
    { ciudad: 'Tunja', departamento: 'Boyacá' },
    { ciudad: 'Popayán', departamento: 'Cauca' },
    { ciudad: 'Armenia', departamento: 'Quindío' },
    { ciudad: 'Sincelejo', departamento: 'Sucre' },
    { ciudad: 'Montería', departamento: 'Córdoba' },
    { ciudad: 'Pasto', departamento: 'Nariño' },
    { ciudad: 'Valledupar', departamento: 'Cesar' }
  ];
  const normalizeText = (value: string): string =>
    (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .trim();
  const lookupCity = (value: string): CityDirectoryEntry | undefined => {
    const normalized = normalizeText(value);
    if (!normalized) return undefined;
    return CITY_DIRECTORY.find((entry) => {
      const city = normalizeText(entry.ciudad);
      const combined = normalizeText(`${entry.ciudad}, ${entry.departamento}`);
      return normalized === city || normalized === combined;
    });
  };
  function applyPlace(place: any) {
    checkoutLog('Autocomplete selection', place?.formatted_address ?? '(sin dirección)');
    if (place?.formatted_address) {
      direccion_envio = place.formatted_address;
      if (direccionInputEl) {
        direccionInputEl.value = place.formatted_address;
      }
    }
    if (place?.address_components) {
      type AddressComponent = { long_name?: string; types?: string[] };
      const components = place.address_components as AddressComponent[];
      const cityComp = components.find((component) => (component.types ?? []).includes('locality'));
      const departmentComp =
        components.find((component) => (component.types ?? []).includes('administrative_area_level_1')) ??
        components.find((component) => (component.types ?? []).includes('political'));
      const postalComp = components.find((component) => (component.types ?? []).includes('postal_code'));
      if (cityComp?.long_name) {
        ciudad = cityComp.long_name;
      }
      if (departmentComp?.long_name) {
        departamento = departmentComp.long_name;
      }
      if (postalComp?.long_name) {
        codigo_postal = postalComp.long_name;
      }
    } else {
      checkoutLog('Autocomplete place missing address_components.');
    }
    persistToStorage();
  }
  const clearSuggestions = () => {
    suggestions = [];
    highlightedIndex = -1;
    suggestionsOpen = false;
  };
  const ensureSession = (placesNs: any) => {
    if (!sessionToken && placesNs?.AutocompleteSessionToken) {
      sessionToken = new placesNs.AutocompleteSessionToken();
    }
  };
  function handlePlaceElementChange(event: CustomEvent<any>) {
    const element = event.currentTarget as any;
    const detail = event.detail ?? {};
    const place =
      detail.place ??
      (typeof element.getPlace === 'function' ? element.getPlace() : undefined) ??
      element.place ??
      element.value ??
      null;
    applyPlace(place);
  }
  function handleCityInputEvent(event: Event) {
    const inputEl = event.currentTarget as HTMLInputElement;
    const value = inputEl.value;
    const match = lookupCity(value);
    if (match) {
      if (normalizeText(ciudad) !== normalizeText(match.ciudad)) {
        ciudad = match.ciudad;
      }
      if (!departamento || normalizeText(departamento) !== normalizeText(match.departamento)) {
        departamento = match.departamento;
      }
      if (inputEl.value !== match.ciudad) {
        inputEl.value = match.ciudad;
      }
    }
    persistToStorage();
  }

  onMount(() => {
    if (typeof window === 'undefined') return;
    const envKey = (PUBLIC_GOOGLE_PLACES_KEY || '').trim();
    const runtimeKey =
      (import.meta.env.PUBLIC_GOOGLE_PLACES_KEY as string | undefined) ??
      (import.meta.env.PUBLIC_GOOGLE_MAPS_KEY as string | undefined) ??
      '';
    const apiKey = envKey || (runtimeKey || '').trim();
    checkoutLog(
      'Initializing Google Places autocomplete',
      envKey ? '(static env key found)' : '(static env key missing)'
    );
    if (!apiKey) {
      checkoutLog('Google Places API key missing; autocomplete disabled.');
      return () => {
        detachAddressAutocomplete?.();
      };
    }
    let disposed = false;
    checkoutLog('Loading Google Places SDK…');
    loadGooglePlaces(apiKey)
      .then((google) => {
        if (disposed) {
          checkoutLog('Google Places resolved after teardown; skipping setup.');
          return;
        }
        if (!direccionInputEl) {
          checkoutLog('Address input element not ready; cannot attach autocomplete.');
          return;
        }
        checkoutLog('Google Places SDK ready; attaching autocomplete.');
        const placesNs = google.maps?.places ?? {};
        checkoutLog(
          'places namespace keys',
          Object.keys(placesNs ?? {}).join(',') || '(none)'
        );
        try {
          autocompleteService = new placesNs.AutocompleteService();
          placesService = new placesNs.PlacesService(document.createElement('div'));
          checkoutLog('Places services initialised.');
        } catch (err) {
          checkoutLog('Failed to create Places services', err);
        }
        detachAddressAutocomplete = () => {
          checkoutLog('Disposing autocomplete services.');
          suggestions = [];
          highlightedIndex = -1;
          suggestionsOpen = false;
          sessionToken = null;
          detachAddressAutocomplete = null;
        };
      })
      .catch((err) => {
        // silence errors; autocomplete is optional
        checkoutLog('Failed to load Google Places SDK', err);
      });

    return () => {
      disposed = true;
      checkoutLog('Tearing down Google Places autocomplete.');
      detachAddressAutocomplete?.();
    };
  });
  function optionsForQuantity(current: number): number[] {
    if (current <= MAX_BASE_QUANTITY) {
      return BASE_QUANTITY_OPTIONS;
    }
    return Array.from({ length: current + 1 }, (_, i) => i);
  }
  function updateQuantity(product: CartProduct, nextQuantity: number) {
    if (Number.isNaN(nextQuantity)) return;
    const existing = $cart.find((i) => i.product.id === product.id);
    if (!existing) {
      if (nextQuantity > 0) {
        cart.add(product, nextQuantity);
      }
      return;
    }
    cart.setQuantity(product.id, nextQuantity);
  }

  async function placeOrder() {
    if ($cart.length === 0 || submitting) return;
    submitAttempted = true;
    const v = validateAll();
    if (!v.all) {
      scrollToFirstInvalid();
      return;
    }
    submitting = true;
    errorMsg = '';
    try {
      // Normalize phone before sending
      const phoneNormalized = normalizePhoneCO(numero_whatsapp);
      const res = await fetch('/api/order', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          nombre,
          correo_electronico,
          direccion_envio,
          ciudad,
          departamento,
          codigo_postal,
          notas_cliente,
          phone: phoneNormalized,
          items: $cart,
        }),
      });
      if (!res.ok) {
        let detail = '';
        try { const j = await res.json(); detail = j?.message || j?.detail || ''; } catch {}
        throw new Error(detail || `Error ${res.status}`);
      }
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        const id = data.pedidoId ? `?pedido-id=${encodeURIComponent(data.pedidoId)}` : '';
        goto(`/pagar/exito${id}`);
      }
    } catch (err) {
      // Flag the error; the rendered message uses t('pagar.error')
      errorMsg = (err as any)?.message || 'error';
    } finally {
      submitting = false;
    }
  }
</script>

  <div class="max-w-md mx-auto pt-6 px-4 md:px-0 pb-16">
<h1 class="text-3xl md:text-4xl font-extrabold tracking-tight mb-3 pagar-title">{t('pagar.titulo')}</h1>

{#if renderItems.length}
  <!-- Order summary first with warm backdrop and fewer lines -->
  <div class="u-full-bleed mb-8" style="background-color:#edeae6; box-shadow: inset 0 -10px 14px -12px rgba(0,0,0,0.2);">
    <section class="mx-auto max-w-lg px-4 pt-8 pb-6 order-summary">
      <ul class="space-y-3">
        {#each renderItems as { product, quantity } (product.id)}
          <li class="order-item">
            <div class="order-item__media">
              {#if imageFor(product)}
                <div class="preview-image-wrapper">
                  <img
                    src={getResizedImageUrl(imageFor(product), 600)}
                    alt={nameOf(product)}
                    class="w-full h-auto object-cover"
                    loading="lazy"
                  />
                </div>
              {/if}
            </div>
            <div class="order-item__qty">
              <label class="order-item__qty-label">
                <span class="order-item__title order-item__title--compact">{displayName(product)}</span>
                <div class="order-item__select-shell">
                  <select
                    class="order-item__select"
                    aria-label={`${displayName(product)} – ${quantityText}`}
                    onchange={(event) => {
                      const next = Number((event.currentTarget as HTMLSelectElement).value);
                      updateQuantity(product, next);
                    }}
                  >
                    {#each optionsForQuantity(quantity) as option}
                      <option value={option} selected={option === quantity}>{option}</option>
                    {/each}
                  </select>
                </div>
              </label>
            </div>
          </li>
        {/each}
      </ul>
      <div class="summary-total">
        <div class="summary-total__label">{t('pagar.total')}</div>
        <div class="summary-total__value">{fmtCOP.format(total)}</div>
      </div>
    </section>
  </div>
{/if}

{#if !$cart.length}
  <div class="mt-4 p-3 text-center text-gray-700 bg-white/70 border rounded-lg">{t('carrito.vacio')}</div>
{/if}

  <div class="grid gap-3 mb-5" class:opacity-60={!$cart.length}>
  <label class="block">
    <span class="text-base text-gray-800">{t('pagar.nombre')}</span>
    <input id="fld-nombre" name="name" autocomplete="name" class="mt-1 w-full rounded-xl border p-4 text-base text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300" class:border-red-500={submitAttempted && !validateAll().okNombre} bind:value={nombre} placeholder={t('pagar.placeholder.nombre')} disabled={!$cart.length} oninput={persistToStorage} />
    {#if submitAttempted && !validateAll().okNombre}
      <p class="text-sm text-red-600 mt-1">{t('pagar.validacion.requerido')}</p>
    {/if}
  </label>

  <label class="block">
    <span class="text-base text-gray-800">{t('pagar.correo')}</span>
    <input id="fld-correo" name="email" autocomplete="email" class="mt-1 w-full rounded-xl border p-4 text-base text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300" class:border-red-500={submitAttempted && !validateAll().okEmail} type="email" bind:value={correo_electronico} placeholder={t('pagar.placeholder.correo')} disabled={!$cart.length} oninput={persistToStorage} />
    {#if submitAttempted && !validateAll().okEmail}
      <p class="text-sm text-red-600 mt-1">{t('pagar.validacion.correo_invalido')}</p>
    {/if}
  </label>

  <label class="block">
    <span class="flex items-center gap-2 text-base text-gray-800">
      <Icon icon={whatsappIcon} class="h-5 w-5 text-emerald-500" aria-hidden="true" />
      {t('pagar.whatsapp')}
    </span>
    <input id="fld-whatsapp" name="tel" type="tel" inputmode="numeric" autocomplete="tel" class="mt-1 w-full rounded-xl border p-4 text-base text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300" class:border-red-500={submitAttempted && !validateAll().okPhone} bind:value={numero_whatsapp} placeholder={t('pagar.placeholder.whatsapp')} disabled={!$cart.length} onblur={() => { numero_whatsapp = normalizePhoneCO(numero_whatsapp); persistToStorage(); }} oninput={persistToStorage} />
    {#if submitAttempted && !validateAll().okPhone}
      <p class="text-sm text-red-600 mt-1">{t('pagar.validacion.telefono_invalido')}</p>
    {/if}
  </label>

  <label class="block relative">
    <span class="text-base text-gray-800">{t('pagar.direccion_envio')}</span>
    <input
      id="fld-direccion"
      name="street-address"
      type="text"
      autocomplete="street-address"
      class="mt-1 w-full rounded-xl border p-4 text-base text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300"
      bind:this={direccionInputEl}
      bind:value={direccion_envio}
      placeholder={t('pagar.placeholder.direccion')}
      disabled={!$cart.length}
      oninput={handleDireccionInput}
      onkeydown={handleDireccionKeydown}
      onblur={handleDireccionBlur}
    />
    {#if suggestionsOpen && suggestions.length}
      <ul class="address-suggestions">
        {#each suggestions as suggestion, i}
          <li>
            <button
              type="button"
              class:active-suggestion={highlightedIndex === i}
              onclick={() => selectPrediction(suggestion)}
              onmouseenter={() => (highlightedIndex = i)}
            >
              {suggestion.structured_formatting?.main_text ?? suggestion.description}
              {#if suggestion.structured_formatting?.secondary_text}
                <span class="address-secondary">{suggestion.structured_formatting.secondary_text}</span>
              {/if}
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </label>

  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <label class="block">
      <span class="text-base text-gray-800">{t('pagar.ciudad')}</span>
      <input
        id="fld-ciudad"
        name="city"
        autocomplete="address-level2"
        class="mt-1 w-full rounded-xl border p-4 text-base text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300"
        class:border-red-500={submitAttempted && !validateAll().okCiudad}
        bind:value={ciudad}
        placeholder={t('pagar.placeholder.ciudad')}
        disabled={!$cart.length}
        list="checkout-city-options"
        oninput={handleCityInputEvent}
      />
      <datalist id="checkout-city-options">
        {#each CITY_DIRECTORY as option (option.ciudad)}
          <option value={`${option.ciudad}, ${option.departamento}`}></option>
        {/each}
      </datalist>
      {#if submitAttempted && !validateAll().okCiudad}
        <p class="text-sm text-red-600 mt-1">{t('pagar.validacion.requerido')}</p>
      {/if}
    </label>
    <label class="block">
      <span class="text-base text-gray-800">{t('pagar.departamento')}</span>
      <input id="fld-departamento" class="mt-1 w-full rounded-xl border p-4 text-base text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300" class:border-red-500={submitAttempted && !validateAll().okDepto} bind:value={departamento} placeholder={t('pagar.placeholder.departamento')} disabled={!$cart.length} oninput={persistToStorage} />
      {#if submitAttempted && !validateAll().okDepto}
        <p class="text-sm text-red-600 mt-1">{t('pagar.validacion.requerido')}</p>
      {/if}
    </label>
  </div>
  <label class="block">
    <span class="text-base text-gray-800">{t('pagar.codigo_postal')}</span>
    <input id="fld-codpostal" class="mt-1 w-full rounded-xl border p-4 text-base text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300" bind:value={codigo_postal} placeholder={t('pagar.placeholder.codigo_postal')} disabled={!$cart.length} oninput={persistToStorage} />
  </label>

  <label class="block">
    <span class="text-base text-gray-800">{t('pagar.notas')}</span>
    <textarea name="notes" autocomplete="off" class="mt-1 w-full rounded-xl border border-gray-400 p-4 text-base text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300" rows="3" bind:value={notas_cliente} placeholder={t('pagar.placeholder.notas')} disabled={!$cart.length}></textarea>
  </label>
  {#if errorMsg}
    <p class="text-red-600 mb-1 text-sm">{t('pagar.error')}: {errorMsg}</p>
  {/if}
</div>

<button
  class="w-full rounded-lg bg-emerald-600 disabled:bg-emerald-300 text-white py-3 px-4 shadow-sm"
  onclick={placeOrder}
  disabled={submitting || $cart.length === 0}
>
  {submitting ? t('pagar.procesando') : t('pagar.realizar_pedido')}
</button>

</div>

<style>
  .pagar-title {
    font-family: 'Elgraine', 'Montserrat', 'Helvetica Neue', sans-serif;
    font-weight: 500;
  }

  .order-item {
    display: flex;
    flex-direction: column;
    gap: clamp(0.9rem, 1vw, 1.4rem);
    width: 100%;
  }

  @media (min-width: 640px) {
    .order-item {
      flex-direction: row;
      align-items: flex-start;
      gap: clamp(1.1rem, 1.5vw, 1.6rem);
    }
  }

  .order-item__media {
    flex: 1 1 auto;
    min-width: 0;
    max-width: 30rem;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  @media (min-width: 640px) {
    .order-item__media {
      max-width: 38rem;
    }
  }

  .order-item__title {
    font-size: clamp(0.95rem, 0.22vw + 0.98rem, 1.18rem);
    font-weight: 500;
    color: #2c2623;
    line-height: 1.35;
  }

  .order-item__title--compact {
    display: block;
    margin-bottom: clamp(0.35rem, 0.45vw, 0.6rem);
    text-align: right;
  }

  .order-item__qty {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: clamp(0.65rem, 0.85vw, 0.95rem);
    width: 100%;
    min-width: 0;
  }

  @media (min-width: 640px) {
    .order-item__qty {
      margin-left: auto;
      width: auto;
      min-width: clamp(9.5rem, 30vw, 12rem);
    }
  }

  .order-item__qty-label {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: clamp(0.45rem, 0.6vw, 0.75rem);
    width: 100%;
    text-align: right;
  }

  .order-item__select-shell {
    position: relative;
    width: 100%;
  }

  .order-item__select {
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    width: 100%;
    border-radius: 9999px;
    border: 2px solid #2a1f1a;
    background-color: #ffffff;
    background-image: none;
    background-repeat: no-repeat;
    padding: clamp(0.7rem, 0.9vw, 0.9rem) 2.9rem clamp(0.7rem, 0.9vw, 0.9rem) 1.25rem;
    font-size: clamp(1.08rem, 0.35vw + 1rem, 1.35rem);
    font-weight: 700;
    line-height: 1.1;
    color: #201916;
    cursor: pointer;
    box-shadow:
      0 18px 32px -24px rgba(25, 15, 20, 0.5),
      0 10px 24px -20px rgba(25, 15, 20, 0.28),
      inset 0 0 0 1px rgba(255, 255, 255, 0.5);
    transition:
      border-color 160ms ease,
      box-shadow 160ms ease,
      transform 160ms ease;
  }

  .order-item__select:focus {
    outline: none;
    border-color: #f3a361;
    box-shadow:
      0 22px 36px -22px rgba(181, 118, 62, 0.4),
      0 0 0 3px rgba(243, 163, 97, 0.18);
  }

  .order-item__select:hover {
    transform: translateY(-1px);
  }

  .order-item__select-shell::after {
    content: '';
    position: absolute;
    right: 1.4rem;
    top: 50%;
    margin-top: -0.3rem;
    border-left: 0.4rem solid transparent;
    border-right: 0.4rem solid transparent;
    border-top: 0.55rem solid #2a1f1a;
    pointer-events: none;
  }

  .order-item__select::-ms-expand {
    display: none;
  }

  .order-summary {
    display: flex;
    flex-direction: column;
    gap: clamp(1.2rem, 1.6vw, 1.9rem);
  }

  .summary-total {
    width: 100%;
    border-top: 1px solid rgba(68, 58, 52, 0.12);
    padding-top: clamp(1rem, 1.3vw, 1.6rem);
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: clamp(1rem, 1.1vw, 1.4rem);
  }

  .summary-total__label {
    font-size: 0.95rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(56, 47, 42, 0.8);
    margin-bottom: 0;
    text-align: left;
  }

  .summary-total__value {
    font-size: clamp(1.6rem, 0.65vw + 1.5rem, 2.1rem);
    font-weight: 650;
    color: #2b211b;
    margin-left: auto;
    text-align: right;
  }

  .preview-image-wrapper {
    position: relative;
    width: 100%;
    border-radius: clamp(12px, 3vw, 20px);
    overflow: hidden;
    box-shadow:
      0 24px 40px -28px rgba(25, 15, 20, 0.45),
      0 10px 24px -18px rgba(25, 15, 20, 0.35),
      inset 0 0 0 1px rgba(255, 255, 255, 0.6);
  }

  .preview-image-wrapper img {
    display: block;
    width: 100%;
    height: auto;
  }

  .address-suggestions {
    position: absolute;
    inset-inline-start: 0;
    inset-inline-end: 0;
    top: calc(100% + 0.35rem);
    z-index: 30;
    border-radius: 14px;
    border: 1px solid rgba(43, 33, 27, 0.12);
    background: #ffffff;
    box-shadow: 0 16px 30px -18px rgba(30, 20, 15, 0.4);
    padding: 0.4rem;
    list-style: none;
    max-height: 18rem;
    overflow-y: auto;
  }

  .address-suggestions li + li {
    margin-top: 0.25rem;
  }

  .address-suggestions button {
    width: 100%;
    text-align: left;
    padding: 0.55rem 0.75rem;
    border-radius: 10px;
    background: transparent;
    border: none;
    font-size: 0.95rem;
    color: #2b211b;
    line-height: 1.35;
    cursor: pointer;
    transition: background-color 140ms ease, color 140ms ease;
  }

  .address-suggestions button:hover,
  .address-suggestions button.active-suggestion {
    background-color: rgba(243, 163, 97, 0.12);
    color: #1f120d;
  }

  .address-secondary {
    display: block;
    font-size: 0.8rem;
    color: rgba(43, 33, 27, 0.6);
    margin-top: 0.1rem;
  }
</style>
