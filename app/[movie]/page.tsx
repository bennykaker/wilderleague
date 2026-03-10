import { notFound } from "next/navigation";
import { getActors, getRoles } from "../data/loadData";
import { slugify } from "../data/slugify";
import MovieCastingPage from "../components/MovieCastingPage";

export default async function MoviePage({
  params,
}: {
  params: Promise<{ movie: string }>;
}) {
  const { movie } = await params;

  const actors = getActors().sort((a: any, b: any) =>
    a.Name.localeCompare(b.Name)
  );

  const allRoles = getRoles();

  const matchingRoles = allRoles.filter(
    (role: any) => slugify(role.project_title) === movie
  );

  if (matchingRoles.length === 0) {
    notFound();
  }

  const projectTitle = matchingRoles[0].project_title;

  return (
    <MovieCastingPage
      projectTitle={projectTitle}
      roles={matchingRoles}
      actors={actors}
    />
  );
}