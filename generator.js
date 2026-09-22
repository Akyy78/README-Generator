export const templates = {
  professional: {
    label: "Professional",
    description: "A complete README for serious projects.",
    sections: ["about", "features", "tech", "installation", "usage", "scripts", "roadmap", "contributing", "faq", "license", "contact"]
  },
  minimal: {
    label: "Minimal",
    description: "Short and clean.",
    sections: ["about", "installation", "usage", "license"]
  },
  opensource: {
    label: "Open Source",
    description: "Optimized for community projects.",
    sections: ["about", "features", "installation", "usage", "roadmap", "contributing", "license", "contact"]
  },
  cli: {
    label: "CLI",
    description: "Focused on install commands and examples.",
    sections: ["about", "features", "installation", "usage", "scripts", "license"]
  },
  app: {
    label: "App",
    description: "Great for web and mobile applications.",
    sections: ["about", "features", "tech", "installation", "usage", "roadmap", "contact"]
  }
};

const sectionTitle = {
  about: "About",
  features: "Features",
  tech: "Built With",
  installation: "Getting Started",
  usage: "Usage",
  scripts: "Scripts",
  roadmap: "Roadmap",
  contributing: "Contributing",
  faq: "FAQ",
  license: "License",
  contact: "Contact"
};

export function sanitizeUrl(value = "") {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

export function parseRepoInput(value = "") {
  const raw = value.trim().replace(/\.git$/, "");
  const match = raw.match(/(?:github\.com\/)?([\w.-]+)\/([\w.-]+)$/i);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}

export function normalizeLines(value = "") {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function slugFileName(name = "README") {
  const safe = name.trim().replace(/[<>:"/\\|?*\x00-\x1F]/g, "").replace(/\s+/g, "-");
  return (safe || "README") + ".md";
}

function escapeInline(text = "") {
  return text.replace(/[\[\]]/g, "\\$&");
}

function codeBlock(lang, code) {
  const clean = String(code || "").trim();
  return clean ? "\n\`\`\`" + (lang || "") + "\n" + clean + "\n\`\`\`\n" : "";
}

function bullets(value, prefix = "- ") {
  return normalizeLines(value).map((item) => prefix + item).join("\n");
}

function badge(label, message, color = "5865f2") {
  const enc = (v) => encodeURIComponent(v).replace(/-/g, "--");
  return `![${label}](https://img.shields.io/badge/${enc(label)}-${enc(message)}-${color})`;
}

function githubBadges(state) {
  const parsed = parseRepoInput(state.repository);
  if (!parsed || !state.badges) return "";
  const base = `https://img.shields.io/github`;
  const repo = `${parsed.owner}/${parsed.repo}`;
  return [
    `![Stars](${base}/stars/${repo}?style=flat)`,
    `![Forks](${base}/forks/${repo}?style=flat)`,
    `![Issues](${base}/issues/${repo})`,
    state.license ? badge("license", state.license, "22c55e") : ""
  ].filter(Boolean).join(" ");
}

function renderSection(key, s) {
  switch (key) {
    case "about":
      if (!s.description && !s.longDescription) return "";
      return `## ${sectionTitle[key]}\n\n${s.longDescription || s.description}\n`;
    case "features": {
      const body = bullets(s.features);
      return body ? `## ${sectionTitle[key]}\n\n${body}\n` : "";
    }
    case "tech": {
      const tech = normalizeLines(s.tech);
      return tech.length ? `## ${sectionTitle[key]}\n\n${tech.map((x) => `- **${escapeInline(x)}**`).join("\n")}\n` : "";
    }
    case "installation": {
      if (!s.installation) return "";
      const prereq = s.requirements ? `### Prerequisites\n\n${bullets(s.requirements)}\n\n` : "";
      return `## ${sectionTitle[key]}\n\n${prereq}### Installation\n${codeBlock("bash", s.installation)}`;
    }
    case "usage":
      return s.usage ? `## ${sectionTitle[key]}\n${codeBlock("bash", s.usage)}` : "";
    case "scripts": {
      const rows = normalizeLines(s.scripts).map((line) => {
        const [name, ...rest] = line.split(":");
        return `| \`${name.trim()}\` | ${(rest.join(":") || "Run script").trim()} |`;
      });
      return rows.length ? `## ${sectionTitle[key]}\n\n| Command | Description |\n| --- | --- |\n${rows.join("\n")}\n` : "";
    }
    case "roadmap": {
      const body = bullets(s.roadmap, "- [ ] ");
      return body ? `## ${sectionTitle[key]}\n\n${body}\n` : "";
    }
    case "contributing":
      return s.contributing ? `## ${sectionTitle[key]}\n\n${s.contributing}\n` :
        `## ${sectionTitle[key]}\n\nContributions are welcome. Fork the repository, create a feature branch, commit your changes and open a pull request.\n`;
    case "faq": {
      const pairs = normalizeLines(s.faq).map((line) => {
        const [q, ...a] = line.split("|");
        return a.length ? `### ${q.trim()}\n\n${a.join("|").trim()}\n` : "";
      }).filter(Boolean);
      return pairs.length ? `## ${sectionTitle[key]}\n\n${pairs.join("\n")}\n` : "";
    }
    case "license":
      return s.license ? `## ${sectionTitle[key]}\n\nDistributed under the **${escapeInline(s.license)}** license.\n` : "";
    case "contact": {
      const links = [];
      const site = sanitizeUrl(s.website);
      const repo = sanitizeUrl(s.repository.startsWith("http") ? s.repository : (parseRepoInput(s.repository) ? `https://github.com/${s.repository.replace(/^.*github\.com\//, "")}` : ""));
      if (s.author) links.push(`**${escapeInline(s.author)}**`);
      if (site) links.push(`[Website](${site})`);
      if (repo) links.push(`[Repository](${repo})`);
      return links.length ? `## ${sectionTitle[key]}\n\n${links.join(" · ")}\n` : "";
    }
    default:
      return "";
  }
}

export function generateReadme(state) {
  const s = { ...state };
  const title = (s.name || "Untitled Project").trim();
  const subtitle = (s.description || "").trim();
  const out = [`# ${escapeInline(title)}`];

  if (subtitle) out.push(subtitle);

  const badges = githubBadges(s);
  if (badges) out.push(badges);

  const demo = sanitizeUrl(s.demo);
  if (demo) out.push(`**Live demo:** [${demo}](${demo})`);

  const order = Array.isArray(s.sectionOrder) && s.sectionOrder.length
    ? s.sectionOrder
    : templates[s.template || "professional"].sections;

  for (const key of order) {
    if (s.enabledSections && s.enabledSections[key] === false) continue;
    const rendered = renderSection(key, s).trim();
    if (rendered) out.push(rendered);
  }

  if (Array.isArray(s.customSections)) {
    for (const item of s.customSections) {
      if (!item || !item.title || !item.body) continue;
      out.push(`## ${escapeInline(item.title.trim())}\n\n${item.body.trim()}`);
    }
  }

  return out.filter(Boolean).join("\n\n").trim() + "\n";
}

export function scoreReadme(state) {
  const checks = [
    [state.name, "Add a project name"],
    [state.description, "Add a short description"],
    [state.longDescription, "Explain what the project does"],
    [state.features, "List key features"],
    [state.installation, "Add installation steps"],
    [state.usage, "Add usage examples"],
    [state.license, "Choose a license"],
    [state.repository, "Link the GitHub repository"],
    [state.tech, "List the main technologies"],
    [state.author, "Add contact or author information"]
  ];

  const passed = checks.filter(([value]) => String(value || "").trim()).length;
  return {
    score: Math.round((passed / checks.length) * 100),
    missing: checks.filter(([value]) => !String(value || "").trim()).map(([, hint]) => hint)
  };
}
