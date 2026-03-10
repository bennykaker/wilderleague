import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

function loadCSV(file: string) {
  const filePath = path.join(process.cwd(), "data", file);
  const content = fs.readFileSync(filePath, "utf8");

  return parse(content, {
    columns: true,
    skip_empty_lines: true,
  });
}

export function getActors() {
  return loadCSV("actors.csv");
}

export function getRoles() {
  return loadCSV("roles.csv");
}