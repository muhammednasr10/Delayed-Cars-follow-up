import { useEffect, useRef, useState } from 'react'
import { Pause, Play, RotateCcw } from 'lucide-react'
import { useLang } from '../../i18n/LanguageContext'

type Props = {
  disabled?: boolean
  onCapture: (seconds: number) => void
}

export function TimeStudyStopwatch({ disabled, onCapture }: Props) {
  const { t } = useLang()
  const [running, setRunning] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)
  const startedAtRef = useRef<number | null>(null)
  const tickRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (tickRef.current != null) window.clearInterval(tickRef.current)
    }
  }, [])

  function stopTick() {
    if (tickRef.current != null) {
      window.clearInterval(tickRef.current)
      tickRef.current = null
    }
  }

  function start() {
    if (disabled) return
    startedAtRef.current = Date.now() - elapsedMs
    setRunning(true)
    stopTick()
    tickRef.current = window.setInterval(() => {
      if (startedAtRef.current != null) setElapsedMs(Date.now() - startedAtRef.current)
    }, 50)
  }

  function pause() {
    stopTick()
    setRunning(false)
  }

  function reset() {
    pause()
    startedAtRef.current = null
    setElapsedMs(0)
  }

  function capture() {
    const seconds = Math.round((elapsedMs / 1000) * 10) / 10
    if (seconds <= 0) return
    onCapture(seconds)
    reset()
  }

  const displaySec = (elapsedMs / 1000).toFixed(1)

  return (
    <div className="rounded-xl border border-violet-500/30 bg-violet-950/20 p-4">
      <p className="mb-2 text-center font-mono text-4xl font-black tabular-nums text-violet-100" dir="ltr">
        {displaySec}s
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {!running ? (
          <button
            type="button"
            disabled={disabled}
            onClick={start}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            <Play className="h-4 w-4" />
            {t('engineering.timeStudy.startTimer')}
          </button>
        ) : (
          <button
            type="button"
            onClick={pause}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-black text-white hover:bg-amber-500"
          >
            <Pause className="h-4 w-4" />
            {t('engineering.timeStudy.stopTimer')}
          </button>
        )}
        <button
          type="button"
          disabled={disabled || elapsedMs <= 0}
          onClick={capture}
          className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-black text-white hover:bg-cyan-500 disabled:opacity-50"
        >
          {t('engineering.timeStudy.saveReading')}
        </button>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1 rounded-xl bg-slate-800 px-3 py-2 text-sm font-bold text-slate-300 hover:bg-slate-700"
        >
          <RotateCcw className="h-4 w-4" />
          {t('engineering.timeStudy.resetTimer')}
        </button>
      </div>
    </div>
  )
}
