import { useState, useCallback } from 'preact/hooks';

type MockType = 'module' | 'class' | 'function' | 'spy' | 'timer';

interface MockConfig {
  type: MockType;
  modulePath: string;
  className: string;
  methods: string;
  spyObject: string;
  spyMethod: string;
  spyBehavior: 'returnValue' | 'returnValueOnce' | 'resolvedValue' | 'rejectedValue' | 'implementation' | 'noOp';
  spyReturnValue: string;
  timerType: 'fake' | 'legacy';
  useTypescript: boolean;
}

function generateModuleMock(config: MockConfig): string {
  const { modulePath, methods, useTypescript } = config;
  const methodList = methods.split('\n').map(m => m.trim()).filter(Boolean);

  if (methodList.length === 0) {
    return `jest.mock('${modulePath || 'your-module'}');`;
  }

  const mockFns = methodList.map(m => {
    const [name, ret] = m.split(':').map(s => s.trim());
    const returnPart = ret ? ` // returns ${ret}` : '';
    return `  ${name}: jest.fn()${returnPart},`;
  }).join('\n');

  return `jest.mock('${modulePath || 'your-module'}', () => ({
${mockFns}
}));`;
}

function generateClassMock(config: MockConfig): string {
  const { className, methods, useTypescript } = config;
  const name = className || 'MyClass';
  const methodList = methods.split('\n').map(m => m.trim()).filter(Boolean);

  const mockMethods = methodList.length > 0
    ? methodList.map(m => {
        const [methodName] = m.split(':').map(s => s.trim());
        return `  ${methodName}: jest.fn(),`;
      }).join('\n')
    : '  someMethod: jest.fn(),';

  const tsType = useTypescript ? `jest.Mocked<${name}>` : '';
  const castPart = useTypescript ? ` as ${tsType}` : '';

  return `// Mock the entire class
jest.mock('./${name.toLowerCase()}');

// Get the mocked class
const Mock${name} = ${name} as jest.MockedClass<typeof ${name}>;

// Before each test, clear mock state
beforeEach(() => {
  Mock${name}.mockClear();
});

// Example: mock instance methods
Mock${name}.prototype.someMethod = jest.fn().mockReturnValue('mocked');

// Or use mockImplementation on constructor
Mock${name}.mockImplementation(() => ({
${mockMethods}
}));`;
}

function generateFunctionMock(config: MockConfig): string {
  const { modulePath, methods, useTypescript } = config;
  const methodList = methods.split('\n').map(m => m.trim()).filter(Boolean);
  const mod = modulePath || 'your-module';

  if (methodList.length === 0) {
    return `import { myFunction } from '${mod}';
jest.mock('${mod}');

const mockMyFunction = myFunction as jest.MockedFunction<typeof myFunction>;
mockMyFunction.mockReturnValue('mocked value');`;
  }

  const imports = methodList.map(m => m.split(':')[0].trim()).join(', ');
  const mocks = methodList.map(m => {
    const [name, ret] = m.split(':').map(s => s.trim());
    const returnVal = ret || '"mocked"';
    const tsType = useTypescript ? ` as jest.MockedFunction<typeof ${name}>` : '';
    return `const mock${name.charAt(0).toUpperCase() + name.slice(1)} = ${name}${tsType};
mock${name.charAt(0).toUpperCase() + name.slice(1)}.mockReturnValue(${returnVal});`;
  }).join('\n\n');

  return `import { ${imports} } from '${mod}';
jest.mock('${mod}');

${mocks}`;
}

function generateSpyMock(config: MockConfig): string {
  const { spyObject, spyMethod, spyBehavior, spyReturnValue } = config;
  const obj = spyObject || 'myObject';
  const method = spyMethod || 'myMethod';
  const val = spyReturnValue || '"mocked value"';

  const spyVar = `jest.spyOn(${obj}, '${method}')`;

  const behaviorMap: Record<MockConfig['spyBehavior'], string> = {
    returnValue: `.mockReturnValue(${val})`,
    returnValueOnce: `.mockReturnValueOnce(${val})`,
    resolvedValue: `.mockResolvedValue(${val})`,
    rejectedValue: `.mockRejectedValue(new Error(${val}))`,
    implementation: `.mockImplementation((...args) => {\n  // custom implementation\n  return ${val};\n})`,
    noOp: `.mockImplementation(() => {})`,
  };

  const behavior = behaviorMap[spyBehavior];

  return `// Create the spy
const ${method}Spy = ${spyVar}${behavior};

// In your test assertions:
expect(${method}Spy).toHaveBeenCalled();
expect(${method}Spy).toHaveBeenCalledWith(/* expected args */);
expect(${method}Spy).toHaveBeenCalledTimes(1);

// Cleanup after test
afterEach(() => {
  ${method}Spy.mockRestore();
});`;
}

function generateTimerMock(config: MockConfig): string {
  const { timerType } = config;

  const timerArg = timerType === 'legacy' ? `'legacy'` : '';
  const useFakeTimers = timerType === 'legacy'
    ? `jest.useFakeTimers('legacy');`
    : `jest.useFakeTimers();`;

  return `// Setup fake timers
beforeEach(() => {
  ${useFakeTimers}
});

// Restore real timers
afterEach(() => {
  jest.useRealTimers();
});

// In a test:
it('calls callback after delay', () => {
  const callback = jest.fn();
  setTimeout(callback, 1000);

  // Time hasn't passed yet
  expect(callback).not.toHaveBeenCalled();

  // Advance time by 1000ms
  jest.advanceTimersByTime(1000);
  expect(callback).toHaveBeenCalledTimes(1);
});

it('runs all pending timers', () => {
  const callback = jest.fn();
  setTimeout(callback, 5000);
  setInterval(callback, 100);

  // Run all timers immediately
  jest.runAllTimers();
  expect(callback).toHaveBeenCalled();
});`;
}

function generate(config: MockConfig): string {
  switch (config.type) {
    case 'module': return generateModuleMock(config);
    case 'class': return generateClassMock(config);
    case 'function': return generateFunctionMock(config);
    case 'spy': return generateSpyMock(config);
    case 'timer': return generateTimerMock(config);
  }
}

const TYPE_LABELS: Record<MockType, string> = {
  module: 'Module Mock',
  class: 'Class Mock',
  function: 'Function Mock',
  spy: 'Spy',
  timer: 'Timer Mock',
};

const TYPE_DESC: Record<MockType, string> = {
  module: 'Mock an entire module (jest.mock)',
  class: 'Mock a class with constructor + methods',
  function: 'Mock individual exported functions',
  spy: 'Spy on an existing object method',
  timer: 'Control setTimeout/setInterval with fake timers',
};

export default function JestMockGenerator() {
  const [type, setType] = useState<MockType>('module');
  const [modulePath, setModulePath] = useState('axios');
  const [className, setClassName] = useState('UserService');
  const [methods, setMethods] = useState('get: AxiosResponse\npost: AxiosResponse\ndelete: void');
  const [spyObject, setSpyObject] = useState('console');
  const [spyMethod, setSpyMethod] = useState('log');
  const [spyBehavior, setSpyBehavior] = useState<MockConfig['spyBehavior']>('noOp');
  const [spyReturnValue, setSpyReturnValue] = useState('"mocked"');
  const [timerType, setTimerType] = useState<'fake' | 'legacy'>('fake');
  const [useTypescript, setUseTypescript] = useState(true);
  const [copied, setCopied] = useState(false);

  const config: MockConfig = { type, modulePath, className, methods, spyObject, spyMethod, spyBehavior, spyReturnValue, timerType, useTypescript };
  const code = generate(config);

  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [code]);

  const inputClass = 'bg-surface border border-border rounded px-3 py-2 text-sm text-text w-full focus:outline-none focus:ring-1 focus:ring-primary';
  const chipBase = 'px-3 py-2 text-sm rounded border cursor-pointer select-none transition-colors text-left';
  const chipActive = 'bg-primary/20 border-primary text-primary';
  const chipInactive = 'bg-surface border-border text-text hover:border-text-muted';

  return (
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Config */}
      <div class="space-y-5">
        {/* Type selector */}
        <div>
          <label class="block text-sm font-medium text-text mb-2">Mock type</label>
          <div class="grid grid-cols-1 gap-1.5">
            {(Object.keys(TYPE_LABELS) as MockType[]).map(t => (
              <button
                key={t}
                onClick={() => setType(t)}
                class={`${chipBase} ${type === t ? chipActive : chipInactive}`}
              >
                <span class="font-medium">{TYPE_LABELS[t]}</span>
                <span class="text-xs ml-2 opacity-70">{TYPE_DESC[t]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* TypeScript toggle */}
        <label class="flex items-center gap-2 cursor-pointer text-sm text-text">
          <input
            type="checkbox"
            checked={useTypescript}
            onChange={(e) => setUseTypescript((e.target as HTMLInputElement).checked)}
            class="w-4 h-4 accent-primary cursor-pointer"
          />
          TypeScript (add type assertions)
        </label>

        {/* Context-sensitive fields */}
        {(type === 'module' || type === 'function') && (
          <div>
            <label class="block text-sm font-medium text-text mb-1.5">Module path</label>
            <input type="text" value={modulePath} onInput={(e) => setModulePath((e.target as HTMLInputElement).value)} placeholder="axios" class={inputClass} />
          </div>
        )}

        {type === 'class' && (
          <div>
            <label class="block text-sm font-medium text-text mb-1.5">Class name</label>
            <input type="text" value={className} onInput={(e) => setClassName((e.target as HTMLInputElement).value)} placeholder="UserService" class={inputClass} />
          </div>
        )}

        {(type === 'module' || type === 'class' || type === 'function') && (
          <div>
            <label class="block text-sm font-medium text-text mb-1.5">
              Methods / exports <span class="text-text-muted font-normal text-xs">(one per line, name or name:ReturnType)</span>
            </label>
            <textarea
              value={methods}
              onInput={(e) => setMethods((e.target as HTMLTextAreaElement).value)}
              rows={4}
              placeholder="get: AxiosResponse&#10;post: AxiosResponse&#10;delete: void"
              class={inputClass}
            />
          </div>
        )}

        {type === 'spy' && (
          <>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium text-text mb-1.5">Object</label>
                <input type="text" value={spyObject} onInput={(e) => setSpyObject((e.target as HTMLInputElement).value)} placeholder="console" class={inputClass} />
              </div>
              <div>
                <label class="block text-sm font-medium text-text mb-1.5">Method</label>
                <input type="text" value={spyMethod} onInput={(e) => setSpyMethod((e.target as HTMLInputElement).value)} placeholder="log" class={inputClass} />
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-text mb-1.5">Spy behavior</label>
              <select value={spyBehavior} onChange={(e) => setSpyBehavior((e.target as HTMLSelectElement).value as MockConfig['spyBehavior'])} class={inputClass}>
                <option value="noOp">No-op (do nothing)</option>
                <option value="returnValue">mockReturnValue</option>
                <option value="returnValueOnce">mockReturnValueOnce</option>
                <option value="resolvedValue">mockResolvedValue (async)</option>
                <option value="rejectedValue">mockRejectedValue (async error)</option>
                <option value="implementation">mockImplementation (custom)</option>
              </select>
            </div>
            {spyBehavior !== 'noOp' && (
              <div>
                <label class="block text-sm font-medium text-text mb-1.5">Return value</label>
                <input type="text" value={spyReturnValue} onInput={(e) => setSpyReturnValue((e.target as HTMLInputElement).value)} placeholder='"mocked value"' class={inputClass} />
              </div>
            )}
          </>
        )}

        {type === 'timer' && (
          <div>
            <label class="block text-sm font-medium text-text mb-1.5">Timer mode</label>
            <select value={timerType} onChange={(e) => setTimerType((e.target as HTMLSelectElement).value as 'fake' | 'legacy')} class={inputClass}>
              <option value="fake">Modern fake timers (Jest 27+)</option>
              <option value="legacy">Legacy fake timers</option>
            </select>
          </div>
        )}
      </div>

      {/* Output */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium text-text">Generated Mock Code</label>
          <button onClick={copy} class="text-sm px-3 py-1 bg-primary text-white rounded hover:bg-primary/80 transition-colors">
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <pre class="bg-surface border border-border rounded p-4 text-xs font-mono text-text overflow-auto max-h-[540px] whitespace-pre">{code}</pre>
      </div>
    </div>
  );
}
