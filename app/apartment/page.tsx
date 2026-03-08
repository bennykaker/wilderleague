 "use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const movie = {
  title: "The Apartment",
  budget: 35,
  roles: ["C.C. Baxter", "Fran Kubelik", "Jeff D. Sheldrake", "Dr. Dreyfuss"],
};

const actors = [
  { name: "Paul Mescal", cost: 8, image: "/test.jpg" },
  { name: "Daisy Edgar-Jones", cost: 7, image: "/test.jpg" },
  { name: "Jon Hamm", cost: 6, image: "/test.jpg" },
  { name: "John Turturro", cost: 4, image: "/test.jpg" },
  { name: "Glen Powell", cost: 9, image: "/test.jpg" },
  { name: "Jodie Comer", cost: 8, image: "/test.jpg" },
  { name: "Bryan Cranston", cost: 7, image: "/test.jpg" },
  { name: "Mark Ruffalo", cost: 8, image: "/test.jpg" },
  { name: "Carey Mulligan", cost: 7, image: "/test.jpg" },
  { name: "Sterling K. Brown", cost: 6, image: "/test.jpg" },
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

export default function ApartmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const sharedCast = decodeCast(searchParams.get("cast"));

  const [castTitle, setCastTitle] = useState(
    sharedCast?.title ?? "My Apartment Cast"
  );

  const [selections, setSelections] = useState<Selections>(
    sharedCast?.selections ?? {
      "C.C. Baxter": "",
      "Fran Kubelik": "",
      "Jeff D. Sheldrake": "",
      "Dr. Dreyfuss": "",
    }
  );

  const [searchTerms, setSearchTerms] = useState<SearchTerms>({
    "C.C. Baxter": "",
    "Fran Kubelik": "",
    "Jeff D. Sheldrake": "",
    "Dr. Dreyfuss": "",
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

    router.push(`/apartment?cast=${encodeURIComponent(encoded)}`);
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

        {/* Budget */}
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

        </div>

        {!isPublishedView && (

          <>
            {/* Cast Title */}
            <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">

              <label className="mb-2 block text-sm uppercase tracking-[0.15em] text-zinc-400">
                Cast Title
              </label>

              <input
                type="text"
                value={castTitle}
                onChange={(e) => setCastTitle(e.target.value)}
                placeholder="My Apartment Cast"
                className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white"
              />

            </div>

            {/* Roles */}
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
                      className="mb-3 w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white"
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

            {/* Publish */}
            <div className="mt-10">

              <button
                onClick={handlePublish}
                disabled={!canPublish}
                className={`rounded-2xl px-6 py-3 font-medium ${
                  canPublish
                    ? "bg-white text-black"
                    : "cursor-not-allowed bg-zinc-800 text-zinc-500"
                }`}
              >
                Publish Cast
              </button>

            </div>

          </>
        )}

        {isPublishedView && (

          <section className="mt-12 rounded-3xl border border-zinc-800 bg-zinc-950 p-6">

            <h2 className="text-3xl font-bold mb-4">{castTitle}</h2>
            <p className="text-zinc-400 mb-6">{movie.title}</p>

            <div className="space-y-4">

              {movie.roles.map((role) => {

                const actorName = selections[role];
                const actor = actors.find((a) => a.name === actorName);

                return (

                  <div
                    key={role}
                    className="flex items-center justify-between border border-zinc-800 rounded-xl p-4"
                  >

                    <span className="text-zinc-400">{role}</span>
                    <span className="font-medium">{actorName}</span>

                    {actor && (
                      <span className="text-sm text-zinc-500">
                        ${actor.cost}M
                      </span>
                    )}

                  </div>
                );
              })}

            </div>

            <div className="mt-6">

              <button
                onClick={handleCopyLink}
                className="rounded-2xl bg-white px-6 py-3 text-black"
              >
                Copy Link
              </button>

            </div>

          </section>

        )}

      </div>
    </main>
  );
}