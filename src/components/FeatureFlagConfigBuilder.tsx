import { useState } from 'preact/hooks';

function makeId() {
  return Math.random().toString(36).slice(2);
}

type RuleType = 'percentage' | 'userIds' | 'attribute';
type OutputFormat = 'openfeature' | 'launchdarkly' | 'growthbook';

interface TargetingRule {
  id: string;
  type: RuleType;
  percentage: number;
  userIds: string;
  attributeName: string;
  attributeValue: string;
}

interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  defaultEnabled: boolean;
  rules: TargetingRule[];
}

function defaultFlags(): FeatureFlag[] {
  return [
    {
      id: makeId(),
      name: 'new-dashboard',
      description: 'Enable the redesigned dashboard UI',
      defaultEnabled: false,
      rules: [
        {
          id: makeId(),
          type: 'percentage',
          percentage: 20,
          userIds: '',
          attributeName: '',
          attributeValue: '',
        },
      ],
    },
    {
      id: makeId(),
      name: 'dark-mode',
      description: 'Dark mode theme support',
      defaultEnabled: true,
      rules: [],
    },
    {
      id: makeId(),
      name: 'beta-checkout',
      description: 'New checkout flow for beta users',
      defaultEnabled: false,
      rules: [
        {
          id: makeId(),
          type: 'userIds',
          percentage: 100,
          userIds: 'user-001, user-042, user-099',
          attributeName: '',
          attributeValue: '',
        },
      ],
    },
  ];
}

// ── Generators ──────────────────────────────────────────────────────────────

function toSlug(name: string) {
  return name.trim().replace(/[^a-z0-9-_]/gi, '-').toLowerCase() || 'flag-name';
}

function generateOpenFeature(flags: FeatureFlag[]): object {
  const result: Record<string, object> = {};
  for (const f of flags) {
    const slug = toSlug(f.name);
    const entry: Record<string, unknown> = {
      state: f.defaultEnabled ? 'ENABLED' : 'DISABLED',
      defaultVariant: f.defaultEnabled ? 'on' : 'off',
      variants: { on: true, off: false },
    };
    if (f.description) {
      entry.metadata = { description: f.description };
    }
    if (f.rules.length > 0) {
      entry.targeting = {
        if: f.rules.map(r => buildOpenFeatureRule(r)).concat([
          { var: 'defaultVariant' }
        ]),
      };
    }
    result[slug] = entry;
  }
  return { flags: result };
}

function buildOpenFeatureRule(r: TargetingRule): object {
  if (r.type === 'percentage') {
    return {
      'if': [
        { '<=': [{ 'fractional': [r.percentage] }, r.percentage] },
        'on',
        null,
      ],
    };
  }
  if (r.type === 'userIds') {
    const ids = r.userIds.split(',').map(s => s.trim()).filter(Boolean);
    return {
      'if': [
        { 'in': [{ var: 'targetingKey' }, ids] },
        'on',
        null,
      ],
    };
  }
  // attribute
  return {
    'if': [
      { '==': [{ var: `user.${r.attributeName || 'attribute'}` }, r.attributeValue] },
      'on',
      null,
    ],
  };
}

function generateLaunchDarkly(flags: FeatureFlag[]): object {
  return {
    flags: flags.map(f => {
      const slug = toSlug(f.name);
      const rules = f.rules.map((r, i) => buildLDRule(r, i));
      return {
        key: slug,
        name: f.name.trim() || 'Flag Name',
        description: f.description,
        kind: 'boolean',
        on: true,
        fallthrough: { variation: f.defaultEnabled ? 0 : 1 },
        offVariation: 1,
        variations: [
          { value: true, name: 'on' },
          { value: false, name: 'off' },
        ],
        rules,
        targets: [],
        prerequisites: [],
        clientSideAvailability: { usingEnvironmentId: true, usingMobileKey: false },
        tags: [],
        version: 1,
      };
    }),
  };
}

function buildLDRule(r: TargetingRule, index: number): object {
  if (r.type === 'percentage') {
    return {
      id: `rule-${index}`,
      rollout: {
        variations: [
          { variation: 0, weight: r.percentage * 1000 },
          { variation: 1, weight: (100 - r.percentage) * 1000 },
        ],
      },
      clauses: [],
      trackEvents: false,
    };
  }
  if (r.type === 'userIds') {
    const ids = r.userIds.split(',').map(s => s.trim()).filter(Boolean);
    return {
      id: `rule-${index}`,
      variation: 0,
      clauses: [
        {
          attribute: 'key',
          op: 'in',
          values: ids,
          negate: false,
        },
      ],
      trackEvents: false,
    };
  }
  // attribute
  return {
    id: `rule-${index}`,
    variation: 0,
    clauses: [
      {
        attribute: r.attributeName || 'attribute',
        op: 'in',
        values: [r.attributeValue],
        negate: false,
      },
    ],
    trackEvents: false,
  };
}

function generateGrowthBook(flags: FeatureFlag[]): object {
  const features: Record<string, object> = {};
  for (const f of flags) {
    const slug = toSlug(f.name);
    const rules = f.rules.map(r => buildGBRule(r));
    features[slug] = {
      description: f.description,
      defaultValue: f.defaultEnabled,
      valueType: 'boolean',
      rules,
    };
  }
  return { features };
}

function buildGBRule(r: TargetingRule): object {
  if (r.type === 'percentage') {
    return {
      force: true,
      coverage: r.percentage / 100,
      hashAttribute: 'id',
    };
  }
  if (r.type === 'userIds') {
    const ids = r.userIds.split(',').map(s => s.trim()).filter(Boolean);
    return {
      force: true,
      condition: { id: { $in: ids } },
    };
  }
  // attribute
  return {
    force: true,
    condition: { [r.attributeName || 'attribute']: r.attributeValue },
  };
}

// ── Component ────────────────────────────────────────────────────────────────

export default function FeatureFlagConfigBuilder() {
  const [flags, setFlags] = useState<FeatureFlag[]>(defaultFlags);
  const [activeFormat, setActiveFormat] = useState<OutputFormat>('openfeature');
  const [copied, setCopied] = useState(false);

  function addFlag() {
    setFlags(prev => [...prev, {
      id: makeId(),
      name: '',
      description: '',
      defaultEnabled: false,
      rules: [],
    }]);
  }

  function removeFlag(id: string) {
    setFlags(prev => prev.filter(f => f.id !== id));
  }

  function updateFlag(id: string, field: keyof FeatureFlag, value: any) {
    setFlags(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f));
  }

  function addRule(flagId: string) {
    setFlags(prev => prev.map(f =>
      f.id === flagId
        ? {
            ...f,
            rules: [...f.rules, {
              id: makeId(),
              type: 'percentage',
              percentage: 10,
              userIds: '',
              attributeName: '',
              attributeValue: '',
            }],
          }
        : f
    ));
  }

  function removeRule(flagId: string, ruleId: string) {
    setFlags(prev => prev.map(f =>
      f.id === flagId
        ? { ...f, rules: f.rules.filter(r => r.id !== ruleId) }
        : f
    ));
  }

  function updateRule(flagId: string, ruleId: string, field: keyof TargetingRule, value: any) {
    setFlags(prev => prev.map(f =>
      f.id === flagId
        ? {
            ...f,
            rules: f.rules.map(r => r.id === ruleId ? { ...r, [field]: value } : r),
          }
        : f
    ));
  }

  const config =
    activeFormat === 'openfeature' ? generateOpenFeature(flags)
    : activeFormat === 'launchdarkly' ? generateLaunchDarkly(flags)
    : generateGrowthBook(flags);

  const output = JSON.stringify(config, null, 2);

  function copyOutput() {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const FORMATS: { key: OutputFormat; label: string }[] = [
    { key: 'openfeature', label: 'OpenFeature JSON' },
    { key: 'launchdarkly', label: 'LaunchDarkly' },
    { key: 'growthbook', label: 'GrowthBook' },
  ];

  return (
    <div class="space-y-4">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Flag definitions */}
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div class="text-sm font-medium">Feature Flags ({flags.length})</div>
            <button
              onClick={addFlag}
              class="bg-accent hover:bg-accent/90 text-white text-sm font-medium py-1.5 px-3 rounded-lg transition-colors"
            >
              + Add Flag
            </button>
          </div>

          <div class="space-y-3 max-h-[560px] overflow-y-auto pr-1">
            {flags.map((f, i) => (
              <div key={f.id} class="bg-surface border border-border rounded-lg p-3 space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-xs text-text-muted font-mono">flag #{i + 1}</span>
                  <button
                    onClick={() => removeFlag(f.id)}
                    class="text-text-muted hover:text-red-400 text-xs transition-colors"
                  >
                    Remove
                  </button>
                </div>

                <div>
                  <label class="block text-xs text-text-muted mb-0.5">Flag name *</label>
                  <input
                    type="text"
                    class="w-full font-mono text-sm bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                    value={f.name}
                    onInput={(e) => updateFlag(f.id, 'name', (e.target as HTMLInputElement).value.replace(/\s+/g, '-').toLowerCase())}
                    placeholder="feature-name"
                  />
                </div>

                <div>
                  <label class="block text-xs text-text-muted mb-0.5">Description</label>
                  <input
                    type="text"
                    class="w-full text-sm bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                    value={f.description}
                    onInput={(e) => updateFlag(f.id, 'description', (e.target as HTMLInputElement).value)}
                    placeholder="What this flag controls..."
                  />
                </div>

                <label class="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={f.defaultEnabled}
                    onChange={(e) => updateFlag(f.id, 'defaultEnabled', (e.target as HTMLInputElement).checked)}
                    class="rounded"
                  />
                  Enabled by default
                </label>

                {/* Targeting rules */}
                <div class="space-y-1.5 border-t border-border pt-2">
                  <div class="flex items-center justify-between">
                    <label class="text-xs text-text-muted">Targeting Rules ({f.rules.length})</label>
                    <button
                      onClick={() => addRule(f.id)}
                      class="text-xs text-accent hover:text-accent/80 transition-colors"
                    >
                      + Add rule
                    </button>
                  </div>
                  {f.rules.map((r, ri) => (
                    <div key={r.id} class="bg-surface-alt border border-border rounded p-2 space-y-1.5">
                      <div class="flex items-center justify-between">
                        <span class="text-xs text-text-muted">Rule {ri + 1}</span>
                        <button
                          onClick={() => removeRule(f.id, r.id)}
                          class="text-text-muted hover:text-red-400 text-xs transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                      <div>
                        <label class="block text-xs text-text-muted mb-0.5">Type</label>
                        <select
                          class="w-full text-xs bg-surface border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                          value={r.type}
                          onChange={(e) => updateRule(f.id, r.id, 'type', (e.target as HTMLSelectElement).value as RuleType)}
                        >
                          <option value="percentage">Percentage rollout</option>
                          <option value="userIds">User ID list</option>
                          <option value="attribute">Attribute match</option>
                        </select>
                      </div>
                      {r.type === 'percentage' && (
                        <div class="flex items-center gap-2">
                          <label class="text-xs text-text-muted flex-shrink-0">Rollout %</label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={r.percentage}
                            onInput={(e) => updateRule(f.id, r.id, 'percentage', Number((e.target as HTMLInputElement).value))}
                            class="flex-1 accent-[var(--color-accent,#6366f1)]"
                          />
                          <span class="text-xs font-mono text-text w-8 text-right">{r.percentage}%</span>
                        </div>
                      )}
                      {r.type === 'userIds' && (
                        <div>
                          <label class="block text-xs text-text-muted mb-0.5">User IDs (comma-separated)</label>
                          <input
                            type="text"
                            class="w-full font-mono text-xs bg-surface border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                            value={r.userIds}
                            onInput={(e) => updateRule(f.id, r.id, 'userIds', (e.target as HTMLInputElement).value)}
                            placeholder="user-001, user-042, user-099"
                          />
                        </div>
                      )}
                      {r.type === 'attribute' && (
                        <div class="grid grid-cols-2 gap-1.5">
                          <div>
                            <label class="block text-xs text-text-muted mb-0.5">Attribute</label>
                            <input
                              type="text"
                              class="w-full font-mono text-xs bg-surface border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                              value={r.attributeName}
                              onInput={(e) => updateRule(f.id, r.id, 'attributeName', (e.target as HTMLInputElement).value)}
                              placeholder="plan"
                            />
                          </div>
                          <div>
                            <label class="block text-xs text-text-muted mb-0.5">Value</label>
                            <input
                              type="text"
                              class="w-full font-mono text-xs bg-surface border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                              value={r.attributeValue}
                              onInput={(e) => updateRule(f.id, r.id, 'attributeValue', (e.target as HTMLInputElement).value)}
                              placeholder="pro"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {f.rules.length === 0 && (
                    <p class="text-xs text-text-muted/50 italic">No targeting rules — flag uses default value only</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Generated output */}
        <div class="space-y-2">
          <div class="flex items-center gap-2 flex-wrap">
            {FORMATS.map(fmt => (
              <button
                key={fmt.key}
                onClick={() => { setActiveFormat(fmt.key); setCopied(false); }}
                class={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  activeFormat === fmt.key
                    ? 'bg-accent/20 border-accent/50 text-accent'
                    : 'border-border text-text-muted hover:bg-surface'
                }`}
              >
                {fmt.label}
              </button>
            ))}
            <button
              onClick={copyOutput}
              class="ml-auto text-sm px-3 py-1.5 border border-border rounded-lg hover:bg-surface transition-colors"
            >
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>

          <pre class="w-full h-[560px] overflow-auto font-mono text-sm bg-surface border border-border rounded-lg p-4 text-text whitespace-pre">
{output}
          </pre>

          <div class="text-xs text-text-muted bg-surface border border-border rounded-lg p-3">
            {activeFormat === 'openfeature' && (
              <p>
                <span class="font-medium">OpenFeature JSON provider</span> — use with
                <span class="font-mono"> @openfeature/flagd-provider</span> or any OpenFeature-compatible SDK.
                Save as <span class="font-mono">flags.json</span> and point your provider at it.
              </p>
            )}
            {activeFormat === 'launchdarkly' && (
              <p>
                <span class="font-medium">LaunchDarkly flag rules</span> — compatible with
                LaunchDarkly's flag import format and the LaunchDarkly CLI (<span class="font-mono">ld-cli</span>).
                Use with the REST API or local file-based testing.
              </p>
            )}
            {activeFormat === 'growthbook' && (
              <p>
                <span class="font-medium">GrowthBook feature config</span> — use with GrowthBook's
                self-hosted instance or SDK. Paste into the features JSON endpoint or save as a local fixture.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
