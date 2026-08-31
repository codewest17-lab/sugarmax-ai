# SugarMax AI

Static, mobile-responsive SugarMax AI frontend using HTML, CSS and JavaScript.

## Backend integration
- Supabase Auth: email/password, Google OAuth and Apple OAuth.
- Food analysis: Supabase Edge Function `analyze-food-v2`.
- Paystack initialization: Supabase Edge Function `initialize-payment`.
- Food caching is handled by the backend/analysis function; cached results are surfaced in the UI.

## Security
Only the Supabase publishable key belongs in this frontend. Gemini and Paystack secret keys must remain in Supabase Edge Function secrets.

## Deployment
Upload these files to Netlify or deploy the repository connected to GitHub.
