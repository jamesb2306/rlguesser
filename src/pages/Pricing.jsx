import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/AuthContext'
import { getStripe } from '@/lib/stripe'
import { supabase } from '@/lib/supabase'

const FEATURES_FREE = [
  'Daily challenge (5 players)',
  'Progressive clue reveal',
  'Share your result',
]

const FEATURES_PRO = [
  'Everything in Free',
  'Scores saved to your profile',
  'Global leaderboard',
  'Full puzzle archive',
  'Streak tracking',
  'Detailed stats &amp; history',
]

export default function Pricing() {
  const { user, isPro } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  async function handleCheckout() {
    if (!user) { navigate('/auth'); return }
    setLoading(true)
    setError(null)

    try {
      // Create a Stripe Checkout session via Supabase Edge Function
      const { data, error: fnError } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceId:   import.meta.env.VITE_STRIPE_PRO_PRICE_ID,
          successUrl: `${window.location.origin}/profile?upgraded=true`,
          cancelUrl:  `${window.location.origin}/pricing`,
        }
      })

      if (fnError) throw fnError

      const stripe = await getStripe()
      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId: data.sessionId
      })
      if (stripeError) throw stripeError
    } catch (err) {
      setError(err.message ?? 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleManage() {
    setLoading(true)
    const { data, error: fnError } = await supabase.functions.invoke('customer-portal', {
      body: { returnUrl: `${window.location.origin}/profile` }
    })
    if (fnError) { setError(fnError.message); setLoading(false); return }
    window.location.href = data.url
  }

  return (
    <main className="min-h-screen py-16 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-xs font-mono tracking-widest text-mud/60 uppercase mb-3">Pricing</p>
          <h1 className="font-display font-black text-4xl text-chalk mb-4">
            Simple, fair pricing
          </h1>
          <p className="text-chalk/50 max-w-md mx-auto">
            The daily challenge is free, forever. Go Pro to save your scores and compete on the leaderboard.
          </p>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Free */}
          <div className="card-base p-7">
            <div className="mb-6">
              <p className="font-mono text-xs tracking-widest text-chalk/40 uppercase mb-2">Free</p>
              <div className="flex items-end gap-2">
                <span className="font-display text-5xl font-black text-chalk">£0</span>
                <span className="text-chalk/40 mb-1 text-sm">/ month</span>
              </div>
              <p className="text-sm text-chalk/50 mt-2">No account needed</p>
            </div>

            <ul className="space-y-2.5 mb-8">
              {FEATURES_FREE.map(f => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-chalk/70">
                  <span className="text-green-400 text-xs">✓</span>
                  <span dangerouslySetInnerHTML={{ __html: f }} />
                </li>
              ))}
            </ul>

            <div className="btn-ghost w-full text-center py-2.5 rounded cursor-default opacity-60 border border-chalk/10 text-sm">
              Current plan
            </div>
          </div>

          {/* Pro */}
          <div className="relative card-base p-7 overflow-visible"
            style={{ border: '1px solid rgba(200,169,110,0.35)', background: 'linear-gradient(145deg, #1e3322, #0d1f12)' }}>
            {/* Badge */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="badge-pro px-3 py-1 text-xs shadow-lg">★ Most Popular</span>
            </div>

            <div className="mb-6">
              <p className="font-mono text-xs tracking-widest text-mud/70 uppercase mb-2">Pro</p>
              <div className="flex items-end gap-2">
                <span className="font-display text-5xl font-black text-chalk">£3</span>
                <span className="text-chalk/40 mb-1 text-sm">/ month</span>
              </div>
              <p className="text-sm text-chalk/50 mt-2">Billed monthly, cancel anytime</p>
            </div>

            <ul className="space-y-2.5 mb-8">
              {FEATURES_PRO.map(f => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-chalk/80">
                  <span className="text-mud text-xs">★</span>
                  <span dangerouslySetInnerHTML={{ __html: f }} />
                </li>
              ))}
            </ul>

            {error && <p className="text-xs text-red-400 font-mono mb-3">{error}</p>}

            {isPro ? (
              <div className="space-y-2">
                <div className="btn-brass w-full text-center py-2.5 rounded cursor-default opacity-70 text-sm">
                  ✓ You're on Pro
                </div>
                <button onClick={handleManage} disabled={loading}
                  className="btn-ghost w-full text-xs">
                  Manage subscription
                </button>
              </div>
            ) : (
              <button onClick={handleCheckout} disabled={loading}
                className="btn-brass w-full disabled:opacity-50">
                {loading ? 'Loading…' : 'Get Pro'}
              </button>
            )}
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-14 max-w-xl mx-auto space-y-6">
          <h2 className="font-display text-xl text-chalk text-center mb-6">Questions</h2>
          {[
            ['Can I cancel anytime?', 'Yes. Cancel from your profile page and you keep Pro access until the end of your billing period.'],
            ['Is the daily challenge really free?', 'Yes, always. The daily challenge of 5 players will always be free, no account required.'],
            ['What's in the archive?', 'Every past daily puzzle, playable whenever you like. Pro subscribers can play any date.'],
          ].map(([q, a]) => (
            <div key={q}>
              <p className="text-sm font-medium text-chalk mb-1">{q}</p>
              <p className="text-sm text-chalk/50">{a}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
