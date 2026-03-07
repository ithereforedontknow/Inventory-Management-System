import { useState } from 'react'
import { api } from '../api'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff, KeyRound, LogOut } from 'lucide-react'
import { useValidation, rules } from '../hooks/useValidation'
import { FieldError } from '../components/FormComponents'

const pwRules = {
  current_password: rules.required('Current password'),
  new_password:     (v) => rules.required('New password')(v) || rules.password()(v),
  confirm_password: (v, all) => rules.required('Confirmation')(v) || rules.match('new_password', 'Passwords')(v, all),
}

export default function Settings() {
  const { user, logout } = useAuth()
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [show, setShow] = useState({ current: false, new: false, confirm: false })
  const [saving, setSaving] = useState(false)
  const { errors, validate, clearField, applyServerErrors } = useValidation(pwRules)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate(form)) return
    setSaving(true)
    try {
      await api.changePassword({ current_password: form.current_password, new_password: form.new_password })
      toast.success('Password changed successfully')
      setForm({ current_password: '', new_password: '', confirm_password: '' })
    } catch (err) {
      if (err.validationErrors) applyServerErrors(err.validationErrors)
      else toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const pwField = (key, label, showKey) => (
    <div className="form-control">
      <label className="label pb-1"><span className="label-text font-medium">{label}</span></label>
      <div className="relative">
        <input
          type={show[showKey] ? 'text' : 'password'}
          className={`input input-bordered bg-base-300 w-full pr-10 focus:border-primary ${errors[key] ? 'input-error' : ''}`}
          value={form[key]}
          onChange={e => { setForm(f => ({ ...f, [key]: e.target.value })); clearField(key) }}
        />
        <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content"
          onClick={() => setShow(s => ({ ...s, [showKey]: !s[showKey] }))} tabIndex={-1}>
          {show[showKey] ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      <FieldError error={errors[key]} />
    </div>
  )

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tight">Settings</h1>
        <p className="text-base-content/50 mt-1 font-mono text-sm">Account & security</p>
      </div>

      {/* Account info */}
      <div className="glass-card p-6 mb-6">
        <h2 className="font-bold text-lg mb-4">Account</h2>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold">{user?.username}</div>
            <div className="text-sm text-base-content/50 font-mono capitalize">{user?.role}</div>
          </div>
          <button className="btn btn-outline btn-sm gap-2" onClick={logout}>
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </div>

      {/* Change password */}
      <div className="glass-card p-6">
        <h2 className="font-bold text-lg mb-1 flex items-center gap-2">
          <KeyRound size={18} className="text-primary" /> Change Password
        </h2>
        <p className="text-sm text-base-content/40 mb-6">
          Passwords must be at least 8 characters, include one uppercase letter and one number.
        </p>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {pwField('current_password', 'Current Password', 'current')}
          {pwField('new_password', 'New Password', 'new')}
          {pwField('confirm_password', 'Confirm New Password', 'confirm')}
          <div className="pt-2">
            <button type="submit" className="btn btn-primary gap-2" disabled={saving}>
              {saving ? <span className="loading loading-spinner loading-sm" /> : null}
              Update Password
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
