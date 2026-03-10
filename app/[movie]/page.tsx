import { notFound } from "next/navigation";
import { getActors, getRoles } from "../data/loadData";
import { slugify } from "../data/slugify";

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
    <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <h1>{projectTitle}</h1>

      {matchingRoles.map((role: any) => (
        <div
          key={`${role.project_title}-${role.character_name}`}
          style={{
            border: "1px solid #ddd",
            borderRadius: "8px",
            padding: "1rem",
            marginBottom: "1rem",
          }}
        >
          <h3>{role.character_name}</h3>
          <p>{role.notes}</p>

          <select defaultValue="">
            <option value="">Select an actor</option>

            {actors.map((actor: any) => (
              <option key={actor.Name} value={actor.Name}>
                {actor.Name}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}