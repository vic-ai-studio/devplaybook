import { useState } from 'preact/hooks';

type Pipeline = 'traces' | 'metrics' | 'logs';
type Exporter = 'jaeger' | 'zipkin' | 'otlp_grpc' | 'otlp_http' | 'prometheus' | 'loki';
type OutputFormat = 'yaml' | 'json';

const PIPELINE_LABELS: Record<Pipeline, string> = {
  traces: 'Traces',
  metrics: 'Metrics',
  logs: 'Logs',
};

const EXPORTER_LABELS: Record<Exporter, string> = {
  jaeger: 'Jaeger (gRPC)',
  zipkin: 'Zipkin (HTTP)',
  otlp_grpc: 'OTLP gRPC',
  otlp_http: 'OTLP HTTP',
  prometheus: 'Prometheus (metrics only)',
  loki: 'Grafana Loki (logs only)',
};

function generateOtelConfig(opts: {
  pipelines: Pipeline[];
  exporters: Exporter[];
  serviceName: string;
  jaegerEndpoint: string;
  zipkinEndpoint: string;
  otlpGrpcEndpoint: string;
  otlpHttpEndpoint: string;
  prometheusPort: string;
  lokiEndpoint: string;
  batchTimeout: string;
  maxExportBatch: string;
  samplingRate: string;
  enableDebug: boolean;
  outputFormat: OutputFormat;
}): string {
  const {
    pipelines, exporters, serviceName, jaegerEndpoint, zipkinEndpoint,
    otlpGrpcEndpoint, otlpHttpEndpoint, prometheusPort, lokiEndpoint,
    batchTimeout, maxExportBatch, samplingRate, enableDebug, outputFormat,
  } = opts;

  const svcName = serviceName || 'my-service';
  const timeout = batchTimeout || '5s';
  const batchSize = maxExportBatch || '512';
  const sampling = parseFloat(samplingRate) || 1.0;

  // Build config object
  const config: Record<string, unknown> = {
    extensions: {
      health_check: { endpoint: '0.0.0.0:13133' },
      pprof: { endpoint: '0.0.0.0:1777' },
      zpages: { endpoint: '0.0.0.0:55679' },
    },
    receivers: {
      otlp: {
        protocols: {
          grpc: { endpoint: '0.0.0.0:4317' },
          http: { endpoint: '0.0.0.0:4318' },
        },
      },
    },
    processors: {} as Record<string, unknown>,
    exporters: {} as Record<string, unknown>,
    service: {
      extensions: ['health_check', 'pprof', 'zpages'],
      pipelines: {} as Record<string, unknown>,
      telemetry: {
        resource: {
          'service.name': svcName,
        },
      },
    },
  };

  const processors = config.processors as Record<string, unknown>;
  const cfgExporters = config.exporters as Record<string, unknown>;
  const servicePipelines = (config.service as Record<string, unknown>).pipelines as Record<string, unknown>;

  // Processors
  processors.batch = {
    send_batch_size: parseInt(batchSize),
    timeout: timeout,
  };
  processors.memory_limiter = {
    check_interval: '1s',
    limit_mib: 400,
    spike_limit_mib: 100,
  };
  if (sampling < 1.0) {
    processors.probabilistic_sampler = {
      sampling_percentage: Math.round(sampling * 100),
    };
  }
  if (enableDebug) {
    processors.filter = {
      error_mode: 'ignore',
    };
  }

  // Exporters
  const exporterNames: string[] = [];
  if (exporters.includes('jaeger')) {
    cfgExporters.jaeger = {
      endpoint: jaegerEndpoint || 'http://jaeger:14250',
      tls: { insecure: true },
    };
    exporterNames.push('jaeger');
  }
  if (exporters.includes('zipkin')) {
    cfgExporters.zipkin = {
      endpoint: zipkinEndpoint || 'http://zipkin:9411/api/v2/spans',
    };
    exporterNames.push('zipkin');
  }
  if (exporters.includes('otlp_grpc')) {
    cfgExporters['otlp/grpc'] = {
      endpoint: otlpGrpcEndpoint || 'http://otel-collector:4317',
      tls: { insecure: true },
    };
    exporterNames.push('otlp/grpc');
  }
  if (exporters.includes('otlp_http')) {
    cfgExporters['otlp/http'] = {
      endpoint: otlpHttpEndpoint || 'http://otel-collector:4318',
    };
    exporterNames.push('otlp/http');
  }
  if (exporters.includes('prometheus')) {
    cfgExporters.prometheus = {
      endpoint: `0.0.0.0:${prometheusPort || '8889'}`,
      namespace: svcName.replace(/-/g, '_'),
    };
    exporterNames.push('prometheus');
  }
  if (exporters.includes('loki')) {
    cfgExporters.loki = {
      endpoint: lokiEndpoint || 'http://loki:3100/loki/api/v1/push',
      labels: { resource: { 'service.name': '$$service_name' } },
    };
    exporterNames.push('loki');
  }
  if (enableDebug) {
    cfgExporters.debug = { verbosity: 'detailed' };
    exporterNames.push('debug');
  }

  // Pipelines
  const processorList = ['memory_limiter', ...(sampling < 1.0 ? ['probabilistic_sampler'] : []), 'batch'];

  if (pipelines.includes('traces')) {
    const traceExporters = exporterNames.filter(e => !['prometheus', 'loki'].includes(e));
    if (traceExporters.length > 0) {
      servicePipelines.traces = {
        receivers: ['otlp'],
        processors: processorList,
        exporters: traceExporters,
      };
    }
  }
  if (pipelines.includes('metrics')) {
    const metricExporters = exporterNames.filter(e => !['jaeger', 'zipkin', 'loki'].includes(e));
    if (metricExporters.length > 0) {
      servicePipelines.metrics = {
        receivers: ['otlp'],
        processors: ['memory_limiter', 'batch'],
        exporters: metricExporters,
      };
    }
  }
  if (pipelines.includes('logs')) {
    const logExporters = exporterNames.filter(e => !['jaeger', 'zipkin', 'prometheus'].includes(e));
    if (logExporters.length > 0) {
      servicePipelines.logs = {
        receivers: ['otlp'],
        processors: ['memory_limiter', 'batch'],
        exporters: logExporters,
      };
    }
  }

  if (outputFormat === 'json') {
    return JSON.stringify(config, null, 2);
  }

  // Convert to YAML manually
  function toYaml(obj: unknown, indent = 0): string {
    const pad = '  '.repeat(indent);
    if (obj === null || obj === undefined) return 'null';
    if (typeof obj === 'boolean') return obj ? 'true' : 'false';
    if (typeof obj === 'number') return String(obj);
    if (typeof obj === 'string') {
      if (obj.includes(':') || obj.includes('#') || obj.startsWith('$')) return `"${obj}"`;
      return obj;
    }
    if (Array.isArray(obj)) {
      if (obj.length === 0) return '[]';
      return '\n' + obj.map(item => `${pad}- ${toYaml(item, indent + 1).trimStart()}`).join('\n');
    }
    if (typeof obj === 'object') {
      const entries = Object.entries(obj as Record<string, unknown>);
      if (entries.length === 0) return '{}';
      return '\n' + entries.map(([k, v]) => {
        const val = toYaml(v, indent + 1);
        if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
          return `${pad}${k}:${val}`;
        }
        if (Array.isArray(v)) {
          return `${pad}${k}:${val}`;
        }
        return `${pad}${k}: ${val}`;
      }).join('\n');
    }
    return String(obj);
  }

  const sections = ['extensions', 'receivers', 'processors', 'exporters', 'service'];
  return sections.map(s => `${s}:${toYaml((config as Record<string, unknown>)[s], 1)}`).join('\n\n');
}

export default function OpenTelemetryConfigGenerator() {
  const [pipelines, setPipelines] = useState<Pipeline[]>(['traces', 'metrics']);
  const [exporters, setExporters] = useState<Exporter[]>(['otlp_grpc']);
  const [serviceName, setServiceName] = useState('my-service');
  const [jaegerEndpoint, setJaegerEndpoint] = useState('http://jaeger:14250');
  const [zipkinEndpoint, setZipkinEndpoint] = useState('http://zipkin:9411/api/v2/spans');
  const [otlpGrpcEndpoint, setOtlpGrpcEndpoint] = useState('http://otel-collector:4317');
  const [otlpHttpEndpoint, setOtlpHttpEndpoint] = useState('http://otel-collector:4318');
  const [prometheusPort, setPrometheusPort] = useState('8889');
  const [lokiEndpoint, setLokiEndpoint] = useState('http://loki:3100/loki/api/v1/push');
  const [batchTimeout, setBatchTimeout] = useState('5s');
  const [maxExportBatch, setMaxExportBatch] = useState('512');
  const [samplingRate, setSamplingRate] = useState('1.0');
  const [enableDebug, setEnableDebug] = useState(false);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('yaml');
  const [copied, setCopied] = useState(false);

  const togglePipeline = (p: Pipeline) => {
    setPipelines(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };
  const toggleExporter = (e: Exporter) => {
    setExporters(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e]);
  };

  const config = generateOtelConfig({
    pipelines, exporters, serviceName, jaegerEndpoint, zipkinEndpoint,
    otlpGrpcEndpoint, otlpHttpEndpoint, prometheusPort, lokiEndpoint,
    batchTimeout, maxExportBatch, samplingRate, enableDebug, outputFormat,
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(config);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inputClass = 'w-full border border-border rounded px-3 py-2 bg-bg text-text text-sm focus:outline-none focus:border-primary';
  const labelClass = 'block text-sm font-medium mb-1 text-text-muted';
  const sectionClass = 'mb-6';

  return (
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left: Options */}
      <div>
        <div class={sectionClass}>
          <label class={labelClass}>Service Name</label>
          <input class={inputClass} value={serviceName} onInput={e => setServiceName((e.target as HTMLInputElement).value)} placeholder="my-service" />
        </div>

        <div class={sectionClass}>
          <label class={labelClass}>Pipelines</label>
          <div class="flex flex-wrap gap-2">
            {(Object.keys(PIPELINE_LABELS) as Pipeline[]).map(p => (
              <button
                key={p}
                onClick={() => togglePipeline(p)}
                class={`px-3 py-1.5 rounded text-sm border transition-colors ${pipelines.includes(p) ? 'bg-primary text-white border-primary' : 'border-border text-text-muted hover:border-primary'}`}
              >
                {PIPELINE_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        <div class={sectionClass}>
          <label class={labelClass}>Exporters</label>
          <div class="flex flex-wrap gap-2">
            {(Object.keys(EXPORTER_LABELS) as Exporter[]).map(e => (
              <button
                key={e}
                onClick={() => toggleExporter(e)}
                class={`px-3 py-1.5 rounded text-sm border transition-colors ${exporters.includes(e) ? 'bg-primary text-white border-primary' : 'border-border text-text-muted hover:border-primary'}`}
              >
                {EXPORTER_LABELS[e]}
              </button>
            ))}
          </div>
        </div>

        {exporters.includes('jaeger') && (
          <div class={sectionClass}>
            <label class={labelClass}>Jaeger Endpoint</label>
            <input class={inputClass} value={jaegerEndpoint} onInput={e => setJaegerEndpoint((e.target as HTMLInputElement).value)} placeholder="http://jaeger:14250" />
          </div>
        )}
        {exporters.includes('zipkin') && (
          <div class={sectionClass}>
            <label class={labelClass}>Zipkin Endpoint</label>
            <input class={inputClass} value={zipkinEndpoint} onInput={e => setZipkinEndpoint((e.target as HTMLInputElement).value)} placeholder="http://zipkin:9411/api/v2/spans" />
          </div>
        )}
        {exporters.includes('otlp_grpc') && (
          <div class={sectionClass}>
            <label class={labelClass}>OTLP gRPC Endpoint</label>
            <input class={inputClass} value={otlpGrpcEndpoint} onInput={e => setOtlpGrpcEndpoint((e.target as HTMLInputElement).value)} placeholder="http://otel-collector:4317" />
          </div>
        )}
        {exporters.includes('otlp_http') && (
          <div class={sectionClass}>
            <label class={labelClass}>OTLP HTTP Endpoint</label>
            <input class={inputClass} value={otlpHttpEndpoint} onInput={e => setOtlpHttpEndpoint((e.target as HTMLInputElement).value)} placeholder="http://otel-collector:4318" />
          </div>
        )}
        {exporters.includes('prometheus') && (
          <div class={sectionClass}>
            <label class={labelClass}>Prometheus Scrape Port</label>
            <input class={inputClass} value={prometheusPort} onInput={e => setPrometheusPort((e.target as HTMLInputElement).value)} placeholder="8889" />
          </div>
        )}
        {exporters.includes('loki') && (
          <div class={sectionClass}>
            <label class={labelClass}>Loki Endpoint</label>
            <input class={inputClass} value={lokiEndpoint} onInput={e => setLokiEndpoint((e.target as HTMLInputElement).value)} placeholder="http://loki:3100/loki/api/v1/push" />
          </div>
        )}

        <div class="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label class={labelClass}>Batch Timeout</label>
            <input class={inputClass} value={batchTimeout} onInput={e => setBatchTimeout((e.target as HTMLInputElement).value)} placeholder="5s" />
          </div>
          <div>
            <label class={labelClass}>Max Batch Size</label>
            <input class={inputClass} value={maxExportBatch} onInput={e => setMaxExportBatch((e.target as HTMLInputElement).value)} placeholder="512" />
          </div>
        </div>

        <div class={sectionClass}>
          <label class={labelClass}>Sampling Rate (0.0–1.0)</label>
          <input class={inputClass} type="number" min="0" max="1" step="0.1" value={samplingRate} onInput={e => setSamplingRate((e.target as HTMLInputElement).value)} placeholder="1.0" />
          <p class="text-xs text-text-muted mt-1">1.0 = 100% (no sampling). Below 1.0 adds probabilistic_sampler processor.</p>
        </div>

        <div class="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label class={labelClass}>Output Format</label>
            <select class={inputClass} value={outputFormat} onChange={e => setOutputFormat((e.target as HTMLSelectElement).value as OutputFormat)}>
              <option value="yaml">YAML</option>
              <option value="json">JSON</option>
            </select>
          </div>
          <div class="flex items-end pb-2">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={enableDebug} onChange={e => setEnableDebug((e.target as HTMLInputElement).checked)} class="rounded" />
              <span class="text-sm text-text-muted">Include debug exporter</span>
            </label>
          </div>
        </div>
      </div>

      {/* Right: Output */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-text-muted">otel-collector-config.{outputFormat}</span>
          <button onClick={handleCopy} class="text-sm px-3 py-1 rounded border border-border hover:border-primary transition-colors">
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <pre class="bg-code-bg border border-border rounded p-4 text-xs overflow-auto max-h-[600px] text-code-text whitespace-pre-wrap">{config}</pre>
        <p class="text-xs text-text-muted mt-2">
          Uses OpenTelemetry Collector v0.90+. OTLP receiver on gRPC :4317, HTTP :4318.
        </p>
      </div>
    </div>
  );
}
