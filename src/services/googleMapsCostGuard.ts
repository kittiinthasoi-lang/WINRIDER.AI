/**
 * Compatibility request guard for location/public-data endpoints.
 * The guarded endpoints no longer require Google Maps/Places/Routes API keys;
 * caching and burst throttling are retained to protect our server and public sources.
 */
type CacheEntry = { expiresAt: number; response: Response };
const CACHE_TTL_MS = 300_000;
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 30;
const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<Response>>();
const windowCounts = new Map<string, { startedAt: number; count: number }>();
const LOCATION_DATA_PATHS = new Set([
  '/api/routes/compute', '/api/places/resolve-routes', '/api/radar/nearby-places',
  '/api/pet-care/nearby', '/api/emergency/nearby',
]);
function requestKey(input: RequestInfo | URL, init?: RequestInit): string {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const method = String(init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
  const body = typeof init?.body === 'string' ? init.body : input instanceof Request ? String(input.body || '') : '';
  return `${method}:${url}:${body}`;
}
function cloneResponse(response: Response): Response { return response.clone(); }
export function installGoogleMapsCostGuard(): void {
  if (typeof window === 'undefined') return;
  try {
    if ((window as any).__winriderGoogleMapsCostGuardInstalled) return;
    (window as any).__winriderGoogleMapsCostGuardInstalled = true;
  } catch {
    return;
  }

  if (typeof window.fetch !== 'function') return;
  const originalFetch = window.fetch.bind(window);

  const guardedFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    let pathname = '';
    try { pathname = new URL(url, window.location.href).pathname; } catch { return originalFetch(input, init); }
    if (!LOCATION_DATA_PATHS.has(pathname)) return originalFetch(input, init);
    const key = requestKey(input, init);
    const now = Date.now();
    const cached = cache.get(key);
    if (cached && cached.expiresAt > now) return cloneResponse(cached.response);
    const pending = inFlight.get(key);
    if (pending) return cloneResponse(await pending);
    const bucket = windowCounts.get(pathname);
    if (!bucket || now - bucket.startedAt >= WINDOW_MS) windowCounts.set(pathname, { startedAt: now, count: 1 });
    else if (bucket.count >= MAX_REQUESTS_PER_WINDOW) {
      if (cached) return cloneResponse(cached.response);
      for (const [k, v] of cache.entries()) {
        if (k.includes(pathname) && v?.response) {
          return cloneResponse(v.response);
        }
      }
      return new Response(JSON.stringify({ error: 'REQUEST_GUARDED', message: 'ระบบกำลังโหลดข้อมูลล่าสุด กรุณารอสักครู่' }), { status: 429, headers: { 'Content-Type': 'application/json' } });
    } else bucket.count += 1;
    const promise = originalFetch(input, init).then((response) => {
      if (response.ok) cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, response: cloneResponse(response) });
      return response;
    }).finally(() => inFlight.delete(key));
    inFlight.set(key, promise);
    return cloneResponse(await promise);
  };

  try {
    window.fetch = guardedFetch;
  } catch {
    try {
      Object.defineProperty(window, 'fetch', {
        value: guardedFetch,
        writable: true,
        configurable: true,
      });
    } catch {
      // If window.fetch is completely immutable in the runtime environment, fail gracefully
    }
  }
}
