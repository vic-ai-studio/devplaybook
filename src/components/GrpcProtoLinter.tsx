import { useState } from 'preact/hooks';

type LintIssue = {
  level: 'error' | 'warning' | 'suggestion';
  rule: string;
  message: string;
  line?: number;
};

const SAMPLE_PROTO = `syntax = "proto3";

package userService;

option go_package = "github.com/example/user/v1;userv1";

// UserService provides user management operations.
service UserService {
  // getUser retrieves a user by ID.
  rpc getUser(getUserRequest) returns (getUserResponse);
  rpc CreateUser(CreateUserRequest) returns (CreateUserResponse);
  rpc deleteUser(DeleteUserRequest) returns (google.protobuf.Empty);
}

message getUserRequest {
  string userId = 1;
  bool IsAdmin = 2;
  int64 createdAt = 3;
}

message getUserResponse {
  string user_id = 1;
  string userName = 2;
  repeated string role = 3;
  string emailAddress = 4;
}

message CreateUserRequest {
  string name = 1;
  string email_address = 2;
  UserType type = 3;
}

message CreateUserResponse {
  string id = 1;
}

enum UserType {
  ADMIN = 1;
  GUEST = 2;
}
`;

function isPascalCase(s: string): boolean {
  return /^[A-Z][A-Za-z0-9]*$/.test(s);
}

function isSnakeCase(s: string): boolean {
  return /^[a-z][a-z0-9_]*$/.test(s);
}

function isScreamingSnakeCase(s: string): boolean {
  return /^[A-Z][A-Z0-9_]*$/.test(s);
}

function getLineNumber(content: string, searchText: string): number | undefined {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(searchText)) return i + 1;
  }
  return undefined;
}

function lintProto(input: string): LintIssue[] {
  const issues: LintIssue[] = [];
  if (!input.trim()) {
    return [{ level: 'error', rule: 'empty-input', message: 'Empty input. Paste a .proto file to lint.' }];
  }

  const lines = input.split('\n');

  // --- syntax declaration ---
  const syntaxLine = lines.find(l => l.trim().startsWith('syntax'));
  if (!syntaxLine) {
    issues.push({ level: 'error', rule: 'missing-syntax', message: 'Missing syntax declaration. Add `syntax = "proto3";` at the top.' });
  } else if (!syntaxLine.includes('"proto3"') && !syntaxLine.includes('"proto2"')) {
    issues.push({ level: 'error', rule: 'invalid-syntax', message: 'Invalid syntax value. Use `syntax = "proto3";` or `syntax = "proto2";`.' });
  }

  // --- package declaration ---
  const packageLine = lines.find(l => l.trim().startsWith('package '));
  if (!packageLine) {
    issues.push({ level: 'warning', rule: 'missing-package', message: 'Missing package declaration. Always declare a package to prevent naming collisions (e.g. `package mycompany.myservice.v1;`).' });
  } else {
    const pkgMatch = packageLine.match(/^package\s+([\w.]+);/);
    if (pkgMatch) {
      const pkg = pkgMatch[1];
      if (/[A-Z]/.test(pkg)) {
        issues.push({ level: 'warning', rule: 'package-case', message: `Package name "${pkg}" contains uppercase letters. Use all-lowercase, dot-separated names (e.g. \`mycompany.service.v1\`).`, line: getLineNumber(input, packageLine.trim()) });
      }
    }
  }

  // --- service checks ---
  const serviceRegex = /^service\s+(\w+)\s*\{/gm;
  let sMatch;
  while ((sMatch = serviceRegex.exec(input)) !== null) {
    const name = sMatch[1];
    const lineNum = input.substring(0, sMatch.index).split('\n').length;

    if (!isPascalCase(name)) {
      issues.push({ level: 'error', rule: 'service-naming', message: `Service "${name}" should be PascalCase (e.g. \`${name.charAt(0).toUpperCase() + name.slice(1)}\`).`, line: lineNum });
    }

    // Check if service has a doc comment
    const beforeService = input.substring(0, sMatch.index);
    const prevLines = beforeService.trimEnd().split('\n');
    const lastLine = prevLines[prevLines.length - 1]?.trim() || '';
    if (!lastLine.startsWith('//') && !lastLine.startsWith('/*') && !lastLine.startsWith('*')) {
      issues.push({ level: 'suggestion', rule: 'service-comment', message: `Service "${name}" has no documentation comment. Add a // comment above describing its purpose.`, line: lineNum });
    }
  }

  // --- RPC method checks ---
  const rpcRegex = /rpc\s+(\w+)\s*\((\w+[\w.]*)\)\s*returns\s*\((\w+[\w.]*)\)/g;
  let rpcMatch;
  while ((rpcMatch = rpcRegex.exec(input)) !== null) {
    const method = rpcMatch[1];
    const reqType = rpcMatch[2];
    const resType = rpcMatch[3];
    const lineNum = input.substring(0, rpcMatch.index).split('\n').length;

    // RPC method must be PascalCase
    if (!isPascalCase(method)) {
      issues.push({ level: 'error', rule: 'rpc-naming', message: `RPC method "${method}" should be PascalCase (e.g. \`${method.charAt(0).toUpperCase() + method.slice(1)}\`).`, line: lineNum });
    }

    // Request type should end with "Request"
    const skipReqTypes = ['Empty', 'google.protobuf.Empty'];
    if (!skipReqTypes.includes(reqType) && !reqType.endsWith('Request') && !reqType.endsWith('Req')) {
      issues.push({ level: 'suggestion', rule: 'rpc-request-suffix', message: `RPC "${method}" request type "${reqType}" should end with "Request" for clarity (e.g. \`${method}Request\`).`, line: lineNum });
    }

    // Response type should end with "Response"
    const skipResTypes = ['Empty', 'google.protobuf.Empty'];
    if (!skipResTypes.includes(resType) && !resType.endsWith('Response') && !resType.endsWith('Res') && !resType.endsWith('Reply')) {
      issues.push({ level: 'suggestion', rule: 'rpc-response-suffix', message: `RPC "${method}" response type "${resType}" should end with "Response" for clarity (e.g. \`${method}Response\`).`, line: lineNum });
    }

    // Check for doc comment on RPC
    const beforeRpc = input.substring(0, rpcMatch.index);
    const prevRpcLines = beforeRpc.trimEnd().split('\n');
    const lastRpcLine = prevRpcLines[prevRpcLines.length - 1]?.trim() || '';
    if (!lastRpcLine.startsWith('//') && !lastRpcLine.startsWith('*')) {
      issues.push({ level: 'suggestion', rule: 'rpc-comment', message: `RPC "${method}" has no documentation comment. Add a // comment describing what it does.`, line: lineNum });
    }
  }

  // --- message checks ---
  const messageRegex = /^message\s+(\w+)\s*\{/gm;
  let msgMatch;
  while ((msgMatch = messageRegex.exec(input)) !== null) {
    const name = msgMatch[1];
    const lineNum = input.substring(0, msgMatch.index).split('\n').length;

    if (!isPascalCase(name)) {
      issues.push({ level: 'error', rule: 'message-naming', message: `Message "${name}" should be PascalCase (e.g. \`${name.charAt(0).toUpperCase() + name.slice(1)}\`).`, line: lineNum });
    }

    // Extract message body
    const bodyStart = msgMatch.index + msgMatch[0].length;
    let depth = 1;
    let bodyEnd = bodyStart;
    while (bodyEnd < input.length && depth > 0) {
      if (input[bodyEnd] === '{') depth++;
      else if (input[bodyEnd] === '}') depth--;
      bodyEnd++;
    }
    const body = input.substring(bodyStart, bodyEnd - 1);

    // Field checks within message
    const fieldRegex = /^\s*(repeated\s+|optional\s+|required\s+)?([\w.]+)\s+(\w+)\s*=\s*(\d+)/gm;
    let fieldMatch;
    while ((fieldMatch = fieldRegex.exec(body)) !== null) {
      const modifier = fieldMatch[1]?.trim() || '';
      const fieldType = fieldMatch[2];
      const fieldName = fieldMatch[3];
      const fieldNum = parseInt(fieldMatch[4]);
      const fieldLine = lineNum + body.substring(0, fieldMatch.index).split('\n').length - 1;

      // Field name must be snake_case
      if (!isSnakeCase(fieldName)) {
        issues.push({ level: 'error', rule: 'field-naming', message: `Field "${fieldName}" in "${name}" should be snake_case (e.g. \`${fieldName.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '')}\`).`, line: fieldLine });
      }

      // Repeated fields should be plural
      if (modifier === 'repeated' && !fieldName.endsWith('s') && !fieldName.endsWith('_list') && !fieldName.endsWith('es')) {
        issues.push({ level: 'suggestion', rule: 'repeated-plural', message: `Repeated field "${fieldName}" should typically be plural (e.g. \`${fieldName}s\`).`, line: fieldLine });
      }

      // Avoid int64 for IDs (prefer string)
      if (fieldType === 'int64' && (fieldName.endsWith('_id') || fieldName === 'id')) {
        issues.push({ level: 'suggestion', rule: 'id-type', message: `Field "${fieldName}" uses int64. Consider using string for IDs to avoid JavaScript precision loss and for better cross-language compatibility.`, line: fieldLine });
      }

      // Timestamp fields should use google.protobuf.Timestamp
      if ((fieldName === 'created_at' || fieldName === 'updated_at' || fieldName === 'deleted_at' || fieldName.endsWith('_at') || fieldName.endsWith('_time')) && (fieldType === 'int64' || fieldType === 'int32' || fieldType === 'string')) {
        issues.push({ level: 'suggestion', rule: 'timestamp-type', message: `Field "${fieldName}" stores a timestamp but uses ${fieldType}. Use \`google.protobuf.Timestamp\` for portability and correct serialization.`, line: fieldLine });
      }

      // Reserved field numbers 19000-19999
      if (fieldNum >= 19000 && fieldNum <= 19999) {
        issues.push({ level: 'error', rule: 'reserved-field-number', message: `Field "${fieldName}" uses number ${fieldNum} which is reserved by the Protobuf implementation (19000–19999). Use a different number.`, line: fieldLine });
      }

      // Field number 0 is invalid
      if (fieldNum === 0) {
        issues.push({ level: 'error', rule: 'zero-field-number', message: `Field "${fieldName}" has number 0. Field numbers must start from 1.`, line: fieldLine });
      }
    }
  }

  // --- enum checks ---
  const enumRegex = /^enum\s+(\w+)\s*\{/gm;
  let enumMatch;
  while ((enumMatch = enumRegex.exec(input)) !== null) {
    const enumName = enumMatch[1];
    const lineNum = input.substring(0, enumMatch.index).split('\n').length;

    if (!isPascalCase(enumName)) {
      issues.push({ level: 'error', rule: 'enum-naming', message: `Enum "${enumName}" should be PascalCase (e.g. \`${enumName.charAt(0).toUpperCase() + enumName.slice(1)}\`).`, line: lineNum });
    }

    // Extract enum body
    const bodyStart = enumMatch.index + enumMatch[0].length;
    let depth = 1;
    let bodyEnd = bodyStart;
    while (bodyEnd < input.length && depth > 0) {
      if (input[bodyEnd] === '{') depth++;
      else if (input[bodyEnd] === '}') depth--;
      bodyEnd++;
    }
    const body = input.substring(bodyStart, bodyEnd - 1);

    // Enum values must be SCREAMING_SNAKE_CASE
    const valueRegex = /^\s*(\w+)\s*=\s*(\d+)/gm;
    let valMatch;
    let hasZeroValue = false;
    let firstValue = true;
    while ((valMatch = valueRegex.exec(body)) !== null) {
      const valName = valMatch[1];
      const valNum = parseInt(valMatch[2]);
      const valLine = lineNum + body.substring(0, valMatch.index).split('\n').length - 1;

      if (valNum === 0) hasZeroValue = true;
      if (firstValue && valNum !== 0) {
        const syntaxIsProto3 = syntaxLine?.includes('proto3');
        if (syntaxIsProto3) {
          issues.push({ level: 'error', rule: 'enum-zero-value', message: `Enum "${enumName}": first value must be 0 in proto3. The zero value is the default and must be defined. Use \`${enumName.toUpperCase()}_UNSPECIFIED = 0;\`.`, line: valLine });
        }
      }
      firstValue = false;

      if (!isScreamingSnakeCase(valName)) {
        issues.push({ level: 'error', rule: 'enum-value-naming', message: `Enum value "${valName}" in "${enumName}" should be SCREAMING_SNAKE_CASE (e.g. \`${valName.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase()}\`).`, line: valLine });
      }

      // Enum values should be prefixed with enum name
      if (!valName.startsWith(enumName.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase() + '_') && !valName.startsWith(enumName.toUpperCase() + '_')) {
        issues.push({ level: 'suggestion', rule: 'enum-value-prefix', message: `Enum value "${valName}" should be prefixed with the enum type name to avoid collisions (e.g. \`${enumName.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase()}_${valName}\`).`, line: valLine });
      }
    }
  }

  // --- go_package option ---
  const hasGoPackage = /option\s+go_package/.test(input);
  if (!hasGoPackage) {
    issues.push({ level: 'suggestion', rule: 'missing-go-package', message: 'Missing `option go_package`. Add a go_package option for Go code generation (e.g. `option go_package = "github.com/org/repo/pkg/v1;pkgv1";`).' });
  }

  if (issues.length === 0) {
    issues.push({ level: 'suggestion', rule: 'all-clear', message: 'No lint issues found. Proto file follows naming conventions and best practices.' });
  }

  return issues;
}

const LEVEL_STYLES = {
  error: { bg: 'bg-red-500/10 border-red-500/30', icon: '✗', text: 'text-red-400', badge: 'bg-red-500/20 text-red-400' },
  warning: { bg: 'bg-yellow-500/10 border-yellow-500/30', icon: '⚠', text: 'text-yellow-400', badge: 'bg-yellow-500/20 text-yellow-400' },
  suggestion: { bg: 'bg-blue-500/10 border-blue-500/30', icon: '●', text: 'text-blue-400', badge: 'bg-blue-500/20 text-blue-400' },
};

export default function GrpcProtoLinter() {
  const [input, setInput] = useState(SAMPLE_PROTO);
  const [issues, setIssues] = useState<LintIssue[]>(() => lintProto(SAMPLE_PROTO));
  const [linted, setLinted] = useState(true);

  const handleLint = () => {
    setIssues(lintProto(input));
    setLinted(true);
  };

  const errors = issues.filter(i => i.level === 'error');
  const warnings = issues.filter(i => i.level === 'warning');
  const suggestions = issues.filter(i => i.level === 'suggestion');

  return (
    <div class="space-y-4">
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium text-text-muted">.proto file content</label>
          <div class="flex gap-2">
            <button onClick={() => { setInput(SAMPLE_PROTO); setIssues(lintProto(SAMPLE_PROTO)); setLinted(true); }} class="text-xs px-2 py-1 bg-surface border border-border rounded hover:border-accent transition-colors">Load example</button>
            <button onClick={() => { setInput(''); setIssues([]); setLinted(false); }} class="text-xs px-2 py-1 bg-surface border border-border rounded hover:border-accent transition-colors">Clear</button>
          </div>
        </div>
        <textarea
          value={input}
          onInput={e => { setInput((e.target as HTMLTextAreaElement).value); setLinted(false); }}
          rows={20}
          class="w-full font-mono text-sm bg-background border border-border rounded-lg p-3 resize-y focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
          placeholder="Paste your .proto file here..."
          spellcheck={false}
        />
      </div>

      <button onClick={handleLint} class="w-full py-2.5 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition-colors">
        Lint Proto File
      </button>

      {linted && issues.length > 0 && (
        <div class="space-y-3">
          <div class="flex items-center gap-3 text-sm flex-wrap">
            <span class="font-medium text-text">Results:</span>
            {errors.length > 0 && <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400">{errors.length} error{errors.length !== 1 ? 's' : ''}</span>}
            {warnings.length > 0 && <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">{warnings.length} warning{warnings.length !== 1 ? 's' : ''}</span>}
            {suggestions.length > 0 && <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">{suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''}</span>}
          </div>
          <div class="space-y-2">
            {issues.map((issue, i) => {
              const style = LEVEL_STYLES[issue.level];
              return (
                <div key={i} class={`flex gap-3 p-3 border rounded-lg ${style.bg}`}>
                  <span class={`font-bold text-lg leading-none mt-0.5 flex-shrink-0 ${style.text}`}>{style.icon}</span>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class={`text-xs font-medium uppercase tracking-wide ${style.text}`}>{issue.level}</span>
                      <span class="text-xs text-text-muted font-mono">{issue.rule}</span>
                      {issue.line && <span class="text-xs text-text-muted">line {issue.line}</span>}
                    </div>
                    <p class="text-sm text-text mt-0.5">{issue.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div class="bg-surface border border-border rounded-lg p-4 text-xs text-text-muted">
        <p class="font-medium text-text mb-2">Lint rules</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
          <ul class="space-y-1 list-disc list-inside">
            <li>syntax declaration present & valid</li>
            <li>package declaration present & lowercase</li>
            <li>Service names: PascalCase</li>
            <li>RPC method names: PascalCase</li>
            <li>Request types: …Request suffix</li>
            <li>Response types: …Response suffix</li>
          </ul>
          <ul class="space-y-1 list-disc list-inside">
            <li>Message names: PascalCase</li>
            <li>Field names: snake_case</li>
            <li>Repeated fields: plural names</li>
            <li>Enum names: PascalCase, values SCREAMING_SNAKE_CASE</li>
            <li>Enum zero value required (proto3)</li>
            <li>Timestamp & ID field type suggestions</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
