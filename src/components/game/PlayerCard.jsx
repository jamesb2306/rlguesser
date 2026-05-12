import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const CLUE_ORDER = ['clubs', 'nation', 'position', 'photo']

export default function PlayerCard({ player, activeClue, unlockedClues, revealed, animate }) {
  const [photoUrl, setPhotoUrl] = useState(null)

  useEffect(() => {
    if (player?.photo_path) {
      const { data } = supabase.storage.from('player-photos').getPublicUrl(player.photo_path)
      setPhotoUrl(data.publicUrl)
    } else {
      setPhotoUrl(null)
    }
  }, [player?.photo_path])

  if (!player) return null

  const showPhoto = unlockedClues.includes('photo') || revealed

  return (
    <div className={`card-base w-72 mx-auto select-none ${animate ? 'animate-deal' : ''}`}>
      {/* Photo area */}
      <div className="relative h-52 overflow-hidden bg-pitch-800">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={revealed ? player.name : 'Hidden player'}
            className={`w-full h-full object-cover object-top transition-all duration-700 ${
              showPhoto ? 'blur-0' : 'blur-2xl scale-110'
            }`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-20 h-20 rounded-full border-2 border-mud/20 flex items-center justify-center">
              <svg className="w-10 h-10 text-mud/20" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
              </svg>
            </div>
          </div>
        )}

        {/* Revealed name overlay */}
        {revealed && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent pt-8 pb-3 px-4 animate-reveal">
            <p className="font-display font-bold text-xl text-chalk">{player.name}</p>
          </div>
        )}
      </div>

      {/* Card header strip */}
      <div className="flex items-center justify-between px-4 py-2" style={{
        background: 'linear-gradient(90deg, #c41e3a, #9a1528)'
      }}>
        <span className="font-mono text-xs font-medium tracking-widest text-chalk/90 uppercase">
          Super League
        </span>
        <span className="font-mono text-xs font-bold text-amber tracking-wider">
          #{String(player.shirt_number ?? '??').padStart(2, '0')}
        </span>
      </div>

      {/* Amber stripe */}
      <div className="h-1.5" style={{ background: '#f5a623' }} />

      {/* Clue content */}
      <div className="p-4 min-h-36">
        <ClueContent
          player={player}
          activeClue={activeClue}
          unlockedClues={unlockedClues}
          revealed={revealed}
          photoUrl={photoUrl}
        />
      </div>
    </div>
  )
}

function ClueContent({ player, activeClue, unlockedClues, revealed }) {
  if (activeClue === 'clubs') {
    return (
      <div className="space-y-1">
        {(player.clubs ?? []).map((club, i) => (
          <div key={i} className="flex items-center justify-between py-1.5 border-b border-mud/10 last:border-0">
            <div>
              <p className="text-sm font-medium text-chalk">{club.name}</p>
              <p className="text-xs text-chalk/40 font-mono">{club.years}</p>
            </div>
            <span className="font-mono text-sm font-bold text-scarlet">
              {club.appearances}
            </span>
          </div>
        ))}
        {(!player.clubs || player.clubs.length === 0) && (
          <p className="text-sm text-chalk/30 italic">Career data loading…</p>
        )}
      </div>
    )
  }

  if (activeClue === 'nation') {
    return (
      <div className="flex flex-col items-center justify-center h-28 gap-3">
        <div className="text-5xl">{player.nation_flag ?? '🏴'}</div>
        <p className="text-sm font-medium text-chalk/70 tracking-wide">
          {unlockedClues.includes('nation') || revealed ? player.nation : '???'}
        </p>
      </div>
    )
  }

  if (activeClue === 'position') {
    return (
      <div className="flex flex-col items-center justify-center h-28 gap-2">
        <PositionBadge position={player.position} />
        <p className="text-xs text-chalk/40 font-mono tracking-widest uppercase">Position</p>
      </div>
    )
  }

  if (activeClue === 'photo') {
    return (
      <div className="flex flex-col items-center justify-center h-28">
        <p className="text-xs text-chalk/40 font-mono tracking-widest uppercase">
          Photo unlocked above
        </p>
      </div>
    )
  }

  return null
}

function PositionBadge({ position }) {
  const colours = {
    'Fullback':     'bg-blue-900/40 text-blue-300 border-blue-700/30',
    'Winger':       'bg-green-900/40 text-green-300 border-green-700/30',
    'Centre':       'bg-yellow-900/40 text-yellow-300 border-yellow-700/30',
    'Stand-off':    'bg-purple-900/40 text-purple-300 border-purple-700/30',
    'Half-back':    'bg-pink-900/40 text-pink-300 border-pink-700/30',
    'Hooker':       'bg-red-900/40 text-red-300 border-red-700/30',
    'Prop':         'bg-orange-900/40 text-orange-300 border-orange-700/30',
    'Second-row':   'bg-teal-900/40 text-teal-300 border-teal-700/30',
    'Loose forward':'bg-indigo-900/40 text-indigo-300 border-indigo-700/30',
  }
  const cls = colours[position] ?? 'bg-mud/10 text-mud border-mud/20'
  return (
    <span className={`px-4 py-1.5 rounded border text-sm font-medium font-mono tracking-wide ${cls}`}>
      {position ?? 'Unknown'}
    </span>
  )
}
