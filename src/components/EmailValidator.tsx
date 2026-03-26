import { useState } from 'preact/hooks';

// Common disposable email domains
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com','guerrillamail.com','tempmail.com','throwaway.email','yopmail.com',
  'trashmail.com','sharklasers.com','guerrillamailblock.com','grr.la','guerrillamail.info',
  'spam4.me','tempr.email','discard.email','throwam.com','maildrop.cc','mailnull.com',
  'tempinbox.com','fakeinbox.com','10minutemail.com','mailnesia.com','mailnull.com',
  'spamgourmet.com','trashmail.me','trashmail.at','trashmail.io','dispostable.com',
  'getnada.com','mintemail.com','spamgourmet.net','spamgourmet.org','spam.la',
]);

// RFC 5322-compliant local part pattern (simplified)
const LOCAL_RE = /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~.-]+$/;
const DOMAIN_RE = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

interface ValidationResult {
  valid: boolean;
  localPart: string;
  domain: string;
  tld: string;
  issues: string[];
  hints: string[];
  disposable: boolean;
  score: number;
}

function validateEmail(email: string): ValidationResult {
  const issues: string[] = [];
  const hints: string[] = [];
  let score = 0;

  const atCount = (email.match(/@/g) || []).length;
  if (atCount === 0) {
    issues.push('Missing @ symbol');
    return { valid: false, localPart: email, domain: '', tld: '', issues, hints, disposable: false, score: 0 };
  }
  if (atCount > 1) issues.push('Multiple @ symbols found');

  const atIdx = email.lastIndexOf('@');
  const localPart = email.slice(0, atIdx);
  const domain = email.slice(atIdx + 1);
  const tld = domain.includes('.') ? domain.split('.').pop() || '' : '';

  // Local part checks
  if (localPart.length === 0) issues.push('Local part (before @) is empty');
  else if (localPart.length > 64) issues.push('Local part exceeds 64 characters (RFC 5321)');
  else score += 20;

  if (localPart.startsWith('.') || localPart.endsWith('.')) issues.push('Local part cannot start or end with a dot');
  if (localPart.includes('..')) issues.push('Local part cannot contain consecutive dots');
  if (localPart.length > 0 && !LOCAL_RE.test(localPart)) issues.push('Local part contains invalid characters');
  else if (localPart.length > 0) score += 20;

  // Domain checks
  if (domain.length === 0) issues.push('Domain (after @) is empty');
  else if (domain.length > 255) issues.push('Domain exceeds 255 characters');
  else score += 20;

  if (domain.length > 0 && !DOMAIN_RE.test(domain)) {
    issues.push('Domain format is invalid');
  } else if (domain.length > 0) {
    score += 20;
    hints.push(`Domain: ${domain}`);
    hints.push(`TLD: .${tld}`);
    if (tld.length < 2) issues.push('TLD too short');
    if (tld.length > 6) hints.push('Long TLD — unusual but valid (e.g. .museum, .travel)');
  }

  // Full length
  if (email.length > 254) issues.push('Total email length exceeds 254 characters (RFC 5321)');
  else score += 10;

  // Disposable check
  const disposable = DISPOSABLE_DOMAINS.has(domain.toLowerCase());
  if (disposable) {
    hints.push('⚠ Likely a disposable/temporary email provider');
    score = Math.max(0, score - 30);
  } else {
    score += 10;
  }

  // MX hint (client-side only)
  hints.push('MX records can only be verified server-side (not available in browser)');

  const valid = issues.length === 0;
  return { valid, localPart, domain, tld, issues, hints, disposable, score: Math.min(100, score) };
}

function ScoreBadge({ score, valid }: { score: number; valid: boolean }) {
  const color = !valid ? 'text-red-500 bg-red-500/10 border-red-500/20'
    : score >= 80 ? 'text-green-500 bg-green-500/10 border-green-500/20'
    : score >= 50 ? 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20'
    : 'text-red-500 bg-red-500/10 border-red-500/20';
  const label = !valid ? 'Invalid' : score >= 80 ? 'Valid' : score >= 50 ? 'Suspicious' : 'Poor';
  return (
    <span class={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border ${color}`}>
      {!valid ? '✗' : score >= 80 ? '✓' : '⚠'} {label} ({score}/100)
    </span>
  );
}

export default function EmailValidator() {
  const [email, setEmail] = useState('');
  const [result, setResult] = useState<ValidationResult | null>(null);

  const validate = () => {
    if (!email.trim()) return;
    setResult(validateEmail(email.trim()));
  };

  const handleKey = (e: KeyboardEvent) => { if (e.key === 'Enter') validate(); };

  return (
    <div class="space-y-6">
      {/* Input */}
      <div class="flex gap-2">
        <input
          type="text"
          value={email}
          onInput={e => setEmail((e.target as HTMLInputElement).value)}
          onKeyDown={handleKey}
          placeholder="Enter email address to validate..."
          class="flex-1 px-4 py-3 rounded-xl bg-surface border border-border text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent text-sm"
        />
        <button onClick={validate}
          class="px-6 py-3 rounded-xl bg-accent text-white font-semibold hover:bg-accent/90 transition-colors text-sm">
          Validate
        </button>
      </div>

      {result && (
        <div class="space-y-4">
          {/* Score */}
          <div class="flex items-center gap-3">
            <ScoreBadge score={result.score} valid={result.valid} />
            {result.disposable && (
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-orange-500/10 border border-orange-500/20 text-orange-500">
                Disposable
              </span>
            )}
          </div>

          {/* Parts breakdown */}
          <div class="rounded-xl bg-surface border border-border p-4 space-y-3">
            <p class="text-xs font-semibold text-text-muted uppercase tracking-wider">Email Parts</p>
            <div class="grid grid-cols-1 gap-2 text-sm">
              <div class="flex justify-between">
                <span class="text-text-muted">Full email</span>
                <span class="font-mono text-text">{email.trim()}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-text-muted">Local part</span>
                <span class="font-mono text-accent">{result.localPart || '—'}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-text-muted">Domain</span>
                <span class="font-mono text-text">{result.domain || '—'}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-text-muted">TLD</span>
                <span class="font-mono text-text">{result.tld ? `.${result.tld}` : '—'}</span>
              </div>
            </div>
          </div>

          {/* Issues */}
          {result.issues.length > 0 && (
            <div class="rounded-xl bg-red-500/10 border border-red-500/20 p-4">
              <p class="text-xs font-semibold text-red-500 mb-2">Issues Found</p>
              <ul class="space-y-1">
                {result.issues.map((issue, i) => (
                  <li key={i} class="flex items-start gap-2 text-sm text-red-400">
                    <span class="mt-0.5">✗</span> {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Hints */}
          {result.hints.length > 0 && (
            <div class="rounded-xl bg-surface border border-border p-4">
              <p class="text-xs font-semibold text-text-muted mb-2">Info & Notes</p>
              <ul class="space-y-1">
                {result.hints.map((h, i) => (
                  <li key={i} class="flex items-start gap-2 text-sm text-text-muted">
                    <span class="mt-0.5 text-accent">→</span> {h}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!result && (
        <div class="rounded-xl bg-surface border border-border border-dashed p-8 text-center text-text-muted text-sm">
          Enter an email address above and click Validate to see a detailed breakdown.
        </div>
      )}
    </div>
  );
}
