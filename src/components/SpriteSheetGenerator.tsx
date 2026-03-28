import { useState } from 'preact/hooks';

interface Config {
  sheetWidth: number;
  sheetHeight: number;
  spriteWidth: number;
  spriteHeight: number;
  spacing: number;
  padding: number;
  outputFormat: 'css' | 'js-object' | 'json' | 'phaser' | 'canvas';
  namePrefix: string;
  startIndex: number;
  rowMajor: boolean;
}

interface SpriteCoord {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  row: number;
  col: number;
  index: number;
}

function calcSprites(cfg: Config): { sprites: SpriteCoord[]; cols: number; rows: number; totalSprites: number } {
  const { sheetWidth, sheetHeight, spriteWidth, spriteHeight, spacing, padding } = cfg;
  const usableW = sheetWidth - padding * 2;
  const usableH = sheetHeight - padding * 2;
  const cols = Math.floor((usableW + spacing) / (spriteWidth + spacing));
  const rows = Math.floor((usableH + spacing) / (spriteHeight + spacing));
  const totalSprites = cols * rows;

  const sprites: SpriteCoord[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const index = cfg.rowMajor ? r * cols + c : c * rows + r;
      const x = padding + c * (spriteWidth + spacing);
      const y = padding + r * (spriteHeight + spacing);
      sprites.push({
        name: `${cfg.namePrefix}${cfg.startIndex + index}`,
        x, y,
        w: spriteWidth,
        h: spriteHeight,
        row: r,
        col: c,
        index,
      });
    }
  }
  return { sprites, cols, rows, totalSprites };
}

function generateOutput(sprites: SpriteCoord[], cfg: Config, format: Config['outputFormat']): string {
  if (format === 'css') {
    return sprites.map(s =>
      `.sprite-${s.name} {\n  background-position: -${s.x}px -${s.y}px;\n  width: ${s.w}px;\n  height: ${s.h}px;\n}`
    ).join('\n');
  }
  if (format === 'js-object') {
    const entries = sprites.map(s => `  ${s.name}: { x: ${s.x}, y: ${s.y}, w: ${s.w}, h: ${s.h} }`).join(',\n');
    return `const sprites = {\n${entries}\n};`;
  }
  if (format === 'json') {
    const frames: Record<string, object> = {};
    for (const s of sprites) {
      frames[s.name] = { frame: { x: s.x, y: s.y, w: s.w, h: s.h }, sourceSize: { w: s.w, h: s.h } };
    }
    return JSON.stringify({ frames, meta: { size: { w: cfg.sheetWidth, h: cfg.sheetHeight } } }, null, 2);
  }
  if (format === 'phaser') {
    return `// Phaser 3 sprite sheet config\nthis.load.spritesheet('${cfg.namePrefix}', 'spritesheet.png', {\n  frameWidth: ${cfg.spriteWidth},\n  frameHeight: ${cfg.spriteHeight},\n  spacing: ${cfg.spacing},\n  margin: ${cfg.padding}\n});\n\n// Access frames\nthis.add.image(x, y, '${cfg.namePrefix}', ${cfg.startIndex});\n\n// Animation\nthis.anims.create({\n  key: '${cfg.namePrefix}_anim',\n  frames: this.anims.generateFrameNumbers('${cfg.namePrefix}', { start: ${cfg.startIndex}, end: ${cfg.startIndex + Math.min(7, sprites.length - 1)} }),\n  frameRate: 12,\n  repeat: -1\n});`;
  }
  // canvas
  return `// Canvas drawImage from sprite sheet\nconst sheet = new Image();\nsheet.src = 'spritesheet.png';\nsheet.onload = () => {\n  const sprites = {\n${sprites.slice(0, 4).map(s => `    ${s.name}: [${s.x}, ${s.y}, ${s.w}, ${s.h}]`).join(',\n')}\n    // ... ${sprites.length} total sprites\n  };\n\n  function drawSprite(ctx, name, dx, dy) {\n    const [sx, sy, sw, sh] = sprites[name];\n    ctx.drawImage(sheet, sx, sy, sw, sh, dx, dy, sw, sh);\n  }\n\n  // Draw first sprite at (100, 100)\n  drawSprite(ctx, '${sprites[0]?.name}', 100, 100);\n};`;
}

export default function SpriteSheetGenerator() {
  const [cfg, setCfg] = useState<Config>({
    sheetWidth: 512,
    sheetHeight: 512,
    spriteWidth: 64,
    spriteHeight: 64,
    spacing: 2,
    padding: 0,
    outputFormat: 'css',
    namePrefix: 'sprite_',
    startIndex: 0,
    rowMajor: true,
  });
  const [copied, setCopied] = useState(false);

  const { sprites, cols, rows, totalSprites } = calcSprites(cfg);
  const output = generateOutput(sprites, cfg, cfg.outputFormat);

  const up = (patch: Partial<Config>) => setCfg(c => ({ ...c, ...patch }));

  const gridScale = Math.min(280 / cfg.sheetWidth, 280 / cfg.sheetHeight);

  return (
    <div class="space-y-5">
      {/* Inputs */}
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-xs text-gray-400 mb-1">Sheet Width (px)</label>
          <input type="number" value={cfg.sheetWidth} min={32} max={4096}
            onInput={e => up({ sheetWidth: parseInt((e.target as HTMLInputElement).value) || 512 })}
            class="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white" />
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Sheet Height (px)</label>
          <input type="number" value={cfg.sheetHeight} min={32} max={4096}
            onInput={e => up({ sheetHeight: parseInt((e.target as HTMLInputElement).value) || 512 })}
            class="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white" />
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Sprite Width (px)</label>
          <input type="number" value={cfg.spriteWidth} min={1} max={1024}
            onInput={e => up({ spriteWidth: parseInt((e.target as HTMLInputElement).value) || 64 })}
            class="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white" />
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Sprite Height (px)</label>
          <input type="number" value={cfg.spriteHeight} min={1} max={1024}
            onInput={e => up({ spriteHeight: parseInt((e.target as HTMLInputElement).value) || 64 })}
            class="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white" />
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Spacing (px)</label>
          <input type="number" value={cfg.spacing} min={0} max={64}
            onInput={e => up({ spacing: parseInt((e.target as HTMLInputElement).value) || 0 })}
            class="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white" />
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Padding (px)</label>
          <input type="number" value={cfg.padding} min={0} max={64}
            onInput={e => up({ padding: parseInt((e.target as HTMLInputElement).value) || 0 })}
            class="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white" />
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Name Prefix</label>
          <input type="text" value={cfg.namePrefix}
            onInput={e => up({ namePrefix: (e.target as HTMLInputElement).value })}
            class="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white" />
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Start Index</label>
          <input type="number" value={cfg.startIndex} min={0}
            onInput={e => up({ startIndex: parseInt((e.target as HTMLInputElement).value) || 0 })}
            class="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white" />
        </div>
        <div>
          <label class="block text-xs text-gray-400 mb-1">Output Format</label>
          <select value={cfg.outputFormat} onChange={e => up({ outputFormat: (e.target as HTMLSelectElement).value as Config['outputFormat'] })}
            class="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white">
            <option value="css">CSS background-position</option>
            <option value="js-object">JS Object</option>
            <option value="json">JSON (TexturePacker)</option>
            <option value="phaser">Phaser 3</option>
            <option value="canvas">Canvas drawImage</option>
          </select>
        </div>
      </div>

      {/* Summary */}
      <div class="grid grid-cols-4 gap-3">
        {[
          ['Columns', cols],
          ['Rows', rows],
          ['Total Sprites', totalSprites],
          ['Sheet Size', `${cfg.sheetWidth}×${cfg.sheetHeight}`],
        ].map(([label, value]) => (
          <div key={label as string} class="bg-gray-800 border border-gray-700 rounded-lg p-3 text-center">
            <p class="text-xs text-gray-400">{label}</p>
            <p class="text-xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Visual grid preview */}
      <div>
        <h3 class="text-sm font-semibold text-gray-300 mb-2">Sprite Grid Preview</h3>
        <div class="bg-gray-900 border border-gray-700 rounded-lg p-4 overflow-auto">
          <div
            class="relative bg-gray-950 border border-gray-600"
            style={{ width: `${cfg.sheetWidth * gridScale}px`, height: `${cfg.sheetHeight * gridScale}px` }}
          >
            {sprites.slice(0, Math.min(200, sprites.length)).map(s => (
              <div
                key={s.name}
                class="absolute border border-blue-500/60 bg-blue-500/10 flex items-center justify-center"
                style={{
                  left: `${s.x * gridScale}px`,
                  top: `${s.y * gridScale}px`,
                  width: `${s.w * gridScale}px`,
                  height: `${s.h * gridScale}px`,
                }}
                title={`${s.name}: x=${s.x} y=${s.y}`}
              >
                <span class="text-blue-400 font-mono" style={{ fontSize: `${Math.max(6, Math.min(10, s.w * gridScale * 0.2))}px` }}>
                  {s.index}
                </span>
              </div>
            ))}
          </div>
          <p class="text-xs text-gray-500 mt-2">Sheet: {cfg.sheetWidth}×{cfg.sheetHeight}px — {totalSprites} sprites ({cols} cols × {rows} rows)</p>
        </div>
      </div>

      {/* Output */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-sm font-semibold text-gray-300">Generated Code</h3>
          <button onClick={() => { navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            class={`text-xs px-3 py-1 rounded font-medium transition-colors ${copied ? 'bg-green-700 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}>
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <pre class="bg-gray-900 border border-gray-700 rounded p-3 text-xs text-green-300 overflow-auto max-h-72 font-mono whitespace-pre">
          {output}
        </pre>
      </div>
    </div>
  );
}
