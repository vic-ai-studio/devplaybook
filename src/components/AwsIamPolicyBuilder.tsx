import { useState } from 'preact/hooks';

type Effect = 'Allow' | 'Deny';

interface ActionGroup {
  service: string;
  prefix: string;
  actions: string[];
}

const ACTION_GROUPS: ActionGroup[] = [
  {
    service: 'S3',
    prefix: 's3',
    actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject', 's3:ListBucket', 's3:*'],
  },
  {
    service: 'EC2',
    prefix: 'ec2',
    actions: ['ec2:DescribeInstances', 'ec2:StartInstances', 'ec2:StopInstances', 'ec2:*'],
  },
  {
    service: 'Lambda',
    prefix: 'lambda',
    actions: ['lambda:InvokeFunction', 'lambda:GetFunction', 'lambda:*'],
  },
  {
    service: 'DynamoDB',
    prefix: 'dynamodb',
    actions: ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:Query', 'dynamodb:Scan', 'dynamodb:*'],
  },
  {
    service: 'STS',
    prefix: 'sts',
    actions: ['sts:AssumeRole'],
  },
];

interface Condition {
  key: string;
  value: string;
}

interface Statement {
  id: string;
  effect: Effect;
  actions: string[];
  resource: string;
  condition: Condition;
  useCondition: boolean;
}

function makeId() {
  return Math.random().toString(36).slice(2, 9);
}

function makeStatement(): Statement {
  return {
    id: makeId(),
    effect: 'Allow',
    actions: [],
    resource: '*',
    condition: { key: 'aws:RequestedRegion', value: 'us-east-1' },
    useCondition: false,
  };
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      class={`text-xs px-3 py-1.5 rounded font-medium transition-colors ${
        copied ? 'bg-green-700 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
      }`}
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}

function StatementCard({
  stmt,
  index,
  onChange,
  onRemove,
}: {
  stmt: Statement;
  index: number;
  onChange: (updated: Statement) => void;
  onRemove: () => void;
}) {
  const toggleAction = (action: string) => {
    const next = stmt.actions.includes(action)
      ? stmt.actions.filter((a) => a !== action)
      : [...stmt.actions, action];
    onChange({ ...stmt, actions: next });
  };

  return (
    <div class="bg-bg-card border border-border rounded-xl p-4 space-y-4">
      <div class="flex items-center justify-between">
        <span class="text-sm font-semibold text-text-primary">Statement {index + 1}</span>
        <button
          onClick={onRemove}
          class="text-xs px-2 py-1 rounded bg-red-900/40 text-red-400 hover:bg-red-900/70 transition-colors"
        >
          Remove
        </button>
      </div>

      {/* Effect */}
      <div>
        <label class="text-xs text-text-muted mb-1.5 block">Effect</label>
        <div class="flex gap-2">
          {(['Allow', 'Deny'] as Effect[]).map((e) => (
            <button
              key={e}
              onClick={() => onChange({ ...stmt, effect: e })}
              class={`px-4 py-1.5 rounded-lg text-sm border transition-colors ${
                stmt.effect === e
                  ? e === 'Allow'
                    ? 'bg-green-900/40 border-green-600 text-green-400'
                    : 'bg-red-900/40 border-red-600 text-red-400'
                  : 'bg-bg border-border text-text-muted hover:border-accent hover:text-text-primary'
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div>
        <label class="text-xs text-text-muted mb-1.5 block">
          Actions ({stmt.actions.length} selected)
        </label>
        <div class="space-y-3">
          {ACTION_GROUPS.map((group) => (
            <div key={group.service}>
              <div class="text-xs font-medium text-text-muted mb-1.5">{group.service}</div>
              <div class="flex flex-wrap gap-1.5">
                {group.actions.map((action) => (
                  <button
                    key={action}
                    onClick={() => toggleAction(action)}
                    class={`text-xs px-2.5 py-1 rounded border font-mono transition-colors ${
                      stmt.actions.includes(action)
                        ? 'bg-accent/20 border-accent text-accent'
                        : 'bg-bg border-border text-text-muted hover:border-accent hover:text-text-primary'
                    }`}
                  >
                    {action}
                    {stmt.actions.includes(action) && <span class="ml-1">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Resource ARN */}
      <div>
        <label class="text-xs text-text-muted mb-1.5 block">Resource ARN</label>
        <input
          type="text"
          value={stmt.resource}
          onInput={(e: any) => onChange({ ...stmt, resource: e.target.value })}
          class="w-full bg-bg border border-border rounded-lg px-3 py-2 font-mono text-sm focus:outline-none focus:border-accent"
          placeholder="* or arn:aws:s3:::my-bucket/*"
        />
        <p class="text-xs text-text-muted mt-1">
          e.g. <code class="font-mono">arn:aws:s3:::my-bucket/*</code> or{' '}
          <code class="font-mono">arn:aws:lambda:us-east-1:123456789012:function:my-fn</code>
        </p>
      </div>

      {/* Optional Condition */}
      <div>
        <label class="flex items-center gap-2 cursor-pointer select-none mb-2">
          <div
            onClick={() => onChange({ ...stmt, useCondition: !stmt.useCondition })}
            class={`w-9 h-5 rounded-full transition-colors relative ${stmt.useCondition ? 'bg-accent' : 'bg-gray-600'}`}
          >
            <span
              class={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${
                stmt.useCondition ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </div>
          <span class="text-xs text-text-muted">Add Condition (optional)</span>
        </label>
        {stmt.useCondition && (
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label class="text-xs text-text-muted mb-1 block">Condition Key</label>
              <input
                type="text"
                value={stmt.condition.key}
                onInput={(e: any) =>
                  onChange({ ...stmt, condition: { ...stmt.condition, key: e.target.value } })
                }
                class="w-full bg-bg border border-border rounded-lg px-3 py-2 font-mono text-xs focus:outline-none focus:border-accent"
                placeholder="aws:RequestedRegion"
              />
            </div>
            <div>
              <label class="text-xs text-text-muted mb-1 block">Condition Value</label>
              <input
                type="text"
                value={stmt.condition.value}
                onInput={(e: any) =>
                  onChange({ ...stmt, condition: { ...stmt.condition, value: e.target.value } })
                }
                class="w-full bg-bg border border-border rounded-lg px-3 py-2 font-mono text-xs focus:outline-none focus:border-accent"
                placeholder="us-east-1"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function buildPolicy(statements: Statement[]): object {
  return {
    Version: '2012-10-17',
    Statement: statements.map((stmt, i) => {
      const base: Record<string, unknown> = {
        Sid: `Statement${i + 1}`,
        Effect: stmt.effect,
        Action: stmt.actions.length === 0 ? ['*'] : stmt.actions,
        Resource: stmt.resource.trim() || '*',
      };
      if (stmt.useCondition && stmt.condition.key.trim()) {
        base.Condition = {
          StringEquals: {
            [stmt.condition.key.trim()]: stmt.condition.value.trim(),
          },
        };
      }
      return base;
    }),
  };
}

export default function AwsIamPolicyBuilder() {
  const [statements, setStatements] = useState<Statement[]>([makeStatement()]);

  const updateStatement = (index: number, updated: Statement) => {
    setStatements((prev) => prev.map((s, i) => (i === index ? updated : s)));
  };

  const removeStatement = (index: number) => {
    setStatements((prev) => prev.filter((_, i) => i !== index));
  };

  const addStatement = () => {
    setStatements((prev) => [...prev, makeStatement()]);
  };

  const policy = buildPolicy(statements);
  const policyJson = JSON.stringify(policy, null, 2);

  const totalActions = statements.reduce((sum, s) => sum + s.actions.length, 0);
  const hasEmpty = statements.some((s) => s.actions.length === 0);

  return (
    <div class="space-y-6">
      {/* Statements */}
      {statements.map((stmt, i) => (
        <StatementCard
          key={stmt.id}
          stmt={stmt}
          index={i}
          onChange={(updated) => updateStatement(i, updated)}
          onRemove={() => removeStatement(i)}
        />
      ))}

      {/* Add statement */}
      <button
        onClick={addStatement}
        class="w-full py-3 border-2 border-dashed border-border rounded-xl text-sm text-text-muted hover:border-accent hover:text-text-primary transition-colors"
      >
        + Add Statement
      </button>

      {/* Summary badges */}
      <div class="flex flex-wrap gap-2 text-xs">
        <span class="px-2.5 py-1 bg-bg-card border border-border rounded-full text-text-muted">
          {statements.length} statement{statements.length !== 1 ? 's' : ''}
        </span>
        <span class="px-2.5 py-1 bg-bg-card border border-border rounded-full text-text-muted">
          {totalActions} action{totalActions !== 1 ? 's' : ''} selected
        </span>
        {hasEmpty && (
          <span class="px-2.5 py-1 bg-yellow-900/40 border border-yellow-700/50 rounded-full text-yellow-400">
            Some statements have no actions — defaulting to ["*"]
          </span>
        )}
      </div>

      {/* Generated Policy */}
      <div class="space-y-3">
        <div class="text-sm font-semibold text-text-primary">Generated IAM Policy JSON</div>
        <div class="bg-bg-card border border-border rounded-xl overflow-hidden">
          <div class="flex items-center justify-between px-4 py-2.5 border-b border-border bg-bg">
            <span class="text-xs font-mono text-text-muted">IAM Policy Document</span>
            <CopyButton value={policyJson} />
          </div>
          <pre class="p-4 text-xs font-mono text-green-300 overflow-x-auto whitespace-pre">{policyJson}</pre>
        </div>
      </div>

      {/* Usage tips */}
      <div class="bg-blue-950/30 border border-blue-800/40 rounded-xl p-4 text-sm text-blue-300 space-y-1.5">
        <div class="font-medium">How to use this policy</div>
        <ul class="list-disc list-inside space-y-1 text-blue-300/80 text-xs">
          <li>Go to <strong>AWS Console → IAM → Policies → Create policy → JSON</strong> and paste the output</li>
          <li>Attach to an IAM user, group, or role via <strong>Permissions → Add permissions</strong></li>
          <li>Use <strong>Deny</strong> statements sparingly — they override all Allow statements</li>
          <li>Prefer specific resource ARNs over <code class="font-mono">*</code> for least-privilege access</li>
          <li>Test with <strong>IAM Policy Simulator</strong> before attaching to production resources</li>
        </ul>
      </div>
    </div>
  );
}
