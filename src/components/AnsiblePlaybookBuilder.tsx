import { useState } from 'preact/hooks';

type TaskModule = 'apt' | 'yum' | 'dnf' | 'copy' | 'service' | 'command' | 'shell' | 'file' | 'template' | 'git' | 'user' | 'cron';

const MODULE_LABELS: Record<TaskModule, string> = {
  apt: 'apt (Debian/Ubuntu package)',
  yum: 'yum (RHEL/CentOS package)',
  dnf: 'dnf (Fedora/RHEL8 package)',
  copy: 'copy (copy files)',
  service: 'service (manage services)',
  command: 'command (run command)',
  shell: 'shell (run shell)',
  file: 'file (manage files/dirs)',
  template: 'template (Jinja2 template)',
  git: 'git (clone/checkout)',
  user: 'user (manage users)',
  cron: 'cron (schedule jobs)',
};

interface TaskConfig {
  id: string;
  name: string;
  module: TaskModule;
  params: Record<string, string>;
  become: boolean;
  when: string;
  notify: string;
  ignore_errors: boolean;
}

function defaultParams(module: TaskModule): Record<string, string> {
  switch (module) {
    case 'apt': return { name: 'nginx', state: 'present', update_cache: 'yes' };
    case 'yum': return { name: 'httpd', state: 'present' };
    case 'dnf': return { name: 'nginx', state: 'latest' };
    case 'copy': return { src: './files/app.conf', dest: '/etc/app/app.conf', mode: '0644', owner: 'root' };
    case 'service': return { name: 'nginx', state: 'started', enabled: 'yes' };
    case 'command': return { cmd: 'systemctl daemon-reload' };
    case 'shell': return { cmd: 'echo $HOME > /tmp/home.txt' };
    case 'file': return { path: '/var/www/html', state: 'directory', mode: '0755', owner: 'www-data' };
    case 'template': return { src: 'nginx.conf.j2', dest: '/etc/nginx/nginx.conf' };
    case 'git': return { repo: 'https://github.com/user/repo.git', dest: '/opt/app', version: 'main' };
    case 'user': return { name: 'deploy', groups: 'sudo', shell: '/bin/bash', create_home: 'yes' };
    case 'cron': return { name: 'daily backup', minute: '0', hour: '2', job: '/opt/backup.sh' };
    default: return {};
  }
}

function renderTaskYaml(task: TaskConfig, indent = 4): string {
  const pad = ' '.repeat(indent);
  const lines: string[] = [];
  lines.push(`${pad}- name: ${task.name || 'My task'}`);

  // module params
  const paramLines = Object.entries(task.params).filter(([, v]) => v !== '');
  if (paramLines.length > 0) {
    lines.push(`${pad}  ${task.module}:`);
    paramLines.forEach(([k, v]) => {
      lines.push(`${pad}    ${k}: ${v}`);
    });
  } else {
    lines.push(`${pad}  ${task.module}: {}`);
  }

  if (task.become) lines.push(`${pad}  become: true`);
  if (task.when) lines.push(`${pad}  when: ${task.when}`);
  if (task.notify) lines.push(`${pad}  notify: ${task.notify}`);
  if (task.ignore_errors) lines.push(`${pad}  ignore_errors: true`);

  return lines.join('\n');
}

let counter = 0;
function newId() { return `task-${++counter}`; }

interface PlaybookConfig {
  name: string;
  hosts: string;
  become: boolean;
  gatherFacts: boolean;
  vars: string;
  handlers: string;
}

export default function AnsiblePlaybookBuilder() {
  const [config, setConfig] = useState<PlaybookConfig>({
    name: 'Deploy Web App',
    hosts: 'webservers',
    become: true,
    gatherFacts: true,
    vars: 'app_port: 8080\napp_user: deploy',
    handlers: 'restart nginx',
  });
  const [tasks, setTasks] = useState<TaskConfig[]>([
    { id: newId(), name: 'Install nginx', module: 'apt', params: defaultParams('apt'), become: false, when: '', notify: '', ignore_errors: false },
    { id: newId(), name: 'Start nginx service', module: 'service', params: defaultParams('service'), become: false, when: '', notify: '', ignore_errors: false },
  ]);
  const [copied, setCopied] = useState(false);

  function addTask() {
    setTasks(t => [...t, {
      id: newId(), name: 'New task', module: 'command',
      params: defaultParams('command'), become: false, when: '', notify: '', ignore_errors: false,
    }]);
  }

  function removeTask(id: string) {
    setTasks(t => t.filter(x => x.id !== id));
  }

  function updateTask(id: string, field: keyof TaskConfig, val: any) {
    setTasks(t => t.map(x => {
      if (x.id !== id) return x;
      if (field === 'module') return { ...x, module: val as TaskModule, params: defaultParams(val as TaskModule) };
      return { ...x, [field]: val };
    }));
  }

  function updateParam(id: string, key: string, val: string) {
    setTasks(t => t.map(x => x.id === id ? { ...x, params: { ...x.params, [key]: val } } : x));
  }

  function generateYaml(): string {
    const lines: string[] = ['---'];
    lines.push(`- name: ${config.name}`);
    lines.push(`  hosts: ${config.hosts}`);
    lines.push(`  become: ${config.become}`);
    lines.push(`  gather_facts: ${config.gatherFacts}`);

    if (config.vars.trim()) {
      lines.push('  vars:');
      config.vars.trim().split('\n').forEach(line => {
        if (line.trim()) lines.push(`    ${line.trim()}`);
      });
    }

    if (config.handlers.trim()) {
      lines.push('  handlers:');
      config.handlers.trim().split('\n').forEach(h => {
        if (h.trim()) {
          lines.push(`    - name: ${h.trim()}`);
          lines.push(`      service: name=${h.trim().split(' ').pop()} state=restarted`);
        }
      });
    }

    lines.push('  tasks:');
    tasks.forEach(task => {
      lines.push(renderTaskYaml(task, 4));
    });

    return lines.join('\n');
  }

  const yaml = generateYaml();

  function copy() {
    navigator.clipboard.writeText(yaml).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div class="space-y-6">
      {/* Playbook config */}
      <div class="p-4 rounded-xl border border-border bg-bg">
        <h3 class="text-sm font-semibold mb-3">Playbook Settings</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-medium mb-1">Playbook Name</label>
            <input value={config.name} onInput={e => setConfig(c => ({ ...c, name: (e.target as HTMLInputElement).value }))}
              class="w-full px-3 py-2 rounded-lg bg-bg border border-border text-text text-sm focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label class="block text-xs font-medium mb-1">Hosts / Group</label>
            <input value={config.hosts} onInput={e => setConfig(c => ({ ...c, hosts: (e.target as HTMLInputElement).value }))}
              placeholder="webservers, all, db_servers"
              class="w-full px-3 py-2 rounded-lg bg-bg border border-border text-text text-sm focus:outline-none focus:border-primary font-mono" />
          </div>
          <div>
            <label class="block text-xs font-medium mb-1">Variables (YAML, one per line)</label>
            <textarea value={config.vars} onInput={e => setConfig(c => ({ ...c, vars: (e.target as HTMLTextAreaElement).value }))}
              rows={3} placeholder="key: value"
              class="w-full px-3 py-2 rounded-lg bg-bg border border-border text-text text-sm focus:outline-none focus:border-primary font-mono resize-none" />
          </div>
          <div>
            <label class="block text-xs font-medium mb-1">Handlers (one per line)</label>
            <textarea value={config.handlers} onInput={e => setConfig(c => ({ ...c, handlers: (e.target as HTMLTextAreaElement).value }))}
              rows={3} placeholder="restart nginx"
              class="w-full px-3 py-2 rounded-lg bg-bg border border-border text-text text-sm focus:outline-none focus:border-primary font-mono resize-none" />
          </div>
          <div class="flex gap-4">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={config.become} onChange={e => setConfig(c => ({ ...c, become: (e.target as HTMLInputElement).checked }))} class="accent-primary" />
              <span class="text-sm">become (sudo)</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={config.gatherFacts} onChange={e => setConfig(c => ({ ...c, gatherFacts: (e.target as HTMLInputElement).checked }))} class="accent-primary" />
              <span class="text-sm">gather_facts</span>
            </label>
          </div>
        </div>
      </div>

      {/* Tasks */}
      <div>
        <div class="flex items-center justify-between mb-3">
          <label class="text-sm font-medium">Tasks ({tasks.length})</label>
          <button onClick={addTask} class="text-sm px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20">+ Add Task</button>
        </div>
        <div class="space-y-3">
          {tasks.map((task, i) => (
            <div key={task.id} class="p-4 rounded-xl border border-border bg-bg">
              <div class="flex items-center gap-2 mb-3">
                <span class="text-xs text-text-muted w-5">{i + 1}.</span>
                <input value={task.name} onInput={e => updateTask(task.id, 'name', (e.target as HTMLInputElement).value)}
                  placeholder="Task name"
                  class="flex-1 px-2 py-1.5 rounded bg-surface border border-border text-text text-sm focus:outline-none focus:border-primary" />
                <select value={task.module} onChange={e => updateTask(task.id, 'module', (e.target as HTMLSelectElement).value)}
                  class="px-2 py-1.5 rounded bg-surface border border-border text-text text-sm focus:outline-none focus:border-primary">
                  {Object.entries(MODULE_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
                <button onClick={() => removeTask(task.id)} class="text-red-400 hover:text-red-300 text-sm px-2">✕</button>
              </div>
              <div class="grid grid-cols-2 md:grid-cols-3 gap-2 mb-2">
                {Object.entries(task.params).map(([key, val]) => (
                  <div key={key}>
                    <label class="block text-xs text-text-muted mb-0.5 font-mono">{key}:</label>
                    <input value={val} onInput={e => updateParam(task.id, key, (e.target as HTMLInputElement).value)}
                      class="w-full px-2 py-1 rounded bg-surface border border-border text-text text-xs focus:outline-none focus:border-primary font-mono" />
                  </div>
                ))}
              </div>
              <div class="flex gap-3 flex-wrap text-xs">
                <label class="flex items-center gap-1 cursor-pointer">
                  <input type="checkbox" checked={task.become} onChange={e => updateTask(task.id, 'become', (e.target as HTMLInputElement).checked)} class="accent-primary" />
                  <span>become</span>
                </label>
                <label class="flex items-center gap-1 cursor-pointer">
                  <input type="checkbox" checked={task.ignore_errors} onChange={e => updateTask(task.id, 'ignore_errors', (e.target as HTMLInputElement).checked)} class="accent-primary" />
                  <span>ignore_errors</span>
                </label>
                <input value={task.when} onInput={e => updateTask(task.id, 'when', (e.target as HTMLInputElement).value)}
                  placeholder="when: condition"
                  class="px-2 py-1 rounded bg-surface border border-border text-text font-mono focus:outline-none focus:border-primary" />
                <input value={task.notify} onInput={e => updateTask(task.id, 'notify', (e.target as HTMLInputElement).value)}
                  placeholder="notify: handler"
                  class="px-2 py-1 rounded bg-surface border border-border text-text font-mono focus:outline-none focus:border-primary" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Output */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium">Generated Playbook YAML</label>
          <button onClick={copy} class="text-sm px-3 py-1.5 rounded-lg bg-surface border border-border hover:border-primary transition-colors">
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <pre class="p-4 rounded-xl bg-bg border border-border text-sm font-mono overflow-x-auto whitespace-pre">{yaml}</pre>
      </div>

      <div class="p-4 rounded-xl bg-primary/5 border border-primary/20 text-sm">
        <p class="font-medium mb-2">Run the playbook</p>
        <code class="text-xs font-mono text-text-muted">ansible-playbook -i inventory.ini playbook.yml --check</code>
      </div>
    </div>
  );
}
