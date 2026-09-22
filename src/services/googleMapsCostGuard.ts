/**
 * Client-side Google Maps cost/traffic guard.
 *
 * This guard is deliberately conservative: it deduplicates identical in-flight
 * requests, caches successful responses briefly, and blocks accidental request
 * loops. It does not replace Google Cloud quota/billing controls.
 */

type CacheEntry = { expiresAt: number; response: Response };

const CACHE_TTL_MS = 30_000;
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 12;

const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<Response>>();
const windowCounts = new Map<string, { startedAt: number; count: number }>();

const GOOGLE_BACKED_PATHS = new Set([
  '/api/routes/compute',
  '/api/places/resolve-routes',
  '/api/radar/nearby-places',
  '/api/pet-care/nearby',
  '/api/emergency/nearby',
]);

function requestKey(input: RequestInfo | URL, init?: RequestInit): string {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const method = String(init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
  const body = typeof init?.body === 'string' ? init.body : input instanceof Request ? String(input.body || '') : '';
  return `${method}:${url}:${body}`;
}

function cloneResponse(response: Response): Response {
  return response.clone();
}

export function installGoogleMapsCostGuard(): void {
  if (typeof window === 'undefined' || (window as any).__winriderGoogleMapsCostGuardInstalled) return;
  (window as any).__winriderGoogleMapsCostGuardInstalled = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    let pathname = '';
    try { pathname = new URL(url, window.location.origin).pathname; } catch { return originalFetch(input, init); }

    if (!GOOGLE_BACKED_PATHS.has(pathname)) return originalFetch(input, init);

    const key = requestKey(input, init);
    const now = Date.now();

    const cached = cache.get(key);
    if (cached && cached.expiresAt > now) return cloneResponse(cached.response);
    if (cached) cache.delete(key);

    const pending = inFlight.get(key);
    if (pending) return cloneResponse(await pending);

    const bucket = windowCounts.get(pathname);
    if (!bucket || now - bucket.startedAt >= WINDOW_MS) {
      windowCounts.set(pathname, { startedAt: now, count: 1 });
    } else if (bucket.count >= MAX_REQUESTS_PER_WINDOW) {
      throw new Error(`Google Maps request guard: ${pathname} ถูกหยุดชั่วคราวเพื่อลดการเรียก API ซ้ำ`);
    } else {
      bucket.count += 1;
    }

    const promise = originalFetch(input, init).then((response) => {
      if (response.ok) {
        cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, response: cloneResponse(response) });
      }
      return response;
    }).finally(() => {
      inFlight.delete(key);
    });

    inFlight.set(key, promise);
    return cloneResponse(await promise);
  };
}
