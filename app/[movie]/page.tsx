import { notFound } from "next/navigation";
import { getActors, getRoles } from "../data/loadData";
import { slugify } from "../data/slugify";
import MovieCastingPage from "../components/MovieCastingPage";

type Actor = {
  Name: string;
  "Date of Birth"?: string;
  "IMDb ID"?: string;
  Info?: string;
  photo?: string;
};

type Role = {
  project_title: string;
  character_name: string;
  notes: string;
};

export default async function MoviePage({
  params,
}: {
  params: Promise<{ movie: string }>;
}) {
  const { movie } = await params;

  const actors = (getActors() as Actor[]).sort((a, b) =>
    a.Name.localeCompare(b.Name)
  );

  const allRoles = getRoles() as Role[];

  const matchingRoles = allRoles.filter(
    (role) => slugify(role.project_title) === movie
  );

  if (matchingRoles.length === 0) {
    notFound();
  }

  const projectTitle = matchingRoles[0]!.project_title;

  return (
    <MovieCastingPage
      projectTitle={projectTitle}
      roles={matchingRoles}
      actors={actors}
    />
  );
}