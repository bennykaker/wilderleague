"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();
  const storageKey = `cast:${projectTitle}`;
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [copyMessage, setCopyMessage] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      setSelections(JSON.parse(saved));
    }
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(selections));
  }, [selections, storageKey]);

  function handleSelect(roleName: string, actorName: string) {
    setSelections((prev) => ({
      ...prev,
      [roleName]: actorName,
    }));
  }

  function handleReset() {
    setSelections({});
    localStorage.removeItem(storageKey);
    setCopyMessage("");
  }

  async function handleCopyShareLink() {
    const params = new URLSearchParams();

    Object.entries(selections).forEach(([roleName, actorName]) => {
      if (actorName) {
        params.set(roleName, actorName);
      }
    });

    const queryString = params.toString();
    const shareUrl = queryString
      ? `${window.location.origin}${pathname}?${queryString}`
      : `${window.location.origin}${pathname}`;

    await navigator.clipboard.writeText(shareUrl);
    setCopyMessage("Link copied");

    setTimeout(() => {
      setCopyMessage("");
    }, 1500);
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <h1>{projectTitle}</h1>

      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem" }}>
        <button
          onClick={handleReset}
          style={{
            padding: "0.5rem 0.75rem",
            cursor: "pointer",
          }}
        >
          Reset cast
        </button>

        <button
          onClick={handleCopyShareLink}
          style={{
            padding: "0.5rem 0.75rem",
            cursor: "pointer",
          }}
        >
          Copy share link
        </button>
      </div>

      {copyMessage && <p>{copyMessage}</p>}

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