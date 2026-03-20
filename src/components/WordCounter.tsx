import { useState, useMemo } from 'preact/hooks';

const READING_SPEED = 238; // avg words per minute

function count(text: string) {
  const trimmed = text.trim();
  const words = trimmed === '' ? 0 : trimmed.split(/\s+/).length;
  const chars = text.length;
  const charsNoSpaces = text.replace(/\s/g, '').length;
  const sentences = trimmed === '' ? 0 : (trimmed.match(/[.!?]+/g) || []).length;
  const paragraphs = trimmed === '' ? 0 : trimmed.split(/\n{2,}/).filter(p => p.trim() !== '').length;
  const lines = text.split('\n').length;
  const readTimeSec = Math.round((words / READING_SPEED) * 60);
  const readMin = Math.floor(readTimeSec / 60);
  const readSec = readTimeSec % 60;
  const readTime = readMin > 0 ? `${readMin}m ${readSec}s` : `${readSec}s`;

  // Top 10 words
  const wordMap: Record<string, number> = {};
  if (trimmed) {
    trimmed.toLowerCase().split(/\s+/).forEach(w => {
      const clean = w.replace(/[^a-z0-9']/g, '');
      if (clean.length > 2) wordMap[clean] = (wordMap[clean] || 0) + 1;
    });
  }
  const topWords = Object.entries(wordMap).sort((a, b) => b[1] - a[1]).slice(0, 10);

  return { words, chars, charsNoSpaces, sentences, paragraphs, lines, readTime, topWords };
}

export default function WordCounter() {
  const [text, setText] = useState('');
  const stats = useMemo(() => count(text), [text]);

  const statCards = [
    { label: 'Words', value: stats.words },
    { label: 'Characters', value: stats.chars },
    { label: 'No Spaces', value: stats.charsNoSpaces },
    { label: 'Sentences', value: stats.sentences },
    { label: 'Paragraphs', value: stats.paragraphs },
    { label: 'Lines', value: stats.lines },
  ];

  return (
    <div class="space-y-5">
      {/* Textarea */}
      <div class="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
        <div class="flex items-center justify-between px-4 py-2 border-b border-gray-700">
          <span class="text-sm font-medium text-gray-300">Paste or type your text</span>
          {text && (
            <button onClick={() => setText('')}
              class="text-xs text-gray-500 hover:text-red-400 transition-colors">
              Clear
            </button>
          )}
        </div>
        <textarea
          value={text}
          onInput={e => setText((e.target as HTMLTextAreaElement).value)}
          placeholder="Start typing or paste text here..."
          rows={8}
          class="w-full bg-transparent text-gray-100 px-4 py-3 text-sm resize-none focus:outline-none placeholder-gray-600"
        />
      </div>

      {/* Stats grid */}
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {statCards.map(s => (
          <div key={s.label} class="bg-gray-900 rounded-xl border border-gray-700 p-4 text-center">
            <div class="text-2xl font-bold text-indigo-400">{s.value.toLocaleString()}</div>
            <div class="text-xs text-gray-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Reading time */}
      <div class="bg-gray-900 rounded-xl border border-gray-700 p-4 flex items-center gap-4">
        <div class="text-3xl">⏱️</div>
        <div>
          <div class="font-semibold text-gray-100">Reading Time: <span class="text-indigo-400">{stats.readTime}</span></div>
          <div class="text-xs text-gray-400">Based on average reading speed of {READING_SPEED} words/min</div>
        </div>
      </div>

      {/* Top words */}
      {stats.topWords.length > 0 && (
        <div class="bg-gray-900 rounded-xl border border-gray-700 p-4">
          <p class="text-sm font-medium text-gray-300 mb-3">Top Words</p>
          <div class="flex flex-wrap gap-2">
            {stats.topWords.map(([word, count]) => (
              <span key={word} class="bg-gray-800 border border-gray-700 rounded-full px-3 py-1 text-xs text-gray-300">
                {word} <span class="text-indigo-400 font-semibold">{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
