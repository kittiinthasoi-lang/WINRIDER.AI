/**
 * Authenticated production-like concurrency harness.
 *
 * Scenario file JSON:
 * {
 *   "requests": [
 *     {"name":"accept","method":"POST","path":"/api/orders/<id>/accept","tokenEnv":"LOAD_DRIVER_TOKEN","body":{}},
 *     {"name":"decline","method":"POST","path":"/api/orders/<id>/decline","tokenEnv":"LOAD_DRIVER_TOKEN","body":{}},
 *     {"name":"cancel","method":"POST","path":"/api/orders/<id>/step","tokenEnv":"LOAD_PASSENGER_TOKEN","body":{"status":"cancelled"}}
 *   ]
 * }
 *
 * Use independent, pre-created ride fixtures for every request; intentionally
 * racing the same ride is useful only when testing transaction contention.
 */
import fs from 'node:fs';
const base = process.env.LOAD_TEST_BASE_URL;
const scenarioPath = process.env.LOAD_TEST_SCENARIO_FILE;
const concurrency = Math.max(1, Math.min(100, Number(process.env.LOAD_TEST_CONCURRENCY || 20)));
if (!base || !/^https:\/\//.test(base)) throw new Error('LOAD_TEST_BASE_URL=https://... is required');
if (!scenarioPath) throw new Error('LOAD_TEST_SCENARIO_FILE is required');
const scenario = JSON.parse(fs.readFileSync(scenarioPath,'utf8'));
if (!Array.isArray(scenario.requests) || !scenario.requests.length) throw new Error('Scenario must contain requests[]');

const expanded = [];
for (let i=0;i<concurrency;i++) for (const req of scenario.requests) expanded.push({...req,iteration:i});
let cursor=0, ok=0, failed=0;
const latencies=[];
async function worker(){
  while(true){
    const idx=cursor++; if(idx>=expanded.length) return;
    const spec=expanded[idx];
    const token=process.env[spec.tokenEnv];
    if(!token) throw new Error(`Missing token env ${spec.tokenEnv}`);
    const start=performance.now();
    try{
      const res=await fetch(base.replace(/\/$/,'')+spec.path,{
        method:spec.method||'GET',
        headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},
        body:spec.body===undefined?undefined:JSON.stringify(spec.body)
      });
      latencies.push(performance.now()-start);
      const expected=spec.expectedStatus || 200;
      if(res.status===expected) ok++; else { failed++; console.error(spec.name,res.status,await res.text()); }
    }catch(e){ failed++; console.error(spec.name,e?.message||e); }
  }
}
await Promise.all(Array.from({length:Math.min(concurrency,expanded.length)},worker));
latencies.sort((a,b)=>a-b);
const pct=p=>latencies[Math.min(latencies.length-1,Math.floor(latencies.length*p))]||0;
const result={requests:expanded.length,ok,failed,p50Ms:pct(.5),p95Ms:pct(.95),p99Ms:pct(.99)};
console.log(JSON.stringify(result,null,2));
if(failed) process.exitCode=1;
