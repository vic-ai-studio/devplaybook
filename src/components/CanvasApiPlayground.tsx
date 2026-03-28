import { useState, useEffect, useRef } from 'preact/hooks';

type AnimationType = 'bouncing-balls' | 'sine-wave' | 'rotating-star' | 'fireworks' | 'matrix-rain';

interface Config {
  animationType: AnimationType;
  ballCount: number;
  ballSize: number;
  trailEffect: boolean;
  colorMode: 'rainbow' | 'monochrome' | 'custom';
  customColor: string;
  speed: number;
  fps: number;
}

const defaultConfig: Config = {
  animationType: 'bouncing-balls',
  ballCount: 12,
  ballSize: 20,
  trailEffect: false,
  colorMode: 'rainbow',
  customColor: '#3b82f6',
  speed: 3,
  fps: 60,
};

function hsl(h: number, s: number, l: number) {
  return `hsl(${h},${s}%,${l}%)`;
}

export default function CanvasApiPlayground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const stateRef = useRef<any>({});
  const [config, setConfig] = useState<Config>(defaultConfig);
  const [isRunning, setIsRunning] = useState(true);
  const [generatedCode, setGeneratedCode] = useState('');
  const [copied, setCopied] = useState(false);

  const W = 600, H = 360;

  function initState(cfg: Config) {
    if (cfg.animationType === 'bouncing-balls') {
      return Array.from({ length: cfg.ballCount }, (_, i) => ({
        x: Math.random() * (W - cfg.ballSize * 2) + cfg.ballSize,
        y: Math.random() * (H - cfg.ballSize * 2) + cfg.ballSize,
        vx: (Math.random() - 0.5) * cfg.speed * 2,
        vy: (Math.random() - 0.5) * cfg.speed * 2,
        hue: (i / cfg.ballCount) * 360,
      }));
    }
    if (cfg.animationType === 'matrix-rain') {
      const cols = Math.floor(W / 16);
      return Array.from({ length: cols }, () => Math.floor(Math.random() * H));
    }
    return { t: 0 };
  }

  function generateCode(cfg: Config): string {
    if (cfg.animationType === 'bouncing-balls') {
      return `const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.width = ${W};
canvas.height = ${H};

const balls = Array.from({ length: ${cfg.ballCount} }, (_, i) => ({
  x: Math.random() * (canvas.width - ${cfg.ballSize * 2}) + ${cfg.ballSize},
  y: Math.random() * (canvas.height - ${cfg.ballSize * 2}) + ${cfg.ballSize},
  vx: (Math.random() - 0.5) * ${cfg.speed * 2},
  vy: (Math.random() - 0.5) * ${cfg.speed * 2},
  hue: (i / ${cfg.ballCount}) * 360,
}));

function draw() {
  ${cfg.trailEffect
    ? `ctx.fillStyle = 'rgba(15,23,42,0.15)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);`
    : `ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);`}

  for (const b of balls) {
    b.x += b.vx;
    b.y += b.vy;
    if (b.x - ${cfg.ballSize} < 0 || b.x + ${cfg.ballSize} > canvas.width) b.vx *= -1;
    if (b.y - ${cfg.ballSize} < 0 || b.y + ${cfg.ballSize} > canvas.height) b.vy *= -1;

    ctx.beginPath();
    ctx.arc(b.x, b.y, ${cfg.ballSize}, 0, Math.PI * 2);
    ctx.fillStyle = \`hsl(\${b.hue}, 80%, 60%)\`;
    ctx.fill();
    ctx.closePath();
  }
  requestAnimationFrame(draw);
}
draw();`;
    }
    if (cfg.animationType === 'sine-wave') {
      return `const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.width = ${W};
canvas.height = ${H};

let t = 0;
function draw() {
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const waves = 3;
  for (let w = 0; w < waves; w++) {
    ctx.beginPath();
    ctx.strokeStyle = \`hsl(\${(w / waves) * 360 + t * 60}, 80%, 60%)\`;
    ctx.lineWidth = 2;
    for (let x = 0; x <= canvas.width; x++) {
      const y = canvas.height / 2 + Math.sin((x / 60) + t + w * 2) * 60 * (1 - w * 0.25);
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  t += 0.05;
  requestAnimationFrame(draw);
}
draw();`;
    }
    if (cfg.animationType === 'rotating-star') {
      return `const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.width = ${W};
canvas.height = ${H};
let t = 0;

function drawStar(cx, cy, r, points, rotation, color) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points + rotation;
    const radius = i % 2 === 0 ? r : r * 0.45;
    i === 0 ? ctx.moveTo(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle))
            : ctx.lineTo(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function draw() {
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawStar(canvas.width/2, canvas.height/2, 120, 8, t, \`hsl(\${t * 60 % 360}, 80%, 65%)\`);
  drawStar(canvas.width/2, canvas.height/2, 60, 6, -t * 1.5, \`hsl(\${t * 60 % 360 + 120}, 80%, 55%)\`);
  drawStar(canvas.width/2, canvas.height/2, 25, 5, t * 2, \`hsl(\${t * 60 % 360 + 240}, 90%, 70%)\`);

  t += 0.03;
  requestAnimationFrame(draw);
}
draw();`;
    }
    if (cfg.animationType === 'fireworks') {
      return `const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.width = ${W};
canvas.height = ${H};

const particles = [];
function explode(x, y) {
  const hue = Math.random() * 360;
  for (let i = 0; i < 60; i++) {
    const angle = (i / 60) * Math.PI * 2;
    const speed = Math.random() * 4 + 1;
    particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      life: 1, hue });
  }
}

setInterval(() => explode(Math.random() * canvas.width, Math.random() * canvas.height * 0.7), 800);

function draw() {
  ctx.fillStyle = 'rgba(15,23,42,0.2)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.life -= 0.02;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
    ctx.fillStyle = \`hsla(\${p.hue}, 80%, 60%, \${p.life})\`;
    ctx.fill();
  }
  requestAnimationFrame(draw);
}
draw();`;
    }
    return `const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.width = ${W};
canvas.height = ${H};

const fontSize = 14;
const cols = Math.floor(canvas.width / fontSize);
const drops = Array.from({ length: cols }, () => 0);

function draw() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#0f0';
  ctx.font = fontSize + 'px monospace';

  for (let i = 0; i < drops.length; i++) {
    const char = String.fromCharCode(0x30A0 + Math.random() * 96);
    ctx.fillText(char, i * fontSize, drops[i] * fontSize);
    if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
    drops[i]++;
  }
  requestAnimationFrame(draw);
}
draw();`;
  }

  useEffect(() => {
    setGeneratedCode(generateCode(config));
    stateRef.current = { balls: initState(config), t: 0 };
  }, []);

  useEffect(() => {
    setGeneratedCode(generateCode(config));
    stateRef.current = { data: initState(config), t: 0 };
  }, [config]);

  useEffect(() => {
    if (!isRunning) {
      cancelAnimationFrame(animRef.current);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let lastTime = 0;
    const interval = 1000 / config.fps;

    function tick(ts: number) {
      if (!isRunning) return;
      animRef.current = requestAnimationFrame(tick);
      if (ts - lastTime < interval) return;
      lastTime = ts;

      const { animationType, ballSize, trailEffect, speed, colorMode, customColor } = config;
      const state = stateRef.current;

      if (animationType === 'bouncing-balls') {
        if (!Array.isArray(state.data)) state.data = initState(config);
        const balls = state.data as any[];
        if (trailEffect) {
          ctx.fillStyle = 'rgba(15,23,42,0.15)';
          ctx.fillRect(0, 0, W, H);
        } else {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, W, H);
        }
        for (const b of balls) {
          b.x += b.vx;
          b.y += b.vy;
          if (b.x - ballSize < 0 || b.x + ballSize > W) b.vx *= -1;
          if (b.y - ballSize < 0 || b.y + ballSize > H) b.vy *= -1;
          ctx.beginPath();
          ctx.arc(b.x, b.y, ballSize, 0, Math.PI * 2);
          ctx.fillStyle = colorMode === 'custom' ? customColor : colorMode === 'monochrome' ? `hsl(220,70%,${50 + (b.hue % 30)}%)` : `hsl(${b.hue},80%,60%)`;
          ctx.fill();
          ctx.closePath();
        }
      } else if (animationType === 'sine-wave') {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, W, H);
        state.t = (state.t || 0) + 0.05;
        const waves = 3;
        for (let w = 0; w < waves; w++) {
          ctx.beginPath();
          ctx.strokeStyle = colorMode === 'custom' ? customColor : hsl((w / waves) * 360 + state.t * 60, 80, 60);
          ctx.lineWidth = 2;
          for (let x = 0; x <= W; x++) {
            const y = H / 2 + Math.sin(x / 60 + state.t + w * 2) * 60 * (1 - w * 0.25);
            x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      } else if (animationType === 'rotating-star') {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, W, H);
        state.t = (state.t || 0) + 0.03;
        const drawStar = (cx: number, cy: number, r: number, points: number, rot: number, color: string) => {
          ctx.beginPath();
          for (let i = 0; i < points * 2; i++) {
            const angle = (i * Math.PI) / points + rot;
            const radius = i % 2 === 0 ? r : r * 0.45;
            i === 0 ? ctx.moveTo(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle))
                    : ctx.lineTo(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
          }
          ctx.closePath();
          ctx.fillStyle = color;
          ctx.fill();
        };
        drawStar(W / 2, H / 2, 120, 8, state.t, colorMode === 'custom' ? customColor : hsl(state.t * 60 % 360, 80, 65));
        drawStar(W / 2, H / 2, 60, 6, -state.t * 1.5, hsl((state.t * 60 + 120) % 360, 80, 55));
        drawStar(W / 2, H / 2, 25, 5, state.t * 2, hsl((state.t * 60 + 240) % 360, 90, 70));
      } else if (animationType === 'fireworks') {
        if (!state.particles) { state.particles = []; state.lastBurst = 0; }
        ctx.fillStyle = 'rgba(15,23,42,0.2)';
        ctx.fillRect(0, 0, W, H);
        state.lastBurst = (state.lastBurst || 0) + 1;
        if (state.lastBurst > config.fps * 0.8) {
          state.lastBurst = 0;
          const hue = Math.random() * 360;
          for (let i = 0; i < 60; i++) {
            const angle = (i / 60) * Math.PI * 2;
            const spd = Math.random() * 4 + 1;
            state.particles.push({ x: Math.random() * W, y: Math.random() * H * 0.7, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd, life: 1, hue });
          }
        }
        for (let i = state.particles.length - 1; i >= 0; i--) {
          const p = state.particles[i];
          p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.life -= 0.02;
          if (p.life <= 0) { state.particles.splice(i, 1); continue; }
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
          ctx.fillStyle = colorMode === 'custom' ? `rgba(59,130,246,${p.life})` : `hsla(${p.hue},80%,60%,${p.life})`;
          ctx.fill();
        }
      } else if (animationType === 'matrix-rain') {
        if (!Array.isArray(state.data)) state.data = initState(config);
        const drops = state.data as number[];
        ctx.fillStyle = 'rgba(0,0,0,0.05)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = colorMode === 'custom' ? customColor : '#0f0';
        ctx.font = '14px monospace';
        for (let i = 0; i < drops.length; i++) {
          const char = String.fromCharCode(0x30A0 + Math.random() * 96);
          ctx.fillText(char, i * 16, drops[i] * 16);
          if (drops[i] * 16 > H && Math.random() > 0.975) drops[i] = 0;
          drops[i]++;
        }
      }
    }

    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [isRunning, config]);

  const update = (patch: Partial<Config>) => {
    const next = { ...config, ...patch };
    setConfig(next);
    stateRef.current = { data: initState(next), t: 0 };
  };

  return (
    <div class="space-y-4">
      {/* Canvas */}
      <div class="rounded-lg overflow-hidden border border-gray-700">
        <canvas ref={canvasRef} width={W} height={H} class="w-full block bg-gray-950" style={{ imageRendering: 'pixelated' }} />
      </div>

      {/* Controls row */}
      <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div>
          <label class="block text-xs text-gray-400 mb-1">Animation</label>
          <select value={config.animationType} onChange={e => update({ animationType: (e.target as HTMLSelectElement).value as AnimationType, })}
            class="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white">
            <option value="bouncing-balls">Bouncing Balls</option>
            <option value="sine-wave">Sine Wave</option>
            <option value="rotating-star">Rotating Star</option>
            <option value="fireworks">Fireworks</option>
            <option value="matrix-rain">Matrix Rain</option>
          </select>
        </div>

        {config.animationType === 'bouncing-balls' && (
          <>
            <div>
              <label class="block text-xs text-gray-400 mb-1">Balls: {config.ballCount}</label>
              <input type="range" min={1} max={40} value={config.ballCount}
                onInput={e => update({ ballCount: parseInt((e.target as HTMLInputElement).value) })}
                class="w-full" />
            </div>
            <div>
              <label class="block text-xs text-gray-400 mb-1">Size: {config.ballSize}px</label>
              <input type="range" min={5} max={50} value={config.ballSize}
                onInput={e => update({ ballSize: parseInt((e.target as HTMLInputElement).value) })}
                class="w-full" />
            </div>
          </>
        )}

        <div>
          <label class="block text-xs text-gray-400 mb-1">Speed: {config.speed}</label>
          <input type="range" min={1} max={10} value={config.speed}
            onInput={e => update({ speed: parseInt((e.target as HTMLInputElement).value) })}
            class="w-full" />
        </div>

        <div>
          <label class="block text-xs text-gray-400 mb-1">FPS: {config.fps}</label>
          <input type="range" min={10} max={60} step={5} value={config.fps}
            onInput={e => update({ fps: parseInt((e.target as HTMLInputElement).value) })}
            class="w-full" />
        </div>

        <div>
          <label class="block text-xs text-gray-400 mb-1">Color Mode</label>
          <select value={config.colorMode} onChange={e => update({ colorMode: (e.target as HTMLSelectElement).value as Config['colorMode'] })}
            class="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white">
            <option value="rainbow">Rainbow</option>
            <option value="monochrome">Monochrome</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        {config.colorMode === 'custom' && (
          <div>
            <label class="block text-xs text-gray-400 mb-1">Color</label>
            <input type="color" value={config.customColor}
              onInput={e => update({ customColor: (e.target as HTMLInputElement).value })}
              class="w-full h-9 rounded bg-gray-800 border border-gray-700 cursor-pointer" />
          </div>
        )}

        {config.animationType === 'bouncing-balls' && (
          <div class="flex items-center gap-2 mt-4">
            <input type="checkbox" id="trail" checked={config.trailEffect}
              onChange={e => update({ trailEffect: (e.target as HTMLInputElement).checked })} />
            <label for="trail" class="text-sm text-gray-300 cursor-pointer">Trail Effect</label>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div class="flex gap-2">
        <button onClick={() => setIsRunning(r => !r)}
          class={`px-4 py-2 rounded text-sm font-medium transition-colors ${isRunning ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}`}>
          {isRunning ? '⏸ Pause' : '▶ Resume'}
        </button>
        <button onClick={() => { stateRef.current = { data: initState(config), t: 0 }; }}
          class="px-4 py-2 rounded text-sm font-medium bg-gray-700 hover:bg-gray-600 text-white transition-colors">
          ↺ Reset
        </button>
      </div>

      {/* Generated code */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-sm font-semibold text-gray-300">Generated Canvas Code</h3>
          <button onClick={() => { navigator.clipboard.writeText(generatedCode); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            class={`text-xs px-3 py-1 rounded font-medium transition-colors ${copied ? 'bg-green-700 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}>
            {copied ? '✓ Copied' : 'Copy Code'}
          </button>
        </div>
        <pre class="bg-gray-900 border border-gray-700 rounded p-3 text-xs text-green-300 overflow-auto max-h-64 font-mono whitespace-pre">
          {generatedCode}
        </pre>
      </div>
    </div>
  );
}
