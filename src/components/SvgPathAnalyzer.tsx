import { useState, useRef, useEffect } from 'preact/hooks';

interface PathCommand {
  command: string;
  absolute: boolean;
  args: number[];
  description: string;
  index: number;
}

interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

const SAMPLE_PATH = 'M 10 80 C 40 10, 65 10, 95 80 S 150 150, 180 80';

const COMMAND_INFO: Record<string, string> = {
  M: 'Move To (absolute) — move pen without drawing',
  m: 'Move To (relative) — move pen without drawing',
  L: 'Line To (absolute) — draw straight line',
  l: 'Line To (relative) — draw straight line',
  H: 'Horizontal Line (absolute)',
  h: 'Horizontal Line (relative)',
  V: 'Vertical Line (absolute)',
  v: 'Vertical Line (relative)',
  C: 'Cubic Bézier (absolute) — two control points',
  c: 'Cubic Bézier (relative) — two control points',
  S: 'Smooth Cubic Bézier (absolute) — one control point',
  s: 'Smooth Cubic Bézier (relative) — one control point',
  Q: 'Quadratic Bézier (absolute) — one control point',
  q: 'Quadratic Bézier (relative) — one control point',
  T: 'Smooth Quadratic Bézier (absolute)',
  t: 'Smooth Quadratic Bézier (relative)',
  A: 'Arc (absolute) — elliptical arc',
  a: 'Arc (relative) — elliptical arc',
  Z: 'Close Path — straight line back to start',
  z: 'Close Path — straight line back to start',
};

function parsePathCommands(d: string): PathCommand[] {
  const commands: PathCommand[] = [];
  const regex = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g;
  let match;
  let index = 0;

  while ((match = regex.exec(d)) !== null) {
    const cmd = match[1];
    const argsStr = match[2].trim();
    const args = argsStr
      ? argsStr.split(/[\s,]+/).filter(Boolean).map(Number).filter(n => !isNaN(n))
      : [];

    commands.push({
      command: cmd,
      absolute: cmd === cmd.toUpperCase(),
      args,
      description: COMMAND_INFO[cmd] || 'Unknown command',
      index: index++,
    });
  }

  return commands;
}

function computeBoundingBox(d: string): BoundingBox | null {
  try {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.position = 'absolute';
    svg.style.visibility = 'hidden';
    svg.style.width = '0';
    svg.style.height = '0';
    document.body.appendChild(svg);

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    svg.appendChild(path);

    const bbox = path.getBBox();
    document.body.removeChild(svg);

    return {
      minX: Math.round(bbox.x * 100) / 100,
      minY: Math.round(bbox.y * 100) / 100,
      maxX: Math.round((bbox.x + bbox.width) * 100) / 100,
      maxY: Math.round((bbox.y + bbox.height) * 100) / 100,
      width: Math.round(bbox.width * 100) / 100,
      height: Math.round(bbox.height * 100) / 100,
    };
  } catch {
    return null;
  }
}

function formatArgs(cmd: string, args: number[]): string {
  const upper = cmd.toUpperCase();
  if (upper === 'Z') return '';
  if (upper === 'A') {
    // rx ry x-rotation large-arc-flag sweep-flag x y
    const parts = [];
    for (let i = 0; i < args.length; i += 7) {
      parts.push(`rx=${args[i]} ry=${args[i+1]} rot=${args[i+2]} large=${args[i+3]} sweep=${args[i+4]} x=${args[i+5]} y=${args[i+6]}`);
    }
    return parts.join(' | ');
  }
  if (upper === 'C') {
    const parts = [];
    for (let i = 0; i < args.length; i += 6) {
      parts.push(`cp1(${args[i]},${args[i+1]}) cp2(${args[i+2]},${args[i+3]}) end(${args[i+4]},${args[i+5]})`);
    }
    return parts.join(' | ');
  }
  if (upper === 'S' || upper === 'Q') {
    const parts = [];
    for (let i = 0; i < args.length; i += 4) {
      parts.push(`cp(${args[i]},${args[i+1]}) end(${args[i+2]},${args[i+3]})`);
    }
    return parts.join(' | ');
  }
  if (upper === 'M' || upper === 'L' || upper === 'T') {
    const parts = [];
    for (let i = 0; i < args.length; i += 2) {
      parts.push(`(${args[i]},${args[i+1]})`);
    }
    return parts.join(' → ');
  }
  return args.join(', ');
}

const CMD_COLOR: Record<string, string> = {
  M: 'text-blue-400', m: 'text-blue-400',
  L: 'text-green-400', l: 'text-green-400',
  H: 'text-green-300', h: 'text-green-300',
  V: 'text-green-300', v: 'text-green-300',
  C: 'text-purple-400', c: 'text-purple-400',
  S: 'text-purple-300', s: 'text-purple-300',
  Q: 'text-indigo-400', q: 'text-indigo-400',
  T: 'text-indigo-300', t: 'text-indigo-300',
  A: 'text-orange-400', a: 'text-orange-400',
  Z: 'text-red-400', z: 'text-red-400',
};

export default function SvgPathAnalyzer() {
  const [input, setInput] = useState(SAMPLE_PATH);
  const [commands, setCommands] = useState<PathCommand[]>([]);
  const [bbox, setBbox] = useState<BoundingBox | null>(null);
  const [error, setError] = useState('');
  const [analyzed, setAnalyzed] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);

  function analyze() {
    setError('');
    try {
      const cmds = parsePathCommands(input.trim());
      if (cmds.length === 0) {
        setError('No valid path commands found.');
        return;
      }
      setCommands(cmds);
      setBbox(computeBoundingBox(input.trim()));
      setAnalyzed(true);
      setSelected(null);
    } catch (e: any) {
      setError(e.message || 'Invalid path data');
    }
  }

  // Compute viewBox for preview
  const viewBoxPad = 20;
  const vb = bbox
    ? `${bbox.minX - viewBoxPad} ${bbox.minY - viewBoxPad} ${bbox.width + viewBoxPad * 2} ${bbox.height + viewBoxPad * 2}`
    : '0 0 200 200';

  const cmdCounts = commands.reduce((acc, c) => {
    acc[c.command.toUpperCase()] = (acc[c.command.toUpperCase()] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium mb-1">SVG Path Data (d attribute)</label>
        <div class="flex gap-2">
          <input
            type="text"
            class="flex-1 font-mono text-sm bg-surface border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-accent"
            value={input}
            onInput={(e) => setInput((e.target as HTMLInputElement).value)}
            placeholder="M 10 10 L 100 100 Z"
          />
          <button
            onClick={analyze}
            class="bg-accent hover:bg-accent/90 text-white font-semibold py-2 px-4 rounded-lg transition-colors shrink-0"
          >
            Analyze
          </button>
          <button
            onClick={() => { setInput(SAMPLE_PATH); setAnalyzed(false); setCommands([]); }}
            class="px-3 py-2 border border-border rounded-lg text-sm hover:bg-surface transition-colors shrink-0"
          >
            Sample
          </button>
        </div>
        {error && <p class="text-red-400 text-sm mt-1">{error}</p>}
      </div>

      {analyzed && commands.length > 0 && (
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Preview */}
          <div>
            <div class="text-sm font-medium mb-2">Path Preview</div>
            <div class="bg-surface border border-border rounded-lg p-4 flex items-center justify-center" style={{ minHeight: '220px' }}>
              <svg
                viewBox={vb}
                class="w-full max-h-52"
                style={{ maxWidth: '100%' }}
              >
                <path d={input} fill="rgba(99,102,241,0.15)" stroke="rgb(99,102,241)" stroke-width="2" />
              </svg>
            </div>

            {/* Bounding box info */}
            {bbox && (
              <div class="mt-3 bg-surface border border-border rounded-lg p-3 text-sm">
                <div class="font-medium mb-2">Bounding Box</div>
                <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-text-muted font-mono text-xs">
                  <span>Width: <span class="text-text">{bbox.width}</span></span>
                  <span>Height: <span class="text-text">{bbox.height}</span></span>
                  <span>Min X: <span class="text-text">{bbox.minX}</span></span>
                  <span>Min Y: <span class="text-text">{bbox.minY}</span></span>
                  <span>Max X: <span class="text-text">{bbox.maxX}</span></span>
                  <span>Max Y: <span class="text-text">{bbox.maxY}</span></span>
                </div>
              </div>
            )}

            {/* Command summary */}
            <div class="mt-3 bg-surface border border-border rounded-lg p-3 text-sm">
              <div class="font-medium mb-2">Command Summary ({commands.length} total)</div>
              <div class="flex flex-wrap gap-2">
                {Object.entries(cmdCounts).map(([cmd, count]) => (
                  <span key={cmd} class={`font-mono font-bold text-xs px-2 py-0.5 rounded bg-surface-alt border border-border ${CMD_COLOR[cmd] || 'text-text'}`}>
                    {cmd} ×{count}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Command breakdown */}
          <div>
            <div class="text-sm font-medium mb-2">Command Breakdown</div>
            <div class="space-y-1 max-h-[380px] overflow-y-auto">
              {commands.map((cmd, i) => (
                <div
                  key={i}
                  onClick={() => setSelected(selected === i ? null : i)}
                  class={`rounded-lg p-2.5 cursor-pointer border transition-colors ${
                    selected === i
                      ? 'bg-accent/10 border-accent/50'
                      : 'bg-surface border-border hover:border-border-muted'
                  }`}
                >
                  <div class="flex items-center gap-2">
                    <span class={`font-mono font-bold text-lg w-6 shrink-0 ${CMD_COLOR[cmd.command] || 'text-text'}`}>
                      {cmd.command}
                    </span>
                    <div class="min-w-0 flex-1">
                      <div class="text-xs text-text-muted">{cmd.description}</div>
                      {cmd.args.length > 0 && (
                        <div class="font-mono text-xs text-text mt-0.5 truncate">
                          {formatArgs(cmd.command, cmd.args)}
                        </div>
                      )}
                    </div>
                    <span class="text-xs text-text-muted shrink-0">#{i + 1}</span>
                  </div>
                  {selected === i && cmd.args.length > 0 && (
                    <div class="mt-2 pt-2 border-t border-border font-mono text-xs text-text-muted">
                      Raw args: [{cmd.args.join(', ')}]
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
