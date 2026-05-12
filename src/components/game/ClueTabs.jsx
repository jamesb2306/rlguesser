const CLUE_ORDER = ['clubs', 'nation', 'position', 'photo']
const LABELS     = { clubs: 'Clubs', nation: 'Nation', position: 'Position', photo: 'Photo' }

export default function ClueTabs({ activeClue, unlockedClues, onSelect }) {
  return (
    <div className="flex gap-2 justify-center">
      {CLUE_ORDER.map(clue => {
        const unlocked = unlockedClues.includes(clue)
        const isActive = activeClue === clue
        return (
          <button
            key={clue}
            onClick={() => unlocked && onSelect(clue)}
            className={`clue-tab ${isActive ? 'active' : unlocked ? 'unlocked' : 'locked'}`}
            disabled={!unlocked}
            aria-label={unlocked ? `View ${clue} clue` : `${clue} clue locked`}
          >
            {unlocked ? LABELS[clue] : '🔒'}
          </button>
        )
      })}
    </div>
  )
}
