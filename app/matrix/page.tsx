import { getActors, getRoles } from "../data/loadData";

export default function MatrixPage() {
  const actors = getActors().sort((a: any, b: any) =>
  a.Name.localeCompare(b.Name)
);

const roles = getRoles().filter(
  (r: any) => r.project_title === "The Matrix"
);
  return (
    <div>
      <h1>The Matrix Casting</h1>

      {roles.map((role: any) => (
        <div key={role.character_name}>
         <h3>{role.character_name}</h3>
<p>{role.notes}</p>

      <select defaultValue="">
  <option value="" disabled>
    Select an actor
  </option>

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