// Plan / pricing configuration for SugarMax AI.

export const FREE_LIFETIME_SCANS = 2;
export const PRO_SCANS_PER_MONTH = 200;
export const PRO_PRICE_MONTHLY = 9.99; // USD
export const PRO_PRICE_KW = 9.99; // display fallback

export const PLANS = [
  {
    id: "free",
    name: "SugarMax Free",
    priceLabel: "$0",
    priceSub: "forever",
    scans: FREE_LIFETIME_SCANS,
    features: [
      "2 lifetime meal scans",
      "Basic AI meal analysis",
      "Estimated sugar information",
      "Basic nutritional info",
      "Meal result history",
    ],
    cta: "Get Started",
    highlighted: false,
  },
  {
    id: "pro",
    name: "SugarMax Pro",
    priceLabel: "$9.99",
    priceSub: "per month",
    scans: PRO_SCANS_PER_MONTH,
    features: [
      "200 meal scans every month",
      "Complete AI meal analysis",
      "Estimated sugar breakdown",
      "Detailed nutritional info",
      "Meal history",
      "Premium insights",
      "Priority processing",
    ],
    cta: "Upgrade to Pro",
    highlighted: true,
  },
] as const;