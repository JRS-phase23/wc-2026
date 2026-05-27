# WC 2026 Pick'em — Setup Guide

## Stack
- **Next.js 16** (App Router, Turbopack)
- **Supabase** (Postgres + Auth + Row-Level Security)
- **Vercel** (hosting)
- **Recharts** (charts)

---

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New project
2. Note your **Project URL** and **anon public** API key (Settings → API)

---

## 2. Run the database migrations

In the Supabase dashboard → **SQL Editor**, run these two files **in order**:

1. `supabase/migrations/001_schema.sql` — creates all tables, RLS policies, and triggers
2. `supabase/migrations/002_seed_data.sql` — seeds all 48 teams and 104 matches

---

## 3. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in your values:

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

---

## 4. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 5. Deploy to Vercel

```bash
npx vercel
```

Add the two environment variables in Vercel → Project Settings → Environment Variables.

---

## How it works

### Creating a competition
1. Sign up with your email and a **team name** (your identity in all competitions)
2. Click **New competition** on the dashboard → give it a name
3. Share the **6-character join code** with friends

### Making picks
- Navigate to **My Picks** inside a competition
- Group stage picks lock at the **first kickoff on June 11, 2026**
- Each knockout round locks when that round starts
- Picks auto-save on blur — green checkmark = saved

### Entering results (Admin only)
- Go to **Admin Panel** → **Enter Results**
- Enter the final score for each completed match
- For knockout matches: optionally mark extra time / penalties
- Results trigger leaderboard recalculation instantly

### Scoring
| Category | Points |
|---|---|
| Correct result (W/D/L) | 5 |
| Correct goal difference | 5 |
| Exact scoreline | 10 |
| Close prediction (4+ goals, off by ≤1 each) | 3 |
| Correct team advancing (knockout) | 10 |
| Final / 3rd place winner | 10 |

Maximum per group match: **20 pts** · Maximum per knockout match: **30 pts**

---

## Tournament overview
- **12 groups** (A–L), 4 teams each = **48 teams**
- **104 total matches**: 72 group + 16 (R32) + 8 (R16) + 4 (QF) + 2 (SF) + 1 (3rd) + 1 (Final)
- Tournament runs **June 11 – July 19, 2026**
