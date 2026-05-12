import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { format } from 'date-fns'

const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS ?? '').split(',').map(e => e.trim())

const POSITIONS = [
  'Fullback','Winger','Centre','Stand-off',
  'Half-back','Hooker','Prop','Second-row','Loose forward'
]

const FLAG_MAP = {
  'England':'🏴󠁧󠁢󠁥󠁮󠁧󠁿','Australia':'🇦🇺','New Zealand':'🇳🇿','Samoa':'🇼🇸',
  'Tonga':'🇹🇴','Papua New Guinea':'🇵🇬','France':'🇫🇷','Wales':'🏴󠁧󠁢󠁷󠁬󠁳󠁿',
  'Scotland':'🏴󠁧󠁢󠁳󠁣󠁴󠁿','Ireland':'🇮🇪','Fiji':'🇫🇯','Lebanon':'🇱🇧',
  'Cook Islands':'🇨🇰','Jamaica':'🇯🇲','United States':'🇺🇸','Canada':'🇨🇦',
  'Greece':'🇬🇷','Italy':'🇮🇹','Serbia':'🇷🇸','Malta':'🇲🇹',
  'Hungary':'🇭🇺','Morocco':'🇲🇦','Brazil':'🇧🇷','South Africa':'🇿🇦',
}

function normalisePosition(raw) {
  if (!raw) return ''
  const r = raw.toLowerCase()
  if (r.includes('fullback') || r.includes('full-back')) return 'Fullback'
  if (r.includes('winger') || r.includes('wing')) return 'Winger'
  if (r.includes('centre') || r.includes('center')) return 'Centre'
  if (r.includes('stand-off') || r.includes('standoff') || r.includes('five-eighth')) return 'Stand-off'
  if (r.includes('half-back') || r.includes('halfback') || r.includes('scrum-half')) return 'Half-back'
  if (r.includes('hooker')) return 'Hooker'
  if (r.includes('prop') || r.includes('front row')) return 'Prop'
  if (r.includes('second row') || r.includes('second-row')) return 'Second-row'
  if (r.includes('loose forward') || r.includes('loose-forward') || r.includes('lock')) return 'Loose forward'
  return ''
}

export default function Admin() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const isAdmin = user && ADMIN_EMAILS.includes(user.email)

  const [tab, setTab] = useState('players')
  const [players, setPlayers] = useState([])
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  const [wikiQuery, setWikiQuery] = useState('')
  const [wikiResults, setWikiResults] = useState([])
  const [wikiLoading, setWikiLoading] = useState(false)
  const [wikiSearched, setWikiSearched] = useState(false)

  const emptyPlayer = {
    name:'', position:'', nation:'', nation_flag:'',
    shirt_number:'', leagues:['SL'],
    clubs:[{ name:'', years:'', appearances:'' }],
    photo_path:'',
  }
  const [form, setForm] = useState(emptyPlayer)
  const [editId, setEditId] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)

  const [scheduleDate, setScheduleDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [playerIds, setPlayerIds] = useState(['','','','',''])
  const [puzzles, setPuzzles] = useState([])
  const [autoLoading, setAutoLoading] = useState(false)

  useEffect(() => {
    if (!authLoading && !isAdmin) navigate('/')
    if (isAdmin) { fetchPlayers(); fetchPuzzles() }
  }, [authLoading, isAdmin])

  useEffect(() => {
    if (form.nation && FLAG_MAP[form.nation]) {
      setForm(f => ({ ...f, nation_flag: FLAG_MAP[form.nation] }))
    }
  }, [form.nation])

  async function fetchPlayers() {
    const { data } = await supabase.from('players').select('*').order('name')
    setPlayers(data ?? [])
  }

  async function fetchPuzzles() {
    const { data } = await supabase
      .from('daily_puzzles').select('*')
      .gte('date', format(new Date(), 'yyyy-MM-dd'))
      .order('date').limit(14)
    setPuzzles(data ?? [])
  }

  async function searchWikipedia() {
    if (!wikiQuery.trim()) return
    setWikiLoading(true)
    setWikiResults([])
    setWikiSearched(false)
    try {
      const res = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(wikiQuery + ' rugby league')}&format=json&origin=*&srlimit=6`
      )
      const data = await res.json()
      setWikiResults(data.query?.search ?? [])
      setWikiSearched(true)
    } catch {
      setMsg({ type:'err', text:'Wikipedia search failed.' })
    } finally {
      setWikiLoading(false)
    }
  }

  async function importFromWikipedia(pageId, title) {
    setWikiLoading(true)
    setMsg(null)
    try {
      const res = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&pageids=${pageId}&prop=revisions&rvprop=content&rvslots=main&format=json&origin=*`
      )
      const data = await res.json()
      const wikitext = data.query.pages[pageId]?.revisions?.[0]?.slots?.main?.['*'] ?? ''

      const get = (key) => {
        const m = wikitext.match(new RegExp(`\\|\\s*${key}\\s*=\\s*([^\\n|]+)`, 'i'))
        return m ? m[1].replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g,'$1').replace(/'{2,3}/g,'').replace(/<[^>]+>/g,'').trim() : ''
      }

      const rawName   = get('name') || title
      const position  = normalisePosition(get('position') || get('playing_position'))

      let nation = ''
      for (const n of Object.keys(FLAG_MAP)) {
        if (wikitext.includes(n)) { nation = n; break }
      }
      const nationFlag = FLAG_MAP[nation] ?? ''

      // Parse career clubs from wikitext tables
      const clubs = []
      const seen  = new Set()
      const rx = /\|\s*\[\[([^\]|]+?)(?:\|[^\]]+)?\]\]\s*\|\|\s*([\d]{4}[–\-][\d]{2,4}|[\d]{4})\s*\|\|\s*([\d]+)/g
      let m
      while ((m = rx.exec(wikitext)) !== null) {
        const name = m[1].trim()
        if (!seen.has(name) && name.length > 2 && !/=|thumb|px/.test(name)) {
          seen.add(name)
          clubs.push({ name, years: m[2], appearances: m[3] })
        }
      }

      const nrlClues = ['Storm','Broncos','Roosters','Raiders','Knights','Cowboys','Bulldogs','Sea Eagles','Eels','Rabbitohs','Titans','Sharks','Panthers','Warriors','Dolphins','NRL']
      const slClues  = ['Super League','Wigan','Leeds','Warrington','Hull','Catalans','Castleford','Wakefield','Salford','Leigh','Huddersfield']
      const leagues  = []
      if (slClues.some(k => wikitext.includes(k)))  leagues.push('SL')
      if (nrlClues.some(k => wikitext.includes(k))) leagues.push('NRL')
      if (leagues.length === 0) leagues.push('SL')

      setForm(f => ({
        ...f,
        name:        rawName.split('(')[0].trim(),
        position:    position || f.position,
        nation:      nation   || f.nation,
        nation_flag: nationFlag || f.nation_flag,
        leagues,
        clubs: clubs.length > 0 ? clubs : f.clubs,
      }))

      setWikiResults([])
      setWikiQuery('')
      setWikiSearched(false)
      setMsg({ type:'ok', text:`Imported "${rawName.split('(')[0].trim()}" from Wikipedia. Review and save.` })
    } catch (err) {
      setMsg({ type:'err', text:'Failed to import from Wikipedia.' })
      console.error(err)
    } finally {
      setWikiLoading(false)
    }
  }

  function handlePhotoChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function uploadPhoto(playerId) {
    if (!photoFile) return form.photo_path
    const ext  = photoFile.name.split('.').pop()
    const path = `${playerId}.${ext}`
    await supabase.storage.from('player-photos').upload(path, photoFile, { upsert: true })
    return path
  }

  async function savePlayer(e) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    try {
      const clubs = form.clubs.map(c => ({
        name: c.name, years: c.years, appearances: parseInt(c.appearances) || 0,
      }))
      const payload = {
        name: form.name, position: form.position, nation: form.nation,
        nation_flag: form.nation_flag, leagues: form.leagues,
        shirt_number: form.shirt_number ? parseInt(form.shirt_number) : null,
        clubs,
      }
      let photo_path = form.photo_path
      if (editId) {
        photo_path = await uploadPhoto(editId)
        const { error } = await supabase.from('players').update({ ...payload, photo_path }).eq('id', editId)
        if (error) throw error
        setMsg({ type:'ok', text:'Player updated.' })
      } else {
        const { data, error } = await supabase.from('players').insert({ ...payload, photo_path:'' }).select('id').single()
        if (error) throw error
        photo_path = await uploadPhoto(data.id)
        await supabase.from('players').update({ photo_path }).eq('id', data.id)
        setMsg({ type:'ok', text:'Player added.' })
      }
      setForm(emptyPlayer); setEditId(null); setPhotoFile(null); setPhotoPreview(null)
      fetchPlayers()
    } catch (err) {
      setMsg({ type:'err', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  function editPlayer(p) {
    setEditId(p.id)
    setForm({
      name: p.name??'', position: p.position??'', nation: p.nation??'',
      nation_flag: p.nation_flag??'', shirt_number: p.shirt_number??'',
      photo_path: p.photo_path??'', leagues: p.leagues??['SL'],
      clubs: p.clubs?.length > 0 ? p.clubs.map(c => ({
        name: c.name??'', years: c.years??'', appearances: String(c.appearances??''),
      })) : [{ name:'', years:'', appearances:'' }],
    })
    setPhotoPreview(null)
    window.scrollTo({ top:0, behavior:'smooth' })
  }

  function addClub()           { setForm(f => ({ ...f, clubs: [...f.clubs, { name:'', years:'', appearances:'' }] })) }
  function removeClub(i)       { setForm(f => ({ ...f, clubs: f.clubs.filter((_,idx) => idx !== i) })) }
  function updateClub(i,k,v)   { setForm(f => { const clubs=[...f.clubs]; clubs[i]={...clubs[i],[k]:v}; return {...f,clubs} }) }
  function toggleLeague(l)     { setForm(f => ({ ...f, leagues: f.leagues.includes(l) ? f.leagues.filter(x=>x!==l) : [...f.leagues,l] })) }

  async function savePuzzle(e) {
    e.preventDefault(); setSaving(true); setMsg(null)
    const ids = playerIds.filter(Boolean)
    if (ids.length !== 5) { setMsg({ type:'err', text:'Select exactly 5 players.' }); setSaving(false); return }
    const { error } = await supabase.from('daily_puzzles').upsert({ date: scheduleDate, player_ids: ids }, { onConflict:'date' })
    if (error) setMsg({ type:'err', text: error.message })
    else { setMsg({ type:'ok', text:`Puzzle saved for ${scheduleDate}.` }); fetchPuzzles() }
    setSaving(false)
  }

  async function autoGeneratePuzzle() {
    setAutoLoading(true); setMsg(null)
    const { data, error } = await supabase.functions.invoke('auto-puzzle', { body: { date: scheduleDate } })
    if (error) setMsg({ type:'err', text: error.message })
    else { setMsg({ type:'ok', text: data.message }); fetchPuzzles() }
    setAutoLoading(false)
  }

  const filtered = players.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
  if (authLoading) return null

  return (
    <main className="min-h-screen py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-display font-black text-3xl text-chalk">Admin</h1>
          <div className="flex gap-2">
            {['players','schedule'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={tab===t ? 'btn-brass text-xs' : 'btn-ghost text-xs capitalize'}>{t}</button>
            ))}
          </div>
        </div>

        {msg && (
          <div className={`mb-6 px-4 py-3 rounded text-sm font-mono ${
            msg.type==='ok'
              ? 'bg-green-900/30 text-green-300 border border-green-700/20'
              : 'bg-red-900/30 text-red-300 border border-red-700/20'
          }`}>{msg.text}</div>
        )}

        {tab === 'players' && (
          <div className="space-y-8">
            <div className="card-base p-6">
              <h2 className="font-display text-lg text-chalk mb-5">{editId ? 'Edit Player' : 'Add Player'}</h2>

              {/* Wikipedia import */}
              <div className="mb-6 p-4 rounded-lg" style={{ background:'rgba(200,169,110,0.06)', border:'1px solid rgba(200,169,110,0.15)' }}>
                <label className="text-xs font-mono text-mud/70 uppercase tracking-widest block mb-2">Import from Wikipedia</label>
                <div className="flex gap-2">
                  <input value={wikiQuery} onChange={e => setWikiQuery(e.target.value)}
                    onKeyDown={e => e.key==='Enter' && searchWikipedia()}
                    placeholder="Search player name…" className="input-vintage flex-1 text-sm" />
                  <button type="button" onClick={searchWikipedia}
                    disabled={wikiLoading || !wikiQuery.trim()}
                    className="btn-brass text-xs disabled:opacity-50 whitespace-nowrap">
                    {wikiLoading ? 'Searching…' : 'Search Wikipedia'}
                  </button>
                </div>
                {wikiSearched && wikiResults.length === 0 && (
                  <p className="text-xs text-chalk/40 mt-2 font-mono">No results found.</p>
                )}
                {wikiResults.length > 0 && (
                  <ul className="mt-2 divide-y divide-chalk/5">
                    {wikiResults.map(r => (
                      <li key={r.pageid}>
                        <button type="button" onClick={() => importFromWikipedia(r.pageid, r.title)}
                          className="w-full text-left px-3 py-2.5 text-sm text-chalk/80 hover:bg-mud/10 transition-colors">
                          <span className="font-medium">{r.title}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <form onSubmit={savePlayer} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))}
                    placeholder="Full name *" required className="input-vintage col-span-2" />
                  <select value={form.position} onChange={e => setForm(f=>({...f,position:e.target.value}))}
                    className="input-vintage" required>
                    <option value="">Position *</option>
                    {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <select value={form.nation} onChange={e => setForm(f=>({...f,nation:e.target.value}))}
                    className="input-vintage" required>
                    <option value="">Nation *</option>
                    {Object.keys(FLAG_MAP).map(n => <option key={n} value={n}>{FLAG_MAP[n]} {n}</option>)}
                  </select>
                  <div className="flex items-center gap-2 px-3 py-2 rounded text-2xl"
                    style={{ background:'rgba(245,240,232,0.04)', border:'1px solid rgba(200,169,110,0.2)' }}>
                    {form.nation_flag || '🏳️'}
                    <span className="text-xs text-chalk/30 font-mono">auto-detected</span>
                  </div>
                  <input value={form.shirt_number} onChange={e => setForm(f=>({...f,shirt_number:e.target.value}))}
                    placeholder="Shirt number" type="number" className="input-vintage" />
                </div>

                {/* Leagues */}
                <div>
                  <label className="text-xs font-mono text-chalk/40 uppercase tracking-widest block mb-2">Leagues</label>
                  <div className="flex gap-3">
                    {['SL','NRL'].map(l => (
                      <button key={l} type="button" onClick={() => toggleLeague(l)}
                        className={`px-4 py-1.5 rounded text-xs font-mono font-medium border transition-all ${
                          form.leagues.includes(l)
                            ? 'bg-mud/20 text-mud border-mud/40'
                            : 'text-chalk/30 border-chalk/10 hover:border-chalk/20'
                        }`}>{l}</button>
                    ))}
                  </div>
                </div>

                {/* Clubs */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-mono text-chalk/40 uppercase tracking-widest">Career clubs</label>
                    <button type="button" onClick={addClub} className="text-xs text-mud hover:text-mud/80 font-mono">+ Add club</button>
                  </div>
                  <div className="space-y-2">
                    {form.clubs.map((c,i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input value={c.name} onChange={e => updateClub(i,'name',e.target.value)}
                          placeholder="Club name" className="input-vintage flex-1" />
                        <input value={c.years} onChange={e => updateClub(i,'years',e.target.value)}
                          placeholder="2018–22" className="input-vintage w-24" />
                        <input value={c.appearances} onChange={e => updateClub(i,'appearances',e.target.value)}
                          placeholder="Apps" type="number" className="input-vintage w-20" />
                        <button type="button" onClick={() => removeClub(i)}
                          className="text-chalk/20 hover:text-red-400 transition-colors text-lg leading-none">×</button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Photo */}
                <div>
                  <label className="text-xs font-mono text-chalk/40 uppercase tracking-widest block mb-2">Player photo</label>
                  <div className="flex items-center gap-4">
                    {(photoPreview || form.photo_path) && (
                      <img src={photoPreview ?? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/player-photos/${form.photo_path}`}
                        alt="Preview" className="w-16 h-16 object-cover rounded object-top" />
                    )}
                    <input type="file" accept="image/*" onChange={handlePhotoChange}
                      className="text-xs text-chalk/50" />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={saving} className="btn-brass disabled:opacity-50">
                    {saving ? 'Saving…' : editId ? 'Update player' : 'Add player'}
                  </button>
                  {editId && (
                    <button type="button" onClick={() => { setForm(emptyPlayer); setEditId(null) }}
                      className="btn-ghost text-sm">Cancel</button>
                  )}
                </div>
              </form>
            </div>

            {/* Player list */}
            <div className="card-base overflow-hidden">
              <div className="p-4 border-b border-chalk/5">
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search players…" className="input-vintage" />
              </div>
              <div className="divide-y divide-chalk/5 max-h-96 overflow-y-auto">
                {filtered.map(p => (
                  <div key={p.id} className="flex items-center justify-between px-5 py-3 hover:bg-chalk/2 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-chalk">{p.name}</p>
                      <p className="text-xs text-chalk/30 font-mono">
                        {p.position} · {p.nation_flag} {p.nation}
                        {p.leagues?.includes('NRL') && <span className="ml-2 text-amber">· NRL</span>}
                      </p>
                    </div>
                    <button onClick={() => editPlayer(p)} className="btn-ghost text-xs">Edit</button>
                  </div>
                ))}
                {filtered.length === 0 && <p className="text-sm text-chalk/30 text-center py-8">No players found</p>}
              </div>
            </div>
          </div>
        )}

        {tab === 'schedule' && (
          <div className="space-y-8">
            <div className="card-base p-6">
              <h2 className="font-display text-lg text-chalk mb-1">Schedule a Puzzle</h2>
              <p className="text-xs text-chalk/40 font-mono mb-5">Auto-generate picks 5 random players not used in the last 30 days.</p>

              <div className="mb-4">
                <label className="text-xs font-mono text-chalk/40 uppercase tracking-widest block mb-2">Date</label>
                <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} className="input-vintage" />
              </div>

              <div className="flex gap-3 mb-6">
                <button onClick={autoGeneratePuzzle} disabled={autoLoading} className="btn-brass disabled:opacity-50">
                  {autoLoading ? 'Generating…' : '✦ Auto-generate'}
                </button>
                <span className="text-xs text-chalk/30 font-mono self-center">or pick manually below</span>
              </div>

              <form onSubmit={savePuzzle} className="space-y-3">
                {playerIds.map((id,i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="font-mono text-xs text-chalk/30 w-4">{i+1}.</span>
                    <select value={id} onChange={e => { const ids=[...playerIds]; ids[i]=e.target.value; setPlayerIds(ids) }}
                      className="input-vintage flex-1">
                      <option value="">Select player…</option>
                      {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                ))}
                <button type="submit" disabled={saving} className="btn-ghost text-sm mt-2 disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save manual puzzle'}
                </button>
              </form>
            </div>

            <div>
              <h3 className="font-display text-base text-chalk mb-3">Upcoming Puzzles</h3>
              <div className="card-base overflow-hidden divide-y divide-chalk/5">
                {puzzles.length === 0 && <p className="text-sm text-chalk/30 text-center py-8">No upcoming puzzles scheduled</p>}
                {puzzles.map(p => (
                  <div key={p.date} className="flex items-center justify-between px-5 py-3">
                    <span className="text-sm font-mono text-chalk/70">{format(new Date(p.date+'T12:00:00'), 'EEE d MMM yyyy')}</span>
                    <span className="text-xs text-chalk/30 font-mono">{p.player_ids?.length??0} players</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
