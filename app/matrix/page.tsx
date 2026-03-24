import CastingBoard from "../components/CastingBoard";
import { getEnrichedActors } from "../data/enrichedActors";
import { getRoles } from "../data/roles";

export default function MatrixPage() {
  const enriched = getEnrichedActors();
  const roles = getRoles();

  const actors = enriched.map(a => ({
    id: a.tmdb_id || a.name,
    name: a.name,
    image: a.headshot_url,
    popularity: a.popularity,
    cost: a.cost,
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
