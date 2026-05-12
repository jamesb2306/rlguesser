import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { format, parseISO } from 'date-fns'

export default function Profile() {
  const { user, profile, isPro, signOut, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [sessions, setSessions] = useState([])
  const [loading,  setLoading]  = useState(true)

  // If redirected back from Stripe with ?upgraded=true, refresh profile
  useEffect(() => {
    if (searchParams.get('upgraded') === 'true') {
      refreshProfile()
    }
  }, [])

  useEffect(() => {
    if (!user) { navigate('/auth'); return }
    fetchSessions()
  }, [user])

  async function fetchSessions() {
    setLoading(true)
    const { data } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('puzzle_date', { ascending: false })
      .limit(30)
    setSessions(data ?? [])
    setLoading(false)
  }

  if (!user) return null

  const totalGames  = sessions.length
  const totalPoints = sessions.reduce((sum, s) => sum + (s.score ?? 0), 0)
  const avgScore    = totalGames > 0 ? Math.round(totalPoints / totalGames) : 0
  const perfectGames = sessions.filter(s =>
    (s.results ?? []).every(r => r.correct)
  ).length

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-8">

        {/* Profile header */}
        <div className="card-base p-7">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="font-display text-2xl font-bold text-chalk">
                  {profile?.username ?? user.email?.split('@')[0]}
                </h1>
                {isPro && <span className="badge-pro">★ PRO</span>}
              </div>
              <p className="text-sm text-chalk/40 font-mono">{user.email}</p>
            </div>
            <button onClick={signOut} className="btn-ghost text-xs">Sign out</button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-chalk/8">
            {[
              { label: 'Games',   value: totalGames },
              { label: 'Avg score', value: avgScore.toLocaleString() },
              { label: 'Streak',  value: `${profile?.current_streak ?? 0}d` },
              { label: 'Perfect', value: perfectGames },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <div className="font-mono text-xl font-bold text-mud">{value}</div>
                <div className="text-xs text-chalk/30 font-mono mt-0.5 uppercase tracking-wide">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Upgrade prompt for non-Pro */}
        {!isPro && (
          <div className="card-base p-6 text-center"
            style={{ border: '1px solid rgba(200,169,110,0.2)' }}>
            <p className="text-sm text-chalk/60 mb-3">
              Upgrade to Pro to unlock the archive, leaderboard, and keep your scores.
            </p>
            <button onClick={() => navigate('/pricing')} className="btn-brass">
              Upgrade to Pro — £3/mo
            </button>
          </div>
        )}

        {/* Recent games */}
        <div>
          <h2 className="font-display text-lg text-chalk mb-4">Recent Games</h2>

          {loading ? (
            <div className="text-center py-10">
              <span className="font-mono text-xs text-chalk/30 animate-shimmer">Loading…</span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="card-base p-8 text-center">
              <p className="text-sm text-chalk/40">No games yet. Play today's challenge!</p>
            </div>
          ) : (
            <div className="card-base overflow-hidden">
              {sessions.map((s, i) => {
                const emoji = (s.results ?? []).map(r => r.correct ? '🟢' : '🔴').join('')
                return (
                  <div key={i}
                    className="flex items-center justify-between px-5 py-3.5 border-b border-chalk/5 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-chalk">
                        {format(parseISO(s.puzzle_date), 'EEE d MMM yyyy')}
                      </p>
                      <p className="text-xs mt-0.5 tracking-wider">{emoji}</p>
                    </div>
                    <span className="font-mono text-base font-bold text-mud">
                      {(s.score ?? 0).toLocaleString()}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
