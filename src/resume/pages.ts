import type { Job, Project, ResumeProfile } from "./profile";

function esc(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function jobHtml(job: Job): string {
  return `
    <article class="rp-card">
      <h3>${esc(job.company)}</h3>
      <p class="rp-meta">${esc(job.title)} · ${esc(job.dates)}${job.location ? ` · ${esc(job.location)}` : ""}</p>
      <ul>${job.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>
    </article>`;
}

function projectHtml(project: Project): string {
  const link = project.url
    ? `<p><a href="${esc(project.url)}" target="_blank" rel="noreferrer">${esc(project.url)}</a></p>`
    : "";
  return `
    <article class="rp-card">
      <h3>${esc(project.name)}</h3>
      <p>${esc(project.blurb)}</p>
      <p class="rp-meta">${project.stack.map(esc).join(" · ")}</p>
      ${link}
    </article>`;
}

export function aboutHtml(p: ResumeProfile): string {
  return `
    <header class="rp-hero">
      <p class="rp-kicker">abdulmuhaimin.my</p>
      <h1>${esc(p.name)}</h1>
      <p class="rp-title">${esc(p.title)}</p>
      <p class="rp-meta">${esc(p.location)}</p>
    </header>
    <p class="rp-lead">${esc(p.summary)}</p>`;
}

export function experienceHtml(p: ResumeProfile): string {
  return `<h2>Experience</h2>${p.experience.map(jobHtml).join("")}`;
}

export function projectsHtml(p: ResumeProfile): string {
  return `<h2>Projects</h2>${p.projects.map(projectHtml).join("")}`;
}

export function skillsHtml(p: ResumeProfile): string {
  return `
    <h2>Technical Skills</h2>
    <ul class="rp-tags">${p.skills.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>`;
}

export function contactHtml(p: ResumeProfile): string {
  const c = p.contact;
  return `
    <h2>Get in touch</h2>
    <p>${esc(p.location)}</p>
    <ul class="rp-contact">
      <li>Phone · ${esc(c.phone ?? "")}</li>
      <li>Web · <a href="https://${esc(c.website)}" target="_blank" rel="noreferrer">${esc(c.website)}</a></li>
      <li>GitHub · <a href="https://${esc(c.github)}" target="_blank" rel="noreferrer">${esc(c.github)}</a></li>
      <li>LinkedIn · <a href="https://${esc(c.linkedin)}" target="_blank" rel="noreferrer">${esc(c.linkedin)}</a></li>
    </ul>
    <p>Available for freelance and full-time opportunities.</p>`;
}

export function fullSiteHtml(p: ResumeProfile): string {
  return [aboutHtml(p), experienceHtml(p), projectsHtml(p), skillsHtml(p), contactHtml(p)].join("");
}
