import { useState, useMemo, useCallback } from 'preact/hooks';

const DEFAULT_SCHEMA = `{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "User Registration",
  "type": "object",
  "required": ["name", "email", "age"],
  "properties": {
    "name": {
      "type": "string",
      "title": "Full Name",
      "minLength": 2
    },
    "email": {
      "type": "string",
      "title": "Email Address",
      "format": "email"
    },
    "age": {
      "type": "integer",
      "title": "Age",
      "minimum": 18,
      "maximum": 120
    },
    "role": {
      "type": "string",
      "title": "Role",
      "enum": ["admin", "editor", "viewer"]
    },
    "newsletter": {
      "type": "boolean",
      "title": "Subscribe to newsletter"
    },
    "bio": {
      "type": "string",
      "title": "Bio",
      "maxLength": 500
    }
  }
}`;

interface SchemaProperty {
  type?: string | string[];
  title?: string;
  description?: string;
  enum?: any[];
  format?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  items?: SchemaProperty;
  properties?: Record<string, SchemaProperty>;
  required?: string[];
  default?: any;
}

interface JSONSchema {
  title?: string;
  description?: string;
  type?: string;
  properties?: Record<string, SchemaProperty>;
  required?: string[];
}

interface ValidationError {
  field: string;
  message: string;
}

function validate(schema: JSONSchema, formData: Record<string, any>): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!schema.properties) return errors;

  const required = schema.required || [];

  for (const [key, prop] of Object.entries(schema.properties)) {
    const value = formData[key];
    const label = prop.title || key;
    const isRequired = required.includes(key);

    if (isRequired && (value === undefined || value === '' || value === null)) {
      errors.push({ field: key, message: `${label} is required` });
      continue;
    }
    if (!value && value !== 0 && value !== false) continue;

    const type = Array.isArray(prop.type) ? prop.type[0] : prop.type;

    if (type === 'string' || type === 'integer' || type === 'number') {
      const strVal = String(value);
      if (prop.minLength !== undefined && strVal.length < prop.minLength) {
        errors.push({ field: key, message: `${label} must be at least ${prop.minLength} characters` });
      }
      if (prop.maxLength !== undefined && strVal.length > prop.maxLength) {
        errors.push({ field: key, message: `${label} must be at most ${prop.maxLength} characters` });
      }
      if (prop.format === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strVal)) {
        errors.push({ field: key, message: `${label} must be a valid email address` });
      }
      if (prop.format === 'uri' && !/^https?:\/\/.+/.test(strVal)) {
        errors.push({ field: key, message: `${label} must be a valid URL` });
      }
      if (prop.pattern && !new RegExp(prop.pattern).test(strVal)) {
        errors.push({ field: key, message: `${label} does not match required pattern` });
      }
    }
    if (type === 'integer' || type === 'number') {
      const num = Number(value);
      if (isNaN(num)) { errors.push({ field: key, message: `${label} must be a number` }); continue; }
      if (prop.minimum !== undefined && num < prop.minimum) {
        errors.push({ field: key, message: `${label} must be at least ${prop.minimum}` });
      }
      if (prop.maximum !== undefined && num > prop.maximum) {
        errors.push({ field: key, message: `${label} must be at most ${prop.maximum}` });
      }
    }
  }
  return errors;
}

function FormField({
  name,
  prop,
  required,
  value,
  error,
  onChange,
}: {
  name: string;
  prop: SchemaProperty;
  required: boolean;
  value: any;
  error?: string;
  onChange: (v: any) => void;
}) {
  const label = prop.title || name;
  const type = Array.isArray(prop.type) ? prop.type[0] : prop.type;
  const inputClass = `w-full px-3 py-2 rounded-lg bg-background border text-sm font-mono focus:outline-none focus:border-accent ${
    error ? 'border-red-500' : 'border-border'
  }`;

  let inputEl: any = null;

  if (prop.enum) {
    inputEl = (
      <select
        value={value ?? ''}
        onChange={(e) => onChange((e.target as HTMLSelectElement).value)}
        class={inputClass}
      >
        <option value="">— select —</option>
        {prop.enum.map(opt => (
          <option key={opt} value={opt}>{String(opt)}</option>
        ))}
      </select>
    );
  } else if (type === 'boolean') {
    inputEl = (
      <label class="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange((e.target as HTMLInputElement).checked)}
          class="accent-accent w-4 h-4"
        />
        <span class="text-sm text-text-muted">{label}</span>
      </label>
    );
    return (
      <div>
        {inputEl}
        {error && <p class="mt-1 text-xs text-red-400">{error}</p>}
      </div>
    );
  } else if (type === 'integer' || type === 'number') {
    inputEl = (
      <input
        type="number"
        value={value ?? ''}
        min={prop.minimum}
        max={prop.maximum}
        onInput={(e) => onChange((e.target as HTMLInputElement).value)}
        placeholder={prop.description || ''}
        class={inputClass}
      />
    );
  } else if (type === 'string' && (prop.maxLength ? prop.maxLength > 100 : false)) {
    inputEl = (
      <textarea
        value={value ?? ''}
        onInput={(e) => onChange((e.target as HTMLTextAreaElement).value)}
        rows={3}
        maxLength={prop.maxLength}
        placeholder={prop.description || ''}
        class={inputClass}
      />
    );
  } else {
    const inputType = prop.format === 'email' ? 'email'
      : prop.format === 'uri' ? 'url'
      : prop.format === 'date' ? 'date'
      : 'text';
    inputEl = (
      <input
        type={inputType}
        value={value ?? ''}
        onInput={(e) => onChange((e.target as HTMLInputElement).value)}
        minLength={prop.minLength}
        maxLength={prop.maxLength}
        pattern={prop.pattern}
        placeholder={prop.description || ''}
        class={inputClass}
      />
    );
  }

  return (
    <div>
      <div class="flex items-baseline gap-1 mb-1">
        <label class="text-sm font-medium">{label}</label>
        {required && <span class="text-red-400 text-xs">*</span>}
        {prop.type && <span class="text-xs text-text-muted ml-auto">{Array.isArray(prop.type) ? prop.type.join(' | ') : prop.type}{prop.format ? ` (${prop.format})` : ''}</span>}
      </div>
      {prop.description && <p class="text-xs text-text-muted mb-1">{prop.description}</p>}
      {inputEl}
      {prop.minimum !== undefined || prop.maximum !== undefined ? (
        <p class="mt-0.5 text-xs text-text-muted">
          {prop.minimum !== undefined && `min: ${prop.minimum}`}
          {prop.minimum !== undefined && prop.maximum !== undefined && ' · '}
          {prop.maximum !== undefined && `max: ${prop.maximum}`}
        </p>
      ) : null}
      {prop.minLength !== undefined || prop.maxLength !== undefined ? (
        <p class="mt-0.5 text-xs text-text-muted">
          {prop.minLength !== undefined && `min length: ${prop.minLength}`}
          {prop.minLength !== undefined && prop.maxLength !== undefined && ' · '}
          {prop.maxLength !== undefined && `max length: ${prop.maxLength}`}
        </p>
      ) : null}
      {error && <p class="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

export default function JsonSchemaFormBuilder() {
  const [schemaText, setSchemaText] = useState(DEFAULT_SCHEMA);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'split' | 'schema' | 'form'>('split');

  const { schema, parseError } = useMemo(() => {
    try {
      return { schema: JSON.parse(schemaText) as JSONSchema, parseError: null };
    } catch (e: any) {
      return { schema: null, parseError: e.message as string };
    }
  }, [schemaText]);

  const validationErrors = useMemo(() => {
    if (!schema || !submitted) return [];
    return validate(schema, formData);
  }, [schema, formData, submitted]);

  const errorMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const e of validationErrors) m[e.field] = e.message;
    return m;
  }, [validationErrors]);

  const handleChange = useCallback((key: string, val: any) => {
    setFormData(prev => ({ ...prev, [key]: val }));
  }, []);

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const handleExport = () => {
    navigator.clipboard.writeText(schemaText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const renderForm = () => {
    if (parseError) return (
      <div class="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
        <strong>JSON parse error:</strong> {parseError}
      </div>
    );
    if (!schema?.properties) return (
      <div class="text-text-muted text-sm">Schema must have a top-level <code>properties</code> object.</div>
    );

    return (
      <form onSubmit={handleSubmit} class="space-y-4">
        {schema.title && <h3 class="font-semibold text-base">{schema.title}</h3>}
        {schema.description && <p class="text-sm text-text-muted">{schema.description}</p>}

        {Object.entries(schema.properties).map(([key, prop]) => (
          <FormField
            key={key}
            name={key}
            prop={prop}
            required={(schema.required || []).includes(key)}
            value={formData[key]}
            error={errorMap[key]}
            onChange={(v) => handleChange(key, v)}
          />
        ))}

        <button
          type="submit"
          class="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90"
        >
          Submit / Validate
        </button>

        {submitted && validationErrors.length === 0 && (
          <div class="px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/30 text-green-500 text-sm">
            ✓ Form is valid! All fields pass schema validation.
          </div>
        )}
        {submitted && validationErrors.length > 0 && (
          <div class="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm space-y-1">
            <strong>{validationErrors.length} validation error{validationErrors.length > 1 ? 's' : ''}:</strong>
            {validationErrors.map(e => (
              <div key={e.field} class="text-xs">• {e.message}</div>
            ))}
          </div>
        )}
      </form>
    );
  };

  return (
    <div class="space-y-4">
      {/* Layout toggle */}
      <div class="flex items-center gap-2 flex-wrap">
        <div class="flex gap-1 p-1 bg-surface rounded-lg">
          {(['split', 'schema', 'form'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              class={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${
                activeTab === tab ? 'bg-accent text-white' : 'text-text-muted hover:text-text'
              }`}
            >
              {tab === 'split' ? 'Split View' : tab === 'schema' ? 'Schema Editor' : 'Live Form'}
            </button>
          ))}
        </div>
        <button
          onClick={handleExport}
          class="ml-auto text-xs px-3 py-1.5 rounded-lg bg-surface border border-border hover:border-accent text-text-muted"
        >
          {copied ? '✓ Copied' : 'Copy Schema'}
        </button>
      </div>

      <div class={`gap-4 ${activeTab === 'split' ? 'grid grid-cols-1 lg:grid-cols-2' : 'block'}`}>
        {/* Schema Editor */}
        {(activeTab === 'split' || activeTab === 'schema') && (
          <div class="space-y-1">
            <div class="flex items-center justify-between mb-1">
              <label class="text-sm font-medium">JSON Schema Editor</label>
              {parseError && <span class="text-xs text-red-400">⚠ Invalid JSON</span>}
              {!parseError && schema && <span class="text-xs text-green-500">✓ Valid JSON</span>}
            </div>
            <textarea
              value={schemaText}
              onInput={(e) => { setSchemaText((e.target as HTMLTextAreaElement).value); setSubmitted(false); }}
              rows={activeTab === 'split' ? 20 : 28}
              spellcheck={false}
              class={`w-full px-3 py-2 rounded-lg bg-surface border text-xs font-mono focus:outline-none focus:border-accent resize-y ${
                parseError ? 'border-red-500' : 'border-border'
              }`}
            />
          </div>
        )}

        {/* Live Form */}
        {(activeTab === 'split' || activeTab === 'form') && (
          <div class={`rounded-lg border border-border p-4 bg-surface/30 ${activeTab === 'form' ? 'max-w-lg' : ''}`}>
            <div class="text-xs text-text-muted mb-3 uppercase tracking-wide font-medium">Live Form Preview</div>
            {renderForm()}
          </div>
        )}
      </div>
    </div>
  );
}
