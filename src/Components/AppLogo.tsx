type Props = {
  className?: string
  imgClassName?: string
}

/** أيقونة التطبيق (نفس ملف PWA / الشاشة الرئيسية) */
export function AppLogo({ className = '', imgClassName = 'h-7 w-7 sm:h-8 sm:w-8' }: Props) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-950 ring-1 ring-cyan-500/30 shadow-lg shadow-cyan-500/15 ${className}`}
    >
      <img src="/pwa-192x192.png" alt="" className={`object-contain ${imgClassName}`} width={32} height={32} />
    </div>
  )
}
