import { useState, useEffect } from 'preact/hooks';

const DAILY_LIMIT = 3;
const STORAGE_PREFIX = 'dp_usage_';

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function getCount(toolName: string): number {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + toolName);
    if (!raw) return 0;
    const { date, count } = JSON.parse(raw);
    if (date !== getTodayKey()) return 0;
    return count || 0;
  } catch {
    return 0;
  }
}

export function incrementUsage(toolName: string): number {
  try {
    const count = getCount(toolName) + 1;
    localStorage.setItem(STORAGE_PREFIX + toolName, JSON.stringify({ date: getTodayKey(), count }));
    return count;
  } catch {
    return 0;
  }
}

interface Props {
  toolName: string;
}

export default function UsageLimitGate({ toolName }: Props) {
  const [count, setCount] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const c = incrementUsage(toolName);
    setCount(c);
  }, []);

  // Show soft prompt at 2 uses, hard gate at 3+ (non-dismissible)
  const showSoft = count >= 2 && count < DAILY_LIMIT && !dismissed;
  const showHard = count >= DAILY_LIMIT;

  if (!showSoft && !showHard) return null;

  if (showHard) {
    return (
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div class="bg-bg-card border border-primary/30 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
          <div class="text-4xl mb-4">⚡</div>
          <h2 class="text-2xl font-bold mb-2">Daily Limit Reached</h2>
          <p class="text-text-muted mb-2 text-sm">
            You've used <strong>{toolName}</strong> {count} times today (free limit: {DAILY_LIMIT}/day).
          </p>
          <p class="text-text-muted mb-6 text-sm">
            Upgrade to Pro for unlimited access to all tools, AI features, and premium templates.
          </p>
          <div class="flex flex-col gap-3">
            <a
              href="/pricing"
              class="block w-full py-3 px-6 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold transition-colors shadow-lg"
            >
              Upgrade to Pro — $9/mo
            </a>
          </div>
          <p class="text-text-muted text-xs mt-3">Free limit resets tomorrow.</p>
          <p class="text-text-muted text-xs mt-4">7-day free trial · Cancel anytime</p>
        </div>
      </div>
    );
  }

  // Soft prompt
  return (
    <div class="fixed bottom-4 right-4 z-40 max-w-sm bg-bg-card border border-primary/40 rounded-xl p-4 shadow-lg">
      <div class="flex items-start gap-3">
        <span class="text-primary text-xl shrink-0">⚡</span>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold mb-1">
            {DAILY_LIMIT - count} free uses left today
          </p>
          <p class="text-xs text-text-muted mb-3">
            Upgrade to Pro for unlimited access + AI tools.
          </p>
          <div class="flex gap-2">
            <a
              href="/pricing"
              class="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-dark text-white text-xs font-semibold transition-colors"
            >
              Upgrade →
            </a>
            <button
              onClick={() => setDismissed(true)}
              class="px-3 py-1.5 rounded-lg border border-border text-xs text-text-muted hover:text-text transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
