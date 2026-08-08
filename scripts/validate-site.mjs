import { access, readFile } from "node:fs/promises";

const requiredFiles = [
  "site/index.html",
  "site/styles.css",
  "site/app.js",
  "scripts/update_weather.py"
];

await Promise.all(requiredFiles.map((file) => access(file)));

const html = await readFile("site/index.html", "utf8");
const js = await readFile("site/app.js", "utf8");

for (const id of [
  "forecast-chart",
  "forecast-grid",
  "current-temp",
  "last-updated"
]) {
  if (!html.includes(`id="${id}"`) && !js.includes(`"${id}"`)) {
    throw new Error(`Missing expected UI hook: ${id}`);
  }
}

console.log("Static site smoke test passed.");
