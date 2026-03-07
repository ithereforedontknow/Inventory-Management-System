import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import { Boxes, Eye, EyeOff, LogIn } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  function validate() {
    const e = {}
    if (!form.username.trim()) e.username = 'Username is required'
    if (!form.password) e.password = 'Password is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const res = await api.login(form)
      login(res.token, res.user)
      navigate('/')
    } catch (err) {
      toast.error(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-base-100 flex items-center justify-center p-4">
      {/* Background grid pattern */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: 'linear-gradient(#6366f1 1px, transparent 1px), linear-gradient(90deg, #6366f1 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/20 border border-primary/30 mb-4">
            <Boxes size={28} className="text-primary" />
          </div>
          <h1 className="text-3xl font-black logo-gradient">StockPilot</h1>
          <p className="text-base-content/40 font-mono text-sm mt-1">Inventory Management System</p>
        </div>

        {/* Card */}
        <div className="glass-card p-8">
          <h2 className="text-xl font-bold mb-6">Sign in</h2>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Username */}
            <div className="form-control">
              <label className="label pb-1">
                <span className="label-text font-medium">Username</span>
              </label>
              <input
                type="text"
                autoComplete="username"
                className={`input input-bordered bg-base-300 w-full focus:border-primary ${errors.username ? 'input-error' : ''}`}
                placeholder="Enter username"
                value={form.username}
                onChange={e => {
                  setForm(f => ({ ...f, username: e.target.value }))
                  if (errors.username) setErrors(er => ({ ...er, username: '' }))
                }}
              />
              {errors.username && <p className="text-error text-xs mt-1 font-mono">{errors.username}</p>}
            </div>

            {/* Password */}
            <div className="form-control">
              <label className="label pb-1">
                <span className="label-text font-medium">Password</span>
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={`input input-bordered bg-base-300 w-full pr-10 focus:border-primary ${errors.password ? 'input-error' : ''}`}
                  placeholder="Enter password"
                  value={form.password}
                  onChange={e => {
                    setForm(f => ({ ...f, password: e.target.value }))
                    if (errors.password) setErrors(er => ({ ...er, password: '' }))
                  }}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content"
                  onClick={() => setShowPw(v => !v)}
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-error text-xs mt-1 font-mono">{errors.password}</p>}
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full mt-2 gap-2"
              disabled={loading}
            >
              {loading ? <span className="loading loading-spinner loading-sm" /> : <LogIn size={16} />}
              Sign In
            </button>
          </form>

          <div className="divider my-4 text-base-content/20 text-xs">Default credentials</div>
          <div className="bg-base-300/50 rounded-xl p-3 font-mono text-xs text-base-content/50 space-y-1">
            <div>username: <span className="text-primary">admin</span></div>
            <div>password: <span className="text-primary">Admin1234</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}
