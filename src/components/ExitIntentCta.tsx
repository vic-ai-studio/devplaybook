import { useState, useEffect, useCallback } from 'preact/hooks';

interface Props {
  productName?: string;
  productUrl?: string;
  productPrice?: number;
}

const BUNDLE_URL =
  'https://vicnail.gumroad.com/l/devplaybook-pro-bundle?utm_source=devplaybook&utm_medium=exit_intent&utm_campaign=pro-bundle';
const DISMISS_KEY = 'exitIntentDismissed';
const DISMISS_DAYS = 7;

export default function ExitIntentCta({ productName, productUrl, productPrice }: Props) {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [subLoading, setSubLoading] = useState(false);

  const dismiss = useCallback(() => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
  }, []);

  useEffect(() => {
    // Check if dismissed recently
    try {
      const ts = parseInt(localStorage.getItem(DISMISS_KEY) || '0', 10);
      if (ts && Date.now() - ts < DISMISS_DAYS * 86400000) return;
    } catch {}

    let triggered = false;

    const onMouseLeave = (e: MouseEvent) => {
      if (triggered || e.clientY > 20) return;
      triggered = true;
      setVisible(true);
    };

    document.addEventListener('mouseleave', onMouseLeave);
    return () => document.removeEventListener('mouseleave', onMouseLeave);
  }, []);

  const handleSubscribe = async (e: Event) => {
    e.preventDefault();
    if (!email) return;
    setSubLoading(true);
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'exit_intent' }),
      });
      const data = await res.json();
      if (data.success) {
        setSubscribed(true);
        try { (window as any).dpTrack?.('newsletter_signup', { source: 'exit_intent' }); } catch {}
        setTimeout(dismiss, 2000);
      }
    } catch {}
    setSubLoading(false);
  };

  if (!visible) return null;

  return (
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="exit-intent-title" class="bg-bg-card border border-primary/40 rounded-2xl p-8 max-w-md w-full shadow-2xl relative">
        <button
          onClick={dismiss}
          aria-label="Close dialog"
          class="absolute top-4 right-4 text-text-muted hover:text-text transition-colors text-lg leading-none"
        >
          ✕
        </button>

        <p class="text-xs font-bold uppercase tracking-widest text-primary mb-3">Wait — before you go</p>
        <h2 id="exit-intent-title" class="text-2xl font-bold mb-2">
          {productName
            ? `Get ${productName} — $${productPrice}`
            : 'DevPlaybook Pro Bundle'}
        </h2>
        <p class="text-text-muted text-sm mb-5">
          {productName
            ? `Pick up ${productName} on Gumroad — one-time payment, instant download, MIT licensed.`
            : 'All 13 premium products in one download. Boilerplates, scripts, AI toolkits, and more. Save 67% vs buying separately.'}
        </p>

        <div class="flex flex-col gap-3">
          <a
            href={productUrl || BUNDLE_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={dismiss}
            data-track="exit_intent_cta_click"
            data-product-name={productName || 'Pro Bundle'}
            class="block bg-primary hover:bg-primary-dark text-white font-bold px-6 py-3 rounded-xl text-center transition-colors"
          >
            {productName
              ? `Buy ${productName} — $${productPrice} →`
              : 'Get Full Bundle — $79 →'}
          </a>
          <a
            href="/deals"
            onClick={dismiss}
            data-track="exit_intent_deals_click"
            class="block text-center text-sm text-primary hover:underline"
          >
            Browse all {productName ? 'products' : 'deals'} →
          </a>
        </div>

        {/* Newsletter fallback */}
        <div class="mt-5 pt-4 border-t border-border">
          {subscribed ? (
            <p class="text-green-400 text-sm text-center font-medium">You're in! Check your inbox soon. 🎉</p>
          ) : (
            <>
              <p class="text-text-muted text-xs text-center mb-2">Not ready to buy? Get free weekly dev tips instead:</p>
              <form onSubmit={handleSubscribe} class="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
                  placeholder="your@email.com"
                  required
                  class="flex-1 min-w-0 px-3 py-2 text-sm rounded-lg border border-border bg-bg-alt text-text placeholder-text-muted focus:outline-none focus:border-primary"
                />
                <button
                  type="submit"
                  disabled={subLoading}
                  class="px-4 py-2 bg-bg-alt border border-border text-text text-sm font-medium rounded-lg hover:border-primary hover:text-primary transition-colors whitespace-nowrap disabled:opacity-50"
                >
                  {subLoading ? '...' : 'Subscribe'}
                </button>
              </form>
            </>
          )}
        </div>

        <p class="text-text-muted text-xs mt-3 text-center">
          MIT licensed · Instant download · No subscription
        </p>
      </div>
    </div>
  );
}
