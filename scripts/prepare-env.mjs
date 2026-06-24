import fs from "node:fs";

function loadEnvFile(path) {
  if (!fs.existsSync(path)) return {};
  const vars = {};
  for (const line of fs.readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    vars[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return vars;
}

const apiUrl = (process.env.VITE_API_URL || loadEnvFile(".env").VITE_API_URL)?.trim();

if (!apiUrl) {
  console.error(
    "VITE_API_URL is not set. Add it to frontend/.env for local builds or in GitHub Actions variables for Azure deploys."
  );
  process.exit(1);
}

fs.writeFileSync(".env.production", `VITE_API_URL=${apiUrl}\n`);
console.log("Created .env.production for build");
