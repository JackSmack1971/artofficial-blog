#!/bin/bash
set -e

echo "🚀 Setting up ARTOfficial Intelligence Academy development environment..."

# Fix shell detection
export SHELL=/bin/bash
echo 'export SHELL=/bin/bash' >> ~/.bashrc

# Update system and install essential tools
apt-get update && apt-get install -y \
    curl \
    git \
    jq \
    imagemagick \
    libvips-dev \
    python3-pip \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Configure Git
git config --global init.defaultBranch main
git config --global core.autocrlf false
git config --global core.filemode false

# Install and configure pnpm
npm install -g pnpm@latest

# Setup pnpm manually since shell detection failed
export PNPM_HOME="/usr/local/pnpm"
mkdir -p "$PNPM_HOME"
export PATH="$PNPM_HOME:$PATH"
echo 'export PNPM_HOME="/usr/local/pnpm"' >> ~/.bashrc
echo 'export PATH="$PNPM_HOME:$PATH"' >> ~/.bashrc

# Configure pnpm
pnpm config set global-bin-dir "$PNPM_HOME"
pnpm config set store-dir /tmp/.pnpm-store
pnpm config set cache-dir /tmp/.pnpm-cache

# Install global development tools with CORRECT package names
npm install -g \
    typescript@latest \
    prettier@latest \
    eslint@latest \
    @typescript-eslint/parser@latest \
    @typescript-eslint/eslint-plugin@latest \
    @next/bundle-analyzer@latest \
    lighthouse@latest \
    @lhci/cli@latest \
    npm-check-updates@latest \
    depcheck@latest

# Install Python tools
pip3 install --upgrade pip
pip3 install \
    requests \
    python-dotenv \
    pytest \
    black \
    flake8

# Install Cypress dependencies
apt-get update && apt-get install -y \
    libgtk2.0-0 \
    libgtk-3-0 \
    libgbm-dev \
    libnotify-dev \
    libgconf-2-4 \
    libnss3 \
    libxss1 \
    libasound2 \
    libxtst6 \
    xauth \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

# Configure proxy certificate
if [ -n "$CODEX_PROXY_CERT" ]; then
    echo "📡 Configuring proxy certificate..."
    export NODE_EXTRA_CA_CERTS="$CODEX_PROXY_CERT"
    echo "export NODE_EXTRA_CA_CERTS=\"$CODEX_PROXY_CERT\"" >> ~/.bashrc
    npm config set cafile "$CODEX_PROXY_CERT"
    export REQUESTS_CA_BUNDLE="$CODEX_PROXY_CERT"
    echo "export REQUESTS_CA_BUNDLE=\"$CODEX_PROXY_CERT\"" >> ~/.bashrc
    echo "✅ Proxy certificate configured"
fi

# Parse ADRs for env and targets to guide setup
ADR_FILE="docs/architecture-decisions.json"
if [ -f "$ADR_FILE" ]; then
  echo "🧭 Integrating architecture decisions..."
  # Extract thresholds with jq (fallback defaults if missing)
  export PERF_LIGHTHOUSE_MIN_SCORE="$(jq -r '.fitness_functions[] | select(.name=="Lighthouse Performance") | .threshold // 95' "$ADR_FILE" 2>/dev/null || echo 95)"
  export PERF_LCP_P95_TARGET_MS="$(jq -r '.quality_attributes.performance.lcp_seconds_p95 * 1000' "$ADR_FILE" 2>/dev/null || echo 2000)"
  export PERF_FCP_P95_TARGET_MS="$(jq -r '.quality_attributes.performance.global_fcp_seconds_p95 * 1000' "$ADR_FILE" 2>/dev/null || echo 1500)"
  export PERF_TTI_P95_TARGET_MS="$(jq -r '.quality_attributes.performance.tti_seconds_p95 * 1000' "$ADR_FILE" 2>/dev/null || echo 3000)"
else
  echo "ℹ️ ADR file not found, using defaults."
  export PERF_LIGHTHOUSE_MIN_SCORE="${PERF_LIGHTHOUSE_MIN_SCORE:-95}"
  export PERF_LCP_P95_TARGET_MS="${PERF_LCP_P95_TARGET_MS:-2000}"
  export PERF_FCP_P95_TARGET_MS="${PERF_FCP_P95_TARGET_MS:-1500}"
  export PERF_TTI_P95_TARGET_MS="${PERF_TTI_P95_TARGET_MS:-3000}"
fi

# Install project dependencies
if [ -f "package.json" ]; then
    echo "📦 Installing project dependencies..."
    if [ -f "pnpm-lock.yaml" ] && command -v pnpm >/dev/null 2>&1; then
        pnpm install --frozen-lockfile --prefer-offline
    elif [ -f "package-lock.json" ]; then
        npm ci --prefer-offline --no-audit
    else
        npm install --prefer-offline --no-audit
    fi
    echo "✅ Project dependencies installed"

    # Install Playwright browsers for E2E parity
    if command -v npx >/dev/null 2>&1; then
      echo "🎭 Installing Playwright browsers..."
      npx playwright install --with-deps || true
    fi

    # Setup Husky + lint-staged if repository is git-initialized
    if command -v npx >/dev/null 2>&1; then
      if [ -d ".git" ]; then
        echo "🔧 Configuring Husky pre-commit hooks..."
        npx husky-init --y || true
        # Ensure husky is installed even if package lacks script
        npx husky install || true
        HOOK_FILE=".husky/pre-commit"
        mkdir -p .husky
        cat > "$HOOK_FILE" << 'EOF'
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "🔍 Running pre-commit quality gates..."
if [ -f "pnpm-lock.yaml" ] && command -v pnpm >/dev/null 2>&1; then
  pnpm lint && pnpm type-check && pnpm test -- --coverage --watchAll=false
else
  npm run lint && npm run type-check && npm test -- --coverage --watchAll=false
fi
EOF
        chmod +x "$HOOK_FILE"
      else
        echo "ℹ️ Git repository not initialized, skipping Husky setup."
      fi
    fi
fi

# Setup development environment optimization
echo "⚡ Optimizing development environment..."

# Setup cache directories
mkdir -p /tmp/.eslintcache /tmp/.jestcache
export ESLINT_CACHE_LOCATION="/tmp/.eslintcache"
export JEST_CACHE_DIRECTORY="/tmp/.jestcache"
echo "export ESLINT_CACHE_LOCATION=\"/tmp/.eslintcache\"" >> ~/.bashrc
echo "export JEST_CACHE_DIRECTORY=\"/tmp/.jestcache\"" >> ~/.bashrc

# Create utility scripts
cat > /usr/local/bin/perf-test << 'EOF'
#!/bin/bash
set -e
echo "Running performance validation..."
ADR_FILE="docs/architecture-decisions.json"
MIN_SCORE="${PERF_LIGHTHOUSE_MIN_SCORE:-95}"
if [ -f "$ADR_FILE" ] && command -v jq >/dev/null 2>&1; then
  MIN_SCORE="$(jq -r '.fitness_functions[] | select(.name=="Lighthouse Performance") | .threshold // 95' "$ADR_FILE" 2>/dev/null || echo 95)"
fi

if [ -f "package.json" ]; then
  if command -v pnpm >/dev/null 2>&1 && [ -f "pnpm-lock.yaml" ]; then
    pnpm build 2>/dev/null || echo "Build failed"
  else
    npm run build 2>/dev/null || echo "Build failed"
  fi
  # Start dev server in background if not running
  PORT="${PORT:-3000}"
  if ! nc -z localhost "$PORT" 2>/dev/null; then
    echo "Starting local server on :$PORT for Lighthouse..."
    if [ -f "pnpm-lock.yaml" ] && command -v pnpm >/dev/null 2>&1; then
      pnpm start & SERVER_PID=$!
    else
      npm run start & SERVER_PID=$!
    fi
    # wait for server
    for i in {1..30}; do
      if nc -z localhost "$PORT"; then break; fi
      sleep 1
    done
  fi
  URL="http://localhost:${PORT}"
  REPORT="$(mktemp)"
  lighthouse "$URL" --chrome-flags="--headless --no-sandbox" --output=json --output-path="$REPORT" --quiet 2>/dev/null || true
  SCORE=$(jq -r '.categories.performance.score * 100' "$REPORT" 2>/dev/null || echo 0)
  echo "Lighthouse score: $SCORE (min ${MIN_SCORE})"
  if [ "${SCORE%.*}" -lt "${MIN_SCORE%.*}" ]; then
    echo "❌ Performance score below threshold (${SCORE} < ${MIN_SCORE})"
    exit 1
  else
    echo "✅ Performance threshold met"
  fi
  exit 0
else
  echo "No package.json found"
fi
EOF
chmod +x /usr/local/bin/perf-test

cat > /usr/local/bin/security-audit << 'EOF'
#!/bin/bash
set -e
echo "Running security audit..."
if [ -f "package.json" ]; then
  if command -v pnpm >/dev/null 2>&1 && [ -f "pnpm-lock.yaml" ]; then
    pnpm audit --audit-level=moderate || true
  else
    npm audit --audit-level=moderate || true
  fi
  depcheck . || true
  echo "✅ Security audit completed (non-blocking)."
else
  echo "No package.json found"
fi
EOF
chmod +x /usr/local/bin/security-audit

# Validate Ghost API connection
if [ -n "$GHOST_API_URL" ] && [ -n "$GHOST_CONTENT_API_KEY" ]; then
    echo "🔍 Validating Ghost CMS connection..."
    GHOST_TEST_URL="${GHOST_API_URL}/ghost/api/v5/content/posts/?key=${GHOST_CONTENT_API_KEY}&limit=1"
    if curl -s --fail --connect-timeout 10 "$GHOST_TEST_URL" > /dev/null 2>&1; then
        echo "✅ Ghost CMS connection validated"
    else
        echo "⚠️  Warning: Could not connect to Ghost CMS"
    fi
fi

# Final validation
echo "🏁 Environment validation..."
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"
if command -v pnpm >/dev/null 2>&1; then
    echo "pnpm: $(pnpm --version)"
fi
echo "TypeScript: $(tsc --version 2>/dev/null || echo 'not found')"
echo "ESLint: $(eslint --version 2>/dev/null || echo 'not found')"
echo "Lighthouse: $(lighthouse --version 2>/dev/null || echo 'not found')"

echo ""
echo "🎉 Environment setup complete!"
echo ""
echo "Available commands:"
echo "  perf-test       - Performance validation (enforces ADR Lighthouse threshold)"
echo "  security-audit  - Security audit (npm audit + depcheck)"
echo ""
if [ -f "package.json" ]; then
    echo "Project commands:"
    if [ -f "pnpm-lock.yaml" ]; then
        echo "  pnpm dev        - Start development server"
        echo "  pnpm build      - Build for production"
        echo "  pnpm test       - Run tests (coverage enforced in CI)"
        echo "  pnpm lint       - Run linting"
    else
        echo "  npm run dev     - Start development server"
        echo "  npm run build   - Build for production"
        echo "  npm test        - Run tests (coverage enforced in CI)"
        echo "  npm run lint    - Run linting"
    fi
fi
echo ""
