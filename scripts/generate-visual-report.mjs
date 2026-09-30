import { mkdir, readFile, writeFile } from "node:fs/promises";

const source = await readFile("visual/results.ndjson", "utf8");
const results = source
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => JSON.parse(line));

const sha = process.env.GITHUB_SHA ?? results[0]?.sha ?? "unknown";
const runId = process.env.GITHUB_RUN_ID ?? results[0]?.runId ?? "unknown";
const issues = results.filter((item) => item.status !== "PASS");

const sectionOrder = [
  "Authentication",
  "Dashboard",
  "Creator",
  "Music Catalog",
  "Promoted Entities",
  "Media",
  "Workspace & Team",
  "Responsive",
  "Other"
];

function sectionFor(item) {
  const screen = String(item.screen);
  const route = String(item.route);
  if (screen.includes("authentication") || screen === "home" || screen === "reset-password" || screen === "invitation") return "Authentication";
  if (screen.startsWith("dashboard")) return "Dashboard";
  if (route === "/creator" || screen.startsWith("creator")) return "Creator";
  if (route === "/music-catalog" || screen.startsWith("catalog")) return "Music Catalog";
  if (route === "/promoted-entities" || screen.startsWith("promoted")) return "Promoted Entities";
  if (route === "/media" || screen.includes("media")) return "Media";
  if (route === "/team" || route === "/workspace" || screen.includes("workspace") || screen.includes("team")) return "Workspace & Team";
  if (screen.startsWith("shell-")) return "Responsive";
  return "Other";
}

const grouped = Object.fromEntries(sectionOrder.map((section) => [section, []]));
for (const item of results) grouped[sectionFor(item)].push(item);

const sections = sectionOrder
  .filter((section) => grouped[section].length)
  .map((section) => {
    const rows = grouped[section].map((item) => `
      <article class="capture">
        <div class="meta">
          <h3>${escapeHtml(item.screen)} · ${escapeHtml(item.viewport)}</h3>
          <p><strong>Route:</strong> ${escapeHtml(item.route)}</p>
          <p><strong>Status:</strong> ${escapeHtml(item.status)}</p>
          <p><strong>Finding:</strong> ${escapeHtml(item.finding)}</p>
          <p><strong>Accessibility:</strong> ${escapeHtml(item.accessibility)}</p>
        </div>
        <img src="../${escapeHtml(item.screenshot)}" alt="${escapeHtml(item.screen)} ${escapeHtml(item.viewport)} screenshot">
      </article>`).join("\n");
    return `<section><h2>${escapeHtml(section)}</h2>${rows}</section>`;
  })
  .join("\n");

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>LANDER CREATORS Visual Inspection</title>
<style>
body{font-family:system-ui,sans-serif;margin:0;background:#0b0d10;color:#f5f7fa}
main{width:min(1200px,100%);margin:auto;padding:32px}
header,.capture{border:1px solid #2b3038;border-radius:16px;background:#11151a;padding:24px;margin-bottom:24px}
section{margin:42px 0}section>h2{font-size:1.6rem;margin:0 0 18px}
img{display:block;width:100%;height:auto;border-radius:10px;border:1px solid #343b46;margin-top:16px}
p{color:#bdc5d1;line-height:1.5}.pass{color:#91e6a4}.issue{color:#ffb4a2}
code{overflow-wrap:anywhere}
</style>
</head>
<body>
<main>
<header>
<h1>LANDER CREATORS — GitHub Visual Inspection</h1>
<p><strong>Git SHA:</strong> <code>${escapeHtml(sha)}</code></p>
<p><strong>GitHub Actions run:</strong> <code>${escapeHtml(runId)}</code></p>
<p><strong>Captures:</strong> ${results.length}</p>
<p class="${issues.length ? "issue" : "pass"}"><strong>Overall:</strong> ${issues.length ? "ISSUE" : "PASS"}</p>
<p>Generated entirely inside GitHub Actions. No external visual-testing or hosting service is used.</p>
</header>
${sections}
</main>
</body>
</html>`;

await mkdir("visual-report", { recursive: true });
await writeFile("visual-report/index.html", html);
await writeFile(
  "visual-report/results.json",
  JSON.stringify({ sha, runId, overall: issues.length ? "ISSUE" : "PASS", sections: grouped, results }, null, 2)
);

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
