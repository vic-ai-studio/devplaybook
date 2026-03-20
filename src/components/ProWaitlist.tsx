import { useState } from 'preact/hooks';

interface Props {
  /** Where to display: 'banner' = full-width CTA block, 'inline' = compact row */
  variant?: 'banner' | 'inline';
}

export default function ProWaitlist({ variant = 'banner' }: Props) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const submit = async (e: Event) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/pro-waitlist/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json() as { success?: boolean; message?: string; error?: string };
      if (data.success) {
        setStatus('success');
        setMessage(data.message || "You're on the list!");
        setEmail('');
      } else {
        setStatus('error');
        setMessage(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  };

  if (variant === 'inline') {
    return (
      <div class="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
        {status === 'success' ? (
          <p class="text-green-400 text-sm font-medium">✓ {message}</p>
        ) : (
          <form onSubmit={submit} class="flex gap-2 w-full sm:w-auto">
            <input
              type="email"
              required
              value={email}
              onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
              placeholder="your@email.com"
              class="flex-1 sm:w-56 bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
              disabled={status === 'loading'}
            />
            <button
              type="submit"
              disabled={status === 'loading' || !email.trim()}
              class="px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white text-sm font-semibold transition-colors disabled:opacity-60 whitespace-nowrap"
            >
              {status === 'loading' ? '…' : 'Join waitlist'}
            </button>
          </form>
        )}
        {status === 'error' && <p class="text-red-400 text-xs">{message}</p>}
      </div>
    );
  }

  // Banner variant
  return (
    <section class="rounded-2xl border border-primary/30 bg-gradient-to-br from-bg-card to-bg p-8 text-center">
      <p class="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Coming soon</p>
      <h2 class="text-2xl font-bold mb-2">DevPlaybook Pro</h2>
      <p class="text-text-muted mb-2 max-w-lg mx-auto text-sm">
        AI-powered tools: Code Review, Doc Generator, SQL Builder. Batch processing, API access, no ads.
      </p>
      <p class="text-text-muted mb-6 text-xs">Join the waitlist — get early access and launch pricing.</p>

      {status === 'success' ? (
        <div class="inline-flex items-center gap-2 bg-green-400/10 border border-green-400/30 text-green-400 rounded-xl px-6 py-3">
          <span class="text-lg">✓</span>
          <span class="font-medium">{message}</span>
        </div>
      ) : (
        <form onSubmit={submit} class="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
          <input
            type="email"
            required
            value={email}
            onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
            placeholder="your@email.com"
            class="flex-1 bg-bg border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
            disabled={status === 'loading'}
          />
          <button
            type="submit"
            disabled={status === 'loading' || !email.trim()}
            class="px-6 py-3 rounded-xl bg-primary hover:bg-primary-dark text-white font-semibold text-sm transition-colors disabled:opacity-60 whitespace-nowrap"
          >
            {status === 'loading' ? 'Joining…' : 'Join Waitlist →'}
          </button>
        </form>
      )}
      {status === 'error' && <p class="text-red-400 text-xs mt-2">{message}</p>}
      <p class="text-text-muted text-xs mt-4">No spam. Unsubscribe anytime.</p>
    </section>
  );
}
