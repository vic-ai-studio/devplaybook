import { useState } from 'preact/hooks';

interface Result {
  targetFps: number;
  frameTime: number;
  updatesPerSecond: number;
  fixedDt: number;
  renderInterpolation: number;
  physicsSteps: number;
  msPerTick: number;
  ticksPerFrame: number;
  actualFps: string;
  cpuBudgetMs: number;
  recommendedFixedHz: number;
  code: string;
}

function calcGameLoop(targetFps: number, physicsHz: number, renderScale: number): Result {
  const frameTime = 1000 / targetFps;
  const fixedDt = 1 / physicsHz;
  const physicsSteps = physicsHz / targetFps;
  const msPerTick = 1000 / physicsHz;
  const ticksPerFrame = Math.ceil(physicsHz / targetFps);
  const interpolation = (physicsHz % targetFps) === 0 ? 0 : ((1000 / targetFps) % (1000 / physicsHz)) / (1000 / physicsHz);
  const cpuBudget = (frameTime * 0.8);
  const recommendedHz = targetFps <= 60 ? 60 : targetFps <= 120 ? 120 : 240;

  const code = `// Game Loop (${targetFps} FPS target, ${physicsHz} Hz physics)
const TARGET_FPS = ${targetFps};
const PHYSICS_HZ = ${physicsHz};
const FIXED_DT = ${fixedDt.toFixed(4)}; // seconds
const FRAME_BUDGET_MS = ${cpuBudget.toFixed(1)};

let lastTime = 0;
let accumulator = 0;

function gameLoop(timestamp) {
  const deltaMs = Math.min(timestamp - lastTime, 250); // cap at 250ms
  const deltaSec = deltaMs / 1000;
  lastTime = timestamp;

  // Fixed timestep physics
  accumulator += deltaSec;
  while (accumulator >= FIXED_DT) {
    update(FIXED_DT);        // physics/game logic step
    accumulator -= FIXED_DT;
  }

  // Render with interpolation for smooth visuals
  const alpha = accumulator / FIXED_DT; // 0.0–1.0
  render(alpha);${renderScale !== 1 ? `\n  // Render at ${(100 * renderScale).toFixed(0)}% resolution, upscale ${(1/renderScale).toFixed(1)}x` : ''}

  requestAnimationFrame(gameLoop);
}

function update(dt) {
  // Move objects: position += velocity * dt
  // Physics engine step: physicsWorld.step(dt)
  // Input processing, collision detection
}

function render(alpha) {
  // Interpolate: renderPos = prevPos + (currPos - prevPos) * alpha
  // Draw scene
}

// Start
requestAnimationFrame(ts => { lastTime = ts; requestAnimationFrame(gameLoop); });`;

  return {
    targetFps,
    frameTime,
    updatesPerSecond: physicsHz,
    fixedDt,
    renderInterpolation: interpolation,
    physicsSteps,
    msPerTick,
    ticksPerFrame,
    actualFps: targetFps.toFixed(0),
    cpuBudgetMs: cpuBudget,
    recommendedFixedHz: recommendedHz,
    code,
  };
}

const PRESETS = [
  { label: 'Mobile 30 FPS', fps: 30, phz: 60, rs: 0.75 },
  { label: 'PC Game 60 FPS', fps: 60, phz: 60, rs: 1 },
  { label: 'Smooth 120 FPS', fps: 120, phz: 120, rs: 1 },
  { label: '144 Hz Monitor', fps: 144, phz: 120, rs: 1 },
  { label: 'Browser Canvas', fps: 60, phz: 30, rs: 1 },
];

export default function GameLoopCalculator() {
  const [targetFps, setTargetFps] = useState(60);
  const [physicsHz, setPhysicsHz] = useState(60);
  const [renderScale, setRenderScale] = useState(1.0);
  const [copied, setCopied] = useState(false);

  const result = calcGameLoop(targetFps, physicsHz, renderScale);

  const MetricCard = ({ label, value, unit, note }: { label: string; value: string; unit?: string; note?: string }) => (
    <div class="bg-gray-800 border border-gray-700 rounded-lg p-3">
      <p class="text-xs text-gray-400 mb-0.5">{label}</p>
      <p class="text-xl font-bold text-white">{value}<span class="text-sm font-normal text-gray-400 ml-1">{unit}</span></p>
      {note && <p class="text-xs text-gray-500 mt-0.5">{note}</p>}
    </div>
  );

  return (
    <div class="space-y-5">
      {/* Presets */}
      <div>
        <p class="text-xs text-gray-400 mb-2">Quick Presets</p>
        <div class="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button key={p.label}
              onClick={() => { setTargetFps(p.fps); setPhysicsHz(p.phz); setRenderScale(p.rs); }}
              class={`text-xs px-3 py-1.5 rounded border transition-colors ${targetFps === p.fps && physicsHz === p.phz ? 'bg-accent/20 border-accent text-accent' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Inputs */}
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Target FPS: <span class="text-accent">{targetFps}</span></label>
          <input type="range" min={15} max={240} step={1} value={targetFps}
            onInput={e => setTargetFps(parseInt((e.target as HTMLInputElement).value))}
            class="w-full mb-1" />
          <div class="flex justify-between text-xs text-gray-500"><span>15</span><span>240</span></div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Physics Hz: <span class="text-accent">{physicsHz}</span></label>
          <input type="range" min={10} max={240} step={10} value={physicsHz}
            onInput={e => setPhysicsHz(parseInt((e.target as HTMLInputElement).value))}
            class="w-full mb-1" />
          <div class="flex justify-between text-xs text-gray-500"><span>10</span><span>240</span></div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Render Scale: <span class="text-accent">{(renderScale * 100).toFixed(0)}%</span></label>
          <input type="range" min={0.25} max={2} step={0.25} value={renderScale}
            onInput={e => setRenderScale(parseFloat((e.target as HTMLInputElement).value))}
            class="w-full mb-1" />
          <div class="flex justify-between text-xs text-gray-500"><span>25%</span><span>200%</span></div>
        </div>
      </div>

      {/* Metrics */}
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Frame Time" value={result.frameTime.toFixed(2)} unit="ms" note="Time budget per frame" />
        <MetricCard label="Physics Step" value={(result.fixedDt * 1000).toFixed(2)} unit="ms" note="Fixed delta time" />
        <MetricCard label="Ticks/Frame" value={result.ticksPerFrame.toFixed(1)} note="Physics updates per render" />
        <MetricCard label="CPU Budget" value={result.cpuBudgetMs.toFixed(1)} unit="ms" note="80% of frame time" />
        <MetricCard label="Physics Hz" value={result.updatesPerSecond.toString()} unit="Hz" note="Updates per second" />
        <MetricCard label="Render Scale" value={(renderScale * 100).toFixed(0)} unit="%" note={renderScale < 1 ? `Upscale ${(1/renderScale).toFixed(1)}x` : renderScale > 1 ? 'Supersampled' : 'Native'} />
        <MetricCard label="Interp. Alpha" value={(result.renderInterpolation * 100).toFixed(0)} unit="%" note="Smooth between physics steps" />
        <MetricCard label="Rec. Physics Hz" value={result.recommendedFixedHz.toString()} unit="Hz" note="For this FPS target" />
      </div>

      {/* Timing diagram */}
      <div class="bg-gray-900 border border-gray-700 rounded-lg p-4">
        <h3 class="text-sm font-semibold text-gray-300 mb-3">Frame Timeline ({result.frameTime.toFixed(1)}ms budget)</h3>
        <div class="space-y-2">
          {['Input (1ms)', `Physics (${(result.ticksPerFrame * result.msPerTick * 0.3).toFixed(1)}ms)`, `Logic (${(result.frameTime * 0.15).toFixed(1)}ms)`, `Render (${(result.frameTime * 0.35).toFixed(1)}ms)`, 'Idle (buffer)'].map((label, i) => {
            const widths = [3, result.ticksPerFrame * 15, 15, 35, 100 - 3 - result.ticksPerFrame * 15 - 15 - 35];
            const colors = ['bg-blue-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-gray-700'];
            const w = Math.max(2, Math.min(widths[i], 100));
            return (
              <div key={label} class="flex items-center gap-2">
                <span class="text-xs text-gray-400 w-36 shrink-0">{label}</span>
                <div class="flex-1 bg-gray-800 rounded h-4 overflow-hidden">
                  <div class={`h-full ${colors[i]} rounded transition-all`} style={{ width: `${w}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Code */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-sm font-semibold text-gray-300">Game Loop Code</h3>
          <button onClick={() => { navigator.clipboard.writeText(result.code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            class={`text-xs px-3 py-1 rounded font-medium transition-colors ${copied ? 'bg-green-700 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}>
            {copied ? '✓ Copied' : 'Copy Code'}
          </button>
        </div>
        <pre class="bg-gray-900 border border-gray-700 rounded p-3 text-xs text-green-300 overflow-auto max-h-80 font-mono whitespace-pre">
          {result.code}
        </pre>
      </div>
    </div>
  );
}
