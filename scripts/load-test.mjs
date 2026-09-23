/**
 * Production-like load test harness for WINRIDER.AI.
 * Requires an explicit HTTPS target and bearer token. Run only against an
 * environment you are authorized to test.
 */
const target = process.env.LOAD_TEST_BASE_URL;
const token = process.env.LOAD_TEST_BEARER_TOKEN;
const concurrency = Math.max(1, Math.min(100, Number(process.env.LOAD_TEST_CONCURRENCY || 20)));
const rounds = Math.max(1, Math.min(100, Number(process.env.LOAD_TEST_ROUNDS || 10)));
if (!target || !/^https:\/\//.test(target)) throw new Error('LOAD_TEST_BASE_URL=https://... is required');
if (!token) throw new Error('LOAD_TEST_BEARER_TOKEN is required');
const endpoint = new URL('/api/health', target).toString();
let ok = 0, failed = 0;
const latencies = [];
for (let r = 0; r < rounds; r++) {
  await Promise.all(Array.from({ length: concurrency }, async () => {
    const started = performance.now();
    try {
      const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
      latencies.push(performance.now() - started);
      if (res.ok) ok++; else failed++;
    } catch { failed++; }
  }));
}
latencies.sort((a,b)=>a-b);
const pct = (p) => latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * p))] || 0;
console.log(JSON.stringify({ target, requests: ok + failed, ok, failed, p50Ms: pct(.5), p95Ms: pct(.95), p99Ms: pct(.99) }, null, 2));
if (failed > 0) process.exitCode = 1;
