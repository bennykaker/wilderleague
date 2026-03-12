"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import ActorCardModal from "./ActorCardModal";

type Actor = {
  actor_id?: string;
  id?: string;
  tmdb_id?: string | number;
  name: string;
  image?: string;
  headshot_url?: string;
  profile_path?: string;
  birthYear?: number;
  birth_year?: number;
  nationality?: string;
  knownFor?: string[];
  known_for?: string;
  salaryMin?: number;
  salaryMax?: number;
  salary_min?: number;
  salary_max?: number;
  popularity?: number | string;
  notes?: string;
  ui_status?: string;
};

type Role = {
  role_name: string;
  original_actor?: string;
};

type CastingBoardProps = {
  actors?: Actor[];
  roles?: Role[];
  title?: string;
  challenge?: string;
  budget?: string;
};

function normalizeImage(actor: Actor) {
  if (actor.image) return actor.image;
  if (actor.headshot_url) return actor.headshot_url;
  if (actor.profile_path) {
    if (actor.profile_path.startsWith("http")) return actor.profile_path;
    return `https://image.tmdb.org/t/p/w500${actor.profile_path}`;
  }
  return "";
}

function normalizeKnownFor(actor: Actor) {
  if (actor.knownFor && Array.isArray(actor.knownFor)) return actor.knownFor;
  if (actor.known_for) {
    return actor.known_for
      .split(";")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeBirthYear(actor: Actor) {
  return actor.birthYear ?? actor.birth_year;
}

function normalizeSalaryMin(actor: Actor) {
  return actor.salaryMin ?? actor.salary_min;
}

function normalizeSalaryMax(actor: Actor) {
  return actor.salaryMax ?? actor.salary_max;
}

function normalizeActor(actor: Actor, index: number): Actor {
  return {
    ...actor,
    id:
      actor.id ??
      actor.actor_id ??
      String(actor.tmdb_id ?? actor.name ?? index),
    image: normalizeImage(actor),
    knownFor: normalizeKnownFor(actor),
    birthYear: normalizeBirthYear(actor),
    salaryMin: normalizeSalaryMin(actor),
    salaryMax: normalizeSalaryMax(actor),
  };
}

export default function CastingBoard({
  actors = [],
  roles = [],
  title = "Casting Board",
  challenge = "Recast the movie with a new cast.",
  budget = "$25M",
}: CastingBoardProps) {
  const normalizedActors = useMemo(
    () => actors.map((actor, index) => normalizeActor(actor, index)),
    [actors]
  );

  const normalizedRoles = useMemo(() => {
    if (roles.length > 0) return roles;

    return [
      { role_name: "Neo", original_actor: "Keanu Reeves" },
      { role_name: "Trinity", original_actor: "Carrie-Anne Moss" },
      { role_name: "Morpheus", original_actor: "Laurence Fishburne" },
    ];
  }, [roles]);

  const [selectedActor, setSelectedActor] = useState<Actor | null>(null);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [draggingActorId, setDraggingActorId] = useState<string | null>(null);
  const [dragOverRole, setDragOverRole] = useState<string | null>(null);

  function handleSelect(roleName: string, actorName: string) {
    setSelections((prev) => ({
      ...prev,
      [roleName]: actorName,
    }));
  }

  function clearRole(roleName: string) {
    setSelections((prev) => {
      const next = { ...prev };
      delete next[roleName];
      return next;
    });
  }

  function resetCast() {
    setSelections({});
  }

  function assignActorToRole(roleName: string, actorName: string) {
    setSelections((prev) => {
      const next: Record<string, string> = {};

      for (const [existingRole, existingActor] of Object.entries(prev)) {
        if (existingActor !== actorName) {
          next[existingRole] = existingActor;
        }
      }

      next[roleName] = actorName;
      return next;
    });
  }

  function handleDragStart(actor: Actor) {
    setDraggingActorId(actor.id ?? null);
  }

  function handleDragEnd() {
    setDraggingActorId(null);
    setDragOverRole(null);
  }

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert("Page link copied.");
    } catch {
      alert("Could not copy link.");
    }
  }

  const assignedActorNames = new Set(Object.values(selections));

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #0f172a 0%, #111827 45%, #0b1220 100%)",
        color: "#f9fafb",
        padding: "32px 24px 48px",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div
          style={{
            marginBottom: "28px",
            padding: "24px",
            borderRadius: "20px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              marginBottom: "12px",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#93c5fd",
              }}
            >
              Wilderleague
            </div>

            <div
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={resetCast}
                style={{
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.04)",
                  color: "#e5e7eb",
                  fontSize: "14px",
                  fontWeight: 700,
                  padding: "10px 14px",
                  borderRadius: "999px",
                  cursor: "pointer",
                }}
              >
                Reset cast
              </button>

              <button
                onClick={copyShareLink}
                style={{
                  border: "1px solid rgba(59,130,246,0.35)",
                  background: "rgba(59,130,246,0.12)",
                  color: "#bfdbfe",
                  fontSize: "14px",
                  fontWeight: 700,
                  padding: "10px 14px",
                  borderRadius: "999px",
                  cursor: "pointer",
                }}
              >
                Copy page link
              </button>

              <Link
                href="/"
                style={{
                  textDecoration: "none",
                  color: "#e5e7eb",
                  fontSize: "14px",
                  fontWeight: 700,
                  padding: "10px 14px",
                  borderRadius: "999px",
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.04)",
                }}
              >
                ← Home
              </Link>
            </div>
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "36px",
              lineHeight: 1.1,
              fontWeight: 800,
            }}
          >
            {title}
          </h1>

          <div
            style={{
              marginTop: "12px",
              color: "#d1d5db",
              fontSize: "16px",
              lineHeight: 1.5,
              maxWidth: "760px",
            }}
          >
            {challenge}
          </div>

          <div
            style={{
              marginTop: "18px",
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 14px",
              borderRadius: "999px",
              background: "rgba(59,130,246,0.12)",
              border: "1px solid rgba(59,130,246,0.25)",
              color: "#bfdbfe",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            Estimated cast budget: {budget}
          </div>
        </div>

        <div
          style={{
            marginBottom: "32px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "18px",
          }}
        >
          {normalizedRoles.map((role, index) => {
            const selectedActorName = selections[role.role_name];
            const selectedActorForRole = normalizedActors.find(
              (actor) => actor.name === selectedActorName
            );
            const isDragOver = dragOverRole === role.role_name;

            return (
              <div
                key={`${role.role_name}-${index}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverRole(role.role_name);
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  setDragOverRole(role.role_name);
                }}
                onDragLeave={() => {
                  setDragOverRole((current) =>
                    current === role.role_name ? null : current
                  );
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const actorName = e.dataTransfer.getData("text/plain");

                  if (actorName) {
                    assignActorToRole(role.role_name, actorName);
                  }

                  setDragOverRole(null);
                  setDraggingActorId(null);
                }}
                style={{
                  background: isDragOver
                    ? "rgba(59,130,246,0.12)"
                    : "rgba(255,255,255,0.04)",
                  border: isDragOver
                    ? "1px solid rgba(96,165,250,0.65)"
                    : "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "18px",
                  padding: "18px",
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "#9ca3af",
                    marginBottom: "8px",
                  }}
                >
                  Role
                </div>

                <div
                  style={{
                    fontSize: "22px",
                    fontWeight: 800,
                    marginBottom: "8px",
                  }}
                >
                  {role.role_name}
                </div>

                <div
                  style={{
                    color: "#cbd5e1",
                    fontSize: "14px",
                    marginBottom: "14px",
                  }}
                >
                  Original: {role.original_actor ?? "Unknown"}
                </div>

                <div
                  style={{
                    marginBottom: "14px",
                    minHeight: "92px",
                    borderRadius: "14px",
                    border: isDragOver
                      ? "1px dashed rgba(147,197,253,0.9)"
                      : "1px dashed rgba(255,255,255,0.16)",
                    background: isDragOver
                      ? "rgba(30,41,59,0.85)"
                      : "rgba(15,23,42,0.55)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: selectedActorForRole
                      ? "space-between"
                      : "center",
                    gap: "12px",
                    padding: "12px",
                  }}
                >
                  {selectedActorForRole ? (
                    <>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        {selectedActorForRole.image && (
                          <img
                            src={selectedActorForRole.image}
                            alt={selectedActorForRole.name}
                            style={{
                              width: "44px",
                              height: "66px",
                              objectFit: "cover",
                              borderRadius: "8px",
                            }}
                          />
                        )}

                        <div>
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#9ca3af",
                              marginBottom: "4px",
                            }}
                          >
                            Recast
                          </div>
                          <div
                            style={{
                              fontSize: "14px",
                              color: "#86efac",
                              fontWeight: 700,
                            }}
                          >
                            {selectedActorForRole.name}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => clearRole(role.role_name)}
                        style={{
                          border: "1px solid rgba(255,255,255,0.12)",
                          background: "rgba(255,255,255,0.05)",
                          color: "#f9fafb",
                          borderRadius: "10px",
                          padding: "8px 10px",
                          cursor: "pointer",
                          fontSize: "12px",
                        }}
                      >
                        Remove
                      </button>
                    </>
                  ) : (
                    <div
                      style={{
                        fontSize: "13px",
                        color: isDragOver ? "#bfdbfe" : "#9ca3af",
                        fontWeight: 600,
                      }}
                    >
                      Drag an actor here
                    </div>
                  )}
                </div>

                <select
                  value={selections[role.role_name] ?? ""}
                  onChange={(e) => handleSelect(role.role_name, e.target.value)}
                  style={{
                    width: "100%",
                    borderRadius: "12px",
                    padding: "12px 14px",
                    background: "#111827",
                    color: "#f9fafb",
                    border: "1px solid rgba(255,255,255,0.14)",
                    fontSize: "15px",
                    outline: "none",
                  }}
                >
                  <option value="">Select actor</option>
                  {normalizedActors
                    .filter((actor) => {
                      const selectedElsewhere = Object.entries(selections).some(
                        ([selectedRole, selectedActorName]) =>
                          selectedRole !== role.role_name &&
                          selectedActorName === actor.name
                      );

                      return !selectedElsewhere;
                    })
                    .map((actor, j) => (
                      <option
                        key={`${actor.tmdb_id || actor.id || "actor"}-${j}`}
                        value={actor.name}
                      >
                        {actor.name}
                      </option>
                    ))}
                </select>
              </div>
            );
          })}
        </div>

        <div
          style={{
            marginBottom: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "24px",
              fontWeight: 800,
            }}
          >
            Actor Pool
          </h2>

          <div
            style={{
              color: "#9ca3af",
              fontSize: "14px",
            }}
          >
            Drag actors into roles or click for details
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: "18px",
          }}
        >
          {normalizedActors.map((actor, index) => {
            const isAssigned = assignedActorNames.has(actor.name);
            const isDragging = draggingActorId === actor.id;

            return (
              <div
                key={`${actor.id || actor.name}-${index}`}
                draggable={!isAssigned}
                onDragStart={(e) => {
                  if (isAssigned) {
                    e.preventDefault();
                    return;
                  }

                  e.dataTransfer.setData("text/plain", actor.name);
                  e.dataTransfer.effectAllowed = "move";
                  handleDragStart(actor);
                }}
                onDragEnd={handleDragEnd}
                style={{
                  background: isAssigned
                    ? "rgba(255,255,255,0.02)"
                    : "rgba(255,255,255,0.04)",
                  border: isDragging
                    ? "1px solid rgba(96,165,250,0.7)"
                    : "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "16px",
                  padding: "10px",
                  color: "#f9fafb",
                  opacity: isAssigned ? 0.45 : isDragging ? 0.6 : 1,
                  cursor: isAssigned ? "not-allowed" : "grab",
                }}
              >
                <button
                  onClick={() => setSelectedActor(actor)}
                  style={{
                    display: "block",
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    textAlign: "left",
                    color: "inherit",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      aspectRatio: "2 / 3",
                      overflow: "hidden",
                      borderRadius: "12px",
                      background: "#1f2937",
                      marginBottom: "10px",
                    }}
                  >
                    {actor.image ? (
                      <img
                        src={actor.image}
                        alt={actor.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#9ca3af",
                          fontSize: "13px",
                        }}
                      >
                        No image
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: 700,
                      lineHeight: 1.3,
                      marginBottom: "4px",
                    }}
                  >
                    {actor.name}
                  </div>

                  <div
                    style={{
                      fontSize: "12px",
                      color: "#9ca3af",
                    }}
                  >
                    {actor.birthYear ?? "Year unknown"}
                  </div>
                </button>

                <div
                  style={{
                    marginTop: "8px",
                    fontSize: "11px",
                    color: isAssigned ? "#fca5a5" : "#93c5fd",
                    fontWeight: 600,
                  }}
                >
                  {isAssigned ? "Already cast" : "Drag to cast"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedActor && (
        <ActorCardModal
          actor={selectedActor}
          onClose={() => setSelectedActor(null)}
        />
      )}
    </div>
  );
}