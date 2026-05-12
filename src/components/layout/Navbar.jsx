import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/AuthContext'

export default function Navbar() {
  const { user, profile, isPro, signOut } = useAuth()
  const navigate = useNavigate()

  return (
    <header className="relative z-50">
      {/* Top colour stripe — classic RL programme hoops */}
      <div className="h-2 w-full" style={{
        background: 'repeating-linear-gradient(90deg, #c41e3a 0px, #c41e3a 32px, #f7f2e8 32px, #f7f2e8 40px, #1a2340 40px, #1a2340 72px, #f7f2e8 72px, #f7f2e8 80px)'
      }} />

      {/* Main navbar */}
      <div style={{ background: '#1a2340', borderBottom: '3px solid #c8a96e' }}>
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">

          {/* Logo */}
          <Link to="/" className="flex items-center">
            <span style={{
              fontFamily: '"Bebas Neue", serif',
              fontSize: '1.8rem',
              letterSpacing: '0.08em',
              lineHeight: 1,
            }}>
              <span style={{ color: '#f7f2e8' }}>RL</span>
              <span style={{ color: '#c41e3a' }}>GUESSER</span>
            </span>
          </Link>

          {/* Nav items */}
          <nav className="flex items-center gap-2">
            <Link to="/leaderboard" className="btn-ghost text-xs hidden sm:inline-flex"
              style={{ color: 'rgba(247,242,232,0.6)', borderColor: 'rgba(247,242,232,0.15)' }}>
              Leaderboard
            </Link>

            {user ? (
              <>
                {isPro && (
                  <Link to="/archive" className="btn-ghost text-xs hidden sm:inline-flex"
                    style={{ color: 'rgba(247,242,232,0.6)', borderColor: 'rgba(247,242,232,0.15)' }}>
                    Archive
                  </Link>
                )}
                <Link to="/profile" className="btn-ghost text-xs"
                  style={{ color: 'rgba(247,242,232,0.6)', borderColor: 'rgba(247,242,232,0.15)' }}>
                  {profile?.username ?? user.email?.split('@')[0]}
                </Link>
                {isPro && <span className="badge-pro">★ PRO</span>}
                <button onClick={signOut} className="btn-ghost text-xs"
                  style={{ color: 'rgba(247,242,232,0.5)', borderColor: 'rgba(247,242,232,0.12)' }}>
                  Sign out
                </button>
              </>
            ) : (
              <>
                <button onClick={() => navigate('/auth')} className="btn-ghost text-xs"
                  style={{ color: 'rgba(247,242,232,0.6)', borderColor: 'rgba(247,242,232,0.15)' }}>
                  Sign in
                </button>
                <button onClick={() => navigate('/pricing')} className="btn-brass text-xs">
                  Go Pro
                </button>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}
