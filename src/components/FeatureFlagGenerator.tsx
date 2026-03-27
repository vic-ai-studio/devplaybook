import { useState } from 'preact/hooks';

type FlagType = 'boolean' | 'string' | 'number' | 'json';
type TargetSystem = 'simple-json' | 'launchdarkly' | 'unleash' | 'openfeature' | 'env';
type RolloutType = 'all' | 'percentage' | 'segment';

interface TargetingRule {
  type: RolloutType;
  percentage?: number;
  segment?: string;
}

interface FlagConfig {
  name: string;
  type: FlagType;
  defaultValue: string;
  description: string;
  targeting: TargetingRule;
  enabled: boolean;
}

const FLAG_SYSTEMS: { value: TargetSystem; label: string }[] = [
  { value: 'simple-json', label: 'Simple JSON' },
  { value: 'env', label: 'Environment Variables (.env)' },
  { value: 'launchdarkly', label: 'LaunchDarkly' },
  { value: 'unleash', label: 'Unleash' },
  { value: 'openfeature', label: 'OpenFeature (JSON)' },
];

function toEnvName(name: string) {
  return name.replace(/([a-z])([A-Z])/g, '$1_$2').replace(/[-\s.]/g, '_').toUpperCase();
}

function generateOutput(flag: FlagConfig, system: TargetSystem): string {
  const envName = toEnvName(flag.name);
  const defaultVal = flag.type === 'boolean'
    ? flag.defaultValue === 'true' ? true : false
    : flag.type === 'number'
    ? Number(flag.defaultValue) || 0
    : flag.type === 'json'
    ? (() => { try { return JSON.parse(flag.defaultValue); } catch { return {}; } })()
    : flag.defaultValue;

  const rollout = flag.targeting.type === 'percentage'
    ? flag.targeting.percentage ?? 100
    : flag.targeting.type === 'segment' ? 0 : 100;

  if (system === 'simple-json') {
    const obj: Record<string, unknown> = {
      [flag.name]: {
        enabled: flag.enabled,
        type: flag.type,
        defaultValue: defaultVal,
        ...(flag.description ? { description: flag.description } : {}),
        ...(flag.targeting.type !== 'all' ? {
          targeting: flag.targeting.type === 'percentage'
            ? { type: 'percentage', percentage: rollout }
            : { type: 'segment', segment: flag.targeting.segment || 'beta-users' }
        } : {}),
      }
    };
    return JSON.stringify(obj, null, 2);
  }

  if (system === 'env') {
    const lines: string[] = [`# Feature flag: ${flag.name}`];
    if (flag.description) lines.push(`# ${flag.description}`);
    lines.push(`FEATURE_${envName}=${flag.type === 'boolean' ? (flag.enabled ? 'true' : 'false') : flag.defaultValue}`);
    if (flag.targeting.type === 'percentage') {
      lines.push(`FEATURE_${envName}_ROLLOUT=${rollout}`);
    }
    return lines.join('\n');
  }

  if (system === 'launchdarkly') {
    const obj = {
      key: flag.name,
      name: flag.name.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      kind: flag.type === 'boolean' ? 'boolean' : 'multivariate',
      ...(flag.type !== 'boolean' ? {
        variations: [
          { value: defaultVal, name: 'Default', description: 'Default value' },
          { value: flag.type === 'boolean' ? true : (flag.type === 'number' ? 1 : 'variant-a'), name: 'Variant A' }
        ]
      } : {}),
      defaultVariation: 0,
      offVariation: 1,
      on: flag.enabled,
      ...(flag.targeting.type === 'percentage' ? {
        fallthrough: {
          rollout: {
            variations: [
              { variation: 0, weight: rollout * 1000 },
              { variation: 1, weight: (100 - rollout) * 1000 }
            ]
          }
        }
      } : {}),
      tags: ['generated'],
    };
    return JSON.stringify(obj, null, 2);
  }

  if (system === 'unleash') {
    const obj = {
      name: flag.name,
      description: flag.description || '',
      enabled: flag.enabled,
      strategies: flag.targeting.type === 'all'
        ? [{ name: 'default', parameters: {} }]
        : flag.targeting.type === 'percentage'
        ? [{ name: 'gradualRolloutRandom', parameters: { percentage: String(rollout), groupId: flag.name } }]
        : [{ name: 'userWithId', parameters: { userIds: '' }, constraints: [{ contextName: 'userGroup', operator: 'IN', values: [flag.targeting.segment || 'beta'] }] }],
      variants: flag.type !== 'boolean' ? [{ name: 'default', weight: 1000, weightType: 'variable', payload: { type: flag.type === 'json' ? 'json' : 'string', value: String(flag.defaultValue) } }] : [],
    };
    return JSON.stringify(obj, null, 2);
  }

  if (system === 'openfeature') {
    const obj = {
      flags: {
        [flag.name]: {
          state: flag.enabled ? 'ENABLED' : 'DISABLED',
          defaultVariant: 'default',
          variants: {
            default: defaultVal,
            ...(flag.targeting.type === 'percentage'
              ? { enabled: flag.type === 'boolean' ? true : (flag.type === 'number' ? 1 : 'on') }
              : {})
          },
          ...(flag.description ? { description: flag.description } : {}),
          ...(flag.targeting.type === 'percentage' ? {
            targeting: { fractional: [['default', 100 - rollout], ['enabled', rollout]] }
          } : {}),
        }
      }
    };
    return JSON.stringify(obj, null, 2);
  }

  return '';
}

const DEFAULT_VALUES: Record<FlagType, string> = {
  boolean: 'false',
  string: 'default',
  number: '0',
  json: '{}',
};

export default function FeatureFlagGenerator() {
  const [flag, setFlag] = useState<FlagConfig>({
    name: 'new-checkout-flow',
    type: 'boolean',
    defaultValue: 'false',
    description: 'Enable the redesigned checkout experience',
    targeting: { type: 'all' },
    enabled: true,
  });
  const [system, setSystem] = useState<TargetSystem>('simple-json');
  const [copied, setCopied] = useState(false);

  const output = generateOutput(flag, system);

  function updateFlag(patch: Partial<FlagConfig>) {
    setFlag(f => ({ ...f, ...patch }));
  }

  function handleTypeChange(type: FlagType) {
    updateFlag({ type, defaultValue: DEFAULT_VALUES[type] });
  }

  function handleCopy() {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const inputClass = "w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent";
  const labelClass = "block text-xs font-medium text-text-muted mb-1 uppercase tracking-wide";

  return (
    <div class="space-y-6">
      {/* System Selector */}
      <div>
        <label class={labelClass}>Target System</label>
        <div class="flex flex-wrap gap-2">
          {FLAG_SYSTEMS.map(s => (
            <button
              key={s.value}
              onClick={() => setSystem(s.value)}
              class={`px-3 py-1.5 rounded text-sm font-medium border transition-colors ${
                system === s.value
                  ? 'bg-accent text-bg-base border-accent'
                  : 'bg-bg-card text-text-muted border-border hover:border-accent hover:text-text-primary'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Flag Name */}
        <div>
          <label class={labelClass}>Flag Name (key)</label>
          <input
            type="text"
            value={flag.name}
            onInput={e => updateFlag({ name: (e.target as HTMLInputElement).value })}
            placeholder="new-checkout-flow"
            class={inputClass}
          />
          <p class="text-xs text-text-muted mt-1">Use kebab-case or camelCase</p>
        </div>

        {/* Flag Type */}
        <div>
          <label class={labelClass}>Value Type</label>
          <select
            value={flag.type}
            onChange={e => handleTypeChange((e.target as HTMLSelectElement).value as FlagType)}
            class={inputClass}
          >
            <option value="boolean">Boolean (on/off)</option>
            <option value="string">String</option>
            <option value="number">Number</option>
            <option value="json">JSON</option>
          </select>
        </div>

        {/* Default Value */}
        <div>
          <label class={labelClass}>Default Value</label>
          {flag.type === 'boolean' ? (
            <select
              value={flag.defaultValue}
              onChange={e => updateFlag({ defaultValue: (e.target as HTMLSelectElement).value })}
              class={inputClass}
            >
              <option value="false">false</option>
              <option value="true">true</option>
            </select>
          ) : flag.type === 'json' ? (
            <textarea
              value={flag.defaultValue}
              onInput={e => updateFlag({ defaultValue: (e.target as HTMLTextAreaElement).value })}
              rows={2}
              class={inputClass + ' font-mono'}
              placeholder='{}'
            />
          ) : (
            <input
              type={flag.type === 'number' ? 'number' : 'text'}
              value={flag.defaultValue}
              onInput={e => updateFlag({ defaultValue: (e.target as HTMLInputElement).value })}
              class={inputClass}
            />
          )}
        </div>

        {/* Description */}
        <div>
          <label class={labelClass}>Description</label>
          <input
            type="text"
            value={flag.description}
            onInput={e => updateFlag({ description: (e.target as HTMLInputElement).value })}
            placeholder="What does this flag control?"
            class={inputClass}
          />
        </div>
      </div>

      {/* Targeting */}
      <div>
        <label class={labelClass}>Rollout Strategy</label>
        <div class="flex flex-wrap gap-2 mb-3">
          {(['all', 'percentage', 'segment'] as RolloutType[]).map(t => (
            <button
              key={t}
              onClick={() => updateFlag({ targeting: { type: t } })}
              class={`px-3 py-1.5 rounded text-sm font-medium border transition-colors ${
                flag.targeting.type === t
                  ? 'bg-accent text-bg-base border-accent'
                  : 'bg-bg-card text-text-muted border-border hover:border-accent hover:text-text-primary'
              }`}
            >
              {t === 'all' ? 'All Users' : t === 'percentage' ? 'Percentage Rollout' : 'User Segment'}
            </button>
          ))}
        </div>
        {flag.targeting.type === 'percentage' && (
          <div class="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={100}
              value={flag.targeting.percentage ?? 50}
              onInput={e => updateFlag({ targeting: { type: 'percentage', percentage: Number((e.target as HTMLInputElement).value) } })}
              class="flex-1 accent-accent"
            />
            <span class="text-sm font-mono w-12 text-right text-text-primary">{flag.targeting.percentage ?? 50}%</span>
          </div>
        )}
        {flag.targeting.type === 'segment' && (
          <input
            type="text"
            value={flag.targeting.segment || ''}
            onInput={e => updateFlag({ targeting: { type: 'segment', segment: (e.target as HTMLInputElement).value } })}
            placeholder="beta-users"
            class={inputClass}
          />
        )}
      </div>

      {/* Enabled toggle */}
      <div class="flex items-center gap-3">
        <button
          onClick={() => updateFlag({ enabled: !flag.enabled })}
          class={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${flag.enabled ? 'bg-accent' : 'bg-border'}`}
        >
          <span class={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${flag.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
        <span class="text-sm text-text-primary">Flag is <strong>{flag.enabled ? 'enabled' : 'disabled'}</strong></span>
      </div>

      {/* Output */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class={labelClass}>Generated Config</label>
          <button
            onClick={handleCopy}
            class="text-xs px-3 py-1 rounded bg-bg-card border border-border hover:border-accent text-text-muted hover:text-text-primary transition-colors"
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <pre class="bg-bg-card border border-border rounded p-4 text-sm font-mono text-text-primary overflow-x-auto whitespace-pre-wrap">{output}</pre>
      </div>
    </div>
  );
}
