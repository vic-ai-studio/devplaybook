import { useState, useCallback } from 'preact/hooks';

type IssueLevel = 'error' | 'warning' | 'info';

interface ProtoIssue {
  level: IssueLevel;
  message: string;
  line?: number;
  doc?: string;
}

const SAMPLE = `syntax = "proto3";

package example.v1;

option go_package = "github.com/example/api/gen/go;examplev1";

import "google/protobuf/timestamp.proto";

// UserService provides user management operations.
service UserService {
  rpc GetUser (GetUserRequest) returns (GetUserResponse);
  rpc ListUsers (ListUsersRequest) returns (ListUsersResponse);
  rpc CreateUser (CreateUserRequest) returns (CreateUserResponse);
}

message GetUserRequest {
  string user_id = 1;
}

message GetUserResponse {
  User user = 1;
}

message ListUsersRequest {
  int32 page_size = 1;
  string page_token = 2;
}

message ListUsersResponse {
  repeated User users = 1;
  string next_page_token = 2;
}

message CreateUserRequest {
  string email = 1;
  string display_name = 2;
}

message CreateUserResponse {
  User user = 1;
}

message User {
  string id = 1;
  string email = 2;
  string display_name = 3;
  bool   active = 4;
  google.protobuf.Timestamp created_at = 5;
}
`;

function validateProto(proto: string): ProtoIssue[] {
  const issues: ProtoIssue[] = [];
  const lines = proto.split('\n');

  if (!proto.trim()) {
    issues.push({ level: 'error', message: 'Empty input — paste a Protocol Buffer .proto file.' });
    return issues;
  }

  // Must declare syntax
  const syntaxMatch = proto.match(/^\s*syntax\s*=\s*["'](proto2|proto3)["']\s*;/m);
  if (!syntaxMatch) {
    issues.push({ level: 'error', message: 'Missing syntax declaration. Add: syntax = "proto3"; as the first non-comment line.', doc: 'https://protobuf.dev/programming-guides/proto3/#syntax' });
  } else if (syntaxMatch[1] === 'proto2') {
    issues.push({ level: 'info', message: 'Using proto2 syntax. proto3 is recommended for new services — it removes required/optional modifiers and supports JSON mapping.', doc: 'https://protobuf.dev/programming-guides/proto3/' });
  }

  // Must have package declaration
  if (!proto.match(/^\s*package\s+[\w.]+\s*;/m)) {
    issues.push({ level: 'warning', message: 'Missing "package" declaration. Always declare a package to avoid name collisions in generated code.', doc: 'https://protobuf.dev/programming-guides/proto3/#packages' });
  }

  // Field numbers: check for field number 19000–19999 (reserved by Google)
  lines.forEach((line, i) => {
    const m = line.match(/=\s*(\d+)\s*;/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n >= 19000 && n <= 19999) {
        issues.push({ level: 'error', message: `Line ${i + 1}: Field number ${n} is in the reserved range 19000–19999. Choose a different number.`, line: i + 1, doc: 'https://protobuf.dev/programming-guides/proto3/#assigning-field-numbers' });
      }
      if (n === 0) {
        issues.push({ level: 'error', message: `Line ${i + 1}: Field number 0 is not allowed. Field numbers must start at 1.`, line: i + 1 });
      }
    }
  });

  // Detect duplicate field numbers within a message
  const messageBlocks: { name: string; startLine: number; content: string }[] = [];
  let depth = 0;
  let currentBlock = '';
  let blockStart = 0;
  let blockName = '';
  lines.forEach((line, i) => {
    if (/^\s*message\s+\w+\s*\{/.test(line)) {
      depth = 1;
      blockStart = i + 1;
      blockName = (line.match(/message\s+(\w+)/) || [])[1] || 'unknown';
      currentBlock = line + '\n';
    } else if (depth > 0) {
      currentBlock += line + '\n';
      depth += (line.match(/\{/g) || []).length;
      depth -= (line.match(/\}/g) || []).length;
      if (depth === 0) {
        messageBlocks.push({ name: blockName, startLine: blockStart, content: currentBlock });
        currentBlock = '';
      }
    }
  });

  messageBlocks.forEach(({ name, startLine, content }) => {
    const fieldNumbers = new Map<number, number>();
    const fieldNames = new Map<string, number>();
    content.split('\n').forEach((line, i) => {
      const m = line.match(/^\s+(?:repeated\s+|optional\s+|required\s+)?[\w.]+\s+(\w+)\s*=\s*(\d+)\s*;/);
      if (m) {
        const fname = m[1];
        const fnum = parseInt(m[2], 10);
        const absLine = startLine + i;
        if (fieldNumbers.has(fnum)) {
          issues.push({ level: 'error', message: `Message "${name}": duplicate field number ${fnum} (lines ${fieldNumbers.get(fnum)} and ${absLine}). Each field must have a unique number.`, line: absLine });
        } else {
          fieldNumbers.set(fnum, absLine);
        }
        if (fieldNames.has(fname)) {
          issues.push({ level: 'error', message: `Message "${name}": duplicate field name "${fname}" (lines ${fieldNames.get(fname)} and ${absLine}).`, line: absLine });
        } else {
          fieldNames.set(fname, absLine);
        }
      }
    });
  });

  // Check field naming convention (snake_case)
  lines.forEach((line, i) => {
    const m = line.match(/^\s+(?:repeated\s+|optional\s+)?[\w.]+\s+([a-zA-Z_]\w*)\s*=\s*\d+\s*;/);
    if (m) {
      const name = m[1];
      if (/[A-Z]/.test(name)) {
        issues.push({ level: 'warning', message: `Line ${i + 1}: Field name "${name}" uses uppercase letters. Proto3 convention is snake_case for field names.`, line: i + 1, doc: 'https://protobuf.dev/programming-guides/style/#message-and-field-names' });
      }
    }
  });

  // Check message naming convention (PascalCase)
  lines.forEach((line, i) => {
    const m = line.match(/^\s*message\s+([a-zA-Z_]\w*)/);
    if (m) {
      const name = m[1];
      if (!/^[A-Z][a-zA-Z0-9]*$/.test(name)) {
        issues.push({ level: 'warning', message: `Line ${i + 1}: Message name "${name}" should be PascalCase (e.g. UserRequest).`, line: i + 1 });
      }
    }
  });

  // Check enum naming (SCREAMING_SNAKE_CASE for values)
  let inEnum = false;
  lines.forEach((line, i) => {
    if (/^\s*enum\s+\w+\s*\{/.test(line)) inEnum = true;
    if (inEnum && /^\s*\}/.test(line)) inEnum = false;
    if (inEnum) {
      const m = line.match(/^\s+([a-zA-Z_]\w*)\s*=\s*\d+\s*;/);
      if (m && /[a-z]/.test(m[1])) {
        issues.push({ level: 'warning', message: `Line ${i + 1}: Enum value "${m[1]}" should be SCREAMING_SNAKE_CASE (e.g. STATUS_ACTIVE).`, line: i + 1, doc: 'https://protobuf.dev/programming-guides/style/#enums' });
      }
    }
  });

  // First enum value should be 0 (proto3 requirement)
  let inEnumBlock = false;
  let enumFirstValue: null | { line: number; val: number } = null;
  lines.forEach((line, i) => {
    if (/^\s*enum\s+\w+\s*\{/.test(line)) { inEnumBlock = true; enumFirstValue = null; }
    if (inEnumBlock && /^\s*\}/.test(line)) {
      inEnumBlock = false;
      enumFirstValue = null;
    }
    if (inEnumBlock && enumFirstValue === null) {
      const m = line.match(/^\s+\w+\s*=\s*(\d+)\s*;/);
      if (m) {
        enumFirstValue = { line: i + 1, val: parseInt(m[1], 10) };
        if (enumFirstValue.val !== 0) {
          issues.push({ level: 'error', message: `Line ${i + 1}: First enum value must be 0 in proto3. Add a default/unknown entry with value 0 (e.g. STATUS_UNSPECIFIED = 0).`, line: i + 1, doc: 'https://protobuf.dev/programming-guides/proto3/#enum' });
        }
      }
    }
  });

  // Warn about missing go_package or java_package for language interop
  if (!proto.includes('option go_package') && !proto.includes('option java_package') && !proto.includes('option java_outer_classname')) {
    issues.push({ level: 'info', message: 'No language-specific options (go_package, java_package) found. Add these for clean generated code paths.', doc: 'https://protobuf.dev/programming-guides/proto3/#options' });
  }

  // Warn about services without comments
  lines.forEach((line, i) => {
    if (/^\s*service\s+\w+\s*\{/.test(line)) {
      const prevLine = i > 0 ? lines[i - 1].trim() : '';
      if (!prevLine.startsWith('//') && !prevLine.startsWith('/*')) {
        const serviceName = (line.match(/service\s+(\w+)/) || [])[1];
        issues.push({ level: 'info', message: `Line ${i + 1}: Service "${serviceName}" has no preceding comment. Add a doc comment to describe the service's purpose.` });
      }
    }
  });

  if (issues.length === 0) {
    issues.push({ level: 'info', message: '✓ No issues found in this Protocol Buffer definition.' });
  }

  return issues;
}

const LEVEL_CONFIG: Record<IssueLevel, { icon: string; bg: string; border: string; text: string; label: string }> = {
  error:   { icon: '✖', bg: 'bg-red-500/10',    border: 'border-red-500/40',    text: 'text-red-400',    label: 'Error' },
  warning: { icon: '⚠', bg: 'bg-yellow-500/10', border: 'border-yellow-500/40', text: 'text-yellow-400', label: 'Warning' },
  info:    { icon: 'ℹ', bg: 'bg-blue-500/10',   border: 'border-blue-500/40',   text: 'text-blue-400',   label: 'Info' },
};

export default function GrpcProtoValidator() {
  const [proto, setProto] = useState(SAMPLE);
  const [issues, setIssues] = useState<ProtoIssue[] | null>(null);
  const [hasRun, setHasRun] = useState(false);

  const validate = useCallback(() => {
    setIssues(validateProto(proto));
    setHasRun(true);
  }, [proto]);

  const loadSample = useCallback(() => {
    setProto(SAMPLE);
    setIssues(null);
    setHasRun(false);
  }, []);

  const errorCount = issues?.filter(i => i.level === 'error').length   ?? 0;
  const warnCount  = issues?.filter(i => i.level === 'warning').length  ?? 0;
  const infoCount  = issues?.filter(i => i.level === 'info').length     ?? 0;

  return (
    <div class="space-y-4">
      <div class="flex gap-2 flex-wrap">
        <span class="text-sm text-text-muted">.proto file</span>
        <button
          onClick={loadSample}
          class="ml-auto px-3 py-1.5 text-xs bg-surface border border-border rounded text-text-muted hover:border-accent transition-colors"
        >
          Load Sample
        </button>
      </div>

      <div>
        <label class="text-sm font-medium text-text mb-2 block">Protocol Buffer Definition</label>
        <textarea
          value={proto}
          onInput={e => { setProto((e.target as HTMLTextAreaElement).value); setHasRun(false); setIssues(null); }}
          placeholder="Paste your .proto file content here..."
          class="w-full h-80 bg-[#0d1117] border border-border rounded-lg p-3 font-mono text-xs resize-none focus:outline-none focus:border-accent text-text"
          spellcheck={false}
        />
      </div>

      <button
        onClick={validate}
        class="px-5 py-2 bg-accent text-white rounded hover:bg-accent/80 transition-colors text-sm font-medium"
      >
        Validate Proto
      </button>

      {hasRun && issues && (
        <div class="space-y-3">
          <div class="flex items-center gap-4 text-sm p-3 bg-surface border border-border rounded-lg flex-wrap">
            <span class="font-medium text-text">Results:</span>
            <span class="text-red-400">{errorCount} error{errorCount !== 1 ? 's' : ''}</span>
            <span class="text-yellow-400">{warnCount} warning{warnCount !== 1 ? 's' : ''}</span>
            <span class="text-blue-400">{infoCount} suggestion{infoCount !== 1 ? 's' : ''}</span>
          </div>
          <div class="space-y-2">
            {issues.map((issue, i) => {
              const cfg = LEVEL_CONFIG[issue.level];
              return (
                <div key={i} class={`flex gap-3 p-3 rounded-lg border ${cfg.bg} ${cfg.border}`}>
                  <span class={`text-sm font-bold shrink-0 mt-0.5 ${cfg.text}`}>{cfg.icon}</span>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-0.5">
                      <span class={`text-xs font-bold uppercase tracking-wide ${cfg.text}`}>{cfg.label}</span>
                      {issue.line && <span class="text-xs text-text-muted">line {issue.line}</span>}
                    </div>
                    <p class="text-sm text-text">{issue.message}</p>
                    {issue.doc && (
                      <a href={issue.doc} target="_blank" rel="noopener noreferrer" class="text-xs text-accent hover:underline mt-1 block">
                        Docs ↗
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p class="text-xs text-text-muted">
        Validates proto3/proto2 syntax, field numbering, naming conventions, enum rules, and compatibility best practices. Runs entirely in your browser — nothing is sent to any server.
      </p>
    </div>
  );
}
