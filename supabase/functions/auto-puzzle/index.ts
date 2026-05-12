// supabase/functions/auto-puzzle/index.ts
// Scheduled daily at 00:00 UTC via Supabase cron
// Deploy: supabase functions deploy auto-puzzle

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

serve(async (req) => {
  // Allow manual trigger via POST with a date, or default to tomorrow
  let targetDate: string

  if (req.method === 'POST') {
    try {
      const body = await req.json()
      targetDate = body.date ?? getTomorrow()
    } catch {
      targetDate = getTomorrow()
    }
  } else {
    targetDate = getTomorrow()
  }

  try {
    // Check if puzzle already exists for this date
    const { data: existing } = await supabase
      .from('daily_puzzles')
      .select('id')
      .eq('date', targetDate)
      .single()

    if (existing) {
      return json({ message: `Puzzle for ${targetDate} already exists.` })
    }

    // Get players used in last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const cutoff = thirtyDaysAgo.toISOString().split('T')[0]

    const { data: recentHistory } = await supabase
      .from('puzzle_history')
      .select('player_id')
      .gte('used_date', cutoff)

    const recentIds = (recentHistory ?? []).map(r => r.player_id)

    // Get all eligible players (not used in last 30 days)
    let query = supabase
      .from('players')
      .select('id')

    if (recentIds.length > 0) {
      query = query.not('id', 'in', `(${recentIds.join(',')})`)
    }

    const { data: eligible, error: eligibleErr } = await query

    if (eligibleErr) throw eligibleErr

    if (!eligible || eligible.length < 5) {
      // Not enough fresh players — reset and use all players
      console.log('Not enough fresh players, resetting pool...')
      const { data: allPlayers } = await supabase
        .from('players')
        .select('id')

      if (!allPlayers || allPlayers.length < 5) {
        return json({ error: 'Not enough players in database (need at least 5).' }, 400)
      }

      const picked = shuffle(allPlayers).slice(0, 5).map(p => p.id)
      await createPuzzle(targetDate, picked)
      return json({ message: `Puzzle created for ${targetDate} (pool reset).`, player_ids: picked })
    }

    // Pick 5 random from eligible
    const picked = shuffle(eligible).slice(0, 5).map(p => p.id)
    await createPuzzle(targetDate, picked)

    return json({ message: `Puzzle created for ${targetDate}.`, player_ids: picked })

  } catch (err) {
    console.error('auto-puzzle error:', err)
    return json({ error: err.message }, 500)
  }
})

async function createPuzzle(date: string, playerIds: string[]) {
  // Insert puzzle
  await supabase.from('daily_puzzles').insert({
    date,
    player_ids: playerIds,
  })

  // Record in history
  const historyRows = playerIds.map(id => ({ player_id: id, used_date: date }))
  await supabase.from('puzzle_history').insert(historyRows)
}

function getTomorrow(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
