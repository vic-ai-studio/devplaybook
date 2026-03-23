import { useState, useMemo, useEffect } from 'preact/hooks';
import { isProUser } from '../utils/pro';

const FREE_TEST_LIMIT = 5;

interface TestCase {
  id: number;
  text: string;
  expectMatch: boolean;
}

const DEFAULT_TESTS: TestCase[] = [
  { id: 1, text: 'user@example.com', expectMatch: true },
  { id: 2, text: 'admin@devplaybook.cc', expectMatch: true },
  { id: 3, text: 'not-an-email', expectMatch: false },
  { id: 4, text: 'missing@', expectMatch: false },
];

const PRESETS = [
  {
    name: 'Email',
    pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}',
    flags: 'i',
    tests: [
      { id: 1, text: 'user@example.com', expectMatch: true },
      { id: 2, text: 'bad@', expectMatch: false },
      { id: 3, text: 'test.email+filter@domain.co.uk', expectMatch: true },
    ],
  },
  {
    name: 'URL',
    pattern: 'https?://[^\\s/$.?#].[^\\s]*',
    flags: 'i',
    tests: [
      { id: 1, text: 'https://devplaybook.cc', expectMatch: true },
      { id: 2, text: 'http://example.com/path?q=1', expectMatch: true },
      { id: 3, text: 'ftp://not-http.com', expectMatch: false },
      { id: 4, text: 'not a url', expectMatch: false },
    ],
  },
  {
    name: 'IPv4',
    pattern: '^((25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(25[0-5]|2[0-4]\\d|[01]?\\d\\d?)$',
    flags: '',
    tests: [
      { id: 1, text: '192.168.1.1', expectMatch: true },
      { id: 2, text: '10.0.0.0', expectMatch: true },
      { id: 3, text: '256.0.0.1', expectMatch: false },
      { id: 4, text: '1.2.3', expectMatch: false },
    ],
  },
  {
    name: 'Phone (US)',
    pattern: '^\\+?1?[-.\\s]?\\(?\\d{3}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}$',
    flags: '',
    tests: [
      { id: 1, text: '555-123-4567', expectMatch: true },
      { id: 2, text: '(555) 123-4567', expectMatch: true },
      { id: 3, text: '+1 555 123 4567', expectMatch: true },
      { id: 4, text: '12345', expectMatch: false },
    ],
  },
];

function ShareButton() {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== 'undefined' ? window.location.href : 'https://devplaybook.cc/tools/regex-tester';

  const copyLink = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent('Free Regex Tester — test your regex against multiple strings at once, see pass/fail results instantly ✅')}&url=${encodeURIComponent(url)}`;
  const redditUrl = `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent('Free Regex Tester — batch test regex patterns with expected match/no-match assertions')}`;

  return (
    <div class="flex gap-2 flex-wrap">
      <span class="text-sm text-gray-400 self-center">Share:</span>
      <a href={tweetUrl} target="_blank" rel="noopener noreferrer"
        class="text-xs bg-sky-600 hover:bg-sky-700 text-white px-3 py-1.5 rounded-md transition-colors font-medium">
        𝕏 Twitter
      </a>
      <a href={redditUrl} target="_blank" rel="noopener noreferrer"
        class="text-xs bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded-md transition-colors font-medium">
        Reddit
      </a>
      <button onClick={copyLink}
        class="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-md transition-colors font-medium">
        {copied ? '✓ Copied!' : '🔗 Copy Link'}
      </button>
    </div>
  );
}

export default function RegexTester() {
  const [pattern, setPattern] = useState(PRESETS[0].pattern);
  const [flags, setFlags] = useState(PRESETS[0].flags);
  const [tests, setTests] = useState<TestCase[]>(DEFAULT_TESTS);
  const [nextId, setNextId] = useState(DEFAULT_TESTS.length + 1);
  const [regexError, setRegexError] = useState<string | null>(null);
  const [pro, setPro] = useState(false);
  const [showProBanner, setShowProBanner] = useState(false);

  useEffect(() => {
    setPro(isProUser());
  }, []);

  const results = useMemo(() => {
    try {
      const re = new RegExp(pattern, flags);
      setRegexError(null);
      return tests.map(t => {
        const matched = re.test(t.text);
        re.lastIndex = 0;
        const passed = matched === t.expectMatch;
        return { ...t, matched, passed };
      });
    } catch (e: any) {
      setRegexError(e.message);
      return tests.map(t => ({ ...t, matched: false, passed: false }));
    }
  }, [pattern, flags, tests]);

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  const atFreeLimit = !pro && tests.length >= FREE_TEST_LIMIT;

  const addTest = () => {
    if (!pro && tests.length >= FREE_TEST_LIMIT) {
      setShowProBanner(true);
      return;
    }
    setTests(prev => [...prev, { id: nextId, text: '', expectMatch: true }]);
    setNextId(n => n + 1);
    setShowProBanner(false);
  };

  const removeTest = (id: number) => {
    setTests(prev => prev.filter(t => t.id !== id));
    setShowProBanner(false);
  };

  const updateTest = (id: number, field: keyof TestCase, value: string | boolean) => {
    setTests(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const loadPreset = (p: typeof PRESETS[0]) => {
    setPattern(p.pattern);
    setFlags(p.flags);
    const cappedTests = !pro && p.tests.length > FREE_TEST_LIMIT ? p.tests.slice(0, FREE_TEST_LIMIT) : p.tests;
    setTests(cappedTests);
    setNextId(cappedTests.length + 1);
    setShowProBanner(false);
  };

  const exportCsv = () => {
    if (!pro) return;
    const header = 'index,test_string,expect_match,matched,passed';
    const rows = results.map((r, i) =>
      `${i + 1},"${r.text.replace(/"/g, '""')}",${r.expectMatch},${r.matched},${r.passed}`
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'regex-test-results.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div class="space-y-5">
      {/* Presets */}
      <div class="flex gap-2 flex-wrap items-center">
        <span class="text-sm text-gray-400">Presets:</span>
        {PRESETS.map(p => (
          <button key={p.name} onClick={() => loadPreset(p)}
            class="text-xs bg-gray-800 hover:bg-gray-700 text-gray-200 px-3 py-1.5 rounded-md border border-gray-700 transition-colors">
            {p.name}
          </button>
        ))}
      </div>

      {/* Pattern input */}
      <div class="bg-gray-900 rounded-xl border border-gray-700 p-4 space-y-3">
        <div class="flex gap-3 items-start">
          <div class="flex-1">
            <label class="block text-sm font-medium text-gray-300 mb-1">Regex Pattern</label>
            <div class="flex items-center gap-1">
              <span class="text-gray-500 font-mono text-lg select-none">/</span>
              <input
                type="text"
                value={pattern}
                onInput={e => setPattern((e.target as HTMLInputElement).value)}
                class="flex-1 bg-gray-800 text-indigo-300 border border-gray-700 rounded-md px-3 py-2 font-mono text-sm focus:outline-none focus:border-indigo-500"
                placeholder="your pattern here"
              />
              <span class="text-gray-500 font-mono text-lg select-none">/</span>
              <input
                type="text"
                value={flags}
                onInput={e => setFlags((e.target as HTMLInputElement).value)}
                class="w-20 bg-gray-800 text-yellow-300 border border-gray-700 rounded-md px-3 py-2 font-mono text-sm focus:outline-none focus:border-indigo-500"
                placeholder="flags"
              />
            </div>
          </div>
        </div>
        {regexError && (
          <p class="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-md px-3 py-2">⚠ {regexError}</p>
        )}
      </div>

      {/* Summary bar */}
      <div class="flex items-center justify-between">
        <div class="flex gap-3 text-sm items-center">
          <span class={`px-3 py-1 rounded-full border font-medium ${
            passed === total ? 'bg-green-900/40 text-green-400 border-green-800' : 'bg-yellow-900/40 text-yellow-400 border-yellow-800'
          }`}>
            {passed}/{total} passed
          </span>
          {passed < total && (
            <span class="bg-red-900/40 text-red-400 px-3 py-1 rounded-full border border-red-800">
              {total - passed} failed
            </span>
          )}
          {!pro && (
            <span class="text-xs text-gray-500">{tests.length}/{FREE_TEST_LIMIT} test strings</span>
          )}
        </div>
        <div class="flex gap-2">
          {pro && (
            <button onClick={exportCsv}
              class="text-sm bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg transition-colors font-medium">
              Export CSV
            </button>
          )}
          <button
            onClick={addTest}
            disabled={atFreeLimit}
            class={`text-sm px-4 py-1.5 rounded-lg transition-colors font-medium ${
              atFreeLimit
                ? 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}>
            + Add Test
          </button>
        </div>
      </div>

      {/* Pro upgrade banner — shown when free limit reached */}
      {showProBanner && (
        <div class="bg-yellow-500/10 border border-yellow-500/40 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-yellow-400">Free limit: {FREE_TEST_LIMIT} test strings max</p>
            <p class="text-xs text-gray-400 mt-0.5">Upgrade to Pro for unlimited test strings + CSV export.</p>
          </div>
          <a href="/pro" class="shrink-0 ml-4 bg-primary text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors">
            Go Pro →
          </a>
        </div>
      )}

      {/* Free limit indicator */}
      {!pro && atFreeLimit && !showProBanner && (
        <div class="flex items-center justify-between text-xs text-gray-500 bg-gray-900/50 border border-gray-800 rounded-lg px-4 py-2">
          <span>Free plan: {FREE_TEST_LIMIT} test strings max</span>
          <a href="/pro" class="text-primary hover:underline">Upgrade for unlimited + CSV export →</a>
        </div>
      )}

      {/* Test cases */}
      <div class="space-y-2">
        {results.map(r => (
          <div key={r.id}
            class={`flex items-center gap-3 p-3 rounded-lg border ${
              r.passed ? 'border-green-800 bg-green-900/10' : 'border-red-800 bg-red-900/10'
            }`}>
            {/* Status icon */}
            <span class={`text-lg select-none w-6 text-center ${r.passed ? 'text-green-400' : 'text-red-400'}`}>
              {r.passed ? '✓' : '✗'}
            </span>

            {/* Match result badge */}
            <span class={`text-xs font-medium px-2 py-0.5 rounded w-20 text-center ${
              r.matched ? 'bg-green-800 text-green-200' : 'bg-gray-800 text-gray-400'
            }`}>
              {r.matched ? 'MATCH' : 'NO MATCH'}
            </span>

            {/* Test string */}
            <input
              type="text"
              value={r.text}
              onInput={e => updateTest(r.id, 'text', (e.target as HTMLInputElement).value)}
              class="flex-1 bg-gray-900 text-gray-100 border border-gray-700 rounded-md px-3 py-1.5 font-mono text-sm focus:outline-none focus:border-indigo-500"
              placeholder="test string..."
            />

            {/* Expected */}
            <select
              value={r.expectMatch ? 'match' : 'no-match'}
              onChange={e => updateTest(r.id, 'expectMatch', (e.target as HTMLSelectElement).value === 'match')}
              class="bg-gray-800 text-gray-300 border border-gray-700 rounded-md px-2 py-1.5 text-xs focus:outline-none">
              <option value="match">should match</option>
              <option value="no-match">should NOT match</option>
            </select>

            {/* Remove */}
            <button onClick={() => removeTest(r.id)}
              class="text-gray-600 hover:text-red-400 transition-colors text-sm px-1">
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Pro CSV export info */}
      {!pro && (
        <div class="flex items-center justify-between bg-gray-900/30 border border-gray-800 rounded-lg px-4 py-3">
          <div class="flex items-center gap-2">
            <span class="text-xs bg-primary/10 text-primary border border-primary/30 px-2 py-0.5 rounded-full">Pro</span>
            <span class="text-xs text-gray-400">Export test results as CSV — unlimited test strings</span>
          </div>
          <a href="/pro" class="text-xs text-primary hover:underline shrink-0 ml-2">Upgrade →</a>
        </div>
      )}

      {pro && <p class="text-xs text-primary text-right">✓ Pro — unlimited test strings &amp; CSV export</p>}

      {/* Share */}
      <div class="border-t border-gray-800 pt-4">
        <ShareButton />
      </div>
    </div>
  );
}
