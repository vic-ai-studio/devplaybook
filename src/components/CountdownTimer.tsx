import { useState, useEffect, useRef } from 'preact/hooks';

function pad(n: number) { return String(n).padStart(2, '0'); }

function formatRemaining(ms: number) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return { d, h, m, s, totalSec };
}

const PRESETS = [
  { label: '5 min', ms: 5 * 60 * 1000 },
  { label: '10 min', ms: 10 * 60 * 1000 },
  { label: '15 min', ms: 15 * 60 * 1000 },
  { label: '30 min', ms: 30 * 60 * 1000 },
  { label: '1 hour', ms: 60 * 60 * 1000 },
  { label: '24 hours', ms: 24 * 60 * 60 * 1000 },
];

export default function CountdownTimer() {
  const [targetDate, setTargetDate] = useState('');
  const [customMs, setCustomMs] = useState(0);
  const [mode, setMode] = useState<'date' | 'duration'>('duration');
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [finished, setFinished] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endRef = useRef<number>(0);

  const startTimer = (ms: number) => {
    if (ms <= 0) return;
    endRef.current = Date.now() + ms;
    setRemaining(ms);
    setFinished(false);
    setRunning(true);
  };

  const startFromDate = () => {
    if (!targetDate) return;
    const end = new Date(targetDate).getTime();
    const ms = end - Date.now();
    if (ms <= 0) { alert('Target date must be in the future!'); return; }
    endRef.current = end;
    setRemaining(ms);
    setFinished(false);
    setRunning(true);
  };

  const stop = () => { setRunning(false); if (intervalRef.current) clearInterval(intervalRef.current); };
  const reset = () => { stop(); setRemaining(0); setFinished(false); };

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        const rem = endRef.current - Date.now();
        if (rem <= 0) {
          setRemaining(0);
          setRunning(false);
          setFinished(true);
          clearInterval(intervalRef.current!);
        } else {
          setRemaining(rem);
        }
      }, 250);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  const { d, h, m, s, totalSec } = formatRemaining(remaining);
  const durationMs = mode === 'date' ? (targetDate ? new Date(targetDate).getTime() - Date.now() : 0) : customMs;
  const progress = endRef.current && remaining > 0
    ? Math.max(0, Math.min(100, (remaining / (endRef.current - (endRef.current - (endRef.current - (Date.now() - remaining + remaining))))) * 100))
    : 0;

  // Simpler progress calculation
  const startMs = endRef.current ? endRef.current - (Date.now() - remaining + remaining) : 0;

  return (
    <div class="space-y-5">
      {/* Mode tabs */}
      <div class="flex gap-2">
        {(['duration', 'date'] as const).map(m => (
          <button key={m} onClick={() => { setMode(m); reset(); }}
            class={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${mode === m ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'}`}>
            {m === 'duration' ? '⏱ Duration' : '📅 Target Date'}
          </button>
        ))}
      </div>

      {/* Input */}
      <div class="bg-gray-900 rounded-xl border border-gray-700 p-5 space-y-4">
        {mode === 'duration' ? (
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Preset Durations</label>
            <div class="flex flex-wrap gap-2">
              {PRESETS.map(p => (
                <button key={p.label} onClick={() => setCustomMs(p.ms)}
                  class={`px-3 py-1.5 text-sm rounded-md border transition-colors ${customMs === p.ms ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'}`}>
                  {p.label}
                </button>
              ))}
            </div>
            <div class="mt-3 flex gap-2">
              <label class="block text-sm text-gray-400 self-center">Custom (minutes):</label>
              <input type="number" min={1} max={99999}
                placeholder="e.g. 45"
                onInput={e => setCustomMs(Number((e.target as HTMLInputElement).value) * 60000)}
                class="w-24 bg-gray-800 text-gray-100 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        ) : (
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Target Date & Time</label>
            <input type="datetime-local" value={targetDate}
              onInput={e => setTargetDate((e.target as HTMLInputElement).value)}
              class="bg-gray-800 text-gray-100 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
        )}

        {/* Controls */}
        <div class="flex gap-3">
          {!running ? (
            <button onClick={() => mode === 'date' ? startFromDate() : startTimer(customMs)}
              disabled={mode === 'duration' ? !customMs : !targetDate}
              class="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold px-6 py-2 rounded-lg transition-colors text-sm">
              Start
            </button>
          ) : (
            <button onClick={stop}
              class="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors text-sm">
              Pause
            </button>
          )}
          <button onClick={reset}
            class="bg-gray-700 hover:bg-gray-600 text-white font-semibold px-6 py-2 rounded-lg transition-colors text-sm">
            Reset
          </button>
        </div>
      </div>

      {/* Display */}
      <div class={`bg-gray-900 rounded-xl border p-8 text-center transition-colors ${finished ? 'border-green-500 bg-green-900/10' : 'border-gray-700'}`}>
        {finished ? (
          <div>
            <div class="text-5xl mb-3">✅</div>
            <p class="text-2xl font-bold text-green-400">Time's up!</p>
          </div>
        ) : (
          <div>
            <div class="flex items-center justify-center gap-3 font-mono">
              {d > 0 && <>
                <div class="text-center"><div class="text-5xl font-bold text-indigo-400">{pad(d)}</div><div class="text-xs text-gray-500 mt-1">DAYS</div></div>
                <span class="text-4xl text-gray-600 pb-4">:</span>
              </>}
              <div class="text-center"><div class="text-5xl font-bold text-gray-100">{pad(h)}</div><div class="text-xs text-gray-500 mt-1">HRS</div></div>
              <span class="text-4xl text-gray-600 pb-4">:</span>
              <div class="text-center"><div class="text-5xl font-bold text-gray-100">{pad(m)}</div><div class="text-xs text-gray-500 mt-1">MIN</div></div>
              <span class="text-4xl text-gray-600 pb-4">:</span>
              <div class="text-center"><div class="text-5xl font-bold text-gray-100">{pad(s)}</div><div class="text-xs text-gray-500 mt-1">SEC</div></div>
            </div>
            {totalSec === 0 && !running && !finished && (
              <p class="text-gray-600 text-sm mt-4">Set a duration and press Start</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
