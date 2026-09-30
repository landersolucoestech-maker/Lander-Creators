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

const rows = results
  .map(
    (item) => `
      <article class="capture">
        <div class="meta">
          <h2>${escapeHtml(item.screen)} · ${escapeHtml(item.viewport)}</h2>
          <p><strong>Route:</strong> ${escapeHtml(item.route)}</p>
          <p><strong>Status:</strong> ${escapeHtml(item.status)}</p>
          <p><strong>Finding:</strong> ${escapeHtml(item.finding)}</p>
          <p><strong>Accessibility:</strong> ${escapeHtml(item.accessibility)}</p>
        </div>
        <img src="../${escapeHtml(item.screenshot)}" alt="${escapeHtml(item.screen)} ${escapeHtml(item.viewport)} screenshot">
      </article>`
  )
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
${rows}
</main>
</body>
</html>`;

await mkdir("visual-report", { recursive: true });
await writeFile("visual-report/index.html", html);
await writeFile(
  "visual-report/results.json",
  JSON.stringify({ sha, runId, overall: issues.length ? "ISSUE" : "PASS", results }, null, 2)
);

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
