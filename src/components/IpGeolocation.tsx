import { useState } from 'preact/hooks';

interface GeoResult {
  ip: string;
  city: string;
  region: string;
  country_name: string;
  country_code: string;
  latitude: number;
  longitude: number;
  timezone: string;
  org: string;
  postal: string;
  currency: string;
}

export default function IpGeolocation() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<GeoResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const lookup = async (ip?: string) => {
    const target = ip ?? input.trim();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const url = target ? `https://ipapi.co/${encodeURIComponent(target)}/json/` : 'https://ipapi.co/json/';
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.reason || 'Lookup failed');
      setResult(data);
    } catch (e: any) {
      setError(e.message || 'Lookup failed. Check the IP address and try again.');
    } finally {
      setLoading(false);
    }
  };

  const lookupMyIp = () => {
    setInput('');
    lookup('');
  };

  const copyJson = () => {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const fields: { label: string; key: keyof GeoResult }[] = [
    { label: 'IP Address', key: 'ip' },
    { label: 'City', key: 'city' },
    { label: 'Region', key: 'region' },
    { label: 'Country', key: 'country_name' },
    { label: 'Country Code', key: 'country_code' },
    { label: 'Latitude', key: 'latitude' },
    { label: 'Longitude', key: 'longitude' },
    { label: 'Timezone', key: 'timezone' },
    { label: 'ISP / Org', key: 'org' },
    { label: 'Postal Code', key: 'postal' },
    { label: 'Currency', key: 'currency' },
  ];

  return (
    <div class="space-y-5">
      {/* Input */}
      <div class="bg-gray-900 rounded-xl border border-gray-700 p-5 space-y-3">
        <label class="block text-sm font-medium text-gray-300">IP Address (IPv4 or IPv6)</label>
        <div class="flex gap-2">
          <input
            type="text"
            value={input}
            onInput={e => setInput((e.target as HTMLInputElement).value)}
            onKeyDown={e => e.key === 'Enter' && lookup()}
            placeholder="e.g. 8.8.8.8 or 2001:4860:4860::8888"
            class="flex-1 bg-gray-800 text-gray-100 border border-gray-700 rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-indigo-500 placeholder-gray-600"
          />
          <button onClick={() => lookup()}
            disabled={loading}
            class="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-lg transition-colors text-sm">
            {loading ? 'Looking up…' : 'Lookup'}
          </button>
        </div>
        <button onClick={lookupMyIp}
          disabled={loading}
          class="text-sm text-indigo-400 hover:text-indigo-300 underline disabled:opacity-50 transition-colors">
          → Lookup my IP address
        </button>
      </div>

      {/* Error */}
      {error && (
        <div class="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300 text-sm">
          ⚠ {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div class="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
          <div class="flex items-center justify-between px-5 py-3 border-b border-gray-700">
            <span class="font-semibold text-gray-100">Results for {result.ip}</span>
            <button onClick={copyJson}
              class="text-sm bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded-md transition-colors">
              {copied ? '✓ Copied JSON' : 'Copy JSON'}
            </button>
          </div>
          <div class="divide-y divide-gray-800">
            {fields.map(f => (
              <div key={f.key} class="flex items-center px-5 py-3 hover:bg-gray-800/30">
                <span class="text-gray-400 text-sm w-36">{f.label}</span>
                <span class="text-gray-100 text-sm font-mono">
                  {result[f.key] != null && result[f.key] !== '' ? String(result[f.key]) : '—'}
                </span>
              </div>
            ))}
          </div>
          {result.latitude && result.longitude && (
            <div class="px-5 py-3 border-t border-gray-700">
              <a
                href={`https://www.openstreetmap.org/?mlat=${result.latitude}&mlon=${result.longitude}&zoom=10`}
                target="_blank" rel="noopener noreferrer"
                class="text-sm text-indigo-400 hover:text-indigo-300 underline">
                → View on OpenStreetMap
              </a>
            </div>
          )}
        </div>
      )}

      {/* Info */}
      <div class="bg-gray-900/50 rounded-lg border border-gray-800 p-4 text-sm text-gray-400">
        <p class="font-medium text-gray-300 mb-1">About IP Geolocation</p>
        <p>IP geolocation uses public databases to map IP addresses to approximate geographic locations. Data is provided by <strong class="text-gray-300">ipapi.co</strong>. Results are approximate and may not reflect exact physical location.</p>
      </div>
    </div>
  );
}
