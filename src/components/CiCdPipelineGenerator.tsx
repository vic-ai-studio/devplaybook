import { useState } from 'preact/hooks';

type Platform = 'github-actions' | 'gitlab-ci' | 'circleci';
type ProjectType = 'nodejs' | 'python' | 'docker' | 'go';

const PLATFORM_LABELS: Record<Platform, string> = {
  'github-actions': 'GitHub Actions',
  'gitlab-ci': 'GitLab CI',
  'circleci': 'CircleCI',
};

const PROJECT_LABELS: Record<ProjectType, string> = {
  nodejs: 'Node.js',
  python: 'Python',
  docker: 'Docker',
  go: 'Go',
};

function generateGitHubActions(project: ProjectType, branchName: string, deployTarget: string): string {
  const branch = branchName || 'main';

  const nodeConfig = `name: CI/CD Pipeline

on:
  push:
    branches: [ ${branch} ]
  pull_request:
    branches: [ ${branch} ]

env:
  NODE_ENV: production

jobs:
  test:
    name: Test
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint --if-present

      - name: Run tests
        run: npm test

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: test
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build
          path: dist/
          retention-days: 1
${deployTarget ? `
  deploy:
    name: Deploy
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/${branch}' && github.event_name == 'push'
    environment: production
    steps:
      - name: Download build artifacts
        uses: actions/download-artifact@v4
        with:
          name: build
          path: dist/

      - name: Deploy to ${deployTarget}
        run: echo "Deploy to ${deployTarget} — configure your deploy step here"
` : ''}`;

  const pythonConfig = `name: CI/CD Pipeline

on:
  push:
    branches: [ ${branch} ]
  pull_request:
    branches: [ ${branch} ]

jobs:
  test:
    name: Test
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ['3.11', '3.12']
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Python \${{ matrix.python-version }}
        uses: actions/setup-python@v5
        with:
          python-version: \${{ matrix.python-version }}
          cache: 'pip'

      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt
          pip install pytest pytest-cov flake8

      - name: Run linter
        run: flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics

      - name: Run tests
        run: pytest --cov=. --cov-report=xml

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/${branch}'
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'
          cache: 'pip'

      - name: Install dependencies
        run: pip install -r requirements.txt
${deployTarget ? `
  deploy:
    name: Deploy
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/${branch}' && github.event_name == 'push'
    environment: production
    steps:
      - name: Deploy to ${deployTarget}
        run: echo "Deploy to ${deployTarget} — configure your deploy step here"
` : ''}`;

  const dockerConfig = `name: CI/CD Pipeline

on:
  push:
    branches: [ ${branch} ]
    tags: [ 'v*' ]
  pull_request:
    branches: [ ${branch} ]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: \${{ github.repository }}

jobs:
  test:
    name: Build & Test
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build test image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: false
          target: test
          cache-from: type=gha
          cache-to: type=gha,mode=max
          tags: \${{ env.IMAGE_NAME }}:test

  build-and-push:
    name: Build & Push
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/${branch}' || startsWith(github.ref, 'refs/tags/')
    permissions:
      contents: read
      packages: write
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: \${{ env.REGISTRY }}
          username: \${{ github.actor }}
          password: \${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: \${{ env.REGISTRY }}/\${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=sha,prefix=sha-

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: \${{ steps.meta.outputs.tags }}
          labels: \${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
${deployTarget ? `
  deploy:
    name: Deploy
    runs-on: ubuntu-latest
    needs: build-and-push
    if: github.ref == 'refs/heads/${branch}'
    environment: production
    steps:
      - name: Deploy to ${deployTarget}
        run: echo "Deploy image to ${deployTarget} — configure your deploy step here"
` : ''}`;

  const goConfig = `name: CI/CD Pipeline

on:
  push:
    branches: [ ${branch} ]
  pull_request:
    branches: [ ${branch} ]

jobs:
  test:
    name: Test
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Go
        uses: actions/setup-go@v5
        with:
          go-version: '1.22'
          cache: true

      - name: Run vet
        run: go vet ./...

      - name: Run tests
        run: go test -race -coverprofile=coverage.out ./...

      - name: Check coverage
        run: go tool cover -func=coverage.out

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: test
    strategy:
      matrix:
        goos: [linux, darwin, windows]
        goarch: [amd64, arm64]
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Go
        uses: actions/setup-go@v5
        with:
          go-version: '1.22'
          cache: true

      - name: Build
        run: |
          GOOS=\${{ matrix.goos }} GOARCH=\${{ matrix.goarch }} go build -v -o dist/app-\${{ matrix.goos }}-\${{ matrix.goarch }} ./...

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: binary-\${{ matrix.goos }}-\${{ matrix.goarch }}
          path: dist/
${deployTarget ? `
  deploy:
    name: Deploy
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/${branch}' && github.event_name == 'push'
    environment: production
    steps:
      - name: Deploy to ${deployTarget}
        run: echo "Deploy to ${deployTarget} — configure your deploy step here"
` : ''}`;

  switch (project) {
    case 'nodejs': return nodeConfig;
    case 'python': return pythonConfig;
    case 'docker': return dockerConfig;
    case 'go': return goConfig;
  }
}

function generateGitLabCI(project: ProjectType, branchName: string, deployTarget: string): string {
  const branch = branchName || 'main';

  const nodeConfig = `stages:
  - test
  - build
  - deploy

variables:
  NODE_ENV: production

cache:
  key:
    files:
      - package-lock.json
  paths:
    - node_modules/

test:
  stage: test
  image: node:20-alpine
  script:
    - npm ci
    - npm run lint --if-present
    - npm test
  coverage: '/Lines\\s*:\\s*(\\d+\\.?\\d*)%/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml

build:
  stage: build
  image: node:20-alpine
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - dist/
    expire_in: 1 day
  only:
    - ${branch}
${deployTarget ? `
deploy_production:
  stage: deploy
  image: alpine:latest
  script:
    - echo "Deploy to ${deployTarget} — configure your deploy step here"
  environment:
    name: production
  only:
    - ${branch}
  when: manual
` : ''}`;

  const pythonConfig = `stages:
  - test
  - build
  - deploy

variables:
  PIP_CACHE_DIR: "\$CI_PROJECT_DIR/.cache/pip"

cache:
  paths:
    - .cache/pip

test:
  stage: test
  image: python:3.12-slim
  before_script:
    - pip install -r requirements.txt
    - pip install pytest pytest-cov flake8
  script:
    - flake8 . --count --select=E9,F63,F7,F82 --show-source
    - pytest --cov=. --cov-report=xml
  coverage: '/TOTAL.+?(\\d+%)/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage.xml

build:
  stage: build
  image: python:3.12-slim
  script:
    - pip install build
    - python -m build
  artifacts:
    paths:
      - dist/
    expire_in: 1 day
  only:
    - ${branch}
${deployTarget ? `
deploy_production:
  stage: deploy
  script:
    - echo "Deploy to ${deployTarget} — configure your deploy step here"
  environment:
    name: production
  only:
    - ${branch}
  when: manual
` : ''}`;

  const dockerConfig = `stages:
  - build
  - test
  - push
  - deploy

variables:
  DOCKER_TLS_CERTDIR: "/certs"
  IMAGE_TAG: \$CI_REGISTRY_IMAGE:\$CI_COMMIT_SHA

build_image:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  before_script:
    - docker login -u \$CI_REGISTRY_USER -p \$CI_REGISTRY_PASSWORD \$CI_REGISTRY
  script:
    - docker build -t \$IMAGE_TAG .
    - docker push \$IMAGE_TAG

test_image:
  stage: test
  image: docker:24
  services:
    - docker:24-dind
  script:
    - docker pull \$IMAGE_TAG
    - docker run --rm \$IMAGE_TAG sh -c "echo 'Container health check passed'"

push_latest:
  stage: push
  image: docker:24
  services:
    - docker:24-dind
  before_script:
    - docker login -u \$CI_REGISTRY_USER -p \$CI_REGISTRY_PASSWORD \$CI_REGISTRY
  script:
    - docker pull \$IMAGE_TAG
    - docker tag \$IMAGE_TAG \$CI_REGISTRY_IMAGE:latest
    - docker push \$CI_REGISTRY_IMAGE:latest
  only:
    - ${branch}
${deployTarget ? `
deploy_production:
  stage: deploy
  script:
    - echo "Deploy \$IMAGE_TAG to ${deployTarget} — configure your deploy step here"
  environment:
    name: production
  only:
    - ${branch}
  when: manual
` : ''}`;

  const goConfig = `stages:
  - test
  - build
  - deploy

variables:
  GOPATH: \$CI_PROJECT_DIR/.go
  GOCACHE: \$CI_PROJECT_DIR/.go/cache

cache:
  paths:
    - .go/pkg/mod/
    - .go/cache/

test:
  stage: test
  image: golang:1.22
  script:
    - go vet ./...
    - go test -race -coverprofile=coverage.out ./...
    - go tool cover -func=coverage.out
  coverage: '/total:\\s+(\\d+\\.\\d+)%/'

build:
  stage: build
  image: golang:1.22
  script:
    - CGO_ENABLED=0 GOOS=linux go build -v -o dist/app ./...
  artifacts:
    paths:
      - dist/
    expire_in: 1 day
  only:
    - ${branch}
${deployTarget ? `
deploy_production:
  stage: deploy
  script:
    - echo "Deploy to ${deployTarget} — configure your deploy step here"
  environment:
    name: production
  only:
    - ${branch}
  when: manual
` : ''}`;

  switch (project) {
    case 'nodejs': return nodeConfig;
    case 'python': return pythonConfig;
    case 'docker': return dockerConfig;
    case 'go': return goConfig;
  }
}

function generateCircleCI(project: ProjectType, branchName: string, deployTarget: string): string {
  const branch = branchName || 'main';

  const nodeConfig = `version: 2.1

orbs:
  node: circleci/node@5

jobs:
  test:
    docker:
      - image: cimg/node:20.0
    steps:
      - checkout
      - node/install-packages:
          pkg-manager: npm
      - run:
          name: Run linter
          command: npm run lint --if-present
      - run:
          name: Run tests
          command: npm test
      - store_test_results:
          path: test-results

  build:
    docker:
      - image: cimg/node:20.0
    steps:
      - checkout
      - node/install-packages:
          pkg-manager: npm
      - run:
          name: Build
          command: npm run build
      - persist_to_workspace:
          root: .
          paths:
            - dist
${deployTarget ? `
  deploy:
    docker:
      - image: cimg/base:stable
    steps:
      - attach_workspace:
          at: .
      - run:
          name: Deploy to ${deployTarget}
          command: echo "Deploy to ${deployTarget} — configure your deploy step here"
` : ''}
workflows:
  ci-cd:
    jobs:
      - test
      - build:
          requires:
            - test
          filters:
            branches:
              only: ${branch}
${deployTarget ? `      - deploy:
          requires:
            - build
          filters:
            branches:
              only: ${branch}
` : ''}`;

  const pythonConfig = `version: 2.1

orbs:
  python: circleci/python@2

jobs:
  test:
    docker:
      - image: cimg/python:3.12
    steps:
      - checkout
      - python/install-packages:
          pkg-manager: pip
          pip-dependency-file: requirements.txt
      - run:
          name: Install test deps
          command: pip install pytest pytest-cov flake8
      - run:
          name: Run linter
          command: flake8 . --count --select=E9,F63,F7,F82
      - run:
          name: Run tests
          command: pytest --cov=. --cov-report=xml
      - store_test_results:
          path: test-results

  build:
    docker:
      - image: cimg/python:3.12
    steps:
      - checkout
      - python/install-packages:
          pkg-manager: pip
      - run:
          name: Build package
          command: pip install build && python -m build
      - persist_to_workspace:
          root: .
          paths:
            - dist
${deployTarget ? `
  deploy:
    docker:
      - image: cimg/base:stable
    steps:
      - attach_workspace:
          at: .
      - run:
          name: Deploy to ${deployTarget}
          command: echo "Deploy to ${deployTarget} — configure your deploy step here"
` : ''}
workflows:
  ci-cd:
    jobs:
      - test
      - build:
          requires:
            - test
          filters:
            branches:
              only: ${branch}
${deployTarget ? `      - deploy:
          requires:
            - build
          filters:
            branches:
              only: ${branch}
` : ''}`;

  const dockerConfig = `version: 2.1

jobs:
  build-and-push:
    docker:
      - image: cimg/base:stable
    steps:
      - checkout
      - setup_remote_docker:
          docker_layer_caching: true
      - run:
          name: Build Docker image
          command: |
            docker build -t \$DOCKER_IMAGE:\$CIRCLE_SHA1 .
      - run:
          name: Run container smoke test
          command: |
            docker run --rm \$DOCKER_IMAGE:\$CIRCLE_SHA1 sh -c "echo 'Health check passed'"
      - run:
          name: Push to registry
          command: |
            echo "\$DOCKER_PASSWORD" | docker login -u "\$DOCKER_USERNAME" --password-stdin
            docker push \$DOCKER_IMAGE:\$CIRCLE_SHA1
            docker tag \$DOCKER_IMAGE:\$CIRCLE_SHA1 \$DOCKER_IMAGE:latest
            docker push \$DOCKER_IMAGE:latest
${deployTarget ? `
  deploy:
    docker:
      - image: cimg/base:stable
    steps:
      - run:
          name: Deploy to ${deployTarget}
          command: echo "Deploy \$DOCKER_IMAGE:\$CIRCLE_SHA1 to ${deployTarget}"
` : ''}
workflows:
  ci-cd:
    jobs:
      - build-and-push:
          filters:
            branches:
              only: ${branch}
${deployTarget ? `      - deploy:
          requires:
            - build-and-push
          filters:
            branches:
              only: ${branch}
` : ''}`;

  const goConfig = `version: 2.1

jobs:
  test:
    docker:
      - image: cimg/go:1.22
    steps:
      - checkout
      - restore_cache:
          keys:
            - go-mod-v1-{{ checksum "go.sum" }}
      - run:
          name: Download dependencies
          command: go mod download
      - save_cache:
          key: go-mod-v1-{{ checksum "go.sum" }}
          paths:
            - /home/circleci/go/pkg/mod
      - run:
          name: Run vet
          command: go vet ./...
      - run:
          name: Run tests
          command: go test -race -coverprofile=coverage.out ./...

  build:
    docker:
      - image: cimg/go:1.22
    steps:
      - checkout
      - restore_cache:
          keys:
            - go-mod-v1-{{ checksum "go.sum" }}
      - run:
          name: Build binary
          command: CGO_ENABLED=0 GOOS=linux go build -v -o dist/app ./...
      - persist_to_workspace:
          root: .
          paths:
            - dist
${deployTarget ? `
  deploy:
    docker:
      - image: cimg/base:stable
    steps:
      - attach_workspace:
          at: .
      - run:
          name: Deploy to ${deployTarget}
          command: echo "Deploy to ${deployTarget} — configure your deploy step here"
` : ''}
workflows:
  ci-cd:
    jobs:
      - test
      - build:
          requires:
            - test
          filters:
            branches:
              only: ${branch}
${deployTarget ? `      - deploy:
          requires:
            - build
          filters:
            branches:
              only: ${branch}
` : ''}`;

  switch (project) {
    case 'nodejs': return nodeConfig;
    case 'python': return pythonConfig;
    case 'docker': return dockerConfig;
    case 'go': return goConfig;
  }
}

function generatePipeline(platform: Platform, project: ProjectType, branchName: string, deployTarget: string): string {
  switch (platform) {
    case 'github-actions': return generateGitHubActions(project, branchName, deployTarget);
    case 'gitlab-ci': return generateGitLabCI(project, branchName, deployTarget);
    case 'circleci': return generateCircleCI(project, branchName, deployTarget);
  }
}

export default function CiCdPipelineGenerator() {
  const [platform, setPlatform] = useState<Platform>('github-actions');
  const [projectType, setProjectType] = useState<ProjectType>('nodejs');
  const [branchName, setBranchName] = useState('main');
  const [deployTarget, setDeployTarget] = useState('');
  const [copied, setCopied] = useState(false);

  const output = generatePipeline(platform, projectType, branchName, deployTarget);

  const fileName =
    platform === 'github-actions' ? '.github/workflows/ci.yml' :
    platform === 'gitlab-ci' ? '.gitlab-ci.yml' :
    '.circleci/config.yml';

  const handleCopy = () => {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div class="space-y-6">
      {/* Controls */}
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium mb-1">CI/CD Platform</label>
          <div class="flex flex-wrap gap-2">
            {(Object.keys(PLATFORM_LABELS) as Platform[]).map((p) => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                class={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  platform === p
                    ? 'bg-accent text-white'
                    : 'bg-surface border border-border hover:border-accent'
                }`}
              >
                {PLATFORM_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Project Type</label>
          <div class="flex flex-wrap gap-2">
            {(Object.keys(PROJECT_LABELS) as ProjectType[]).map((p) => (
              <button
                key={p}
                onClick={() => setProjectType(p)}
                class={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  projectType === p
                    ? 'bg-accent text-white'
                    : 'bg-surface border border-border hover:border-accent'
                }`}
              >
                {PROJECT_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Main Branch Name</label>
          <input
            type="text"
            value={branchName}
            onInput={(e) => setBranchName((e.target as HTMLInputElement).value)}
            placeholder="main"
            class="w-full px-3 py-2 rounded border border-border bg-surface text-sm focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Deploy Target <span class="text-text-muted font-normal">(optional)</span></label>
          <input
            type="text"
            value={deployTarget}
            onInput={(e) => setDeployTarget((e.target as HTMLInputElement).value)}
            placeholder="e.g. Fly.io, AWS, Vercel, Render"
            class="w-full px-3 py-2 rounded border border-border bg-surface text-sm focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
      </div>

      {/* Output */}
      <div class="relative">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs text-text-muted font-mono">{fileName}</span>
          <button
            onClick={handleCopy}
            class="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm bg-surface border border-border hover:border-accent transition-colors"
          >
            {copied ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                  <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                </svg>
                Copy
              </>
            )}
          </button>
        </div>
        <pre class="bg-[#1e1e2e] text-[#cdd6f4] text-xs rounded-lg p-4 overflow-auto max-h-[520px] leading-relaxed whitespace-pre font-mono border border-border">
          {output}
        </pre>
      </div>

      <p class="text-xs text-text-muted">
        Generated for <strong>{PLATFORM_LABELS[platform]}</strong> · <strong>{PROJECT_LABELS[projectType]}</strong> project.
        {deployTarget && ` Deploy stage targets ${deployTarget}.`}
        {' '}Review and customize before committing to your repository.
      </p>
    </div>
  );
}
