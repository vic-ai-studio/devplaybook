import { useState, useCallback } from 'preact/hooks';

type Language = 'typescript' | 'go' | 'python';

interface ScaffolderConfig {
  workflowName: string;
  taskQueue: string;
  activities: string[];
  lang: Language;
  includeRetry: boolean;
  includeSignals: boolean;
  includeQueries: boolean;
  executionTimeout: string;
}

const DEFAULTS: ScaffolderConfig = {
  workflowName: 'OrderProcessingWorkflow',
  taskQueue: 'order-processing',
  activities: ['ValidateOrder', 'ChargePayment', 'FulfillOrder'],
  lang: 'typescript',
  includeRetry: true,
  includeSignals: false,
  includeQueries: true,
  executionTimeout: '1h',
};

function toSnakeCase(s: string) {
  return s.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}

function toCamelCase(s: string) {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function generateTypeScript(cfg: ScaffolderConfig): string {
  const { workflowName, taskQueue, activities, includeRetry, includeSignals, includeQueries, executionTimeout } = cfg;
  const activityFuncs = activities.map(a => toCamelCase(a));

  const lines: string[] = [];

  // workflow.ts
  lines.push('// workflow.ts');
  lines.push("import { proxyActivities, defineSignal, defineQuery, setHandler, sleep } from '@temporalio/workflow';");
  lines.push("import type * as activities from './activities';");
  lines.push('');

  if (includeRetry) {
    lines.push('const acts = proxyActivities<typeof activities>({');
    lines.push('  startToCloseTimeout: \'10 minutes\',');
    lines.push('  retry: {');
    lines.push('    maximumAttempts: 3,');
    lines.push('    initialInterval: \'1s\',');
    lines.push('    backoffCoefficient: 2,');
    lines.push('    maximumInterval: \'30s\',');
    lines.push('  },');
    lines.push('});');
  } else {
    lines.push('const acts = proxyActivities<typeof activities>({');
    lines.push('  startToCloseTimeout: \'10 minutes\',');
    lines.push('});');
  }
  lines.push('');

  if (includeSignals) {
    lines.push(`export const cancelSignal = defineSignal('cancel');`);
  }
  if (includeQueries) {
    lines.push(`export const statusQuery = defineQuery<string>('status');`);
  }
  lines.push('');

  lines.push(`export async function ${workflowName}(input: Record<string, unknown>): Promise<void> {`);
  if (includeSignals) {
    lines.push('  let cancelled = false;');
    lines.push(`  setHandler(cancelSignal, () => { cancelled = true; });`);
  }
  if (includeQueries) {
    lines.push("  let status = 'started';");
    lines.push(`  setHandler(statusQuery, () => status);`);
  }
  lines.push('');
  activityFuncs.forEach((fn, i) => {
    if (includeSignals) lines.push('  if (cancelled) return;');
    if (includeQueries) lines.push(`  status = '${activities[i]}';`);
    lines.push(`  await acts.${fn}(input);`);
  });
  if (includeQueries) lines.push("  status = 'completed';");
  lines.push('}');
  lines.push('');

  // activities.ts
  lines.push('// activities.ts');
  lines.push("import { Context } from '@temporalio/activity';");
  lines.push('');
  activities.forEach((act, i) => {
    lines.push(`export async function ${activityFuncs[i]}(input: Record<string, unknown>): Promise<void> {`);
    lines.push(`  Context.current().heartbeat();`);
    lines.push(`  /* [IMPLEMENT] Add your ${act} business logic here. This is an intentional scaffold placeholder — replace with your activity implementation. Reference: https://docs.temporal.io/develop/typescript/core-application#develop-activities */`);
    lines.push(`  console.log('Executing ${act}', input);`);
    lines.push('}');
    lines.push('');
  });

  // worker.ts
  lines.push('// worker.ts');
  lines.push("import { Worker } from '@temporalio/worker';");
  lines.push("import * as activities from './activities';");
  lines.push('');
  lines.push('async function run() {');
  lines.push('  const worker = await Worker.create({');
  lines.push(`    workflowsPath: require.resolve('./workflow'),`);
  lines.push('    activities,');
  lines.push(`    taskQueue: '${taskQueue}',`);
  lines.push('  });');
  lines.push('  await worker.run();');
  lines.push('}');
  lines.push('');
  lines.push('run().catch(console.error);');
  lines.push('');

  // client.ts
  lines.push('// client.ts');
  lines.push("import { Connection, Client } from '@temporalio/client';");
  lines.push(`import { ${workflowName} } from './workflow';`);
  lines.push('');
  lines.push('async function startWorkflow() {');
  lines.push('  const connection = await Connection.connect();');
  lines.push('  const client = new Client({ connection });');
  lines.push('');
  lines.push(`  const handle = await client.workflow.start(${workflowName}, {`);
  lines.push(`    taskQueue: '${taskQueue}',`);
  lines.push(`    workflowId: '${toSnakeCase(workflowName)}-' + Date.now(),`);
  lines.push(`    executionTimeout: '${executionTimeout}',`);
  lines.push('    args: [{ /* your input */ }],');
  lines.push('  });');
  lines.push('');
  lines.push('  console.log(`Started workflow: ${handle.workflowId}`);');
  if (includeQueries) {
    lines.push("  const status = await handle.query('status');");
    lines.push('  console.log(`Status: ${status}`);');
  }
  lines.push('}');
  lines.push('');
  lines.push('startWorkflow().catch(console.error);');

  return lines.join('\n');
}

function generateGo(cfg: ScaffolderConfig): string {
  const { workflowName, taskQueue, activities, includeRetry, includeSignals, includeQueries, executionTimeout } = cfg;
  const pkgName = toSnakeCase(workflowName).replace(/_workflow$/, '');
  const lines: string[] = [];

  // workflow.go
  lines.push('// workflow.go');
  lines.push(`package ${pkgName}`);
  lines.push('');
  lines.push('import (');
  lines.push('\t"time"');
  lines.push('\t"go.temporal.io/sdk/workflow"');
  lines.push(')');
  lines.push('');
  lines.push(`func ${workflowName}(ctx workflow.Context, input map[string]interface{}) error {`);
  lines.push('\tao := workflow.ActivityOptions{');
  lines.push('\t\tStartToCloseTimeout: 10 * time.Minute,');
  if (includeRetry) {
    lines.push('\t\tRetryPolicy: &temporal.RetryPolicy{');
    lines.push('\t\t\tMaximumAttempts: 3,');
    lines.push('\t\t\tInitialInterval: time.Second,');
    lines.push('\t\t\tBackoffCoefficient: 2.0,');
    lines.push('\t\t\tMaximumInterval: 30 * time.Second,');
    lines.push('\t\t},');
  }
  lines.push('\t}');
  lines.push('\tctx = workflow.WithActivityOptions(ctx, ao)');
  lines.push('');
  if (includeSignals) {
    lines.push('\tcancelCh := workflow.GetSignalChannel(ctx, "cancel")');
    lines.push('\tvar cancelled bool');
    lines.push('\tworkflow.Go(ctx, func(ctx workflow.Context) {');
    lines.push('\t\tcancelCh.Receive(ctx, nil)');
    lines.push('\t\tcancelled = true');
    lines.push('\t})');
    lines.push('');
  }
  if (includeQueries) {
    lines.push('\tstatus := "started"');
    lines.push('\tworkflow.SetQueryHandler(ctx, "status", func() (string, error) {');
    lines.push('\t\treturn status, nil');
    lines.push('\t})');
    lines.push('');
  }
  activities.forEach(act => {
    if (includeSignals) lines.push('\tif cancelled { return nil }');
    if (includeQueries) lines.push(`\tstatus = "${act}"`);
    lines.push(`\tif err := workflow.ExecuteActivity(ctx, ${act}, input).Get(ctx, nil); err != nil {`);
    lines.push('\t\treturn err');
    lines.push('\t}');
  });
  if (includeQueries) lines.push('\tstatus = "completed"');
  lines.push('\treturn nil');
  lines.push('}');
  lines.push('');

  // activities.go
  lines.push('// activities.go');
  lines.push(`package ${pkgName}`);
  lines.push('');
  lines.push('import (');
  lines.push('\t"context"');
  lines.push('\t"fmt"');
  lines.push(')');
  lines.push('');
  activities.forEach(act => {
    lines.push(`func ${act}(ctx context.Context, input map[string]interface{}) error {`);
    lines.push(`\tfmt.Printf("Executing ${act}: %v\\n", input)`);
    lines.push('\t// [IMPLEMENT] Add your activity business logic here. This is an intentional scaffold placeholder — replace with your implementation. Reference: https://docs.temporal.io/develop/go/core-application#develop-activities');
    lines.push('\treturn nil');
    lines.push('}');
    lines.push('');
  });

  // main.go
  lines.push('// main.go (worker)');
  lines.push(`package main`);
  lines.push('');
  lines.push('import (');
  lines.push('\t"log"');
  lines.push('\t"go.temporal.io/sdk/client"');
  lines.push('\t"go.temporal.io/sdk/worker"');
  lines.push(`\t"yourmodule/${pkgName}"`);
  lines.push(')');
  lines.push('');
  lines.push('func main() {');
  lines.push('\tc, err := client.Dial(client.Options{})');
  lines.push('\tif err != nil { log.Fatal(err) }');
  lines.push('\tdefer c.Close()');
  lines.push('');
  lines.push(`\tw := worker.New(c, "${taskQueue}", worker.Options{})`);
  lines.push(`\tw.RegisterWorkflow(${pkgName}.${workflowName})`);
  activities.forEach(act => lines.push(`\tw.RegisterActivity(${pkgName}.${act})`));
  lines.push('');
  lines.push('\tif err := w.Run(worker.InterruptCh()); err != nil {');
  lines.push('\t\tlog.Fatal(err)');
  lines.push('\t}');
  lines.push('}');

  return lines.join('\n');
}

function generatePython(cfg: ScaffolderConfig): string {
  const { workflowName, taskQueue, activities, includeRetry, executionTimeout } = cfg;
  const lines: string[] = [];

  // workflow.py
  lines.push('# workflow.py');
  lines.push('from datetime import timedelta');
  lines.push('from temporalio import workflow');
  lines.push('from temporalio.common import RetryPolicy');
  lines.push('from .activities import ' + activities.map(toSnakeCase).join(', '));
  lines.push('');
  lines.push(`@workflow.defn`);
  lines.push(`class ${workflowName}:`);
  lines.push('    @workflow.run');
  lines.push('    async def run(self, input: dict) -> None:');
  activities.forEach(act => {
    const fn = toSnakeCase(act);
    if (includeRetry) {
      lines.push(`        await workflow.execute_activity(`);
      lines.push(`            ${fn},`);
      lines.push(`            input,`);
      lines.push(`            start_to_close_timeout=timedelta(minutes=10),`);
      lines.push(`            retry_policy=RetryPolicy(`);
      lines.push(`                maximum_attempts=3,`);
      lines.push(`                initial_interval=timedelta(seconds=1),`);
      lines.push(`                backoff_coefficient=2.0,`);
      lines.push(`                maximum_interval=timedelta(seconds=30),`);
      lines.push(`            ),`);
      lines.push(`        )`);
    } else {
      lines.push(`        await workflow.execute_activity(${fn}, input, start_to_close_timeout=timedelta(minutes=10))`);
    }
  });
  lines.push('');

  // activities.py
  lines.push('# activities.py');
  lines.push('from temporalio import activity');
  lines.push('');
  activities.forEach(act => {
    const fn = toSnakeCase(act);
    lines.push('@activity.defn');
    lines.push(`async def ${fn}(input: dict) -> None:`);
    lines.push(`    activity.heartbeat()`);
    lines.push(`    # [IMPLEMENT] Add your ${act} business logic here. Intentional scaffold placeholder — replace with your implementation. Reference: https://docs.temporal.io/develop/python/core-application#develop-activities`);
    lines.push(`    print(f"Executing ${act}: {input}")`);
    lines.push('');
  });

  // worker.py
  lines.push('# worker.py');
  lines.push('import asyncio');
  lines.push('from temporalio.client import Client');
  lines.push('from temporalio.worker import Worker');
  lines.push('from .workflow import ' + workflowName);
  lines.push('from .activities import ' + activities.map(toSnakeCase).join(', '));
  lines.push('');
  lines.push('async def main():');
  lines.push('    client = await Client.connect("localhost:7233")');
  lines.push(`    async with Worker(client, task_queue="${taskQueue}", workflows=[${workflowName}], activities=[${activities.map(toSnakeCase).join(', ')}]):`);
  lines.push('        await asyncio.Future()  # run forever');
  lines.push('');
  lines.push('if __name__ == "__main__":');
  lines.push('    asyncio.run(main())');

  return lines.join('\n');
}

function scaffold(cfg: ScaffolderConfig): string {
  if (cfg.lang === 'go') return generateGo(cfg);
  if (cfg.lang === 'python') return generatePython(cfg);
  return generateTypeScript(cfg);
}

export default function TemporalWorkflowScaffolder() {
  const [cfg, setCfg] = useState<ScaffolderConfig>(DEFAULTS);
  const [newActivity, setNewActivity] = useState('');
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);

  const update = (field: keyof ScaffolderConfig, value: unknown) => {
    setCfg(prev => ({ ...prev, [field]: value }));
    setOutput('');
  };

  const addActivity = () => {
    if (!newActivity.trim()) return;
    const name = newActivity.trim().replace(/^[a-z]/, c => c.toUpperCase());
    if (!cfg.activities.includes(name)) {
      setCfg(prev => ({ ...prev, activities: [...prev.activities, name] }));
    }
    setNewActivity('');
    setOutput('');
  };

  const removeActivity = (i: number) => {
    setCfg(prev => ({ ...prev, activities: prev.activities.filter((_, idx) => idx !== i) }));
    setOutput('');
  };

  const generate = useCallback(() => {
    setOutput(scaffold(cfg));
  }, [cfg]);

  const copy = useCallback(() => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [output]);

  const inputClass = 'w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-accent';
  const checkClass = 'flex items-center gap-2 cursor-pointer text-sm text-text-muted';

  return (
    <div class="space-y-5">
      {/* Language */}
      <div class="flex gap-2">
        {(['typescript', 'go', 'python'] as Language[]).map(l => (
          <button
            key={l}
            onClick={() => update('lang', l)}
            class={`px-4 py-1.5 text-sm rounded transition-colors ${cfg.lang === l ? 'bg-accent text-white' : 'bg-surface border border-border text-text-muted hover:border-accent'}`}
          >
            {l === 'typescript' ? 'TypeScript' : l === 'go' ? 'Go' : 'Python'}
          </button>
        ))}
      </div>

      {/* Basic config */}
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="text-xs font-medium text-text-muted mb-1 block">Workflow Name</label>
          <input value={cfg.workflowName} onInput={e => update('workflowName', (e.target as HTMLInputElement).value)} placeholder="OrderProcessingWorkflow" class={inputClass} />
        </div>
        <div>
          <label class="text-xs font-medium text-text-muted mb-1 block">Task Queue</label>
          <input value={cfg.taskQueue} onInput={e => update('taskQueue', (e.target as HTMLInputElement).value)} placeholder="order-processing" class={inputClass} />
        </div>
        <div>
          <label class="text-xs font-medium text-text-muted mb-1 block">Execution Timeout</label>
          <input value={cfg.executionTimeout} onInput={e => update('executionTimeout', (e.target as HTMLInputElement).value)} placeholder="1h" class={inputClass} />
        </div>
      </div>

      {/* Options */}
      <div class="flex flex-wrap gap-4">
        <label class={checkClass}>
          <input type="checkbox" checked={cfg.includeRetry} onChange={e => update('includeRetry', (e.target as HTMLInputElement).checked)} />
          Retry Policy
        </label>
        <label class={checkClass}>
          <input type="checkbox" checked={cfg.includeSignals} onChange={e => update('includeSignals', (e.target as HTMLInputElement).checked)} />
          Signals (cancel)
        </label>
        <label class={checkClass}>
          <input type="checkbox" checked={cfg.includeQueries} onChange={e => update('includeQueries', (e.target as HTMLInputElement).checked)} />
          Queries (status)
        </label>
      </div>

      {/* Activities */}
      <div>
        <label class="text-xs font-medium text-text-muted mb-2 block">Activities (in execution order)</label>
        <div class="flex flex-wrap gap-2 mb-2">
          {cfg.activities.map((act, i) => (
            <span key={i} class="flex items-center gap-1.5 px-2 py-1 bg-surface border border-border rounded text-xs font-mono text-text">
              {act}
              <button onClick={() => removeActivity(i)} class="text-text-muted hover:text-red-400 transition-colors">×</button>
            </span>
          ))}
        </div>
        <div class="flex gap-2">
          <input
            value={newActivity}
            onInput={e => setNewActivity((e.target as HTMLInputElement).value)}
            onKeyDown={e => e.key === 'Enter' && addActivity()}
            placeholder="ActivityName"
            class="flex-1 bg-[#0d1117] border border-border rounded px-3 py-2 text-sm text-text font-mono focus:outline-none focus:border-accent"
          />
          <button onClick={addActivity} class="px-3 py-2 bg-surface border border-border rounded text-sm text-text-muted hover:border-accent transition-colors">+ Add</button>
        </div>
      </div>

      <button
        onClick={generate}
        class="px-5 py-2 bg-accent text-white rounded hover:bg-accent/80 transition-colors text-sm font-medium"
      >
        Generate Boilerplate
      </button>

      {output && (
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-text">Generated {cfg.lang === 'typescript' ? 'TypeScript' : cfg.lang === 'go' ? 'Go' : 'Python'} Boilerplate</span>
            <button onClick={copy} class="px-3 py-1.5 text-xs bg-surface border border-border rounded text-text-muted hover:border-accent transition-colors">
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <pre class="w-full bg-[#0d1117] border border-border rounded-lg p-4 text-xs font-mono text-green-300 overflow-x-auto whitespace-pre max-h-[600px] overflow-y-auto">{output}</pre>
        </div>
      )}

      <p class="text-xs text-text-muted">
        Scaffolds Temporal workflow and activity boilerplate for TypeScript, Go, and Python. Includes worker setup, client code, retry policies, signals, and queries. Runs entirely in your browser.
      </p>
    </div>
  );
}
