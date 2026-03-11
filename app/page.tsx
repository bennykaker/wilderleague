import { getActors } from "./data/actors";
import { getRoles } from "./data/roles";

export default function Page() {
  const actors = getActors();
  const roles = getRoles();

  return (
    <div style={{ padding: "20px" }}>
      <h1>Wilderleague</h1>

      <h2>Roles</h2>
      <div style={{ marginBottom: "40px" }}>
        {roles.map((role: any, i: number) => (
          <div key={i} style={{ marginBottom: "12px" }}>
            <strong>{role.role_name}</strong> — original: {role.original_actor}
          </div>
        ))}
      </div>

      <h2>Actors</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: "20px",
        }}
      >
        {actors.map((actor: any, i: number) => (
          <div key={i}>
            <img
              src={actor.headshot_url?.trim()}
              alt={actor.name}
              width={120}
            />
            <div>{actor.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}