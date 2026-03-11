"use client";

import { useMemo, useState } from "react";

export default function CastingBoard({ actors, roles }: any) {
  const [casting, setCasting] = useState<Record<string, string>>({});
  const [activeRoleKey, setActiveRoleKey] = useState<string>("");

  const selectedActorNames = useMemo(
    () => new Set(Object.values(casting).filter(Boolean)),
    [casting]
  );

  function assignActorToRole(actorName: string) {
    if (!activeRoleKey) return;

    setCasting({
      ...casting,
      [activeRoleKey]: actorName,
    });
  }

  return (
    <div
      style={{
        background: "#111",
        color: "#eee",
        minHeight: "100vh",
        padding: "30px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ color: "#fff" }}>Wilderleague</h1>

      <h2>Roles</h2>

      {roles.map((role: any, i: number) => {
        const roleKey = role.role_id || `role-${i}`;
        const selectedActorName = casting[roleKey] || "";
        const selectedActor = actors.find(
          (actor: any) => actor.name === selectedActorName
        );
        const isActive = activeRoleKey === roleKey;

        return (
          <div
            key={roleKey}
            style={{
              background: isActive ? "#222" : "#1b1b1b",
              border: isActive ? "2px solid #88aaff" : "1px solid #444",
              borderRadius: "10px",
              padding: "15px",
              marginBottom: "20px",
            }}
          >
            <div>
              <strong>{role.role_name}</strong>
              <div style={{ opacity: 0.7 }}>
                Original: {role.original_actor}
              </div>
            </div>

            <div style={{ marginTop: "10px", display: "flex", gap: "10px", alignItems: "center" }}>
              <select
                value={selectedActorName}
                onChange={(e) =>
                  setCasting({
                    ...casting,
                    [roleKey]: e.target.value,
                  })
                }
                style={{
                  padding: "8px",
                  background: "#222",
                  color: "#fff",
                  border: "1px solid #555",
                  borderRadius: "6px",
                }}
              >
                <option value="">Select actor</option>
                {actors.map((actor: any, j: number) => (
                  <option key={`${actor.tmdb_id || "actor"}-${j}`} value={actor.name}>
                    {actor.name}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setActiveRoleKey(roleKey)}
                style={{
                  padding: "8px 12px",
                  background: isActive ? "#88aaff" : "#333",
                  color: isActive ? "#111" : "#fff",
                  border: "1px solid #555",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                {isActive ? "Selecting from actors below" : "Pick from actor grid"}
              </button>
            </div>

            {selectedActor && (
              <div
                style={{
                  marginTop: "12px",
                  display: "flex",
                  gap: "12px",
                  alignItems: "center",
                }}
              >
                <img
                  src={selectedActor.headshot_url}
                  width={80}
                  style={{ borderRadius: "6px" }}
                />
                <div>
                  Cast as <strong>{selectedActor.name}</strong>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <h2>Available Actors</h2>
      {activeRoleKey ? (
        <div style={{ marginBottom: "12px", opacity: 0.8 }}>
          Click an actor card to cast the currently selected role.
        </div>
      ) : (
        <div style={{ marginBottom: "12px", opacity: 0.8 }}>
          Choose “Pick from actor grid” on a role, then click an actor.
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: "12px",
        }}
      >
        {actors.map((actor: any, i: number) => {
          const used = selectedActorNames.has(actor.name);

          return (
            <button
              key={`${actor.tmdb_id || "actor"}-${i}`}
              onClick={() => assignActorToRole(actor.name)}
              disabled={!activeRoleKey}
              style={{
                background: "#1b1b1b",
                border: "1px solid #444",
                borderRadius: "8px",
                padding: "8px",
                opacity: used ? 0.4 : 1,
                cursor: activeRoleKey ? "pointer" : "not-allowed",
                color: "#eee",
                textAlign: "left",
              }}
            >
              <img
                src={actor.headshot_url}
                width={100}
                style={{ borderRadius: "6px", display: "block" }}
              />
              <div style={{ fontSize: "14px", marginTop: "6px" }}>
                {actor.name}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}