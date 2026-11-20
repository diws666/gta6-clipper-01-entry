import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const botDir = process.env.MAKEFUN_BOT_DIR ?? "/bot";
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
const srcPath = join(botDir, "VIDEO.json");
const destPath = join(outDir, "VIDEO.json");

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

function isYouTubeUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  const host = parsed.hostname;
  if (host === "youtu.be") {
    return VIDEO_ID.test(parsed.pathname.slice(1));
  }
  if (host === "www.youtube.com" || host === "m.youtube.com" || host === "youtube.com") {
    if (parsed.pathname.startsWith("/shorts/")) {
      return VIDEO_ID.test(parsed.pathname.slice("/shorts/".length));
    }
    if (parsed.pathname === "/watch") {
      const id = parsed.searchParams.get("v");
      return id !== null && VIDEO_ID.test(id);
    }
  }
  return false;
}

if (!existsSync(srcPath)) {
  console.error(`VIDEO.json not found in ${botDir}`);
  process.exit(1);
}

let data: unknown;
try {
  data = JSON.parse(readFileSync(srcPath, "utf8"));
} catch {
  console.error("VIDEO.json is not valid JSON");
  process.exit(1);
}

if (typeof data !== "object" || data === null || Array.isArray(data)) {
  console.error("VIDEO.json must be a JSON object with a url field");
  process.exit(1);
}

const url = (data as { url?: unknown }).url;
if (!isYouTubeUrl(url)) {
  console.error("VIDEO.json url is not a valid YouTube video address");
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
copyFileSync(srcPath, destPath);

// Verify the copy landed byte-for-byte; a partial write must not pass silently.
const copied = readFileSync(destPath);
const original = readFileSync(srcPath);
if (!copied.equals(original)) {
  console.error("VIDEO.json copy does not match the source");
  process.exit(1);
}
