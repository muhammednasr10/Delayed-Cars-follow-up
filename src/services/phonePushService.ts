import { supabase } from '../lib/supabase'

export type PhonePushState =
  | 'unsupported'
  | 'unconfigured'
  | 'install'
  | 'default'
  | 'denied'
  | 'subscribed'
  | 'off'

function iosDevice(): boolean {
  const ua = navigator.userAgent
  return /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function runningInstalled(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true
}

function urlBase64ToUint8Array(value: string): Uint8Array {
  const padding = '='.repeat((4 - (value.length % 4)) % 4)
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from(raw, char => char.charCodeAt(0))
}

function publicKey(): string {
  return (import.meta.env.VITE_VAPID_PUBLIC_KEY ?? '').trim()
}

function client() {
  if (!supabase) throw new Error('Supabase غير مهيأ')
  return supabase
}

async function activeRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null
  return (await navigator.serviceWorker.getRegistration()) ?? null
}

export function phonePushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export async function readPhonePushState(): Promise<PhonePushState> {
  if (iosDevice() && !runningInstalled()) return 'install'
  if (!phonePushSupported()) return 'unsupported'
  if (!publicKey()) return 'unconfigured'
  if (Notification.permission === 'denied') return 'denied'
  const reg = await activeRegistration()
  const existing = await reg?.pushManager.getSubscription()
  if (existing) return 'subscribed'
  return Notification.permission === 'granted' ? 'off' : 'default'
}

export async function enablePhonePush(): Promise<PhonePushState> {
  if (!phonePushSupported()) return 'unsupported'
  const key = publicKey()
  if (!key) return 'unconfigured'
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'default'

  const ready = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>(resolve => window.setTimeout(() => resolve(null), 4000))
  ])
  const reg = ready ?? (await activeRegistration())
  if (!reg) {
    throw new Error('فعّل الإشعارات من التطبيق المثبّت. المتصفح أثناء التطوير لا يستقبل إشعارات الهاتف.')
  }
  const keyBytes = urlBase64ToUint8Array(key)
  const applicationServerKey = new Uint8Array(keyBytes.byteLength)
  applicationServerKey.set(keyBytes)
  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey
  })
  const json = subscription.toJSON()
  const endpoint = json.endpoint
  const p256dh = json.keys?.p256dh
  const authKey = json.keys?.auth
  if (!endpoint || !p256dh || !authKey) throw new Error('الاشتراك ناقص')

  const { error } = await client().rpc('save_push_subscription', {
    p_endpoint: endpoint,
    p_p256dh: p256dh,
    p_auth_key: authKey,
    p_expiration: subscription.expirationTime ? new Date(subscription.expirationTime).toISOString() : null,
    p_user_agent: navigator.userAgent.slice(0, 240)
  })
  if (error) throw new Error(error.message)
  return 'subscribed'
}

export async function disablePhonePush(): Promise<void> {
  if (!phonePushSupported()) return
  const reg = await activeRegistration()
  const subscription = await reg?.pushManager.getSubscription()
  const endpoint = subscription?.endpoint
  if (subscription) await subscription.unsubscribe()
  if (!endpoint || !supabase) return
  await supabase.rpc('delete_my_push_subscription', { p_endpoint: endpoint })
}
