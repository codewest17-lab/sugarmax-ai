# SugarMax AI

Plain HTML/CSS/JavaScript frontend for the SugarMax AI Supabase project.

## Setup
1. Open `app.js`.
2. Replace `REPLACE_WITH_YOUR_SUPABASE_PUBLISHABLE_KEY` with the project's publishable key.
3. Do not put a Supabase service-role key, Gemini key, or Paystack secret key in this frontend.
4. Configure Google and Apple providers plus the site/redirect URL in Supabase Auth.
5. Configure Edge Function secrets for Gemini and Paystack.

The Google button follows Google's current branding guidance: standard Google G, white button, clear "Continue with Google" action. See Google's official branding guidance.

## Backend
The frontend calls:
- `analyze-food-v2`
- `initialize-payment`

Food image caching is handled server-side by the analysis function so repeated identical images can reuse prior analysis without another Gemini request.
