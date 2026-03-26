import { useState, useCallback, useRef, useEffect } from 'preact/hooks';

// SVG Path command types
type PathCommand = {
  type: string;
  args: number[];
  absolute: boolean;
};

function parsePath(d: string): PathCommand[] {
  const commands: PathCommand[] = [];
  const re = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g;
  let match;
  while ((match = re.exec(d)) !== null) {
    const type = match[1];
    const argsStr = match[2].trim();
    const args = argsStr ? argsStr.split(/[\s,]+/).filter(Boolean).map(Number) : [];
    commands.push({ type, args, absolute: type === type.toUpperCase() });
  }
  return commands;
}

function serializePath(commands: PathCommand[]): string {
  return commands.map(cmd => {
    if (cmd.type.toUpperCase() === 'Z') return cmd.type;
    return `${cmd.type} ${cmd.args.join(' ')}`;
  }).join(' ');
}

type Point = { x: number; y: number };

function getAbsolutePoints(commands: PathCommand[]): { points: (Point & { cmdIndex: number; argIndex: number })[] } {
  const points: (Point & { cmdIndex: number; argIndex: number })[] = [];
  let cx = 0, cy = 0;

  commands.forEach((cmd, cmdIndex) => {
    const t = cmd.type.toUpperCase();
    const abs = cmd.absolute;
    const args = cmd.args;

    if (t === 'M' || t === 'L') {
      for (let i = 0; i < args.length; i += 2) {
        const x = abs ? args[i] : cx + args[i];
        const y = abs ? args[i + 1] : cy + args[i + 1];
        points.push({ x, y, cmdIndex, argIndex: i });
        cx = x; cy = y;
      }
    } else if (t === 'H') {
      args.forEach((val, i) => {
        const x = abs ? val : cx + val;
        points.push({ x, y: cy, cmdIndex, argIndex: i });
        cx = x;
      });
    } else if (t === 'V') {
      args.forEach((val, i) => {
        const y = abs ? val : cy + val;
        points.push({ x: cx, y, cmdIndex, argIndex: i });
        cy = y;
      });
    } else if (t === 'C') {
      for (let i = 0; i < args.length; i += 6) {
        const x1 = abs ? args[i] : cx + args[i];
        const y1 = abs ? args[i + 1] : cy + args[i + 1];
        const x2 = abs ? args[i + 2] : cx + args[i + 2];
        const y2 = abs ? args[i + 3] : cy + args[i + 3];
        const x = abs ? args[i + 4] : cx + args[i + 4];
        const y = abs ? args[i + 5] : cy + args[i + 5];
        points.push({ x: x1, y: y1, cmdIndex, argIndex: i });
        points.push({ x: x2, y: y2, cmdIndex, argIndex: i + 2 });
        points.push({ x, y, cmdIndex, argIndex: i + 4 });
        cx = x; cy = y;
      }
    } else if (t === 'Q') {
      for (let i = 0; i < args.length; i += 4) {
        const x1 = abs ? args[i] : cx + args[i];
        const y1 = abs ? args[i + 1] : cy + args[i + 1];
        const x = abs ? args[i + 2] : cx + args[i + 2];
        const y = abs ? args[i + 3] : cy + args[i + 3];
        points.push({ x: x1, y: y1, cmdIndex, argIndex: i });
        points.push({ x, y, cmdIndex, argIndex: i + 2 });
        cx = x; cy = y;
      }
    }
  });
  return { points };
}

const SAMPLE_PATH = 'M 50 100 C 50 50 150 50 150 100 S 250 150 250 100';

const PRESETS = [
  { label: 'Curve (C)', value: 'M 50 100 C 50 50 150 50 150 100 S 250 150 250 100' },
  { label: 'Heart', value: 'M 150 80 C 150 60 120 40 100 60 C 80 80 80 100 100 120 L 150 160 L 200 120 C 220 100 220 80 200 60 C 180 40 150 60 150 80 Z' },
  { label: 'Arrow', value: 'M 20 100 L 120 100 L 100 80 M 120 100 L 100 120' },
  { label: 'Triangle', value: 'M 150 30 L 280 200 L 20 200 Z' },
  { label: 'Star', value: 'M 150 20 L 179 105 L 270 105 L 197 161 L 223 245 L 150 195 L 77 245 L 103 161 L 30 105 L 121 105 Z' },
];

export default function SvgPathEditor() {
  const [pathD, setPathD] = useState(SAMPLE_PATH);
  const [inputD, setInputD] = useState(SAMPLE_PATH);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [svgColor, setSvgColor] = useState('#6366f1');
  const [showGrid, setShowGrid] = useState(true);
  const [dragging, setDragging] = useState<null | { ptIdx: number }>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const commands = parsePath(pathD);
  const { points } = getAbsolutePoints(commands);

  const VIEWBOX = '0 0 300 300';

  const handleInputChange = (val: string) => {
    setInputD(val);
    try {
      const cmds = parsePath(val);
      if (cmds.length === 0 && val.trim() !== '') throw new Error('Invalid path');
      setPathD(val);
      setError('');
    } catch {
      setError('Invalid SVG path d attribute');
    }
  };

  const handleMouseDown = (ptIdx: number, e: MouseEvent) => {
    e.preventDefault();
    setDragging({ ptIdx });
  };

  const getSvgCoords = (e: MouseEvent): Point => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const scaleX = 300 / rect.width;
    const scaleY = 300 / rect.height;
    return {
      x: Math.round((e.clientX - rect.left) * scaleX),
      y: Math.round((e.clientY - rect.top) * scaleY),
    };
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging) return;
    const { x, y } = getSvgCoords(e);
    const pt = points[dragging.ptIdx];
    if (!pt) return;

    const newCmds = commands.map((cmd, ci) => {
      if (ci !== pt.cmdIndex) return cmd;
      const newArgs = [...cmd.args];
      const t = cmd.type.toUpperCase();
      if (t === 'H') {
        newArgs[pt.argIndex] = pt.absolute ? x : x - (points[dragging.ptIdx - 1]?.x ?? 0);
      } else if (t === 'V') {
        newArgs[pt.argIndex] = pt.absolute ? y : y - (points[dragging.ptIdx - 1]?.y ?? 0);
      } else {
        newArgs[pt.argIndex] = cmd.absolute ? x : x - (points[dragging.ptIdx > 0 ? dragging.ptIdx - 1 : 0]?.x ?? 0);
        newArgs[pt.argIndex + 1] = cmd.absolute ? y : y - (points[dragging.ptIdx > 0 ? dragging.ptIdx - 1 : 0]?.y ?? 0);
      }
      return { ...cmd, args: newArgs };
    });

    const newD = serializePath(newCmds);
    setPathD(newD);
    setInputD(newD);
    setError('');
  }, [dragging, points, commands]);

  const handleMouseUp = useCallback(() => setDragging(null), []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove as EventListener);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove as EventListener);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  const handleCopy = () => {
    navigator.clipboard.writeText(pathD);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div class="space-y-4">
      {/* Presets */}
      <div class="flex flex-wrap gap-2">
        {PRESETS.map(p => (
          <button
            key={p.label}
            onClick={() => { setPathD(p.value); setInputD(p.value); setError(''); }}
            class="px-3 py-1 text-xs bg-surface border border-border rounded hover:border-accent transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* SVG Canvas */}
        <div class="bg-surface border border-border rounded-lg p-3">
          <div class="flex items-center justify-between mb-2 text-xs text-text-muted">
            <span>Canvas (drag points)</span>
            <label class="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={showGrid} onChange={e => setShowGrid((e.target as HTMLInputElement).checked)} class="w-3 h-3" />
              Grid
            </label>
          </div>
          <svg
            ref={svgRef}
            viewBox={VIEWBOX}
            class="w-full aspect-square bg-background rounded border border-border cursor-crosshair"
            style={{ userSelect: 'none' }}
          >
            {showGrid && (
              <g stroke="currentColor" class="text-border opacity-40" strokeWidth="0.5">
                {[50, 100, 150, 200, 250].map(v => (
                  <>
                    <line key={`h${v}`} x1="0" y1={v} x2="300" y2={v} />
                    <line key={`v${v}`} x1={v} y1="0" x2={v} y2="300" />
                  </>
                ))}
              </g>
            )}
            {/* Path */}
            {!error && (
              <path
                d={pathD}
                fill="none"
                stroke={svgColor}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            {/* Control lines */}
            {!error && points.length > 1 && points.map((pt, i) => {
              const prev = points[i - 1];
              if (!prev) return null;
              const cmd = commands[pt.cmdIndex];
              const t = cmd?.type.toUpperCase();
              if (t === 'C' || t === 'Q') {
                return <line key={`cl${i}`} x1={prev.x} y1={prev.y} x2={pt.x} y2={pt.y} stroke="#94a3b8" strokeWidth="1" strokeDasharray="3,3" />;
              }
              return null;
            })}
            {/* Control points */}
            {!error && points.map((pt, i) => {
              const cmd = commands[pt.cmdIndex];
              const t = cmd?.type.toUpperCase();
              const isControl = (t === 'C' || t === 'Q') && pt.argIndex < (t === 'C' ? 4 : 2);
              return (
                <circle
                  key={i}
                  cx={pt.x}
                  cy={pt.y}
                  r={isControl ? 4 : 6}
                  fill={isControl ? '#94a3b8' : svgColor}
                  stroke="white"
                  strokeWidth="1.5"
                  class="cursor-move"
                  onMouseDown={(e) => handleMouseDown(i, e)}
                />
              );
            })}
          </svg>
        </div>

        {/* Controls */}
        <div class="space-y-3">
          <div>
            <label class="block text-xs font-medium text-text-muted mb-1">Path d attribute</label>
            <textarea
              value={inputD}
              onInput={e => handleInputChange((e.target as HTMLTextAreaElement).value)}
              rows={6}
              class={`w-full font-mono text-sm bg-background border rounded-lg p-3 resize-none focus:outline-none focus:ring-1 transition-colors ${error ? 'border-red-500 focus:ring-red-500' : 'border-border focus:ring-accent'}`}
              placeholder="M 50 50 L 150 50 ..."
              spellcheck={false}
            />
            {error && <p class="text-red-500 text-xs mt-1">{error}</p>}
          </div>

          <div class="flex items-center gap-3">
            <label class="text-xs text-text-muted font-medium">Stroke color</label>
            <input
              type="color"
              value={svgColor}
              onChange={e => setSvgColor((e.target as HTMLInputElement).value)}
              class="w-8 h-8 rounded cursor-pointer border border-border"
            />
            <span class="font-mono text-xs text-text-muted">{svgColor}</span>
          </div>

          <div class="bg-surface border border-border rounded-lg p-3">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-medium text-text-muted">Output path</span>
              <button
                onClick={handleCopy}
                class="text-xs px-2 py-1 bg-accent text-white rounded hover:bg-accent/90 transition-colors"
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <code class="block text-xs font-mono text-text break-all whitespace-pre-wrap bg-background rounded p-2 border border-border">
              {`d="${pathD}"`}
            </code>
          </div>

          <div class="bg-surface border border-border rounded-lg p-3 text-xs text-text-muted space-y-1">
            <p class="font-medium text-text mb-1">Path commands</p>
            {commands.map((cmd, i) => (
              <div key={i} class="font-mono">
                <span class="text-accent font-bold">{cmd.type}</span>
                {cmd.args.length > 0 && <span class="ml-1">{cmd.args.join(', ')}</span>}
              </div>
            ))}
            {commands.length === 0 && <p>No commands parsed.</p>}
          </div>
        </div>
      </div>

      <div class="text-xs text-text-muted bg-surface border border-border rounded-lg p-3">
        <span class="font-medium">How to use:</span> Edit the path d attribute above or drag the colored control points on the canvas.
        Round dots = anchor points. Square-like gray dots = Bézier control handles.
      </div>
    </div>
  );
}
