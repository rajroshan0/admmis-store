// The website and the app share one set of rules (types, cart maths, prices, Nepali/English text).
// The website's copy in ../src/shared is the original; this copies it into the app.
// It runs automatically before `npm start`. If ../src/shared is not there (e.g. the app is built on its own), the copy already in src/shared is used.
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const from = join(here, "..", "..", "src", "shared");
const to = join(here, "..", "src", "shared");

if (existsSync(from)) {
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
  console.log("Shared code synced from the website.");
} else {
  console.log("Website folder not found; using the app's own copy of src/shared.");
}
