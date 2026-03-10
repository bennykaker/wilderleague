"use client";

import { useMemo, useState } from "react";

export default function RoleCastingCard({
  role,
  actors,
  selections,
  selectedActor,
  onSelectActor,
}: {
  role: any;
  actors: any[];
  selections: Record<string, string>;
  selectedActor: string;
  onSelectActor: (roleName: string, actorName: string) => void;
}) {
  const [query, setQuery] = useState("");

  const usedActors = Object.entries(selections)
    .filter(([roleName, actorName]) => roleName !== role.character_name && actorName)
    .map(([, actorName]) => actorName);

  const filteredActors = useMemo(() => {
    return actors.filter((actor: any) => {
      const matchesSearch = actor.Name.toLowerCase().includes(query.toLowerCase());
      const isAvailable =
        !usedActors.includes(actor.Name) || actor.Name === selectedActor;

      return matchesSearch && isAvailable;
    });
  }, [actors, query, usedActors, selectedActor]);

  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: "8px",
        padding: "1rem",
        marginBottom: "1rem",
      }}
    >
      <h3>{role.character_name}</h3>
      <p>{role.notes}</p>

      <input
        type="text"
        placeholder="Search actors..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{
          padding: "0.5rem",
          marginBottom: "0.75rem",
          width: "100%",
          fontSize: "1rem",
        }}
      />

      <select
        value={selectedActor}
        onChange={(e) => onSelectActor(role.character_name, e.target.value)}
        style={{ width: "100%", padding: "0.5rem" }}
      >
        <option value="">Select an actor</option>

        {filteredActors.map((actor: any) => (
          <option key={actor.Name} value={actor.Name}>
            {actor.Name}
          </option>
        ))}
      </select>
    </div>
  );
}