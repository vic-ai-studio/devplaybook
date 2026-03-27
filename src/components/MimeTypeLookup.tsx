import { useState, useMemo } from 'preact/hooks';

const MIME_DATABASE: Record<string, { type: string; extensions: string[]; description: string; category: string }> = {
  'image/jpeg': { type: 'image/jpeg', extensions: ['jpg', 'jpeg', 'jfif', 'pjpeg', 'pjp'], description: 'JPEG image', category: 'Image' },
  'image/png': { type: 'image/png', extensions: ['png'], description: 'Portable Network Graphics', category: 'Image' },
  'image/gif': { type: 'image/gif', extensions: ['gif'], description: 'Graphics Interchange Format', category: 'Image' },
  'image/webp': { type: 'image/webp', extensions: ['webp'], description: 'WebP image', category: 'Image' },
  'image/svg+xml': { type: 'image/svg+xml', extensions: ['svg', 'svgz'], description: 'Scalable Vector Graphics', category: 'Image' },
  'image/tiff': { type: 'image/tiff', extensions: ['tif', 'tiff'], description: 'Tagged Image File Format', category: 'Image' },
  'image/bmp': { type: 'image/bmp', extensions: ['bmp'], description: 'Windows Bitmap', category: 'Image' },
  'image/x-icon': { type: 'image/x-icon', extensions: ['ico'], description: 'ICO icon format', category: 'Image' },
  'image/avif': { type: 'image/avif', extensions: ['avif'], description: 'AV1 Image File Format', category: 'Image' },
  'image/heic': { type: 'image/heic', extensions: ['heic', 'heif'], description: 'High Efficiency Image Container', category: 'Image' },

  'video/mp4': { type: 'video/mp4', extensions: ['mp4', 'm4v'], description: 'MPEG-4 video', category: 'Video' },
  'video/webm': { type: 'video/webm', extensions: ['webm'], description: 'WebM video', category: 'Video' },
  'video/ogg': { type: 'video/ogg', extensions: ['ogv'], description: 'Ogg video', category: 'Video' },
  'video/quicktime': { type: 'video/quicktime', extensions: ['mov', 'qt'], description: 'QuickTime video', category: 'Video' },
  'video/x-msvideo': { type: 'video/x-msvideo', extensions: ['avi'], description: 'AVI video', category: 'Video' },
  'video/mpeg': { type: 'video/mpeg', extensions: ['mpeg', 'mpg'], description: 'MPEG video', category: 'Video' },
  'video/3gpp': { type: 'video/3gpp', extensions: ['3gp'], description: '3GPP multimedia', category: 'Video' },
  'video/x-matroska': { type: 'video/x-matroska', extensions: ['mkv'], description: 'Matroska video', category: 'Video' },

  'audio/mpeg': { type: 'audio/mpeg', extensions: ['mp3', 'mp2'], description: 'MP3 audio', category: 'Audio' },
  'audio/ogg': { type: 'audio/ogg', extensions: ['oga', 'ogg'], description: 'Ogg audio', category: 'Audio' },
  'audio/wav': { type: 'audio/wav', extensions: ['wav'], description: 'WAV audio', category: 'Audio' },
  'audio/webm': { type: 'audio/webm', extensions: ['weba'], description: 'WebM audio', category: 'Audio' },
  'audio/aac': { type: 'audio/aac', extensions: ['aac'], description: 'AAC audio', category: 'Audio' },
  'audio/flac': { type: 'audio/flac', extensions: ['flac'], description: 'FLAC lossless audio', category: 'Audio' },
  'audio/x-m4a': { type: 'audio/x-m4a', extensions: ['m4a'], description: 'MPEG-4 audio', category: 'Audio' },
  'audio/midi': { type: 'audio/midi', extensions: ['midi', 'mid'], description: 'MIDI audio', category: 'Audio' },

  'text/html': { type: 'text/html', extensions: ['html', 'htm', 'shtml'], description: 'HTML document', category: 'Text' },
  'text/css': { type: 'text/css', extensions: ['css'], description: 'Cascading Style Sheets', category: 'Text' },
  'text/javascript': { type: 'text/javascript', extensions: ['js', 'mjs'], description: 'JavaScript', category: 'Text' },
  'text/plain': { type: 'text/plain', extensions: ['txt', 'text', 'conf', 'log', 'ini'], description: 'Plain text', category: 'Text' },
  'text/csv': { type: 'text/csv', extensions: ['csv'], description: 'Comma-Separated Values', category: 'Text' },
  'text/xml': { type: 'text/xml', extensions: ['xml'], description: 'XML document', category: 'Text' },
  'text/markdown': { type: 'text/markdown', extensions: ['md', 'markdown'], description: 'Markdown text', category: 'Text' },
  'text/calendar': { type: 'text/calendar', extensions: ['ics', 'ical'], description: 'iCalendar format', category: 'Text' },
  'text/vcard': { type: 'text/vcard', extensions: ['vcf', 'vcard'], description: 'vCard contact', category: 'Text' },
  'text/tab-separated-values': { type: 'text/tab-separated-values', extensions: ['tsv'], description: 'Tab-Separated Values', category: 'Text' },

  'application/json': { type: 'application/json', extensions: ['json'], description: 'JSON data', category: 'Application' },
  'application/ld+json': { type: 'application/ld+json', extensions: ['jsonld'], description: 'JSON-LD linked data', category: 'Application' },
  'application/xml': { type: 'application/xml', extensions: ['xml'], description: 'XML document', category: 'Application' },
  'application/pdf': { type: 'application/pdf', extensions: ['pdf'], description: 'Adobe PDF document', category: 'Application' },
  'application/zip': { type: 'application/zip', extensions: ['zip'], description: 'ZIP archive', category: 'Application' },
  'application/gzip': { type: 'application/gzip', extensions: ['gz', 'gzip'], description: 'Gzip archive', category: 'Application' },
  'application/x-tar': { type: 'application/x-tar', extensions: ['tar'], description: 'TAR archive', category: 'Application' },
  'application/x-bzip2': { type: 'application/x-bzip2', extensions: ['bz2', 'bzip2'], description: 'Bzip2 archive', category: 'Application' },
  'application/x-7z-compressed': { type: 'application/x-7z-compressed', extensions: ['7z'], description: '7-Zip archive', category: 'Application' },
  'application/x-rar-compressed': { type: 'application/x-rar-compressed', extensions: ['rar'], description: 'RAR archive', category: 'Application' },
  'application/octet-stream': { type: 'application/octet-stream', extensions: ['bin', 'exe', 'dll', 'so', 'dmg'], description: 'Binary data / arbitrary download', category: 'Application' },
  'application/wasm': { type: 'application/wasm', extensions: ['wasm'], description: 'WebAssembly binary', category: 'Application' },
  'application/graphql': { type: 'application/graphql', extensions: ['graphql', 'gql'], description: 'GraphQL query', category: 'Application' },
  'application/x-www-form-urlencoded': { type: 'application/x-www-form-urlencoded', extensions: [], description: 'URL-encoded form data', category: 'Application' },
  'multipart/form-data': { type: 'multipart/form-data', extensions: [], description: 'Multipart form data (file uploads)', category: 'Application' },

  'application/vnd.ms-excel': { type: 'application/vnd.ms-excel', extensions: ['xls'], description: 'Microsoft Excel (legacy)', category: 'Office' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', extensions: ['xlsx'], description: 'Microsoft Excel (OOXML)', category: 'Office' },
  'application/msword': { type: 'application/msword', extensions: ['doc'], description: 'Microsoft Word (legacy)', category: 'Office' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', extensions: ['docx'], description: 'Microsoft Word (OOXML)', category: 'Office' },
  'application/vnd.ms-powerpoint': { type: 'application/vnd.ms-powerpoint', extensions: ['ppt'], description: 'Microsoft PowerPoint (legacy)', category: 'Office' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', extensions: ['pptx'], description: 'Microsoft PowerPoint (OOXML)', category: 'Office' },
  'application/vnd.oasis.opendocument.text': { type: 'application/vnd.oasis.opendocument.text', extensions: ['odt'], description: 'OpenDocument text', category: 'Office' },
  'application/vnd.oasis.opendocument.spreadsheet': { type: 'application/vnd.oasis.opendocument.spreadsheet', extensions: ['ods'], description: 'OpenDocument spreadsheet', category: 'Office' },
  'application/vnd.oasis.opendocument.presentation': { type: 'application/vnd.oasis.opendocument.presentation', extensions: ['odp'], description: 'OpenDocument presentation', category: 'Office' },

  'font/ttf': { type: 'font/ttf', extensions: ['ttf'], description: 'TrueType Font', category: 'Font' },
  'font/otf': { type: 'font/otf', extensions: ['otf'], description: 'OpenType Font', category: 'Font' },
  'font/woff': { type: 'font/woff', extensions: ['woff'], description: 'Web Open Font Format', category: 'Font' },
  'font/woff2': { type: 'font/woff2', extensions: ['woff2'], description: 'Web Open Font Format 2', category: 'Font' },
  'application/x-font-ttf': { type: 'application/x-font-ttf', extensions: ['ttf', 'ttc'], description: 'TrueType Font (legacy)', category: 'Font' },
};

const CATEGORIES = ['All', 'Image', 'Video', 'Audio', 'Text', 'Application', 'Office', 'Font'];

export default function MimeTypeLookup() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [copied, setCopied] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^\./, ''); // strip leading dot
    const entries = Object.values(MIME_DATABASE);

    return entries.filter(entry => {
      if (category !== 'All' && entry.category !== category) return false;
      if (!q) return true;
      return (
        entry.type.toLowerCase().includes(q) ||
        entry.extensions.some(e => e.includes(q)) ||
        entry.description.toLowerCase().includes(q)
      );
    });
  }, [query, category]);

  const copyMime = (mime: string) => {
    navigator.clipboard.writeText(mime).then(() => {
      setCopied(mime);
      setTimeout(() => setCopied(''), 1500);
    });
  };

  const categoryColor: Record<string, string> = {
    Image: 'bg-purple-500/20 text-purple-400',
    Video: 'bg-blue-500/20 text-blue-400',
    Audio: 'bg-green-500/20 text-green-400',
    Text: 'bg-yellow-500/20 text-yellow-400',
    Application: 'bg-orange-500/20 text-orange-400',
    Office: 'bg-red-500/20 text-red-400',
    Font: 'bg-pink-500/20 text-pink-400',
  };

  return (
    <div class="space-y-4">
      {/* Search */}
      <div class="flex gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Search by extension (jpg), MIME type (image/jpeg), or keyword..."
          value={query}
          onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
          class="flex-1 bg-bg-card border border-border rounded-lg px-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary min-w-64"
        />
        <select
          value={category}
          onChange={(e) => setCategory((e.target as HTMLSelectElement).value)}
          class="bg-bg-card border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
        >
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <p class="text-xs text-text-muted">{results.length} MIME type{results.length !== 1 ? 's' : ''} found</p>

      {/* Results Table */}
      <div class="border border-border rounded-lg overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-bg-card border-b border-border">
              <tr>
                <th class="text-left px-4 py-2.5 text-xs uppercase text-text-muted font-medium">MIME Type</th>
                <th class="text-left px-4 py-2.5 text-xs uppercase text-text-muted font-medium">Extensions</th>
                <th class="text-left px-4 py-2.5 text-xs uppercase text-text-muted font-medium hidden sm:table-cell">Description</th>
                <th class="text-left px-4 py-2.5 text-xs uppercase text-text-muted font-medium hidden md:table-cell">Category</th>
                <th class="px-4 py-2.5 text-xs uppercase text-text-muted font-medium w-16"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              {results.slice(0, 100).map((entry) => (
                <tr key={entry.type} class="hover:bg-border/10 transition-colors">
                  <td class="px-4 py-2.5">
                    <code class="font-mono text-xs text-primary break-all">{entry.type}</code>
                  </td>
                  <td class="px-4 py-2.5">
                    <div class="flex flex-wrap gap-1">
                      {entry.extensions.length > 0
                        ? entry.extensions.map(ext => (
                          <span key={ext} class="inline-block bg-bg-card border border-border rounded px-1.5 py-0.5 text-xs font-mono">.{ext}</span>
                        ))
                        : <span class="text-text-muted text-xs">—</span>
                      }
                    </div>
                  </td>
                  <td class="px-4 py-2.5 text-text-muted hidden sm:table-cell">{entry.description}</td>
                  <td class="px-4 py-2.5 hidden md:table-cell">
                    <span class={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColor[entry.category] || 'bg-bg-card text-text-muted'}`}>
                      {entry.category}
                    </span>
                  </td>
                  <td class="px-4 py-2.5">
                    <button
                      onClick={() => copyMime(entry.type)}
                      class="text-xs text-text-muted hover:text-primary transition-colors"
                    >
                      {copied === entry.type ? '✓' : 'Copy'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {results.length > 100 && (
          <div class="px-4 py-2 text-xs text-text-muted border-t border-border">
            Showing 100 of {results.length} results — refine your search to see more
          </div>
        )}
        {results.length === 0 && (
          <div class="px-4 py-8 text-sm text-text-muted text-center">
            No MIME types found for "{query}"
          </div>
        )}
      </div>

      {/* Quick Reference */}
      <div class="bg-bg-card border border-border rounded-lg p-4">
        <p class="text-xs font-medium text-text-muted uppercase tracking-wide mb-3">Quick Reference — Common HTTP Content-Types</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
          {[
            ['HTML', 'text/html; charset=utf-8'],
            ['JSON API', 'application/json'],
            ['Form Upload', 'multipart/form-data'],
            ['Form POST', 'application/x-www-form-urlencoded'],
            ['Binary Download', 'application/octet-stream'],
            ['PDF', 'application/pdf'],
          ].map(([label, mime]) => (
            <div key={label} class="flex items-center gap-2">
              <span class="text-text-muted w-24 shrink-0">{label}</span>
              <code class="text-primary text-xs break-all">{mime}</code>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
