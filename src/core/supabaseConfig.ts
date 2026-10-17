/** Accept hosted/custom HTTPS domains without exposing credentials in URLs. */
export function isSupabaseUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password &&
      !url.search && !url.hash && url.pathname === '/' &&
      !url.hostname.includes('your-project');
  } catch { return false; }
}

/** Only publishable or legacy anon keys may be shipped to a browser. */
export function isPublicSupabaseKey(value: string): boolean {
  if (value.startsWith('sb_publishable_')) return value.length > 'sb_publishable_'.length;
  try {
    const parts = value.split('.');
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.role === 'anon';
  } catch { return false; }
}
