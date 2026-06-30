import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import * as jose from 'npm:jose@5.9.6'
import { corsHeaders } from '../_shared/cors.ts'

type LoginBody = {
  action: 'login'
  email: string
  password: string
}

type RefreshBody = {
  action: 'refresh'
  refresh_token: string
}

type Body = LoginBody | RefreshBody

const SESSION_HOURS = 24

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const jwtSecret =
    Deno.env.get('SUPABASE_JWT_SECRET') ??
    Deno.env.get('JWT_SECRET') ??
    Deno.env.get('SUPABASE_AUTH_JWT_SECRET')
  if (!supabaseUrl || !serviceKey || !jwtSecret) {
    return json({ error: 'Server configuration missing' }, 500)
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  if (body.action === 'refresh') {
    return handleRefresh(body, jwtSecret)
  }

  if (body.action !== 'login') {
    return json({ error: 'Unknown action' }, 400)
  }

  const email = (body as LoginBody).email?.trim().toLowerCase()
  const password = (body as LoginBody).password ?? ''
  if (!email || !password) {
    return json({ error: 'Email and password are required' }, 400)
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const { data: loginResult, error: loginErr } = await admin.rpc('verify_profile_login', {
    p_email: email,
    p_password: password
  })
  if (loginErr) {
    return json({ error: loginErr.message }, 500)
  }

  if (!loginResult) {
    return json({ error: 'Invalid email or password' }, 401)
  }

  const result = loginResult as { id?: string; email?: string; error?: string }
  if (result.error === 'blocked') {
    return json({ error: 'Account is blocked or inactive' }, 403)
  }
  if (result.error === 'employee_inactive') {
    return json({ error: 'Linked employee is not active' }, 403)
  }
  if (!result.id) {
    return json({ error: 'Invalid email or password' }, 401)
  }

  return issueTokens(result.id, result.email ?? email, jwtSecret)
})

async function handleRefresh(body: RefreshBody, jwtSecret: string): Promise<Response> {
  const refreshToken = body.refresh_token?.trim()
  if (!refreshToken) return json({ error: 'Refresh token is required' }, 400)

  const secret = new TextEncoder().encode(jwtSecret)
  let payload: jose.JWTPayload
  try {
    const verified = await jose.jwtVerify(refreshToken, secret, { audience: 'authenticated' })
    payload = verified.payload
  } catch {
    return json({ error: 'Invalid or expired refresh token' }, 401)
  }

  if (payload.type !== 'refresh' || !payload.sub) {
    return json({ error: 'Invalid refresh token' }, 401)
  }

  const { data: profile } = await createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
    .from('profiles')
    .select('id, email, is_active, is_blocked')
    .eq('id', payload.sub)
    .maybeSingle()

  if (!profile?.id || !profile.is_active || profile.is_blocked) {
    return json({ error: 'Account is blocked or inactive' }, 403)
  }

  return issueTokens(profile.id, (profile.email as string | null) ?? null, jwtSecret)
}

async function issueTokens(userId: string, email: string | null, jwtSecret: string): Promise<Response> {
  const now = Math.floor(Date.now() / 1000)
  const exp = now + SESSION_HOURS * 60 * 60
  const sessionId = crypto.randomUUID()

  const secret = new TextEncoder().encode(jwtSecret)
  const accessToken = await new jose.SignJWT({
    email: email ?? '',
    role: 'authenticated',
    aal: 'aal1',
    amr: [{ method: 'password', timestamp: now }],
    session_id: sessionId,
    app_metadata: { provider: 'app', providers: ['app'] },
    user_metadata: {}
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(userId)
    .setAudience('authenticated')
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(secret)

  const refreshToken = await new jose.SignJWT({
    type: 'refresh',
    session_id: sessionId
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(userId)
    .setAudience('authenticated')
    .setIssuedAt(now)
    .setExpirationTime(exp + 7 * 24 * 60 * 60)
    .sign(secret)

  return json(
    {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: exp,
      user: { id: userId, email }
    },
    200
  )
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}
