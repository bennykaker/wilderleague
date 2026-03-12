import fs from "fs";
import path from "path";
import Papa from "papaparse";

export function getRoles() {
  const filePath = path.join(process.cwd(), "data", "roles.csv");
  const file = fs.readFileSync(filePath, "utf8");

  const parsed = Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
  });

  return parsed.data as {
    role_name: string;
    original_actor?: string;
  }[];
}