// Generates every SVG on the profile from live GitHub data. No dependencies, Node 20+.
// Usage: GITHUB_TOKEN=... node scripts/generate.mjs   (PROFILE_TOKEN overrides, adds private repos/contributions)
import { writeFileSync, mkdirSync } from "node:fs";

const USER = process.env.PROFILE_USER || "Abdalrahman-py";
const TOKEN = process.env.PROFILE_TOKEN || process.env.GITHUB_TOKEN;
const OUT = "assets";
if (!TOKEN) throw new Error("Set GITHUB_TOKEN (or PROFILE_TOKEN)");

// Repos outside my account that I work on. Languages and card metadata come from these.
const PROJECTS = [
  { name: "sadad", repo: "Abdalrahman-py/sadad", state: "live",
    lines: ["Offline-first debt ledger for small shops.", "Signed on-device ops, synced with receipts."],
    chips: ["kotlin", "compose", "room", "supabase"] },
  { name: "raghif", repo: "ibrahem57/raghif", state: "live",
    lines: ["Digital queue + pre-order for WFP bread", "distribution in Gaza. Batches released by SMS."],
    chips: ["flutter", "supabase", "postgres", "fcm"] },
  { name: "wathiq", repo: "Wathiq-ps/Ai", state: "live",
    lines: ["Legal AI: RAG over a versioned law corpus,", "contract drafting and risk-analysis agents."],
    chips: ["fastapi", "rag", "docker", "railway"] },
  { name: "it-club", repo: "ucas-it-club/IT-Club", state: "live",
    lines: ["Bilingual club site with admin dashboard,", "media library and Sheets-backed signup."],
    chips: ["react", "tanstack", "supabase", "tailwind"] },
  { name: "bayaan", repo: "Abdalrahman-py/bayaan", state: "live",
    lines: ["Quran recitation coach with per-character", "Tajweed feedback, plus published research."],
    chips: ["flutter", "ktor", "wav2vec2", "modal"] },
  // Private repo: no link, no live metadata.
  { name: "madad", repo: null, state: "design",
    lines: ["Generator-network SaaS: offline meter", "readings, payments, admin dashboard."],
    chips: ["flutter", "nextjs", "supabase"] },
];
const LANG_REPOS = PROJECTS.map((p) => p.repo).filter(Boolean);

const C = { bg: "#0d1117", panel: "#161b22", line: "#30363d", text: "#e6edf3", muted: "#8b949e",
  green: "#3fb950", cyan: "#79c0ff", amber: "#d29922", red: "#ff7b72" };
const HEAT = ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"]; // one hue, light to dark steps
// Validated with the dataviz validator (dark, surface #0d1117): all five checks pass in this order.
const LANG_COLORS = ["#388bfd", "#db6d28", "#2ea89a", "#a371f7", "#d9609a"];
const LANG_OTHER = "#6e7681";
const FONT = "'JetBrains Mono','Fira Code','SF Mono',Menlo,Consolas,'DejaVu Sans Mono',monospace";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const gh = { Authorization: `Bearer ${TOKEN}`, "User-Agent": "profile-generator", Accept: "application/vnd.github+json" };

async function rest(path) {
  const r = await fetch(`https://api.github.com${path}`, { headers: gh });
  if (!r.ok) return null;
  return r;
}
async function graphql(query) {
  const r = await fetch("https://api.github.com/graphql", { method: "POST", headers: gh, body: JSON.stringify({ query }) });
  const j = await r.json();
  if (j.errors) throw new Error(JSON.stringify(j.errors));
  return j.data.user;
}

async function commitCount(repo) {
  const r = await rest(`/repos/${repo}/commits?per_page=1`);
  if (!r) return null;
  const last = /[?&]page=(\d+)>; rel="last"/.exec(r.headers.get("link") || "");
  return last ? Number(last[1]) : (await r.json()).length;
}
const ago = (iso) => {
  const d = Math.max(0, Math.floor((Date.now() - new Date(iso)) / 864e5));
  return d === 0 ? "today" : d === 1 ? "1d ago" : d < 60 ? `${d}d ago` : `${Math.floor(d / 30)}mo ago`;
};

// ---------- shared drawing ----------
const style = `<style>text{font-family:${FONT}}.b{font-weight:700}</style>`;
function windowFrame(w, h, title, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}">${style}
<rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="10" fill="${C.bg}" stroke="${C.line}"/>
<path d="M.5 36V10.5a10 10 0 0 1 10-10h${w - 21}a10 10 0 0 1 10 10V36z" fill="${C.panel}"/>
<line x1=".5" y1="36" x2="${w - .5}" y2="36" stroke="${C.line}"/>
<circle cx="22" cy="18" r="5.5" fill="${C.red}"/><circle cx="42" cy="18" r="5.5" fill="${C.amber}"/><circle cx="62" cy="18" r="5.5" fill="${C.green}"/>
<text x="${w / 2}" y="23" text-anchor="middle" font-size="12" fill="${C.muted}">${esc(title)}</text>
${body}</svg>`;
}
const write = (f, s) => { mkdirSync(OUT, { recursive: true }); writeFileSync(`${OUT}/${f}`, s); console.log("wrote", f); };

// ---------- hero ----------
function hero() {
  const cmd = (y, t, cmdText, out, outFill = C.text) => `<g opacity="0"><set attributeName="opacity" to="1" begin="${t}s" fill="freeze"/>
<text x="28" y="${y}" font-size="14" fill="${C.green}">$</text><text x="46" y="${y}" font-size="14" fill="${C.cyan}">${esc(cmdText)}</text>
<text x="46" y="${y + 22}" font-size="14" fill="${outFill}">${esc(out)}</text></g>`;
  const body = `
<text x="28" y="92" font-size="36" class="b" fill="${C.text}">Abdalrahman<tspan fill="${C.green}">_</tspan></text>
<text x="28" y="120" font-size="15" fill="${C.muted}">mobile  /  backend  /  generative AI engineer</text>
<line x1="28" y1="140" x2="852" y2="140" stroke="${C.line}"/>
${cmd(170, 0.4, "cat location", "Gaza, Palestine  -  UCAS, mobile development")}
${cmd(220, 1.2, "ls ~/building", "sadad  raghif  wathiq  it-club  bayaan  madad")}
${cmd(270, 2.0, "echo $FOCUS", "offline-first apps, Postgres-backed systems, LLM pipelines that ship", C.green)}
<g opacity="0"><set attributeName="opacity" to="1" begin="2.8s" fill="freeze"/>
<text x="28" y="320" font-size="14" fill="${C.green}">$</text>
<rect x="46" y="307" width="9" height="16" fill="${C.green}"><animate attributeName="opacity" values="1;1;0;0" keyTimes="0;.5;.5;1" dur="1.1s" repeatCount="indefinite"/></rect></g>`;
  write("hero.svg", windowFrame(880, 346, "abdalrahman@gaza: ~", body));
}

// ---------- project cards ----------
async function cards() {
  for (const p of PROJECTS) {
    const meta = p.repo ? await Promise.all([commitCount(p.repo), rest(`/repos/${p.repo}`).then((r) => r && r.json())]) : [null, null];
    const [commits, info] = meta;
    const days = info ? (Date.now() - new Date(info.pushed_at)) / 864e5 : null;
    const status = p.state === "design" ? ["in design", C.cyan] : days !== null && days < 21 ? ["active", C.green] : ["steady", C.amber];
    let x = 20;
    const chips = p.chips.map((c) => {
      const w = Math.round(c.length * 6.7 + 16);
      const s = `<rect x="${x}" y="86" width="${w}" height="22" rx="11" fill="${C.panel}" stroke="${C.line}"/><text x="${x + w / 2}" y="101" font-size="11" text-anchor="middle" fill="${C.text}">${esc(c)}</text>`;
      x += w + 6;
      return s;
    }).join("");
    const foot = [commits ? `${commits} commits` : null, info ? `pushed ${ago(info.pushed_at)}` : null, p.repo ? null : "private repo"].filter(Boolean).join("  .  ");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="430" height="150" viewBox="0 0 430 150" role="img" aria-label="${esc(p.name)}">${style}
<rect x=".5" y=".5" width="429" height="149" rx="8" fill="${C.bg}" stroke="${C.line}"/>
<rect x=".5" y="14" width="3" height="40" fill="${status[1]}"/>
<text x="20" y="30" font-size="16" class="b" fill="${C.text}"><tspan fill="${C.muted}">~/</tspan>${esc(p.name)}</text>
<circle cx="${430 - 20 - status[0].length * 6.6 - 12}" cy="26" r="4" fill="${status[1]}"/><text x="410" y="30" font-size="11" text-anchor="end" fill="${status[1]}">${status[0]}</text>
<text x="20" y="54" font-size="12" fill="${C.muted}">${esc(p.lines[0])}</text><text x="20" y="70" font-size="12" fill="${C.muted}">${esc(p.lines[1])}</text>
${chips}
<line x1="20" y1="122" x2="410" y2="122" stroke="${C.line}"/>
<text x="20" y="139" font-size="11" fill="${C.muted}">${esc(foot)}</text></svg>`;
    write(`card-${p.name}.svg`, svg);
  }
}

// ---------- analytics ----------
async function stats() {
  const u = await graphql(`{ user(login:"${USER}"){ followers{totalCount}
    contributionsCollection{ contributionCalendar{ totalContributions weeks{ contributionDays{ date contributionCount } } } }
    repositories(ownerAffiliations:OWNER,isFork:false,first:100){ totalCount nodes{ stargazerCount languages(first:6,orderBy:{field:SIZE,direction:DESC}){ edges{ size node{ name } } } } } } }`
  );
  const cal = u.contributionsCollection.contributionCalendar;
  const days = cal.weeks.flatMap((w) => w.contributionDays);
  const active = days.filter((d) => d.contributionCount > 0).length;
  let best = 0, run = 0;
  for (const d of days) { run = d.contributionCount > 0 ? run + 1 : 0; best = Math.max(best, run); }
  let cur = 0;
  for (let i = days.length - 1; i >= 0; i--) { if (days[i].contributionCount > 0) cur++; else if (i !== days.length - 1) break; }
  const stars = u.repositories.nodes.reduce((a, r) => a + r.stargazerCount, 0);

  // languages: own repos + the team repos listed above, by bytes
  const bytes = {};
  for (const r of u.repositories.nodes) for (const e of r.languages.edges) bytes[e.node.name] = (bytes[e.node.name] || 0) + e.size;
  for (const repo of LANG_REPOS.filter((r) => !r.startsWith(`${USER}/`))) {
    const r = await rest(`/repos/${repo}/languages`);
    if (r) for (const [k, v] of Object.entries(await r.json())) bytes[k] = (bytes[k] || 0) + v;
  }
  const skip = new Set(["HTML", "CSS", "Shell", "Blade", "Dockerfile", "Makefile"]);
  const ranked = Object.entries(bytes).filter(([k]) => !skip.has(k)).sort((a, b) => b[1] - a[1]);
  const total = ranked.reduce((a, [, v]) => a + v, 0);
  const top = ranked.slice(0, 5);
  const other = total - top.reduce((a, [, v]) => a + v, 0);
  const segs = [...top.map(([k, v], i) => ({ k, v, c: LANG_COLORS[i] })), ...(other > 0 ? [{ k: "other", v: other, c: LANG_OTHER }] : [])];

  // heatmap
  const nz = days.map((d) => d.contributionCount).filter(Boolean).sort((a, b) => a - b);
  const q = (f) => nz[Math.min(nz.length - 1, Math.floor(nz.length * f))] ?? 0;
  const [q1, q2, q3] = [q(0.25), q(0.5), q(0.75)];
  const level = (n) => (n === 0 ? 0 : n <= q1 ? 1 : n <= q2 ? 2 : n <= q3 ? 3 : 4);
  const X0 = 28, Y0 = 70, CELL = 12, STEP = 15;
  let cells = "", months = "", prevMonth = -1;
  cal.weeks.forEach((w, i) => {
    const m = new Date(w.contributionDays[0].date).getUTCMonth();
    if (m !== prevMonth && i < cal.weeks.length - 2) months += `<text x="${X0 + i * STEP}" y="${Y0 - 8}" font-size="10" fill="${C.muted}">${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][m]}</text>`;
    prevMonth = m;
    w.contributionDays.forEach((d, j) => {
      cells += `<rect x="${X0 + i * STEP}" y="${Y0 + j * STEP}" width="${CELL}" height="${CELL}" rx="2" fill="${HEAT[level(d.contributionCount)]}"><title>${d.date}: ${d.contributionCount}</title></rect>`;
    });
  });
  const kpis = [[cal.totalContributions, "contributions"], [active, "active days"], [`${best}d`, "longest streak"], [`${cur}d`, "current streak"], [u.repositories.totalCount, "repos"], [stars, "stars"]];
  const kpiSvg = kpis.map(([v, l], i) => `<text x="${28 + i * 138}" y="226" font-size="26" class="b" fill="${C.text}">${esc(v)}</text><text x="${28 + i * 138}" y="244" font-size="11" fill="${C.muted}">${esc(l)}</text>`).join("");

  // language bar: 2px surface gaps between segments
  const BAR_W = 824; let bx = 28, bar = "", legend = "", lx = 28;
  for (const s of segs) {
    const w = Math.max(3, (s.v / total) * BAR_W);
    bar += `<rect x="${bx}" y="278" width="${Math.max(1, w - 2)}" height="10" rx="2" fill="${s.c}"/>`;
    bx += w;
    const label = `${s.k} ${Math.round((s.v / total) * 100)}%`;
    legend += `<circle cx="${lx + 4}" cy="311" r="4" fill="${s.c}"/><text x="${lx + 14}" y="315" font-size="11" fill="${C.text}">${esc(label)}</text>`;
    lx += 14 + label.length * 6.8 + 16;
  }
  const less = HEAT.map((c, i) => `<rect x="${700 + i * 15}" y="${Y0 + 7 * STEP + 6}" width="${CELL}" height="${CELL}" rx="2" fill="${c}"/>`).join("");
  const body = `${months}${cells}
<text x="${700 - 8}" y="${Y0 + 7 * STEP + 16}" font-size="10" text-anchor="end" fill="${C.muted}">less</text>${less}<text x="${700 + 5 * 15 + 4}" y="${Y0 + 7 * STEP + 16}" font-size="10" fill="${C.muted}">more</text>
<line x1="28" y1="196" x2="852" y2="196" stroke="${C.line}"/>
${kpiSvg}
<text x="28" y="268" font-size="11" fill="${C.muted}">language mix across the repos above, by bytes</text>
${bar}${legend}`;
  write("activity.svg", windowFrame(880, 340, `~/activity  (updated ${new Date().toISOString().slice(0, 10)})`, body));
}

// ---------- stack ----------
function stack() {
  const rows = [
    ["mobile", ["kotlin", "jetpack compose", "flutter", "dart", "java"]],
    ["backend", ["supabase", "postgresql", "fastapi", "laravel", "firebase", "hono"]],
    ["ai", ["llm agents", "rag", "embeddings + rerank", "evals", "prompt versioning"]],
    ["infra", ["docker", "railway", "linux", "github actions"]],
  ];
  const body = rows.map(([k, v], i) => {
    const y = 68 + i * 30;
    return `<text x="28" y="${y}" font-size="14" fill="${C.cyan}">[${k}]</text><text x="150" y="${y}" font-size="14" fill="${C.text}">${esc(v.join("  .  "))}</text>`;
  }).join("");
  write("stack.svg", windowFrame(880, 170, "~/stack.toml", body));
}

hero();
stack();
await cards();
await stats();
