import { useState } from 'preact/hooks';

type FeatureType = 'numeric' | 'categorical' | 'text' | 'datetime';

type NumericTransform = 'StandardScaler' | 'MinMaxScaler' | 'RobustScaler' | 'log' | 'none';
type CatEncoding = 'OneHotEncoder' | 'OrdinalEncoder' | 'TargetEncoder';
type DatetimePart = 'year' | 'month' | 'day' | 'dayofweek' | 'hour';

interface FeatureCol {
  id: string;
  name: string;
  type: FeatureType;
  // numeric
  numTransform: NumericTransform;
  // categorical
  catEncoding: CatEncoding;
  catHandleUnknown: boolean;
  // text
  textMaxFeatures: string;
  textNgram: string;
  // datetime
  datetimeParts: DatetimePart[];
}

let _fid = 0;
function fid() { return `f-${++_fid}`; }

function defaultFeature(type: FeatureType, name: string): FeatureCol {
  return {
    id: fid(), name, type,
    numTransform: 'StandardScaler',
    catEncoding: 'OneHotEncoder',
    catHandleUnknown: true,
    textMaxFeatures: '5000',
    textNgram: '(1, 2)',
    datetimeParts: ['year', 'month', 'day', 'dayofweek'],
  };
}

function generateCode(features: FeatureCol[], targetCol: string): string {
  if (features.length === 0) return '# No features added yet.';

  const numeric = features.filter(f => f.type === 'numeric');
  const categorical = features.filter(f => f.type === 'categorical');
  const text = features.filter(f => f.type === 'text');
  const datetime = features.filter(f => f.type === 'datetime');

  const imports = new Set<string>([
    'from sklearn.pipeline import Pipeline',
    'from sklearn.compose import ColumnTransformer',
  ]);
  const steps: string[] = [];
  const transformers: string[] = [];

  // Numeric
  if (numeric.length > 0) {
    const byTransform: Record<string, string[]> = {};
    numeric.forEach(f => {
      const t = f.numTransform;
      if (!byTransform[t]) byTransform[t] = [];
      byTransform[t].push(f.name);
    });

    Object.entries(byTransform).forEach(([transform, cols]) => {
      const colStr = JSON.stringify(cols);
      if (transform === 'log') {
        imports.add('import numpy as np');
        imports.add('from sklearn.preprocessing import FunctionTransformer');
        transformers.push(`    ("log_numeric", Pipeline([\n        ("log", FunctionTransformer(np.log1p)),\n    ]), ${colStr})`);
      } else if (transform === 'none') {
        imports.add('from sklearn.preprocessing import FunctionTransformer');
        transformers.push(`    ("passthrough_numeric", "passthrough", ${colStr})`);
      } else {
        imports.add(`from sklearn.preprocessing import ${transform}`);
        transformers.push(`    ("${transform.toLowerCase()}_numeric", ${transform}(), ${colStr})`);
      }
    });
  }

  // Categorical
  if (categorical.length > 0) {
    const byEnc: Record<string, FeatureCol[]> = {};
    categorical.forEach(f => {
      if (!byEnc[f.catEncoding]) byEnc[f.catEncoding] = [];
      byEnc[f.catEncoding].push(f);
    });
    Object.entries(byEnc).forEach(([enc, cols]) => {
      const colStr = JSON.stringify(cols.map(c => c.name));
      imports.add(`from sklearn.preprocessing import ${enc}`);
      if (enc === 'OneHotEncoder') {
        const hu = cols[0].catHandleUnknown ? ', handle_unknown="ignore"' : '';
        transformers.push(`    ("onehot_cat", ${enc}(sparse_output=False${hu}), ${colStr})`);
      } else if (enc === 'OrdinalEncoder') {
        transformers.push(`    ("ordinal_cat", ${enc}(handle_unknown="use_encoded_value", unknown_value=-1), ${colStr})`);
      } else {
        transformers.push(`    ("target_cat", ${enc}(), ${colStr})`);
      }
    });
  }

  // Text
  if (text.length > 0) {
    imports.add('from sklearn.feature_extraction.text import TfidfVectorizer');
    text.forEach(f => {
      transformers.push(`    ("tfidf_${f.name.replace(/\W/g, '_')}", TfidfVectorizer(max_features=${f.textMaxFeatures}, ngram_range=${f.textNgram}), "${f.name}")`);
    });
  }

  // Datetime (FunctionTransformer)
  if (datetime.length > 0) {
    imports.add('import pandas as pd');
    imports.add('from sklearn.preprocessing import FunctionTransformer');
    datetime.forEach(f => {
      const parts = f.datetimeParts;
      const partsStr = parts.map(p => `"${p}"`).join(', ');
      transformers.push(`    ("datetime_${f.name.replace(/\W/g, '_')}", FunctionTransformer(\n        lambda X: pd.concat([pd.to_datetime(X["${f.name}"]).dt.${parts[0]}${parts.length > 1 ? `\n            # Add: .dt.${parts.slice(1).join(', .dt.')}` : ''}], axis=1),\n        validate=False\n    ), ["${f.name}"])`);
    });
  }

  if (datetime.length > 0) {
    // Simpler datetime generation
  }

  const importStr = [...imports].sort().join('\n');
  const transformersStr = transformers.join(',\n');

  let code = `${importStr}

# ── Feature lists ─────────────────────────────────────────`;

  if (numeric.length > 0) code += `\nNUMERIC_COLS = ${JSON.stringify(numeric.map(f => f.name))}`;
  if (categorical.length > 0) code += `\nCATEGORICAL_COLS = ${JSON.stringify(categorical.map(f => f.name))}`;
  if (text.length > 0) code += `\nTEXT_COLS = ${JSON.stringify(text.map(f => f.name))}`;
  if (datetime.length > 0) code += `\nDATETIME_COLS = ${JSON.stringify(datetime.map(f => f.name))}`;

  code += `

# ── ColumnTransformer ─────────────────────────────────────
preprocessor = ColumnTransformer(
    transformers=[
${transformersStr}
    ],
    remainder="drop",
    n_jobs=-1,
)

# ── Full Pipeline ─────────────────────────────────────────
from sklearn.ensemble import GradientBoostingClassifier  # swap your estimator

pipeline = Pipeline([
    ("preprocessor", preprocessor),
    ("model", GradientBoostingClassifier()),
])

# ── Fit & transform ───────────────────────────────────────
# pipeline.fit(X_train, y_train)
# y_pred = pipeline.predict(X_test)`;

  if (targetCol) {
    code += `\n# Target column: "${targetCol}"`;
  }

  return code;
}

export default function FeatureEngineeringCalculator() {
  const [features, setFeatures] = useState<FeatureCol[]>([
    defaultFeature('numeric', 'age'),
    defaultFeature('numeric', 'income'),
    defaultFeature('categorical', 'country'),
    defaultFeature('text', 'description'),
  ]);
  const [targetCol, setTargetCol] = useState('label');
  const [copied, setCopied] = useState(false);

  function addFeature(type: FeatureType) {
    const names: Record<FeatureType, string> = { numeric: 'new_numeric', categorical: 'new_cat', text: 'new_text', datetime: 'new_date' };
    setFeatures(f => [...f, defaultFeature(type, names[type])]);
  }

  function removeFeature(id: string) {
    setFeatures(f => f.filter(x => x.id !== id));
  }

  function updateFeature(id: string, patch: Partial<FeatureCol>) {
    setFeatures(f => f.map(x => x.id === id ? { ...x, ...patch } : x));
  }

  function toggleDatetimePart(id: string, part: DatetimePart) {
    setFeatures(f => f.map(x => {
      if (x.id !== id) return x;
      const parts = x.datetimeParts.includes(part)
        ? x.datetimeParts.filter(p => p !== part)
        : [...x.datetimeParts, part];
      return { ...x, datetimeParts: parts };
    }));
  }

  const code = generateCode(features, targetCol);

  function copy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const typeColors: Record<FeatureType, string> = {
    numeric: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    categorical: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    text: 'bg-green-500/20 text-green-400 border-green-500/30',
    datetime: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  };

  const inputCls = 'px-2 py-1.5 rounded bg-surface-alt border border-border text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent';

  const DATETIME_PARTS: DatetimePart[] = ['year', 'month', 'day', 'dayofweek', 'hour'];

  return (
    <div class="space-y-6">
      {/* Target */}
      <div class="p-4 rounded-xl border border-border bg-surface flex items-center gap-4">
        <label class="text-sm font-medium whitespace-nowrap">Target Column:</label>
        <input
          value={targetCol}
          onInput={e => setTargetCol((e.target as HTMLInputElement).value)}
          placeholder="label"
          class={`${inputCls} flex-1`}
        />
      </div>

      {/* Add feature buttons */}
      <div class="flex gap-2 flex-wrap">
        {(['numeric', 'categorical', 'text', 'datetime'] as FeatureType[]).map(t => (
          <button
            key={t}
            onClick={() => addFeature(t)}
            class={`px-3 py-1.5 rounded-lg border text-sm font-medium ${typeColors[t]}`}
          >
            + {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Feature list */}
      <div class="space-y-3">
        {features.map((f, i) => (
          <div key={f.id} class="p-4 rounded-xl border border-border bg-surface">
            <div class="flex items-center gap-2 mb-3 flex-wrap">
              <span class="text-xs text-text-muted w-5">{i + 1}.</span>
              <input
                value={f.name}
                onInput={e => updateFeature(f.id, { name: (e.target as HTMLInputElement).value })}
                class={`${inputCls} flex-1 min-w-0 font-mono`}
              />
              <select
                value={f.type}
                onChange={e => updateFeature(f.id, { type: (e.target as HTMLSelectElement).value as FeatureType })}
                class={inputCls}
              >
                <option value="numeric">numeric</option>
                <option value="categorical">categorical</option>
                <option value="text">text</option>
                <option value="datetime">datetime</option>
              </select>
              <span class={`text-xs px-2 py-0.5 rounded border ${typeColors[f.type]}`}>{f.type}</span>
              <button onClick={() => removeFeature(f.id)} class="text-red-400 hover:text-red-300 text-sm px-1">✕</button>
            </div>

            {f.type === 'numeric' && (
              <div>
                <label class="text-xs text-text-muted mr-2">Scaler:</label>
                <select value={f.numTransform} onChange={e => updateFeature(f.id, { numTransform: (e.target as HTMLSelectElement).value as NumericTransform })} class={inputCls}>
                  <option value="StandardScaler">StandardScaler (z-score)</option>
                  <option value="MinMaxScaler">MinMaxScaler (0–1)</option>
                  <option value="RobustScaler">RobustScaler (outlier-robust)</option>
                  <option value="log">log transform (log1p)</option>
                  <option value="none">None (passthrough)</option>
                </select>
              </div>
            )}

            {f.type === 'categorical' && (
              <div class="flex gap-4 flex-wrap items-center">
                <div>
                  <label class="text-xs text-text-muted mr-2">Encoding:</label>
                  <select value={f.catEncoding} onChange={e => updateFeature(f.id, { catEncoding: (e.target as HTMLSelectElement).value as CatEncoding })} class={inputCls}>
                    <option value="OneHotEncoder">OneHotEncoder</option>
                    <option value="OrdinalEncoder">OrdinalEncoder</option>
                    <option value="TargetEncoder">TargetEncoder</option>
                  </select>
                </div>
                <label class="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input type="checkbox" checked={f.catHandleUnknown} onChange={e => updateFeature(f.id, { catHandleUnknown: (e.target as HTMLInputElement).checked })} />
                  handle_unknown="ignore"
                </label>
              </div>
            )}

            {f.type === 'text' && (
              <div class="flex gap-4 flex-wrap">
                <div>
                  <label class="text-xs text-text-muted block mb-1">max_features</label>
                  <input value={f.textMaxFeatures} onInput={e => updateFeature(f.id, { textMaxFeatures: (e.target as HTMLInputElement).value })} class={`${inputCls} w-24`} />
                </div>
                <div>
                  <label class="text-xs text-text-muted block mb-1">ngram_range</label>
                  <input value={f.textNgram} onInput={e => updateFeature(f.id, { textNgram: (e.target as HTMLInputElement).value })} class={`${inputCls} w-24`} />
                </div>
              </div>
            )}

            {f.type === 'datetime' && (
              <div class="flex gap-3 flex-wrap">
                {DATETIME_PARTS.map(part => (
                  <label key={part} class="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={f.datetimeParts.includes(part)}
                      onChange={() => toggleDatetimePart(f.id, part)}
                    />
                    {part}
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}
        {features.length === 0 && (
          <div class="p-6 text-center text-sm text-text-muted border border-border rounded-xl">
            No features added. Use the buttons above to add columns.
          </div>
        )}
      </div>

      {/* Output */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium">Generated sklearn Pipeline Code</span>
          <button onClick={copy} class="text-sm px-3 py-1.5 rounded-lg bg-surface-alt border border-border hover:border-accent transition-colors">
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <pre class="p-4 rounded-xl bg-surface-alt border border-border text-sm font-mono overflow-x-auto whitespace-pre text-text max-h-[500px] overflow-y-auto">{code}</pre>
      </div>
    </div>
  );
}
