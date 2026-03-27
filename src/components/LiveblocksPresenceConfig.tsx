import { useState } from 'preact/hooks';

// ── Types ──────────────────────────────────────────────────────────────────

type FieldType = 'string' | 'number' | 'boolean' | 'null';
type StorageType = 'LiveObject' | 'LiveList' | 'LiveMap';
type ThrottleOption = '16' | '50' | '100' | 'custom';

interface PresenceField {
  id: string;
  name: string;
  type: FieldType;
  defaultValue: string;
}

interface StorageField {
  id: string;
  key: string;
  storageType: StorageType;
  itemType: string;
}

interface MetadataField {
  id: string;
  name: string;
  type: FieldType;
}

// ── Helpers ────────────────────────────────────────────────────────────────

let idCounter = 100;
const uid = () => String(++idCounter);

function tsTypeForField(type: FieldType): string {
  if (type === 'null') return 'null';
  return type;
}

function defaultForType(type: FieldType): string {
  if (type === 'string') return '""';
  if (type === 'number') return '0';
  if (type === 'boolean') return 'false';
  return 'null';
}

function buildOutput(
  presenceFields: PresenceField[],
  storageFields: StorageField[],
  throttle: ThrottleOption,
  customThrottle: string,
  cursorAwareness: boolean,
  userIdAwareness: boolean,
  metadataFields: MetadataField[]
): string {
  const throttleMs =
    throttle === 'custom' ? (parseInt(customThrottle) || 100) : parseInt(throttle);

  const lines: string[] = [];

  // createClient
  lines.push('// ── Liveblocks Client ────────────────────────────────────────');
  lines.push('import { createClient } from "@liveblocks/client";');
  lines.push('import { createRoomContext } from "@liveblocks/react";');
  lines.push('');
  lines.push('const client = createClient({');
  lines.push('  authEndpoint: "/api/liveblocks-auth",');
  lines.push(`  throttle: ${throttleMs},`);
  lines.push('});');
  lines.push('');

  // Presence type
  lines.push('// ── Presence ─────────────────────────────────────────────────');
  if (presenceFields.length === 0) {
    lines.push('type Presence = Record<string, never>;');
  } else {
    lines.push('type Presence = {');
    for (const f of presenceFields) {
      lines.push(`  ${f.name || 'field'}: ${tsTypeForField(f.type)};`);
    }
    lines.push('};');
  }
  lines.push('');

  // Storage type
  lines.push('// ── Storage ──────────────────────────────────────────────────');
  if (storageFields.length === 0) {
    lines.push('type Storage = Record<string, never>;');
  } else {
    lines.push('type Storage = {');
    for (const f of storageFields) {
      const itemT = f.itemType || 'unknown';
      if (f.storageType === 'LiveObject') {
        lines.push(`  ${f.key || 'key'}: LiveObject<{ ${itemT} }>;`);
      } else if (f.storageType === 'LiveList') {
        lines.push(`  ${f.key || 'key'}: LiveList<${itemT}>;`);
      } else {
        lines.push(`  ${f.key || 'key'}: LiveMap<string, ${itemT}>;`);
      }
    }
    lines.push('};');
  }
  lines.push('');

  // UserMeta / awareness
  const hasAwareness = cursorAwareness || userIdAwareness || metadataFields.length > 0;
  if (hasAwareness) {
    lines.push('// ── UserMeta (Awareness) ─────────────────────────────────────');
    lines.push('type UserMeta = {');
    lines.push('  info: {');
    if (cursorAwareness) lines.push('    cursor: { x: number; y: number } | null;');
    if (userIdAwareness) lines.push('    userId: string;');
    for (const f of metadataFields) {
      lines.push(`    ${f.name || 'field'}: ${tsTypeForField(f.type)};`);
    }
    lines.push('  };');
    lines.push('};');
    lines.push('');
  }

  // createRoomContext
  lines.push('// ── Room Context ─────────────────────────────────────────────');
  lines.push('export const {');
  lines.push('  RoomProvider,');
  lines.push('  useRoom,');
  lines.push('  useMyPresence,');
  lines.push('  useUpdateMyPresence,');
  lines.push('  useStorage,');
  lines.push('  useMutation,');
  lines.push('  useOthers,');
  lines.push('  useSelf,');
  lines.push(hasAwareness ? '} = createRoomContext<Presence, Storage, UserMeta>(client);' : '} = createRoomContext<Presence, Storage>(client);');
  lines.push('');

  // RoomProvider setup
  lines.push('// ── RoomProvider Setup ───────────────────────────────────────');
  const initialPresence: string[] = presenceFields.map(
    f => `    ${f.name || 'field'}: ${f.defaultValue || defaultForType(f.type)}`
  );
  const initialStorage: string[] = storageFields.map(f => {
    if (f.storageType === 'LiveObject') return `    ${f.key || 'key'}: new LiveObject({})`;
    if (f.storageType === 'LiveList') return `    ${f.key || 'key'}: new LiveList([])`;
    return `    ${f.key || 'key'}: new LiveMap()`;
  });
  lines.push('function App() {');
  lines.push('  return (');
  lines.push('    <RoomProvider');
  lines.push('      id="my-room"');
  if (initialPresence.length > 0) {
    lines.push('      initialPresence={{');
    lines.push(initialPresence.join(',\n'));
    lines.push('      }}');
  } else {
    lines.push('      initialPresence={{}}');
  }
  if (initialStorage.length > 0) {
    lines.push('      initialStorage={{');
    lines.push(initialStorage.join(',\n'));
    lines.push('      }}');
  }
  lines.push('    >');
  lines.push('      <YourComponent />');
  lines.push('    </RoomProvider>');
  lines.push('  );');
  lines.push('}');
  lines.push('');

  // Hook usage example
  lines.push('// ── Hook Usage Example ───────────────────────────────────────');
  lines.push('function YourComponent() {');
  lines.push('  const [myPresence, updateMyPresence] = useMyPresence();');
  if (storageFields.length > 0) {
    lines.push(`  const ${storageFields[0].key || 'data'} = useStorage((root) => root.${storageFields[0].key || 'data'});`);
  }
  lines.push('  const others = useOthers();');
  lines.push('  // ...');
  lines.push('}');

  return lines.join('\n');
}

// ── Sub-components ─────────────────────────────────────────────────────────

function FieldTypeSelect({
  value,
  onChange,
}: {
  value: FieldType;
  onChange: (v: FieldType) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange((e.target as HTMLSelectElement).value as FieldType)}
      class="rounded border border-border bg-bg px-2 py-1 text-xs text-text-muted focus:border-accent focus:outline-none"
    >
      <option value="string">string</option>
      <option value="number">number</option>
      <option value="boolean">boolean</option>
      <option value="null">null</option>
    </select>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function LiveblocksPresenceConfig() {
  const [presenceFields, setPresenceFields] = useState<PresenceField[]>([
    { id: uid(), name: 'cursor', type: 'string', defaultValue: 'null' },
  ]);
  const [storageFields, setStorageFields] = useState<StorageField[]>([
    { id: uid(), key: 'items', storageType: 'LiveList', itemType: 'string' },
  ]);
  const [throttle, setThrottle] = useState<ThrottleOption>('50');
  const [customThrottle, setCustomThrottle] = useState('80');
  const [cursorAwareness, setCursorAwareness] = useState(true);
  const [userIdAwareness, setUserIdAwareness] = useState(true);
  const [metadataFields, setMetadataFields] = useState<MetadataField[]>([]);
  const [copied, setCopied] = useState(false);

  const output = buildOutput(
    presenceFields,
    storageFields,
    throttle,
    customThrottle,
    cursorAwareness,
    userIdAwareness,
    metadataFields
  );

  function addPresenceField() {
    setPresenceFields(prev => [
      ...prev,
      { id: uid(), name: '', type: 'string', defaultValue: '' },
    ]);
  }

  function updatePresence(id: string, patch: Partial<PresenceField>) {
    setPresenceFields(prev => prev.map(f => (f.id === id ? { ...f, ...patch } : f)));
  }

  function removePresence(id: string) {
    setPresenceFields(prev => prev.filter(f => f.id !== id));
  }

  function addStorageField() {
    setStorageFields(prev => [
      ...prev,
      { id: uid(), key: '', storageType: 'LiveObject', itemType: 'string' },
    ]);
  }

  function updateStorage(id: string, patch: Partial<StorageField>) {
    setStorageFields(prev => prev.map(f => (f.id === id ? { ...f, ...patch } : f)));
  }

  function removeStorage(id: string) {
    setStorageFields(prev => prev.filter(f => f.id !== id));
  }

  function addMetadata() {
    setMetadataFields(prev => [...prev, { id: uid(), name: '', type: 'string' }]);
  }

  function updateMetadata(id: string, patch: Partial<MetadataField>) {
    setMetadataFields(prev => prev.map(f => (f.id === id ? { ...f, ...patch } : f)));
  }

  function removeMetadata(id: string) {
    setMetadataFields(prev => prev.filter(f => f.id !== id));
  }

  function handleCopy() {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div class="space-y-6">
      {/* Presence fields */}
      <section class="rounded-lg border border-border bg-surface p-4">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-sm font-semibold text-text-muted uppercase tracking-wide">Presence Fields</h2>
          <button
            onClick={addPresenceField}
            class="rounded border border-border bg-bg px-3 py-1 text-xs text-text-muted hover:border-accent hover:text-accent transition-colors"
          >
            + Add Field
          </button>
        </div>
        <div class="space-y-2">
          {presenceFields.map(f => (
            <div key={f.id} class="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="fieldName"
                value={f.name}
                onInput={(e) => updatePresence(f.id, { name: (e.target as HTMLInputElement).value })}
                class="flex-1 min-w-24 rounded border border-border bg-bg px-2 py-1 font-mono text-xs text-text-muted focus:border-accent focus:outline-none"
              />
              <FieldTypeSelect value={f.type} onChange={(t) => updatePresence(f.id, { type: t })} />
              <input
                type="text"
                placeholder="default"
                value={f.defaultValue}
                onInput={(e) => updatePresence(f.id, { defaultValue: (e.target as HTMLInputElement).value })}
                class="w-24 rounded border border-border bg-bg px-2 py-1 font-mono text-xs text-text-muted focus:border-accent focus:outline-none"
              />
              <button
                onClick={() => removePresence(f.id)}
                class="text-xs text-text-muted hover:text-red-400 transition-colors"
              >
                ✕
              </button>
            </div>
          ))}
          {presenceFields.length === 0 && (
            <p class="text-xs text-text-muted italic">No fields — add one above</p>
          )}
        </div>
      </section>

      {/* Storage schema */}
      <section class="rounded-lg border border-border bg-surface p-4">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-sm font-semibold text-text-muted uppercase tracking-wide">Storage Schema</h2>
          <button
            onClick={addStorageField}
            class="rounded border border-border bg-bg px-3 py-1 text-xs text-text-muted hover:border-accent hover:text-accent transition-colors"
          >
            + Add Key
          </button>
        </div>
        <div class="space-y-2">
          {storageFields.map(f => (
            <div key={f.id} class="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="key"
                value={f.key}
                onInput={(e) => updateStorage(f.id, { key: (e.target as HTMLInputElement).value })}
                class="flex-1 min-w-24 rounded border border-border bg-bg px-2 py-1 font-mono text-xs text-text-muted focus:border-accent focus:outline-none"
              />
              <select
                value={f.storageType}
                onChange={(e) => updateStorage(f.id, { storageType: (e.target as HTMLSelectElement).value as StorageType })}
                class="rounded border border-border bg-bg px-2 py-1 text-xs text-text-muted focus:border-accent focus:outline-none"
              >
                <option value="LiveObject">LiveObject</option>
                <option value="LiveList">LiveList</option>
                <option value="LiveMap">LiveMap</option>
              </select>
              <input
                type="text"
                placeholder="item type"
                value={f.itemType}
                onInput={(e) => updateStorage(f.id, { itemType: (e.target as HTMLInputElement).value })}
                class="w-28 rounded border border-border bg-bg px-2 py-1 font-mono text-xs text-text-muted focus:border-accent focus:outline-none"
              />
              <button
                onClick={() => removeStorage(f.id)}
                class="text-xs text-text-muted hover:text-red-400 transition-colors"
              >
                ✕
              </button>
            </div>
          ))}
          {storageFields.length === 0 && (
            <p class="text-xs text-text-muted italic">No storage keys</p>
          )}
        </div>
      </section>

      {/* Throttle */}
      <section class="rounded-lg border border-border bg-surface p-4">
        <h2 class="mb-3 text-sm font-semibold text-text-muted uppercase tracking-wide">Throttle</h2>
        <div class="flex flex-wrap items-center gap-3">
          {(['16', '50', '100', 'custom'] as ThrottleOption[]).map(opt => (
            <label key={opt} class="flex cursor-pointer items-center gap-1.5">
              <input
                type="radio"
                name="throttle"
                checked={throttle === opt}
                onChange={() => setThrottle(opt)}
                class="accent-accent"
              />
              <span class="text-sm text-text-muted">{opt === 'custom' ? 'Custom' : `${opt}ms`}</span>
            </label>
          ))}
          {throttle === 'custom' && (
            <input
              type="number"
              value={customThrottle}
              onInput={(e) => setCustomThrottle((e.target as HTMLInputElement).value)}
              min={1}
              class="w-20 rounded border border-border bg-bg px-2 py-1 text-xs text-text-muted focus:border-accent focus:outline-none"
            />
          )}
        </div>
      </section>

      {/* Awareness */}
      <section class="rounded-lg border border-border bg-surface p-4">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-sm font-semibold text-text-muted uppercase tracking-wide">Awareness (UserMeta)</h2>
          <button
            onClick={addMetadata}
            class="rounded border border-border bg-bg px-3 py-1 text-xs text-text-muted hover:border-accent hover:text-accent transition-colors"
          >
            + Custom Field
          </button>
        </div>
        <div class="mb-3 flex flex-wrap gap-4">
          <label class="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={cursorAwareness}
              onChange={() => setCursorAwareness(v => !v)}
              class="accent-accent"
            />
            <span class="text-sm text-text-muted">cursor (x/y)</span>
          </label>
          <label class="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={userIdAwareness}
              onChange={() => setUserIdAwareness(v => !v)}
              class="accent-accent"
            />
            <span class="text-sm text-text-muted">userId</span>
          </label>
        </div>
        {metadataFields.length > 0 && (
          <div class="space-y-2">
            {metadataFields.map(f => (
              <div key={f.id} class="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  placeholder="fieldName"
                  value={f.name}
                  onInput={(e) => updateMetadata(f.id, { name: (e.target as HTMLInputElement).value })}
                  class="flex-1 min-w-24 rounded border border-border bg-bg px-2 py-1 font-mono text-xs text-text-muted focus:border-accent focus:outline-none"
                />
                <FieldTypeSelect value={f.type} onChange={(t) => updateMetadata(f.id, { type: t })} />
                <button
                  onClick={() => removeMetadata(f.id)}
                  class="text-xs text-text-muted hover:text-red-400 transition-colors"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Output */}
      <section class="rounded-lg border border-border bg-surface p-4">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-sm font-semibold text-text-muted uppercase tracking-wide">Generated TypeScript</h2>
          <button
            onClick={handleCopy}
            class="rounded border border-border bg-bg px-3 py-1 text-xs text-text-muted hover:border-accent hover:text-accent transition-colors"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <pre class="overflow-auto rounded border border-border bg-bg p-4 text-xs text-accent leading-relaxed">
          {output}
        </pre>
      </section>
    </div>
  );
}
