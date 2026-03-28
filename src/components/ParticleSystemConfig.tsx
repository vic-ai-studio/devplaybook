import { useState, useEffect, useRef } from 'preact/hooks';

interface ParticleConfig {
  emitterType: 'point' | 'area' | 'ring';
  maxParticles: number;
  emitRate: number;
  lifespan: number;
  lifespanVar: number;
  speed: number;
  speedVar: number;
  angle: number;
  angleSpread: number;
  gravity: number;
  startSize: number;
  endSize: number;
  startOpacity: number;
  endOpacity: number;
  colorMode: 'single' | 'gradient';
  startColor: string;
  endColor: string;
  blendMode: 'source-over' | 'lighter' | 'multiply';
  turbulence: number;
  rotationSpeed: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  startSize: number;
  endSize: number;
  rotation: number;
  rotSpeed: number;
  colorStart: [number, number, number];
  colorEnd: [number, number, number];
}

function hexToRgb(hex: string): [number, number, number] {
  const c = hex.replace('#', '');
  return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
}

function lerpColor(a: [number, number, number], b: [number, number, number], t: number): string {
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)})`;
}

const W = 560, H = 360;

const PRESETS: { label: string; config: Partial<ParticleConfig> }[] = [
  { label: 'Fire', config: { emitterType: 'area', angle: -90, angleSpread: 40, gravity: -0.08, speed: 2.5, speedVar: 1, startColor: '#ff6000', endColor: '#ffee00', startSize: 12, endSize: 2, startOpacity: 1, endOpacity: 0, lifespan: 90, blendMode: 'lighter', turbulence: 0.3, colorMode: 'gradient' } },
  { label: 'Snow', config: { emitterType: 'area', angle: 90, angleSpread: 20, gravity: 0.02, speed: 0.8, speedVar: 0.5, startColor: '#dbeafe', endColor: '#ffffff', startSize: 5, endSize: 3, startOpacity: 0.9, endOpacity: 0.2, lifespan: 180, blendMode: 'source-over', turbulence: 0.15, colorMode: 'single' } },
  { label: 'Sparks', config: { emitterType: 'point', angle: -90, angleSpread: 180, gravity: 0.12, speed: 5, speedVar: 2, startColor: '#fde047', endColor: '#f97316', startSize: 4, endSize: 1, startOpacity: 1, endOpacity: 0, lifespan: 70, blendMode: 'lighter', turbulence: 0, colorMode: 'gradient' } },
  { label: 'Smoke', config: { emitterType: 'point', angle: -90, angleSpread: 25, gravity: -0.02, speed: 1.2, speedVar: 0.5, startColor: '#94a3b8', endColor: '#cbd5e1', startSize: 8, endSize: 28, startOpacity: 0.6, endOpacity: 0, lifespan: 160, blendMode: 'source-over', turbulence: 0.2, colorMode: 'gradient' } },
  { label: 'Magic Ring', config: { emitterType: 'ring', angle: 0, angleSpread: 360, gravity: 0, speed: 2, speedVar: 0.5, startColor: '#a855f7', endColor: '#06b6d4', startSize: 6, endSize: 2, startOpacity: 1, endOpacity: 0, lifespan: 80, blendMode: 'lighter', turbulence: 0.1, colorMode: 'gradient' } },
];

export default function ParticleSystemConfig() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);
  const frameRef = useRef(0);
  const [isRunning, setIsRunning] = useState(true);
  const [copied, setCopied] = useState(false);
  const [cfg, setCfg] = useState<ParticleConfig>({
    emitterType: 'point',
    maxParticles: 200,
    emitRate: 5,
    lifespan: 90,
    lifespanVar: 20,
    speed: 2.5,
    speedVar: 1,
    angle: -90,
    angleSpread: 60,
    gravity: 0.05,
    startSize: 8,
    endSize: 2,
    startOpacity: 1,
    endOpacity: 0,
    colorMode: 'gradient',
    startColor: '#60a5fa',
    endColor: '#a855f7',
    blendMode: 'lighter',
    turbulence: 0.1,
    rotationSpeed: 0,
  });

  const emitterX = W / 2;
  const emitterY = H * 0.65;

  function spawnParticle(c: ParticleConfig): Particle {
    const angleRad = (c.angle + (Math.random() - 0.5) * c.angleSpread) * (Math.PI / 180);
    const spd = c.speed + (Math.random() - 0.5) * c.speedVar * 2;
    let ox = 0, oy = 0;
    if (c.emitterType === 'area') { ox = (Math.random() - 0.5) * 80; oy = (Math.random() - 0.5) * 20; }
    if (c.emitterType === 'ring') {
      const ra = Math.random() * Math.PI * 2;
      ox = Math.cos(ra) * 40; oy = Math.sin(ra) * 40;
    }
    const life = c.lifespan + (Math.random() - 0.5) * c.lifespanVar;
    return {
      x: emitterX + ox,
      y: emitterY + oy,
      vx: Math.cos(angleRad) * spd,
      vy: Math.sin(angleRad) * spd,
      life,
      maxLife: life,
      startSize: c.startSize,
      endSize: c.endSize,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * c.rotationSpeed,
      colorStart: hexToRgb(c.startColor),
      colorEnd: hexToRgb(c.endColor),
    };
  }

  useEffect(() => {
    if (!isRunning) { cancelAnimationFrame(animRef.current); return; }
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;

    const tick = () => {
      animRef.current = requestAnimationFrame(tick);
      frameRef.current++;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(0, 0, W, H);

      // Emitter glow
      const grad = ctx.createRadialGradient(emitterX, emitterY, 0, emitterX, emitterY, 30);
      grad.addColorStop(0, 'rgba(255,255,255,0.08)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(emitterX - 30, emitterY - 30, 60, 60);

      // Spawn new
      if (particlesRef.current.length < cfg.maxParticles) {
        for (let i = 0; i < cfg.emitRate; i++) {
          if (particlesRef.current.length < cfg.maxParticles) {
            particlesRef.current.push(spawnParticle(cfg));
          }
        }
      }

      ctx.globalCompositeOperation = cfg.blendMode;

      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.life--;
        if (p.life <= 0) { particlesRef.current.splice(i, 1); continue; }

        p.vx += (Math.random() - 0.5) * cfg.turbulence;
        p.vy += cfg.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotSpeed;

        const t = 1 - p.life / p.maxLife;
        const size = p.startSize + (p.endSize - p.startSize) * t;
        const opacity = cfg.startOpacity + (cfg.endOpacity - cfg.startOpacity) * t;
        const color = cfg.colorMode === 'gradient' ? lerpColor(p.colorStart, p.colorEnd, t) : lerpColor(p.colorStart, p.colorStart, 0);

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation * Math.PI / 180);
        ctx.globalAlpha = Math.max(0, opacity);
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(0.5, size / 2), 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.restore();
      }

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;

      // Emitter marker
      ctx.beginPath();
      ctx.arc(emitterX, emitterY, 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fill();

      // Particle count
      ctx.fillStyle = 'rgba(148,163,184,0.7)';
      ctx.font = '11px monospace';
      ctx.fillText(`${particlesRef.current.length} / ${cfg.maxParticles} particles`, 8, 16);
    };

    particlesRef.current = [];
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [isRunning, cfg]);

  const up = (patch: Partial<ParticleConfig>) => {
    particlesRef.current = [];
    setCfg(c => ({ ...c, ...patch }));
  };

  const generatedCode = `// Particle System Config
const config = {
  emitterType: '${cfg.emitterType}',
  maxParticles: ${cfg.maxParticles},
  emitRate: ${cfg.emitRate},      // per frame
  lifespan: ${cfg.lifespan},       // frames
  lifespanVariance: ${cfg.lifespanVar},
  speed: ${cfg.speed},
  speedVariance: ${cfg.speedVar},
  angle: ${cfg.angle},             // degrees
  angleSpread: ${cfg.angleSpread},
  gravity: ${cfg.gravity},
  startSize: ${cfg.startSize},
  endSize: ${cfg.endSize},
  startOpacity: ${cfg.startOpacity},
  endOpacity: ${cfg.endOpacity},
  startColor: '${cfg.startColor}',
  endColor: '${cfg.endColor}',
  blendMode: '${cfg.blendMode}',
  turbulence: ${cfg.turbulence},
};

// Usage with Canvas 2D
function spawnParticle(emitterX, emitterY) {
  const angleRad = (config.angle + (Math.random() - 0.5) * config.angleSpread) * Math.PI / 180;
  const spd = config.speed + (Math.random() - 0.5) * config.speedVariance * 2;
  const life = config.lifespan + (Math.random() - 0.5) * config.lifespanVariance;
  return { x: emitterX, y: emitterY, vx: Math.cos(angleRad) * spd,
           vy: Math.sin(angleRad) * spd, life, maxLife: life };
}

function updateParticle(p, ctx) {
  p.vx += (Math.random() - 0.5) * config.turbulence;
  p.vy += config.gravity;
  p.x += p.vx; p.y += p.vy; p.life--;
  const t = 1 - p.life / p.maxLife;
  const size = config.startSize + (config.endSize - config.startSize) * t;
  const alpha = config.startOpacity + (config.endOpacity - config.startOpacity) * t;
  ctx.globalAlpha = Math.max(0, alpha);
  ctx.globalCompositeOperation = '${cfg.blendMode}';
  ctx.beginPath();
  ctx.arc(p.x, p.y, size / 2, 0, Math.PI * 2);
  ctx.fillStyle = '${cfg.startColor}'; // lerp colors in production
  ctx.fill();
}`;

  return (
    <div class="space-y-4">
      {/* Presets */}
      <div class="flex flex-wrap gap-2">
        {PRESETS.map(p => (
          <button key={p.label} onClick={() => up(p.config)}
            class="text-xs px-3 py-1.5 bg-gray-800 border border-gray-700 rounded hover:bg-gray-700 text-gray-300 transition-colors">
            {p.label}
          </button>
        ))}
      </div>

      {/* Canvas */}
      <div class="rounded-lg overflow-hidden border border-gray-700">
        <canvas ref={canvasRef} width={W} height={H} class="w-full block" />
      </div>

      {/* Controls */}
      <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div>
          <label class="block text-xs text-gray-400 mb-1">Emitter Type</label>
          <select value={cfg.emitterType} onChange={e => up({ emitterType: (e.target as HTMLSelectElement).value as ParticleConfig['emitterType'] })}
            class="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white">
            <option value="point">Point</option>
            <option value="area">Area</option>
            <option value="ring">Ring</option>
          </select>
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Max Particles: {cfg.maxParticles}</label>
          <input type="range" min={10} max={500} value={cfg.maxParticles}
            onInput={e => up({ maxParticles: parseInt((e.target as HTMLInputElement).value) })} class="w-full" />
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Emit Rate: {cfg.emitRate}/frame</label>
          <input type="range" min={1} max={20} value={cfg.emitRate}
            onInput={e => up({ emitRate: parseInt((e.target as HTMLInputElement).value) })} class="w-full" />
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Speed: {cfg.speed}</label>
          <input type="range" min={0.5} max={10} step={0.5} value={cfg.speed}
            onInput={e => up({ speed: parseFloat((e.target as HTMLInputElement).value) })} class="w-full" />
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Angle: {cfg.angle}°</label>
          <input type="range" min={-180} max={180} value={cfg.angle}
            onInput={e => up({ angle: parseInt((e.target as HTMLInputElement).value) })} class="w-full" />
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Spread: ±{cfg.angleSpread}°</label>
          <input type="range" min={0} max={180} value={cfg.angleSpread}
            onInput={e => up({ angleSpread: parseInt((e.target as HTMLInputElement).value) })} class="w-full" />
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Gravity: {cfg.gravity}</label>
          <input type="range" min={-0.3} max={0.3} step={0.01} value={cfg.gravity}
            onInput={e => up({ gravity: parseFloat((e.target as HTMLInputElement).value) })} class="w-full" />
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Turbulence: {cfg.turbulence}</label>
          <input type="range" min={0} max={1} step={0.05} value={cfg.turbulence}
            onInput={e => up({ turbulence: parseFloat((e.target as HTMLInputElement).value) })} class="w-full" />
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Lifespan: {cfg.lifespan} frames</label>
          <input type="range" min={10} max={300} value={cfg.lifespan}
            onInput={e => up({ lifespan: parseInt((e.target as HTMLInputElement).value) })} class="w-full" />
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Start Size: {cfg.startSize}px</label>
          <input type="range" min={1} max={40} value={cfg.startSize}
            onInput={e => up({ startSize: parseInt((e.target as HTMLInputElement).value) })} class="w-full" />
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">End Size: {cfg.endSize}px</label>
          <input type="range" min={0} max={40} value={cfg.endSize}
            onInput={e => up({ endSize: parseInt((e.target as HTMLInputElement).value) })} class="w-full" />
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Blend Mode</label>
          <select value={cfg.blendMode} onChange={e => up({ blendMode: (e.target as HTMLSelectElement).value as ParticleConfig['blendMode'] })}
            class="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white">
            <option value="source-over">Normal</option>
            <option value="lighter">Additive (glow)</option>
            <option value="multiply">Multiply</option>
          </select>
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Color Mode</label>
          <select value={cfg.colorMode} onChange={e => up({ colorMode: (e.target as HTMLSelectElement).value as ParticleConfig['colorMode'] })}
            class="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white">
            <option value="single">Single</option>
            <option value="gradient">Gradient</option>
          </select>
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Start Color</label>
          <input type="color" value={cfg.startColor}
            onInput={e => up({ startColor: (e.target as HTMLInputElement).value })}
            class="w-full h-9 rounded bg-gray-800 border border-gray-700 cursor-pointer" />
        </div>
        {cfg.colorMode === 'gradient' && (
          <div>
            <label class="block text-xs text-gray-400 mb-1">End Color</label>
            <input type="color" value={cfg.endColor}
              onInput={e => up({ endColor: (e.target as HTMLInputElement).value })}
              class="w-full h-9 rounded bg-gray-800 border border-gray-700 cursor-pointer" />
          </div>
        )}
      </div>

      {/* Play/pause */}
      <button onClick={() => setIsRunning(r => !r)}
        class={`px-4 py-2 rounded text-sm font-medium ${isRunning ? 'bg-yellow-600 text-white' : 'bg-green-600 text-white'}`}>
        {isRunning ? '⏸ Pause' : '▶ Resume'}
      </button>

      {/* Code */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <p class="text-sm font-semibold text-gray-300">Generated Config & Code</p>
          <button onClick={() => { navigator.clipboard.writeText(generatedCode); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            class={`text-xs px-3 py-1 rounded font-medium ${copied ? 'bg-green-700 text-white' : 'bg-gray-700 text-gray-300'}`}>
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <pre class="bg-gray-900 border border-gray-700 rounded p-3 text-xs text-green-300 overflow-auto max-h-72 font-mono whitespace-pre">
          {generatedCode}
        </pre>
      </div>
    </div>
  );
}
