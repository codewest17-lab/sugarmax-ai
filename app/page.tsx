import Link from "next/link";
import { PLANS } from "@/lib/plans";

const STEPS = [
  {
    n: "1",
    title: "Snap or upload",
    desc: "Capture your meal with your camera or upload a photo from your device.",
  },
  {
    n: "2",
    title: "AI analyzes it",
    desc: "SugarMax AI identifies the foods and estimates portions and nutrition.",
  },
  {
    n: "3",
    title: "Understand your sugar",
    desc: "See estimated sugar and a clean nutritional breakdown in seconds.",
  },
];

const FEATURES = [
  { title: "AI meal scanning", desc: "Identify foods and estimated portions from a single photo." },
  { title: "Sugar analysis", desc: "Estimated sugar levels at a glance, per food and in total." },
  { title: "Nutrition insights", desc: "Calories, carbs, protein, fat, and fiber in one view." },
  { title: "Scan history", desc: "Save analyses and revisit your previous meals anytime." },
];

const FAQS = [
  {
    q: "How accurate are the numbers?",
    a: "Values are AI-generated estimates based on the image, typical portion sizes, and standard food data. They are not medical measurements and can vary with ingredients, preparation, and portion size.",
  },
  {
    q: "Do I need a credit card for the free plan?",
    a: "No. SugarMax Free includes 2 lifetime meal scans with no payment details required.",
  },
  {
    q: "What do I get with SugarMax Pro?",
    a: "Pro unlocks 200 meal scans every month, complete AI analysis, detailed nutrition, premium insights, and priority processing.",
  },
  {
    q: "Is SugarMax a medical tool?",
    a: "No. SugarMax AI is for informational purposes and is not a substitute for professional medical or nutritional advice.",
  },
];

const TESTIMONIALS = [
  { name: "Amara O.", text: "I finally see how much sugar is actually in what I eat. So easy to use." },
  { name: "David K.", text: "Snap a photo and you instantly know. It changed how I order out." },
  { name: "Lena M.", text: "The scan history keeps me honest. Great for staying on track." },
];

export default function LandingPage() {
  return (
    <>
      {/* NAV */}
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2 text-lg font-extrabold text-ink">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-600 text-white">🍬</span>
            SugarMax<span className="text-brand-600">AI</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-ink-muted md:flex">
            <a href="#how" className="hover:text-ink">How it works</a>
            <a href="#features" className="hover:text-ink">Features</a>
            <a href="#pricing" className="hover:text-ink">Pricing</a>
            <a href="#faq" className="hover:text-ink">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn-ghost hidden sm:inline-flex">Sign In</Link>
            <Link href="/signup" className="btn-primary">Get Started</Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-brand-500/15 blur-3xl" />
        <div className="mx-auto max-w-6xl px-4 py-20 text-center md:py-28">
          <span className="chip bg-brand-100 text-brand-700">AI meal intelligence</span>
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl md:text-6xl">
            Scan Your Meal.<br />
            <span className="text-brand-600">Know Your Sugar.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-ink-muted">
            Take a photo of your meal and discover its estimated sugar and nutritional information in seconds — no manual searching, no guesswork.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/onboarding" className="btn-primary px-8 py-4 text-base">Scan Your First Meal</Link>
            <a href="#how" className="btn-secondary px-8 py-4 text-base">See How It Works</a>
          </div>
          <div className="mx-auto mt-14 max-w-3xl overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-soft">
            <img
              src="/demo-meal.svg"
              alt="Example of a meal analysis showing sugar and nutrition"
              className="w-full"
            />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-ink">How SugarMax AI works</h2>
            <p className="mt-3 text-ink-muted">Open → Scan → Analyze → Understand → Track.</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="card p-8">
                <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-brand-100 text-lg font-extrabold text-brand-700">
                  {s.n}
                </div>
                <h3 className="text-lg font-bold text-ink">{s.title}</h3>
                <p className="mt-2 text-sm text-ink-muted">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-ink">Understand every meal</h2>
            <p className="mt-3 text-ink-muted">Everything you need to make sense of what&apos;s on your plate.</p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="card p-6">
                <h3 className="font-bold text-ink">{f.title}</h3>
                <p className="mt-2 text-sm text-ink-muted">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="bg-white py-20">
        <div className="mx-auto max-w-5xl px-4">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-ink">Simple pricing</h2>
            <p className="mt-3 text-ink-muted">Start free. Upgrade when you&apos;re ready.</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {PLANS.map((p) => (
              <div
                key={p.id}
                className={`card relative p-8 ${p.highlighted ? "border-2 border-brand-600" : ""}`}
              >
                {p.highlighted && (
                  <span className="chip absolute -top-3 left-6 bg-brand-600 text-white">Most popular</span>
                )}
                <h3 className="text-lg font-bold text-ink">{p.name}</h3>
                <div className="mt-3 flex items-end gap-1">
                  <span className="text-4xl font-extrabold text-ink">{p.priceLabel}</span>
                  <span className="pb-1 text-sm text-ink-muted">{p.priceSub}</span>
                </div>
                <p className="mt-2 text-sm font-medium text-brand-700">{p.scans} meal scans {p.id === "free" ? "lifetime" : "every month"}</p>
                <ul className="mt-5 space-y-2 text-sm text-ink-muted">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="text-brand-600">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href={p.id === "free" ? "/signup" : "/pricing"} className={`${p.highlighted ? "btn-primary" : "btn-secondary"} mt-6 w-full`}>
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-20">
        <div className="mx-auto max-w-5xl px-4">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-ink">Loved by mindful eaters</h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <figure key={t.name} className="card p-6">
                <div className="text-brand-600">★★★★★</div>
                <blockquote className="mt-3 text-sm text-ink">&ldquo;{t.text}&rdquo;</blockquote>
                <figcaption className="mt-4 text-sm font-semibold text-ink-muted">— {t.name}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-white py-20">
        <div className="mx-auto max-w-3xl px-4">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-ink">Frequently asked questions</h2>
          </div>
          <div className="mt-10 space-y-4">
            {FAQS.map((f) => (
              <details key={f.q} className="card p-6 open:border-brand-200">
                <summary className="cursor-pointer font-semibold text-ink">{f.q}</summary>
                <p className="mt-3 text-sm text-ink-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-extrabold text-ink">Ready to know what&apos;s in your meal?</h2>
          <p className="mt-3 text-ink-muted">Scan your first meal free — no credit card required.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/onboarding" className="btn-primary px-8 py-4 text-base">Scan Your First Meal</Link>
            <Link href="/pricing" className="btn-secondary px-8 py-4 text-base">See Pricing</Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-100 bg-white py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 md:flex-row">
          <div className="flex items-center gap-2 font-bold text-ink">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-600 text-white">🍬</span>
            SugarMax<span className="text-brand-600">AI</span>
          </div>
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-ink-muted">
            <Link href="/privacy" className="hover:text-ink">Privacy</Link>
            <Link href="/terms" className="hover:text-ink">Terms</Link>
            <Link href="/cookies" className="hover:text-ink">Cookies</Link>
            <Link href="/refunds" className="hover:text-ink">Refunds</Link>
            <Link href="/acceptable-use" className="hover:text-ink">Acceptable Use</Link>
            <Link href="/contact" className="hover:text-ink">Contact</Link>
          </nav>
          <p className="text-xs text-ink-muted">© {new Date().getFullYear()} SugarMax AI. Estimates only, not medical advice.</p>
        </div>
      </footer>
    </>
  );
}