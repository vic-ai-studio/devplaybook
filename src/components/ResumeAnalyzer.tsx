import { useState } from 'preact/hooks';

interface CheckResult {
  category: string;
  item: string;
  score: number;
  maxScore: number;
  status: 'pass' | 'warn' | 'fail';
  suggestion: string;
}

interface AnalysisResult {
  overallScore: number;
  grade: string;
  checks: CheckResult[];
}

function analyzeResume(text: string): AnalysisResult {
  const lower = text.toLowerCase();
  const checks: CheckResult[] = [];

  // --- Contact Info ---
  const hasEmail = /[\w.+-]+@[\w-]+\.\w{2,}/.test(text);
  checks.push({
    category: 'Contact Info',
    item: 'Email address',
    score: hasEmail ? 5 : 0,
    maxScore: 5,
    status: hasEmail ? 'pass' : 'fail',
    suggestion: hasEmail ? 'Email found.' : 'Add a professional email address.',
  });

  const hasPhone = /\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}/.test(text);
  checks.push({
    category: 'Contact Info',
    item: 'Phone number',
    score: hasPhone ? 3 : 0,
    maxScore: 3,
    status: hasPhone ? 'pass' : 'warn',
    suggestion: hasPhone ? 'Phone number found.' : 'Consider adding a phone number.',
  });

  const hasLinkedin = /linkedin\.com\//i.test(text);
  checks.push({
    category: 'Contact Info',
    item: 'LinkedIn URL',
    score: hasLinkedin ? 4 : 0,
    maxScore: 4,
    status: hasLinkedin ? 'pass' : 'warn',
    suggestion: hasLinkedin ? 'LinkedIn profile found.' : 'Add your LinkedIn URL — it\'s expected for tech roles.',
  });

  const hasGithub = /github\.com\//i.test(text);
  checks.push({
    category: 'Contact Info',
    item: 'GitHub profile',
    score: hasGithub ? 4 : 0,
    maxScore: 4,
    status: hasGithub ? 'pass' : 'warn',
    suggestion: hasGithub ? 'GitHub profile found.' : 'Add your GitHub URL to show active work.',
  });

  // --- Summary / Objective ---
  const hasSummary = /summary|objective|about me|profile/i.test(text);
  checks.push({
    category: 'Summary',
    item: 'Professional summary or objective',
    score: hasSummary ? 6 : 0,
    maxScore: 6,
    status: hasSummary ? 'pass' : 'warn',
    suggestion: hasSummary ? 'Summary section found.' : 'Add a 2–3 sentence professional summary at the top.',
  });

  // --- Work Experience ---
  const hasExperience = /experience|work history|employment/i.test(text);
  checks.push({
    category: 'Experience',
    item: 'Work experience section',
    score: hasExperience ? 10 : 0,
    maxScore: 10,
    status: hasExperience ? 'pass' : 'fail',
    suggestion: hasExperience ? 'Experience section found.' : 'Add a Work Experience section — this is the most important part.',
  });

  const hasDates = /\d{4}/.test(text);
  checks.push({
    category: 'Experience',
    item: 'Dates on experience entries',
    score: hasDates ? 5 : 0,
    maxScore: 5,
    status: hasDates ? 'pass' : 'fail',
    suggestion: hasDates ? 'Dates detected.' : 'Add year ranges to each role (e.g. 2021–2023).',
  });

  const actionVerbs = ['built', 'developed', 'designed', 'implemented', 'led', 'created', 'launched', 'improved', 'reduced', 'increased', 'managed', 'deployed', 'architected', 'optimized', 'delivered', 'shipped', 'automated'];
  const verbsFound = actionVerbs.filter(v => lower.includes(v));
  const verbScore = Math.min(verbsFound.length, 5);
  checks.push({
    category: 'Experience',
    item: 'Action verbs in bullet points',
    score: verbScore * 2,
    maxScore: 10,
    status: verbScore >= 3 ? 'pass' : verbScore >= 1 ? 'warn' : 'fail',
    suggestion: verbScore >= 3
      ? `Good use of action verbs: ${verbsFound.slice(0, 5).join(', ')}`
      : 'Use strong action verbs: "Built", "Developed", "Led", "Reduced", "Improved".',
  });

  const hasMetrics = /\d+%|\$\d+|\d+x|\d+ users|\d+ million|\d+ billion|\d+k\b/i.test(text);
  checks.push({
    category: 'Experience',
    item: 'Quantified achievements (numbers/metrics)',
    score: hasMetrics ? 10 : 0,
    maxScore: 10,
    status: hasMetrics ? 'pass' : 'warn',
    suggestion: hasMetrics ? 'Metrics found.' : 'Add numbers: "Reduced load time by 40%", "Served 10k users", "Cut costs by $20k".',
  });

  // --- Skills ---
  const hasSkills = /skills|technologies|tech stack|languages|frameworks/i.test(text);
  checks.push({
    category: 'Skills',
    item: 'Skills section',
    score: hasSkills ? 8 : 0,
    maxScore: 8,
    status: hasSkills ? 'pass' : 'fail',
    suggestion: hasSkills ? 'Skills section found.' : 'Add a dedicated Skills or Tech Stack section.',
  });

  const techKeywords = ['javascript', 'typescript', 'python', 'react', 'node', 'aws', 'docker', 'kubernetes', 'sql', 'postgresql', 'mongodb', 'redis', 'git', 'ci/cd', 'rest', 'graphql', 'java', 'go', 'rust', 'c++'];
  const techFound = techKeywords.filter(t => lower.includes(t));
  checks.push({
    category: 'Skills',
    item: 'Technical keywords',
    score: Math.min(techFound.length * 2, 8),
    maxScore: 8,
    status: techFound.length >= 4 ? 'pass' : techFound.length >= 2 ? 'warn' : 'fail',
    suggestion: techFound.length >= 4
      ? `Found: ${techFound.slice(0, 6).join(', ')}`
      : 'List specific technologies, languages, and frameworks you know.',
  });

  // --- Education ---
  const hasEducation = /education|university|college|degree|bachelor|master|phd|b\.s\.|b\.a\.|m\.s\./i.test(text);
  checks.push({
    category: 'Education',
    item: 'Education section',
    score: hasEducation ? 6 : 2,
    maxScore: 6,
    status: hasEducation ? 'pass' : 'warn',
    suggestion: hasEducation ? 'Education section found.' : 'Add an Education section. If self-taught, mention bootcamps or certifications.',
  });

  // --- Projects ---
  const hasProjects = /projects?|portfolio|open.?source|side.?projects?/i.test(text);
  checks.push({
    category: 'Projects',
    item: 'Projects section',
    score: hasProjects ? 6 : 0,
    maxScore: 6,
    status: hasProjects ? 'pass' : 'warn',
    suggestion: hasProjects ? 'Projects section found.' : 'Add personal or open-source projects — they signal initiative and passion.',
  });

  // --- Length ---
  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
  const lengthOk = wordCount >= 200 && wordCount <= 900;
  checks.push({
    category: 'Format',
    item: 'Resume length',
    score: lengthOk ? 5 : 2,
    maxScore: 5,
    status: lengthOk ? 'pass' : 'warn',
    suggestion: lengthOk
      ? `${wordCount} words — good length.`
      : wordCount < 200
        ? `Only ${wordCount} words — add more detail to your experience and skills.`
        : `${wordCount} words — consider trimming to 1 page (aim for ~400–700 words).`,
  });

  const totalScore = checks.reduce((sum, c) => sum + c.score, 0);
  const maxTotal = checks.reduce((sum, c) => sum + c.maxScore, 0);
  const overallScore = Math.round((totalScore / maxTotal) * 100);

  const grade = overallScore >= 85 ? 'A' : overallScore >= 70 ? 'B' : overallScore >= 55 ? 'C' : overallScore >= 40 ? 'D' : 'F';

  return { overallScore, grade, checks };
}

const EXAMPLE = `John Developer
john@email.com | +1 (555) 123-4567 | linkedin.com/in/johndeveloper | github.com/johndeveloper

SUMMARY
Experienced full-stack developer with 5+ years building scalable web applications. Passionate about clean code, developer experience, and shipping fast.

EXPERIENCE
Senior Software Engineer — Acme Corp (2021–Present)
• Built a real-time dashboard serving 50k daily active users
• Reduced API latency by 40% by implementing Redis caching
• Led a team of 4 engineers to deliver the v3 platform rewrite on time

Software Engineer — StartupXYZ (2019–2021)
• Developed React frontend with TypeScript, reducing bugs by 30%
• Deployed microservices on AWS ECS using Docker and CI/CD pipelines
• Increased test coverage from 20% to 80%

SKILLS
JavaScript, TypeScript, React, Node.js, Python, PostgreSQL, Redis, AWS, Docker, Git

EDUCATION
B.S. Computer Science — State University (2015–2019)

PROJECTS
DevTracker — Open source GitHub activity tracker (2k stars)
Personal portfolio at johndeveloper.com`;

export default function ResumeAnalyzer() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleAnalyze = () => {
    if (!input.trim()) return;
    setResult(analyzeResume(input));
  };

  const statusIcon = (s: string) => s === 'pass' ? '✓' : s === 'warn' ? '⚠' : '✕';
  const statusColor = (s: string) => s === 'pass' ? 'text-green-400' : s === 'warn' ? 'text-yellow-400' : 'text-red-400';
  const statusBg = (s: string) => s === 'pass' ? 'bg-green-500/10 border-green-500/20' : s === 'warn' ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-red-500/10 border-red-500/20';
  const gradeColor = (g: string) => ({ A: 'text-green-400', B: 'text-blue-400', C: 'text-yellow-400', D: 'text-orange-400', F: 'text-red-400' }[g] || 'text-text-muted');

  const categories = result ? [...new Set(result.checks.map(c => c.category))] : [];

  return (
    <div class="space-y-6">
      {/* Input */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-semibold">Paste your resume text</label>
          <button onClick={() => { setInput(EXAMPLE); setResult(null); }} class="text-xs text-accent hover:underline">Load example</button>
        </div>
        <textarea
          class="w-full h-72 bg-surface border border-border rounded-lg p-3 text-sm resize-y focus:outline-none focus:border-accent"
          placeholder="Paste your resume here (plain text)..."
          value={input}
          onInput={(e) => setInput((e.target as HTMLTextAreaElement).value)}
        />
        <p class="text-xs text-text-muted mt-1">All analysis runs in your browser — your resume never leaves your device.</p>
      </div>

      <button
        onClick={handleAnalyze}
        disabled={!input.trim()}
        class="px-5 py-2 bg-accent hover:bg-accent/90 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors"
      >
        Analyze Resume
      </button>

      {result && (
        <div class="space-y-6">
          {/* Score card */}
          <div class="bg-surface border border-border rounded-xl p-6 flex items-center gap-8">
            <div class="text-center">
              <div class={`text-5xl font-bold ${gradeColor(result.grade)}`}>{result.grade}</div>
              <div class="text-xs text-text-muted mt-1">Grade</div>
            </div>
            <div class="text-center">
              <div class={`text-4xl font-bold ${gradeColor(result.grade)}`}>{result.overallScore}</div>
              <div class="text-xs text-text-muted mt-1">Score / 100</div>
            </div>
            <div class="flex-1">
              <div class="w-full bg-border rounded-full h-2 mb-2">
                <div
                  class={`h-2 rounded-full transition-all ${result.overallScore >= 80 ? 'bg-green-400' : result.overallScore >= 60 ? 'bg-yellow-400' : 'bg-red-400'}`}
                  style={{ width: `${result.overallScore}%` }}
                />
              </div>
              <div class="text-xs text-text-muted">
                {result.checks.filter(c => c.status === 'pass').length} passing ·{' '}
                {result.checks.filter(c => c.status === 'warn').length} warnings ·{' '}
                {result.checks.filter(c => c.status === 'fail').length} failing
              </div>
            </div>
          </div>

          {/* Checks by category */}
          {categories.map(cat => (
            <div key={cat}>
              <h3 class="text-sm font-bold text-text-muted uppercase tracking-wide mb-2">{cat}</h3>
              <div class="space-y-2">
                {result.checks.filter(c => c.category === cat).map((check, i) => (
                  <div key={i} class={`border rounded-lg p-3 flex gap-3 ${statusBg(check.status)}`}>
                    <span class={`text-sm font-bold shrink-0 mt-0.5 ${statusColor(check.status)}`}>{statusIcon(check.status)}</span>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center justify-between gap-2">
                        <span class="text-sm font-medium">{check.item}</span>
                        <span class="text-xs text-text-muted shrink-0">{check.score}/{check.maxScore} pts</span>
                      </div>
                      <p class="text-xs text-text-muted mt-0.5">{check.suggestion}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
