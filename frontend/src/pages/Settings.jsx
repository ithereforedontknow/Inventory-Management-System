import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import toast from 'react-hot-toast'
import { KeyRound, User, LogOut, X } from 'lucide-react'
import { FieldError } from '../components/FormComponents'
import { useValidation, rules } from '../hooks/useValidation'

const pwRules = {
  current_password: rules.required('Current password'),
  new_password:     (v) => rules.required('New password')(v) || rules.password()(v),
  confirm_password: (v, all) => rules.required('Confirm password')(v) || rules.match('new_password', 'Passwords')(v, all),
}

export default function Settings() {
  const { user, logout } = useAuth()
  const [form, setForm]   = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [saving, setSaving] = useState(false)
  const { errors, validate, clearField, applyServerErrors } = useValidation(pwRules)

  const set = (key, val) => { setForm(f => ({ ...f, [key]: val })); clearField(key) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate(form)) return
    setSaving(true)
    try {
      await api.changePassword(form)
      toast.success('Password changed successfully')
      setForm({ current_password: '', new_password: '', confirm_password: '' })
    } catch (err) {
      if (err.validationErrors) applyServerErrors(err.validationErrors)
      else toast.error(err.message)
    } finally { setSaving(false) }
  }

  const pwField = (key, label) => (
    <div className="form-control">
      <label className="label pb-1"><span className="label-text text-base-content/70 text-sm">{label}</span></label>
      <input type="password"
        className={`input input-bordered bg-base-300 focus:border-primary ${errors[key] ? 'input-error' : ''}`}
        value={form[key]} onChange={e => set(key, e.target.value)} />
      <FieldError error={errors[key]} />
    </div>
  )

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-xl">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Settings</h1>
        <p className="text-base-content/50 mt-1 font-mono text-xs sm:text-sm">Account & security</p>
      </div>

      {/* Account info */}
      <div className="glass-card p-5 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
            <User size={18} className="text-primary"/>
          </div>
          <div>
            <div className="font-bold">{user?.username}</div>
            <div className="text-xs text-base-content/40 font-mono capitalize">{user?.role}</div>
          </div>
        </div>
        <button className="btn btn-ghost btn-sm gap-2 text-error hover:bg-error/10" onClick={logout}>
          <LogOut size={14}/> Sign out
        </button>
      </div>

      {/* Change password */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-5">
          <KeyRound size={16} className="text-primary"/>
          <h2 className="font-bold">Change Password</h2>
        </div>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {pwField('current_password', 'Current Password')}
          {pwField('new_password', 'New Password')}
          {pwField('confirm_password', 'Confirm New Password')}
          <button type="submit" className="btn btn-primary btn-sm sm:btn-md" disabled={saving}>
            {saving && <span className="loading loading-spinner loading-sm"/>}
            Update Password
          </button>
        </form>
      </div>
    </div>
  )
}
