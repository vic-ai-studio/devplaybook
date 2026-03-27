import { useState, useMemo } from 'preact/hooks';

interface UtmParams {
  baseUrl: string;
  source: string;
  medium: string;
  campaign: string;
  term: string;
  content: string;
}

const PRESETS = [
  { label: 'Email Newsletter', source: 'newsletter', medium: 'email', campaign: 'weekly-digest' },
  { label: 'Twitter/X Organic', source: 'twitter', medium: 'social', campaign: 'organic' },
  { label: 'LinkedIn Post', source: 'linkedin', medium: 'social', campaign: 'content' },
  { label: 'Google Ads', source: 'google', medium: 'cpc', campaign: 'brand' },
  { label: 'Facebook Ads', source: 'facebook', medium: 'paid-social', campaign: 'awareness' },
  { label: 'GitHub README', source: 'github', medium: 'referral', campaign: 'readme' },
];

function buildUrl(params: UtmParams): string {
  const { baseUrl, source, medium, campaign, term, content } = params;
  if (!baseUrl) return '';
  try {
    const url = new URL(baseUrl.startsWith('http') ? baseUrl : 'https://' + baseUrl);
    if (source) url.searchParams.set('utm_source', source);
    if (medium) url.searchParams.set('utm_medium', medium);
    if (campaign) url.searchParams.set('utm_campaign', campaign);
    if (term) url.searchParams.set('utm_term', term);
    if (content) url.searchParams.set('utm_content', content);
    return url.toString();
  } catch {
    return '';
  }
}

export default function UtmCampaignBuilder() {
  const [params, setParams] = useState<UtmParams>({
    baseUrl: 'https://devplaybook.cc',
    source: 'newsletter',
    medium: 'email',
    campaign: 'weekly-digest',
    term: '',
    content: '',
  });
  const [copied, setCopied] = useState(false);

  const finalUrl = useMemo(() => buildUrl(params), [params]);

  function set(key: keyof UtmParams, value: string) {
    setParams(p => ({ ...p, [key]: value }));
  }

  function applyPreset(preset: typeof PRESETS[0]) {
    setParams(p => ({ ...p, ...preset }));
  }

  async function copyUrl() {
    if (!finalUrl) return;
    await navigator.clipboard.writeText(finalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const isValid = !!params.baseUrl && !!params.source && !!params.medium && !!params.campaign;

  return (
    <div class="space-y-6">
      {/* Presets */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <h2 class="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">Quick Presets</h2>
        <div class="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => applyPreset(p)}
              class="text-xs bg-bg border border-border hover:border-primary px-3 py-1.5 rounded-full transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Inputs */}
      <div class="bg-bg-card border border-border rounded-xl p-5 space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">
            Website URL <span class="text-red-400">*</span>
          </label>
          <input
            class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-primary focus:border-transparent"
            value={params.baseUrl}
            onInput={(e) => set('baseUrl', (e.target as HTMLInputElement).value)}
            placeholder="https://yoursite.com/landing"
            spellcheck={false}
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium mb-1">
              Campaign Source <span class="text-red-400">*</span>
              <span class="text-xs text-text-muted font-normal ml-1">utm_source</span>
            </label>
            <input
              class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
              value={params.source}
              onInput={(e) => set('source', (e.target as HTMLInputElement).value)}
              placeholder="google, newsletter, twitter"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">
              Campaign Medium <span class="text-red-400">*</span>
              <span class="text-xs text-text-muted font-normal ml-1">utm_medium</span>
            </label>
            <input
              class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
              value={params.medium}
              onInput={(e) => set('medium', (e.target as HTMLInputElement).value)}
              placeholder="cpc, email, social"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">
              Campaign Name <span class="text-red-400">*</span>
              <span class="text-xs text-text-muted font-normal ml-1">utm_campaign</span>
            </label>
            <input
              class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
              value={params.campaign}
              onInput={(e) => set('campaign', (e.target as HTMLInputElement).value)}
              placeholder="spring-sale, launch-2025"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">
              Campaign Term
              <span class="text-xs text-text-muted font-normal ml-1">utm_term (optional)</span>
            </label>
            <input
              class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
              value={params.term}
              onInput={(e) => set('term', (e.target as HTMLInputElement).value)}
              placeholder="paid keywords"
            />
          </div>
          <div class="sm:col-span-2">
            <label class="block text-sm font-medium mb-1">
              Campaign Content
              <span class="text-xs text-text-muted font-normal ml-1">utm_content (optional, A/B test differentiation)</span>
            </label>
            <input
              class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
              value={params.content}
              onInput={(e) => set('content', (e.target as HTMLInputElement).value)}
              placeholder="banner-a, hero-cta, sidebar"
            />
          </div>
        </div>
      </div>

      {/* Live Preview */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-base font-semibold">Generated URL</h2>
          <button
            onClick={copyUrl}
            disabled={!isValid || !finalUrl}
            class={`text-sm px-4 py-2 rounded-lg transition-colors ${
              isValid && finalUrl
                ? 'bg-primary hover:bg-primary/80 text-white'
                : 'bg-bg border border-border text-text-muted/50 cursor-not-allowed'
            }`}
          >
            {copied ? '✓ Copied!' : 'Copy URL'}
          </button>
        </div>
        {!isValid ? (
          <p class="text-sm text-text-muted">Fill in the required fields (Source, Medium, Campaign) to generate your URL.</p>
        ) : finalUrl ? (
          <div>
            <div class="bg-bg rounded-lg p-3 font-mono text-sm break-all text-green-400 border border-border">
              {finalUrl}
            </div>
            {/* Parameter breakdown */}
            <div class="mt-3 space-y-1">
              {[
                { key: 'utm_source', val: params.source },
                { key: 'utm_medium', val: params.medium },
                { key: 'utm_campaign', val: params.campaign },
                ...(params.term ? [{ key: 'utm_term', val: params.term }] : []),
                ...(params.content ? [{ key: 'utm_content', val: params.content }] : []),
              ].map(({ key, val }) => (
                <div key={key} class="flex items-center gap-2 text-xs">
                  <span class="font-mono text-text-muted bg-bg px-2 py-0.5 rounded border border-border">{key}</span>
                  <span class="text-text-muted">→</span>
                  <span class="font-mono text-accent">{val}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p class="text-sm text-red-400">Invalid URL — please check the website URL field.</p>
        )}
      </div>

      {/* GA4 tip */}
      <div class="bg-bg-card border border-border rounded-xl p-4 text-sm text-text-muted">
        <p class="font-medium text-text mb-1">GA4 Tip</p>
        <p>In Google Analytics 4, campaign data appears under <strong>Reports → Acquisition → Traffic acquisition</strong>. Allow 24–48 hours for new UTM parameters to appear. Use consistent naming (lowercase, hyphens) to avoid duplicate sessions in reports.</p>
      </div>
    </div>
  );
}
