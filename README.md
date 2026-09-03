# SugarMax AI — Setup Guide

Your Supabase backend is already **live** — schema, RLS policies, storage bucket, and all 3 edge functions are deployed to project `wobroovxjugckroijuse` ("SugarMax Ai"). This guide covers the two things only you can do: add your API secrets, and put the frontend online.

## 1. Add your API secrets (required before scanning/payments work)

Go to your Supabase dashboard → this project → **Edge Functions → Secrets**, and add:

| Secret name | Where to get it |
|---|---|
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) |
| `PAYSTACK_SECRET_KEY` | Paystack Dashboard → Settings → API Keys & Webhooks (use the **secret** key, starts with `sk_`) |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically to edge functions — you don't need to set those.

## 2. Add your Paystack public key to the frontend

Open `js/supabase-client.js` and replace:
```js
const PAYSTACK_PUBLIC_KEY = "pk_test_REPLACE_WITH_YOUR_PAYSTACK_PUBLIC_KEY";
```
with your real public key (starts with `pk_`), from the same Paystack API Keys page.

## 3. (Optional) Enable Google / Apple sign-in

The auth page has working buttons for both, but they require you to configure the providers:
- Supabase Dashboard → Authentication → Providers → enable **Google** and **Apple**, following Supabase's provider setup docs for each (you'll need OAuth credentials from Google Cloud Console / Apple Developer).
- If you don't set these up yet, email/password signup still works fully — the OAuth buttons will just show a provider error until configured.

## 4. Make yourself an admin

To see `/admin/index.html`, run this once in the Supabase SQL Editor (replace with your email):
```sql
update public.profiles set is_admin = true where email = 'you@example.com';
```

## 5. Deploy the frontend

This is a static site (plain HTML/CSS/JS) — no build step. Deploy the whole folder to any static host:
- **Netlify / Vercel**: drag-and-drop the folder, or connect a git repo
- **Supabase Storage / GitHub Pages**: also work fine

Just make sure the folder structure stays intact (`js/`, `css/`, `legal/`, `admin/` alongside the root HTML files).

## 6. Test the flow

1. Visit `index.html` → sign up → complete onboarding
2. Upload a meal photo on the Scan page — this calls Gemini live, so it only works once `GEMINI_API_KEY` is set
3. Use up your 2 free scans, then try Upgrade to Pro — this calls Paystack live, so it only works once your Paystack keys are set (use Paystack's test card numbers in test mode)
4. Check `/admin/` after granting yourself admin access

## What's already live in Supabase (no action needed)

- **Tables**: profiles, subscriptions, scans, payments, usage_tracking, security_logs — all with row-level security
- **Storage**: private `meal-images` bucket, scoped per user
- **Auto-provisioning**: new signups automatically get a profile + free subscription (2 scans) via a database trigger
- **Edge functions**: `analyze-meal`, `paystack-init`, `paystack-verify` — all deployed and active
- **Safety**: scans are only deducted after a successful, saved AI result; payments are verified server-side and idempotent (safe to double-call)
