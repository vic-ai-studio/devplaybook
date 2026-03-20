import { useState, useEffect } from 'preact/hooks';

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'America/Toronto',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Australia/Sydney',
  'Pacific/Auckland',
  'Pacific/Honolulu',
];

const TZ_LABELS: Record<string, string> = {
  'UTC': 'UTC',
  'America/New_York': 'New York (ET)',
  'America/Chicago': 'Chicago (CT)',
  'America/Denver': 'Denver (MT)',
  'America/Los_Angeles': 'Los Angeles (PT)',
  'America/Sao_Paulo': 'São Paulo (BRT)',
  'America/Toronto': 'Toronto (ET)',
  'Europe/London': 'London (GMT/BST)',
  'Europe/Paris': 'Paris (CET)',
  'Europe/Berlin': 'Berlin (CET)',
  'Europe/Moscow': 'Moscow (MSK)',
  'Asia/Dubai': 'Dubai (GST)',
  'Asia/Kolkata': 'Mumbai (IST)',
  'Asia/Bangkok': 'Bangkok (ICT)',
  'Asia/Singapore': 'Singapore (SGT)',
  'Asia/Shanghai': 'Shanghai (CST)',
  'Asia/Tokyo': 'Tokyo (JST)',
  'Asia/Seoul': 'Seoul (KST)',
  'Australia/Sydney': 'Sydney (AEST)',
  'Pacific/Auckland': 'Auckland (NZST)',
  'Pacific/Honolulu': 'Honolulu (HST)',
};

function formatInTZ(date: Date, tz: string): { time: string; date: string; offset: string } {
  const opts: Intl.DateTimeFormatOptions = {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  };
  const dateOpts: Intl.DateTimeFormatOptions = {
    timeZone: tz,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  };
  const offsetOpts: Intl.DateTimeFormatOptions = {
    timeZone: tz,
    timeZoneName: 'short',
  };
  const time = new Intl.DateTimeFormat('en-US', opts).format(date);
  const dateStr = new Intl.DateTimeFormat('en-US', dateOpts).format(date);
  const parts = new Intl.DateTimeFormat('en-US', offsetOpts).formatToParts(date);
  const tzName = parts.find(p => p.type === 'timeZoneName')?.value || '';
  return { time, date: dateStr, offset: tzName };
}

function parseLocalInput(dateStr: string, timeStr: string, tz: string): Date | null {
  try {
    const combined = `${dateStr}T${timeStr}:00`;
    // Use Intl to figure out the UTC equivalent
    const tempDate = new Date(combined);
    if (isNaN(tempDate.getTime())) return null;
    // Adjust: the input is "in tz", convert to UTC
    const formatter = new Intl.DateTimeFormat('sv-SE', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    // Binary search approach: find UTC time that represents the local time in tz
    // Simple approximation: get offset by comparing formatted local time
    const utcMs = tempDate.getTime();
    const localStr = formatter.format(new Date(utcMs)).replace(' ', 'T');
    const localDate = new Date(localStr + 'Z');
    const diff = utcMs - localDate.getTime();
    return new Date(utcMs + diff);
  } catch {
    return null;
  }
}

export default function TimezoneConverter() {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 5);

  const [inputDate, setInputDate] = useState(todayStr);
  const [inputTime, setInputTime] = useState(timeStr);
  const [inputTZ, setInputTZ] = useState('UTC');
  const [selectedTZs, setSelectedTZs] = useState(['America/New_York', 'Europe/London', 'Asia/Tokyo', 'Australia/Sydney']);
  const [addTZ, setAddTZ] = useState('');
  const [liveDate, setLiveDate] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setLiveDate(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const baseDate = parseLocalInput(inputDate, inputTime, inputTZ) || new Date();

  function toggleTZ(tz: string) {
    setSelectedTZs(prev => prev.includes(tz) ? prev.filter(t => t !== tz) : [...prev, tz]);
  }

  function handleAdd() {
    const val = addTZ.trim();
    if (val && !selectedTZs.includes(val) && TIMEZONES.includes(val)) {
      setSelectedTZs(prev => [...prev, val]);
      setAddTZ('');
    }
  }

  const copyRow = (tz: string) => {
    const { time, date, offset } = formatInTZ(baseDate, tz);
    navigator.clipboard?.writeText(`${TZ_LABELS[tz] || tz}: ${time} ${offset} — ${date}`);
  };

  const availableToAdd = TIMEZONES.filter(tz => !selectedTZs.includes(tz));

  return (
    <div class="space-y-5">
      {/* Live clock */}
      <div class="bg-gray-900 rounded-xl border border-gray-700 p-4 flex items-center gap-4">
        <div class="text-3xl">🕐</div>
        <div>
          <div class="font-semibold text-gray-100 text-lg">{liveDate.toUTCString().replace('GMT', 'UTC')}</div>
          <div class="text-xs text-gray-400">Your local: {liveDate.toLocaleString()}</div>
        </div>
      </div>

      {/* Input time */}
      <div class="bg-gray-900 rounded-xl border border-gray-700 p-4">
        <p class="text-sm font-medium text-gray-300 mb-3">Convert from</p>
        <div class="flex flex-wrap gap-3">
          <input
            type="date"
            value={inputDate}
            onInput={e => setInputDate((e.target as HTMLInputElement).value)}
            class="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-indigo-500"
          />
          <input
            type="time"
            value={inputTime}
            onInput={e => setInputTime((e.target as HTMLInputElement).value)}
            class="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-indigo-500"
          />
          <select
            value={inputTZ}
            onChange={e => setInputTZ((e.target as HTMLSelectElement).value)}
            class="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-indigo-500"
          >
            {TIMEZONES.map(tz => (
              <option key={tz} value={tz}>{TZ_LABELS[tz] || tz}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Results */}
      <div class="space-y-2">
        {selectedTZs.map(tz => {
          const { time, date, offset } = formatInTZ(baseDate, tz);
          return (
            <div key={tz} class="bg-gray-900 rounded-xl border border-gray-700 p-4 flex items-center justify-between gap-4">
              <div class="flex-1 min-w-0">
                <div class="text-xs text-gray-400 mb-1">{TZ_LABELS[tz] || tz}</div>
                <div class="flex items-baseline gap-3">
                  <span class="text-2xl font-mono font-bold text-indigo-400">{time}</span>
                  <span class="text-sm text-gray-400">{offset}</span>
                </div>
                <div class="text-xs text-gray-500 mt-0.5">{date}</div>
              </div>
              <div class="flex items-center gap-2">
                <button
                  onClick={() => copyRow(tz)}
                  class="text-xs text-gray-500 hover:text-indigo-400 transition-colors px-2 py-1 border border-gray-700 rounded-lg"
                  title="Copy"
                >
                  Copy
                </button>
                <button
                  onClick={() => setSelectedTZs(prev => prev.filter(t => t !== tz))}
                  class="text-xs text-gray-600 hover:text-red-400 transition-colors px-2 py-1"
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add timezone */}
      {availableToAdd.length > 0 && (
        <div class="bg-gray-900 rounded-xl border border-gray-700 p-4">
          <p class="text-sm font-medium text-gray-300 mb-3">Add timezone</p>
          <div class="flex gap-2">
            <select
              value={addTZ}
              onChange={e => setAddTZ((e.target as HTMLSelectElement).value)}
              class="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="">Select timezone…</option>
              {availableToAdd.map(tz => (
                <option key={tz} value={tz}>{TZ_LABELS[tz] || tz}</option>
              ))}
            </select>
            <button
              onClick={handleAdd}
              disabled={!addTZ}
              class="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Add
            </button>
          </div>
          <div class="flex flex-wrap gap-2 mt-3">
            {availableToAdd.slice(0, 8).map(tz => (
              <button
                key={tz}
                onClick={() => setSelectedTZs(prev => [...prev, tz])}
                class="text-xs text-gray-400 hover:text-indigo-400 border border-gray-700 hover:border-indigo-500 px-2 py-1 rounded-full transition-colors"
              >
                + {TZ_LABELS[tz] || tz}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Copy all */}
      <button
        onClick={() => {
          const lines = selectedTZs.map(tz => {
            const { time, date, offset } = formatInTZ(baseDate, tz);
            return `${TZ_LABELS[tz] || tz}: ${time} ${offset} — ${date}`;
          }).join('\n');
          navigator.clipboard?.writeText(lines);
        }}
        class="w-full bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        Copy All as Text
      </button>
    </div>
  );
}
