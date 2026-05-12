import { useAuth } from '@/lib/AuthContext'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'

export default function ScoreSummary({ playerResults, players, totalScore, todayStr }) {
  const { user, isPro } = useAuth()
  const navigate = useNavigate()

  function buildShareText() {
    const date = format(new Date(todayStr), 'dd MMM yyyy')
    const emojiRow = playerResults.map(r => r.correct ? '🟢' : '🔴').join('')
    return `RLGuesser ${date}\n${emojiRow}\nScore: ${totalScore.toLocaleString()} pts\nrlguesser.com`
  }

  async function handleShare() {
    const text = buildShareText()
    if (navigator.share) {
      await navigator.share({ text })
    } else {
      await navigator.clipboard.writeText(text)
      alert('Results copied to clipboard!')
    }
  }

  return (
    <div className="card-base w-full max-w-md mx-auto p-6 animate-reveal">
      {/* Header */}
      <div className="text-center mb-6">
        <p className="text-xs font-mono tracking-widest text-mud/60 uppercase mb-1">
          {format(new Date(todayStr), 'EEEE d MMMM yyyy')}
        </p>
        <h2 className="font-display text-3xl font-black text-chalk">Today's Result</h2>
      </div>

      {/* Score */}
      <div className="text-center mb-6">
        <div className="inline-flex flex-col items-center gap-1 px-8 py-4 rounded-lg"
          style={{ background: 'rgba(200,169,110,0.08)', border: '1px solid rgba(200,169,110,0.15)' }}>
          <span className="font-mono text-5xl font-bold text-mud animate-score-pop">
            {totalScore.toLocaleString()}
          </span>
          <span className="text-xs font-mono tracking-widest text-chalk/40 uppercase">points</span>
        </div>
      </div>

      {/* Per-player breakdown */}
      <div className="space-y-2 mb-6">
        {playerResults.map((result, i) => {
          const player = players.find(p => p.id === result.playerId)
          return (
            <div key={i} className="flex items-center justify-between py-2 border-b border-chalk/5 last:border-0">
              <div className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                  result.correct ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
                }`}>
                  {result.correct ? '✓' : '✗'}
                </span>
                <span className="text-sm text-chalk/80">{player?.name ?? '—'}</span>
              </div>
              <div className="text-right">
                <span className="font-mono text-sm font-bold text-mud">
                  {result.points > 0 ? `+${result.points}` : '—'}
                </span>
                {result.guessCount > 0 && (
                  <span className="text-xs text-chalk/30 font-mono ml-2">
                    {result.guessCount} guess{result.guessCount !== 1 ? 'es' : ''}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <button onClick={handleShare} className="btn-brass w-full">
          Share Results
        </button>

        {!user && (
          <div className="text-center mt-2 p-4 rounded-lg"
            style={{ background: 'rgba(196,30,58,0.08)', border: '1px solid rgba(196,30,58,0.15)' }}>
            <p className="text-sm text-chalk/70 mb-2">
              Sign up for Pro to save scores, appear on the leaderboard & play archive challenges.
            </p>
            <button onClick={() => navigate('/pricing')} className="btn-scarlet text-sm w-full">
              Go Pro — see pricing
            </button>
          </div>
        )}

        {user && !isPro && (
          <div className="text-center mt-2 p-4 rounded-lg"
            style={{ background: 'rgba(196,30,58,0.08)', border: '1px solid rgba(196,30,58,0.15)' }}>
            <p className="text-sm text-chalk/70 mb-2">
              Upgrade to Pro to save your scores &amp; unlock the archive.
            </p>
            <button onClick={() => navigate('/pricing')} className="btn-scarlet text-sm w-full">
              Upgrade to Pro
            </button>
          </div>
        )}

        {isPro && (
          <button onClick={() => navigate('/leaderboard')} className="btn-ghost w-full text-sm">
            View Leaderboard
          </button>
        )}
      </div>
    </div>
  )
}
