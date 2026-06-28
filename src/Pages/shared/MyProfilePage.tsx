import { useEffect, useRef, useState } from 'react'
import { Camera, KeyRound, MessageSquarePlus, User } from 'lucide-react'
import { useAuth } from '../../Context/AuthContext'
import { useLang } from '../../i18n/LanguageContext'
import { useNavigation } from '../../Context/NavigationContext'
import { formatRoleBadge } from '../../Utils/roleBadge'
import { Field, inputCls } from '../../Components/FormField'
import {
  changeMyPassword,
  removeMyAvatar,
  updateMyProfile,
  uploadMyAvatar
} from '../../services/myProfileService'
import { UserSupportRequestModal } from '../../Components/permissions/UserSupportRequestModal'
import { MissionsMyTab } from '../../Components/missions/MissionsMyTab'
import { MyProfileOrgTab } from '../../Components/profile/MyProfileOrgTab'
import { MyProfileAttendanceTab } from '../../Components/profile/MyProfileAttendanceTab'
import { MyProfilePermissionsTab } from '../../Components/profile/MyProfilePermissionsTab'
import { PROFILE_TABS, type ProfileTab } from '../../Types/profile'

type Props = {
  onBack?: () => void
}

export function MyProfilePage({ onBack }: Props) {
  const { t } = useLang()
  const { profile, user, reloadProfile, displayRole } = useAuth()
  const nav = useNavigation()
  const tab = nav.profileTab
  const fileRef = useRef<HTMLInputElement>(null)

  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [supportOpen, setSupportOpen] = useState(false)

  useEffect(() => {
    setFullName(profile?.full_name ?? '')
  }, [profile?.full_name])

  if (!profile || !user) return null

  const p = profile
  const u = user

  const employee = p.employee_code
    ? `${p.employee_code} — ${p.employee_full_name ?? ''}`
    : null

  function mapError(e: unknown): string {
    const m = e instanceof Error ? e.message : t('common.error')
    if (m === 'AVATAR_TOO_LARGE') return t('myProfile.avatarTooLarge')
    if (m === 'AVATAR_INVALID_TYPE') return t('myProfile.avatarInvalidType')
    if (m === 'WRONG_CURRENT_PASSWORD') return t('myProfile.wrongCurrentPassword')
    return m
  }

  async function saveName() {
    setBusy(true)
    setErr('')
    setMsg('')
    try {
      await updateMyProfile({ fullName: fullName.trim() })
      await reloadProfile()
      setMsg(t('myProfile.saved'))
    } catch (e) {
      setErr(mapError(e))
    } finally {
      setBusy(false)
    }
  }

  async function onPickAvatar(file: File | null) {
    if (!file) return
    setAvatarBusy(true)
    setErr('')
    setMsg('')
    try {
      await uploadMyAvatar(p.id, file)
      await reloadProfile()
      setMsg(t('myProfile.avatarUpdated'))
    } catch (e) {
      setErr(mapError(e))
    } finally {
      setAvatarBusy(false)
    }
  }

  async function onRemoveAvatar() {
    setAvatarBusy(true)
    setErr('')
    try {
      await removeMyAvatar(p.id)
      await reloadProfile()
      setMsg(t('myProfile.avatarRemoved'))
    } catch (e) {
      setErr(mapError(e))
    } finally {
      setAvatarBusy(false)
    }
  }

  async function savePassword() {
    setErr('')
    setMsg('')
    if (newPw.length < 6) {
      setErr(t('myProfile.passwordMin'))
      return
    }
    if (newPw !== confirmPw) {
      setErr(t('myProfile.passwordMismatch'))
      return
    }
    setBusy(true)
    try {
      await changeMyPassword(p.email ?? u.email ?? '', currentPw, newPw)
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
      setMsg(t('myProfile.passwordChanged'))
    } catch (e) {
      setErr(mapError(e))
    } finally {
      setBusy(false)
    }
  }

  const initials = (p.full_name || p.email || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()

  const tabLabel: Record<ProfileTab, string> = {
    account: t('myProfile.tabs.account'),
    org: t('myProfile.tabs.org'),
    attendance: t('myProfile.tabs.attendance'),
    missions: t('myProfile.tabs.missions'),
    permissions: t('myProfile.tabs.permissions')
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-violet-500/20 p-3 text-violet-300">
            <User className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">{t('myProfile.title')}</h2>
            <p className="text-sm text-slate-400">{t('myProfile.subtitleFull')}</p>
          </div>
        </div>
        {onBack && (
          <button type="button" onClick={onBack} className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-slate-200">
            {t('common.back')}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {PROFILE_TABS.map(key => (
          <button
            key={key}
            type="button"
            onClick={() => nav.openProfile(key)}
            className={`rounded-xl px-4 py-2 text-sm font-black ${
              tab === key ? 'bg-violet-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {tabLabel[key]}
          </button>
        ))}
      </div>

      {tab === 'account' && msg && (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">{msg}</p>
      )}
      {tab === 'account' && err && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">{err}</p>
      )}

      {tab === 'account' && (
        <>
          <section className="card-industrial p-6">
            <h3 className="mb-4 text-sm font-black uppercase tracking-wide text-slate-400">{t('myProfile.avatarSection')}</h3>
            <div className="flex flex-wrap items-center gap-5">
              <div className="relative">
                {p.avatar_url ? (
                  <img src={p.avatar_url} alt="" className="h-24 w-24 rounded-2xl border-2 border-slate-700 object-cover" />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-slate-700 bg-slate-800 text-2xl font-black text-cyan-300">
                    {initials}
                  </div>
                )}
                <button
                  type="button"
                  disabled={avatarBusy}
                  onClick={() => fileRef.current?.click()}
                  className="absolute -bottom-1 -end-1 rounded-full bg-cyan-500 p-2 text-slate-950 shadow-lg disabled:opacity-50"
                >
                  <Camera className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-2 text-sm">
                <p className="text-slate-400">{t('myProfile.avatarHint')}</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={avatarBusy}
                    onClick={() => fileRef.current?.click()}
                    className="rounded-lg bg-slate-800 px-3 py-1.5 font-bold text-slate-200 hover:bg-slate-700 disabled:opacity-50"
                  >
                    {avatarBusy ? t('common.saving') : t('myProfile.uploadAvatar')}
                  </button>
                  {p.avatar_url && (
                    <button
                      type="button"
                      disabled={avatarBusy}
                      onClick={() => void onRemoveAvatar()}
                      className="rounded-lg px-3 py-1.5 font-bold text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                    >
                      {t('myProfile.removeAvatar')}
                    </button>
                  )}
                </div>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0]
                  void onPickAvatar(f ?? null)
                  e.target.value = ''
                }}
              />
            </div>
          </section>

          <section className="card-industrial space-y-4 p-6">
            <h3 className="text-sm font-black uppercase tracking-wide text-slate-400">{t('myProfile.infoSection')}</h3>
            <Field label={t('permissions.displayName')}>
              <input className={inputCls()} value={fullName} onChange={e => setFullName(e.target.value)} />
            </Field>
            <Field label={t('permissions.userEmail')}>
              <input className={inputCls()} value={p.email ?? ''} disabled dir="ltr" />
            </Field>
            <Field label={t('permissions.systemRole')}>
              <input className={inputCls()} value={formatRoleBadge(p, displayRole, t)} disabled />
            </Field>
            {employee && (
              <Field label={t('permissions.linkedEmployee')}>
                <input className={inputCls()} value={employee} disabled />
              </Field>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => void saveName()}
              className="rounded-xl bg-cyan-500 px-5 py-2.5 font-black text-slate-950 disabled:opacity-50"
            >
              {busy ? t('common.saving') : t('myProfile.saveInfo')}
            </button>
          </section>

          <section className="card-industrial space-y-4 p-6">
            <div className="flex items-center gap-2 text-violet-300">
              <KeyRound className="h-5 w-5" />
              <h3 className="text-sm font-black uppercase tracking-wide text-slate-400">{t('myProfile.passwordSection')}</h3>
            </div>
            <Field label={t('myProfile.currentPassword')} required>
              <input
                type="password"
                className={inputCls()}
                autoComplete="current-password"
                value={currentPw}
                onChange={e => setCurrentPw(e.target.value)}
                dir="ltr"
              />
            </Field>
            <Field label={t('myProfile.newPassword')} required>
              <input
                type="password"
                className={inputCls()}
                autoComplete="new-password"
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                dir="ltr"
              />
            </Field>
            <Field label={t('myProfile.confirmPassword')} required>
              <input
                type="password"
                className={inputCls()}
                autoComplete="new-password"
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                dir="ltr"
              />
            </Field>
            <button
              type="button"
              disabled={busy || !currentPw || !newPw}
              onClick={() => void savePassword()}
              className="rounded-xl bg-violet-600 px-5 py-2.5 font-black text-white disabled:opacity-50"
            >
              {busy ? t('common.saving') : t('myProfile.changePassword')}
            </button>
          </section>

          <section className="card-industrial space-y-4 p-6">
            <div className="flex items-center gap-2 text-amber-300">
              <MessageSquarePlus className="h-5 w-5" />
              <h3 className="text-sm font-black uppercase tracking-wide text-slate-400">{t('userRequests.mySection')}</h3>
            </div>
            <p className="text-sm text-slate-400">{t('userRequests.mySectionHint')}</p>
            <button
              type="button"
              onClick={() => setSupportOpen(true)}
              className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-5 py-2.5 font-bold text-amber-100 hover:bg-amber-500/20"
            >
              {t('userRequests.submit')}
            </button>
          </section>

          <UserSupportRequestModal
            open={supportOpen}
            onClose={() => setSupportOpen(false)}
            defaultEmail={p.email ?? ''}
            defaultName={p.full_name ?? ''}
            defaultType="complaint"
          />
        </>
      )}

      {tab === 'org' && <MyProfileOrgTab />}
      {tab === 'attendance' && <MyProfileAttendanceTab />}
      {tab === 'missions' && <MissionsMyTab />}
      {tab === 'permissions' && <MyProfilePermissionsTab />}
    </div>
  )
}
