import { useState } from 'preact/hooks';

// ─── Types ────────────────────────────────────────────────────────────────────

interface IamStatement {
  Sid?: string;
  Effect: 'Allow' | 'Deny';
  Action?: string | string[];
  NotAction?: string | string[];
  Resource?: string | string[];
  Condition?: Record<string, unknown>;
}

interface IamPolicy {
  Version?: string;
  Statement: IamStatement[];
}

interface SimulationResult {
  verdict: 'ALLOW' | 'DENY';
  reason: 'explicit_deny' | 'explicit_allow' | 'implicit_deny';
  matchedStatementIndex: number | null;
  matchedStatementId: string | null;
  matchedEffect: string | null;
  matchedAction: string | null;
  hasConditions: boolean;
  explanation: string;
}

// ─── Example Policies ─────────────────────────────────────────────────────────

const EXAMPLE_POLICIES: Record<string, { label: string; policy: object }> = {
  s3_readonly: {
    label: 'S3 Read-Only',
    policy: {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'AllowS3ReadOnly',
          Effect: 'Allow',
          Action: ['s3:GetObject', 's3:ListBucket', 's3:GetBucketLocation'],
          Resource: ['arn:aws:s3:::my-bucket', 'arn:aws:s3:::my-bucket/*'],
        },
      ],
    },
  },
  ec2_admin: {
    label: 'EC2 Admin',
    policy: {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'AllowEC2Full',
          Effect: 'Allow',
          Action: 'ec2:*',
          Resource: '*',
        },
        {
          Sid: 'DenyTerminate',
          Effect: 'Deny',
          Action: 'ec2:TerminateInstances',
          Resource: '*',
        },
      ],
    },
  },
  least_privilege: {
    label: 'Least Privilege (DynamoDB + Lambda)',
    policy: {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'AllowDynamoDBReadWrite',
          Effect: 'Allow',
          Action: ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:UpdateItem', 'dynamodb:Query'],
          Resource: 'arn:aws:dynamodb:us-east-1:123456789012:table/MyTable',
        },
        {
          Sid: 'AllowLambdaInvoke',
          Effect: 'Allow',
          Action: 'lambda:InvokeFunction',
          Resource: 'arn:aws:lambda:us-east-1:123456789012:function:MyFunction',
        },
      ],
    },
  },
};

const SAMPLE_POLICY = JSON.stringify(
  {
    Version: '2012-10-17',
    Statement: [
      {
        Sid: 'AllowS3ReadWrite',
        Effect: 'Allow',
        Action: ['s3:GetObject', 's3:PutObject', 's3:ListBucket'],
        Resource: ['arn:aws:s3:::my-bucket', 'arn:aws:s3:::my-bucket/*'],
      },
      {
        Sid: 'DenyDeleteObject',
        Effect: 'Deny',
        Action: 's3:DeleteObject',
        Resource: 'arn:aws:s3:::my-bucket/*',
      },
    ],
  },
  null,
  2
);

const ACTION_SUGGESTIONS = [
  's3:GetObject',
  's3:PutObject',
  's3:DeleteObject',
  's3:ListBucket',
  'ec2:StartInstances',
  'ec2:StopInstances',
  'ec2:TerminateInstances',
  'ec2:DescribeInstances',
  'iam:GetUser',
  'iam:CreateUser',
  'iam:DeleteUser',
  'lambda:InvokeFunction',
  'dynamodb:GetItem',
  'dynamodb:PutItem',
  'dynamodb:UpdateItem',
  'dynamodb:Query',
];

// ─── Matching Logic ───────────────────────────────────────────────────────────

function matchesAction(pattern: string, action: string): boolean {
  if (pattern === '*') return true;
  const lowerPattern = pattern.toLowerCase();
  const lowerAction = action.toLowerCase();
  if (lowerPattern === lowerAction) return true;

  // service:* wildcard (e.g. s3:*)
  if (lowerPattern.endsWith(':*')) {
    const service = lowerPattern.slice(0, -2);
    return lowerAction.startsWith(service + ':');
  }

  // generic wildcard with *
  if (lowerPattern.includes('*')) {
    const escaped = lowerPattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    return new RegExp('^' + escaped + '$').test(lowerAction);
  }

  return false;
}

function matchesResource(pattern: string, resource: string): boolean {
  if (pattern === '*') return true;
  if (pattern === resource) return true;

  if (pattern.includes('*')) {
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    return new RegExp('^' + escaped + '$').test(resource);
  }

  return false;
}

function normalizeToArray(val: string | string[] | undefined): string[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

function simulatePolicy(
  policy: IamPolicy,
  action: string,
  resource: string
): SimulationResult {
  const statements = policy.Statement || [];

  // Pass 1: Check for explicit Deny
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    if (stmt.Effect !== 'Deny') continue;

    const actions = normalizeToArray(stmt.Action);
    const resources = normalizeToArray(stmt.Resource);
    const hasConditions = !!stmt.Condition && Object.keys(stmt.Condition).length > 0;

    const actionMatch = actions.some(a => matchesAction(a, action));
    const resourceMatch = resources.some(r => matchesResource(r, resource));

    if (actionMatch && resourceMatch) {
      const conditionNote = hasConditions
        ? ' (Note: this statement has Condition keys — they are not evaluated in this simplified simulation.)'
        : '';
      return {
        verdict: 'DENY',
        reason: 'explicit_deny',
        matchedStatementIndex: i,
        matchedStatementId: stmt.Sid || null,
        matchedEffect: 'Deny',
        matchedAction: actions.find(a => matchesAction(a, action)) || null,
        hasConditions,
        explanation:
          `Explicit DENY matched in statement ${stmt.Sid ? `"${stmt.Sid}"` : `#${i + 1}`}. ` +
          `Action "${action}" matched pattern "${actions.find(a => matchesAction(a, action))}" ` +
          `and resource "${resource}" matched pattern "${resources.find(r => matchesResource(r, resource))}". ` +
          `An explicit Deny always overrides any Allow.` +
          conditionNote,
      };
    }
  }

  // Pass 2: Check for explicit Allow
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    if (stmt.Effect !== 'Allow') continue;

    // Handle NotAction: matches everything except these actions
    if (stmt.NotAction !== undefined) {
      const notActions = normalizeToArray(stmt.NotAction);
      const resources = normalizeToArray(stmt.Resource);
      const hasConditions = !!stmt.Condition && Object.keys(stmt.Condition).length > 0;

      const actionExcluded = notActions.some(a => matchesAction(a, action));
      const resourceMatch = resources.some(r => matchesResource(r, resource));

      if (!actionExcluded && resourceMatch) {
        const conditionNote = hasConditions
          ? ' (Note: this statement has Condition keys — they are not evaluated in this simplified simulation.)'
          : '';
        return {
          verdict: 'ALLOW',
          reason: 'explicit_allow',
          matchedStatementIndex: i,
          matchedStatementId: stmt.Sid || null,
          matchedEffect: 'Allow',
          matchedAction: `NotAction (action not in exclusion list)`,
          hasConditions,
          explanation:
            `Explicit ALLOW matched in statement ${stmt.Sid ? `"${stmt.Sid}"` : `#${i + 1}`} via NotAction. ` +
            `Action "${action}" is NOT in the NotAction list, so it is allowed for ` +
            `resource "${resources.find(r => matchesResource(r, resource))}".` +
            conditionNote,
        };
      }
      continue;
    }

    const actions = normalizeToArray(stmt.Action);
    const resources = normalizeToArray(stmt.Resource);
    const hasConditions = !!stmt.Condition && Object.keys(stmt.Condition).length > 0;

    const matchedActionPattern = actions.find(a => matchesAction(a, action));
    const matchedResourcePattern = resources.find(r => matchesResource(r, resource));

    if (matchedActionPattern && matchedResourcePattern) {
      const conditionNote = hasConditions
        ? ' (Note: this statement has Condition keys — they are not evaluated in this simplified simulation.)'
        : '';
      return {
        verdict: 'ALLOW',
        reason: 'explicit_allow',
        matchedStatementIndex: i,
        matchedStatementId: stmt.Sid || null,
        matchedEffect: 'Allow',
        matchedAction: matchedActionPattern,
        hasConditions,
        explanation:
          `Explicit ALLOW matched in statement ${stmt.Sid ? `"${stmt.Sid}"` : `#${i + 1}`}. ` +
          `Action "${action}" matched pattern "${matchedActionPattern}" ` +
          `and resource "${resource}" matched pattern "${matchedResourcePattern}".` +
          conditionNote,
      };
    }
  }

  // Pass 3: Implicit Deny (no matching Allow found)
  return {
    verdict: 'DENY',
    reason: 'implicit_deny',
    matchedStatementIndex: null,
    matchedStatementId: null,
    matchedEffect: null,
    matchedAction: null,
    hasConditions: false,
    explanation:
      `Implicit DENY. No statement in this policy explicitly allows action "${action}" ` +
      `on resource "${resource}". In AWS IAM, all requests are denied by default unless ` +
      `an explicit Allow is present and no explicit Deny overrides it.`,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AwsIamSimulator() {
  const [policyText, setPolicyText] = useState(SAMPLE_POLICY);
  const [action, setAction] = useState('s3:GetObject');
  const [resource, setResource] = useState('arn:aws:s3:::my-bucket/file.txt');
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [activeExample, setActiveExample] = useState<string | null>(null);

  const handleActionInput = (val: string) => {
    setAction(val);
    if (val.length > 0) {
      const filtered = ACTION_SUGGESTIONS.filter(s =>
        s.toLowerCase().includes(val.toLowerCase())
      );
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSimulate = () => {
    setParseError(null);
    setResult(null);

    if (!action.trim()) {
      setParseError('Please enter an action (e.g. s3:GetObject).');
      return;
    }
    if (!resource.trim()) {
      setParseError('Please enter a resource ARN (e.g. arn:aws:s3:::my-bucket/*).');
      return;
    }

    let policy: IamPolicy;
    try {
      policy = JSON.parse(policyText);
    } catch (e) {
      setParseError('Invalid JSON: ' + (e as Error).message);
      return;
    }

    if (!policy.Statement || !Array.isArray(policy.Statement)) {
      setParseError('Policy must have a "Statement" array.');
      return;
    }

    const sim = simulatePolicy(policy, action.trim(), resource.trim());
    setResult(sim);
  };

  const loadExample = (key: string) => {
    const ex = EXAMPLE_POLICIES[key];
    if (!ex) return;
    setPolicyText(JSON.stringify(ex.policy, null, 2));
    setActiveExample(key);
    setResult(null);
    setParseError(null);
  };

  const reasonLabel: Record<string, string> = {
    explicit_deny: 'Explicit DENY',
    explicit_allow: 'Explicit ALLOW',
    implicit_deny: 'Implicit DENY (default)',
  };

  return (
    <div class="space-y-6">
      {/* Example Policies */}
      <div class="flex flex-wrap gap-2 items-center">
        <span class="text-sm text-text-muted font-medium">Load example:</span>
        {Object.entries(EXAMPLE_POLICIES).map(([key, ex]) => (
          <button
            key={key}
            onClick={() => loadExample(key)}
            class={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
              activeExample === key
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-border text-text-muted hover:border-blue-500 hover:text-blue-500'
            }`}
          >
            {ex.label}
          </button>
        ))}
      </div>

      {/* Main Grid */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Policy Editor */}
        <div class="space-y-2">
          <label class="block text-sm font-semibold text-text">
            IAM Policy JSON
          </label>
          <textarea
            value={policyText}
            onInput={(e) => {
              setPolicyText((e.target as HTMLTextAreaElement).value);
              setResult(null);
              setParseError(null);
              setActiveExample(null);
            }}
            spellcheck={false}
            rows={22}
            class="w-full font-mono text-xs bg-bg-secondary border border-border rounded-lg p-3 text-text resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent leading-relaxed"
            placeholder='{"Version":"2012-10-17","Statement":[...]}'
          />
        </div>

        {/* Right: Inputs + Result */}
        <div class="space-y-4">
          {/* Action Input */}
          <div class="relative">
            <label class="block text-sm font-semibold text-text mb-1.5">
              Action
            </label>
            <input
              type="text"
              value={action}
              onInput={(e) => handleActionInput((e.target as HTMLInputElement).value)}
              onFocus={() => {
                if (action.length > 0 && filteredSuggestions.length > 0) setShowSuggestions(true);
              }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="e.g. s3:GetObject"
              class="w-full bg-bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {showSuggestions && (
              <div class="absolute z-10 w-full mt-1 bg-bg border border-border rounded-lg shadow-lg overflow-hidden max-h-52 overflow-y-auto">
                {filteredSuggestions.map(s => (
                  <button
                    key={s}
                    onMouseDown={() => {
                      setAction(s);
                      setShowSuggestions(false);
                    }}
                    class="w-full text-left px-3 py-2 text-sm text-text hover:bg-bg-secondary font-mono"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Resource ARN Input */}
          <div>
            <label class="block text-sm font-semibold text-text mb-1.5">
              Resource ARN
            </label>
            <input
              type="text"
              value={resource}
              onInput={(e) => setResource((e.target as HTMLInputElement).value)}
              placeholder="e.g. arn:aws:s3:::my-bucket/*"
              class="w-full bg-bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-text font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p class="mt-1 text-xs text-text-muted">
              Use <code class="bg-bg-secondary px-1 rounded">*</code> for wildcard, e.g.{' '}
              <button
                class="text-blue-500 hover:underline"
                onClick={() => setResource('*')}
              >
                *
              </button>
              {' or '}
              <button
                class="text-blue-500 hover:underline"
                onClick={() => setResource('arn:aws:s3:::my-bucket/*')}
              >
                arn:aws:s3:::my-bucket/*
              </button>
            </p>
          </div>

          {/* Simulate Button */}
          <button
            onClick={handleSimulate}
            class="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors text-sm"
          >
            Simulate Access
          </button>

          {/* Parse Error */}
          {parseError && (
            <div class="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-mono">
              {parseError}
            </div>
          )}

          {/* Result Panel */}
          {result && (
            <div
              class={`rounded-xl border p-5 space-y-4 ${
                result.verdict === 'ALLOW'
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-red-500/10 border-red-500/30'
              }`}
            >
              {/* Verdict */}
              <div class="flex items-center gap-3">
                <span
                  class={`text-4xl font-black tracking-tight ${
                    result.verdict === 'ALLOW' ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {result.verdict}
                </span>
                <span
                  class={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                    result.verdict === 'ALLOW'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  {reasonLabel[result.reason]}
                </span>
              </div>

              {/* Match Details */}
              <div class="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p class="text-text-muted text-xs uppercase tracking-wider mb-0.5">Statement</p>
                  <p class="text-text font-mono text-xs">
                    {result.matchedStatementId
                      ? `"${result.matchedStatementId}"`
                      : result.matchedStatementIndex !== null
                      ? `#${result.matchedStatementIndex + 1}`
                      : '—'}
                  </p>
                </div>
                <div>
                  <p class="text-text-muted text-xs uppercase tracking-wider mb-0.5">Effect</p>
                  <p class={`font-semibold text-xs ${result.matchedEffect === 'Allow' ? 'text-green-400' : result.matchedEffect === 'Deny' ? 'text-red-400' : 'text-text-muted'}`}>
                    {result.matchedEffect || '—'}
                  </p>
                </div>
                <div class="col-span-2">
                  <p class="text-text-muted text-xs uppercase tracking-wider mb-0.5">Matched Action Pattern</p>
                  <p class="text-text font-mono text-xs break-all">
                    {result.matchedAction || '—'}
                  </p>
                </div>
              </div>

              {/* Explanation */}
              <div>
                <p class="text-text-muted text-xs uppercase tracking-wider mb-1">Explanation</p>
                <p class="text-text text-sm leading-relaxed">{result.explanation}</p>
              </div>

              {/* Conditions Warning */}
              {result.hasConditions && (
                <div class="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <span class="text-yellow-400 text-sm mt-0.5">⚠</span>
                  <p class="text-yellow-300 text-xs leading-relaxed">
                    This statement includes <strong>Condition</strong> keys. The real AWS
                    evaluation would check these conditions (e.g. MFA, IP range, time of day).
                    This simulator only matches action and resource patterns.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* How It Works */}
      <div class="mt-8 p-5 rounded-xl bg-bg-secondary border border-border text-sm space-y-3">
        <h2 class="font-semibold text-text">How AWS IAM Policy Evaluation Works</h2>
        <ol class="list-decimal list-inside space-y-1.5 text-text-muted">
          <li>
            <strong class="text-text">Explicit Deny wins.</strong> If any statement has{' '}
            <code class="bg-bg px-1 rounded text-xs">Effect: Deny</code> and the action +
            resource match, access is denied regardless of any Allow statements.
          </li>
          <li>
            <strong class="text-text">Explicit Allow.</strong> If a statement has{' '}
            <code class="bg-bg px-1 rounded text-xs">Effect: Allow</code> and the action +
            resource match, access is allowed.
          </li>
          <li>
            <strong class="text-text">Implicit Deny (default).</strong> If no statement
            matches, AWS denies access by default. IAM follows a "deny by default" model.
          </li>
        </ol>
        <p class="text-text-muted text-xs pt-1">
          Wildcard matching: <code class="bg-bg px-1 rounded">*</code> matches everything,{' '}
          <code class="bg-bg px-1 rounded">s3:*</code> matches all S3 actions,{' '}
          <code class="bg-bg px-1 rounded">arn:aws:s3:::bucket/*</code> matches any object in
          the bucket. <strong>Condition keys are noted but not evaluated</strong> in this
          simulator — for production use, test in the AWS Console IAM Policy Simulator.
        </p>
      </div>
    </div>
  );
}
