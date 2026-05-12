import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/lib/AuthContext'
import { supabase } from '@/lib/supabase'

export default function Auth({ minimal = false }) {
  const [mode,     setMode]     = useState('magic') // magic | password
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error,    setError]    = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [sent,     setSent]     = useState(false)

  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect') ?? '/'

  // ── Magic link ─────────────────────────────────────────────────────────
  async function handleMagicLink(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}${redirect}` }
    })
    if (error) setError(error.message)
    else setSent(true)
    setLoading(false)
  }

  // ── Password sign-in / sign-up ─────────────────────────────────────────
  async function handlePassword(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    if (mode === 'signin') {
      const { error } = await signInWithEmail(email, password)
      if (error) setError(error.message)
      else navigate(redirect)
    } else {
      if (!username.trim()) { setError('Username is required'); setLoading(false); return }
      const { error } = await signUpWithEmail(email, password, username)
      if (error) setError(error.message)
      else setSent(true)
    }
    setLoading(false)
  }

  async function handleGoogle() {
    setError(null)
    const { error } = await signInWithGoogle()
    if (error) setError(error.message)
  }

  // ── Sent confirmation ──────────────────────────────────────────────────
  if (sent) {
    return (
      <div className={minimal ? '' : 'min-h-screen flex items-center justify-center px-4'}>
        <div className="card-base p-8 text-center max-w-sm w-full">
          <div className="text-4xl mb-4">✉️</div>
          <h2 className="font-display text-xl text-chalk mb-2">Check your email</h2>
          <p className="text-sm text-chalk/50">
            We sent a link to <strong className="text-mud">{email}</strong>.
            Click it to {mode === 'signup' ? 'activate your account' : 'sign in'}.
          </p>
        </div>
      </div>
    )
  }

  const isPasswordMode = mode === 'signin' || mode === 'signup'

  return (
    <div className={minimal ? '' : 'min-h-screen flex items-center justify-center px-4 py-16'}>
      <div className="card-base p-8 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-6">
          <h1 className="font-display font-black text-3xl">
            <span className="text-chalk">RL</span><span className="text-mud">GUESSER</span>
          </h1>
          <p className="text-xs font-mono text-chalk/30 tracking-widest mt-1 uppercase">
            {minimal ? 'Sign in to play' : 'Welcome'}
          </p>
        </div>

        {/* Magic link (default — easiest for casual fans) */}
        {!isPasswordMode && (
          <>
            <form onSubmit={handleMagicLink} className="space-y-3">
              <input type="email" placeholder="Your email address" value={email}
                onChange={e => setEmail(e.target.value)} className="input-vintage" required />
              {error && <p className="text-xs text-red-400 font-mono px-1">{error}</p>}
              <button type="submit" disabled={loading} className="btn-brass w-full disabled:opacity-50">
                {loading ? 'Sending…' : 'Send magic link'}
              </button>
            </form>
            <p className="text-xs text-chalk/30 text-center mt-3">
              We'll email you a link — no password needed.
            </p>
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-chalk/8" />
              <span className="text-xs text-chalk/20 font-mono">or</span>
              <div className="flex-1 h-px bg-chalk/8" />
            </div>
            <button onClick={handleGoogle} className="w-full btn-ghost mb-2 py-2.5 border border-chalk/10 justify-center gap-3">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
            <button onClick={() => setMode('signin')}
              className="w-full text-xs text-chalk/30 hover:text-chalk/60 transition-colors mt-1 py-1">
              Sign in with password instead
            </button>
          </>
        )}

        {/* Password mode */}
        {isPasswordMode && (
          <>
            <form onSubmit={handlePassword} className="space-y-3">
              {mode === 'signup' && (
                <input type="text" placeholder="Username" value={username}
                  onChange={e => setUsername(e.target.value)} className="input-vintage" required />
              )}
              <input type="email" placeholder="Email" value={email}
                onChange={e => setEmail(e.target.value)} className="input-vintage" required />
              <input type="password" placeholder="Password" value={password}
                onChange={e => setPassword(e.target.value)} className="input-vintage" required minLength={6} />
              {error && <p className="text-xs text-red-400 font-mono px-1">{error}</p>}
              <button type="submit" disabled={loading} className="btn-brass w-full disabled:opacity-50">
                {loading ? 'Loading…' : mode === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            </form>
            <div className="flex justify-between mt-3 text-xs">
              <button onClick={() => { setMode('magic'); setError(null) }}
                className="text-mud/70 hover:text-mud underline underline-offset-2">
                Use magic link
              </button>
              <button onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null) }}
                className="text-chalk/30 hover:text-chalk/60">
                {mode === 'signin' ? 'Create account' : 'Sign in'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
