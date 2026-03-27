import { useState, useCallback } from 'preact/hooks';

type LintLevel = 'error' | 'warning' | 'info';

interface LintIssue {
  level: LintLevel;
  message: string;
  line?: number;
  doc?: string;
}

const SAMPLE = `---
- name: Deploy web application
  hosts: webservers
  become: yes

  vars:
    app_port: 8080
    db_password: mysecretpass123
    app_user: deploy

  tasks:
    - name: Install required packages
      apt:
        name:
          - nginx
          - nodejs
          - npm
        state: present
        update_cache: yes

    - name: Copy application files
      copy:
        src: /local/app/
        dest: /opt/app/
        owner: "{{ app_user }}"
        mode: "0755"

    - name: Start nginx
      service:
        name: nginx
        state: started
        enabled: yes

    - name: Run database migration
      command: /opt/app/migrate.sh
      args:
        chdir: /opt/app

    - name: Restart application
      shell: systemctl restart myapp && echo done
`;

function lintAnsible(yaml: string): LintIssue[] {
  const issues: LintIssue[] = [];
  const lines = yaml.split('\n');

  if (!yaml.trim()) {
    issues.push({ level: 'error', message: 'Empty input — paste an Ansible playbook YAML.' });
    return issues;
  }

  // Must start with --- (YAML document marker)
  if (!yaml.trimStart().startsWith('---') && !yaml.trimStart().startsWith('-')) {
    issues.push({ level: 'warning', message: 'Playbook should start with "---" (YAML document start marker).', doc: 'https://docs.ansible.com/ansible/latest/reference_appendices/YAMLSyntax.html' });
  }

  // Must have 'hosts:' field
  if (!yaml.match(/^\s+hosts\s*:/m) && !yaml.match(/^hosts\s*:/m)) {
    issues.push({ level: 'error', message: 'Missing required "hosts:" field. Every play must target a host group.', doc: 'https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_intro.html#playbook-syntax' });
  }

  // Must have 'tasks:' or 'roles:'
  if (!yaml.includes('tasks:') && !yaml.includes('roles:') && !yaml.includes('pre_tasks:') && !yaml.includes('post_tasks:')) {
    issues.push({ level: 'warning', message: 'No "tasks:", "roles:", "pre_tasks:", or "post_tasks:" found. The play will do nothing.' });
  }

  // Hardcoded secrets
  const secretPatterns = [
    /password\s*:\s*(?!\s*['"]?\{\{)[^\s{][^\n]+/i,
    /secret\s*:\s*(?!\s*['"]?\{\{)[^\s{][^\n]+/i,
    /api[_-]?key\s*:\s*(?!\s*['"]?\{\{)[^\s{][^\n]+/i,
    /token\s*:\s*(?!\s*['"]?\{\{)[^\s{][^\n]+/i,
    /passwd\s*:\s*(?!\s*['"]?\{\{)[^\s{][^\n]+/i,
  ];
  lines.forEach((line, i) => {
    if (line.trim().startsWith('#')) return;
    secretPatterns.forEach(pat => {
      if (pat.test(line)) {
        issues.push({ level: 'error', message: `Line ${i + 1}: Possible hardcoded secret. Use Ansible Vault or a vars_files with vault-encrypted values instead.`, line: i + 1, doc: 'https://docs.ansible.com/ansible/latest/vault_guide/index.html' });
      }
    });
  });

  // Warn about 'command:' or 'shell:' when a module exists
  const commandLines: number[] = [];
  const shellLines: number[] = [];
  lines.forEach((line, i) => {
    if (/^\s+command\s*:/.test(line)) commandLines.push(i + 1);
    if (/^\s+shell\s*:/.test(line)) shellLines.push(i + 1);
  });
  if (commandLines.length > 0) {
    issues.push({ level: 'warning', message: `"command:" used on line${commandLines.length > 1 ? 's' : ''} ${commandLines.join(', ')}. Prefer idempotent modules (apt, yum, service, copy, template) when possible. "command" is not idempotent.`, doc: 'https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html' });
  }
  if (shellLines.length > 0) {
    issues.push({ level: 'warning', message: `"shell:" used on line${shellLines.length > 1 ? 's' : ''} ${shellLines.join(', ')}. Use "command:" if you don't need pipes/redirection. "shell" bypasses Ansible's idempotency and change tracking.` });
  }

  // Check for missing 'name:' on tasks
  const taskSectionMatch = yaml.indexOf('tasks:');
  if (taskSectionMatch !== -1) {
    let inTask = false;
    let taskStart = 0;
    let hasName = false;
    const taskLines = yaml.slice(taskSectionMatch).split('\n');
    taskLines.forEach((line, i) => {
      if (/^\s{4,6}-\s/.test(line) && !/^\s{6,}-\s/.test(line)) {
        if (inTask && !hasName) {
          issues.push({ level: 'warning', message: `Task near line ${taskSectionMatch + i} is missing a "name:" field. Named tasks make playbook output readable and aid debugging.` });
        }
        inTask = true;
        hasName = false;
        taskStart = i;
      }
      if (/^\s+name\s*:/.test(line)) hasName = true;
    });
  }

  // Warn about 'become: yes' without 'become_user:'
  if (yaml.includes('become: yes') || yaml.includes('become: true')) {
    if (!yaml.includes('become_user:')) {
      issues.push({ level: 'info', message: '"become: yes" found but no "become_user:" specified. Will default to root — add "become_user:" to be explicit.', doc: 'https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_privilege_escalation.html' });
    }
  }

  // Warn about 'ignore_errors: yes' usage
  lines.forEach((line, i) => {
    if (/ignore_errors\s*:\s*(yes|true)/i.test(line)) {
      issues.push({ level: 'warning', message: `Line ${i + 1}: "ignore_errors: yes" suppresses all errors for this task. Use "failed_when:" conditions for fine-grained control instead.`, line: i + 1 });
    }
  });

  // Check for 'apt' or 'yum' without 'state:'
  lines.forEach((line, i) => {
    if (/^\s+(apt|yum|dnf|pacman)\s*:/.test(line)) {
      // Look ahead for 'state:' within next 10 lines
      const block = lines.slice(i, i + 10).join('\n');
      if (!block.includes('state:')) {
        issues.push({ level: 'warning', message: `Line ${i + 1}: Package module without "state:" — specify state: present, latest, or absent.`, line: i + 1 });
      }
    }
  });

  // Tab character check
  lines.forEach((line, i) => {
    if (line.includes('\t')) {
      issues.push({ level: 'error', message: `Line ${i + 1}: Tab character found. YAML requires spaces, not tabs.`, line: i + 1 });
    }
  });

  // Check for 'when:' using undefined or bare variable
  lines.forEach((line, i) => {
    const m = line.match(/^\s+when\s*:\s+(\w+)\s*$/);
    if (m && !m[1].startsWith('"') && !m[1].startsWith("'")) {
      issues.push({ level: 'info', message: `Line ${i + 1}: "when: ${m[1]}" — bare variable check. If "${m[1]}" is undefined, this may error. Use "when: ${m[1]} is defined" for safety.`, line: i + 1 });
    }
  });

  // Check for 'notify:' without 'handlers:'
  if (yaml.includes('notify:') && !yaml.includes('handlers:')) {
    issues.push({ level: 'error', message: 'Tasks use "notify:" but no "handlers:" section found. Handlers must be defined in the play or in a role.', doc: 'https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_handlers.html' });
  }

  if (issues.length === 0) {
    issues.push({ level: 'info', message: '✓ No issues found in this Ansible playbook.' });
  }

  return issues;
}

const LEVEL_CONFIG: Record<LintLevel, { icon: string; bg: string; border: string; text: string; label: string }> = {
  error:   { icon: '✖', bg: 'bg-red-500/10',    border: 'border-red-500/40',    text: 'text-red-400',    label: 'Error' },
  warning: { icon: '⚠', bg: 'bg-yellow-500/10', border: 'border-yellow-500/40', text: 'text-yellow-400', label: 'Warning' },
  info:    { icon: 'ℹ', bg: 'bg-blue-500/10',   border: 'border-blue-500/40',   text: 'text-blue-400',   label: 'Info' },
};

export default function AnsiblePlaybookLinter() {
  const [yaml, setYaml] = useState(SAMPLE);
  const [issues, setIssues] = useState<LintIssue[] | null>(null);
  const [hasRun, setHasRun] = useState(false);

  const lint = useCallback(() => {
    setIssues(lintAnsible(yaml));
    setHasRun(true);
  }, [yaml]);

  const loadSample = useCallback(() => {
    setYaml(SAMPLE);
    setIssues(null);
    setHasRun(false);
  }, []);

  const errorCount   = issues?.filter(i => i.level === 'error').length   ?? 0;
  const warnCount    = issues?.filter(i => i.level === 'warning').length  ?? 0;
  const infoCount    = issues?.filter(i => i.level === 'info').length     ?? 0;

  return (
    <div class="space-y-4">
      <div class="flex gap-2 flex-wrap">
        <span class="text-sm text-text-muted">Ansible Playbook YAML</span>
        <button
          onClick={loadSample}
          class="ml-auto px-3 py-1.5 text-xs bg-surface border border-border rounded text-text-muted hover:border-accent transition-colors"
        >
          Load Sample
        </button>
      </div>

      <div>
        <label class="text-sm font-medium text-text mb-2 block">Playbook YAML</label>
        <textarea
          value={yaml}
          onInput={e => { setYaml((e.target as HTMLTextAreaElement).value); setHasRun(false); setIssues(null); }}
          placeholder="Paste your Ansible playbook YAML here..."
          class="w-full h-80 bg-[#0d1117] border border-border rounded-lg p-3 font-mono text-xs resize-none focus:outline-none focus:border-accent text-text"
          spellcheck={false}
        />
      </div>

      <button
        onClick={lint}
        class="px-5 py-2 bg-accent text-white rounded hover:bg-accent/80 transition-colors text-sm font-medium"
      >
        Lint Playbook
      </button>

      {hasRun && issues && (
        <div class="space-y-3">
          <div class="flex items-center gap-4 text-sm p-3 bg-surface border border-border rounded-lg flex-wrap">
            <span class="font-medium text-text">Results:</span>
            <span class="text-red-400">{errorCount} error{errorCount !== 1 ? 's' : ''}</span>
            <span class="text-yellow-400">{warnCount} warning{warnCount !== 1 ? 's' : ''}</span>
            <span class="text-blue-400">{infoCount} suggestion{infoCount !== 1 ? 's' : ''}</span>
          </div>
          <div class="space-y-2">
            {issues.map((issue, i) => {
              const cfg = LEVEL_CONFIG[issue.level];
              return (
                <div key={i} class={`flex gap-3 p-3 rounded-lg border ${cfg.bg} ${cfg.border}`}>
                  <span class={`text-sm font-bold shrink-0 mt-0.5 ${cfg.text}`}>{cfg.icon}</span>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-0.5">
                      <span class={`text-xs font-bold uppercase tracking-wide ${cfg.text}`}>{cfg.label}</span>
                      {issue.line && <span class="text-xs text-text-muted">line {issue.line}</span>}
                    </div>
                    <p class="text-sm text-text">{issue.message}</p>
                    {issue.doc && (
                      <a href={issue.doc} target="_blank" rel="noopener noreferrer" class="text-xs text-accent hover:underline mt-1 block">
                        Docs ↗
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p class="text-xs text-text-muted">
        Checks for hardcoded secrets, missing required fields, non-idempotent modules, error suppression, and Ansible best practices. Runs entirely in your browser — nothing is sent to any server.
      </p>
    </div>
  );
}
