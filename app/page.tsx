export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="max-w-2xl text-center">
        <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">
          WilderLeague
        </h1>

        <p className="mt-6 text-xl text-zinc-300 sm:text-2xl">
          Fantasy movie casting leagues.
        </p>

        <p className="mt-4 text-base text-zinc-400 sm:text-lg">
          Draft your dream cast. Compete with friends. Vote on the winner.
        </p>
      </div>
    </main>
  );
}