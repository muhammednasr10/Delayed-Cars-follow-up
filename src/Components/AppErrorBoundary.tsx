import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { error: Error | null }

/** يمنع الصفحة البيضاء ويعرض سبب الانهيار */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('AppErrorBoundary', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 px-4 text-slate-100">
        <div className="max-w-lg rounded-2xl border border-red-500/30 bg-slate-900 p-6 shadow-xl">
          <h1 className="text-lg font-black text-red-200">حدث خطأ في الواجهة</h1>
          <p className="mt-2 text-sm text-slate-400">حدّث الصفحة (Ctrl+Shift+R). إذا استمر، انسخ الرسالة التالية:</p>
          <pre className="mt-4 max-h-48 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-red-100/90 whitespace-pre-wrap">
            {error.message}
          </pre>
          <button
            type="button"
            className="mt-4 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-cyan-400"
            onClick={() => window.location.reload()}
          >
            إعادة تحميل
          </button>
        </div>
      </main>
    )
  }
}
