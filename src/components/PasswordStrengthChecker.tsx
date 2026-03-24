import { useState } from 'preact/hooks';

interface StrengthResult {
  score: number;       // 0-5
  label: string;
  color: string;
  barColor: string;
  width: string;
  tips: string[];
}

function checkStrength(pw: string): StrengthResult {
  if (!pw) {
    return { score: 0, label: '', color: 'text-text-muted', barColor: 'bg-border', width: '0%', tips: [] };
  }

  const tips: string[] = [];
  let score = 0;

  if (pw.length >= 8) score++; else tips.push('Use at least 8 characters');
  if (pw.length >= 12) score++; else if (pw.length >= 8) tips.push('Aim for 12+ characters for stronger security');
  if (/[A-Z]/.test(pw)) score++; else tips.push('Add uppercase letters (A–Z)');
  if (/[a-z]/.test(pw)) score++; else tips.push('Add lowercase letters (a–z)');
  if (/[0-9]/.test(pw)) score++; else tips.push('Add numbers (0–9)');
  if (/[^A-Za-z0-9]/.test(pw)) score++; else tips.push('Add special characters (!@#$%^&*)');

  // Common pattern penalties (info only, don't reduce score)
  if (/^(.)\1+$/.test(pw)) tips.push('Avoid repeating the same character');
  if (/^(123|abc|qwerty|password|letmein)/i.test(pw)) tips.push('Avoid common patterns like "123" or "password"');

  // Cap at 5
  score = Math.min(score, 5);

  const levels = [
    { label: 'Very Weak', color: 'text-red-500',    barColor: 'bg-red-500',    width: '20%' },
    { label: 'Weak',      color: 'text-red-400',    barColor: 'bg-red-400',    width: '20%' },
    { label: 'Fair',      color: 'text-yellow-400', barColor: 'bg-yellow-400', width: '40%' },
    { label: 'Good',      color: 'text-blue-400',   barColor: 'bg-blue-400',   width: '60%' },
    { label: 'Strong',    color: 'text-green-400',  barColor: 'bg-green-400',  width: '80%' },
    { label: 'Very Strong', color: 'text-green-300', barColor: 'bg-green-400', width: '100%' },
  ];

  return { score, tips, ...levels[score] };
}

function entropyBits(pw: string): number {
  const charset = (
    (/[a-z]/.test(pw) ? 26 : 0) +
    (/[A-Z]/.test(pw) ? 26 : 0) +
    (/[0-9]/.test(pw) ? 10 : 0) +
    (/[^A-Za-z0-9]/.test(pw) ? 32 : 0)
  );
  if (!charset || !pw.length) return 0;
  return Math.round(pw.length * Math.log2(charset));
}

export default function PasswordStrengthChecker() {
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  const result = checkStrength(password);
  const entropy = entropyBits(password);

  const checks = [
    { label: '8+ characters',       pass: password.length >= 8 },
    { label: '12+ characters',       pass: password.length >= 12 },
    { label: 'Uppercase (A–Z)',      pass: /[A-Z]/.test(password) },
    { label: 'Lowercase (a–z)',      pass: /[a-z]/.test(password) },
    { label: 'Numbers (0–9)',        pass: /[0-9]/.test(password) },
    { label: 'Special characters',  pass: /[^A-Za-z0-9]/.test(password) },
  ];

  return (
    <div class="space-y-6">
      {/* Input */}
      <div>
        <label class="block text-sm font-semibold text-text mb-2">Password</label>
        <div class="relative">
          <input
            type={showPw ? 'text' : 'password'}
            value={password}
            onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
            placeholder="Enter a password to check its strength…"
            class="w-full bg-bg-card border border-border rounded-xl px-4 py-3 pr-12 text-sm font-mono text-text placeholder-text-muted focus:outline-none focus:border-primary"
            autocomplete="off"
            spellcheck={false}
          />
          <button
            type="button"
            onClick={() => setShowPw(v => !v)}
            class="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors text-sm px-1"
            title={showPw ? 'Hide password' : 'Show password'}
          >
            {showPw ? '🙈' : '👁️'}
          </button>
        </div>
      </div>

      {/* Strength meter */}
      {password && (
        <>
          <div class="bg-bg-card border border-border rounded-xl p-4 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-sm font-semibold text-text">Strength</span>
              <span class={`text-sm font-bold ${result.color}`}>{result.label}</span>
            </div>
            {/* Bar */}
            <div class="h-2 bg-border rounded-full overflow-hidden">
              <div
                class={`h-full rounded-full transition-all duration-500 ${result.barColor}`}
                style={{ width: result.width }}
              />
            </div>
            {/* Stats row */}
            <div class="flex gap-4 text-xs text-text-muted pt-1">
              <span>Length: <span class="text-text font-medium">{password.length}</span></span>
              <span>Entropy: <span class="text-text font-medium">~{entropy} bits</span></span>
            </div>
          </div>

          {/* Checklist */}
          <div class="bg-bg-card border border-border rounded-xl p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-text-muted mb-3">Criteria</p>
            <div class="grid grid-cols-2 gap-2">
              {checks.map(({ label, pass }) => (
                <div key={label} class={`flex items-center gap-2 text-sm ${pass ? 'text-green-400' : 'text-text-muted'}`}>
                  <span class={`text-base leading-none ${pass ? 'text-green-400' : 'text-border'}`}>
                    {pass ? '✓' : '○'}
                  </span>
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          {result.tips.length > 0 && (
            <div class="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
              <p class="text-xs font-semibold uppercase tracking-wide text-yellow-400 mb-2">Improvement tips</p>
              <ul class="space-y-1">
                {result.tips.map(tip => (
                  <li key={tip} class="text-sm text-text-muted flex items-start gap-2">
                    <span class="text-yellow-400 shrink-0">→</span> {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.score === 5 && (
            <div class="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-sm text-green-400 flex items-center gap-2">
              <span>🛡️</span>
              <span>Excellent! This password meets all strength criteria.</span>
            </div>
          )}
        </>
      )}

      {/* Entropy guide */}
      <div class="bg-bg-card border border-border rounded-xl p-4 text-sm text-text-muted">
        <p class="font-semibold text-text text-xs uppercase tracking-wide mb-2">About entropy</p>
        <p class="text-xs leading-relaxed">
          Entropy (bits) measures how unpredictable a password is. Higher is better:
          <span class="text-red-400"> &lt;28 bits</span> is trivially brute-forced,
          <span class="text-yellow-400"> 36–59 bits</span> is fair for low-risk accounts,
          <span class="text-green-400"> 60+ bits</span> is strong for most purposes.
          A 16-char random password with upper/lower/digits/symbols gives ~96 bits.
        </p>
      </div>
    </div>
  );
}
