import { generateReadme, parseRepoInput, scoreReadme, slugFileName, templates } from "./generator.js";

const STORAGE_KEY = "readme-studio:v1";

const defaults = {
  template: "professional",
  name: "",
  description: "",
  longDescription: "",
  repository: "",
  demo: "",
  author: "",
  website: "",
  version: "",
  license: "MIT",
  features: "",
  tech: "",
  requirements: "",
  installation: "git clone https://github.com/username/project.git\ncd project\nnpm install",
  usage: "npm start",
  scripts: "",
  roadmap: "",
  contributing: "",
  faq: "",
  badges: true,
  sectionOrder: [...templates.professional.sections],
  enabledSections: {},
  customSections: []
};

let state = loadState();
let activeTab = "preview";
let saveTimer;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function loadState() {
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
  } catch {
    return structuredClone(defaults);
  }
}

function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    setStatus("Draft saved");
  }, 180);
}

function setStatus(message, error = false) {
  const el = $("#status");
  el.textContent = message;
  el.classList.toggle("error", error);
  clearTimeout(setStatus.timer);
  setStatus.timer = setTimeout(() => { el.textContent = "Saved locally"; el.classList.remove("error"); }, 2400);
}

function applyStateToForm() {
  $$("[data-field]").forEach((el) => {
    const key = el.dataset.field;
    if (el.type === "checkbox") el.checked = Boolean(state[key]);
    else el.value = state[key] ?? "";
  });
  $("#template").value = state.template;
}

function templateChanged(value) {
  const template = templates[value] || templates.professional;
  state.template = value;
  state.sectionOrder = [...template.sections];
  renderSections();
  update();
}

function renderSections() {
  const host = $("#sections");
  host.innerHTML = "";
  state.sectionOrder.forEach((key, index) => {
    const label = key[0].toUpperCase() + key.slice(1);
    const row = document.createElement("div");
    row.className = "section-row";
    row.innerHTML = `
      <label><input type="checkbox" data-section="${key}" ${state.enabledSections[key] === false ? "" : "checked"}> ${label}</label>
      <div class="move-buttons">
        <button type="button" class="icon-button" data-move="${index}" data-dir="-1" aria-label="Move ${label} up">↑</button>
        <button type="button" class="icon-button" data-move="${index}" data-dir="1" aria-label="Move ${label} down">↓</button>
      </div>`;
    host.appendChild(row);
  });

  $$("[data-section]").forEach((el) => el.addEventListener("change", () => {
    state.enabledSections[el.dataset.section] = el.checked;
    update();
  }));

  $$("[data-move]").forEach((button) => button.addEventListener("click", () => {
    const from = Number(button.dataset.move);
    const to = from + Number(button.dataset.dir);
    if (to < 0 || to >= state.sectionOrder.length) return;
    [state.sectionOrder[from], state.sectionOrder[to]] = [state.sectionOrder[to], state.sectionOrder[from]];
    renderSections();
    update();
  }));
}

function escapeHtml(value = "") {
  return value.replace(/[&<>"']/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[char]));
}

function inlineMd(text) {
  return escapeHtml(text)
    .replace(/\`([^\`]+)\`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
}

function markdownToHtml(md) {
  const lines = md.split("\n");
  let html = "";
  let inCode = false;
  let code = [];
  let list = null;
  let table = [];

  const flushList = () => {
    if (!list) return;
    html += `<${list.type}>${list.items.map((x) => `<li>${inlineMd(x)}</li>`).join("")}</${list.type}>`;
    list = null;
  };
  const flushTable = () => {
    if (!table.length) return;
    const rows = table.filter((r) => !/^\s*\|?\s*:?-+/.test(r));
    if (rows.length) {
      const cells = (r) => r.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      html += "<table>";
      rows.forEach((r, i) => {
        html += "<tr>" + cells(r).map((c) => `<${i ? "td" : "th"}>${inlineMd(c)}</${i ? "td" : "th"}>`).join("") + "</tr>";
      });
      html += "</table>";
    }
    table = [];
  };

  for (const line of lines) {
    if (line.startsWith("\`\`\`")) {
      flushList(); flushTable();
      if (inCode) {
        html += `<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`;
        code = [];
      }
      inCode = !inCode;
      continue;
    }
    if (inCode) { code.push(line); continue; }
    if (/^\|.+\|$/.test(line)) { flushList(); table.push(line); continue; }
    flushTable();

    const heading = line.match(/^(#{1,6})\s+(.+)/);
    if (heading) {
      flushList();
      const level = heading[1].length;
      html += `<h${level}>${inlineMd(heading[2])}</h${level}>`;
      continue;
    }
    const task = line.match(/^- \[([ xX])\]\s+(.+)/);
    if (task) {
      if (!list || list.type !== "ul") { flushList(); list = {type:"ul",items:[]}; }
      list.items.push((task[1].toLowerCase() === "x" ? "☑ " : "☐ ") + task[2]);
      continue;
    }
    const bullet = line.match(/^[-*]\s+(.+)/);
    if (bullet) {
      if (!list || list.type !== "ul") { flushList(); list = {type:"ul",items:[]}; }
      list.items.push(bullet[1]);
      continue;
    }
    const ordered = line.match(/^\d+\.\s+(.+)/);
    if (ordered) {
      if (!list || list.type !== "ol") { flushList(); list = {type:"ol",items:[]}; }
      list.items.push(ordered[1]);
      continue;
    }

    flushList();
    if (line.trim()) {
      if (/^!\[[^\]]*\]\(https?:\/\//.test(line.trim())) {
        html += `<p class="badges">${line.split(/\s+(?=!\[)/).map((part) => {
          const m = part.match(/^!\[([^\]]*)\]\((https?:\/\/[^)]+)\)$/);
          return m ? `<img src="${escapeHtml(m[2])}" alt="${escapeHtml(m[1])}">` : inlineMd(part);
        }).join(" ")}</p>`;
      } else html += `<p>${inlineMd(line)}</p>`;
    }
  }
  flushList(); flushTable();
  return html;
}

function renderScore() {
  const result = scoreReadme(state);
  $("#scoreNumber").textContent = result.score;
  $("#scoreRing").style.setProperty("--score", result.score);
  $("#scoreHint").textContent = result.missing[0] || "Excellent — your README is well covered.";
}

function update() {
  const md = generateReadme(state);
  $("#raw").value = md;
  $("#preview").innerHTML = markdownToHtml(md);
  renderScore();
  persist();
}

async function importGitHub() {
  const parsed = parseRepoInput($("#repoImport").value);
  if (!parsed) return setStatus("Use owner/repository or a GitHub URL", true);

  const button = $("#importBtn");
  button.disabled = true;
  button.textContent = "Importing…";
  try {
    const response = await fetch(`https://api.github.com/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}`, {
      headers: { Accept: "application/vnd.github+json" }
    });
    if (!response.ok) throw new Error(response.status === 404 ? "Repository not found or private" : "GitHub request failed");
    const repo = await response.json();

    state.repository = repo.html_url || `${parsed.owner}/${parsed.repo}`;
    state.name = repo.name || state.name;
    state.description = repo.description || state.description;
    state.website = repo.homepage || state.website;
    state.license = repo.license?.spdx_id && repo.license.spdx_id !== "NOASSERTION" ? repo.license.spdx_id : state.license;
    state.tech = repo.language ? repo.language : state.tech;

    try {
      const packageResponse = await fetch(`https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${repo.default_branch}/package.json`);
      if (packageResponse.ok) {
        const pkg = await packageResponse.json();
        state.version = pkg.version || state.version;
        const scriptEntries = Object.entries(pkg.scripts || {});
        if (scriptEntries.length) state.scripts = scriptEntries.map(([name, cmd]) => `${name}: ${cmd}`).join("\n");
      }
    } catch {}

    applyStateToForm();
    update();
    setStatus("Repository imported");
  } catch (error) {
    setStatus(error.message || "Could not import repository", true);
  } finally {
    button.disabled = false;
    button.textContent = "Import";
  }
}

async function copyMarkdown() {
  try {
    await navigator.clipboard.writeText(generateReadme(state));
    setStatus("Markdown copied");
  } catch {
    $("#raw").select();
    document.execCommand("copy");
    setStatus("Markdown copied");
  }
}

function download() {
  const blob = new Blob([generateReadme(state)], { type: "text/markdown;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement("a"), { href, download: slugFileName(state.name || "README") });
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(href), 500);
  setStatus("README downloaded");
}

function reset() {
  if (!confirm("Clear this draft and start again?")) return;
  state = structuredClone(defaults);
  localStorage.removeItem(STORAGE_KEY);
  applyStateToForm();
  renderSections();
  update();
  setStatus("New README started");
}

function addCustomSection() {
  const title = prompt("Section title");
  if (!title) return;
  const body = prompt("Section content");
  if (!body) return;
  state.customSections = [...(state.customSections || []), { title, body }];
  update();
  setStatus("Custom section added");
}

function setTab(tab) {
  activeTab = tab;
  $$(".tab").forEach((x) => x.classList.toggle("active", x.dataset.tab === tab));
  $("#preview").hidden = tab !== "preview";
  $("#raw").hidden = tab !== "markdown";
}

function init() {
  applyStateToForm();
  renderSections();

  $$("[data-field]").forEach((el) => el.addEventListener("input", () => {
    state[el.dataset.field] = el.type === "checkbox" ? el.checked : el.value;
    update();
  }));

  $("#template").addEventListener("change", (event) => templateChanged(event.target.value));
  $("#importBtn").addEventListener("click", importGitHub);
  $("#repoImport").addEventListener("keydown", (e) => { if (e.key === "Enter") importGitHub(); });
  $("#copyBtn").addEventListener("click", copyMarkdown);
  $("#downloadBtn").addEventListener("click", download);
  $("#resetBtn").addEventListener("click", reset);
  $("#customBtn").addEventListener("click", addCustomSection);

  $$(".tab").forEach((button) => button.addEventListener("click", () => setTab(button.dataset.tab)));

  $("#themeBtn").addEventListener("click", () => {
    const dark = document.documentElement.dataset.theme !== "light";
    document.documentElement.dataset.theme = dark ? "light" : "dark";
    localStorage.setItem("readme-studio:theme", document.documentElement.dataset.theme);
  });

  const theme = localStorage.getItem("readme-studio:theme");
  if (theme) document.documentElement.dataset.theme = theme;

  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      download();
    }
  });

  update();
}

init();
