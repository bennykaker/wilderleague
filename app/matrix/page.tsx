import CastingBoard from "../components/CastingBoard";
import { getActors } from "../data/actors";
import { getRoles } from "../data/roles";

function popularityToCost(pop: number): number {
  if (pop >= 20) return 12;
  if (pop >= 15) return 10;
  if (pop >= 12) return 8;
  if (pop >= 10) return 6;
  if (pop >= 6) return 4;
  return 3;
}

export default function MatrixPage() {
  const rawActors = getActors();
  const roles = getRoles();

  const actors = rawActors.map((a, i) => ({
    id: String(a.tmdb_id ?? a.name ?? i),
    name: String(a.name ?? ""),
    image: String(a.headshot_url ?? ""),
    popularity: Number(a.popularity) || 0,
    cost: popularityToCost(Number(a.popularity) || 0),
  }));

  return (
    <CastingBoard
      actors={actors}
      roles={roles}
      title="The Matrix Recast"
      budget={100}
    />
  );
}
