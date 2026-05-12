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

const NATIONS = [
  'England','Australia','New Zealand','Samoa','Tonga',
  'Papua New Guinea','France','Wales','Scotland','Ireland','Fiji','Lebanon'
]

export default function Admin() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const isAdmin = user && ADMIN_EMAILS.includes(user.email)

  const [tab, setTab] = useState('players') // players | schedule

  // ── Player form state ──────────────────────────────────────────────────
  const [players, setPlayers] = useState([])
  const [search,  setSearch]  = useState('')
  const [saving,  setSaving]  = useState(false)
  const [msg,     setMsg]     = useState(null)

  const emptyPlayer = {
    name: '', position: '', nation: '', nation_flag: '',
    shirt_number: '', clubs: [{ name: '', years: '', appearances: '' }],
    photo_path: '',
  }
  const [form, setForm] = useState(emptyPlayer)
  const [editId, setEditId] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)

  // ── Puzzle schedule state ──────────────────────────────────────────────
  const [scheduleDate, setScheduleDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [playerIds,    setPlayerIds]    = useState(['', '', '', '', ''])
  const [puzzles,      setPuzzles]      = useState([])

  useEffect(() => {
    if (!authLoading && !isAdmin) navigate('/')
    if (isAdmin) { fetchPlayers(); fetchPuzzles() }
  }, [authLoading, isAdmin])

  async function fetchPlayers() {
    const { data } = await supabase.from('players').select('*').order('name')
    setPlayers(data ?? [])
  }

  async function fetchPuzzles() {
    const { data } = await supabase
      .from('daily_puzzles')
      .select('*')
      .gte('date', format(new Date(), 'yyyy-MM-dd'))
      .order('date')
      .limit(14)
    setPuzzles(data ?? [])
  }

  // ── Photo handling ─────────────────────────────────────────────────────
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

  // ── Save player ────────────────────────────────────────────────────────
  async function savePlayer(e) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)

    try {
      const clubs = form.clubs.map(c => ({
        name: c.name,
        years: c.years,
        appearances: parseInt(c.appearances) || 0,
      }))

      let photo_path = form.photo_path

      if (editId) {
        photo_path = await uploadPhoto(editId)
        const { error } = await supabase.from('players')
          .update({ ...form, clubs, photo_path })
          .eq('id', editId)
        if (error) throw error
        setMsg({ type: 'ok', text: 'Player updated.' })
      } else {
        // Insert first to get ID
        const { data, error } = await supabase.from('players')
          .insert({ ...form, clubs, photo_path: '' })
          .select('id')
          .single()
        if (error) throw error
        photo_path = await uploadPhoto(data.id)
        await supabase.from('players').update({ photo_path }).eq('id', data.id)
        setMsg({ type: 'ok', text: 'Player added.' })
      }

      setForm(emptyPlayer)
      setEditId(null)
      setPhotoFile(null)
      setPhotoPreview(null)
      fetchPlayers()
    } catch (err) {
      setMsg({ type: 'err', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  function editPlayer(p) {
    setEditId(p.id)
    setForm({
      name: p.name ?? '',
      position: p.position ?? '',
      nation: p.nation ?? '',
      nation_flag: p.nation_flag ?? '',
      shirt_number: p.shirt_number ?? '',
      photo_path: p.photo_path ?? '',
      clubs: p.clubs?.length > 0 ? p.clubs.map(c => ({
        name: c.name ?? '',
        years: c.years ?? '',
        appearances: String(c.appearances ?? ''),
      })) : [{ name: '', years: '', appearances: '' }],
    })
    setPhotoPreview(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function addClub() {
    setForm(f => ({ ...f, clubs: [...f.clubs, { name: '', years: '', appearances: '' }] }))
  }

  function removeClub(i) {
    setForm(f => ({ ...f, clubs: f.clubs.filter((_, idx) => idx !== i) }))
  }

  function updateClub(i, field, val) {
    setForm(f => {
      const clubs = [...f.clubs]
      clubs[i] = { ...clubs[i], [field]: val }
      return { ...f, clubs }
    })
  }

  // ── Save puzzle schedule ────────────────────────────────────────────────
  async function savePuzzle(e) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    const ids = playerIds.filter(Boolean)
    if (ids.length !== 5) { setMsg({ type: 'err', text: 'Select exactly 5 players.' }); setSaving(false); return }

    const { error } = await supabase.from('daily_puzzles')
      .upsert({ date: scheduleDate, player_ids: ids }, { onConflict: 'date' })

    if (error) setMsg({ type: 'err', text: error.message })
    else { setMsg({ type: 'ok', text: `Puzzle saved for ${scheduleDate}.` }); fetchPuzzles() }
    setSaving(false)
  }

  const filtered = players.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))

  if (authLoading) return null

  return (
    <main className="min-h-screen py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-display font-black text-3xl text-chalk">Admin</h1>
          <div className="flex gap-2">
            {['players', 'schedule'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={tab === t ? 'btn-brass text-xs' : 'btn-ghost text-xs capitalize'}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {msg && (
          <div className={`mb-6 px-4 py-3 rounded text-sm font-mono ${
            msg.type === 'ok'
              ? 'bg-green-900/30 text-green-300 border border-green-700/20'
              : 'bg-red-900/30 text-red-300 border border-red-700/20'
          }`}>
            {msg.text}
          </div>
        )}

        {/* ── Players tab ── */}
        {tab === 'players' && (
          <div className="space-y-8">
            {/* Form */}
            <div className="card-base p-6">
              <h2 className="font-display text-lg text-chalk mb-5">
                {editId ? 'Edit Player' : 'Add Player'}
              </h2>
              <form onSubmit={savePlayer} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
                    placeholder="Full name *" required className="input-vintage col-span-2" />
                  <select value={form.position} onChange={e => setForm(f => ({...f, position: e.target.value}))}
                    className="input-vintage" required>
                    <option value="">Position *</option>
                    {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <select value={form.nation} onChange={e => setForm(f => ({...f, nation: e.target.value}))}
                    className="input-vintage" required>
                    <option value="">Nation *</option>
                    {NATIONS.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <input value={form.nation_flag} onChange={e => setForm(f => ({...f, nation_flag: e.target.value}))}
                    placeholder="Flag emoji 🏴󠁧󠁢󠁥󠁮󠁧󠁿" className="input-vintage" />
                  <input value={form.shirt_number} onChange={e => setForm(f => ({...f, shirt_number: e.target.value}))}
                    placeholder="Shirt number" type="number" className="input-vintage" />
                </div>

                {/* Clubs */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-mono text-chalk/40 uppercase tracking-widest">Career clubs</label>
                    <button type="button" onClick={addClub} className="text-xs text-mud hover:text-mud/80 font-mono">
                      + Add club
                    </button>
                  </div>
                  <div className="space-y-2">
                    {form.clubs.map((c, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input value={c.name} onChange={e => updateClub(i, 'name', e.target.value)}
                          placeholder="Club name" className="input-vintage flex-1" />
                        <input value={c.years} onChange={e => updateClub(i, 'years', e.target.value)}
                          placeholder="2018–22" className="input-vintage w-24" />
                        <input value={c.appearances} onChange={e => updateClub(i, 'appearances', e.target.value)}
                          placeholder="Apps" type="number" className="input-vintage w-20" />
                        <button type="button" onClick={() => removeClub(i)}
                          className="text-chalk/20 hover:text-red-400 transition-colors text-lg leading-none">×</button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Photo */}
                <div>
                  <label className="text-xs font-mono text-chalk/40 uppercase tracking-widest block mb-2">
                    Player photo
                  </label>
                  <div className="flex items-center gap-4">
                    {(photoPreview || form.photo_path) && (
                      <img
                        src={photoPreview ?? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/player-photos/${form.photo_path}`}
                        alt="Preview"
                        className="w-16 h-16 object-cover rounded object-top"
                      />
                    )}
                    <input type="file" accept="image/*" onChange={handlePhotoChange}
                      className="text-xs text-chalk/50 file:btn-ghost file:mr-3 file:text-xs" />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={saving} className="btn-brass disabled:opacity-50">
                    {saving ? 'Saving…' : editId ? 'Update player' : 'Add player'}
                  </button>
                  {editId && (
                    <button type="button" onClick={() => { setForm(emptyPlayer); setEditId(null) }}
                      className="btn-ghost text-sm">
                      Cancel
                    </button>
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
                      <p className="text-xs text-chalk/30 font-mono">{p.position} · {p.nation}</p>
                    </div>
                    <button onClick={() => editPlayer(p)} className="btn-ghost text-xs">Edit</button>
                  </div>
                ))}
                {filtered.length === 0 && (
                  <p className="text-sm text-chalk/30 text-center py-8">No players found</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Schedule tab ── */}
        {tab === 'schedule' && (
          <div className="space-y-8">
            <div className="card-base p-6">
              <h2 className="font-display text-lg text-chalk mb-5">Schedule a Puzzle</h2>
              <form onSubmit={savePuzzle} className="space-y-4">
                <div>
                  <label className="text-xs font-mono text-chalk/40 uppercase tracking-widest block mb-2">Date</label>
                  <input type="date" value={scheduleDate}
                    onChange={e => setScheduleDate(e.target.value)}
                    className="input-vintage" required />
                </div>

                <div>
                  <label className="text-xs font-mono text-chalk/40 uppercase tracking-widest block mb-2">
                    5 Players (in order)
                  </label>
                  <div className="space-y-2">
                    {playerIds.map((id, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="font-mono text-xs text-chalk/30 w-4">{i + 1}.</span>
                        <select
                          value={id}
                          onChange={e => {
                            const ids = [...playerIds]
                            ids[i] = e.target.value
                            setPlayerIds(ids)
                          }}
                          className="input-vintage flex-1"
                          required
                        >
                          <option value="">Select player…</option>
                          {players.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                <button type="submit" disabled={saving} className="btn-brass disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save puzzle'}
                </button>
              </form>
            </div>

            {/* Upcoming puzzles */}
            <div>
              <h3 className="font-display text-base text-chalk mb-3">Upcoming Puzzles</h3>
              <div className="card-base overflow-hidden divide-y divide-chalk/5">
                {puzzles.length === 0 && (
                  <p className="text-sm text-chalk/30 text-center py-8">No upcoming puzzles scheduled</p>
                )}
                {puzzles.map(p => (
                  <div key={p.date} className="flex items-center justify-between px-5 py-3">
                    <span className="text-sm font-mono text-chalk/70">
                      {format(new Date(p.date + 'T12:00:00'), 'EEE d MMM yyyy')}
                    </span>
                    <span className="text-xs text-chalk/30 font-mono">{p.player_ids?.length ?? 0} players</span>
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
