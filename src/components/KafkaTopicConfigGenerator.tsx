import { useState, useCallback } from 'preact/hooks';

type CleanupPolicy = 'delete' | 'compact' | 'compact,delete';
type CompressionType = 'none' | 'gzip' | 'snappy' | 'lz4' | 'zstd';
type RetentionUnit = 'hours' | 'days';

interface KafkaConfig {
  topicName: string;
  partitions: number;
  replicationFactor: number;
  retentionValue: number;
  retentionUnit: RetentionUnit;
  cleanupPolicy: CleanupPolicy;
  minInsyncReplicas: number;
  maxMessageBytes: number;
  compressionType: CompressionType;
}

function retentionMs(value: number, unit: RetentionUnit): number {
  const msPerHour = 3600000;
  return unit === 'hours' ? value * msPerHour : value * 24 * msPerHour;
}

function generateCliCommand(cfg: KafkaConfig): string {
  const retMs = retentionMs(cfg.retentionValue, cfg.retentionUnit);
  const lines = [
    `kafka-topics.sh \\`,
    `  --bootstrap-server localhost:9092 \\`,
    `  --create \\`,
    `  --topic ${cfg.topicName} \\`,
    `  --partitions ${cfg.partitions} \\`,
    `  --replication-factor ${cfg.replicationFactor} \\`,
    `  --config cleanup.policy=${cfg.cleanupPolicy} \\`,
    `  --config retention.ms=${retMs} \\`,
    `  --config min.insync.replicas=${cfg.minInsyncReplicas} \\`,
    `  --config max.message.bytes=${cfg.maxMessageBytes} \\`,
    `  --config compression.type=${cfg.compressionType}`,
  ];
  return lines.join('\n');
}

function generateTopicConfig(cfg: KafkaConfig): string {
  const retMs = retentionMs(cfg.retentionValue, cfg.retentionUnit);
  return [
    `cleanup.policy=${cfg.cleanupPolicy}`,
    `retention.ms=${retMs}`,
    `min.insync.replicas=${cfg.minInsyncReplicas}`,
    `max.message.bytes=${cfg.maxMessageBytes}`,
    `compression.type=${cfg.compressionType}`,
  ].join('\n');
}

function generateServerProperties(cfg: KafkaConfig): string {
  const retMs = retentionMs(cfg.retentionValue, cfg.retentionUnit);
  return [
    `# Relevant broker defaults (server.properties)`,
    `num.partitions=${cfg.partitions}`,
    `default.replication.factor=${cfg.replicationFactor}`,
    `min.insync.replicas=${cfg.minInsyncReplicas}`,
    `log.retention.ms=${retMs}`,
    `log.cleanup.policy=${cfg.cleanupPolicy}`,
    `message.max.bytes=${cfg.maxMessageBytes}`,
    `compression.type=${cfg.compressionType}`,
  ].join('\n');
}

function generateTerraform(cfg: KafkaConfig): string {
  const retMs = retentionMs(cfg.retentionValue, cfg.retentionUnit);
  return [
    `resource "confluent_kafka_topic" "${cfg.topicName.replace(/[^a-zA-Z0-9_]/g, '_')}" {`,
    `  topic_name       = "${cfg.topicName}"`,
    `  partitions_count = ${cfg.partitions}`,
    ``,
    `  config = {`,
    `    "cleanup.policy"      = "${cfg.cleanupPolicy}"`,
    `    "retention.ms"        = "${retMs}"`,
    `    "min.insync.replicas" = "${cfg.minInsyncReplicas}"`,
    `    "max.message.bytes"   = "${cfg.maxMessageBytes}"`,
    `    "compression.type"    = "${cfg.compressionType}"`,
    `  }`,
    `}`,
  ].join('\n');
}

interface OutputBlockProps {
  label: string;
  content: string;
}

function OutputBlock({ label, content }: OutputBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [content]);

  return (
    <div class="mb-4">
      <div class="flex items-center justify-between mb-1.5">
        <span class="text-xs font-semibold text-text-muted uppercase tracking-wider">{label}</span>
        <button
          onClick={handleCopy}
          class="px-3 py-1.5 rounded-lg text-xs bg-surface border border-border text-text-muted hover:text-text hover:border-primary/50 transition-colors"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre class="bg-surface rounded-lg border border-border p-3 text-xs font-mono text-green-400 overflow-x-auto whitespace-pre">{content}</pre>
    </div>
  );
}

export default function KafkaTopicConfigGenerator() {
  const [cfg, setCfg] = useState<KafkaConfig>({
    topicName: 'my-topic',
    partitions: 3,
    replicationFactor: 3,
    retentionValue: 7,
    retentionUnit: 'days',
    cleanupPolicy: 'delete',
    minInsyncReplicas: 2,
    maxMessageBytes: 1048576,
    compressionType: 'none',
  });

  const update = useCallback(<K extends keyof KafkaConfig>(key: K, value: KafkaConfig[K]) => {
    setCfg(prev => ({ ...prev, [key]: value }));
  }, []);

  const warnRfLtPartitions = cfg.replicationFactor > cfg.partitions;
  const warnMinIsyncGteRf = cfg.minInsyncReplicas >= cfg.replicationFactor;

  const inputClass =
    'w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm font-mono text-text focus:outline-none focus:border-primary';
  const selectClass = inputClass;
  const labelClass = 'block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1';

  return (
    <div class="bg-background border border-border rounded-xl p-6">
      <h2 class="text-lg font-bold text-text mb-1">Kafka Topic Config Generator</h2>
      <p class="text-sm text-text-muted mb-6">
        Generate CLI commands, config snippets, and Terraform resources for your Kafka topic.
      </p>

      {(warnRfLtPartitions || warnMinIsyncGteRf) && (
        <div class="mb-5 space-y-2">
          {warnRfLtPartitions && (
            <div class="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-2.5 text-xs text-yellow-400">
              <span class="mt-0.5">⚠</span>
              <span>
                Replication factor ({cfg.replicationFactor}) exceeds partition count ({cfg.partitions}). This is
                unusual — typically replication factor is less than or equal to partitions.
              </span>
            </div>
          )}
          {warnMinIsyncGteRf && (
            <div class="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2.5 text-xs text-red-400">
              <span class="mt-0.5">⚠</span>
              <span>
                Min insync replicas ({cfg.minInsyncReplicas}) must be less than replication factor ({cfg.replicationFactor}).
                Producers will not be able to write to this topic.
              </span>
            </div>
          )}
        </div>
      )}

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column: inputs */}
        <div class="space-y-4">
          <div>
            <label class={labelClass}>Topic Name</label>
            <input
              type="text"
              value={cfg.topicName}
              onInput={e => update('topicName', (e.target as HTMLInputElement).value || 'my-topic')}
              class={inputClass}
              placeholder="my-topic"
            />
          </div>

          <div>
            <label class={labelClass}>
              Partition Count
              <span class="ml-2 font-normal normal-case text-text">{cfg.partitions}</span>
            </label>
            <div class="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={100}
                value={cfg.partitions}
                onInput={e => update('partitions', Number((e.target as HTMLInputElement).value))}
                class="flex-1 accent-primary"
              />
              <input
                type="number"
                min={1}
                max={100}
                value={cfg.partitions}
                onInput={e => {
                  const v = Math.min(100, Math.max(1, Number((e.target as HTMLInputElement).value)));
                  update('partitions', v);
                }}
                class="w-20 bg-surface border border-border rounded-lg px-3 py-2 text-sm font-mono text-text focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label class={labelClass}>Replication Factor</label>
            <input
              type="number"
              min={1}
              max={10}
              value={cfg.replicationFactor}
              onInput={e => {
                const v = Math.min(10, Math.max(1, Number((e.target as HTMLInputElement).value)));
                update('replicationFactor', v);
              }}
              class={inputClass}
            />
          </div>

          <div>
            <label class={labelClass}>Retention Period</label>
            <div class="flex gap-2">
              <input
                type="number"
                min={1}
                value={cfg.retentionValue}
                onInput={e => {
                  const v = Math.max(1, Number((e.target as HTMLInputElement).value));
                  update('retentionValue', v);
                }}
                class="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-sm font-mono text-text focus:outline-none focus:border-primary"
              />
              <select
                value={cfg.retentionUnit}
                onChange={e => update('retentionUnit', (e.target as HTMLSelectElement).value as RetentionUnit)}
                class="w-28 bg-surface border border-border rounded-lg px-3 py-2 text-sm font-mono text-text focus:outline-none focus:border-primary"
              >
                <option value="hours">Hours</option>
                <option value="days">Days</option>
              </select>
            </div>
            <p class="text-xs text-text-muted mt-1">
              = {retentionMs(cfg.retentionValue, cfg.retentionUnit).toLocaleString()} ms
            </p>
          </div>

          <div>
            <label class={labelClass}>Cleanup Policy</label>
            <select
              value={cfg.cleanupPolicy}
              onChange={e => update('cleanupPolicy', (e.target as HTMLSelectElement).value as CleanupPolicy)}
              class={selectClass}
            >
              <option value="delete">delete</option>
              <option value="compact">compact</option>
              <option value="compact,delete">compact,delete</option>
            </select>
          </div>

          <div>
            <label class={labelClass}>Min Insync Replicas</label>
            <input
              type="number"
              min={1}
              max={10}
              value={cfg.minInsyncReplicas}
              onInput={e => {
                const v = Math.min(10, Math.max(1, Number((e.target as HTMLInputElement).value)));
                update('minInsyncReplicas', v);
              }}
              class={inputClass}
            />
          </div>

          <div>
            <label class={labelClass}>Max Message Size (bytes)</label>
            <input
              type="number"
              min={1}
              value={cfg.maxMessageBytes}
              onInput={e => {
                const v = Math.max(1, Number((e.target as HTMLInputElement).value));
                update('maxMessageBytes', v);
              }}
              class={inputClass}
            />
            <p class="text-xs text-text-muted mt-1">
              {cfg.maxMessageBytes >= 1048576
                ? `${(cfg.maxMessageBytes / 1048576).toFixed(2)} MB`
                : cfg.maxMessageBytes >= 1024
                ? `${(cfg.maxMessageBytes / 1024).toFixed(2)} KB`
                : `${cfg.maxMessageBytes} B`}
            </p>
          </div>

          <div>
            <label class={labelClass}>Compression Type</label>
            <select
              value={cfg.compressionType}
              onChange={e => update('compressionType', (e.target as HTMLSelectElement).value as CompressionType)}
              class={selectClass}
            >
              <option value="none">none</option>
              <option value="gzip">gzip</option>
              <option value="snappy">snappy</option>
              <option value="lz4">lz4</option>
              <option value="zstd">zstd</option>
            </select>
          </div>
        </div>

        {/* Right column: outputs */}
        <div>
          <OutputBlock label="kafka-topics.sh CLI Command" content={generateCliCommand(cfg)} />
          <OutputBlock label="Topic Config Properties" content={generateTopicConfig(cfg)} />
          <OutputBlock label="server.properties Snippet" content={generateServerProperties(cfg)} />
          <OutputBlock label="Terraform confluent_kafka_topic" content={generateTerraform(cfg)} />
        </div>
      </div>
    </div>
  );
}
