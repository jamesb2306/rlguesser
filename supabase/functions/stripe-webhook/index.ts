// supabase/functions/stripe-webhook/index.ts
// Deploy: supabase functions deploy stripe-webhook

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.0.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  if (!signature) return new Response('No signature', { status: 400 })

  const body = await req.text()
  let event: Stripe.Event

  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return new Response('Invalid signature', { status: 400 })
  }

  console.log(`Processing event: ${event.type}`)

  try {
    switch (event.type) {

      // ── Checkout completed → mark user as Pro ──────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const customerId     = session.customer as string
        const subscriptionId = session.subscription as string
        const userId         = session.metadata?.userId

        if (userId) {
          await supabase.from('profiles').update({
            is_pro:                 true,
            stripe_customer_id:     customerId,
            stripe_subscription_id: subscriptionId,
          }).eq('id', userId)
        } else {
          // Fallback: look up by customer email
          const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer
          if (customer.email) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('id')
              .eq('id',
                (await supabase.auth.admin.getUserByEmail(customer.email)).data?.user?.id ?? ''
              )
              .single()
            if (profile) {
              await supabase.from('profiles').update({
                is_pro:                 true,
                stripe_customer_id:     customerId,
                stripe_subscription_id: subscriptionId,
              }).eq('id', profile.id)
            }
          }
        }
        break
      }

      // ── Subscription active / renewed ─────────────────────────────────
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const isPro = sub.status === 'active' || sub.status === 'trialing'
        await supabase.from('profiles')
          .update({ is_pro: isPro })
          .eq('stripe_subscription_id', sub.id)
        break
      }

      // ── Subscription cancelled / payment failed → revoke Pro ──────────
      case 'customer.subscription.deleted':
      case 'invoice.payment_failed': {
        const obj = event.data.object as Stripe.Subscription | Stripe.Invoice
        const subId = 'subscription' in obj ? obj.subscription : obj.id
        await supabase.from('profiles')
          .update({ is_pro: false, stripe_subscription_id: null })
          .eq('stripe_subscription_id', subId)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }
  } catch (err) {
    console.error('Error processing event:', err)
    return new Response('Internal error', { status: 500 })
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  })
})
