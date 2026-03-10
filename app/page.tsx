import { getRoles } from "./data/loadData";
import MovieSearch from "./components/MovieSearch";

export default function HomePage() {
  const roles = getRoles();

  const moviesRoles: Record<string, number> = {};

  roles.forEach((r: any) => {
    moviesRoles[r.project_title] =
      (moviesRoles[r.project_title] || 0) + 1;
  });

  const movies = Object.keys(moviesRoles).sort();

  return (
    <div style={{ padding: "2rem", maxWidth: "900px", margin: "0 auto" }}>
      <h1>Wilderleague</h1>

      <MovieSearch movies={movies} moviesRoles={moviesRoles} />
    </div>
  );
}