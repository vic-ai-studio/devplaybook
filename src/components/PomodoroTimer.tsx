import { useState, useEffect, useRef, useCallback } from 'preact/hooks';

type Mode = 'work' | 'short' | 'long';

const MODES: Record<Mode, { label: string; minutes: number; color: string }> = {
  work:  { label: 'Focus',        minutes: 25, color: 'text-primary' },
  short: { label: 'Short Break',  minutes: 5,  color: 'text-green-400' },
  long:  { label: 'Long Break',   minutes: 15, color: 'text-blue-400' },
};

function beep(ctx: AudioContext, freq = 880, duration = 0.15, gain = 0.3) {
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.connect(gainNode);
  gainNode.connect(ctx.destination);
  osc.frequency.value = freq;
  gainNode.gain.setValueAtTime(gain, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

function playDone(ctx: AudioContext) {
  beep(ctx, 660, 0.12, 0.3);
  setTimeout(() => beep(ctx, 880, 0.12, 0.3), 150);
  setTimeout(() => beep(ctx, 1100, 0.2, 0.25), 300);
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export default function PomodoroTimer() {
  const [mode, setMode] = useState<Mode>('work');
  const [secondsLeft, setSecondsLeft] = useState(MODES.work.minutes * 60);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current;
  }, []);

  const resetTimer = useCallback((m: Mode) => {
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setSecondsLeft(MODES[m].minutes * 60);
  }, []);

  const switchMode = useCallback((m: Mode) => {
    setMode(m);
    resetTimer(m);
  }, [resetTimer]);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(intervalRef.current!);
          setRunning(false);
          if (soundEnabled) {
            try { playDone(getAudioCtx()); } catch {}
          }
          if (mode === 'work') setSessions(n => n + 1);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, [running, mode, soundEnabled, getAudioCtx]);

  const total = MODES[mode].minutes * 60;
  const progress = ((total - secondsLeft) / total) * 100;
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const colorClass = MODES[mode].color;

  // Update page title
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = running
        ? `${pad(mins)}:${pad(secs)} — ${MODES[mode].label} | Pomodoro Timer`
        : 'Pomodoro Timer | DevPlaybook';
    }
  }, [running, mins, secs, mode]);

  return (
    <div class="max-w-md mx-auto">
      {/* Mode tabs */}
      <div class="flex gap-2 mb-8 justify-center">
        {(Object.keys(MODES) as Mode[]).map(m => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            class={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === m
                ? 'bg-primary text-white'
                : 'bg-bg-card border border-border text-text-muted hover:text-text'
            }`}
          >
            {MODES[m].label}
          </button>
        ))}
      </div>

      {/* Timer circle */}
      <div class="relative flex items-center justify-center mb-8">
        <svg class="w-56 h-56 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" stroke-width="3" class="text-border opacity-30" />
          <circle
            cx="50" cy="50" r="45"
            fill="none" stroke="currentColor" stroke-width="3"
            class={colorClass}
            stroke-dasharray={`${2 * Math.PI * 45}`}
            stroke-dashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
            stroke-linecap="round"
            style="transition: stroke-dashoffset 0.5s ease"
          />
        </svg>
        <div class="absolute text-center">
          <div class={`text-5xl font-mono font-bold ${colorClass}`}>
            {pad(mins)}:{pad(secs)}
          </div>
          <div class="text-text-muted text-sm mt-1">{MODES[mode].label}</div>
        </div>
      </div>

      {/* Controls */}
      <div class="flex gap-3 justify-center mb-6">
        <button
          onClick={() => {
            if (!running) {
              // Resume audio context on user gesture
              try { getAudioCtx().resume(); } catch {}
            }
            setRunning(r => !r);
          }}
          class="px-8 py-3 rounded-xl font-semibold text-white bg-primary hover:bg-primary-dark transition-colors text-lg"
        >
          {running ? '⏸ Pause' : secondsLeft < total ? '▶ Resume' : '▶ Start'}
        </button>
        <button
          onClick={() => resetTimer(mode)}
          class="px-5 py-3 rounded-xl font-medium bg-bg-card border border-border hover:border-primary text-text-muted hover:text-text transition-colors"
        >
          ↺ Reset
        </button>
      </div>

      {/* Sessions & sound */}
      <div class="flex items-center justify-between bg-bg-card border border-border rounded-xl px-5 py-4">
        <div class="text-center">
          <div class="text-3xl font-bold text-primary">{sessions}</div>
          <div class="text-text-muted text-xs mt-0.5">Sessions done</div>
        </div>
        <div class="h-8 w-px bg-border" />
        <div class="text-center">
          <div class="text-3xl font-bold text-text">{Math.floor(sessions / 4)}</div>
          <div class="text-text-muted text-xs mt-0.5">Long breaks earned</div>
        </div>
        <div class="h-8 w-px bg-border" />
        <button
          onClick={() => setSoundEnabled(s => !s)}
          class={`flex items-center gap-2 text-sm font-medium transition-colors ${soundEnabled ? 'text-primary' : 'text-text-muted'}`}
          title={soundEnabled ? 'Sound on — click to mute' : 'Sound off — click to enable'}
        >
          <span class="text-xl">{soundEnabled ? '🔔' : '🔕'}</span>
          <span class="text-xs">{soundEnabled ? 'Sound on' : 'Muted'}</span>
        </button>
      </div>

      {/* How it works */}
      <div class="mt-8 bg-bg-card border border-border rounded-xl p-5 text-sm text-text-muted space-y-1">
        <p class="font-semibold text-text mb-2">How Pomodoro works</p>
        <p>1. Start a 25-minute focus session.</p>
        <p>2. Take a 5-minute short break.</p>
        <p>3. After 4 sessions, take a 15-minute long break.</p>
        <p>4. Repeat. Sessions tracked automatically.</p>
      </div>
    </div>
  );
}
