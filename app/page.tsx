export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="max-w-2xl text-center">

        <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">
          WilderLeague
        </h1>

        <p className="mt-6 text-2xl text-zinc-300 sm:text-3xl">
          Recast the movie. Make it right.
        </p>

        <p className="mt-4 text-base text-zinc-400 sm:text-lg">
          Have a vision. Pick the actors. Fit the budget.
        </p>

        <section className="mt-16">

          <h2 className="text-2xl font-semibold mb-8">
            Demo Movies
          </h2>

          <div className="flex flex-col gap-4">

            <a
              href="/matrix"
              className="rounded-2xl border border-zinc-700 px-6 py-4 text-lg hover:bg-white/10"
            >
              The Matrix
            </a>

            <a
              href="/apartment"
              className="rounded-2xl border border-zinc-700 px-6 py-4 text-lg hover:bg-white/10"
            >
              The Apartment
            </a>

          </div>

        </section>

      </div>
    </main>
  );
}