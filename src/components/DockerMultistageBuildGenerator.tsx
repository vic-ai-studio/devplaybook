import { useState } from 'preact/hooks';

type Language = 'nodejs' | 'python' | 'go' | 'rust' | 'java';

const LANGUAGE_LABELS: Record<Language, string> = {
  nodejs: 'Node.js',
  python: 'Python',
  go: 'Go',
  rust: 'Rust',
  java: 'Java',
};

interface NodeConfig {
  baseImage: 'node:22-alpine' | 'node:22-slim';
  packageManager: 'npm' | 'pnpm' | 'yarn';
  buildCommand: string;
  startCommand: string;
  port: string;
}

interface PythonConfig {
  baseImage: 'python:3.12-slim' | 'python:3.12-alpine';
  usePoetry: boolean;
  requirementsFile: string;
  entrypoint: string;
  port: string;
}

interface GoConfig {
  goVersion: string;
  binaryName: string;
  port: string;
}

interface RustConfig {
  binaryName: string;
  port: string;
}

interface JavaConfig {
  javaVersion: string;
  artifactName: string;
  port: string;
}

function generateNodeDockerfile(cfg: NodeConfig): string {
  const lockFile = cfg.packageManager === 'npm' ? 'package-lock.json' : cfg.packageManager === 'pnpm' ? 'pnpm-lock.yaml' : 'yarn.lock';
  const installCmd = cfg.packageManager === 'npm' ? 'npm ci' : cfg.packageManager === 'pnpm' ? 'pnpm install --frozen-lockfile' : 'yarn install --frozen-lockfile';
  const pnpmSetup = cfg.packageManager === 'pnpm' ? '\nRUN npm install -g pnpm' : '';

  return `# ---- Build Stage ----
FROM ${cfg.baseImage} AS builder
WORKDIR /app${pnpmSetup}

COPY package.json ${lockFile} ./
RUN ${installCmd}

COPY . .
RUN ${cfg.buildCommand || 'npm run build'}

# ---- Production Stage ----
FROM ${cfg.baseImage} AS runner
WORKDIR /app

ENV NODE_ENV=production${pnpmSetup}

COPY package.json ${lockFile} ./
RUN ${cfg.packageManager === 'npm' ? 'npm ci --omit=dev' : cfg.packageManager === 'pnpm' ? 'pnpm install --frozen-lockfile --prod' : 'yarn install --frozen-lockfile --production'}

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

EXPOSE ${cfg.port || '3000'}
CMD [${cfg.startCommand ? cfg.startCommand.split(' ').map(s => `"${s}"`).join(', ') : '"node", "dist/index.js"'}]`;
}

function generatePythonDockerfile(cfg: PythonConfig): string {
  if (cfg.usePoetry) {
    return `# ---- Build Stage ----
FROM ${cfg.baseImage} AS builder
WORKDIR /app

RUN pip install poetry
ENV POETRY_VIRTUALENVS_IN_PROJECT=1

COPY pyproject.toml poetry.lock ./
RUN poetry install --no-dev --no-interaction

# ---- Production Stage ----
FROM ${cfg.baseImage} AS runner
WORKDIR /app

COPY --from=builder /app/.venv ./.venv
COPY . .

ENV PATH="/app/.venv/bin:$PATH"

EXPOSE ${cfg.port || '8000'}
CMD ["${cfg.entrypoint || 'python', '-m', 'uvicorn', 'app.main:app', '--host', '0.0.0.0', '--port', cfg.port || '8000'}"]`;
  }

  return `# ---- Build Stage ----
FROM ${cfg.baseImage} AS builder
WORKDIR /app

COPY ${cfg.requirementsFile || 'requirements.txt'} ./
RUN pip install --no-cache-dir --user -r ${cfg.requirementsFile || 'requirements.txt'}

# ---- Production Stage ----
FROM ${cfg.baseImage} AS runner
WORKDIR /app

COPY --from=builder /root/.local /root/.local
COPY . .

ENV PATH=/root/.local/bin:$PATH

EXPOSE ${cfg.port || '8000'}
CMD ["${cfg.entrypoint || 'python'}", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "${cfg.port || '8000'}"]`;
}

function generateGoDockerfile(cfg: GoConfig): string {
  return `# ---- Build Stage ----
FROM golang:${cfg.goVersion || '1.22'}-alpine AS builder
WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o ${cfg.binaryName || 'app'} .

# ---- Production Stage ----
FROM scratch AS runner

COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /app/${cfg.binaryName || 'app'} /${cfg.binaryName || 'app'}

EXPOSE ${cfg.port || '8080'}
ENTRYPOINT ["/${cfg.binaryName || 'app'}"]`;
}

function generateRustDockerfile(cfg: RustConfig): string {
  return `# ---- Build Stage ----
FROM rust:latest AS builder
WORKDIR /app

COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release && rm -rf src

COPY src ./src
RUN touch src/main.rs && cargo build --release

# ---- Production Stage ----
FROM debian:bookworm-slim AS runner
WORKDIR /app

RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/${cfg.binaryName || 'app'} ./app

EXPOSE ${cfg.port || '8080'}
CMD ["./app"]`;
}

function generateJavaDockerfile(cfg: JavaConfig): string {
  return `# ---- Build Stage ----
FROM eclipse-temurin:${cfg.javaVersion || '21'}-jdk AS builder
WORKDIR /app

COPY mvnw pom.xml ./
COPY .mvn .mvn
RUN ./mvnw dependency:go-offline -q

COPY src ./src
RUN ./mvnw package -DskipTests -q

# ---- Production Stage ----
FROM eclipse-temurin:${cfg.javaVersion || '21'}-jre AS runner
WORKDIR /app

COPY --from=builder /app/target/${cfg.artifactName || 'app'}.jar app.jar

EXPOSE ${cfg.port || '8080'}
ENTRYPOINT ["java", "-jar", "app.jar"]`;
}

function generateDockerignore(lang: Language): string {
  const common = `# Version control
.git
.gitignore

# Docker
Dockerfile*
docker-compose*
.dockerignore

# CI/CD
.github
.gitlab-ci.yml

# IDE
.idea
.vscode
*.swp

# OS
.DS_Store
Thumbs.db`;

  const langSpecific: Record<Language, string> = {
    nodejs: `
# Node.js
node_modules
npm-debug.log*
yarn-error.log
.pnpm-debug.log
dist
build
.next
coverage
.nyc_output
*.log`,
    python: `
# Python
__pycache__
*.py[cod]
*.egg-info
dist
build
.venv
venv
*.egg
.pytest_cache
.mypy_cache
.ruff_cache`,
    go: `
# Go
# (binaries are ignored by default)
*.exe
*.test
vendor/`,
    rust: `
# Rust
target/
*.lock~`,
    java: `
# Java / Maven
target/
*.class
*.jar
*.war
.mvn/wrapper/maven-wrapper.jar`,
  };

  return `${common}${langSpecific[lang]}`;
}

export default function DockerMultistageBuildGenerator() {
  const [lang, setLang] = useState<Language>('nodejs');
  const [nodeConfig, setNodeConfig] = useState<NodeConfig>({
    baseImage: 'node:22-alpine',
    packageManager: 'npm',
    buildCommand: 'npm run build',
    startCommand: 'node dist/index.js',
    port: '3000',
  });
  const [pythonConfig, setPythonConfig] = useState<PythonConfig>({
    baseImage: 'python:3.12-slim',
    usePoetry: false,
    requirementsFile: 'requirements.txt',
    entrypoint: 'python',
    port: '8000',
  });
  const [goConfig, setGoConfig] = useState<GoConfig>({ goVersion: '1.22', binaryName: 'app', port: '8080' });
  const [rustConfig, setRustConfig] = useState<RustConfig>({ binaryName: 'app', port: '8080' });
  const [javaConfig, setJavaConfig] = useState<JavaConfig>({ javaVersion: '21', artifactName: 'app', port: '8080' });
  const [activeTab, setActiveTab] = useState<'dockerfile' | 'dockerignore'>('dockerfile');
  const [copiedDockerfile, setCopiedDockerfile] = useState(false);
  const [copiedIgnore, setCopiedIgnore] = useState(false);

  function getDockerfile(): string {
    switch (lang) {
      case 'nodejs': return generateNodeDockerfile(nodeConfig);
      case 'python': return generatePythonDockerfile(pythonConfig);
      case 'go': return generateGoDockerfile(goConfig);
      case 'rust': return generateRustDockerfile(rustConfig);
      case 'java': return generateJavaDockerfile(javaConfig);
    }
  }

  const dockerfile = getDockerfile();
  const dockerignore = generateDockerignore(lang);

  function copyDockerfile() {
    navigator.clipboard.writeText(dockerfile).then(() => {
      setCopiedDockerfile(true);
      setTimeout(() => setCopiedDockerfile(false), 2000);
    });
  }

  function copyIgnore() {
    navigator.clipboard.writeText(dockerignore).then(() => {
      setCopiedIgnore(true);
      setTimeout(() => setCopiedIgnore(false), 2000);
    });
  }

  return (
    <div class="space-y-6">
      {/* Language Selector */}
      <div class="p-4 rounded-xl border border-border bg-surface">
        <label class="block text-sm font-semibold mb-3">Language / Runtime</label>
        <div class="flex flex-wrap gap-2">
          {(Object.keys(LANGUAGE_LABELS) as Language[]).map(l => (
            <button
              key={l}
              onClick={() => setLang(l)}
              class={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${lang === l ? 'bg-accent text-white' : 'bg-surface-alt border border-border text-text-muted hover:border-accent'}`}
            >
              {LANGUAGE_LABELS[l]}
            </button>
          ))}
        </div>
      </div>

      {/* Config Panel */}
      <div class="p-4 rounded-xl border border-border bg-surface">
        <h3 class="text-sm font-semibold mb-3">{LANGUAGE_LABELS[lang]} Configuration</h3>

        {lang === 'nodejs' && (
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium mb-1">Base Image</label>
              <select value={nodeConfig.baseImage} onChange={e => setNodeConfig(c => ({ ...c, baseImage: (e.target as HTMLSelectElement).value as any }))}
                class="w-full px-3 py-2 rounded-lg bg-surface-alt border border-border text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent">
                <option value="node:22-alpine">node:22-alpine (smallest)</option>
                <option value="node:22-slim">node:22-slim (glibc)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium mb-1">Package Manager</label>
              <select value={nodeConfig.packageManager} onChange={e => setNodeConfig(c => ({ ...c, packageManager: (e.target as HTMLSelectElement).value as any }))}
                class="w-full px-3 py-2 rounded-lg bg-surface-alt border border-border text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent">
                <option value="npm">npm</option>
                <option value="pnpm">pnpm</option>
                <option value="yarn">yarn</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium mb-1">Build Command</label>
              <input value={nodeConfig.buildCommand} onInput={e => setNodeConfig(c => ({ ...c, buildCommand: (e.target as HTMLInputElement).value }))}
                placeholder="npm run build"
                class="w-full px-3 py-2 rounded-lg bg-surface-alt border border-border text-text text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div>
              <label class="block text-xs font-medium mb-1">Start Command</label>
              <input value={nodeConfig.startCommand} onInput={e => setNodeConfig(c => ({ ...c, startCommand: (e.target as HTMLInputElement).value }))}
                placeholder="node dist/index.js"
                class="w-full px-3 py-2 rounded-lg bg-surface-alt border border-border text-text text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div>
              <label class="block text-xs font-medium mb-1">Port</label>
              <input value={nodeConfig.port} onInput={e => setNodeConfig(c => ({ ...c, port: (e.target as HTMLInputElement).value }))}
                placeholder="3000"
                class="w-full px-3 py-2 rounded-lg bg-surface-alt border border-border text-text text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
          </div>
        )}

        {lang === 'python' && (
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium mb-1">Base Image</label>
              <select value={pythonConfig.baseImage} onChange={e => setPythonConfig(c => ({ ...c, baseImage: (e.target as HTMLSelectElement).value as any }))}
                class="w-full px-3 py-2 rounded-lg bg-surface-alt border border-border text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent">
                <option value="python:3.12-slim">python:3.12-slim (recommended)</option>
                <option value="python:3.12-alpine">python:3.12-alpine (smallest)</option>
              </select>
            </div>
            <div class="flex items-end pb-1">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={pythonConfig.usePoetry} onChange={e => setPythonConfig(c => ({ ...c, usePoetry: (e.target as HTMLInputElement).checked }))} class="accent-accent" />
                <span class="text-sm">Use Poetry (instead of pip)</span>
              </label>
            </div>
            {!pythonConfig.usePoetry && (
              <div>
                <label class="block text-xs font-medium mb-1">Requirements File</label>
                <input value={pythonConfig.requirementsFile} onInput={e => setPythonConfig(c => ({ ...c, requirementsFile: (e.target as HTMLInputElement).value }))}
                  placeholder="requirements.txt"
                  class="w-full px-3 py-2 rounded-lg bg-surface-alt border border-border text-text text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
            )}
            <div>
              <label class="block text-xs font-medium mb-1">Port</label>
              <input value={pythonConfig.port} onInput={e => setPythonConfig(c => ({ ...c, port: (e.target as HTMLInputElement).value }))}
                placeholder="8000"
                class="w-full px-3 py-2 rounded-lg bg-surface-alt border border-border text-text text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
          </div>
        )}

        {lang === 'go' && (
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium mb-1">Go Version</label>
              <select value={goConfig.goVersion} onChange={e => setGoConfig(c => ({ ...c, goVersion: (e.target as HTMLSelectElement).value }))}
                class="w-full px-3 py-2 rounded-lg bg-surface-alt border border-border text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent">
                <option value="1.22">1.22</option>
                <option value="1.21">1.21</option>
                <option value="1.20">1.20</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium mb-1">Binary Name</label>
              <input value={goConfig.binaryName} onInput={e => setGoConfig(c => ({ ...c, binaryName: (e.target as HTMLInputElement).value }))}
                placeholder="app"
                class="w-full px-3 py-2 rounded-lg bg-surface-alt border border-border text-text text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div>
              <label class="block text-xs font-medium mb-1">Port</label>
              <input value={goConfig.port} onInput={e => setGoConfig(c => ({ ...c, port: (e.target as HTMLInputElement).value }))}
                placeholder="8080"
                class="w-full px-3 py-2 rounded-lg bg-surface-alt border border-border text-text text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
          </div>
        )}

        {lang === 'rust' && (
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium mb-1">Binary Name</label>
              <input value={rustConfig.binaryName} onInput={e => setRustConfig(c => ({ ...c, binaryName: (e.target as HTMLInputElement).value }))}
                placeholder="app"
                class="w-full px-3 py-2 rounded-lg bg-surface-alt border border-border text-text text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div>
              <label class="block text-xs font-medium mb-1">Port</label>
              <input value={rustConfig.port} onInput={e => setRustConfig(c => ({ ...c, port: (e.target as HTMLInputElement).value }))}
                placeholder="8080"
                class="w-full px-3 py-2 rounded-lg bg-surface-alt border border-border text-text text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
          </div>
        )}

        {lang === 'java' && (
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium mb-1">Java Version</label>
              <select value={javaConfig.javaVersion} onChange={e => setJavaConfig(c => ({ ...c, javaVersion: (e.target as HTMLSelectElement).value }))}
                class="w-full px-3 py-2 rounded-lg bg-surface-alt border border-border text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent">
                <option value="21">21 (LTS)</option>
                <option value="17">17 (LTS)</option>
                <option value="11">11 (LTS)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium mb-1">Artifact Name (without .jar)</label>
              <input value={javaConfig.artifactName} onInput={e => setJavaConfig(c => ({ ...c, artifactName: (e.target as HTMLInputElement).value }))}
                placeholder="app"
                class="w-full px-3 py-2 rounded-lg bg-surface-alt border border-border text-text text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div>
              <label class="block text-xs font-medium mb-1">Port</label>
              <input value={javaConfig.port} onInput={e => setJavaConfig(c => ({ ...c, port: (e.target as HTMLInputElement).value }))}
                placeholder="8080"
                class="w-full px-3 py-2 rounded-lg bg-surface-alt border border-border text-text text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
          </div>
        )}
      </div>

      {/* Output Tabs */}
      <div>
        <div class="flex gap-2 mb-3">
          <button
            onClick={() => setActiveTab('dockerfile')}
            class={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'dockerfile' ? 'bg-accent text-white' : 'bg-surface-alt border border-border text-text-muted hover:border-accent'}`}
          >
            Dockerfile
          </button>
          <button
            onClick={() => setActiveTab('dockerignore')}
            class={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'dockerignore' ? 'bg-accent text-white' : 'bg-surface-alt border border-border text-text-muted hover:border-accent'}`}
          >
            .dockerignore
          </button>
        </div>

        {activeTab === 'dockerfile' && (
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-sm font-medium text-text-muted">Dockerfile</label>
              <button onClick={copyDockerfile} class="text-sm px-3 py-1.5 rounded-lg bg-surface-alt border border-border hover:border-accent transition-colors">
                {copiedDockerfile ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
            <pre class="p-4 rounded-xl bg-surface border border-border text-sm font-mono overflow-x-auto whitespace-pre text-text">{dockerfile}</pre>
          </div>
        )}

        {activeTab === 'dockerignore' && (
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-sm font-medium text-text-muted">.dockerignore</label>
              <button onClick={copyIgnore} class="text-sm px-3 py-1.5 rounded-lg bg-surface-alt border border-border hover:border-accent transition-colors">
                {copiedIgnore ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
            <pre class="p-4 rounded-xl bg-surface border border-border text-sm font-mono overflow-x-auto whitespace-pre text-text">{dockerignore}</pre>
          </div>
        )}
      </div>

      <div class="p-4 rounded-xl bg-accent/5 border border-accent/20 text-sm">
        <p class="font-medium mb-1">Build &amp; Run</p>
        <code class="text-xs font-mono text-text-muted">docker build -t my-app . &amp;&amp; docker run -p {lang === 'nodejs' ? nodeConfig.port : lang === 'python' ? pythonConfig.port : lang === 'go' ? goConfig.port : lang === 'rust' ? rustConfig.port : javaConfig.port}:{lang === 'nodejs' ? nodeConfig.port : lang === 'python' ? pythonConfig.port : lang === 'go' ? goConfig.port : lang === 'rust' ? rustConfig.port : javaConfig.port} my-app</code>
      </div>
    </div>
  );
}
