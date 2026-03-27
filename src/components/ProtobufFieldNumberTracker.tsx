import { useState, useCallback } from 'preact/hooks';

interface ProtoField {
  number: number;
  name: string;
  type: string;
  label: string;
  line: number;
}

interface ReservedEntry {
  numbers: number[];
  names: string[];
  raw: string;
}

interface ParseResult {
  fields: ProtoField[];
  reserved: ReservedEntry[];
  conflicts: number[];
  googleReserved: number[];
  exceeded: number[];
}

interface Suggestion {
  type: 'info' | 'warning' | 'error';
  message: string;
}

const SAMPLE_PROTO = `syntax = "proto3";

package example;

message Person {
  string name = 1;
  int32 id = 2;
  string email = 3;

  enum PhoneType {
    MOBILE = 0;
    HOME = 1;
    WORK = 2;
  }

  message PhoneNumber {
    string number = 1;
    PhoneType type = 2;
  }

  repeated PhoneNumber phones = 4;
  google.protobuf.Timestamp last_updated = 5;

  reserved 6, 7, 8;
  reserved "old_field", "deprecated_name";
}

message AddressBook {
  repeated Person people = 1;
  string description = 16;
  bytes metadata = 17;
  repeated string tags = 100;
}
`;

function parseProto(content: string): ParseResult {
  const fields: ProtoField[] = [];
  const reserved: ReservedEntry[] = [];
  const lines = content.split('\n');

  // Track nesting depth to handle nested messages
  let depth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Track braces
    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;

    // Check for reserved statements
    const reservedMatch = trimmed.match(/^reserved\s+(.+);/);
    if (reservedMatch) {
      const reservedContent = reservedMatch[1];
      const entry: ReservedEntry = { numbers: [], names: [], raw: trimmed };

      // Extract number ranges and individual numbers
      const numberParts = reservedContent.match(/\d+\s*to\s*\d+|\d+/g);
      if (numberParts) {
        for (const part of numberParts) {
          const rangeMatch = part.match(/(\d+)\s*to\s*(\d+)/);
          if (rangeMatch) {
            const start = parseInt(rangeMatch[1], 10);
            const end = parseInt(rangeMatch[2], 10);
            for (let n = start; n <= end; n++) {
              entry.numbers.push(n);
            }
          } else {
            entry.numbers.push(parseInt(part, 10));
          }
        }
      }

      // Extract string names
      const nameParts = reservedContent.match(/"([^"]+)"/g);
      if (nameParts) {
        for (const part of nameParts) {
          entry.names.push(part.replace(/"/g, ''));
        }
      }

      reserved.push(entry);
    }

    // Match field definitions
    // Supports: [optional|required|repeated] type name = number [options];
    // Also supports proto3 style without label
    const fieldPatterns = [
      // With label: optional/required/repeated
      /^(optional|required|repeated)\s+([\w.]+)\s+(\w+)\s*=\s*(\d+)/,
      // Without label (proto3 scalar)
      /^([\w.]+)\s+(\w+)\s*=\s*(\d+)/,
      // map type
      /^map\s*<\s*[\w.]+\s*,\s*[\w.]+\s*>\s+(\w+)\s*=\s*(\d+)/,
      // oneof fields (inside oneof block)
      /^([\w.]+)\s+(\w+)\s*=\s*(\d+)\s*[;{]/,
    ];

    let matched = false;

    // Try labeled pattern first
    const labeledMatch = trimmed.match(/^(optional|required|repeated)\s+([\w.]+)\s+(\w+)\s*=\s*(\d+)/);
    if (labeledMatch) {
      fields.push({
        number: parseInt(labeledMatch[4], 10),
        name: labeledMatch[3],
        type: labeledMatch[2],
        label: labeledMatch[1],
        line: i + 1,
      });
      matched = true;
    }

    // Try map pattern
    if (!matched) {
      const mapMatch = trimmed.match(/^map\s*<\s*([\w.]+)\s*,\s*([\w.]+)\s*>\s+(\w+)\s*=\s*(\d+)/);
      if (mapMatch) {
        fields.push({
          number: parseInt(mapMatch[4], 10),
          name: mapMatch[3],
          type: `map<${mapMatch[1]}, ${mapMatch[2]}>`,
          label: 'map',
          line: i + 1,
        });
        matched = true;
      }
    }

    // Try proto3 no-label pattern (exclude keywords, enum values, message names, syntax, package, import, option, etc.)
    if (!matched) {
      const noLabelMatch = trimmed.match(/^([\w.]+)\s+(\w+)\s*=\s*(\d+)\s*[;[]/);
      if (noLabelMatch) {
        const keyword = noLabelMatch[1];
        const skipKeywords = new Set([
          'syntax', 'package', 'import', 'option', 'message', 'enum',
          'service', 'rpc', 'oneof', 'extensions', 'extend', 'reserved',
          'true', 'false',
        ]);
        if (!skipKeywords.has(keyword) && /^[a-z]/.test(keyword)) {
          fields.push({
            number: parseInt(noLabelMatch[3], 10),
            name: noLabelMatch[2],
            type: keyword,
            label: '',
            line: i + 1,
          });
        }
      }
    }

    depth += openBraces - closeBraces;
  }

  // Find duplicate field numbers
  const numberCounts = new Map<number, number>();
  for (const field of fields) {
    numberCounts.set(field.number, (numberCounts.get(field.number) || 0) + 1);
  }
  const conflicts = Array.from(numberCounts.entries())
    .filter(([, count]) => count > 1)
    .map(([num]) => num);

  // Find Google reserved range violations (19000-19999)
  const googleReserved = fields
    .filter(f => f.number >= 19000 && f.number <= 19999)
    .map(f => f.number);

  // Find fields exceeding max (536870911)
  const exceeded = fields
    .filter(f => f.number > 536870911)
    .map(f => f.number);

  return { fields, reserved, conflicts, googleReserved, exceeded };
}

function generateSuggestions(result: ParseResult): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const { fields, conflicts, googleReserved, exceeded } = result;

  if (fields.length === 0) return suggestions;

  // Check if high-frequency fields are in 1-15 range
  const totalFields = fields.length;
  const fieldsOver15 = fields.filter(f => f.number > 15).length;
  const fieldsIn1to15 = fields.filter(f => f.number >= 1 && f.number <= 15).length;

  if (totalFields > 15 && fieldsIn1to15 < 15) {
    suggestions.push({
      type: 'info',
      message: `Fields 1-15 use 1 byte encoding (optimal). Consider placing your most frequently accessed fields in this range.`,
    });
  }

  if (conflicts.length > 0) {
    suggestions.push({
      type: 'error',
      message: `Duplicate field numbers detected: ${conflicts.join(', ')}. This will cause serialization errors.`,
    });
  }

  if (googleReserved.length > 0) {
    suggestions.push({
      type: 'error',
      message: `Fields ${googleReserved.join(', ')} fall in the Google-reserved range (19000-19999). These must not be used.`,
    });
  }

  if (exceeded.length > 0) {
    suggestions.push({
      type: 'error',
      message: `Fields ${exceeded.join(', ')} exceed the maximum field number (536870911).`,
    });
  }

  // Check for gaps that might indicate deleted fields without reserving
  const sortedNumbers = [...fields.map(f => f.number)].sort((a, b) => a - b);
  if (sortedNumbers.length > 1) {
    const max = sortedNumbers[sortedNumbers.length - 1];
    const min = sortedNumbers[0];
    const range = max - min + 1;
    const actual = sortedNumbers.length;
    if (range > actual * 1.5 && range - actual > 3) {
      suggestions.push({
        type: 'warning',
        message: `There are gaps in your field number sequence. If fields were deleted, add \`reserved\` statements to prevent accidental reuse.`,
      });
    }
  }

  // Check for fields in 2-byte range when 1-byte slots available
  const usedIn1to15 = new Set(fields.filter(f => f.number >= 1 && f.number <= 15).map(f => f.number));
  const available1Byte = 15 - usedIn1to15.size;
  const fieldsIn2ByteRange = fields.filter(f => f.number >= 16 && f.number <= 2047).length;
  if (available1Byte > 0 && fieldsIn2ByteRange > 0) {
    suggestions.push({
      type: 'info',
      message: `${available1Byte} slot(s) available in the 1-byte range (1-15). Move your most frequently used fields there for better encoding efficiency.`,
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      type: 'info',
      message: 'Field numbers look good! No issues detected.',
    });
  }

  return suggestions;
}

function getFieldNumberClass(num: number, conflicts: number[], googleReserved: number[], exceeded: number[]): string {
  if (conflicts.includes(num)) return 'text-red-400 font-bold';
  if (googleReserved.includes(num)) return 'text-red-400';
  if (exceeded.includes(num)) return 'text-red-400';
  if (num >= 1 && num <= 15) return 'text-green-400';
  if (num >= 16 && num <= 2047) return 'text-yellow-400';
  return 'text-text';
}

function fieldsToCSV(fields: ProtoField[]): string {
  const header = 'Field Number,Name,Type,Label,Line';
  const rows = fields.map(f =>
    `${f.number},"${f.name}","${f.type}","${f.label || 'implicit'}",${f.line}`
  );
  return [header, ...rows].join('\n');
}

export default function ProtobufFieldNumberTracker() {
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(false);

  const result = input.trim() ? parseProto(input) : null;
  const suggestions = result ? generateSuggestions(result) : [];

  const conflictCount = result?.conflicts.length ?? 0;
  const fieldCount = result?.fields.length ?? 0;
  const reservedCount = result
    ? result.reserved.reduce((acc, r) => acc + r.numbers.length + r.names.length, 0)
    : 0;

  const handleLoadExample = useCallback(() => {
    setInput(SAMPLE_PROTO);
  }, []);

  const handleCopyCSV = useCallback(() => {
    if (!result || result.fields.length === 0) return;
    const csv = fieldsToCSV(result.fields);
    navigator.clipboard.writeText(csv).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [result]);

  const handleClear = useCallback(() => {
    setInput('');
  }, []);

  return (
    <div class="bg-background border border-border rounded-xl p-6">
      <div class="flex flex-col lg:flex-row gap-6">
        {/* Left: Input + Controls */}
        <div class="flex-1 flex flex-col gap-4">
          <div class="flex items-center justify-between">
            <h2 class="text-base font-semibold text-text">Protobuf Field Number Tracker</h2>
            <div class="flex gap-2">
              <button
                onClick={handleLoadExample}
                class="px-3 py-1.5 text-xs bg-surface border border-border text-text-muted hover:text-text rounded-lg transition-colors"
              >
                Load Example
              </button>
              <button
                onClick={handleClear}
                class="px-3 py-1.5 text-xs bg-surface border border-border text-text-muted hover:text-text rounded-lg transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          <div>
            <p class="text-sm font-medium text-text-muted mb-2">Proto File Content</p>
            <textarea
              value={input}
              onInput={(e) => setInput((e.target as HTMLTextAreaElement).value)}
              placeholder={`Paste your .proto file content here...\n\nExample:\nmessage MyMessage {\n  string name = 1;\n  int32 id = 2;\n  repeated string tags = 3;\n  reserved 4, 5;\n}`}
              rows={22}
              class="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm font-mono text-text focus:outline-none focus:border-primary resize-none"
              spellcheck={false}
            />
          </div>

          {result && (
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="px-2.5 py-1 text-xs rounded-full bg-surface border border-border text-text-muted">
                  {fieldCount} field{fieldCount !== 1 ? 's' : ''}
                </span>
                <span class={`px-2.5 py-1 text-xs rounded-full border ${conflictCount > 0 ? 'bg-red-400/10 border-red-400/30 text-red-400' : 'bg-surface border-border text-text-muted'}`}>
                  {conflictCount} conflict{conflictCount !== 1 ? 's' : ''}
                </span>
                <span class="px-2.5 py-1 text-xs rounded-full bg-surface border border-border text-text-muted">
                  {reservedCount} reserved
                </span>
              </div>
              <button
                onClick={handleCopyCSV}
                disabled={fieldCount === 0}
                class="px-3 py-1.5 text-xs bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {copied ? 'Copied!' : 'Copy CSV'}
              </button>
            </div>
          )}

          {/* Legend */}
          <div class="bg-surface border border-border rounded-lg px-4 py-3">
            <p class="text-xs font-medium text-text-muted mb-2">Field Number Encoding</p>
            <div class="flex flex-col gap-1 text-xs">
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                <span class="text-text-muted">1–15: 1-byte tag (optimal for frequent fields)</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0" />
                <span class="text-text-muted">16–2047: 2-byte tag</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                <span class="text-text-muted">19000–19999: Reserved by Google (forbidden)</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                <span class="text-text-muted">Max: 536,870,911 (2^29 - 1)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Analysis Output */}
        <div class="flex-1 flex flex-col gap-4 min-w-0">
          {!result || fieldCount === 0 ? (
            <div class="flex-1 flex items-center justify-center bg-surface border border-border rounded-lg min-h-64">
              <p class="text-sm text-text-muted text-center px-8">
                Paste your proto file content on the left to analyze field numbers, detect conflicts, and get optimization tips.
              </p>
            </div>
          ) : (
            <>
              {/* Field Number Map */}
              <div class="bg-surface border border-border rounded-lg px-4 py-3">
                <p class="text-sm font-medium text-text-muted mb-3">Field Number Map</p>
                <div class="overflow-x-auto">
                  <table class="w-full text-sm">
                    <thead>
                      <tr>
                        <th class="text-left text-text-muted py-1 pr-4 font-medium text-xs">#</th>
                        <th class="text-left text-text-muted py-1 pr-4 font-medium text-xs">Name</th>
                        <th class="text-left text-text-muted py-1 pr-4 font-medium text-xs">Type</th>
                        <th class="text-left text-text-muted py-1 pr-4 font-medium text-xs">Label</th>
                        <th class="text-left text-text-muted py-1 font-medium text-xs">Line</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...result.fields]
                        .sort((a, b) => a.number - b.number)
                        .map((field) => (
                          <tr key={`${field.number}-${field.name}`} class="border-t border-border/50">
                            <td class={`py-1 pr-4 font-mono text-xs ${getFieldNumberClass(field.number, result.conflicts, result.googleReserved, result.exceeded)}`}>
                              {field.number}
                              {result.conflicts.includes(field.number) && (
                                <span class="ml-1 text-red-400" title="Duplicate">⚠</span>
                              )}
                            </td>
                            <td class="py-1 pr-4 font-mono text-xs text-text">{field.name}</td>
                            <td class="py-1 pr-4 font-mono text-xs text-text-muted">{field.type}</td>
                            <td class="py-1 pr-4 font-mono text-xs text-text-muted">{field.label || '—'}</td>
                            <td class="py-1 font-mono text-xs text-text-muted">{field.line}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Reserved Numbers */}
              {result.reserved.length > 0 && (
                <div class="bg-surface border border-border rounded-lg px-4 py-3">
                  <p class="text-sm font-medium text-text-muted mb-3">Reserved Statements</p>
                  <div class="flex flex-col gap-2">
                    {result.reserved.map((r, idx) => (
                      <div key={idx} class="flex flex-wrap gap-2 items-start">
                        <span class="text-xs font-mono text-text-muted">{r.raw}</span>
                        <div class="flex flex-wrap gap-1">
                          {r.numbers.map(n => (
                            <span key={n} class="px-1.5 py-0.5 text-xs font-mono bg-background border border-border rounded text-text-muted">
                              {n}
                            </span>
                          ))}
                          {r.names.map(name => (
                            <span key={name} class="px-1.5 py-0.5 text-xs font-mono bg-background border border-border rounded text-text-muted">
                              "{name}"
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Conflicts */}
              {result.conflicts.length > 0 && (
                <div class="bg-red-400/5 border border-red-400/30 rounded-lg px-4 py-3">
                  <p class="text-sm font-medium text-red-400 mb-3">Duplicate Field Numbers</p>
                  <div class="flex flex-col gap-2">
                    {result.conflicts.map(num => {
                      const dupeFields = result.fields.filter(f => f.number === num);
                      return (
                        <div key={num} class="flex flex-col gap-1">
                          <span class="text-xs text-red-400 font-mono font-bold">Field #{num} used {dupeFields.length} times:</span>
                          {dupeFields.map((f, i) => (
                            <span key={i} class="text-xs font-mono text-text-muted ml-4">
                              Line {f.line}: {f.label ? `${f.label} ` : ''}{f.type} {f.name} = {f.number};
                            </span>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Range Violations */}
              {(result.googleReserved.length > 0 || result.exceeded.length > 0) && (
                <div class="bg-red-400/5 border border-red-400/30 rounded-lg px-4 py-3">
                  <p class="text-sm font-medium text-red-400 mb-3">Range Violations</p>
                  <div class="flex flex-col gap-1">
                    {result.googleReserved.length > 0 && (
                      <p class="text-xs text-red-400">
                        Fields in Google-reserved range (19000-19999): {result.googleReserved.join(', ')}
                      </p>
                    )}
                    {result.exceeded.length > 0 && (
                      <p class="text-xs text-red-400">
                        Fields exceeding maximum (536870911): {result.exceeded.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {suggestions.length > 0 && (
                <div class="bg-surface border border-border rounded-lg px-4 py-3">
                  <p class="text-sm font-medium text-text-muted mb-3">Suggestions</p>
                  <div class="flex flex-col gap-2">
                    {suggestions.map((s, idx) => (
                      <div key={idx} class="flex gap-2 items-start">
                        <span class={`mt-0.5 flex-shrink-0 ${s.type === 'error' ? 'text-red-400' : s.type === 'warning' ? 'text-yellow-400' : 'text-green-400'}`}>
                          {s.type === 'error' ? '✕' : s.type === 'warning' ? '⚠' : '✓'}
                        </span>
                        <p class={`text-xs ${s.type === 'error' ? 'text-red-400' : s.type === 'warning' ? 'text-yellow-400' : 'text-text-muted'}`}>
                          {s.message}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Byte Range Distribution */}
              <div class="bg-surface border border-border rounded-lg px-4 py-3">
                <p class="text-sm font-medium text-text-muted mb-3">Range Distribution</p>
                <div class="flex flex-col gap-1.5">
                  {(() => {
                    const in1to15 = result.fields.filter(f => f.number >= 1 && f.number <= 15).length;
                    const in16to2047 = result.fields.filter(f => f.number >= 16 && f.number <= 2047).length;
                    const in2048plus = result.fields.filter(f => f.number >= 2048 && f.number < 19000).length;
                    const inGoogle = result.googleReserved.length;
                    const inHigh = result.fields.filter(f => f.number > 19999 && f.number <= 536870911).length;
                    const inExceeded = result.exceeded.length;
                    const total = result.fields.length;

                    return (
                      <>
                        {in1to15 > 0 && (
                          <div class="flex items-center gap-3 text-xs">
                            <span class="w-20 text-text-muted flex-shrink-0">1–15</span>
                            <div class="flex-1 bg-background rounded-full h-1.5 overflow-hidden">
                              <div class="h-full bg-green-400 rounded-full" style={{ width: `${(in1to15 / total) * 100}%` }} />
                            </div>
                            <span class="text-green-400 w-8 text-right">{in1to15}</span>
                          </div>
                        )}
                        {in16to2047 > 0 && (
                          <div class="flex items-center gap-3 text-xs">
                            <span class="w-20 text-text-muted flex-shrink-0">16–2047</span>
                            <div class="flex-1 bg-background rounded-full h-1.5 overflow-hidden">
                              <div class="h-full bg-yellow-400 rounded-full" style={{ width: `${(in16to2047 / total) * 100}%` }} />
                            </div>
                            <span class="text-yellow-400 w-8 text-right">{in16to2047}</span>
                          </div>
                        )}
                        {in2048plus > 0 && (
                          <div class="flex items-center gap-3 text-xs">
                            <span class="w-20 text-text-muted flex-shrink-0">2048+</span>
                            <div class="flex-1 bg-background rounded-full h-1.5 overflow-hidden">
                              <div class="h-full bg-text-muted/40 rounded-full" style={{ width: `${(in2048plus / total) * 100}%` }} />
                            </div>
                            <span class="text-text-muted w-8 text-right">{in2048plus}</span>
                          </div>
                        )}
                        {inGoogle > 0 && (
                          <div class="flex items-center gap-3 text-xs">
                            <span class="w-20 text-text-muted flex-shrink-0">19000–19999</span>
                            <div class="flex-1 bg-background rounded-full h-1.5 overflow-hidden">
                              <div class="h-full bg-red-400 rounded-full" style={{ width: `${(inGoogle / total) * 100}%` }} />
                            </div>
                            <span class="text-red-400 w-8 text-right">{inGoogle}</span>
                          </div>
                        )}
                        {inHigh > 0 && (
                          <div class="flex items-center gap-3 text-xs">
                            <span class="w-20 text-text-muted flex-shrink-0">20000+</span>
                            <div class="flex-1 bg-background rounded-full h-1.5 overflow-hidden">
                              <div class="h-full bg-text-muted/40 rounded-full" style={{ width: `${(inHigh / total) * 100}%` }} />
                            </div>
                            <span class="text-text-muted w-8 text-right">{inHigh}</span>
                          </div>
                        )}
                        {inExceeded > 0 && (
                          <div class="flex items-center gap-3 text-xs">
                            <span class="w-20 text-text-muted flex-shrink-0">Exceeded</span>
                            <div class="flex-1 bg-background rounded-full h-1.5 overflow-hidden">
                              <div class="h-full bg-red-400 rounded-full" style={{ width: `${(inExceeded / total) * 100}%` }} />
                            </div>
                            <span class="text-red-400 w-8 text-right">{inExceeded}</span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
