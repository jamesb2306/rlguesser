import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

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
    <div className={`card-panini w-72 mx-auto select-none ${animate ? 'animate-deal' : ''}`}>

      {/* Top bar — navy with shirt number + position badge */}
      <div className="flex items-center justify-between px-3 py-1.5" style={{ background: '#1a2340' }}>
        <div className="flex items-center gap-2">
          <span style={{
            fontFamily: '"Bebas Neue", serif',
            fontSize: '1.4rem',
            color: '#c8a96e',
            letterSpacing: '0.05em',
            lineHeight: 1,
          }}>
            {player.shirt_number ? `#${player.shirt_number}` : 'RL'}
          </span>
          {revealed && (
            <span style={{
              fontFamily: '"Bebas Neue", serif',
              fontSize: '0.7rem',
              color: 'rgba(255,255,255,0.5)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}>
              {player.position}
            </span>
          )}
        </div>
        <span style={{
          fontFamily: '"Bebas Neue", serif',
          fontSize: '0.7rem',
          color: '#c8a96e',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
        }}>
          Super League
        </span>
      </div>

      {/* Photo area — scarlet background like the Brazil card */}
      <div className="relative overflow-hidden" style={{ height: '220px', background: '#c41e3a' }}>
        {/* Decorative corner stars */}
        <div className="absolute top-2 left-2 text-yellow-400 text-xs opacity-60">★</div>
        <div className="absolute top-2 right-2 text-yellow-400 text-xs opacity-60">★</div>

        {photoUrl ? (
          <img
            src={photoUrl}
            alt={revealed ? player.name : 'Hidden player'}
            className="w-full h-full object-cover object-top transition-all duration-700"
            style={{ filter: showPhoto ? 'none' : 'blur(20px) brightness(0.7)', transform: showPhoto ? 'scale(1)' : 'scale(1.08)' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-16 h-16" style={{ color: 'rgba(255,255,255,0.2)' }} fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
            </svg>
          </div>
        )}

        {/* Revealed name overlay at bottom of photo */}
        {revealed && (
          <div className="absolute inset-x-0 bottom-0 animate-reveal"
            style={{ background: 'linear-gradient(to top, rgba(26,35,64,0.95) 0%, transparent 100%)', paddingTop: '2.5rem', paddingBottom: '0.5rem', paddingLeft: '0.75rem', paddingRight: '0.75rem' }}>
          </div>
        )}
      </div>

      {/* Gold divider stripe */}
      <div style={{ height: '5px', background: 'linear-gradient(90deg, #1a2340 0%, #c8a96e 30%, #c8a96e 70%, #1a2340 100%)' }} />

      {/* Name plate — Panini style big bold name */}
      <div style={{ background: '#1a2340', padding: '6px 12px 8px' }}>
        <div className="name-plate text-center">
          {revealed ? player.name.toUpperCase() : '? ? ? ? ?'}
        </div>
      </div>

      {/* Gold divider */}
      <div style={{ height: '3px', background: '#c8a96e' }} />

      {/* Clue content area — cream background */}
      <div style={{ background: '#f7f2e8', minHeight: '130px', padding: '12px' }}>
        <ClueContent
          player={player}
          activeClue={activeClue}
          unlockedClues={unlockedClues}
          revealed={revealed}
        />
      </div>

      {/* Bottom star strip */}
      <div className="flex items-center justify-center gap-3 py-1.5" style={{ background: '#1a2340' }}>
        {['★','★','★','★','★'].map((s,i) => (
          <span key={i} style={{ color: '#c8a96e', fontSize: '0.6rem', opacity: 0.6 }}>{s}</span>
        ))}
      </div>
    </div>
  )
}

function ClueContent({ player, activeClue, unlockedClues, revealed }) {
  if (activeClue === 'clubs') {
    return (
      <div className="space-y-1">
        {(player.clubs ?? []).map((club, i) => (
          <div key={i} className="flex items-center justify-between py-1 border-b last:border-0" style={{ borderColor: 'rgba(26,35,64,0.1)' }}>
            <div>
              <p className="text-sm font-medium" style={{ color: '#1a2340' }}>{club.name}</p>
              <p className="text-xs font-mono" style={{ color: 'rgba(26,14,8,0.45)' }}>{club.years}</p>
            </div>
            <span className="font-mono text-sm font-bold" style={{ color: '#c41e3a' }}>
              {club.appearances}
            </span>
          </div>
        ))}
        {(!player.clubs || player.clubs.length === 0) && (
          <p className="text-sm italic" style={{ color: 'rgba(26,14,8,0.3)' }}>Career data loading…</p>
        )}
      </div>
    )
  }

  if (activeClue === 'nation') {
    return (
      <div className="flex flex-col items-center justify-center h-28 gap-2">
        <div className="text-5xl">{player.nation_flag ?? '🏴'}</div>
        <p className="text-sm font-medium tracking-wide" style={{ fontFamily: '"Bebas Neue", serif', letterSpacing: '0.1em', color: '#1a2340', fontSize: '1rem' }}>
          {unlockedClues.includes('nation') || revealed ? player.nation : '— — —'}
        </p>
      </div>
    )
  }

  if (activeClue === 'position') {
    return (
      <div className="flex flex-col items-center justify-center h-28 gap-2">
        <PositionBadge position={player.position} />
        <p className="text-xs tracking-widest uppercase" style={{ color: 'rgba(26,14,8,0.35)', fontFamily: '"IBM Plex Mono", monospace' }}>Playing position</p>
      </div>
    )
  }

  if (activeClue === 'photo') {
    return (
      <div className="flex flex-col items-center justify-center h-28">
        <p className="text-xs tracking-widest uppercase" style={{ color: 'rgba(26,14,8,0.35)', fontFamily: '"IBM Plex Mono", monospace' }}>
          Photo unlocked above ↑
        </p>
      </div>
    )
  }

  return null
}

function PositionBadge({ position }) {
  const colours = {
    'Fullback':      { bg: '#1a2340', text: '#f7f2e8' },
    'Winger':        { bg: '#16a34a', text: '#f7f2e8' },
    'Centre':        { bg: '#d97706', text: '#f7f2e8' },
    'Stand-off':     { bg: '#7c3aed', text: '#f7f2e8' },
    'Half-back':     { bg: '#db2777', text: '#f7f2e8' },
    'Hooker':        { bg: '#c41e3a', text: '#f7f2e8' },
    'Prop':          { bg: '#1a2340', text: '#c8a96e' },
    'Second-row':    { bg: '#0e7490', text: '#f7f2e8' },
    'Loose forward': { bg: '#c8a96e', text: '#1a2340' },
  }
  const style = colours[position] ?? { bg: '#1a2340', text: '#f7f2e8' }
  return (
    <span style={{
      background: style.bg,
      color: style.text,
      fontFamily: '"Bebas Neue", serif',
      fontSize: '1.1rem',
      letterSpacing: '0.1em',
      padding: '6px 20px',
      borderRadius: '4px',
      border: '2px solid #1a2340',
      boxShadow: '3px 3px 0 rgba(26,35,64,0.3)',
    }}>
      {position ?? 'Unknown'}
    </span>
  )
}
