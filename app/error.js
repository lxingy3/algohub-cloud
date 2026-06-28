'use client';

export default function ErrorPage({ error, reset }) {
  const digest = error?.digest;

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-6 py-16">
      <section className="w-full max-w-xl rounded-lg border border-amber-200 bg-amber-50 p-6 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">Temporary service issue</p>
        <h1 className="mt-3 text-2xl font-bold text-slate-950">The database is temporarily unavailable.</h1>
        <p className="mt-3 text-sm leading-6 text-slate-700">
          AlgoStories is deployed, but the database provider is currently refusing connections. Please try again after the database quota or connection issue is resolved.
        </p>
        {digest ? <p className="mt-3 text-xs text-slate-500">Error digest: {digest}</p> : null}
        <button
          type="button"
          onClick={reset}
          className="mt-5 min-h-11 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
