import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/AuthContext'

export default function Navbar() {
  const { user, profile, isPro, signOut } = useAuth()
  const navigate = useNavigate()

  return (
    <header className="relative z-50 border-b border-mud/10">
      {/* Vintage stripe top bar */}
      <div className="h-1.5 w-full" style={{
        background: 'repeating-linear-gradient(90deg, #c41e3a 0px, #c41e3a 24px, #f5a623 24px, #f5a623 48px, #0a1a0f 48px, #0a1a0f 72px)'
      }} />

      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-1 group">
          <span className="font-display font-black text-2xl tracking-tight">
            <span className="text-chalk">RL</span>
            <span className="text-mud">GUESSER</span>
          </span>
        </Link>

        {/* Right side */}
        <nav className="flex items-center gap-2">
          <Link to="/leaderboard" className="btn-ghost text-xs hidden sm:inline-flex">
            Leaderboard
          </Link>

          {user ? (
            <>
              {isPro && (
                <Link to="/archive" className="btn-ghost text-xs hidden sm:inline-flex">
                  Archive
                </Link>
              )}
              <Link to="/profile" className="btn-ghost text-xs">
                {profile?.username ?? user.email?.split('@')[0]}
              </Link>
              {isPro && (
                <span className="badge-pro">
                  <span>★</span> PRO
                </span>
              )}
              <button onClick={signOut} className="btn-ghost text-xs">
                Sign out
              </button>
            </>
          ) : (
            <>
              <button onClick={() => navigate('/auth')} className="btn-ghost text-xs">
                Sign in
              </button>
              <button onClick={() => navigate('/pricing')} className="btn-brass text-xs">
                Go Pro
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
