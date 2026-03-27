import { useState } from 'preact/hooks';

interface Statement {
  id: string;
  effect: 'Allow' | 'Deny';
  service: string;
  actions: string[];
  resources: string;
  conditions: Condition[];
}

interface Condition {
  id: string;
  operator: string;
  key: string;
  value: string;
}

const AWS_SERVICES: Record<string, string[]> = {
  's3': ['s3:GetObject', 's3:PutObject', 's3:DeleteObject', 's3:ListBucket', 's3:GetBucketPolicy', 's3:PutBucketPolicy', 's3:CreateBucket', 's3:DeleteBucket'],
  'ec2': ['ec2:DescribeInstances', 'ec2:StartInstances', 'ec2:StopInstances', 'ec2:TerminateInstances', 'ec2:RunInstances', 'ec2:DescribeSecurityGroups', 'ec2:CreateSecurityGroup'],
  'iam': ['iam:GetUser', 'iam:ListUsers', 'iam:CreateUser', 'iam:DeleteUser', 'iam:AttachUserPolicy', 'iam:DetachUserPolicy', 'iam:CreateRole', 'iam:AttachRolePolicy'],
  'lambda': ['lambda:InvokeFunction', 'lambda:CreateFunction', 'lambda:DeleteFunction', 'lambda:UpdateFunctionCode', 'lambda:GetFunction', 'lambda:ListFunctions'],
  'dynamodb': ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:DeleteItem', 'dynamodb:UpdateItem', 'dynamodb:Query', 'dynamodb:Scan', 'dynamodb:CreateTable', 'dynamodb:DescribeTable'],
  'rds': ['rds:DescribeDBInstances', 'rds:CreateDBInstance', 'rds:DeleteDBInstance', 'rds:ModifyDBInstance', 'rds:StartDBInstance', 'rds:StopDBInstance'],
  'cloudwatch': ['cloudwatch:PutMetricData', 'cloudwatch:GetMetricStatistics', 'cloudwatch:ListMetrics', 'logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
  'sqs': ['sqs:SendMessage', 'sqs:ReceiveMessage', 'sqs:DeleteMessage', 'sqs:GetQueueAttributes', 'sqs:CreateQueue', 'sqs:DeleteQueue'],
  'sns': ['sns:Publish', 'sns:Subscribe', 'sns:Unsubscribe', 'sns:CreateTopic', 'sns:DeleteTopic', 'sns:ListTopics'],
  'secretsmanager': ['secretsmanager:GetSecretValue', 'secretsmanager:CreateSecret', 'secretsmanager:UpdateSecret', 'secretsmanager:DeleteSecret', 'secretsmanager:ListSecrets'],
};

const CONDITION_OPERATORS = [
  'StringEquals', 'StringNotEquals', 'StringLike', 'StringNotLike',
  'IpAddress', 'NotIpAddress', 'Bool',
  'ArnEquals', 'ArnLike', 'ArnNotEquals',
];

const COMMON_CONDITION_KEYS = [
  'aws:RequestedRegion',
  'aws:SourceIp',
  'aws:SecureTransport',
  'aws:MultiFactorAuthPresent',
  'aws:PrincipalAccount',
  's3:prefix',
  's3:delimiter',
];

let idCounter = 0;
function uid() { return String(++idCounter); }

function buildPolicy(statements: Statement[]) {
  return {
    Version: '2012-10-17',
    Statement: statements.map((stmt) => {
      const s: Record<string, unknown> = {
        Effect: stmt.effect,
        Action: stmt.actions.length === 1 ? stmt.actions[0] : stmt.actions,
        Resource: stmt.resources.trim() || '*',
      };
      if (stmt.conditions.length > 0) {
        const cond: Record<string, Record<string, string>> = {};
        for (const c of stmt.conditions) {
          if (!c.operator || !c.key || !c.value) continue;
          if (!cond[c.operator]) cond[c.operator] = {};
          cond[c.operator][c.key] = c.value;
        }
        if (Object.keys(cond).length > 0) s.Condition = cond;
      }
      return s;
    }),
  };
}

export default function AwsIamPolicyGenerator() {
  const [statements, setStatements] = useState<Statement[]>([
    {
      id: uid(),
      effect: 'Allow',
      service: 's3',
      actions: ['s3:GetObject', 's3:ListBucket'],
      resources: 'arn:aws:s3:::my-bucket/*',
      conditions: [],
    },
  ]);
  const [copied, setCopied] = useState(false);

  const policy = buildPolicy(statements);
  const policyJson = JSON.stringify(policy, null, 2);

  function updateStatement(id: string, patch: Partial<Statement>) {
    setStatements((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s))
    );
  }

  function addStatement() {
    setStatements((prev) => [
      ...prev,
      { id: uid(), effect: 'Allow', service: 's3', actions: [], resources: '*', conditions: [] },
    ]);
  }

  function removeStatement(id: string) {
    setStatements((prev) => prev.filter((s) => s.id !== id));
  }

  function toggleAction(stmtId: string, action: string) {
    setStatements((prev) =>
      prev.map((s) => {
        if (s.id !== stmtId) return s;
        const has = s.actions.includes(action);
        return { ...s, actions: has ? s.actions.filter((a) => a !== action) : [...s.actions, action] };
      })
    );
  }

  function addCondition(stmtId: string) {
    setStatements((prev) =>
      prev.map((s) =>
        s.id !== stmtId ? s : {
          ...s,
          conditions: [...s.conditions, { id: uid(), operator: 'StringEquals', key: '', value: '' }],
        }
      )
    );
  }

  function updateCondition(stmtId: string, condId: string, patch: Partial<Condition>) {
    setStatements((prev) =>
      prev.map((s) =>
        s.id !== stmtId ? s : {
          ...s,
          conditions: s.conditions.map((c) => (c.id === condId ? { ...c, ...patch } : c)),
        }
      )
    );
  }

  function removeCondition(stmtId: string, condId: string) {
    setStatements((prev) =>
      prev.map((s) =>
        s.id !== stmtId ? s : { ...s, conditions: s.conditions.filter((c) => c.id !== condId) }
      )
    );
  }

  async function copyJson() {
    await navigator.clipboard.writeText(policyJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div class="space-y-5">
      {/* Statements */}
      {statements.map((stmt, idx) => (
        <div key={stmt.id} class="border border-border rounded-xl overflow-hidden">
          <div class="flex items-center justify-between px-4 py-3 bg-bg-card border-b border-border">
            <span class="text-sm font-semibold text-text">Statement {idx + 1}</span>
            {statements.length > 1 && (
              <button
                onClick={() => removeStatement(stmt.id)}
                class="text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                Remove
              </button>
            )}
          </div>

          <div class="p-4 space-y-4">
            {/* Effect + Service */}
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs text-text-muted mb-1.5">Effect</label>
                <select
                  value={stmt.effect}
                  onChange={(e) => updateStatement(stmt.id, { effect: (e.target as HTMLSelectElement).value as 'Allow' | 'Deny' })}
                  class="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
                >
                  <option value="Allow">Allow</option>
                  <option value="Deny">Deny</option>
                </select>
              </div>
              <div>
                <label class="block text-xs text-text-muted mb-1.5">AWS Service</label>
                <select
                  value={stmt.service}
                  onChange={(e) => {
                    const svc = (e.target as HTMLSelectElement).value;
                    updateStatement(stmt.id, { service: svc, actions: [] });
                  }}
                  class="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
                >
                  {Object.keys(AWS_SERVICES).map((s) => (
                    <option key={s} value={s}>{s.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Actions */}
            <div>
              <label class="block text-xs text-text-muted mb-1.5">
                Actions <span class="text-text-muted">({stmt.actions.length} selected)</span>
              </label>
              <div class="flex flex-wrap gap-2">
                {(AWS_SERVICES[stmt.service] ?? []).map((action) => {
                  const selected = stmt.actions.includes(action);
                  return (
                    <button
                      key={action}
                      onClick={() => toggleAction(stmt.id, action)}
                      class={`px-2.5 py-1 text-xs font-mono rounded-lg border transition-colors ${
                        selected
                          ? 'bg-primary/15 border-primary/40 text-primary'
                          : 'bg-bg-card border-border text-text-muted hover:border-primary/40 hover:text-text'
                      }`}
                    >
                      {action}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Resource */}
            <div>
              <label class="block text-xs text-text-muted mb-1.5">Resource ARN</label>
              <input
                type="text"
                value={stmt.resources}
                onInput={(e) => updateStatement(stmt.id, { resources: (e.target as HTMLInputElement).value })}
                placeholder="arn:aws:s3:::my-bucket/* or *"
                class="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm font-mono text-text focus:outline-none focus:border-primary"
              />
            </div>

            {/* Conditions */}
            {stmt.conditions.length > 0 && (
              <div class="space-y-2">
                <label class="block text-xs text-text-muted">Conditions</label>
                {stmt.conditions.map((cond) => (
                  <div key={cond.id} class="flex items-center gap-2 flex-wrap">
                    <select
                      value={cond.operator}
                      onChange={(e) => updateCondition(stmt.id, cond.id, { operator: (e.target as HTMLSelectElement).value })}
                      class="bg-bg-card border border-border rounded-lg px-2 py-1.5 text-xs text-text focus:outline-none focus:border-primary"
                    >
                      {CONDITION_OPERATORS.map((op) => (
                        <option key={op} value={op}>{op}</option>
                      ))}
                    </select>
                    <input
                      list={`keys-${cond.id}`}
                      value={cond.key}
                      onInput={(e) => updateCondition(stmt.id, cond.id, { key: (e.target as HTMLInputElement).value })}
                      placeholder="Condition key"
                      class="flex-1 min-w-[140px] bg-bg-card border border-border rounded-lg px-2 py-1.5 text-xs font-mono text-text focus:outline-none focus:border-primary"
                    />
                    <datalist id={`keys-${cond.id}`}>
                      {COMMON_CONDITION_KEYS.map((k) => <option key={k} value={k} />)}
                    </datalist>
                    <input
                      value={cond.value}
                      onInput={(e) => updateCondition(stmt.id, cond.id, { value: (e.target as HTMLInputElement).value })}
                      placeholder="Value"
                      class="flex-1 min-w-[120px] bg-bg-card border border-border rounded-lg px-2 py-1.5 text-xs font-mono text-text focus:outline-none focus:border-primary"
                    />
                    <button
                      onClick={() => removeCondition(stmt.id, cond.id)}
                      class="text-xs text-red-400 hover:text-red-300 shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => addCondition(stmt.id)}
              class="text-xs text-text-muted hover:text-primary transition-colors"
            >
              + Add condition
            </button>
          </div>
        </div>
      ))}

      <button
        onClick={addStatement}
        class="w-full py-2.5 border border-dashed border-border rounded-xl text-sm text-text-muted hover:border-primary hover:text-primary transition-colors"
      >
        + Add Statement
      </button>

      {/* Output */}
      <div class="border border-border rounded-xl overflow-hidden">
        <div class="flex items-center justify-between px-4 py-3 bg-bg-card border-b border-border">
          <span class="text-sm font-semibold text-text">Generated Policy JSON</span>
          <button
            onClick={copyJson}
            class="px-3 py-1 text-xs rounded-lg bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 transition-colors"
          >
            {copied ? '✓ Copied!' : 'Copy JSON'}
          </button>
        </div>
        <pre class="p-4 text-xs font-mono text-text bg-bg-card overflow-x-auto whitespace-pre">{policyJson}</pre>
      </div>
    </div>
  );
}
