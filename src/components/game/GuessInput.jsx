import { useState, useRef, useEffect } from 'react'

export default function GuessInput({ allPlayers, onGuess, guesses, disabled }) {
  const [query,     setQuery]     = useState('')
  const [filtered,  setFiltered]  = useState([])
  const [highlight, setHighlight] = useState(-1)
  const [shaking,   setShaking]   = useState(false)
  const inputRef = useRef(null)

  const guessedIds = guesses.map(g => g.playerId)

  useEffect(() => {
    if (!query.trim()) { setFiltered([]); return }
    const q = query.toLowerCase()
    setFiltered(
      allPlayers
        .filter(p => p.name.toLowerCase().includes(q) && !guessedIds.includes(p.id))
        .slice(0, 8)
    )
    setHighlight(-1)
  }, [query, allPlayers, guessedIds])

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown')  setHighlight(h => Math.min(h + 1, filtered.length - 1))
    if (e.key === 'ArrowUp')    setHighlight(h => Math.max(h - 1, 0))
    if (e.key === 'Enter') {
      if (highlight >= 0 && filtered[highlight]) select(filtered[highlight])
      else if (filtered.length === 1) select(filtered[0])
    }
    if (e.key === 'Escape') { setFiltered([]); setQuery('') }
  }

  function select(player) {
    setQuery('')
    setFiltered([])
    setHighlight(-1)
    onGuess(player.id)
  }

  function handleSubmit() {
    if (filtered.length === 0 && query.trim()) {
      setShaking(true)
      setTimeout(() => setShaking(false), 400)
      return
    }
    if (highlight >= 0 && filtered[highlight]) select(filtered[highlight])
    else if (filtered.length === 1) select(filtered[0])
  }

  return (
    <div className="relative w-full max-w-md mx-auto">
      <div className={`flex gap-2 ${shaking ? 'animate-shake' : ''}`}>
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a player name…"
            disabled={disabled}
            className="input-vintage w-full"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />

          {/* Dropdown */}
          {filtered.length > 0 && (
            <ul className="absolute top-full left-0 right-0 mt-1 z-50 rounded overflow-hidden"
              style={{ background: '#0f2614', border: '1px solid rgba(200,169,110,0.2)' }}>
              {filtered.map((p, i) => (
                <li key={p.id}>
                  <button
                    onMouseDown={() => select(p)}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                      i === highlight
                        ? 'bg-mud/20 text-chalk'
                        : 'text-chalk/70 hover:bg-mud/10 hover:text-chalk'
                    }`}
                  >
                    {p.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={disabled || !query.trim()}
          className="btn-brass px-6 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
        >
          Guess
        </button>
      </div>

      {/* Previous guesses */}
      {guesses.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {guesses.map((g, i) => {
            const name = allPlayers.find(p => p.id === g.playerId)?.name ?? 'Unknown'
            return (
              <span
                key={i}
                className={`px-2.5 py-1 rounded text-xs font-mono ${
                  g.correct
                    ? 'bg-green-900/40 text-green-300 border border-green-700/30'
                    : 'bg-red-900/30 text-red-300 border border-red-700/20'
                }`}
              >
                {g.correct ? '✓' : '✗'} {name}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
