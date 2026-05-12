import { useState } from 'react'
import { useGame } from '@/hooks/useGame'
import { useAuth } from '@/lib/AuthContext'
import { supabase } from '@/lib/supabase'
import PlayerCard from '@/components/game/PlayerCard'
import ClueTabs from '@/components/game/ClueTabs'
import GuessInput from '@/components/game/GuessInput'
import ProgressBar from '@/components/game/ProgressBar'
import ScoreSummary from '@/components/game/ScoreSummary'

export default function Home() {
  const { user, loading: authLoading } = useAuth()
  const {
    currentPlayer, currentIndex, players, allPlayers,
    activeClue, setActiveClue, unlockedClues,
    guesses, totalScore, playerResults, gameState,
    loading, error, revealedAnswer, submitGuess, revealPlayer, todayStr,
  } = useGame()

  // Email gate state
  const [showGate,    setShowGate]    = useState(false)
  const [gateEmail,   setGateEmail]   = useState('')
  const [gateSent,    setGateSent]    = useState(false)
  const [gateSending, setGateSending] = useState(false)
  const [gateError,   setGateError]   = useState(null)

  // Intercept guess — show gate if not signed in
  function handleGuessAttempt(playerId) {
    if (!user) {
      setShowGate(true)
      return
    }
    submitGuess(playerId)
  }

  async function handleEmailSubmit(e) {
    e.preventDefault()
    setGateSending(true)
    setGateError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email: gateEmail,
      options: { emailRedirectTo: `${window.location.origin}/` }
    })
    if (error) { setGateError(error.message); setGateSending(false) }
    else setGateSent(true)
  }

  if (authLoading || loading) return <LoadingScreen />
  if (error) return <ErrorScreen message={error} />

  if (gameState === 'complete') {
    return (
      <main className="min-h-screen py-12 px-4">
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

        {/* Score + progress */}
        <div className="flex items-center justify-between">
          <ProgressBar currentIndex={currentIndex} playerResults={playerResults} total={5} />
          <div className="ml-4 text-right shrink-0">
            <span className="font-mono text-lg font-bold text-mud">{totalScore.toLocaleString()}</span>
            <span className="text-xs text-chalk/30 font-mono ml-1">pts</span>
          </div>
        </div>

        {/* Player card */}
        <PlayerCard
          key={currentIndex}
          player={currentPlayer}
          activeClue={activeClue}
          unlockedClues={unlockedClues}
          revealed={revealedAnswer}
          animate
        />

        {/* Clue tabs */}
        <ClueTabs activeClue={activeClue} unlockedClues={unlockedClues} onSelect={setActiveClue} />

        {/* Email gate overlay */}
        {showGate && !user && (
          <div className="rounded-lg p-6 text-center animate-reveal"
            style={{ background: 'rgba(10,26,15,0.95)', border: '1px solid rgba(200,169,110,0.25)' }}>
            {gateSent ? (
              <div>
                <div className="text-3xl mb-3">✉️</div>
                <p className="font-display text-lg text-chalk mb-1">Check your email</p>
                <p className="text-sm text-chalk/50">
                  We sent a link to <span className="text-mud">{gateEmail}</span>.
                  Click it to start guessing.
                </p>
              </div>
            ) : (
              <>
                <p className="font-display text-xl text-chalk mb-1">One quick step</p>
                <p className="text-sm text-chalk/50 mb-4">
                  Enter your email to guess — free, no password, takes 5 seconds.
                </p>
                <form onSubmit={handleEmailSubmit} className="flex gap-2">
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={gateEmail}
                    onChange={e => setGateEmail(e.target.value)}
                    className="input-vintage flex-1 text-sm"
                    required
                    autoFocus
                  />
                  <button type="submit" disabled={gateSending} className="btn-brass text-sm disabled:opacity-50 whitespace-nowrap">
                    {gateSending ? 'Sending…' : 'Let me play'}
                  </button>
                </form>
                {gateError && <p className="text-xs text-red-400 font-mono mt-2">{gateError}</p>}
                <button onClick={() => setShowGate(false)}
                  className="text-xs text-chalk/20 hover:text-chalk/40 transition-colors mt-3 block mx-auto">
                  Maybe later
                </button>
              </>
            )}
          </div>
        )}

        {/* Guess input — always visible but triggers gate if not signed in */}
        {!revealedAnswer && !showGate && (
          <GuessInput
            allPlayers={allPlayers}
            onGuess={handleGuessAttempt}
            guesses={guesses}
            disabled={revealedAnswer}
          />
        )}

        {/* Give up */}
        {!revealedAnswer && !showGate && guesses.length > 0 && (
          <div className="text-center">
            <button onClick={revealPlayer} className="btn-ghost text-xs text-chalk/40 hover:text-chalk/70">
              Give up &amp; reveal answer
            </button>
          </div>
        )}

        {revealedAnswer && (
          <div className="text-center py-2 animate-reveal">
            <p className="text-sm text-chalk/50 font-mono">Next player loading…</p>
          </div>
        )}

        {/* Subtle Pro upsell at bottom */}
        {!user && !showGate && (
          <div className="text-center pt-2">
            <p className="text-xs text-chalk/25 font-mono">
              <a href="/pricing" className="text-mud/50 hover:text-mud transition-colors">Go Pro</a>
              {' '}to save scores, access the archive &amp; leaderboard
            </p>
          </div>
        )}
      </div>
    </main>
  )
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="font-display text-2xl text-mud animate-shimmer">RLGuesser</div>
        <p className="text-xs font-mono text-chalk/30 tracking-widest uppercase">Loading today's challenge…</p>
      </div>
    </div>
  )
}

function ErrorScreen({ message }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card-base p-8 text-center max-w-sm">
        <p className="font-display text-xl text-chalk mb-2">No puzzle today</p>
        <p className="text-sm text-chalk/50">{message}</p>
      </div>
    </div>
  )
}
