import { useState, useMemo } from 'preact/hooks';

type TileProvider = 'osm' | 'cartodb-light' | 'cartodb-dark' | 'esri' | 'stamen-terrain' | 'mapbox';
type LayerType = 'marker' | 'circle' | 'polygon' | 'polyline' | 'rectangle';

interface MarkerLayer {
  id: string;
  type: 'marker';
  lat: number;
  lng: number;
  popup: string;
}

interface CircleLayer {
  id: string;
  type: 'circle';
  lat: number;
  lng: number;
  radius: number;
  color: string;
}

interface PolygonLayer {
  id: string;
  type: 'polygon';
  coords: string; // e.g. "51.5,0.1;51.5,0.2;51.4,0.15"
  color: string;
}

type Layer = MarkerLayer | CircleLayer | PolygonLayer;

const TILE_PROVIDERS: { id: TileProvider; label: string; url: string; attribution: string }[] = [
  { id: 'osm', label: 'OpenStreetMap', url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '&copy; OpenStreetMap contributors' },
  { id: 'cartodb-light', label: 'CartoDB Light', url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', attribution: '&copy; OpenStreetMap contributors &copy; CARTO' },
  { id: 'cartodb-dark', label: 'CartoDB Dark', url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', attribution: '&copy; OpenStreetMap contributors &copy; CARTO' },
  { id: 'esri', label: 'Esri Satellite', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution: 'Tiles &copy; Esri' },
  { id: 'stamen-terrain', label: 'Stamen Terrain', url: 'https://stamen-tiles.a.ssl.fastly.net/terrain/{z}/{x}/{y}.jpg', attribution: 'Map tiles by Stamen Design' },
  { id: 'mapbox', label: 'Mapbox (token req.)', url: 'https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', attribution: '&copy; Mapbox' },
];

let nextId = 1;
const uid = () => String(nextId++);

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

function generateCode(
  provider: TileProvider,
  centerLat: number,
  centerLng: number,
  zoom: number,
  layers: Layer[],
  mapId: string,
  mapboxToken: string,
): string {
  const tp = TILE_PROVIDERS.find((p) => p.id === provider)!;
  const tileUrl = provider === 'mapbox'
    ? tp.url.replace('{id}', 'mapbox/streets-v11').replace('{accessToken}', mapboxToken || 'YOUR_MAPBOX_TOKEN')
    : tp.url;

  const layerCode = layers.map((l) => {
    if (l.type === 'marker') {
      return `L.marker([${l.lat}, ${l.lng}])${l.popup ? `.bindPopup('${l.popup}')` : ''}.addTo(map);`;
    }
    if (l.type === 'circle') {
      return `L.circle([${l.lat}, ${l.lng}], { radius: ${l.radius}, color: '${l.color}', fillOpacity: 0.4 }).addTo(map);`;
    }
    if (l.type === 'polygon') {
      const coords = l.coords.split(';').map((c) => {
        const [lat, lng] = c.split(',').map(Number);
        return `[${lat}, ${lng}]`;
      });
      return `L.polygon([${coords.join(', ')}], { color: '${l.color}', fillOpacity: 0.4 }).addTo(map);`;
    }
    return '';
  }).filter(Boolean).join('\n');

  return `<!-- HTML -->
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9/dist/leaflet.js"><\/script>
<div id="${mapId}" style="height: 400px; width: 100%;"></div>

<!-- JavaScript -->
<script>
const map = L.map('${mapId}').setView([${centerLat}, ${centerLng}], ${zoom});

L.tileLayer('${tileUrl}', {
  attribution: '${tp.attribution}',
  maxZoom: 19,
}).addTo(map);
${layerCode ? '\n' + layerCode : ''}
<\/script>`;
}

function generateNpmCode(
  provider: TileProvider,
  centerLat: number,
  centerLng: number,
  zoom: number,
  layers: Layer[],
  mapId: string,
): string {
  const tp = TILE_PROVIDERS.find((p) => p.id === provider)!;
  const layerCode = layers.map((l) => {
    if (l.type === 'marker') return `  L.marker([${l.lat}, ${l.lng}])${l.popup ? `.bindPopup('${l.popup}')` : ''}.addTo(map);`;
    if (l.type === 'circle') return `  L.circle([${l.lat}, ${l.lng}], { radius: ${l.radius}, color: '${l.color}', fillOpacity: 0.4 }).addTo(map);`;
    if (l.type === 'polygon') {
      const coords = l.coords.split(';').map((c) => { const [lat, lng] = c.split(',').map(Number); return `[${lat}, ${lng}]`; });
      return `  L.polygon([${coords.join(', ')}], { color: '${l.color}', fillOpacity: 0.4 }).addTo(map);`;
    }
    return '';
  }).filter(Boolean).join('\n');

  return `// npm install leaflet
// npm install @types/leaflet  (TypeScript)
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const map = L.map('${mapId}').setView([${centerLat}, ${centerLng}], ${zoom});

L.tileLayer('${tp.url}', {
  attribution: '${tp.attribution}',
  maxZoom: 19,
}).addTo(map);
${layerCode ? '\n' + layerCode : ''}
// Cleanup (React/SPA):
// return () => map.remove();`;
}

export default function LeafletMapConfigBuilder() {
  const [provider, setProvider] = useState<TileProvider>('osm');
  const [centerLat, setCenterLat] = useState('51.505');
  const [centerLng, setCenterLng] = useState('-0.09');
  const [zoom, setZoom] = useState('13');
  const [mapId, setMapId] = useState('map');
  const [mapboxToken, setMapboxToken] = useState('');
  const [layers, setLayers] = useState<Layer[]>([]);
  const [addType, setAddType] = useState<LayerType>('marker');
  const [tab, setTab] = useState<'cdn' | 'npm'>('cdn');

  const addLayer = () => {
    const lat = parseFloat(centerLat) || 51.505;
    const lng = parseFloat(centerLng) || -0.09;
    if (addType === 'marker') {
      setLayers((prev) => [...prev, { id: uid(), type: 'marker', lat, lng, popup: 'Hello World' }]);
    } else if (addType === 'circle') {
      setLayers((prev) => [...prev, { id: uid(), type: 'circle', lat, lng, radius: 500, color: '#6366f1' }]);
    } else if (addType === 'polygon') {
      setLayers((prev) => [...prev, {
        id: uid(), type: 'polygon',
        coords: `${lat + 0.01},${lng + 0.01};${lat + 0.01},${lng - 0.01};${lat - 0.01},${lng}`,
        color: '#22c55e',
      }]);
    }
  };

  const updateLayer = (id: string, update: Partial<Layer>) => {
    setLayers((prev) => prev.map((l) => l.id === id ? { ...l, ...update } as Layer : l));
  };

  const removeLayer = (id: string) => setLayers((prev) => prev.filter((l) => l.id !== id));

  const latNum = parseFloat(centerLat) || 51.505;
  const lngNum = parseFloat(centerLng) || -0.09;
  const zoomNum = parseInt(zoom) || 13;

  const cdnCode = useMemo(() => generateCode(provider, latNum, lngNum, zoomNum, layers, mapId, mapboxToken), [provider, latNum, lngNum, zoomNum, layers, mapId, mapboxToken]);
  const npmCode = useMemo(() => generateNpmCode(provider, latNum, lngNum, zoomNum, layers, mapId), [provider, latNum, lngNum, zoomNum, layers, mapId]);

  return (
    <div class="space-y-5">
      {/* Tile provider */}
      <div class="bg-bg-card border border-border rounded-xl p-4 space-y-3">
        <div class="text-sm font-semibold text-text">Tile Provider</div>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {TILE_PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => setProvider(p.id)}
              class={`px-3 py-2 rounded-lg border text-xs text-left transition-colors ${
                provider === p.id
                  ? 'bg-primary/20 border-primary text-primary'
                  : 'bg-bg border-border text-text-muted hover:border-border-hover'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {provider === 'mapbox' && (
          <div>
            <label class="text-xs text-text-muted mb-1 block">Mapbox Access Token</label>
            <input
              type="text"
              value={mapboxToken}
              onInput={(e: any) => setMapboxToken(e.target.value)}
              placeholder="pk.eyJ1..."
              class="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm font-mono focus:outline-none focus:border-primary"
              spellcheck={false}
            />
          </div>
        )}
      </div>

      {/* Map config */}
      <div class="bg-bg-card border border-border rounded-xl p-4 space-y-3">
        <div class="text-sm font-semibold text-text">Map Configuration</div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label class="text-xs text-text-muted mb-1 block">Center Latitude</label>
            <input type="text" value={centerLat} onInput={(e: any) => setCenterLat(e.target.value)}
              class="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm font-mono focus:outline-none focus:border-primary" spellcheck={false} />
          </div>
          <div>
            <label class="text-xs text-text-muted mb-1 block">Center Longitude</label>
            <input type="text" value={centerLng} onInput={(e: any) => setCenterLng(e.target.value)}
              class="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm font-mono focus:outline-none focus:border-primary" spellcheck={false} />
          </div>
          <div>
            <label class="text-xs text-text-muted mb-1 block">Zoom Level (1-19)</label>
            <input type="number" min="1" max="19" value={zoom} onInput={(e: any) => setZoom(e.target.value)}
              class="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label class="text-xs text-text-muted mb-1 block">Map Container ID</label>
            <input type="text" value={mapId} onInput={(e: any) => setMapId(e.target.value)}
              class="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm font-mono focus:outline-none focus:border-primary" spellcheck={false} />
          </div>
        </div>
      </div>

      {/* Layers */}
      <div class="bg-bg-card border border-border rounded-xl p-4 space-y-3">
        <div class="flex items-center justify-between">
          <div class="text-sm font-semibold text-text">Layers</div>
          <div class="flex items-center gap-2">
            <select
              value={addType}
              onChange={(e: any) => setAddType(e.target.value as LayerType)}
              class="bg-bg border border-border rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-primary"
            >
              <option value="marker">Marker</option>
              <option value="circle">Circle</option>
              <option value="polygon">Polygon</option>
            </select>
            <button onClick={addLayer}
              class="text-xs bg-primary hover:bg-primary/80 text-white px-3 py-1.5 rounded-lg transition-colors">
              + Add Layer
            </button>
          </div>
        </div>

        {layers.length === 0 && <div class="text-xs text-text-muted">No layers added. Optionally add markers, circles, or polygons.</div>}

        <div class="space-y-3">
          {layers.map((l) => (
            <div key={l.id} class="bg-bg rounded-lg p-3 border border-border space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-medium text-text capitalize">{l.type}</span>
                <button onClick={() => removeLayer(l.id)} class="text-text-muted hover:text-red-400 text-sm">×</button>
              </div>
              {l.type === 'marker' && (
                <div class="grid grid-cols-3 gap-2">
                  <div>
                    <label class="text-xs text-text-muted mb-0.5 block">Lat</label>
                    <input type="number" step="0.0001" value={l.lat}
                      onInput={(e: any) => updateLayer(l.id, { lat: parseFloat(e.target.value) })}
                      class="w-full bg-bg-card border border-border rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label class="text-xs text-text-muted mb-0.5 block">Lng</label>
                    <input type="number" step="0.0001" value={l.lng}
                      onInput={(e: any) => updateLayer(l.id, { lng: parseFloat(e.target.value) })}
                      class="w-full bg-bg-card border border-border rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label class="text-xs text-text-muted mb-0.5 block">Popup</label>
                    <input type="text" value={l.popup}
                      onInput={(e: any) => updateLayer(l.id, { popup: e.target.value })}
                      class="w-full bg-bg-card border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-primary" />
                  </div>
                </div>
              )}
              {l.type === 'circle' && (
                <div class="grid grid-cols-4 gap-2">
                  <div><label class="text-xs text-text-muted mb-0.5 block">Lat</label>
                    <input type="number" step="0.0001" value={l.lat} onInput={(e: any) => updateLayer(l.id, { lat: parseFloat(e.target.value) })}
                      class="w-full bg-bg-card border border-border rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-primary" /></div>
                  <div><label class="text-xs text-text-muted mb-0.5 block">Lng</label>
                    <input type="number" step="0.0001" value={l.lng} onInput={(e: any) => updateLayer(l.id, { lng: parseFloat(e.target.value) })}
                      class="w-full bg-bg-card border border-border rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-primary" /></div>
                  <div><label class="text-xs text-text-muted mb-0.5 block">Radius (m)</label>
                    <input type="number" value={l.radius} onInput={(e: any) => updateLayer(l.id, { radius: parseInt(e.target.value) })}
                      class="w-full bg-bg-card border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-primary" /></div>
                  <div><label class="text-xs text-text-muted mb-0.5 block">Color</label>
                    <input type="color" value={l.color} onChange={(e: any) => updateLayer(l.id, { color: e.target.value })}
                      class="w-full h-8 bg-bg-card border border-border rounded cursor-pointer" /></div>
                </div>
              )}
              {l.type === 'polygon' && (
                <div class="grid grid-cols-4 gap-2">
                  <div class="col-span-3">
                    <label class="text-xs text-text-muted mb-0.5 block">Coordinates (lat,lng;lat,lng;...)</label>
                    <input type="text" value={l.coords} onInput={(e: any) => updateLayer(l.id, { coords: e.target.value })}
                      class="w-full bg-bg-card border border-border rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-primary" spellcheck={false} />
                  </div>
                  <div><label class="text-xs text-text-muted mb-0.5 block">Color</label>
                    <input type="color" value={l.color} onChange={(e: any) => updateLayer(l.id, { color: e.target.value })}
                      class="w-full h-8 bg-bg-card border border-border rounded cursor-pointer" /></div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Output */}
      <div class="space-y-3">
        <div class="flex gap-2 border-b border-border pb-2">
          {(['cdn', 'npm'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              class={`text-sm px-3 py-1.5 rounded-lg transition-colors ${tab === t ? 'bg-primary/20 text-primary' : 'text-text-muted hover:text-text'}`}>
              {t === 'cdn' ? 'CDN (HTML)' : 'npm (ES Module)'}
            </button>
          ))}
        </div>
        <div class="bg-bg-card border border-border rounded-xl overflow-hidden">
          <div class="flex items-center justify-between px-4 py-2.5 border-b border-border bg-bg">
            <span class="text-xs font-mono text-text-muted">{tab === 'cdn' ? 'leaflet-map.html' : 'map.js'}</span>
            <CopyButton value={tab === 'cdn' ? cdnCode : npmCode} />
          </div>
          <pre class="p-4 text-xs font-mono text-green-300 overflow-x-auto whitespace-pre max-h-80">{tab === 'cdn' ? cdnCode : npmCode}</pre>
        </div>
      </div>
    </div>
  );
}
