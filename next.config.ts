import type { NextConfig } from "next";
import fs from "fs";
import path from "path";

function loadEnvLocal(): Record<string, string> {
  try {
    const file = fs.readFileSync(path.resolve(process.cwd(), ".env.local"), "utf8");
    return Object.fromEntries(
      file.split("\n")
        .map(line => line.trim())
        .filter(line => line && !line.startsWith("#"))
        .map(line => line.split("=").map((p, i) => i === 0 ? p.trim() : line.slice(line.indexOf("=") + 1).trim()))
        .filter(([k]) => k)
    );
  } catch {
    return {};
  }
}

const localEnv = loadEnvLocal();

const nextConfig: NextConfig = {
  env: {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? localEnv.ANTHROPIC_API_KEY ?? "",
  },
};

export default nextConfig;
