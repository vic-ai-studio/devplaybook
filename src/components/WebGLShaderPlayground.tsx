import { useState, useEffect, useRef, useCallback } from 'preact/hooks';

const TEMPLATES: { name: string; code: string }[] = [
  {
    name: 'Gradient',
    code: `precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec3 col = 0.5 + 0.5 * cos(u_time + uv.xyx + vec3(0.0, 2.0, 4.0));
  gl_FragColor = vec4(col, 1.0);
}`,
  },
  {
    name: 'Wave',
    code: `precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;

void main() {
  vec2 uv = (gl_FragCoord.xy - u_resolution * 0.5) / u_resolution.y;
  float wave = sin(uv.x * 10.0 + u_time * 2.0) * 0.1;
  float dist = abs(uv.y - wave);
  float line = smoothstep(0.02, 0.0, dist);
  vec3 col = vec3(0.2, 0.6, 1.0) * line;
  col += vec3(0.05, 0.05, 0.15) * (1.0 - uv.y * 0.5);
  gl_FragColor = vec4(col, 1.0);
}`,
  },
  {
    name: 'Noise',
    code: `precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y
  );
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution * 3.0;
  float n = noise(uv + u_time * 0.3);
  n += 0.5 * noise(uv * 2.0 + u_time * 0.5);
  n += 0.25 * noise(uv * 4.0 + u_time * 0.7);
  n /= 1.75;
  vec3 col = mix(vec3(0.1, 0.0, 0.3), vec3(0.8, 0.4, 0.0), n);
  gl_FragColor = vec4(col, 1.0);
}`,
  },
  {
    name: 'Circle',
    code: `precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;

void main() {
  vec2 uv = (gl_FragCoord.xy - u_resolution * 0.5) / min(u_resolution.x, u_resolution.y);
  vec2 mouse = (u_mouse - u_resolution * 0.5) / min(u_resolution.x, u_resolution.y);
  float d = length(uv);
  float ring = smoothstep(0.02, 0.0, abs(d - 0.3 - 0.05 * sin(u_time * 2.0)));
  float glow = 0.02 / (d + 0.01);
  float hover = smoothstep(0.1, 0.0, length(uv - mouse));
  vec3 col = vec3(0.4, 0.8, 1.0) * ring + vec3(0.2, 0.5, 1.0) * glow * 0.1;
  col += vec3(1.0, 0.6, 0.2) * hover * 0.5;
  gl_FragColor = vec4(col, 1.0);
}`,
  },
];

const VERT_SHADER = `attribute vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }`;

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

export default function WebGLShaderPlayground() {
  const [fragCode, setFragCode] = useState(TEMPLATES[0].code);
  const [activeTemplate, setActiveTemplate] = useState(0);
  const [error, setError] = useState('');
  const [isRunning, setIsRunning] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const progRef = useRef<WebGLProgram | null>(null);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(Date.now());
  const mouseRef = useRef<[number, number]>([0, 0]);
  const currentFragRef = useRef(fragCode);

  useEffect(() => { currentFragRef.current = fragCode; }, [fragCode]);

  const compile = useCallback((gl: WebGLRenderingContext, frag: string): WebGLProgram | null => {
    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, VERT_SHADER);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      setError('Vertex shader error: ' + gl.getShaderInfoLog(vs));
      return null;
    }

    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, frag);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      setError('Fragment shader error: ' + (gl.getShaderInfoLog(fs) || 'Unknown error'));
      return null;
    }

    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      setError('Program link error: ' + gl.getProgramInfoLog(prog));
      return null;
    }

    setError('');
    return prog;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
    if (!gl) { setError('WebGL not supported in this browser.'); return; }
    glRef.current = gl;

    // Full-screen quad
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const prog = compile(gl, fragCode);
    if (prog) progRef.current = prog;

    const tick = () => {
      if (!isRunning) return;
      rafRef.current = requestAnimationFrame(tick);
      const p = progRef.current;
      if (!p) return;

      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);

      gl.useProgram(p);

      const pos = gl.getAttribLocation(p, 'a_position');
      gl.enableVertexAttribArray(pos);
      gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

      const uTime = gl.getUniformLocation(p, 'u_time');
      if (uTime) gl.uniform1f(uTime, (Date.now() - startTimeRef.current) / 1000);

      const uRes = gl.getUniformLocation(p, 'u_resolution');
      if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);

      const uMouse = gl.getUniformLocation(p, 'u_mouse');
      if (uMouse) gl.uniform2f(uMouse, mouseRef.current[0], canvas.height - mouseRef.current[1]);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    tick();

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = [e.clientX - rect.left, e.clientY - rect.top];
    };
    canvas.addEventListener('mousemove', onMouseMove);

    return () => {
      cancelAnimationFrame(rafRef.current);
      canvas.removeEventListener('mousemove', onMouseMove);
    };
  }, [isRunning]);

  const applyShader = () => {
    const gl = glRef.current;
    if (!gl) return;
    const prog = compile(gl, fragCode);
    if (prog) {
      if (progRef.current) gl.deleteProgram(progRef.current);
      progRef.current = prog;
    }
  };

  const loadTemplate = (idx: number) => {
    setActiveTemplate(idx);
    setFragCode(TEMPLATES[idx].code);
    setTimeout(() => {
      const gl = glRef.current;
      if (!gl) return;
      const prog = compile(gl, TEMPLATES[idx].code);
      if (prog) { if (progRef.current) gl.deleteProgram(progRef.current); progRef.current = prog; }
    }, 50);
  };

  return (
    <div class="space-y-4">
      {/* Templates */}
      <div class="bg-bg-card border border-border rounded-xl p-4 space-y-3">
        <div class="text-sm font-semibold text-text">Starter Templates</div>
        <div class="flex flex-wrap gap-2">
          {TEMPLATES.map((t, i) => (
            <button
              key={t.name}
              onClick={() => loadTemplate(i)}
              class={`px-4 py-2 rounded-lg border text-sm transition-colors ${
                activeTemplate === i
                  ? 'bg-primary/20 border-primary text-primary'
                  : 'bg-bg border-border text-text-muted hover:border-border-hover hover:text-text'
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {/* Canvas preview */}
      <div class="bg-bg-card border border-border rounded-xl overflow-hidden">
        <div class="flex items-center justify-between px-4 py-2.5 border-b border-border bg-bg">
          <span class="text-xs font-mono text-text-muted">Live WebGL Preview</span>
          <div class="flex items-center gap-2">
            <span class="text-xs text-text-muted">Uniforms: u_time, u_resolution, u_mouse</span>
            <button
              onClick={() => setIsRunning((v) => !v)}
              class={`text-xs px-3 py-1.5 rounded font-medium transition-colors ${isRunning ? 'bg-yellow-700 hover:bg-yellow-600 text-white' : 'bg-green-700 hover:bg-green-600 text-white'}`}
            >
              {isRunning ? '⏸ Pause' : '▶ Play'}
            </button>
          </div>
        </div>
        <canvas
          ref={canvasRef}
          class="w-full"
          style={{ height: '280px', display: 'block' }}
        />
        {error && (
          <div class="px-4 py-2 bg-red-950/40 border-t border-red-800/40 text-xs font-mono text-red-400 whitespace-pre-wrap">
            {error}
          </div>
        )}
      </div>

      {/* GLSL editor */}
      <div class="bg-bg-card border border-border rounded-xl overflow-hidden">
        <div class="flex items-center justify-between px-4 py-2.5 border-b border-border bg-bg">
          <span class="text-xs font-mono text-text-muted">Fragment Shader (GLSL)</span>
          <div class="flex items-center gap-2">
            <CopyButton value={fragCode} />
            <button
              onClick={applyShader}
              class="text-xs bg-primary hover:bg-primary/80 text-white px-3 py-1.5 rounded transition-colors"
            >
              ▶ Run
            </button>
          </div>
        </div>
        <textarea
          value={fragCode}
          onInput={(e: any) => setFragCode(e.target.value)}
          rows={18}
          class="w-full bg-gray-950 px-4 py-3 font-mono text-xs text-green-300 focus:outline-none resize-none"
          spellcheck={false}
          style={{ tabSize: 2 }}
        />
      </div>

      <div class="bg-blue-950/30 border border-blue-800/40 rounded-xl p-4 text-xs text-blue-300/80 space-y-1">
        <div class="font-medium text-blue-300">Available uniforms</div>
        <ul class="space-y-0.5">
          <li><code class="font-mono bg-blue-950/50 px-1 rounded">uniform float u_time</code> — seconds since page load</li>
          <li><code class="font-mono bg-blue-950/50 px-1 rounded">uniform vec2 u_resolution</code> — canvas width/height in pixels</li>
          <li><code class="font-mono bg-blue-950/50 px-1 rounded">uniform vec2 u_mouse</code> — mouse position in pixels (0,0 = bottom-left)</li>
        </ul>
        <div class="pt-1">Move your mouse over the canvas to interact with u_mouse. Click <strong>Run</strong> after editing.</div>
      </div>
    </div>
  );
}
