import { Database, Terminal } from 'lucide-react'
import { useLang } from '../i18n/LanguageContext'

// Shown when the Supabase project is reachable but the factory schema has not
// been migrated yet (e.g. "Could not find the table 'public.v_vehicle_overview'").
export function SetupRequired({ detail }: { detail?: string }) {
  const { t } = useLang()
  const files = [
    '0001_factory_core_schema.sql',
    '0002_rls_and_rpcs.sql',
    '0003_reporting_views.sql',
    '0004_auth_profile_bootstrap.sql',
    '0005_missing_parts_reporting.sql'
  ]

  return (
    <div className="card-industrial p-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-amber-500/15 p-3 text-amber-300"><Database className="h-6 w-6" /></div>
        <div>
          <h2 className="text-lg font-black text-white">{t('setup.title')}</h2>
          <p className="text-sm text-slate-400">{t('setup.subtitle')}</p>
        </div>
      </div>

      <div className="mt-5 space-y-4 text-sm text-slate-300">
        <p className="font-bold text-slate-200">{t('setup.steps')}</p>
        <ol className="list-decimal space-y-2 ps-5">
          <li>{t('setup.step1')}</li>
          <li>{t('setup.step2')} <code className="rounded bg-slate-800 px-1.5 py-0.5 text-cyan-300">supabase/migrations</code></li>
        </ol>

        <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
            <Terminal className="h-4 w-4" /> {t('setup.files')}
          </div>
          <ul className="space-y-1 font-mono text-xs text-slate-300">
            {files.map((file, index) => (
              <li key={file}><span className="text-slate-500">{index + 1}.</span> {file}</li>
            ))}
          </ul>
        </div>

        <p>{t('setup.promote')}</p>
        <pre className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80 p-3 font-mono text-xs text-emerald-300" dir="ltr">
{`update profiles set role = 'admin' where email = 'your@email.com';`}
        </pre>

        <p className="text-slate-400">{t('setup.refreshHint')}</p>
      </div>

      {detail && (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-300/80" dir="ltr">{detail}</div>
      )}
    </div>
  )
}
