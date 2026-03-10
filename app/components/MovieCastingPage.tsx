"use client";

import { useState } from "react";
import RoleCastingCard from "./RoleCastingCard";

export default function MovieCastingPage({
  projectTitle,
  roles,
  actors,
}: {
  projectTitle: string;
  roles: any[];
  actors: any[];
}) {
  const [selections, setSelections] = useState<Record<string, string>>({});

  function handleSelect(roleName: string, actorName: string) {
    setSelections((prev) => ({
      ...prev,
      [roleName]: actorName,
    }));
  }

  function handleReset() {
    setSelections({});
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <h1>{projectTitle}</h1>

      <button
        onClick={handleReset}
        style={{
          marginBottom: "1rem",
          padding: "0.5rem 0.75rem",
          cursor: "pointer",
        }}
      >
        Reset cast
      </button>

      {roles.map((role: any) => (
        <RoleCastingCard
          key={`${role.project_title}-${role.character_name}`}
          role={role}
          actors={actors}
          selections={selections}
          selectedActor={selections[role.character_name] || ""}
          onSelectActor={handleSelect}
        />
      ))}

      <div
        style={{
          marginTop: "2rem",
          paddingTop: "1rem",
          borderTop: "2px solid #ddd",
        }}
      >
        <h2>Your Cast</h2>

        {roles.map((role: any) => (
          <p key={role.character_name}>
            <strong>{role.character_name}:</strong>{" "}
            {selections[role.character_name] || "—"}
          </p>
        ))}
      </div>
    </div>
  );
}