import { useState } from 'preact/hooks';

const ACTION_VERBS: Record<string, string[]> = {
  engineering: ['Architected', 'Built', 'Developed', 'Implemented', 'Optimized', 'Refactored', 'Migrated', 'Integrated', 'Automated', 'Deployed', 'Designed', 'Shipped', 'Engineered'],
  leadership: ['Led', 'Spearheaded', 'Mentored', 'Coordinated', 'Managed', 'Drove', 'Championed', 'Initiated', 'Collaborated'],
  analysis: ['Analyzed', 'Identified', 'Diagnosed', 'Evaluated', 'Researched', 'Investigated', 'Audited'],
  improvement: ['Reduced', 'Improved', 'Increased', 'Accelerated', 'Streamlined', 'Simplified', 'Enhanced', 'Boosted', 'Eliminated', 'Cut', 'Scaled'],
};

const TEMPLATES = [
  {
    id: 'built',
    label: 'Built / Developed a feature',
    fields: [
      { key: 'verb', label: 'Action Verb', placeholder: 'Built, Architected, Developed…', suggestions: ACTION_VERBS.engineering },
      { key: 'what', label: 'What you built', placeholder: 'e.g. a real-time notification system, a REST API, a CI/CD pipeline' },
      { key: 'tech', label: 'Technologies used', placeholder: 'e.g. React, Node.js, PostgreSQL, Redis' },
      { key: 'result', label: 'Result / Impact', placeholder: 'e.g. reduced latency by 40%, served 50K daily users, cut deploy time by 3x' },
    ],
    generate: (f: Record<string, string>) =>
      `${f.verb || 'Built'} ${f.what}${f.tech ? ` using ${f.tech}` : ''}${f.result ? `, ${f.result}` : ''}.`,
  },
  {
    id: 'optimized',
    label: 'Optimized / Improved performance',
    fields: [
      { key: 'verb', label: 'Action Verb', placeholder: 'Optimized, Reduced, Improved…', suggestions: ACTION_VERBS.improvement },
      { key: 'what', label: 'What was optimized', placeholder: 'e.g. database query performance, API response time, bundle size' },
      { key: 'how', label: 'How (technique)', placeholder: 'e.g. by introducing caching, query indexing, lazy loading' },
      { key: 'metric', label: 'Measurable result', placeholder: 'e.g. from 800ms to 120ms, by 65%, saving $2K/month in cloud costs' },
    ],
    generate: (f: Record<string, string>) =>
      `${f.verb || 'Optimized'} ${f.what}${f.how ? ` by ${f.how}` : ''}${f.metric ? `, improving ${f.metric}` : ''}.`,
  },
  {
    id: 'led',
    label: 'Led / Collaborated on a project',
    fields: [
      { key: 'verb', label: 'Action Verb', placeholder: 'Led, Spearheaded, Collaborated…', suggestions: ACTION_VERBS.leadership },
      { key: 'teamSize', label: 'Team size', placeholder: 'e.g. a team of 4, cross-functional team of 6 engineers' },
      { key: 'what', label: 'What was the project', placeholder: 'e.g. migration from monolith to microservices, redesign of checkout flow' },
      { key: 'result', label: 'Outcome', placeholder: 'e.g. on time and under budget, delivered to 200K users, reduced churn by 15%' },
    ],
    generate: (f: Record<string, string>) =>
      `${f.verb || 'Led'} ${f.teamSize ? `${f.teamSize} in ` : ''}${f.what}${f.result ? `, ${f.result}` : ''}.`,
  },
  {
    id: 'automated',
    label: 'Automated a process',
    fields: [
      { key: 'verb', label: 'Action Verb', placeholder: 'Automated, Streamlined, Eliminated…', suggestions: [...ACTION_VERBS.engineering, ...ACTION_VERBS.improvement] },
      { key: 'process', label: 'Process automated', placeholder: 'e.g. deployment pipeline, test suite, report generation, data ingestion' },
      { key: 'tech', label: 'Tool / Technology', placeholder: 'e.g. GitHub Actions, Python scripts, Airflow, Terraform' },
      { key: 'saving', label: 'Time / cost saving', placeholder: 'e.g. saving 10 hours per week, eliminated manual errors, reduced ops cost by 30%' },
    ],
    generate: (f: Record<string, string>) =>
      `${f.verb || 'Automated'} ${f.process}${f.tech ? ` using ${f.tech}` : ''}${f.saving ? `, ${f.saving}` : ''}.`,
  },
  {
    id: 'reduced',
    label: 'Reduced cost / error / time',
    fields: [
      { key: 'verb', label: 'Action Verb', placeholder: 'Reduced, Cut, Eliminated, Decreased…', suggestions: ACTION_VERBS.improvement },
      { key: 'metric', label: 'What was reduced', placeholder: 'e.g. infrastructure cost, bug rate, deployment time, page load time' },
      { key: 'by', label: 'Reduction amount', placeholder: 'e.g. by 40%, from 8min to 45sec, by $5K/month' },
      { key: 'how', label: 'How achieved', placeholder: 'e.g. by introducing caching layers, consolidating services, rewriting with Rust' },
    ],
    generate: (f: Record<string, string>) =>
      `${f.verb || 'Reduced'} ${f.metric}${f.by ? ` ${f.by}` : ''}${f.how ? ` by ${f.how}` : ''}.`,
  },
  {
    id: 'mentored',
    label: 'Mentored / Grew the team',
    fields: [
      { key: 'verb', label: 'Action Verb', placeholder: 'Mentored, Onboarded, Coached, Grew…', suggestions: ACTION_VERBS.leadership },
      { key: 'who', label: 'Who', placeholder: 'e.g. 3 junior engineers, 2 new hires, interns' },
      { key: 'focus', label: 'Focus area', placeholder: 'e.g. code review practices, system design, TDD, frontend architecture' },
      { key: 'result', label: 'Outcome', placeholder: 'e.g. all promoted within 6 months, cut onboarding time by half' },
    ],
    generate: (f: Record<string, string>) =>
      `${f.verb || 'Mentored'} ${f.who}${f.focus ? ` on ${f.focus}` : ''}${f.result ? `; ${f.result}` : ''}.`,
  },
];

const DEVTOOLKIT_URL = 'https://vicnail.gumroad.com/l/devtoolkit-starter-kit?utm_source=devplaybook&utm_medium=tool&utm_campaign=devtoolkit-starter-kit';

export default function ResumeBulletGenerator() {
  const [templateId, setTemplateId] = useState(TEMPLATES[0].id);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  const template = TEMPLATES.find(t => t.id === templateId)!;
  const bullet = template.generate(fields);
  const wordCount = bullet.split(' ').filter(Boolean).length;

  const handleTemplateChange = (id: string) => {
    setTemplateId(id);
    setFields({});
  };

  const copy = () => {
    navigator.clipboard.writeText(bullet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div class="space-y-6">
      {/* Template selector */}
      <div>
        <label class="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Type of achievement</label>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {TEMPLATES.map(t => (
            <button
              key={t.id}
              onClick={() => handleTemplateChange(t.id)}
              class={`text-left px-4 py-2.5 rounded-lg border text-sm transition-colors ${templateId === t.id ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border bg-bg-card hover:border-primary'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Fields */}
      <div class="bg-bg-card border border-border rounded-xl p-5 space-y-4">
        {template.fields.map(field => (
          <div key={field.key}>
            <label class="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-1.5">{field.label}</label>
            {'suggestions' in field && (field as { suggestions: string[] }).suggestions && (
              <div class="flex flex-wrap gap-1.5 mb-2">
                {(field as { suggestions: string[] }).suggestions.slice(0, 8).map(s => (
                  <button
                    key={s}
                    onClick={() => setFields({ ...fields, [field.key]: s })}
                    class={`text-xs px-2 py-0.5 rounded border transition-colors ${fields[field.key] === s ? 'bg-primary text-white border-primary' : 'border-border hover:border-primary hover:text-primary'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            <input
              type="text"
              placeholder={field.placeholder}
              value={fields[field.key] || ''}
              onInput={(e) => setFields({ ...fields, [field.key]: (e.target as HTMLInputElement).value })}
              class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </div>
        ))}
      </div>

      {/* Preview */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-semibold">Generated Bullet Point</h3>
          <div class="flex items-center gap-3">
            <span class={`text-xs ${wordCount > 25 ? 'text-yellow-400' : 'text-text-muted'}`}>{wordCount} words {wordCount > 25 ? '(consider trimming)' : '✓'}</span>
            <button
              onClick={copy}
              class="text-xs px-3 py-1.5 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors"
            >
              {copied ? '✅ Copied!' : '📋 Copy'}
            </button>
          </div>
        </div>
        <div class="bg-bg rounded-lg p-4 border border-border">
          <p class="text-sm leading-relaxed">• {bullet}</p>
        </div>
        <div class="mt-3 p-3 bg-bg rounded-lg border border-border">
          <p class="text-xs font-semibold text-text-muted mb-1">STAR breakdown</p>
          <div class="grid grid-cols-2 gap-2 text-xs text-text-muted">
            <span><span class="text-primary font-semibold">S</span>ituation: implied by context</span>
            <span><span class="text-primary font-semibold">T</span>ask: {fields['what'] || fields['process'] || fields['metric'] || '—'}</span>
            <span><span class="text-primary font-semibold">A</span>ction: {fields['verb'] || '—'} + {fields['how'] || fields['tech'] || '—'}</span>
            <span><span class="text-primary font-semibold">R</span>esult: {fields['result'] || fields['metric'] || fields['saving'] || '—'}</span>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div class="p-4 bg-bg-card border border-border rounded-xl">
        <p class="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Pro Tips</p>
        <ul class="space-y-1 text-xs text-text-muted">
          <li>• Keep bullets to 15–25 words — concise beats verbose</li>
          <li>• Always lead with a strong past-tense action verb</li>
          <li>• Quantify impact: %, $, time saved, users affected</li>
          <li>• Avoid vague words: "helped with", "worked on", "assisted"</li>
          <li>• One bullet = one accomplishment. Don't combine two things.</li>
        </ul>
      </div>

      {/* Gumroad CTA */}
      <div class="rounded-xl border border-primary/30 bg-gradient-to-br from-bg-card to-bg p-6 text-center">
        <p class="text-xs font-semibold uppercase tracking-widest text-primary mb-2">Expand your toolkit</p>
        <h3 class="text-xl font-bold mb-1">DevToolkit Starter Kit</h3>
        <p class="text-text-muted text-sm mb-4">Build your own developer tools site with 12 pre-built tools, Astro + Preact + Tailwind.</p>
        <a
          href={DEVTOOLKIT_URL}
          target="_blank"
          rel="noopener noreferrer"
          class="inline-block bg-primary hover:bg-primary-dark text-white font-semibold px-6 py-3 rounded-lg text-sm transition-colors"
        >
          Get DevToolkit Starter Kit — $19 →
        </a>
      </div>
    </div>
  );
}
