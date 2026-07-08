#!/usr/bin/env node
/**
 * Supabase latency probe — simulates app boot + hot API paths.
 * Usage: npm run latency
 * Optional in .env.local: LATENCY_EMAIL, LATENCY_PASSWORD (for authenticated RPCs)
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

function loadEnvFile(path) {
  if (!existsSync(path)) return {}
  const out = {}
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 0) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    out[key] = val
  }
  return out
}

function env() {
  return {
    ...loadEnvFile(join(ROOT, '.env')),
    ...loadEnvFile(join(ROOT, '.env.local')),
    ...process.env
  }
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)
  return sorted[Math.max(0, idx)]
}

async function bench(label, fn, { iterations = 5, warmup = 1 } = {}) {
  for (let i = 0; i < warmup; i++) {
    try {
      await fn()
    } catch {
      // warmup failures ignored
    }
  }

  const samples = []
  let lastError = null
  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now()
    try {
      await fn()
      samples.push(performance.now() - t0)
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e)
      samples.push(performance.now() - t0)
    }
  }

  const sorted = [...samples].sort((a, b) => a - b)
  const avg = samples.reduce((a, b) => a + b, 0) / samples.length
  return {
    label,
    ok: !lastError,
    error: lastError,
    min: sorted[0] ?? 0,
    avg,
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    max: sorted[sorted.length - 1] ?? 0
  }
}

async function login(url, anonKey, email, password) {
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(body?.error_description || body?.msg || body?.message || `login HTTP ${res.status}`)
  }
  return body.access_token
}

function restHeaders(anonKey, token) {
  return {
    apikey: anonKey,
    Authorization: `Bearer ${token || anonKey}`,
    'Content-Type': 'application/json',
    Prefer: 'count=exact'
  }
}

async function restGet(url, path, headers) {
  const res = await fetch(`${url}/rest/v1/${path}`, { headers })
  const text = await res.text()
  if (!res.ok) throw new Error(`${path} HTTP ${res.status}: ${text.slice(0, 200)}`)
  return text.length
}

async function rpc(url, name, headers, body = {}) {
  const res = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`rpc/${name} HTTP ${res.status}: ${text.slice(0, 200)}`)
  return text.length
}

function fmtMs(n) {
  return `${n.toFixed(0)}ms`
}

function printRow(r) {
  const status = r.ok ? 'OK' : `FAIL (${r.error})`
  console.log(
    `${r.label.padEnd(28)} ${status.padEnd(12)} avg ${fmtMs(r.avg)}  p50 ${fmtMs(r.p50)}  p95 ${fmtMs(r.p95)}  max ${fmtMs(r.max)}`
  )
}

async function main() {
  const cfg = env()
  const url = (cfg.VITE_SUPABASE_URL || '').replace(/\/$/, '')
  const anonKey = cfg.VITE_SUPABASE_ANON_KEY
  const email = cfg.LATENCY_EMAIL
  const password = cfg.LATENCY_PASSWORD

  if (!url || !anonKey) {
    console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local')
    process.exit(1)
  }

  console.log(`\nLatency check → ${url}`)
  console.log(`Iterations: 5 per endpoint (+ 1 warmup)\n`)

  let token = null
  if (email && password) {
    try {
      const t0 = performance.now()
      token = await login(url, anonKey, email, password)
      console.log(`Auth login: ${fmtMs(performance.now() - t0)} (${email})\n`)
    } catch (e) {
      console.warn(`Auth login skipped: ${e instanceof Error ? e.message : e}\n`)
    }
  } else {
    console.warn('No LATENCY_EMAIL/LATENCY_PASSWORD — RPC profile/permissions may fail (anon only)\n')
  }

  const headers = restHeaders(anonKey, token)
  const probes = [
    ['health_rest', () => restGet(url, 'vehicle_models?select=id&limit=1', headers)],
    ['profile_rpc', () => rpc(url, 'get_my_profile', headers)],
    ['permissions_rpc', () => rpc(url, 'get_current_user_permissions', headers)],
    ['bom_count', () => restGet(url, 'v_bom_items_detail?select=id&limit=1', headers)],
    ['bom_page_100', () => restGet(url, 'v_bom_items_detail?select=id,part_number&limit=100', headers)],
    ['production_orders_20', () => restGet(url, 'v_production_orders_detail?select=id&order=created_at.desc&limit=20', headers)],
    ['warehouse_feeding_50', () => restGet(url, 'warehouse_feeding?select=id&order=feeding_date.desc&limit=50', headers)],
    ['warehouses_list', () => restGet(url, 'warehouses?select=id,code&limit=20', headers)]
  ]

  const results = []
  for (const [label, fn] of probes) {
    results.push(await bench(label, fn))
  }

  console.log('Endpoint                     Status       Timings')
  console.log('─'.repeat(72))
  for (const r of results) printRow(r)

  const bootLabels = ['profile_rpc', 'permissions_rpc', 'bom_count', 'warehouses_list']
  const boot = await bench('boot_parallel_sim', async () => {
    await Promise.all(probes.filter(([l]) => bootLabels.includes(l)).map(([, fn]) => fn()))
  })

  console.log('─'.repeat(72))
  printRow(boot)

  const failed = results.filter(r => !r.ok)
  if (failed.length > 0) {
    console.log(`\n${failed.length} probe(s) failed — check RLS or set LATENCY_EMAIL/PASSWORD in .env.local`)
    process.exit(1)
  }

  const slow = results.filter(r => r.p95 > 1500)
  if (slow.length > 0) {
    console.log(`\nWarning: p95 > 1.5s on: ${slow.map(s => s.label).join(', ')}`)
  } else {
    console.log('\nAll probes under 1.5s p95.')
  }
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
