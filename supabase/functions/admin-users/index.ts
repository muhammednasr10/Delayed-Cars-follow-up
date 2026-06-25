import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { corsHeaders } from '../_shared/cors.ts'

type CreateBody = {
  action: 'create'
  email: string
  password: string
  fullName?: string
  systemRoleId?: string
  employeeId?: string | null
}

type ResetPasswordBody = {
  action: 'reset_password'
  userId: string
  password: string
}

type Body = CreateBody | ResetPasswordBody

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !anonKey) {
    return json({ error: 'Server configuration missing' }, 500)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return json({ error: 'Unauthorized' }, 401)
  }

  const caller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } }
  })

  const { data: allowed, error: permErr } = await caller.rpc('has_permission', {
    p_module: 'users',
    p_permission: 'manage'
  })
  if (permErr || !allowed) {
    return json({ error: 'Not authorized to manage users' }, 403)
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  if (body.action === 'create') {
    const { data: userId, error } = await caller.rpc('admin_create_user', {
      p_email: body.email?.trim(),
      p_password: body.password?.trim(),
      p_full_name: body.fullName?.trim() ?? null,
      p_system_role_id: body.systemRoleId ?? null,
      p_employee_id: body.employeeId ?? null
    })
    if (error) {
      return json({ error: error.message }, 400)
    }
    return json({ userId, email: body.email?.trim().toLowerCase() }, 200)
  }

  if (body.action === 'reset_password') {
    const { error } = await caller.rpc('admin_reset_user_password', {
      p_user_id: body.userId,
      p_password: body.password?.trim()
    })
    if (error) {
      return json({ error: error.message }, 400)
    }
    return json({ ok: true }, 200)
  }

  return json({ error: 'Unknown action' }, 400)
})

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}
