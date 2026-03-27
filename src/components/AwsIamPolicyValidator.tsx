import { useState } from 'preact/hooks';

type ValidationIssue = {
  level: 'error' | 'warning' | 'info';
  message: string;
};

const SAMPLE_POLICY = `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowS3ReadWrite",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:*"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": "sts:AssumeRole",
      "Resource": "*",
      "Condition": {
        "Bool": {
          "aws:MultiFactorAuthPresent": "true"
        }
      }
    }
  ]
}`;

// Actions that are especially dangerous with wildcard resources
const DANGEROUS_ACTIONS = [
  'iam:*', 'iam:CreateUser', 'iam:AttachUserPolicy', 'iam:CreateAccessKey',
  'iam:UpdateLoginProfile', 'iam:PutUserPolicy',
  's3:*', 'ec2:*', 'lambda:*', 'rds:*',
  'sts:AssumeRole',
  'kms:*', 'secretsmanager:*', 'ssm:*',
  'cloudformation:*',
];

function validateIamPolicy(jsonStr: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!jsonStr.trim()) {
    return [{ level: 'error', message: 'Empty input. Paste an IAM policy JSON to validate.' }];
  }

  // Parse JSON
  let policy: any;
  try {
    policy = JSON.parse(jsonStr);
  } catch (e: any) {
    return [{ level: 'error', message: `Invalid JSON: ${e.message}. Fix the JSON syntax first.` }];
  }

  // Version
  if (!policy.Version) {
    issues.push({ level: 'error', message: 'Missing "Version" field. Use "2012-10-17" (the only valid IAM policy version).' });
  } else if (policy.Version !== '2012-10-17') {
    issues.push({ level: 'error', message: `Version "${policy.Version}" is not valid. IAM policies must use "2012-10-17".` });
  }

  // Statement
  if (!policy.Statement) {
    issues.push({ level: 'error', message: 'Missing "Statement" array. Policies must have at least one statement.' });
    return issues;
  }
  if (!Array.isArray(policy.Statement)) {
    issues.push({ level: 'error', message: '"Statement" must be an array (even for a single statement).' });
    return issues;
  }
  if (policy.Statement.length === 0) {
    issues.push({ level: 'error', message: '"Statement" array is empty. Add at least one statement.' });
    return issues;
  }

  policy.Statement.forEach((stmt: any, idx: number) => {
    const stmtLabel = stmt.Sid ? `Statement "${stmt.Sid}"` : `Statement[${idx}]`;

    // Effect
    if (!stmt.Effect) {
      issues.push({ level: 'error', message: `${stmtLabel}: Missing "Effect". Must be "Allow" or "Deny".` });
    } else if (stmt.Effect !== 'Allow' && stmt.Effect !== 'Deny') {
      issues.push({ level: 'error', message: `${stmtLabel}: Effect "${stmt.Effect}" is invalid. Must be "Allow" or "Deny".` });
    }

    // Action
    if (!stmt.Action && !stmt.NotAction) {
      issues.push({ level: 'error', message: `${stmtLabel}: Missing "Action" or "NotAction". Specify at least one action.` });
    }

    const actions: string[] = stmt.Action
      ? (Array.isArray(stmt.Action) ? stmt.Action : [stmt.Action])
      : [];

    // Wildcard action
    if (actions.includes('*')) {
      issues.push({ level: 'error', message: `${stmtLabel}: Action "*" grants ALL permissions on ALL services. This violates least-privilege — replace with specific actions.` });
    }

    // Service-level wildcards like s3:* or iam:*
    actions.forEach(action => {
      if (action.endsWith(':*')) {
        issues.push({ level: 'warning', message: `${stmtLabel}: Action "${action}" grants all operations for that service. Restrict to specific actions needed.` });
      }
    });

    // Resource
    if (!stmt.Resource && !stmt.NotResource) {
      issues.push({ level: 'error', message: `${stmtLabel}: Missing "Resource" or "NotResource". Specify the ARN(s) this statement applies to.` });
    }

    const resources: string[] = stmt.Resource
      ? (Array.isArray(stmt.Resource) ? stmt.Resource : [stmt.Resource])
      : [];

    // Wildcard resource with dangerous actions
    if (resources.includes('*') && stmt.Effect === 'Allow') {
      const hasDangerous = actions.some(a => DANGEROUS_ACTIONS.includes(a) || a.endsWith(':*') || a === '*');
      if (hasDangerous) {
        issues.push({ level: 'error', message: `${stmtLabel}: Resource "*" combined with powerful actions (${actions.filter(a => DANGEROUS_ACTIONS.includes(a) || a.endsWith(':*') || a === '*').slice(0,3).join(', ')}) is a critical security risk. Scope the resource to specific ARNs.` });
      } else {
        issues.push({ level: 'warning', message: `${stmtLabel}: Resource "*" applies to all resources. Restrict to specific ARNs for least-privilege access.` });
      }
    }

    // IAM privilege escalation
    const iamEscalationActions = ['iam:CreateUser', 'iam:AttachUserPolicy', 'iam:PutUserPolicy', 'iam:CreateAccessKey', 'iam:UpdateLoginProfile', 'iam:AddUserToGroup', 'iam:AttachGroupPolicy'];
    const hasEscalation = actions.some(a => iamEscalationActions.includes(a) || a === 'iam:*');
    if (hasEscalation && stmt.Effect === 'Allow') {
      issues.push({ level: 'error', message: `${stmtLabel}: Contains IAM privilege escalation actions. These permissions can be used to create admin users. Require MFA conditions or use tightly scoped resource ARNs.` });
    }

    // NotAction + Allow = allow everything except (often overly broad)
    if (stmt.NotAction && stmt.Effect === 'Allow') {
      issues.push({ level: 'warning', message: `${stmtLabel}: "NotAction" with "Allow" grants all actions EXCEPT the listed ones. This is extremely broad and rarely what you want. Consider using explicit "Action" instead.` });
    }

    // Condition present = good
    if (stmt.Condition) {
      issues.push({ level: 'info', message: `${stmtLabel}: Has conditions defined — good practice for restricting when permissions apply.` });
    } else if (stmt.Effect === 'Allow' && resources.includes('*')) {
      issues.push({ level: 'warning', message: `${stmtLabel}: No Condition block. Consider adding conditions like aws:MultiFactorAuthPresent, aws:SourceIp, or aws:RequestedRegion to scope access.` });
    }
  });

  // Size check (AWS limit ~6144 characters)
  if (jsonStr.length > 5000) {
    issues.push({ level: 'warning', message: `Policy is ${jsonStr.length} characters. AWS managed policy limit is 6,144 characters. Consider splitting into multiple policies.` });
  }

  if (issues.length === 0) {
    issues.push({ level: 'info', message: 'IAM policy structure is valid. No critical issues found.' });
  }

  return issues;
}

const LEVEL_STYLES = {
  error: { bg: 'bg-red-500/10 border-red-500/30', icon: '✗', text: 'text-red-400' },
  warning: { bg: 'bg-yellow-500/10 border-yellow-500/30', icon: '⚠', text: 'text-yellow-400' },
  info: { bg: 'bg-green-500/10 border-green-500/30', icon: '✓', text: 'text-green-400' },
};

export default function AwsIamPolicyValidator() {
  const [input, setInput] = useState(SAMPLE_POLICY);
  const [issues, setIssues] = useState<ValidationIssue[]>(() => validateIamPolicy(SAMPLE_POLICY));
  const [validated, setValidated] = useState(true);

  const handleValidate = () => {
    setIssues(validateIamPolicy(input));
    setValidated(true);
  };

  const handleFormat = () => {
    try {
      setInput(JSON.stringify(JSON.parse(input), null, 2));
    } catch {}
  };

  const errors = issues.filter(i => i.level === 'error');
  const warnings = issues.filter(i => i.level === 'warning');

  return (
    <div class="space-y-4">
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium text-text-muted">IAM Policy JSON</label>
          <div class="flex gap-2">
            <button onClick={handleFormat} class="text-xs px-2 py-1 bg-surface border border-border rounded hover:border-accent transition-colors">Format JSON</button>
            <button onClick={() => { setInput(SAMPLE_POLICY); setIssues(validateIamPolicy(SAMPLE_POLICY)); setValidated(true); }} class="text-xs px-2 py-1 bg-surface border border-border rounded hover:border-accent transition-colors">Load example</button>
            <button onClick={() => { setInput(''); setIssues([]); setValidated(false); }} class="text-xs px-2 py-1 bg-surface border border-border rounded hover:border-accent transition-colors">Clear</button>
          </div>
        </div>
        <textarea
          value={input}
          onInput={e => { setInput((e.target as HTMLTextAreaElement).value); setValidated(false); }}
          rows={18}
          class="w-full font-mono text-sm bg-background border border-border rounded-lg p-3 resize-y focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
          placeholder="Paste your AWS IAM policy JSON here..."
          spellcheck={false}
        />
      </div>

      <button onClick={handleValidate} class="w-full py-2.5 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition-colors">
        Validate Policy
      </button>

      {validated && issues.length > 0 && (
        <div class="space-y-3">
          <div class="flex items-center gap-3 text-sm flex-wrap">
            <span class="font-medium text-text">Results:</span>
            {errors.length > 0 && <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400">{errors.length} error{errors.length > 1 ? 's' : ''}</span>}
            {warnings.length > 0 && <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">{warnings.length} warning{warnings.length > 1 ? 's' : ''}</span>}
            {errors.length === 0 && warnings.length === 0 && <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">No critical issues</span>}
          </div>
          <div class="space-y-2">
            {issues.map((issue, i) => {
              const style = LEVEL_STYLES[issue.level];
              return (
                <div key={i} class={`flex gap-3 p-3 border rounded-lg ${style.bg}`}>
                  <span class={`font-bold text-lg leading-none mt-0.5 ${style.text}`}>{style.icon}</span>
                  <div class="flex-1 min-w-0">
                    <span class={`text-xs font-medium uppercase tracking-wide ${style.text}`}>{issue.level}</span>
                    <p class="text-sm text-text mt-0.5">{issue.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div class="bg-surface border border-border rounded-lg p-4 text-xs text-text-muted">
        <p class="font-medium text-text mb-2">Checks performed</p>
        <ul class="space-y-1 list-disc list-inside">
          <li>JSON syntax validation</li>
          <li>Required fields: Version (2012-10-17), Statement</li>
          <li>Each statement: Effect, Action, Resource presence</li>
          <li>Wildcard Action (*) detection</li>
          <li>Service-level wildcard (s3:*, iam:*) warnings</li>
          <li>Wildcard Resource with dangerous actions</li>
          <li>IAM privilege escalation action detection</li>
          <li>NotAction + Allow overly-broad pattern</li>
          <li>Condition block best-practice suggestions</li>
          <li>Policy size vs AWS 6,144 character limit</li>
        </ul>
      </div>
    </div>
  );
}
