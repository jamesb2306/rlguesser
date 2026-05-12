import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { format } from 'date-fns'

const CLUE_ORDER   = ['clubs', 'nation', 'position', 'photo']
const MAX_GUESSES  = 5   // per player
const PLAYERS_PER_DAY = 5

// Points awarded based on how many clues were used
const pointsForGuess = (cluesUsed) => {
  const table = [1000, 800, 600, 400, 200]
  return table[Math.min(cluesUsed, table.length - 1)]
}

export function useGame(puzzleDate = null) {
  const { user, isPro } = useAuth()
  const todayStr = puzzleDate ?? format(new Date(), 'yyyy-MM-dd')

  const [puzzle,          setPuzzle]          = useState(null)   // { id, date, player_ids }
  const [players,         setPlayers]          = useState([])    // full player objects
  const [allPlayers,      setAllPlayers]       = useState([])    // for autocomplete
  const [currentIndex,    setCurrentIndex]     = useState(0)
  const [activeClue,      setActiveClue]       = useState('clubs')
  const [unlockedClues,   setUnlockedClues]    = useState(['clubs'])
  const [guesses,         setGuesses]          = useState([])    // for current player
  const [totalScore,      setTotalScore]       = useState(0)
  const [playerResults,   setPlayerResults]    = useState([])    // {correct, guessCount, points}
  const [gameState,       setGameState]        = useState('playing') // playing | complete
  const [loading,         setLoading]          = useState(true)
  const [error,           setError]            = useState(null)
  const [revealedAnswer,  setRevealedAnswer]   = useState(false)

  // ── Load puzzle + players ───────────────────────────────────────────────
  useEffect(() => {
    loadPuzzle()
    loadAllPlayers()
  }, [todayStr])

  async function loadPuzzle() {
    setLoading(true)
    setError(null)
    try {
      const { data: puzzleData, error: puzzleErr } = await supabase
        .from('daily_puzzles')
        .select('*')
        .eq('date', todayStr)
        .single()

      if (puzzleErr || !puzzleData) {
        setError('No puzzle found for today. Check back soon!')
        setLoading(false)
        return
      }

      setPuzzle(puzzleData)

      const { data: playerData, error: playersErr } = await supabase
        .from('players')
        .select('*')
        .in('id', puzzleData.player_ids)

      if (playersErr) throw playersErr

      // Sort players to match the order in player_ids array
      const sorted = puzzleData.player_ids.map(id =>
        playerData.find(p => p.id === id)
      ).filter(Boolean)

      setPlayers(sorted)

      // If user is logged in, check for existing session
      if (user) {
        const { data: session } = await supabase
          .from('game_sessions')
          .select('*')
          .eq('user_id', user.id)
          .eq('puzzle_date', todayStr)
          .single()

        if (session) {
          restoreSession(session, sorted)
        }
      }
    } catch (err) {
      setError('Failed to load puzzle.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function loadAllPlayers() {
    const { data } = await supabase
      .from('players')
      .select('id, name')
      .order('name')
    setAllPlayers(data ?? [])
  }

  function restoreSession(session, playerList) {
    setTotalScore(session.score)
    setPlayerResults(session.results ?? [])
    const done = (session.results ?? []).length
    if (done >= playerList.length || session.completed) {
      setCurrentIndex(playerList.length - 1)
      setGameState('complete')
    } else {
      setCurrentIndex(done)
    }
  }

  // ── Current player helper ───────────────────────────────────────────────
  const currentPlayer = players[currentIndex] ?? null

  // ── Submit a guess ──────────────────────────────────────────────────────
  const submitGuess = useCallback(async (guessedPlayerId) => {
    if (!currentPlayer || gameState !== 'playing') return

    const isCorrect = guessedPlayerId === currentPlayer.id
    const newGuesses = [...guesses, { playerId: guessedPlayerId, correct: isCorrect }]
    setGuesses(newGuesses)

    if (isCorrect) {
      const pts = pointsForGuess(unlockedClues.length - 1)
      const newTotal = totalScore + pts
      setTotalScore(newTotal)

      const result = { correct: true, guessCount: newGuesses.length, points: pts, playerId: currentPlayer.id }
      const newResults = [...playerResults, result]
      setPlayerResults(newResults)

      await advanceOrComplete(newResults, newTotal)
    } else {
      // Unlock next clue
      const nextClueIndex = unlockedClues.length
      if (nextClueIndex < CLUE_ORDER.length) {
        const nextClue = CLUE_ORDER[nextClueIndex]
        const newUnlocked = [...unlockedClues, nextClue]
        setUnlockedClues(newUnlocked)
        setActiveClue(nextClue)
      }

      // Out of guesses for this player
      if (newGuesses.length >= MAX_GUESSES) {
        const result = { correct: false, guessCount: newGuesses.length, points: 0, playerId: currentPlayer.id }
        const newResults = [...playerResults, result]
        setPlayerResults(newResults)
        setRevealedAnswer(true)
        setTimeout(() => advanceOrComplete(newResults, totalScore), 2200)
      }
    }
  }, [currentPlayer, gameState, guesses, unlockedClues, playerResults, totalScore])

  async function advanceOrComplete(results, score) {
    const nextIndex = results.length
    if (nextIndex >= PLAYERS_PER_DAY || nextIndex >= players.length) {
      setGameState('complete')
      await saveSession(results, score, true)
    } else {
      setCurrentIndex(nextIndex)
      setGuesses([])
      setUnlockedClues(['clubs'])
      setActiveClue('clubs')
      setRevealedAnswer(false)
    }
  }

  // ── Reveal (skip) ───────────────────────────────────────────────────────
  const revealPlayer = useCallback(() => {
    if (!currentPlayer) return
    setRevealedAnswer(true)
    const result = { correct: false, guessCount: guesses.length, points: 0, playerId: currentPlayer.id, skipped: true }
    const newResults = [...playerResults, result]
    setPlayerResults(newResults)
    setTimeout(() => advanceOrComplete(newResults, totalScore), 2200)
  }, [currentPlayer, guesses, playerResults, totalScore])

  // ── Save game session ───────────────────────────────────────────────────
  async function saveSession(results, score, completed) {
    if (!user) return
    const payload = {
      user_id:     user.id,
      puzzle_date: todayStr,
      score,
      results,
      completed,
    }
    await supabase.from('game_sessions').upsert(payload, {
      onConflict: 'user_id,puzzle_date'
    })
  }

  return {
    puzzle,
    currentPlayer,
    currentIndex,
    players,
    allPlayers,
    activeClue,
    setActiveClue,
    unlockedClues,
    guesses,
    totalScore,
    playerResults,
    gameState,
    loading,
    error,
    revealedAnswer,
    submitGuess,
    revealPlayer,
    todayStr,
  }
}
