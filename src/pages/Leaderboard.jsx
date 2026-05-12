import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { format } from 'date-fns'

export default function Leaderboard() {
  const { user, isPro } = useAuth()
  const navigate = useNavigate()
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)
  const todayStr = format(new Date(), 'yyyy-MM-dd')

  useEffect(() => { fetchLeaderboard() }, [])

  async function fetchLeaderboard() {
    setLoading(true)
    // Top 50 scores for today among Pro users
    const { data } = await supabase
      .from('game_sessions')
      .select(`
        score,
        results,
        profiles:user_id ( username, is_pro )
      `)
      .eq('puzzle_date', todayStr)
      .eq('completed', true)
      .order('score', { ascending: false })
      .limit(50)

    setRows((data ?? []).filter(r => r.profiles?.is_pro))
    setLoading(false)
  }

  if (!isPro) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="card-base p-10 text-center max-w-sm w-full">
          <div className="text-4xl mb-4">🏆</div>
          <h2 className="font-display text-2xl text-chalk mb-3">Pro Feature</h2>
          <p className="text-sm text-chalk/50 mb-6">
            The leaderboard is for Pro subscribers. Upgrade to see where you rank.
          </p>
          <button onClick={() => navigate('/pricing')} className="btn-brass w-full">
            Go Pro
          </button>
          {!user && (
            <button onClick={() => navigate('/auth')} className="btn-ghost w-full mt-2 text-sm">
              Sign in
            </button>
          )}
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-xs font-mono tracking-widest text-mud/60 uppercase mb-2">
            {format(new Date(), 'EEEE d MMMM yyyy')}
          </p>
          <h1 className="font-display font-black text-4xl text-chalk">Today's Leaderboard</h1>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="font-mono text-xs text-chalk/30 tracking-widest animate-shimmer uppercase">Loading…</div>
          </div>
        ) : rows.length === 0 ? (
          <div className="card-base p-10 text-center">
            <p className="text-chalk/50 text-sm">No scores yet today. Be the first to complete the challenge!</p>
          </div>
        ) : (
          <div className="card-base overflow-hidden">
            {/* Column headers */}
            <div className="flex items-center px-5 py-3 border-b border-chalk/5">
              <span className="w-10 text-xs font-mono text-chalk/30 uppercase">#</span>
              <span className="flex-1 text-xs font-mono text-chalk/30 uppercase">Player</span>
              <span className="text-xs font-mono text-chalk/30 uppercase">Score</span>
            </div>

            {rows.map((row, i) => {
              const isMe = row.user_id === user?.id
              const emoji = row.results?.map(r => r.correct ? '🟢' : '🔴').join('') ?? ''
              return (
                <div key={i}
                  className={`flex items-center px-5 py-3.5 border-b border-chalk/5 last:border-0 transition-colors ${
                    isMe ? 'bg-mud/8' : 'hover:bg-chalk/2'
                  }`}>
                  {/* Rank */}
                  <span className={`w-10 font-mono text-sm font-bold ${
                    i === 0 ? 'text-amber' : i === 1 ? 'text-chalk/60' : i === 2 ? 'text-mud/70' : 'text-chalk/30'
                  }`}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                  </span>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm font-medium ${isMe ? 'text-mud' : 'text-chalk/80'}`}>
                      {row.profiles?.username ?? 'Anonymous'}
                      {isMe && <span className="text-xs text-mud/60 ml-2">(you)</span>}
                    </span>
                    {emoji && (
                      <div className="text-xs mt-0.5 tracking-wider">{emoji}</div>
                    )}
                  </div>

                  {/* Score */}
                  <span className="font-mono text-base font-bold text-mud">
                    {row.score.toLocaleString()}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
