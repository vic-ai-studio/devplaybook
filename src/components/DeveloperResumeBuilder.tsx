import { useState } from 'preact/hooks';

const DEVTOOLKIT_URL = 'https://vicnail.gumroad.com/l/devtoolkit-starter-kit?utm_source=devplaybook&utm_medium=tool&utm_campaign=developer-resume-builder';

interface ContactInfo {
  name: string; email: string; phone: string; location: string;
  linkedin: string; github: string; portfolio: string;
}
interface Experience {
  id: string; company: string; title: string; start: string; end: string;
  current: boolean; bullets: string;
}
interface Project {
  id: string; name: string; tech: string; url: string; desc: string;
}
interface Education {
  id: string; school: string; degree: string; field: string; year: string; gpa: string;
}

const DEFAULT_CONTACT: ContactInfo = { name: '', email: '', phone: '', location: '', linkedin: '', github: '', portfolio: '' };

function uid() { return Math.random().toString(36).slice(2, 9); }

function buildMarkdown(
  contact: ContactInfo,
  summary: string,
  skills: string,
  experiences: Experience[],
  projects: Project[],
  education: Education[],
): string {
  const lines: string[] = [];

  // Header
  lines.push(`# ${contact.name || 'Your Name'}`);
  const contactParts = [contact.email, contact.phone, contact.location].filter(Boolean);
  if (contactParts.length) lines.push(contactParts.join(' | '));
  const linkParts = [
    contact.linkedin && `[LinkedIn](${contact.linkedin})`,
    contact.github && `[GitHub](${contact.github})`,
    contact.portfolio && `[Portfolio](${contact.portfolio})`,
  ].filter(Boolean);
  if (linkParts.length) lines.push(linkParts.join(' | '));
  lines.push('');

  // Summary
  if (summary.trim()) {
    lines.push('## Summary');
    lines.push(summary.trim());
    lines.push('');
  }

  // Skills
  if (skills.trim()) {
    lines.push('## Skills');
    lines.push(skills.trim());
    lines.push('');
  }

  // Experience
  const exps = experiences.filter(e => e.company || e.title);
  if (exps.length) {
    lines.push('## Experience');
    for (const e of exps) {
      lines.push(`### ${e.title}${e.company ? ` — ${e.company}` : ''}`);
      lines.push(`*${e.start || 'Start'}* – *${e.current ? 'Present' : (e.end || 'End')}*`);
      if (e.bullets.trim()) {
        for (const b of e.bullets.split('\n').filter(Boolean)) {
          lines.push(`- ${b.replace(/^[-•]\s*/, '')}`);
        }
      }
      lines.push('');
    }
  }

  // Projects
  const projs = projects.filter(p => p.name);
  if (projs.length) {
    lines.push('## Projects');
    for (const p of projs) {
      const nameWithLink = p.url ? `[${p.name}](${p.url})` : p.name;
      lines.push(`### ${nameWithLink}${p.tech ? ` — ${p.tech}` : ''}`);
      if (p.desc) lines.push(p.desc);
      lines.push('');
    }
  }

  // Education
  const edus = education.filter(e => e.school);
  if (edus.length) {
    lines.push('## Education');
    for (const e of edus) {
      lines.push(`### ${e.degree}${e.field ? ` in ${e.field}` : ''} — ${e.school}`);
      lines.push(`*${e.year || 'Year'}*${e.gpa ? ` | GPA: ${e.gpa}` : ''}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

type Section = 'contact' | 'summary' | 'skills' | 'experience' | 'projects' | 'education';

export default function DeveloperResumeBuilder() {
  const [activeSection, setActiveSection] = useState<Section>('contact');
  const [contact, setContact] = useState<ContactInfo>(DEFAULT_CONTACT);
  const [summary, setSummary] = useState('');
  const [skills, setSkills] = useState('');
  const [experiences, setExperiences] = useState<Experience[]>([
    { id: uid(), company: '', title: '', start: '', end: '', current: false, bullets: '' },
  ]);
  const [projects, setProjects] = useState<Project[]>([
    { id: uid(), name: '', tech: '', url: '', desc: '' },
  ]);
  const [education, setEducation] = useState<Education[]>([
    { id: uid(), school: '', degree: '', field: '', year: '', gpa: '' },
  ]);
  const [copied, setCopied] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const md = buildMarkdown(contact, summary, skills, experiences, projects, education);
  const json = JSON.stringify({ contact, summary, skills, experiences, projects, education }, null, 2);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const updateContact = (k: keyof ContactInfo, v: string) => setContact(c => ({ ...c, [k]: v }));
  const updateExp = (id: string, k: keyof Experience, v: string | boolean) =>
    setExperiences(es => es.map(e => e.id === id ? { ...e, [k]: v } : e));
  const updateProj = (id: string, k: keyof Project, v: string) =>
    setProjects(ps => ps.map(p => p.id === id ? { ...p, [k]: v } : p));
  const updateEdu = (id: string, k: keyof Education, v: string) =>
    setEducation(es => es.map(e => e.id === id ? { ...e, [k]: v } : e));

  const inputClass = 'w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors';
  const labelClass = 'block text-xs font-medium text-text-muted mb-1';

  const SECTIONS: { id: Section; label: string }[] = [
    { id: 'contact', label: 'Contact' },
    { id: 'summary', label: 'Summary' },
    { id: 'skills', label: 'Skills' },
    { id: 'experience', label: 'Experience' },
    { id: 'projects', label: 'Projects' },
    { id: 'education', label: 'Education' },
  ];

  return (
    <div class="space-y-4">
      {/* Section tabs */}
      <div class="flex gap-1 flex-wrap">
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            class={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeSection === s.id ? 'bg-primary text-white' : 'bg-bg-card border border-border text-text-muted hover:border-primary/50'}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Contact */}
      {activeSection === 'contact' && (
        <div class="space-y-3">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(['name', 'email', 'phone', 'location', 'linkedin', 'github', 'portfolio'] as (keyof ContactInfo)[]).map(k => (
              <div key={k}>
                <label class={labelClass}>{k.charAt(0).toUpperCase() + k.slice(1)}</label>
                <input type="text" class={inputClass} value={contact[k]}
                  placeholder={k === 'linkedin' ? 'linkedin.com/in/yourname' : k === 'github' ? 'github.com/yourname' : ''}
                  onInput={e => updateContact(k, (e.target as HTMLInputElement).value)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      {activeSection === 'summary' && (
        <div>
          <label class={labelClass}>Professional Summary (2-4 sentences, ATS-friendly)</label>
          <textarea
            class={`${inputClass} h-32 resize-none`}
            placeholder="Results-driven software engineer with 5+ years building scalable web applications. Specializes in React, Node.js, and cloud infrastructure. Led teams of 4-6 engineers delivering products to 100K+ users."
            value={summary}
            onInput={e => setSummary((e.target as HTMLTextAreaElement).value)}
          />
          <p class="text-xs text-text-muted mt-1">{summary.split(' ').filter(Boolean).length} words</p>
        </div>
      )}

      {/* Skills */}
      {activeSection === 'skills' && (
        <div>
          <label class={labelClass}>Skills (one line per category, or comma-separated)</label>
          <textarea
            class={`${inputClass} h-40 resize-none font-mono`}
            placeholder={`Languages: JavaScript, TypeScript, Python, Go\nFrontend: React, Next.js, Tailwind CSS, Vue\nBackend: Node.js, Express, FastAPI, PostgreSQL\nCloud: AWS (EC2, S3, Lambda), Vercel, Docker, Kubernetes\nTools: Git, GitHub Actions, Terraform, Datadog`}
            value={skills}
            onInput={e => setSkills((e.target as HTMLTextAreaElement).value)}
          />
        </div>
      )}

      {/* Experience */}
      {activeSection === 'experience' && (
        <div class="space-y-4">
          {experiences.map((exp, i) => (
            <div key={exp.id} class="p-4 rounded-lg border border-border bg-bg-card space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium">Position {i + 1}</span>
                {experiences.length > 1 && (
                  <button onClick={() => setExperiences(es => es.filter(e => e.id !== exp.id))}
                    class="text-xs text-red-400 hover:underline">Remove</button>
                )}
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label class={labelClass}>Job Title</label>
                  <input class={inputClass} value={exp.title} placeholder="Senior Software Engineer"
                    onInput={e => updateExp(exp.id, 'title', (e.target as HTMLInputElement).value)} /></div>
                <div><label class={labelClass}>Company</label>
                  <input class={inputClass} value={exp.company} placeholder="Acme Corp"
                    onInput={e => updateExp(exp.id, 'company', (e.target as HTMLInputElement).value)} /></div>
                <div><label class={labelClass}>Start Date</label>
                  <input class={inputClass} value={exp.start} placeholder="Jan 2022"
                    onInput={e => updateExp(exp.id, 'start', (e.target as HTMLInputElement).value)} /></div>
                <div>
                  <label class={labelClass}>End Date</label>
                  <input class={inputClass} value={exp.end} placeholder="Dec 2024"
                    disabled={exp.current}
                    onInput={e => updateExp(exp.id, 'end', (e.target as HTMLInputElement).value)} />
                  <label class="flex items-center gap-2 text-xs text-text-muted mt-1 cursor-pointer">
                    <input type="checkbox" checked={exp.current}
                      onChange={e => updateExp(exp.id, 'current', (e.target as HTMLInputElement).checked)} />
                    Current role
                  </label>
                </div>
              </div>
              <div>
                <label class={labelClass}>Bullet points (one per line — use action verbs + metrics)</label>
                <textarea class={`${inputClass} h-28 resize-none`}
                  placeholder={"Built real-time dashboard serving 50K users, reducing latency by 40%\nLed migration from monolith to microservices, cutting deploy time from 45min to 8min\nMentored 3 junior engineers; all promoted within 12 months"}
                  value={exp.bullets}
                  onInput={e => updateExp(exp.id, 'bullets', (e.target as HTMLTextAreaElement).value)} />
              </div>
            </div>
          ))}
          <button onClick={() => setExperiences(es => [...es, { id: uid(), company: '', title: '', start: '', end: '', current: false, bullets: '' }])}
            class="text-sm text-primary hover:underline">+ Add position</button>
        </div>
      )}

      {/* Projects */}
      {activeSection === 'projects' && (
        <div class="space-y-4">
          {projects.map((p, i) => (
            <div key={p.id} class="p-4 rounded-lg border border-border bg-bg-card space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium">Project {i + 1}</span>
                {projects.length > 1 && (
                  <button onClick={() => setProjects(ps => ps.filter(x => x.id !== p.id))}
                    class="text-xs text-red-400 hover:underline">Remove</button>
                )}
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label class={labelClass}>Project Name</label>
                  <input class={inputClass} value={p.name} placeholder="DevPlaybook"
                    onInput={e => updateProj(p.id, 'name', (e.target as HTMLInputElement).value)} /></div>
                <div><label class={labelClass}>Tech Stack</label>
                  <input class={inputClass} value={p.tech} placeholder="React, Node.js, PostgreSQL"
                    onInput={e => updateProj(p.id, 'tech', (e.target as HTMLInputElement).value)} /></div>
                <div class="sm:col-span-2"><label class={labelClass}>URL (optional)</label>
                  <input class={inputClass} value={p.url} placeholder="https://github.com/you/project"
                    onInput={e => updateProj(p.id, 'url', (e.target as HTMLInputElement).value)} /></div>
              </div>
              <div><label class={labelClass}>Description (1-2 sentences)</label>
                <textarea class={`${inputClass} h-20 resize-none`}
                  placeholder="Developer tools platform with 80+ free tools used by 10K+ developers monthly."
                  value={p.desc}
                  onInput={e => updateProj(p.id, 'desc', (e.target as HTMLTextAreaElement).value)} /></div>
            </div>
          ))}
          <button onClick={() => setProjects(ps => [...ps, { id: uid(), name: '', tech: '', url: '', desc: '' }])}
            class="text-sm text-primary hover:underline">+ Add project</button>
        </div>
      )}

      {/* Education */}
      {activeSection === 'education' && (
        <div class="space-y-4">
          {education.map((e, i) => (
            <div key={e.id} class="p-4 rounded-lg border border-border bg-bg-card space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium">Education {i + 1}</span>
                {education.length > 1 && (
                  <button onClick={() => setEducation(es => es.filter(x => x.id !== e.id))}
                    class="text-xs text-red-400 hover:underline">Remove</button>
                )}
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label class={labelClass}>School</label>
                  <input class={inputClass} value={e.school} placeholder="MIT"
                    onInput={ev => updateEdu(e.id, 'school', (ev.target as HTMLInputElement).value)} /></div>
                <div><label class={labelClass}>Degree</label>
                  <input class={inputClass} value={e.degree} placeholder="B.S."
                    onInput={ev => updateEdu(e.id, 'degree', (ev.target as HTMLInputElement).value)} /></div>
                <div><label class={labelClass}>Field of Study</label>
                  <input class={inputClass} value={e.field} placeholder="Computer Science"
                    onInput={ev => updateEdu(e.id, 'field', (ev.target as HTMLInputElement).value)} /></div>
                <div><label class={labelClass}>Graduation Year</label>
                  <input class={inputClass} value={e.year} placeholder="2020"
                    onInput={ev => updateEdu(e.id, 'year', (ev.target as HTMLInputElement).value)} /></div>
                <div><label class={labelClass}>GPA (optional)</label>
                  <input class={inputClass} value={e.gpa} placeholder="3.8/4.0"
                    onInput={ev => updateEdu(e.id, 'gpa', (ev.target as HTMLInputElement).value)} /></div>
              </div>
            </div>
          ))}
          <button onClick={() => setEducation(es => [...es, { id: uid(), school: '', degree: '', field: '', year: '', gpa: '' }])}
            class="text-sm text-primary hover:underline">+ Add education</button>
        </div>
      )}

      {/* Output */}
      <div class="border-t border-border pt-4 space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold">Resume Output</h3>
          <button onClick={() => setShowPreview(v => !v)} class="text-xs text-primary hover:underline">
            {showPreview ? 'Hide preview' : 'Show preview'}
          </button>
        </div>

        {showPreview && (
          <pre class="text-xs bg-bg-card border border-border rounded-lg p-4 overflow-auto max-h-80 whitespace-pre-wrap font-mono text-text">{md}</pre>
        )}

        <div class="flex flex-wrap gap-2">
          <button onClick={() => copy(md, 'md')}
            class="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            {copied === 'md' ? 'Copied!' : 'Copy Markdown'}
          </button>
          <button onClick={() => copy(json, 'json')}
            class="px-4 py-2 bg-bg-card border border-border text-text rounded-lg text-sm hover:border-primary/50 transition-colors">
            {copied === 'json' ? 'Copied!' : 'Export JSON'}
          </button>
          <a
            href={`data:text/markdown;charset=utf-8,${encodeURIComponent(md)}`}
            download={`${contact.name || 'resume'}.md`}
            class="px-4 py-2 bg-bg-card border border-border text-text rounded-lg text-sm hover:border-primary/50 transition-colors"
          >
            Download .md
          </a>
        </div>

        <p class="text-xs text-text-muted">
          Want ATS-optimized resume templates and interview prep resources?{' '}
          <a href={DEVTOOLKIT_URL} target="_blank" rel="noopener" class="text-primary hover:underline">
            Get the DevToolkit Starter Kit →
          </a>
        </p>
      </div>
    </div>
  );
}
