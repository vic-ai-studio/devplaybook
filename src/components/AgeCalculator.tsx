import { useState, useEffect } from 'preact/hooks';

function pad(n: number) { return String(n).padStart(2, '0'); }

const CHINESE_ZODIAC = ['Rat 🐀','Ox 🐂','Tiger 🐅','Rabbit 🐇','Dragon 🐉','Snake 🐍','Horse 🐴','Goat 🐐','Monkey 🐒','Rooster 🐓','Dog 🐕','Pig 🐷'];
const WESTERN_ZODIAC = [
  { sign: 'Capricorn ♑', start: [12, 22], end: [1, 19] },
  { sign: 'Aquarius ♒', start: [1, 20], end: [2, 18] },
  { sign: 'Pisces ♓', start: [2, 19], end: [3, 20] },
  { sign: 'Aries ♈', start: [3, 21], end: [4, 19] },
  { sign: 'Taurus ♉', start: [4, 20], end: [5, 20] },
  { sign: 'Gemini ♊', start: [5, 21], end: [6, 20] },
  { sign: 'Cancer ♋', start: [6, 21], end: [7, 22] },
  { sign: 'Leo ♌', start: [7, 23], end: [8, 22] },
  { sign: 'Virgo ♍', start: [8, 23], end: [9, 22] },
  { sign: 'Libra ♎', start: [9, 23], end: [10, 22] },
  { sign: 'Scorpio ♏', start: [10, 23], end: [11, 21] },
  { sign: 'Sagittarius ♐', start: [11, 22], end: [12, 21] },
];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getChineseZodiac(year: number): string {
  return CHINESE_ZODIAC[((year - 4) % 12 + 12) % 12];
}

function getWesternZodiac(month: number, day: number): string {
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'Capricorn ♑';
  for (const z of WESTERN_ZODIAC) {
    const [sm, sd] = z.start;
    const [em, ed] = z.end;
    if ((month === sm && day >= sd) || (month === em && day <= ed)) return z.sign;
  }
  return '';
}

interface AgeResult {
  years: number;
  months: number;
  days: number;
  totalDays: number;
  totalWeeks: number;
  totalMonths: number;
  nextBirthday: { days: number; date: string };
  dayOfWeekBorn: string;
  chineseZodiac: string;
  westernZodiac: string;
  birthdate: Date;
}

function calculateAge(birthdateStr: string): AgeResult | null {
  if (!birthdateStr) return null;
  const birth = new Date(birthdateStr + 'T00:00:00');
  if (isNaN(birth.getTime())) return null;

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (birth > now) return null;

  // Exact years, months, days
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  let days = now.getDate() - birth.getDate();

  if (days < 0) {
    months--;
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  // Total values
  const totalDays = Math.floor((now.getTime() - birth.getTime()) / 86400000);
  const totalWeeks = Math.floor(totalDays / 7);
  const totalMonths = years * 12 + months;

  // Next birthday
  let nextBday = new Date(now.getFullYear(), birth.getMonth(), birth.getDate());
  if (nextBday <= now) {
    nextBday = new Date(now.getFullYear() + 1, birth.getMonth(), birth.getDate());
  }
  const daysToNextBday = Math.ceil((nextBday.getTime() - now.getTime()) / 86400000);
  const nextBdayStr = nextBday.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  // Day of week born
  const dayOfWeekBorn = WEEKDAYS[birth.getDay()];

  // Chinese zodiac (based on Gregorian year, simplified)
  const chineseZodiac = getChineseZodiac(birth.getFullYear());

  // Western zodiac
  const westernZodiac = getWesternZodiac(birth.getMonth() + 1, birth.getDate());

  return {
    years, months, days,
    totalDays, totalWeeks, totalMonths,
    nextBirthday: { days: daysToNextBday, date: nextBdayStr },
    dayOfWeekBorn,
    chineseZodiac,
    westernZodiac,
    birthdate: birth,
  };
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function AgeCalculator() {
  const [birthdate, setBirthdate] = useState('');
  const [result, setResult] = useState<AgeResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!birthdate) { setResult(null); setError(''); return; }
    const r = calculateAge(birthdate);
    if (!r) {
      setError('Please enter a valid birthdate that is not in the future.');
      setResult(null);
    } else {
      setError('');
      setResult(r);
    }
  }, [birthdate]);

  const statCard = (label: string, value: string, sub?: string) => (
    <div class="rounded-xl bg-surface border border-border p-4 text-center">
      <p class="text-xs text-text-muted mb-1">{label}</p>
      <p class="text-2xl font-bold text-accent">{value}</p>
      {sub && <p class="text-xs text-text-muted mt-1">{sub}</p>}
    </div>
  );

  return (
    <div class="space-y-6">
      {/* Input */}
      <div class="max-w-xs">
        <label class="block text-sm font-medium text-text mb-2">Date of Birth</label>
        <input
          type="date"
          value={birthdate}
          max={todayStr()}
          onInput={e => setBirthdate((e.target as HTMLInputElement).value)}
          class="w-full px-4 py-3 rounded-xl bg-surface border border-border text-text text-base focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      {/* Error */}
      {error && (
        <div class="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">{error}</div>
      )}

      {/* Result */}
      {result && (
        <div class="space-y-5">
          {/* Main age */}
          <div class="rounded-2xl bg-gradient-to-br from-accent/10 to-surface border border-accent/20 p-6 text-center">
            <p class="text-sm text-text-muted mb-2">You are</p>
            <p class="text-5xl font-bold text-accent">{result.years}</p>
            <p class="text-xl font-semibold text-text mt-1">years old</p>
            <p class="text-text-muted mt-2">
              {result.months > 0 || result.days > 0 ? (
                <>
                  {result.months > 0 && `${result.months} month${result.months !== 1 ? 's' : ''}`}
                  {result.months > 0 && result.days > 0 && ' and '}
                  {result.days > 0 && `${result.days} day${result.days !== 1 ? 's' : ''}`}
                  {' '}older
                </>
              ) : 'exactly!'}
            </p>
          </div>

          {/* Stats grid */}
          <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
            {statCard('Total Days', result.totalDays.toLocaleString())}
            {statCard('Total Weeks', result.totalWeeks.toLocaleString())}
            {statCard('Total Months', result.totalMonths.toLocaleString())}
          </div>

          {/* Details */}
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Next birthday */}
            <div class="rounded-xl bg-surface border border-border p-4">
              <p class="text-xs text-text-muted mb-1">🎂 Next Birthday</p>
              <p class="text-text font-semibold">{result.nextBirthday.date}</p>
              <p class="text-sm text-accent">
                {result.nextBirthday.days === 0
                  ? '🎉 Today is your birthday!'
                  : `${result.nextBirthday.days} day${result.nextBirthday.days !== 1 ? 's' : ''} away`}
              </p>
            </div>

            {/* Day of week born */}
            <div class="rounded-xl bg-surface border border-border p-4">
              <p class="text-xs text-text-muted mb-1">📅 Born On</p>
              <p class="text-text font-semibold">{result.dayOfWeekBorn}</p>
              <p class="text-sm text-text-muted">{result.birthdate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            </div>

            {/* Western zodiac */}
            <div class="rounded-xl bg-surface border border-border p-4">
              <p class="text-xs text-text-muted mb-1">⭐ Western Zodiac</p>
              <p class="text-text font-semibold text-lg">{result.westernZodiac}</p>
            </div>

            {/* Chinese zodiac */}
            <div class="rounded-xl bg-surface border border-border p-4">
              <p class="text-xs text-text-muted mb-1">🏮 Chinese Zodiac</p>
              <p class="text-text font-semibold text-lg">Year of the {result.chineseZodiac}</p>
              <p class="text-xs text-text-muted">(Gregorian year — simplified)</p>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!result && !error && (
        <div class="rounded-xl bg-surface border border-border p-8 text-center text-text-muted">
          <p class="text-3xl mb-3">🎂</p>
          <p>Enter your birthdate to calculate your exact age.</p>
        </div>
      )}
    </div>
  );
}
