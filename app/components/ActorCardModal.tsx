"use client";

type Actor = {
  id?: string;
  name: string;
  image?: string;
  birthYear?: number;
  nationality?: string;
  knownFor?: string[];
  salaryMin?: number;
  salaryMax?: number;
  notes?: string;
};

type ActorCardModalProps = {
  actor: Actor;
  onClose: () => void;
};

function formatSalary(min?: number, max?: number) {
  if (!min && !max) return "Unknown";
  if (min && max) {
    return `$${(min / 1_000_000).toFixed(1)}M – $${(max / 1_000_000).toFixed(1)}M`;
  }
  if (min) return `From $${(min / 1_000_000).toFixed(1)}M`;
  return `Up to $${(max! / 1_000_000).toFixed(1)}M`;
}

export default function ActorCardModal({
  actor,
  onClose,
}: ActorCardModalProps) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "720px",
          background: "#111827",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "18px",
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
          color: "#f9fafb",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "240px 1fr",
            gap: "0",
          }}
        >
          <div
            style={{
              background: "#0b1220",
              minHeight: "360px",
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
                  minHeight: "360px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#9ca3af",
                  fontSize: "14px",
                }}
              >
                No image
              </div>
            )}
          </div>

          <div style={{ padding: "24px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "start",
                justifyContent: "space-between",
                gap: "12px",
                marginBottom: "18px",
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: "28px",
                    lineHeight: 1.1,
                    fontWeight: 800,
                  }}
                >
                  {actor.name}
                </h2>
                <div
                  style={{
                    marginTop: "8px",
                    color: "#9ca3af",
                    fontSize: "14px",
                  }}
                >
                  Tap outside to close
                </div>
              </div>

              <button
                onClick={onClose}
                style={{
                  border: "none",
                  background: "rgba(255,255,255,0.08)",
                  color: "#f9fafb",
                  width: "36px",
                  height: "36px",
                  borderRadius: "999px",
                  cursor: "pointer",
                  fontSize: "18px",
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "140px 1fr",
                rowGap: "12px",
                columnGap: "16px",
                fontSize: "15px",
                marginBottom: "22px",
              }}
            >
              <div style={{ color: "#9ca3af" }}>Birth year</div>
              <div>{actor.birthYear ?? "Unknown"}</div>

              <div style={{ color: "#9ca3af" }}>Nationality</div>
              <div>{actor.nationality ?? "Unknown"}</div>

              <div style={{ color: "#9ca3af" }}>Salary est.</div>
              <div>{formatSalary(actor.salaryMin, actor.salaryMax)}</div>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <div
                style={{
                  fontSize: "12px",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#9ca3af",
                  marginBottom: "10px",
                }}
              >
                Known for
              </div>

              {actor.knownFor && actor.knownFor.length > 0 ? (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "8px",
                  }}
                >
                  {actor.knownFor.map((credit) => (
                    <span
                      key={credit}
                      style={{
                        padding: "8px 10px",
                        borderRadius: "999px",
                        background: "#1f2937",
                        border: "1px solid rgba(255,255,255,0.08)",
                        fontSize: "14px",
                      }}
                    >
                      {credit}
                    </span>
                  ))}
                </div>
              ) : (
                <div style={{ color: "#9ca3af", fontSize: "14px" }}>
                  No credits added yet.
                </div>
              )}
            </div>

            <div>
              <div
                style={{
                  fontSize: "12px",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#9ca3af",
                  marginBottom: "10px",
                }}
              >
                Notes
              </div>

              <div
                style={{
                  background: "#0f172a",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "12px",
                  padding: "14px",
                  fontSize: "14px",
                  lineHeight: 1.5,
                  color: "#e5e7eb",
                }}
              >
                {actor.notes ?? "No notes yet."}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}