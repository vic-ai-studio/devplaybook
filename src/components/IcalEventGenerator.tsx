import { useState } from 'preact/hooks';

type RepeatRule = 'none' | 'daily' | 'weekly' | 'monthly';

interface EventData {
  title: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  location: string;
  description: string;
  organizer: string;
  repeat: RepeatRule;
  repeatCount: number;
}

function pad(n: number) { return String(n).padStart(2, '0'); }

function toIcalDate(date: string, time: string): string {
  // date: YYYY-MM-DD, time: HH:MM
  const [y, m, d] = date.split('-');
  const [h, min] = time.split(':');
  return `${y}${m}${d}T${h}${min}00`;
}

function generateUID(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `${ts}-${rand}@devplaybook.cc`;
}

function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let i = 0;
  chunks.push(line.substring(0, 75));
  i = 75;
  while (i < line.length) {
    chunks.push(' ' + line.substring(i, i + 74));
    i += 74;
  }
  return chunks.join('\r\n');
}

function generateIcal(event: EventData): string {
  const now = new Date();
  const dtStamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}T${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}Z`;
  const dtStart = toIcalDate(event.startDate, event.startTime);
  const dtEnd = toIcalDate(event.endDate, event.endTime);
  const uid = generateUID();

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DevPlaybook//iCal Event Generator//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    foldLine(`UID:${uid}`),
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    foldLine(`SUMMARY:${event.title.replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n')}`),
  ];

  if (event.location) {
    lines.push(foldLine(`LOCATION:${event.location.replace(/,/g, '\\,').replace(/;/g, '\\;')}`));
  }
  if (event.description) {
    lines.push(foldLine(`DESCRIPTION:${event.description.replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n')}`));
  }
  if (event.organizer) {
    lines.push(foldLine(`ORGANIZER;CN=${event.organizer}:MAILTO:${event.organizer}`));
  }

  if (event.repeat !== 'none') {
    const freq = event.repeat.toUpperCase();
    const count = event.repeatCount > 0 ? `;COUNT=${event.repeatCount}` : '';
    lines.push(`RRULE:FREQ=${freq}${count}`);
  }

  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n');
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function nowTimeStr() {
  const d = new Date();
  const next = new Date(d.getTime() + 3600000);
  return `${pad(d.getHours())}:${pad(0)}`;
}

export default function IcalEventGenerator() {
  const [event, setEvent] = useState<EventData>({
    title: 'Team Standup',
    startDate: todayStr(),
    startTime: '09:00',
    endDate: todayStr(),
    endTime: '09:30',
    location: '',
    description: '',
    organizer: '',
    repeat: 'none',
    repeatCount: 10,
  });
  const [preview, setPreview] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const set = (key: keyof EventData, value: string | number) => {
    setEvent(prev => ({ ...prev, [key]: value }));
  };

  const validate = (): string => {
    if (!event.title.trim()) return 'Title is required.';
    if (!event.startDate || !event.startTime) return 'Start date and time are required.';
    if (!event.endDate || !event.endTime) return 'End date and time are required.';
    const start = new Date(`${event.startDate}T${event.startTime}`);
    const end = new Date(`${event.endDate}T${event.endTime}`);
    if (end <= start) return 'End time must be after start time.';
    return '';
  };

  const handlePreview = () => {
    const err = validate();
    if (err) { setError(err); setShowPreview(false); return; }
    setError('');
    const ical = generateIcal(event);
    setPreview(ical);
    setShowPreview(true);
  };

  const handleDownload = () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    const ical = generateIcal(event);
    const blob = new Blob([ical], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    const ical = generateIcal(event);
    navigator.clipboard.writeText(ical).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const inputClass = 'w-full px-3 py-2 rounded-lg bg-surface border border-border text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent';
  const labelClass = 'block text-xs text-text-muted mb-1';

  return (
    <div class="space-y-5">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Title */}
        <div class="md:col-span-2">
          <label class={labelClass}>Event Title *</label>
          <input value={event.title} onInput={e => set('title', (e.target as HTMLInputElement).value)}
            class={inputClass} placeholder="Team Standup" />
        </div>

        {/* Start */}
        <div>
          <label class={labelClass}>Start Date *</label>
          <input type="date" value={event.startDate} onInput={e => set('startDate', (e.target as HTMLInputElement).value)}
            class={inputClass} />
        </div>
        <div>
          <label class={labelClass}>Start Time *</label>
          <input type="time" value={event.startTime} onInput={e => set('startTime', (e.target as HTMLInputElement).value)}
            class={inputClass} />
        </div>

        {/* End */}
        <div>
          <label class={labelClass}>End Date *</label>
          <input type="date" value={event.endDate} onInput={e => set('endDate', (e.target as HTMLInputElement).value)}
            class={inputClass} />
        </div>
        <div>
          <label class={labelClass}>End Time *</label>
          <input type="time" value={event.endTime} onInput={e => set('endTime', (e.target as HTMLInputElement).value)}
            class={inputClass} />
        </div>

        {/* Location */}
        <div class="md:col-span-2">
          <label class={labelClass}>Location</label>
          <input value={event.location} onInput={e => set('location', (e.target as HTMLInputElement).value)}
            class={inputClass} placeholder="Conference Room A / Zoom link / etc." />
        </div>

        {/* Description */}
        <div class="md:col-span-2">
          <label class={labelClass}>Description</label>
          <textarea value={event.description} onInput={e => set('description', (e.target as HTMLTextAreaElement).value)}
            class={`${inputClass} resize-none`} rows={3} placeholder="Meeting agenda, notes, or details..." />
        </div>

        {/* Organizer */}
        <div>
          <label class={labelClass}>Organizer Email</label>
          <input type="email" value={event.organizer} onInput={e => set('organizer', (e.target as HTMLInputElement).value)}
            class={inputClass} placeholder="organizer@example.com" />
        </div>

        {/* Repeat rule */}
        <div>
          <label class={labelClass}>Repeat</label>
          <select value={event.repeat} onChange={e => set('repeat', (e.target as HTMLSelectElement).value as RepeatRule)}
            class={inputClass}>
            <option value="none">No repeat</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        {/* Repeat count */}
        {event.repeat !== 'none' && (
          <div>
            <label class={labelClass}>Occurrences (0 = forever)</label>
            <input type="number" min={0} max={365} value={event.repeatCount}
              onInput={e => set('repeatCount', parseInt((e.target as HTMLInputElement).value) || 0)}
              class={inputClass} />
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div class="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">{error}</div>
      )}

      {/* Actions */}
      <div class="flex flex-wrap gap-3">
        <button onClick={handleDownload}
          class="px-5 py-2.5 rounded-lg bg-accent text-white font-semibold text-sm hover:bg-accent/90 transition-colors">
          ⬇ Download .ics
        </button>
        <button onClick={handleCopy}
          class="px-5 py-2.5 rounded-lg border border-accent text-accent font-semibold text-sm hover:bg-accent/10 transition-colors">
          {copied ? '✓ Copied!' : 'Copy iCal'}
        </button>
        <button onClick={handlePreview}
          class="px-5 py-2.5 rounded-lg bg-surface border border-border text-text-muted font-medium text-sm hover:border-accent hover:text-accent transition-colors">
          {showPreview ? 'Hide Preview' : 'Preview iCal'}
        </button>
      </div>

      {/* Preview */}
      {showPreview && preview && (
        <div>
          <p class="text-xs text-text-muted mb-2">iCal (.ics) content preview</p>
          <pre class="p-4 rounded-xl bg-surface border border-border text-text text-xs font-mono overflow-auto max-h-80 whitespace-pre-wrap">{preview}</pre>
        </div>
      )}

      {/* Info */}
      <div class="rounded-xl bg-surface border border-border p-4 text-xs text-text-muted space-y-1">
        <p><span class="text-text font-medium">Compatible with:</span> Google Calendar, Apple Calendar, Outlook, Thunderbird, and any app that supports the iCalendar (RFC 5545) standard.</p>
        <p><span class="text-text font-medium">How to import:</span> Download the .ics file, then double-click it or import it in your calendar app.</p>
      </div>
    </div>
  );
}
