"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const movie = {
  title: "The Matrix",
  budget: 90,
  roles: ["Neo", "Trinity", "Morpheus", "Agent Smith"],
};

const actors = [
  {
    name: "Dev Patel",
    cost: 8,
    image: "/test.jpg",
  },
  {
    name: "Jodie Comer",
    cost: 7,
    image: "/test.jpg",
  },
  {
    name: "Mahershala Ali",
    cost: 10,
    image: "/test.jpg",
  },
  {
    name: "Cillian Murphy",
    cost: 9,
    image: "/test.jpg",
  },
  {
    name: "Florence Pugh",
    cost: 10,
    image: "/test.jpg",
  },
  {
    name: "Oscar Isaac",
    cost: 8,
    image: "/test.jpg",
  },
];

type Selections = Record<string, string>;
type SearchTerms = Record<string, string>;

type SharedCast = {
  title: string;
  selections: Selections;
};

function encodeCast(data: SharedCast) {
  return btoa(JSON.stringify(data));
}

function decodeCast(value: string | null): SharedCast | null {
  if (!value) return null;

  try {
    return JSON.parse(atob(value));
  } catch {
    return null;
  }
}

export default function MatrixPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const sharedCast = decodeCast(searchParams.get("cast"));

  const [castTitle, setCastTitle] = useState(
    sharedCast?.title ?? "My Matrix Cast"
  );

  const [selections, setSelections] = useState<Selections>(
    sharedCast?.selections ?? {
      Neo: "",
      Trinity: "",
      Morpheus: "",
      "Agent Smith": "",
    }
  );

  const [searchTerms, setSearchTerms] = useState<SearchTerms>({
    Neo: "",
    Trinity: "",
    Morpheus: "",
    "Agent Smith": "",
  });

  const spent = useMemo(() => {
    return Object.values(selections).reduce((total, actorName) => {
      const actor = actors.find((a) => a.name === actorName);
      return total + (actor?.cost ?? 0);
    }, 0);
  }, [selections]);

  const remaining = movie.budget - spent;
  const overBudget = remaining < 0;
  const allRolesFilled = Object.values(selections).every((value) => value !== "");
  const canPublish = allRolesFilled && !overBudget && castTitle.trim() !== "";
  const isPublishedView = Boolean(sharedCast);

  const percentSpent = Math.min((spent / movie.budget) * 100, 100);

  function handleSelect(role: string, actorName: string) {
    setSelections((prev) => ({
      ...prev,
      [role]: actorName,
    }));
  }

  function handleSearchChange(role: string, term: string) {
    setSearchTerms((prev) => ({
      ...prev,
      [role]: term,
    }));
  }

  function handlePublish() {
    if (!canPublish) return;

    const encoded = encodeCast({
      title: castTitle.trim(),
      selections,
    });

    router.push(`/matrix?cast=${encodeURIComponent(encoded)}`);
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(window.location.href);
    alert("Link copied.");
  }

  return (
    <main className="min-h-screen bg-black px-6 py-12 text-white">
      <div className="mx-auto max-w-3xl">
        <p className="mb-2 text-sm uppercase tracking-[0.2em] text-zinc-400">
          Demo
        </p>

        <h1 className="mb-3 text-5xl font-bold">{movie.title}</h1>
        <p className="mb-8 text-lg text-zinc-300">
          Recast the movie. Make it right.
        </p>

        <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:gap-8">
            <div>
              <p className="text-sm text-zinc-400">Budget</p>
              <p className="text-2xl font-semibold">${movie.budget}M</p>
            </div>

            <div>
              <p className="text-sm text-zinc-400">Spent</p>
              <p className="text-2xl font-semibold">${spent}M</p>
            </div>

            <div>
              <p className="text-sm text-zinc-400">Remaining</p>
              <p
                className={`text-2xl font-semibold ${
                  overBudget ? "text-red-400" : "text-green-400"
                }`}
              >
                ${remaining}M
              </p>
            </div>
          </div>

          <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className={`h-full ${overBudget ? "bg-red-500" : "bg-white"}`}
              style={{ width: `${percentSpent}%` }}
            />
          </div>

          {overBudget && (
            <p className="mt-4 text-sm font-medium text-red-400">
              Over budget. Cut costs before publishing your cast.
            </p>
          )}
        </div>

        {!isPublishedView && (
          <>
            <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
              <label className="mb-2 block text-sm uppercase tracking-[0.15em] text-zinc-400">
                Cast Title
              </label>
              <input
                type="text"
                value={castTitle}
                onChange={(e) => setCastTitle(e.target.value)}
                placeholder="My Matrix Cast"
                className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white placeholder:text-zinc-500"
              />
            </div>

            <div className="space-y-6">
              {movie.roles.map((role) => {
                const selectedActorsForOtherRoles = Object.entries(selections)
                  .filter(([otherRole, actorName]) => otherRole !== role && actorName)
                  .map(([, actorName]) => actorName);

                const selectedActor = actors.find((a) => a.name === selections[role]);

                const filteredActors = actors.filter((actor) =>
                  actor.name.toLowerCase().includes(searchTerms[role].toLowerCase())
                );

                return (
                  <div
                    key={role}
                    className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5"
                  >
                    <h2 className="mb-2 text-xl font-semibold">{role}</h2>

                    <input
                      type="text"
                      value={searchTerms[role]}
                      onChange={(e) => handleSearchChange(role, e.target.value)}
                      placeholder="Search actors"
                      className="mb-3 w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white placeholder:text-zinc-500"
                    />

                    <select
                      value={selections[role]}
                      onChange={(e) => handleSelect(role, e.target.value)}
                      className="w-full rounded-xl border border-zinc-700 bg-black px-3 py-2 text-white"
                    >
                      <option value="">Select actor</option>

                      {filteredActors.map((actor) => {
                        const isUsedElsewhere =
                          selectedActorsForOtherRoles.includes(actor.name);

                        return (
                          <option
                            key={actor.name}
                            value={actor.name}
                            disabled={isUsedElsewhere}
                          >
                            {actor.name} (${actor.cost}M)
                          </option>
                        );
                      })}
                    </select>

                    {selectedActor && (
                      <div className="mt-4 flex items-center gap-4">
                        <img
                          src={selectedActor.image}
                          className="h-14 w-14 rounded-full object-cover"
                        />

                        <div>
                          <p className="font-medium">{selectedActor.name}</p>
                          <p className="text-sm text-zinc-400">
                            ${selectedActor.cost}M
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-10">
              <button
                onClick={handlePublish}
                disabled={!canPublish}
                className={`rounded-2xl px-6 py-3 font-medium ${
                  canPublish
                    ? "bg-white text-black hover:opacity-90"
                    : "cursor-not-allowed bg-zinc-800 text-zinc-500"
                }`}
              >
                Publish Cast
              </button>

              {castTitle.trim() === "" && (
                <p className="mt-3 text-sm text-zinc-500">
                  Give your cast a title to publish.
                </p>
              )}

              {!allRolesFilled && castTitle.trim() !== "" && (
                <p className="mt-3 text-sm text-zinc-500">
                  Fill every role to publish.
                </p>
              )}
            </div>
          </>
        )}

        {isPublishedView && (
          <section className="mt-12 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950">
            <div className="border-b border-zinc-800 bg-gradient-to-b from-zinc-900 to-black px-6 py-8">
              <p className="text-sm uppercase tracking-[0.2em] text-zinc-400">
                Published Cast
              </p>
              <h2 className="mt-3 text-4xl font-bold">{castTitle}</h2>
              <p className="mt-2 text-zinc-400">{movie.title}</p>
            </div>

            <div className="px-6 py-6">
              <div className="space-y-4">
                {movie.roles.map((role) => {
                  const actorName = selections[role];
                  const actor = actors.find((a) => a.name === actorName);

                  return (
                    <div
                      key={role}
                      className="rounded-2xl border border-zinc-800 bg-black/40 px-4 py-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm uppercase tracking-wide text-zinc-400">
                          {role}
                        </span>
                        <span className="text-lg font-medium text-white">
                          {actorName}
                        </span>
                      </div>

                      {actor && (
                        <div className="mt-2 flex justify-end">
                          <span className="text-sm text-zinc-500">
                            ${actor.cost}M
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 rounded-2xl border border-zinc-800 bg-black/40 px-4 py-4">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Budget Used</span>
                  <span className="font-medium text-white">
                    ${spent}M / ${movie.budget}M
                  </span>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={handleCopyLink}
                  className="rounded-2xl bg-white px-6 py-3 font-medium text-black hover:opacity-90"
                >
                  Copy Link
                </button>

                <button
                  onClick={() => router.push("/matrix")}
                  className="rounded-2xl border border-zinc-700 px-6 py-3 font-medium text-white hover:bg-white/10"
                >
                  Build Another
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}