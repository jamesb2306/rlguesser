// supabase/functions/wiki-proxy/index.ts
// Fetches Wikipedia pages server-side, bypassing CORS
// Deploy: supabase functions deploy wiki-proxy

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { title } = await req.json()
    if (!title) return new Response(JSON.stringify({ error: 'No title provided' }), { status: 400, headers: corsHeaders })

    // Fetch the full rendered Wikipedia page HTML
    const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=text|wikitext&format=json&redirects=true`
    const res  = await fetch(url, {
      headers: { 'User-Agent': 'RLGuesser/1.0 (https://rlguesser.com)' }
    })
    const data = await res.json()

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
