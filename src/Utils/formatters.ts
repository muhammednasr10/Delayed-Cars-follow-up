import type { CriticalityLevel, DelayStatus } from '../Types/car'

export const criticalityLabel: Record<CriticalityLevel, string> = {
  critical: 'حرج جداً - خط متوقف',
  medium: 'متوسط',
  low: 'منخفض'
}

export const statusLabel: Record<DelayStatus, string> = {
  waiting: 'قيد الانتظار',
  shipping: 'جاري الشحن',
  received_installed: 'تم التوريد والتركيب',
  closed: 'مغلق'
}

export function getDelayHours(createdAt: string): number {
  const diffMs = Date.now() - new Date(createdAt).getTime()
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)))
}

export function formatDateTime(value?: string | null): string {
  if (!value) return '-'
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value))
}
