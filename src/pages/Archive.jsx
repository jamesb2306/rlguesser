import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { format, parseISO, subDays } from 'date-fns'
import { useGame } from '@/hooks/useGame'
import PlayerCard from '@/components/game/PlayerCard'
import ClueTabs from '@/components/game/ClueTabs'
import GuessInput from '@/components/game/GuessInput'
import ProgressBar from '@/components/game/ProgressBar'
import ScoreSummary from '@/components/game/ScoreSummary'

// ── Archive index (pick a date) ──────────────────────────────────────────────
export function ArchiveIndex() {
  const { user, isPro } = useAuth()
  const navigate = useNavigate()
  const [puzzles, setPuzzles] = useState([])
  const [loading, setLoading] = useState(true)
  const today = format(new Date(), 'yyyy-MM-dd')

  useEffect(() => {
    if (!isPro) return
    fetchPuzzles()
  }, [isPro])

  async function fetchPuzzles() {
    const { data } = await supabase
      .from('daily_puzzles')
      .select('date')
      .lt('date', today)
      .order('date', { ascending: false })
      .limit(90)
    setPuzzles(data ?? [])
    setLoading(false)
  }

  if (!isPro) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="card-base p-10 text-center max-w-sm w-full">
          <div className="text-4xl mb-4">📅</div>
          <h2 className="font-display text-2xl text-chalk mb-3">Archive</h2>
          <p className="text-sm text-chalk/50 mb-6">Pro subscribers can play every past challenge.</p>
          <button onClick={() => navigate('/pricing')} className="btn-brass w-full">Go Pro</button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="font-display font-black text-4xl text-chalk">Archive</h1>
          <p className="text-sm text-chalk/40 mt-2">All past challenges, available to replay</p>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <span className="font-mono text-xs text-chalk/30 animate-shimmer uppercase tracking-widest">Loading…</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {puzzles.map(p => (
              <button
                key={p.date}
                onClick={() => navigate(`/archive/${p.date}`)}
                className="card-base p-4 text-left hover:border-mud/30 transition-all group"
              >
                <p className="font-display text-sm font-bold text-chalk group-hover:text-mud transition-colors">
                  {format(parseISO(p.date), 'EEE d MMM')}
                </p>
                <p className="font-mono text-xs text-chalk/30 mt-0.5">
                  {format(parseISO(p.date), 'yyyy')}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

// ── Archive game (same as Home but with a specific date) ──────────────────────
export function ArchiveGame() {
  const { date } = useParams()
  const { isPro } = useAuth()
  const navigate = useNavigate()

  const {
    currentPlayer, currentIndex, players, allPlayers,
    activeClue, setActiveClue, unlockedClues,
    guesses, totalScore, playerResults, gameState,
    loading, error, revealedAnswer, submitGuess, revealPlayer, todayStr,
  } = useGame(date)

  if (!isPro) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="card-base p-10 text-center max-w-sm">
          <h2 className="font-display text-xl text-chalk mb-3">Pro Feature</h2>
          <p className="text-sm text-chalk/50 mb-6">Archive challenges are for Pro subscribers.</p>
          <button onClick={() => navigate('/pricing')} className="btn-brass w-full">Go Pro</button>
        </div>
      </main>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="font-mono text-xs text-chalk/30 animate-shimmer uppercase tracking-widest">Loading…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card-base p-8 text-center max-w-sm">
          <p className="text-chalk/50 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (gameState === 'complete') {
    return (
      <main className="min-h-screen py-12 px-4">
        <div className="text-center mb-4">
          <button onClick={() => navigate('/archive')} className="btn-ghost text-xs">← Back to archive</button>
        </div>
        <ScoreSummary
          playerResults={playerResults}
          players={players}
          totalScore={totalScore}
          todayStr={todayStr}
        />
      </main>
    )
  }

  return (
    <main className="min-h-screen py-8 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate('/archive')} className="btn-ghost text-xs">← Archive</button>
          <p className="text-xs font-mono text-chalk/40">
            {format(parseISO(date), 'EEE d MMM yyyy')}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <ProgressBar currentIndex={currentIndex} playerResults={playerResults} total={5} />
          <div className="ml-4 text-right shrink-0">
            <span className="font-mono text-lg font-bold text-mud">{totalScore.toLocaleString()}</span>
            <span className="text-xs text-chalk/30 font-mono ml-1">pts</span>
          </div>
        </div>

        <PlayerCard
          key={`${date}-${currentIndex}`}
          player={currentPlayer}
          activeClue={activeClue}
          unlockedClues={unlockedClues}
          revealed={revealedAnswer}
          animate
        />

        <ClueTabs activeClue={activeClue} unlockedClues={unlockedClues} onSelect={setActiveClue} />

        {!revealedAnswer && (
          <GuessInput allPlayers={allPlayers} onGuess={submitGuess} guesses={guesses} disabled={revealedAnswer} />
        )}

        {!revealedAnswer && guesses.length > 0 && (
          <div className="text-center">
            <button onClick={revealPlayer} className="btn-ghost text-xs text-chalk/40">
              Give up &amp; reveal
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
