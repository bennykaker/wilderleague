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

  function clearRole(roleKey: string) {
    const nextCasting = { ...casting };
    delete nextCasting[roleKey];
    setCasting(nextCasting);
  }

  const castCount = Object.keys(casting).length;

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

      <div
        style={{
          background: "#1b1b1b",
          border: "1px solid #444",
          borderRadius: "10px",
          padding: "16px",
          marginBottom: "24px",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Your Cast</h2>

        {castCount === 0 ? (
          <div style={{ opacity: 0.75 }}>No roles cast yet.</div>
        ) : (
          <div style={{ display: "grid", gap: "10px" }}>
            {roles.map((role: any, i: number) => {
              const roleKey = role.role_id || `role-${i}`;
              const selectedActorName = casting[roleKey];
              if (!selectedActorName) return null;

              const selectedActor = actors.find(
                (actor: any) => actor.name === selectedActorName
              );

              return (
                <div
                  key={`summary-${roleKey}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "10px",
                    background: "#222",
                    borderRadius: "8px",
                  }}
                >
                  {selectedActor?.headshot_url ? (
                    <img
                      src={selectedActor.headshot_url}
                      alt={selectedActor.name}
                      width={56}
                      style={{ borderRadius: "6px" }}
                    />
                  ) : null}

                  <div>
                    <div>
                      <strong>{role.role_name}</strong> — {selectedActorName}
                    </div>
                    <div style={{ opacity: 0.7, fontSize: "14px" }}>
                      Original: {role.original_actor}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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

            <div
              style={{
                marginTop: "10px",
                display: "flex",
                gap: "10px",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
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
                  <option
                    key={`${actor.tmdb_id || "actor"}-${j}`}
                    value={actor.name}
                  >
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
                {isActive ? "Selecting from actor grid" : "Pick from actor grid"}
              </button>

              <button
                onClick={() => clearRole(roleKey)}
                style={{
                  padding: "8px 12px",
                  background: "#333",
                  color: "#fff",
                  border: "1px solid #555",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Clear
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
                  alt={selectedActor.name}
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
      <div style={{ marginBottom: "12px", opacity: 0.8 }}>
        {activeRoleKey
          ? "Click an actor card to cast the selected role."
          : 'Choose "Pick from actor grid" on a role, then click an actor.'}
      </div>

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
                alt={actor.name}
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