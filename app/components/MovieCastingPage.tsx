"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const storageKey = `cast:${projectTitle}`;

  const roleNames = useMemo(
    () => roles.map((role: any) => role.character_name),
    [roles]
  );

  const [selections, setSelections] = useState<Record<string, string>>({});

  useEffect(() => {
    const fromUrl: Record<string, string> = {};

    roleNames.forEach((roleName) => {
      const value = searchParams.get(roleName);
      if (value) {
        fromUrl[roleName] = value;
      }
    });

    if (Object.keys(fromUrl).length > 0) {
      setSelections(fromUrl);
      return;
    }

    const saved = localStorage.getItem(storageKey);
    if (saved) {
      setSelections(JSON.parse(saved));
    }
  }, [roleNames, searchParams, storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(selections));

    const params = new URLSearchParams();

    Object.entries(selections).forEach(([roleName, actorName]) => {
      if (actorName) {
        params.set(roleName, actorName);
      }
    });

    const queryString = params.toString();
    const nextUrl = queryString ? `${pathname}?${queryString}` : pathname;

    router.replace(nextUrl);
  }, [selections, storageKey, pathname, router]);

  function handleSelect(roleName: string, actorName: string) {
    setSelections((prev) => ({
      ...prev,
      [roleName]: actorName,
    }));
  }

  function handleReset() {
    setSelections({});
    localStorage.removeItem(storageKey);
    router.replace(pathname);
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(window.location.href);
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
          onClick={handleCopyLink}
          style={{
            padding: "0.5rem 0.75rem",
            cursor: "pointer",
          }}
        >
          Copy share link
        </button>
      </div>

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