"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
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
  const searchParams = useSearchParams();
  const storageKey = `cast:${projectTitle}`;

  const [selections, setSelections] = useState<Record<string, string>>({});
  const [copyMessage, setCopyMessage] = useState("");
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;

    const fromUrl: Record<string, string> = {};

    roles.forEach((role: any) => {
      const actorFromUrl = searchParams.get(role.character_name);
      if (actorFromUrl) {
        fromUrl[role.character_name] = actorFromUrl;
      }
    });

    if (Object.keys(fromUrl).length > 0) {
      setSelections(fromUrl);
    } else {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setSelections(JSON.parse(saved));
      }
    }

    hasInitialized.current = true;
  }, [roles, searchParams, storageKey]);

  useEffect(() => {
    if (!hasInitialized.current) return;
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
          padding: "1.5rem",
          border: "2px solid #444",
          borderRadius: "10px",
          background: "#f5f5f5",
          color: "#111",
        }}
      >
        <h2 style={{ marginBottom: "1rem", color: "#111" }}>
          Your Cast — {projectTitle}
        </h2>

        {roles.map((role: any) => (
          <div
            key={role.character_name}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "0.5rem 0",
              borderBottom: "1px solid #ccc",
              color: "#111",
            }}
          >
            <strong style={{ color: "#111" }}>{role.character_name}</strong>
            <span style={{ color: "#111" }}>
              {selections[role.character_name] || "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}