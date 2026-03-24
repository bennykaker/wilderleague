import fs from "fs";
import path from "path";
import Papa from "papaparse";

export type CastRole = {
  role_name: string;
  original_actor: string;
  original_actor_image?: string;
};

export function getRoles(): CastRole[] {
  const filePath = path.join(process.cwd(), "data", "roles.csv");
  const file = fs.readFileSync(filePath, "utf8");

  const parsed = Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
  });

  return (parsed.data as CastRole[]).filter((r) => r.role_name?.trim());
}
