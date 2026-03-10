import { getRoles } from "./data/loadData";
import MovieSearch from "./components/MovieSearch";

export default function HomePage() {
  const roles = getRoles();

  const movies = Array.from(
    new Set(roles.map((r: any) => r.project_title))
  ).sort();

  return (
    <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <h1>Wilderleague</h1>
      <p>Choose a movie to cast:</p>

      <MovieSearch movies={movies} />
    </div>
  );
}