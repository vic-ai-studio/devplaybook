import { useState } from 'preact/hooks';

type FieldType = 'string' | 'number' | 'boolean' | 'id' | 'array' | 'object' | 'optional';

interface Field {
  id: string;
  name: string;
  type: FieldType;
  optional: boolean;
  idTable: string;       // used when type === 'id'
  arrayItemType: string; // used when type === 'array'
}

interface Table {
  id: string;
  name: string;
  fields: Field[];
}

let _uid = 0;
function uid(): string {
  return String(++_uid);
}

function makeField(): Field {
  return { id: uid(), name: '', type: 'string', optional: false, idTable: '', arrayItemType: 'string' };
}

function makeTable(): Table {
  return { id: uid(), name: '', fields: [makeField()] };
}

function fieldTypeToCode(field: Field): string {
  let inner: string;
  switch (field.type) {
    case 'string':   inner = 'v.string()'; break;
    case 'number':   inner = 'v.number()'; break;
    case 'boolean':  inner = 'v.boolean()'; break;
    case 'id':       inner = `v.id("${field.idTable || 'tableName'}")`; break;
    case 'array':    inner = `v.array(v.${field.arrayItemType || 'string'}())`; break;
    case 'object':   inner = 'v.object({})'; break;
    case 'optional': inner = 'v.optional(v.string())'; break;
    default:         inner = 'v.string()';
  }
  return field.optional ? `v.optional(${inner})` : inner;
}

function buildSchema(tables: Table[]): string {
  if (tables.length === 0) {
    return `import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({});`;
  }

  const tableBlocks = tables.map(table => {
    const tName = table.name || 'untitled';
    if (table.fields.length === 0) {
      return `  ${tName}: defineTable({}),`;
    }
    const fieldLines = table.fields
      .filter(f => f.name.trim() !== '')
      .map(f => `    ${f.name}: ${fieldTypeToCode(f)},`);
    if (fieldLines.length === 0) {
      return `  ${tName}: defineTable({}),`;
    }
    return `  ${tName}: defineTable({\n${fieldLines.join('\n')}\n  }),`;
  });

  return `import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
${tableBlocks.join('\n')}
});`;
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label class="flex items-center gap-2 cursor-pointer">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        class={`relative w-9 h-5 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-border'}`}
      >
        <span class={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>
      <span class="text-sm">{label}</span>
    </label>
  );
}

const FIELD_TYPES: FieldType[] = ['string', 'number', 'boolean', 'id', 'array', 'object', 'optional'];
const ARRAY_ITEM_TYPES = ['string', 'number', 'boolean'];

export default function ConvexSchemaBuilder() {
  const [tables, setTables] = useState<Table[]>([makeTable()]);
  const [copied, setCopied] = useState(false);

  const output = buildSchema(tables);

  const handleCopy = () => {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const addTable = () => setTables(prev => [...prev, makeTable()]);

  const removeTable = (tableId: string) =>
    setTables(prev => prev.filter(t => t.id !== tableId));

  const updateTable = (tableId: string, patch: Partial<Omit<Table, 'fields' | 'id'>>) =>
    setTables(prev => prev.map(t => t.id === tableId ? { ...t, ...patch } : t));

  const addField = (tableId: string) =>
    setTables(prev => prev.map(t =>
      t.id === tableId ? { ...t, fields: [...t.fields, makeField()] } : t
    ));

  const removeField = (tableId: string, fieldId: string) =>
    setTables(prev => prev.map(t =>
      t.id === tableId ? { ...t, fields: t.fields.filter(f => f.id !== fieldId) } : t
    ));

  const updateField = (tableId: string, fieldId: string, patch: Partial<Field>) =>
    setTables(prev => prev.map(t =>
      t.id === tableId
        ? { ...t, fields: t.fields.map(f => f.id === fieldId ? { ...f, ...patch } : f) }
        : t
    ));

  return (
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: table builder */}
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-semibold text-text-muted uppercase tracking-wide">Tables</h2>
          <button
            onClick={addTable}
            class="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            + Add Table
          </button>
        </div>

        {tables.map(table => (
          <div key={table.id} class="bg-surface border border-border rounded-lg p-4 space-y-3">
            {/* Table header */}
            <div class="flex items-center gap-2">
              <input
                type="text"
                placeholder="table_name"
                value={table.name}
                onInput={e => updateTable(table.id, { name: (e.target as HTMLInputElement).value })}
                class="flex-1 bg-bg border border-border rounded px-2 py-1.5 text-sm font-mono focus:outline-none focus:border-accent"
              />
              <button
                onClick={() => removeTable(table.id)}
                class="px-2 py-1.5 text-xs bg-red-700 hover:bg-red-600 text-white rounded transition-colors"
                title="Remove table"
              >
                ✕
              </button>
            </div>

            {/* Fields */}
            <div class="space-y-2">
              <p class="text-xs text-text-muted font-semibold">Fields</p>
              {table.fields.map(field => (
                <div key={field.id} class="space-y-1.5 bg-bg rounded p-2 border border-border">
                  <div class="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="field_name"
                      value={field.name}
                      onInput={e => updateField(table.id, field.id, { name: (e.target as HTMLInputElement).value })}
                      class="flex-1 bg-surface border border-border rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-accent"
                    />
                    <select
                      value={field.type}
                      onChange={e => updateField(table.id, field.id, { type: (e.target as HTMLSelectElement).value as FieldType })}
                      class="bg-surface border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-accent"
                    >
                      {FIELD_TYPES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => removeField(table.id, field.id)}
                      class="px-1.5 py-1 text-xs text-red-400 hover:text-red-300 transition-colors"
                      title="Remove field"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Extra options per type */}
                  {field.type === 'id' && (
                    <input
                      type="text"
                      placeholder='target table (e.g. "users")'
                      value={field.idTable}
                      onInput={e => updateField(table.id, field.id, { idTable: (e.target as HTMLInputElement).value })}
                      class="w-full bg-surface border border-border rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-accent"
                    />
                  )}
                  {field.type === 'array' && (
                    <select
                      value={field.arrayItemType}
                      onChange={e => updateField(table.id, field.id, { arrayItemType: (e.target as HTMLSelectElement).value })}
                      class="bg-surface border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-accent"
                    >
                      {ARRAY_ITEM_TYPES.map(t => (
                        <option key={t} value={t}>array of {t}</option>
                      ))}
                    </select>
                  )}

                  <Toggle
                    checked={field.optional}
                    onChange={v => updateField(table.id, field.id, { optional: v })}
                    label="Optional"
                  />
                </div>
              ))}

              <button
                onClick={() => addField(table.id)}
                class="w-full px-2 py-1 text-xs text-blue-400 hover:text-blue-300 border border-dashed border-border hover:border-blue-500 rounded transition-colors"
              >
                + Add Field
              </button>
            </div>
          </div>
        ))}

        {tables.length === 0 && (
          <div class="bg-surface border border-dashed border-border rounded-lg p-6 text-center text-sm text-text-muted">
            No tables yet. Click "Add Table" to start.
          </div>
        )}
      </div>

      {/* Right: output */}
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-sm font-semibold">schema.ts output</span>
          <button
            onClick={handleCopy}
            class="px-3 py-1.5 text-xs bg-accent hover:bg-accent/90 text-white rounded-lg transition-colors"
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <pre class="bg-surface border border-border rounded-lg p-4 text-xs font-mono overflow-auto max-h-[700px] text-green-400 whitespace-pre-wrap">
          {output}
        </pre>

        {/* Quick reference */}
        <div class="bg-surface border border-border rounded-lg p-4 space-y-2">
          <h4 class="text-xs font-semibold text-text-muted uppercase tracking-wide">Convex v1 Type Reference</h4>
          <div class="grid grid-cols-2 gap-1 text-xs font-mono">
            {[
              ['string', 'v.string()'],
              ['number', 'v.number()'],
              ['boolean', 'v.boolean()'],
              ['id', 'v.id("table")'],
              ['array', 'v.array(v.string())'],
              ['object', 'v.object({...})'],
              ['optional', 'v.optional(...)'],
            ].map(([label, code]) => (
              <div key={label} class="flex items-center gap-2">
                <span class="text-text-muted w-16">{label}</span>
                <span class="text-blue-400">{code}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
