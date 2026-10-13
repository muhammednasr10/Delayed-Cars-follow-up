import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import webpush from 'npm:web-push@3.6.7'
import { corsHeaders } from '../_shared/cors.ts'
import { isExpiredPushSubscription, pushHttpStatus } from '../_shared/pushDelivery.ts'

const LOCK_TITLE = 'نظام المتابعة'
const LOCK_BODY = 'عندك إشعار جديد'
const MAX_BADGE = 99

type WebhookBody = {
  type?: string
  record?: { id?: string; event_type?: string; payload?: { plan_month?: number | null } | null }
}

type Recipient = { user_id: string; unread_count: number }
type SubscriptionRow = {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth_key: string
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

function authorized(req: Request, secret: string): boolean {
  const header = req.headers.get('x-webhook-secret') ?? ''
  const bearer = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  return header === secret || bearer === secret
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const webhookSecret = Deno.env.get('PUSH_WEBHOOK_SECRET')
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY')
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  const subject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:notifications@afa.local'

  if (!supabaseUrl || !serviceKey || !webhookSecret || !publicKey || !privateKey) {
    return json({ error: 'Server configuration missing' }, 500)
  }
  if (!authorized(req, webhookSecret)) return json({ error: 'Unauthorized' }, 401)

  let body: WebhookBody
  try {
    body = (await req.json()) as WebhookBody
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const notificationId = body.record?.id
  if (!notificationId) return json({ ok: true, skipped: 'no notification id' })
  if (body.type && body.type !== 'INSERT') return json({ ok: true, skipped: body.type })

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

  const { data: recipients, error: recipientError } = await admin.rpc('push_notification_recipients', {
    p_notification_id: notificationId
  })
  if (recipientError) return json({ error: recipientError.message }, 500)

  const audience = (recipients ?? []) as Recipient[]
  if (audience.length === 0) return json({ ok: true, sent: 0 })

  const unreadByUser = new Map(audience.map(row => [row.user_id, row.unread_count]))
  const { data: subscriptions, error: subError } = await admin
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth_key')
    .in('user_id', audience.map(row => row.user_id))
  if (subError) return json({ error: subError.message }, 500)

  webpush.setVapidDetails(subject, publicKey, privateKey)

  const eventType = body.record?.event_type ?? ''
  const planMonth = body.record?.payload?.plan_month ?? null
  let sent = 0
  let failed = 0

  for (const sub of (subscriptions ?? []) as SubscriptionRow[]) {
    const outcome = await deliverToSubscription(admin, sub, {
      notificationId,
      eventType,
      planMonth,
      count: Math.max(0, Math.min(MAX_BADGE, Number(unreadByUser.get(sub.user_id) ?? 1)))
    })
    if (outcome === 'sent') sent += 1
    if (outcome === 'failed') failed += 1
  }

  return json({ ok: failed === 0, sent, failed }, pushHttpStatus(failed))
})

type DeliveryOutcome = 'sent' | 'failed' | 'skipped'

async function deliverToSubscription(
  admin: ReturnType<typeof createClient>,
  sub: SubscriptionRow,
  message: { notificationId: string; eventType: string; planMonth: number | null; count: number }
): Promise<DeliveryOutcome> {
  const payload = JSON.stringify({
    title: LOCK_TITLE,
    body: LOCK_BODY,
    count: message.count,
    tag: message.notificationId,
    data: {
      eventType: message.eventType,
      planMonth: message.planMonth,
      notificationId: message.notificationId
    }
  })
  let sawFailure = false

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data: claimed, error: claimError } = await admin.rpc('claim_push_delivery', {
      p_notification_id: message.notificationId,
      p_subscription_id: sub.id
    })
    if (claimError) return 'failed'
    if (claimed !== true) return sawFailure ? 'failed' : 'skipped'

    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
        payload,
        { TTL: 86400 }
      )
      await admin.rpc('finish_push_delivery', {
        p_notification_id: message.notificationId,
        p_subscription_id: sub.id,
        p_status: 'sent'
      })
      return 'sent'
    } catch (error) {
      const statusCode = Number((error as { statusCode?: number }).statusCode ?? 0)
      if (isExpiredPushSubscription(statusCode)) {
        await admin.rpc('finish_push_delivery', {
          p_notification_id: message.notificationId,
          p_subscription_id: sub.id,
          p_status: 'gone'
        })
        await admin.from('push_subscriptions').delete().eq('id', sub.id)
        return 'skipped'
      }
      await admin.rpc('finish_push_delivery', {
        p_notification_id: message.notificationId,
        p_subscription_id: sub.id,
        p_status: 'failed'
      })
      sawFailure = true
    }
  }

  return 'failed'
}
