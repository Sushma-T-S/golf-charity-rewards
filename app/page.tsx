export default function Home() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-6xl flex-col gap-10 px-6 py-12">
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-8 py-14 text-white shadow-xl">
        <div className="max-w-3xl">
          <p className="text-sm uppercase tracking-[0.25em] text-slate-300">Golf meets charity</p>
          <h1 className="mt-6 text-5xl font-semibold leading-tight">
            Subscription-driven golf performance, monthly prize draws, and charity impact.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-slate-300">
            Enter your Stableford scores, support a featured charity, and participate in monthly draws for cash rewards. Designed for emotional engagement, not traditional golf clichés.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <a href="/signup" className="rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300">
              Subscribe Now
            </a>
            <a href="/charities" className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:border-white">
              Browse Charities
            </a>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Score Tracking</h2>
          <p className="mt-3 text-slate-600">
            Add your latest Stableford scores with one entry per date and keep only the most recent five results automatically.
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Prize Draws</h2>
          <p className="mt-3 text-slate-600">
            Monthly draws, ranked payouts for 3/4/5 matches, and rollover jackpots when no top winner is found.
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Charity Impact</h2>
          <p className="mt-3 text-slate-600">
            Choose a charity at signup and donate part of your subscription. Spotlight charities and donation tracking are built in.
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl bg-slate-950 p-8 text-white shadow-xl">
          <h3 className="text-2xl font-semibold">How it works</h3>
          <ul className="mt-6 space-y-4 text-slate-300">
            <li>• Subscribe monthly or yearly to unlock scores, draws, and charity contributions.</li>
            <li>• Submit new scores in Stableford format and track your progress.</li>
            <li>• Enter the monthly draw and win prizes through match tiers.</li>
          </ul>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h3 className="text-2xl font-semibold">Quick links</h3>
          <div className="mt-6 grid gap-3">
            <a href="/dashboard" className="rounded-2xl bg-slate-950 px-5 py-4 text-white transition hover:bg-slate-800">Dashboard</a>
            <a href="/scores" className="rounded-2xl bg-slate-100 px-5 py-4 text-slate-900 transition hover:bg-slate-200">Score entry</a>
            <a href="/draws" className="rounded-2xl bg-slate-100 px-5 py-4 text-slate-900 transition hover:bg-slate-200">Monthly draws</a>
          </div>
        </div>
      </section>
    </div>
  );
}
