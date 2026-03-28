import { useState, useRef, useEffect } from 'preact/hooks';

interface Point {
  x: number;
  y: number;
}

type CurveType = 'cubic' | 'quadratic' | 'composite';

const W = 500, H = 400;

function cubicBezier(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const mt = 1 - t;
  return {
    x: mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
    y: mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y,
  };
}

function quadBezier(p0: Point, p1: Point, p2: Point, t: number): Point {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
  };
}

function dist(a: Point, b: Point) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function toCssEasing(p1: Point, p2: Point): string {
  const nx1 = (p1.x / W).toFixed(3);
  const ny1 = (1 - p1.y / H).toFixed(3);
  const nx2 = (p2.x / W).toFixed(3);
  const ny2 = (1 - p2.y / H).toFixed(3);
  return `cubic-bezier(${nx1}, ${ny1}, ${nx2}, ${ny2})`;
}

const PRESETS = [
  { label: 'Ease', p: [{ x: 50, y: 360 }, { x: 150, y: 360 }, { x: 400, y: 40 }, { x: 450, y: 40 }] },
  { label: 'Ease In', p: [{ x: 50, y: 360 }, { x: 200, y: 360 }, { x: 450, y: 40 }, { x: 450, y: 40 }] },
  { label: 'Ease Out', p: [{ x: 50, y: 360 }, { x: 50, y: 40 }, { x: 300, y: 40 }, { x: 450, y: 40 }] },
  { label: 'Bounce', p: [{ x: 50, y: 360 }, { x: 50, y: -120 }, { x: 450, y: 500 }, { x: 450, y: 40 }] },
  { label: 'Spring', p: [{ x: 50, y: 360 }, { x: 280, y: -60 }, { x: 200, y: 140 }, { x: 450, y: 40 }] },
];

export default function BezierCurveEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [curveType, setCurveType] = useState<CurveType>('cubic');
  const [points, setPoints] = useState<Point[]>([
    { x: 50, y: 360 },   // P0 start
    { x: 150, y: 100 },  // P1 control
    { x: 350, y: 300 },  // P2 control
    { x: 450, y: 40 },   // P3 end
  ]);
  const [dragging, setDragging] = useState<number | null>(null);
  const [showTangents, setShowTangents] = useState(true);
  const [animT, setAnimT] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [copied, setCopied] = useState(false);
  const animRef = useRef<number>(0);
  const tRef = useRef(0);
  const tDirRef = useRef(1);

  const activePoints = curveType === 'quadratic' ? [points[0], points[1], points[3]] : points;

  function getPoint(e: MouseEvent | TouchEvent): Point {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  }

  function findNearest(pt: Point): number | null {
    const pts = curveType === 'quadratic' ? [points[0], points[1], points[3]] : points;
    const idxMap = curveType === 'quadratic' ? [0, 1, 3] : [0, 1, 2, 3];
    let best = -1, bestD = 20;
    pts.forEach((p, i) => {
      const d = dist(p, pt);
      if (d < bestD) { bestD = d; best = idxMap[i]; }
    });
    return best === -1 ? null : best;
  }

  const handleMouseDown = (e: MouseEvent) => {
    const pt = getPoint(e);
    const idx = findNearest(pt);
    if (idx !== null) setDragging(idx);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (dragging === null) return;
    const pt = getPoint(e);
    setPoints(ps => ps.map((p, i) => i === dragging ? { x: pt.x, y: pt.y } : p));
  };

  const handleMouseUp = () => setDragging(null);

  useEffect(() => {
    if (!isAnimating) { cancelAnimationFrame(animRef.current); return; }
    const step = () => {
      tRef.current += 0.015 * tDirRef.current;
      if (tRef.current >= 1) { tRef.current = 1; tDirRef.current = -1; }
      if (tRef.current <= 0) { tRef.current = 0; tDirRef.current = 1; }
      setAnimT(tRef.current);
      animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animRef.current);
  }, [isAnimating]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = 'rgba(100,116,139,0.2)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y <= H; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    const p = points;

    // Control lines (tangents)
    if (showTangents) {
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = 'rgba(148,163,184,0.4)';
      ctx.lineWidth = 1;
      if (curveType === 'cubic') {
        ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y); ctx.lineTo(p[1].x, p[1].y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(p[3].x, p[3].y); ctx.lineTo(p[2].x, p[2].y); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y); ctx.lineTo(p[1].x, p[1].y); ctx.lineTo(p[3].x, p[3].y); ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // Curve
    ctx.beginPath();
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 2.5;
    const steps = 100;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const pt = curveType === 'quadratic'
        ? quadBezier(p[0], p[1], p[3], t)
        : cubicBezier(p[0], p[1], p[2], p[3], t);
      i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y);
    }
    ctx.stroke();

    // Animated dot
    if (isAnimating) {
      const apt = curveType === 'quadratic'
        ? quadBezier(p[0], p[1], p[3], animT)
        : cubicBezier(p[0], p[1], p[2], p[3], animT);
      ctx.beginPath();
      ctx.arc(apt.x, apt.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#f59e0b';
      ctx.fill();
    }

    // Control points
    const ptConfigs = curveType === 'quadratic'
      ? [{ pt: p[0], color: '#34d399', label: 'P0' }, { pt: p[1], color: '#f472b6', label: 'P1' }, { pt: p[3], color: '#34d399', label: 'P2' }]
      : [{ pt: p[0], color: '#34d399', label: 'P0' }, { pt: p[1], color: '#f472b6', label: 'P1' }, { pt: p[2], color: '#f472b6', label: 'P2' }, { pt: p[3], color: '#34d399', label: 'P3' }];

    for (const { pt: cp, color, label } of ptConfigs) {
      ctx.beginPath();
      ctx.arc(cp.x, cp.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '11px sans-serif';
      ctx.fillText(label, cp.x + 12, cp.y - 8);
    }
  }, [points, showTangents, animT, isAnimating, curveType]);

  const cssEasing = toCssEasing(points[1], points[2]);
  const pathD = curveType === 'cubic'
    ? `M ${points[0].x} ${points[0].y} C ${points[1].x} ${points[1].y}, ${points[2].x} ${points[2].y}, ${points[3].x} ${points[3].y}`
    : `M ${points[0].x} ${points[0].y} Q ${points[1].x} ${points[1].y}, ${points[3].x} ${points[3].y}`;

  const jsCode = curveType === 'cubic'
    ? `// Cubic Bezier\nfunction cubicBezier(p0, p1, p2, p3, t) {\n  const mt = 1 - t;\n  return {\n    x: mt**3*p0.x + 3*mt**2*t*p1.x + 3*mt*t**2*p2.x + t**3*p3.x,\n    y: mt**3*p0.y + 3*mt**2*t*p1.y + 3*mt*t**2*p2.y + t**3*p3.y,\n  };\n}\n\nconst p0 = {x:${Math.round(points[0].x)}, y:${Math.round(points[0].y)}};\nconst p1 = {x:${Math.round(points[1].x)}, y:${Math.round(points[1].y)}};\nconst p2 = {x:${Math.round(points[2].x)}, y:${Math.round(points[2].y)}};\nconst p3 = {x:${Math.round(points[3].x)}, y:${Math.round(points[3].y)}};\n\n// Sample 10 points along curve\nfor (let i = 0; i <= 10; i++) {\n  const pt = cubicBezier(p0, p1, p2, p3, i / 10);\n  console.log(pt);\n}`
    : `// Quadratic Bezier\nfunction quadBezier(p0, p1, p2, t) {\n  const mt = 1 - t;\n  return {\n    x: mt**2*p0.x + 2*mt*t*p1.x + t**2*p2.x,\n    y: mt**2*p0.y + 2*mt*t*p1.y + t**2*p2.y,\n  };\n}\n\nconst p0 = {x:${Math.round(points[0].x)}, y:${Math.round(points[0].y)}};\nconst p1 = {x:${Math.round(points[1].x)}, y:${Math.round(points[1].y)}};\nconst p2 = {x:${Math.round(points[3].x)}, y:${Math.round(points[3].y)}};`;

  return (
    <div class="space-y-4">
      {/* Controls */}
      <div class="flex flex-wrap gap-3 items-center">
        <div>
          <label class="text-xs text-gray-400 mr-2">Type</label>
          <select value={curveType} onChange={e => setCurveType((e.target as HTMLSelectElement).value as CurveType)}
            class="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white">
            <option value="cubic">Cubic (4 pts)</option>
            <option value="quadratic">Quadratic (3 pts)</option>
          </select>
        </div>
        <div class="flex items-center gap-2">
          <input type="checkbox" id="tangents" checked={showTangents} onChange={e => setShowTangents((e.target as HTMLInputElement).checked)} />
          <label for="tangents" class="text-sm text-gray-300 cursor-pointer">Show control lines</label>
        </div>
        <button onClick={() => setIsAnimating(a => !a)}
          class={`text-sm px-3 py-1.5 rounded font-medium transition-colors ${isAnimating ? 'bg-yellow-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
          {isAnimating ? '⏸ Pause' : '▶ Animate'}
        </button>
      </div>

      {/* Presets */}
      <div class="flex flex-wrap gap-2">
        {PRESETS.map(preset => (
          <button key={preset.label} onClick={() => setPoints(preset.p as Point[])}
            class="text-xs px-3 py-1 bg-gray-800 border border-gray-700 rounded hover:bg-gray-700 text-gray-300 transition-colors">
            {preset.label}
          </button>
        ))}
      </div>

      {/* Canvas */}
      <div class="rounded-lg overflow-hidden border border-gray-700 cursor-crosshair">
        <canvas ref={canvasRef} width={W} height={H}
          class="w-full block"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>
      <p class="text-xs text-gray-500">Drag the colored dots to adjust control points.</p>

      {/* Outputs */}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-3">
          <p class="text-xs text-gray-400 mb-1">CSS cubic-bezier (easing)</p>
          <code class="text-sm text-green-300 font-mono break-all">{cssEasing}</code>
          <p class="text-xs text-gray-500 mt-1">animation-timing-function: {cssEasing};</p>
        </div>
        <div class="bg-gray-800 border border-gray-700 rounded-lg p-3">
          <p class="text-xs text-gray-400 mb-1">SVG path</p>
          <code class="text-xs text-blue-300 font-mono break-all">{pathD}</code>
        </div>
      </div>

      {/* JS Code */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <p class="text-sm font-semibold text-gray-300">JavaScript Code</p>
          <button onClick={() => { navigator.clipboard.writeText(jsCode); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            class={`text-xs px-3 py-1 rounded font-medium ${copied ? 'bg-green-700 text-white' : 'bg-gray-700 text-gray-300'}`}>
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <pre class="bg-gray-900 border border-gray-700 rounded p-3 text-xs text-green-300 overflow-auto max-h-60 font-mono whitespace-pre">
          {jsCode}
        </pre>
      </div>
    </div>
  );
}
