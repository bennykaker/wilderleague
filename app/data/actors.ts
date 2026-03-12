import fs from "fs";
import path from "path";
import Papa from "papaparse";

export function getActors() {
  const filePath = path.join(process.cwd(), "data", "actors.csv");
  const file = fs.readFileSync(filePath, "utf8");

  const parsed = Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
  });

  return (parsed.data as any[]).map((actor, index) => ({
    ...actor,
    actor_id: actor.actor_id || String(actor.tmdb_id || actor.name || index),
    popularity: actor.popularity ? Number(actor.popularity) : undefined,
  }));
}