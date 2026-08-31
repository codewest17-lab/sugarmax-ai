# SugarMax AI 🍬

**Scan your meal. Know your sugar.**

An AI-powered meal intelligence SaaS. Take or upload a photo of a meal and SugarMax AI estimates its sugar content and nutritional breakdown using Google Gemini, backed by Supabase (auth + Postgres + Row-Level Security) and Paystack (Pro subscriptions).

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14 (App Router) + React + TypeScript + Tailwind |
| Backend | Next.js API routes (server-only secrets) |
| Database & Auth | Supabase (Postgres, RLS, email/Google/Apple auth) |
| AI analysis | Google Gemini (routed through the backend) |
| Payments | Paystack subscriptions + webhooks (server-verified) |

## Architecture & security

- **Gemini & Paystack keys and the Supabase service-role key are server-only** — never reach the browser.
- **Row-Level Security** on every table: users can only see their own data.
- **Atomic scan consumption** via a Postgres function (`consume_scan`) so concurrent requests can't exceed the allowance.
- **Idempotent payments** via `transaction_locks` keyed on unique references; Pro is granted only after **independent server-side verification** (never a client "success" message).
- **Webhooks** are signature-verified (HMAC-SHA512) and processed once.
- Audit logging for account, auth, scan, and payment events.

## Project structure

```
sugarmax/
├── app/
│   ├── page.tsx            Landing page
│   ├── onboarding/         Pre-auth onboarding flow
│   ├── login|signup|forgot|reset|verify  # Auth
│   ├── dashboard/          Main dashboard
│   ├── scan/               Meal scanner (camera/upload)
│   ├── meals/              History + results
│   ├── pricing/  account/  admin/        # Billing, account, admin
│   ├── privacy|terms|cookies|refunds|acceptable-use|data-deletion|contact|about/
│   └── api/                # scan, pay, webhook, subscription, admin, account
├── lib/
│   ├── supabase/           client (browser), server, admin (service role)
│   ├── gemini.ts           AI analysis + structured parsing
│   ├── paystack.ts         init/verify/webhook-signature
│   ├── plans.ts, nutrition.ts, validation.ts
├── supabase/schema.sql     # Full schema + RLS + functions
└── components/
```

## Setup

### 1. Prerequisites
- Node 18+
- A Supabase project
- A Paystack account (for live payments)
- A Google Gemini API key

### 2. Environment variables
Copy `.env.example` to `.env.local` and fill in:

| Variable | Where to find |
|----------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API (anon key) |
| `SUPABASE_URL` | Same as above (server) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API (service_role, server-only) |
| `GEMINI_API_KEY` | Google AI Studio |
| `PAYSTACK_SECRET_KEY` | Paystack dashboard |
| `NEXT_PUBLIC_APP_URL` | Your deployed URL |

### 3. Database
1. Open **Supabase → SQL Editor**.
2. Run the entire `supabase/schema.sql`.
3. Optionally re-generate types: `npx supabase gen types typescript > lib/database.types.ts`.

### 4. Auth providers (Supabase → Auth → Providers)
- Enable **Email** (optionally disable "Confirm email" during dev).
- Enable **Google** with your OAuth client ID/secret.
- Enable **Apple** (requires an Apple developer account for production).

### 5. Run locally
```bash
npm install
npm run dev
```

### 6. Paystack webhook
In Paystack → Settings → Webhooks, add your deployed URL:
```
https://your-domain.com/api/webhook/paystack
```

### 7. Grant yourself admin
```sql
insert into public.admins (user_id, role)
values ('<your-auth-user-uuid>', 'admin');
```
Then visit `/admin`.

---

## Product rules implemented
- Free = 2 lifetime scans. Pro = 200 scans/month, resets on renewal.
- A scan is deducted **only** on a successful analysis; failures never consume a scan.
- Meal images/history are private per user (RLS + server-enforced ownership).
- Account deletion removes all associated data.

## Disclaimer
All nutritional values are **AI-generated estimates** and are not medical measurements or advice.

---

Built from the SugarMax AI product requirements document.