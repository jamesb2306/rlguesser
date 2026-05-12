import { useState } from 'react'
import { useGame } from '@/hooks/useGame'
import { useAuth } from '@/lib/AuthContext'
import PlayerCard from '@/components/game/PlayerCard'
import ClueTabs from '@/components/game/ClueTabs'
import GuessInput from '@/components/game/GuessInput'
import ProgressBar from '@/components/game/ProgressBar'
import ScoreSummary from '@/components/game/ScoreSummary'
import Auth from '@/pages/Auth'

export default function Home() {
  const { user, loading: authLoading } = useAuth()
  const {
    currentPlayer, currentIndex, players, allPlayers,
    activeClue, setActiveClue, unlockedClues,
    guesses, totalScore, playerResults, gameState,
    loading, error, revealedAnswer, submitGuess, revealPlayer, todayStr,
  } = useGame()

  // Show auth gate if not signed in
  if (!authLoading && !user) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
        <div className="text-center mb-8 max-w-sm">
          <h2 className="font-display font-black text-3xl text-chalk mb-2">
            Today's Challenge
          </h2>
          <p className="text-sm text-chalk/50">
            Sign in with your email to play — it's free, takes 10 seconds, no password needed.
          </p>
        </div>
        <div className="w-full max-w-sm">
          <Auth minimal />
        </div>
      </main>
    )
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

        {/* Guess input */}
        {!revealedAnswer && (
          <GuessInput
            allPlayers={allPlayers}
            onGuess={submitGuess}
            guesses={guesses}
            disabled={revealedAnswer}
          />
        )}

        {/* Give up */}
        {!revealedAnswer && guesses.length > 0 && (
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
