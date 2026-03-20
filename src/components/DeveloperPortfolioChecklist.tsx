import { useState, useEffect } from 'preact/hooks';

interface Item {
  id: string;
  text: string;
  why: string;
  priority: 'must' | 'should' | 'nice';
}

interface Section {
  title: string;
  icon: string;
  items: Item[];
}

const SECTIONS: Section[] = [
  {
    title: 'Foundation',
    icon: '🏗️',
    items: [
      { id: 'f1', text: 'Custom domain (not username.github.io)', why: 'Looks professional. yourname.dev costs ~$12/year. Hiring managers notice.', priority: 'must' },
      { id: 'f2', text: 'SSL/HTTPS enabled', why: 'No "Not Secure" warning in browser. Vercel/Netlify/Cloudflare give this free.', priority: 'must' },
      { id: 'f3', text: 'Mobile-responsive design', why: 'Hiring managers may check from a phone. Test on iOS Safari and Android Chrome.', priority: 'must' },
      { id: 'f4', text: 'Fast load time (<3s on 3G)', why: 'Use Lighthouse audit. Compress images, lazy-load, use static hosting. First impression matters.', priority: 'must' },
      { id: 'f5', text: 'No broken links or 404s', why: 'Broken links signal carelessness. Run a link checker (deadlinkchecker.com) before sharing.', priority: 'must' },
      { id: 'f6', text: 'Accessible (WCAG AA)', why: 'Alt text on images, sufficient color contrast, keyboard-navigable. Shows you care about quality.', priority: 'should' },
    ],
  },
  {
    title: 'About / Hero Section',
    icon: '👋',
    items: [
      { id: 'a1', text: 'Clear headline: who you are and what you do', why: '"Full Stack Engineer specializing in React + Node.js" beats "Software Developer". Be specific.', priority: 'must' },
      { id: 'a2', text: 'Professional photo or avatar', why: 'Human faces build trust. A real photo is best; consistent avatar is acceptable.', priority: 'should' },
      { id: 'a3', text: 'Current location or timezone (for remote-friendly signal)', why: 'Helps recruiters know if you\'re in their timezone. "Based in Berlin (CET)" is enough.', priority: 'should' },
      { id: 'a4', text: '"Open to work" or availability statement', why: 'Make it obvious if you\'re job hunting. Many ignore portfolios that don\'t state availability.', priority: 'must' },
      { id: 'a5', text: 'Quick CTA: "Download Resume" or "Contact Me"', why: 'Give recruiters the action to take immediately. Put this above the fold.', priority: 'must' },
    ],
  },
  {
    title: 'Projects (Core)',
    icon: '💻',
    items: [
      { id: 'p1', text: 'At least 3 projects with live demos', why: 'Dead GitHub links kill portfolios. A live URL lets hiring managers click in 5 seconds.', priority: 'must' },
      { id: 'p2', text: 'Each project has a clear 1-2 sentence description', why: '"What problem does it solve?" not "Built with React". Lead with value, then tech.', priority: 'must' },
      { id: 'p3', text: 'Tech stack listed for each project', why: 'Recruiters keyword-search. List every relevant tech: React, PostgreSQL, Docker, AWS.', priority: 'must' },
      { id: 'p4', text: 'GitHub repo link for each project', why: 'Shows code quality and commit history. Make sure repos are public and have a README.', priority: 'must' },
      { id: 'p5', text: 'Screenshots or GIF demos', why: 'Visual > text. A GIF or screenshot helps them understand what you built in 2 seconds.', priority: 'should' },
      { id: 'p6', text: 'Quantified impact ("used by 500 users", "99.9% uptime")', why: 'Numbers make accomplishments concrete. Even small numbers (50 users) beat none.', priority: 'should' },
      { id: 'p7', text: 'Featured project is your BEST, not oldest', why: 'Many portfolios show earliest projects first. Reverse chronological or hand-curate.', priority: 'must' },
    ],
  },
  {
    title: 'Skills & Experience',
    icon: '🛠️',
    items: [
      { id: 's1', text: 'Skills section with honest proficiency levels', why: 'Don\'t list everything. 10 solid skills > 40 mediocre ones. Group by category (Frontend, Backend, DevOps).', priority: 'must' },
      { id: 's2', text: 'Work experience with quantified achievements', why: 'Not just job title — "reduced API latency by 40%" tells a story. Use STAR format.', priority: 'must' },
      { id: 's3', text: 'Education listed (even if bootcamp/self-taught)', why: 'Self-taught is fine. Show CS50, bootcamp, online courses. Shows initiative.', priority: 'should' },
      { id: 's4', text: 'Years of experience clearly visible', why: 'Make it easy to categorize (junior/mid/senior). "3 years of professional experience" on the first page.', priority: 'should' },
      { id: 's5', text: 'Certifications or notable courses', why: 'AWS Certified, Google Cloud, CKA — worth listing. Coursera certs less so unless from known unis.', priority: 'nice' },
    ],
  },
  {
    title: 'GitHub Profile',
    icon: '🐙',
    items: [
      { id: 'g1', text: 'GitHub profile README created', why: 'github.com/username/README.md shows on your profile. Shows effort and personality.', priority: 'should' },
      { id: 'g2', text: 'Pinned repos are best projects (not forks)', why: 'Default pinned repos are often noise. Curate to your 6 best original repos.', priority: 'must' },
      { id: 'g3', text: 'Each pinned repo has a description and topics', why: 'Short description + tags (react, typescript, etc.) helps discoverability.', priority: 'must' },
      { id: 'g4', text: 'Consistent commit history (not burst-then-silent)', why: 'Consistent green squares look better than bursts. Daily small commits are fine.', priority: 'nice' },
      { id: 'g5', text: 'No empty repos or repos with just "initial commit"', why: 'Clean up or archive repos that aren\'t ready to show. Clutter suggests disorganization.', priority: 'should' },
    ],
  },
  {
    title: 'Content & Writing',
    icon: '✍️',
    items: [
      { id: 'c1', text: 'At least 1 blog post or article', why: 'Writing demonstrates technical communication skill. Even a single good post stands out.', priority: 'nice' },
      { id: 'c2', text: 'Blog/writing linked from portfolio', why: 'Don\'t hide your writing. Link Dev.to, Medium, or personal blog prominently.', priority: 'nice' },
      { id: 'c3', text: 'No grammatical errors on visible copy', why: 'Run everything through Grammarly. Typos signal carelessness to detail-oriented hiring managers.', priority: 'must' },
    ],
  },
  {
    title: 'Contact & Links',
    icon: '🔗',
    items: [
      { id: 'l1', text: 'Email address easy to find', why: 'Don\'t make recruiters dig. Email in header, footer, or dedicated contact section.', priority: 'must' },
      { id: 'l2', text: 'LinkedIn profile linked', why: 'Most recruiters will check LinkedIn regardless. Make it easy to find.', priority: 'must' },
      { id: 'l3', text: 'GitHub profile linked', why: 'The second thing technical hiring managers check after your name.', priority: 'must' },
      { id: 'l4', text: 'Twitter/X linked (if you post about tech)', why: 'Only if your profile is active and professional. Skip if it\'s personal or inactive.', priority: 'nice' },
      { id: 'l5', text: 'Resume/CV available as PDF download', why: 'Many companies use ATS systems. A PDF resume is required at most companies.', priority: 'must' },
      { id: 'l6', text: 'Resume updated within last 6 months', why: 'Stale resumes are a red flag. Update after every project or job.', priority: 'must' },
    ],
  },
  {
    title: 'SEO & Discoverability',
    icon: '🔍',
    items: [
      { id: 'seo1', text: 'Page title includes your name and role', why: '"Jane Smith — Full Stack Engineer" in <title>. Helps you rank for your own name in Google.', priority: 'should' },
      { id: 'seo2', text: 'Meta description set', why: 'Short description shown in Google search results. 150 chars max.', priority: 'should' },
      { id: 'seo3', text: 'Open Graph image set (for social sharing)', why: 'When someone shares your portfolio on Slack/Twitter, it shows a preview card. Include your name.', priority: 'nice' },
      { id: 'seo4', text: 'Google Analytics or Plausible connected', why: 'Know how many people view your portfolio and where they come from. Useful data.', priority: 'nice' },
    ],
  },
];

const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  must: { label: 'Must Have', color: 'text-red-400 border-red-400/40 bg-red-400/10' },
  should: { label: 'Should Have', color: 'text-yellow-400 border-yellow-400/40 bg-yellow-400/10' },
  nice: { label: 'Nice to Have', color: 'text-green-400 border-green-400/40 bg-green-400/10' },
};

const STORAGE_KEY = 'devportfolio_checklist_v1';
const DEVTOOLKIT_URL = 'https://vicnail.gumroad.com/l/devtoolkit-starter-kit';

export default function DeveloperPortfolioChecklist() {
  const allItems = SECTIONS.flatMap(s => s.items);
  const total = allItems.length;
  const mustHaveItems = allItems.filter(i => i.priority === 'must');

  const [checked, setChecked] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

  const [showWhy, setShowWhy] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string>('');

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(checked)));
    } catch {}
  }, [checked]);

  const toggle = (id: string) => {
    const next = new Set(checked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setChecked(next);
  };

  const checkedCount = allItems.filter(i => checked.has(i.id)).length;
  const mustChecked = mustHaveItems.filter(i => checked.has(i.id)).length;
  const pct = Math.round((checkedCount / total) * 100);

  const getScore = () => {
    if (pct >= 90) return { label: 'Portfolio Pro', color: 'text-green-400', emoji: '🏆' };
    if (pct >= 70) return { label: 'Hiring Ready', color: 'text-primary', emoji: '✅' };
    if (pct >= 50) return { label: 'Getting There', color: 'text-yellow-400', emoji: '🔧' };
    return { label: 'Needs Work', color: 'text-red-400', emoji: '⚠️' };
  };

  const score = getScore();

  return (
    <div class="space-y-6">
      {/* Progress */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <div class="flex items-center justify-between mb-3">
          <div>
            <span class={`text-lg font-bold ${score.color}`}>{score.emoji} {score.label}</span>
            <span class="text-text-muted text-sm ml-2">({checkedCount}/{total} completed)</span>
          </div>
          <span class={`text-3xl font-bold ${score.color}`}>{pct}%</span>
        </div>
        <div class="h-3 bg-bg rounded-full overflow-hidden">
          <div
            class="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div class="flex justify-between text-xs text-text-muted mt-2">
          <span>Must-haves: {mustChecked}/{mustHaveItems.length}</span>
          <button
            onClick={() => setChecked(new Set())}
            class="text-xs text-text-muted hover:text-red-400 transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Priority filter */}
      <div class="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterPriority('')}
          class={`px-3 py-1 rounded-full text-xs border transition-colors ${filterPriority === '' ? 'bg-primary text-white border-primary' : 'border-border text-text-muted hover:border-primary'}`}
        >
          All
        </button>
        {Object.entries(PRIORITY_LABELS).map(([key, { label, color }]) => (
          <button
            key={key}
            onClick={() => setFilterPriority(filterPriority === key ? '' : key)}
            class={`px-3 py-1 rounded-full text-xs border transition-colors ${filterPriority === key ? `${color} font-medium` : 'border-border text-text-muted hover:border-primary'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Sections */}
      {SECTIONS.map(section => {
        const sectionItems = filterPriority ? section.items.filter(i => i.priority === filterPriority) : section.items;
        if (sectionItems.length === 0) return null;
        const sectionChecked = sectionItems.filter(i => checked.has(i.id)).length;

        return (
          <div key={section.title} class="bg-bg-card border border-border rounded-xl overflow-hidden">
            <div class="px-5 py-3 border-b border-border flex items-center justify-between">
              <h2 class="font-semibold text-sm flex items-center gap-2">{section.icon} {section.title}</h2>
              <span class="text-xs text-text-muted">{sectionChecked}/{sectionItems.length}</span>
            </div>
            <div class="divide-y divide-border">
              {sectionItems.map(item => (
                <div key={item.id} class="px-5 py-3">
                  <div class="flex items-start gap-3">
                    <button
                      onClick={() => toggle(item.id)}
                      class={`mt-0.5 w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${checked.has(item.id) ? 'bg-primary border-primary text-white' : 'border-border hover:border-primary'}`}
                    >
                      {checked.has(item.id) && <span class="text-xs">✓</span>}
                    </button>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-start gap-2 flex-wrap">
                        <p class={`text-sm ${checked.has(item.id) ? 'line-through text-text-muted' : ''}`}>{item.text}</p>
                        <span class={`text-xs px-1.5 py-0.5 rounded border ${PRIORITY_LABELS[item.priority].color} shrink-0`}>
                          {PRIORITY_LABELS[item.priority].label}
                        </span>
                      </div>
                      <button
                        onClick={() => setShowWhy(showWhy === item.id ? null : item.id)}
                        class="text-xs text-primary hover:underline mt-1"
                      >
                        {showWhy === item.id ? 'Hide why ↑' : 'Why? ↓'}
                      </button>
                      {showWhy === item.id && (
                        <p class="text-xs text-text-muted mt-1.5 leading-relaxed">{item.why}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Gumroad CTA */}
      <div class="rounded-xl border border-primary/30 bg-gradient-to-br from-bg-card to-bg p-6 text-center mt-4">
        <p class="text-xs font-semibold uppercase tracking-widest text-primary mb-2">Ready to build your own tools site?</p>
        <h3 class="text-xl font-bold mb-1">DevToolkit Starter Kit</h3>
        <p class="text-text-muted text-sm mb-4">Ship your own developer tools portfolio with 12 pre-built tools. Astro + Preact + Tailwind + Cloudflare Pages.</p>
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
