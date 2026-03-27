import { useState, useEffect, useRef, useMemo } from 'preact/hooks';

type ChartType = 'bar' | 'line' | 'pie' | 'scatter' | 'area';

interface DataPoint {
  label: string;
  value: number;
}

const CHART_TYPES: { id: ChartType; label: string; icon: string }[] = [
  { id: 'bar', label: 'Bar', icon: '▊' },
  { id: 'line', label: 'Line', icon: '📈' },
  { id: 'area', label: 'Area', icon: '◭' },
  { id: 'pie', label: 'Pie', icon: '⬤' },
  { id: 'scatter', label: 'Scatter', icon: '⁘' },
];

const DEFAULT_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];

const DEFAULT_DATA: DataPoint[] = [
  { label: 'Jan', value: 42 },
  { label: 'Feb', value: 68 },
  { label: 'Mar', value: 55 },
  { label: 'Apr', value: 84 },
  { label: 'May', value: 73 },
  { label: 'Jun', value: 91 },
];

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }}
      class={`text-xs px-3 py-1.5 rounded font-medium transition-colors ${copied ? 'bg-green-700 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}

// SVG preview renderer (no D3 dependency)
function ChartPreview({ type, data, color, title }: { type: ChartType; data: DataPoint[]; color: string; title: string }) {
  const W = 480, H = 260, pad = { top: 30, right: 20, bottom: 40, left: 50 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const n = data.length;

  if (type === 'pie') {
    const cx = W / 2, cy = H / 2, r = Math.min(innerW, innerH) / 2 - 10;
    const total = data.reduce((s, d) => s + d.value, 0);
    let angle = -Math.PI / 2;
    const slices = data.map((d, i) => {
      const sweep = (d.value / total) * 2 * Math.PI;
      const x1 = cx + r * Math.cos(angle);
      const y1 = cy + r * Math.sin(angle);
      angle += sweep;
      const x2 = cx + r * Math.cos(angle);
      const y2 = cy + r * Math.sin(angle);
      const large = sweep > Math.PI ? 1 : 0;
      return { path: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`, color: DEFAULT_COLORS[i % DEFAULT_COLORS.length], label: d.label };
    });
    return (
      <svg viewBox={`0 0 ${W} ${H}`} class="w-full rounded-lg bg-gray-900">
        {title && <text x={W / 2} y={18} text-anchor="middle" fill="#9ca3af" font-size="12">{title}</text>}
        {slices.map((s, i) => <path key={i} d={s.path} fill={s.color} opacity="0.85" stroke="#1f2937" stroke-width="1" />)}
      </svg>
    );
  }

  if (type === 'scatter') {
    const points = data.map((d, i) => ({
      cx: pad.left + (i / (n - 1 || 1)) * innerW,
      cy: pad.top + innerH - (d.value / maxVal) * innerH,
      label: d.label,
    }));
    return (
      <svg viewBox={`0 0 ${W} ${H}`} class="w-full rounded-lg bg-gray-900">
        {title && <text x={W / 2} y={18} text-anchor="middle" fill="#9ca3af" font-size="12">{title}</text>}
        <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + innerH} stroke="#374151" stroke-width="1" />
        <line x1={pad.left} y1={pad.top + innerH} x2={pad.left + innerW} y2={pad.top + innerH} stroke="#374151" stroke-width="1" />
        {points.map((p, i) => (
          <circle key={i} cx={p.cx} cy={p.cy} r={6} fill={color} opacity="0.8" stroke={color} stroke-width="1.5" />
        ))}
        {points.map((p, i) => (
          <text key={i} x={p.cx} y={pad.top + innerH + 16} text-anchor="middle" fill="#6b7280" font-size="10">{p.label}</text>
        ))}
      </svg>
    );
  }

  if (type === 'line' || type === 'area') {
    const points = data.map((d, i) => ({
      x: pad.left + (i / (n - 1 || 1)) * innerW,
      y: pad.top + innerH - (d.value / maxVal) * innerH,
    }));
    const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');
    const areaPath = `M ${points[0].x} ${pad.top + innerH} ` + points.map((p) => `L ${p.x} ${p.y}`).join(' ') + ` L ${points[points.length - 1].x} ${pad.top + innerH} Z`;
    return (
      <svg viewBox={`0 0 ${W} ${H}`} class="w-full rounded-lg bg-gray-900">
        {title && <text x={W / 2} y={18} text-anchor="middle" fill="#9ca3af" font-size="12">{title}</text>}
        <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + innerH} stroke="#374151" stroke-width="1" />
        <line x1={pad.left} y1={pad.top + innerH} x2={pad.left + innerW} y2={pad.top + innerH} stroke="#374151" stroke-width="1" />
        {type === 'area' && <path d={areaPath} fill={color} opacity="0.2" />}
        <polyline points={polyline} fill="none" stroke={color} stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={4} fill={color} />
        ))}
        {data.map((d, i) => (
          <text key={i} x={points[i].x} y={pad.top + innerH + 16} text-anchor="middle" fill="#6b7280" font-size="10">{d.label}</text>
        ))}
      </svg>
    );
  }

  // Bar chart
  const barW = Math.min(40, (innerW / n) * 0.6);
  const barSpacing = innerW / n;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} class="w-full rounded-lg bg-gray-900">
      {title && <text x={W / 2} y={18} text-anchor="middle" fill="#9ca3af" font-size="12">{title}</text>}
      <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + innerH} stroke="#374151" stroke-width="1" />
      <line x1={pad.left} y1={pad.top + innerH} x2={pad.left + innerW} y2={pad.top + innerH} stroke="#374151" stroke-width="1" />
      {data.map((d, i) => {
        const bh = (d.value / maxVal) * innerH;
        const bx = pad.left + i * barSpacing + (barSpacing - barW) / 2;
        const by = pad.top + innerH - bh;
        return (
          <g key={i}>
            <rect x={bx} y={by} width={barW} height={bh} fill={color} rx="2" opacity="0.85" />
            <text x={bx + barW / 2} y={pad.top + innerH + 16} text-anchor="middle" fill="#6b7280" font-size="10">{d.label}</text>
            <text x={bx + barW / 2} y={by - 4} text-anchor="middle" fill="#9ca3af" font-size="9">{d.value}</text>
          </g>
        );
      })}
    </svg>
  );
}

function generateD3Code(type: ChartType, data: DataPoint[], color: string, title: string, xLabel: string, yLabel: string): string {
  const dataStr = JSON.stringify(data.map((d) => ({ label: d.label, value: d.value })));

  const base = `// D3.js v7 — Install: npm install d3
// Or CDN: <script src="https://cdn.jsdelivr.net/npm/d3@7"></script>
import * as d3 from 'd3';

const data = ${dataStr};

const margin = { top: 40, right: 30, bottom: 50, left: 60 };
const width = 600 - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;

const svg = d3.select('#chart')
  .append('svg')
  .attr('width', width + margin.left + margin.right)
  .attr('height', height + margin.top + margin.bottom)
  .append('g')
  .attr('transform', \`translate(\${margin.left},\${margin.top})\`);
${title ? `\nsvg.append('text')\n  .attr('x', width / 2)\n  .attr('y', -10)\n  .attr('text-anchor', 'middle')\n  .style('font-size', '14px')\n  .text('${title}');` : ''}`;

  if (type === 'pie') {
    return `${base}

const radius = Math.min(width, height) / 2;
const color = d3.scaleOrdinal(d3.schemeTableau10);
const pie = d3.pie().value(d => d.value);
const arc = d3.arc().innerRadius(0).outerRadius(radius);

const g = svg.append('g')
  .attr('transform', \`translate(\${width/2},\${height/2})\`);

g.selectAll('path')
  .data(pie(data))
  .join('path')
  .attr('d', arc)
  .attr('fill', d => color(d.data.label))
  .attr('stroke', 'white')
  .attr('stroke-width', 1.5);

// Legend
const legend = svg.selectAll('.legend')
  .data(data)
  .join('g')
  .attr('class', 'legend')
  .attr('transform', (d, i) => \`translate(\${width + 10}, \${i * 20})\`);

legend.append('rect').attr('width', 12).attr('height', 12).attr('fill', (d, i) => color(d.label));
legend.append('text').attr('x', 16).attr('y', 10).style('font-size', '12px').text(d => d.label);`;
  }

  if (type === 'scatter') {
    return `${base}

const x = d3.scalePoint()
  .domain(data.map(d => d.label))
  .range([0, width])
  .padding(0.5);

const y = d3.scaleLinear()
  .domain([0, d3.max(data, d => d.value) * 1.1])
  .range([height, 0]);

// Axes
svg.append('g').attr('transform', \`translate(0,\${height})\`).call(d3.axisBottom(x));
svg.append('g').call(d3.axisLeft(y));
${xLabel ? `svg.append('text').attr('x', width/2).attr('y', height + 40).attr('text-anchor','middle').text('${xLabel}');` : ''}
${yLabel ? `svg.append('text').attr('transform','rotate(-90)').attr('y',-45).attr('x',-height/2).attr('text-anchor','middle').text('${yLabel}');` : ''}

// Dots
svg.selectAll('circle')
  .data(data)
  .join('circle')
  .attr('cx', d => x(d.label))
  .attr('cy', d => y(d.value))
  .attr('r', 7)
  .attr('fill', '${color}')
  .attr('opacity', 0.8);`;
  }

  if (type === 'line' || type === 'area') {
    const areaCode = type === 'area' ? `
const area = d3.area()
  .x((d, i) => x(i))
  .y0(height)
  .y1(d => y(d.value));

svg.append('path')
  .datum(data)
  .attr('fill', '${color}')
  .attr('opacity', 0.2)
  .attr('d', area);` : '';

    return `${base}

const x = d3.scaleLinear().domain([0, data.length - 1]).range([0, width]);
const y = d3.scaleLinear()
  .domain([0, d3.max(data, d => d.value) * 1.1])
  .range([height, 0]);

// Axes
const xAxis = svg.append('g').attr('transform', \`translate(0,\${height})\`)
  .call(d3.axisBottom(x).ticks(data.length).tickFormat((d, i) => data[i]?.label || d));
svg.append('g').call(d3.axisLeft(y));
${xLabel ? `svg.append('text').attr('x', width/2).attr('y', height + 40).attr('text-anchor','middle').text('${xLabel}');` : ''}
${yLabel ? `svg.append('text').attr('transform','rotate(-90)').attr('y',-45).attr('x',-height/2).attr('text-anchor','middle').text('${yLabel}');` : ''}
${areaCode}
// Line
const line = d3.line()
  .x((d, i) => x(i))
  .y(d => y(d.value))
  .curve(d3.curveMonotoneX);

svg.append('path')
  .datum(data)
  .attr('fill', 'none')
  .attr('stroke', '${color}')
  .attr('stroke-width', 2.5)
  .attr('d', line);

// Dots
svg.selectAll('circle')
  .data(data)
  .join('circle')
  .attr('cx', (d, i) => x(i))
  .attr('cy', d => y(d.value))
  .attr('r', 5)
  .attr('fill', '${color}');`;
  }

  // Bar
  return `${base}

const x = d3.scaleBand()
  .domain(data.map(d => d.label))
  .range([0, width])
  .padding(0.2);

const y = d3.scaleLinear()
  .domain([0, d3.max(data, d => d.value) * 1.1])
  .range([height, 0]);

// Axes
svg.append('g').attr('transform', \`translate(0,\${height})\`).call(d3.axisBottom(x));
svg.append('g').call(d3.axisLeft(y));
${xLabel ? `svg.append('text').attr('x', width/2).attr('y', height + 40).attr('text-anchor','middle').text('${xLabel}');` : ''}
${yLabel ? `svg.append('text').attr('transform','rotate(-90)').attr('y',-45).attr('x',-height/2).attr('text-anchor','middle').text('${yLabel}');` : ''}

// Bars
svg.selectAll('rect')
  .data(data)
  .join('rect')
  .attr('x', d => x(d.label))
  .attr('y', d => y(d.value))
  .attr('width', x.bandwidth())
  .attr('height', d => height - y(d.value))
  .attr('fill', '${color}')
  .attr('rx', 3);`;
}

export default function D3ChartGenerator() {
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [title, setTitle] = useState('Monthly Sales');
  const [xLabel, setXLabel] = useState('Month');
  const [yLabel, setYLabel] = useState('Value');
  const [color, setColor] = useState(DEFAULT_COLORS[0]);
  const [rawData, setRawData] = useState(DEFAULT_DATA.map((d) => `${d.label},${d.value}`).join('\n'));
  const [dataError, setDataError] = useState('');

  const parsedData = useMemo((): DataPoint[] => {
    try {
      const lines = rawData.trim().split('\n').filter(Boolean);
      const result: DataPoint[] = [];
      for (const line of lines) {
        // Try JSON array
        if (line.startsWith('[') || line.startsWith('{')) {
          const parsed = JSON.parse(rawData);
          return (Array.isArray(parsed) ? parsed : [parsed]).map((d: any) => ({
            label: String(d.label || d.name || d.x || ''),
            value: Number(d.value || d.y || d.count || 0),
          }));
        }
        const parts = line.split(',');
        if (parts.length >= 2) {
          result.push({ label: parts[0].trim(), value: parseFloat(parts[1].trim()) || 0 });
        }
      }
      setDataError('');
      return result.length > 0 ? result : DEFAULT_DATA;
    } catch {
      setDataError('Invalid format. Use: label,value per line');
      return DEFAULT_DATA;
    }
  }, [rawData]);

  const code = useMemo(
    () => generateD3Code(chartType, parsedData, color, title, xLabel, yLabel),
    [chartType, parsedData, color, title, xLabel, yLabel],
  );

  return (
    <div class="space-y-5">
      {/* Chart type */}
      <div class="bg-bg-card border border-border rounded-xl p-4 space-y-3">
        <div class="text-sm font-semibold text-text">Chart Type</div>
        <div class="flex flex-wrap gap-2">
          {CHART_TYPES.map((ct) => (
            <button
              key={ct.id}
              onClick={() => setChartType(ct.id)}
              class={`px-4 py-2 rounded-lg border text-sm transition-colors ${
                chartType === ct.id
                  ? 'bg-primary/20 border-primary text-primary'
                  : 'bg-bg border-border text-text-muted hover:border-border-hover hover:text-text'
              }`}
            >
              <span class="mr-1.5">{ct.icon}</span>{ct.label}
            </button>
          ))}
        </div>
      </div>

      {/* Config */}
      <div class="bg-bg-card border border-border rounded-xl p-4 space-y-4">
        <div class="text-sm font-semibold text-text">Configuration</div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label class="text-xs text-text-muted mb-1 block">Title</label>
            <input type="text" value={title} onInput={(e: any) => setTitle(e.target.value)}
              class="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-primary" spellcheck={false} />
          </div>
          <div>
            <label class="text-xs text-text-muted mb-1 block">X Label</label>
            <input type="text" value={xLabel} onInput={(e: any) => setXLabel(e.target.value)}
              class="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-primary" spellcheck={false} />
          </div>
          <div>
            <label class="text-xs text-text-muted mb-1 block">Y Label</label>
            <input type="text" value={yLabel} onInput={(e: any) => setYLabel(e.target.value)}
              class="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-primary" spellcheck={false} />
          </div>
          <div>
            <label class="text-xs text-text-muted mb-1 block">Color</label>
            <div class="flex gap-1.5 flex-wrap">
              {DEFAULT_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  class={`w-6 h-6 rounded-full transition-transform ${color === c ? 'ring-2 ring-white scale-110' : ''}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Data input */}
      <div class="bg-bg-card border border-border rounded-xl p-4 space-y-2">
        <div class="flex items-center justify-between">
          <div class="text-sm font-semibold text-text">Data</div>
          <span class="text-xs text-text-muted">Format: label,value (one per line) or JSON array</span>
        </div>
        <textarea
          value={rawData}
          onInput={(e: any) => setRawData(e.target.value)}
          rows={6}
          class="w-full bg-bg border border-border rounded-lg px-3 py-2 font-mono text-sm focus:outline-none focus:border-primary resize-y"
          spellcheck={false}
        />
        {dataError && <div class="text-red-400 text-xs">{dataError}</div>}
      </div>

      {/* Preview */}
      <div class="bg-bg-card border border-border rounded-xl p-4 space-y-3">
        <div class="text-sm font-semibold text-text">Preview</div>
        <ChartPreview type={chartType} data={parsedData} color={color} title={title} />
      </div>

      {/* Generated code */}
      <div class="bg-bg-card border border-border rounded-xl overflow-hidden">
        <div class="flex items-center justify-between px-4 py-2.5 border-b border-border bg-bg">
          <span class="text-xs font-mono text-text-muted">D3.js v7 — chart.js</span>
          <CopyButton value={code} />
        </div>
        <pre class="p-4 text-xs font-mono text-green-300 overflow-x-auto whitespace-pre max-h-96">{code}</pre>
      </div>

      <div class="bg-blue-950/30 border border-blue-800/40 rounded-xl p-4 text-sm text-blue-300/80">
        <strong class="text-blue-300">Usage:</strong> Add <code class="font-mono text-xs bg-blue-950/50 px-1 rounded">&lt;div id="chart"&gt;&lt;/div&gt;</code> to your HTML,
        then paste the generated code. Install D3 with <code class="font-mono text-xs bg-blue-950/50 px-1 rounded">npm install d3</code> or use the CDN script tag shown in the comment.
      </div>
    </div>
  );
}
