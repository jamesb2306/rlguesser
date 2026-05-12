# RLGuesser — Setup Guide

## Stack
- **React** (Vite) — frontend
- **Supabase** — database, auth, storage, edge functions
- **Stripe** — subscriptions
- **Netlify** — hosting + CI/CD

---

## 1. Supabase Setup

### Create project
1. Go to [supabase.com](https://supabase.com) → New project
2. Name it `rlguesser`, pick a region close to your users (UK → `eu-west-2`)
3. Save the database password

### Run schema
1. Supabase Dashboard → **SQL Editor** → New query
2. Paste the full contents of `supabase/migrations/001_schema.sql`
3. Run it
4. Then set your admin email:
   ```sql
   alter database postgres set app.admin_emails = 'your@email.com';
   ```

### Enable Google Auth (optional)
1. Supabase Dashboard → **Authentication** → Providers → Google
2. Add your Google OAuth Client ID + Secret
3. Add `https://rlguesser.com` to allowed redirect URLs

### Get your keys
From Supabase Dashboard → **Settings** → API:
- `VITE_SUPABASE_URL` = Project URL
- `VITE_SUPABASE_ANON_KEY` = anon/public key

---

## 2. Stripe Setup

### Create products
1. [Stripe Dashboard](https://dashboard.stripe.com) → Products → Add product
   - Name: `RLGuesser Pro`
   - Price: £3.00 / month (recurring)
2. Copy the **Price ID** → `VITE_STRIPE_PRO_PRICE_ID`
3. Copy the **Publishable key** → `VITE_STRIPE_PUBLISHABLE_KEY`
4. Copy the **Secret key** → `STRIPE_SECRET_KEY` (for Edge Functions)

### Set up Customer Portal
1. Stripe Dashboard → **Billing** → Customer portal → Activate
2. Enable: cancel subscriptions, update payment methods

---

## 3. Deploy Edge Functions

Install Supabase CLI:
```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

Set secrets for the functions:
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set SUPABASE_URL=https://YOUR_PROJECT.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Deploy all three functions:
```bash
supabase functions deploy stripe-webhook
supabase functions deploy create-checkout
supabase functions deploy customer-portal
```

### Set Stripe webhook
1. Stripe Dashboard → **Developers** → Webhooks → Add endpoint
2. URL: `https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook`
3. Events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copy **Signing secret** → `supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...`

---

## 4. Local development

```bash
# Clone / open project
cd rlguesser

# Install dependencies
npm install

# Copy env file
cp .env.example .env
# Fill in your VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_STRIPE_*

# Start dev server
npm run dev
```

---

## 5. Deploy to Netlify

Your site is already on Netlify at `rlguesser.com`. To connect this new repo:

1. Netlify Dashboard → **Sites** → rlguesser → **Site configuration** → Build & deploy
2. Connect your GitHub repo (push this code to GitHub first)
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Add environment variables (Site settings → Environment variables):
   ```
   VITE_SUPABASE_URL
   VITE_SUPABASE_ANON_KEY
   VITE_STRIPE_PUBLISHABLE_KEY
   VITE_STRIPE_PRO_PRICE_ID
   VITE_ADMIN_EMAILS=your@email.com
   ```
6. Trigger a deploy

---

## 6. Admin panel

Go to `rlguesser.com/admin` — only accessible with your admin email.

**Add players:**
- Fill in name, position, nation, shirt number
- Add career clubs (name, year range, appearances)
- Upload a player photo

**Schedule puzzles:**
- Pick a date
- Select 5 players in order
- Save

---

## 7. File structure

```
src/
├── components/
│   ├── game/
│   │   ├── PlayerCard.jsx      ← The main card with clues
│   │   ├── ClueTabs.jsx        ← Clubs / Nation / Position / Photo tabs
│   │   ├── GuessInput.jsx      ← Autocomplete input
│   │   ├── ProgressBar.jsx     ← Player 1 of 5 pips
│   │   └── ScoreSummary.jsx    ← End-of-game result
│   └── layout/
│       └── Navbar.jsx
├── hooks/
│   └── useGame.js              ← All game logic
├── lib/
│   ├── supabase.js             ← Supabase client
│   ├── stripe.js               ← Stripe.js loader
│   └── AuthContext.jsx         ← Auth state + helpers
├── pages/
│   ├── Home.jsx                ← Daily game
│   ├── Auth.jsx                ← Sign in / sign up
│   ├── Pricing.jsx             ← Free vs Pro
│   ├── Leaderboard.jsx         ← Today's top scores (Pro)
│   ├── Profile.jsx             ← Stats + history
│   ├── Archive.jsx             ← Past puzzles (Pro)
│   └── Admin.jsx               ← Add players, schedule puzzles
└── styles/
    └── globals.css             ← Vintage design system
supabase/
├── migrations/
│   └── 001_schema.sql          ← Full DB schema + RLS
└── functions/
    ├── stripe-webhook/         ← Handles Stripe events
    ├── create-checkout/        ← Creates Stripe Checkout session
    └── customer-portal/        ← Opens Stripe billing portal
```
