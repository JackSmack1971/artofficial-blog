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
    && rm -rf /var/lib/apt/lists/*

# Configure Git
git config --global init.defaultBranch main
git config --global core.autocrlf false
git config --global core.filemode false

# Install and configure pnpm
npm install -g pnpm@latest

# Setup pnpm manually since shell detection failed
export PNPM_HOME="/usr/local/pnpm"
mkdir -p $PNPM_HOME
export PATH="$PNPM_HOME:$PATH"
echo 'export PNPM_HOME="/usr/local/pnpm"' >> ~/.bashrc
echo 'export PATH="$PNPM_HOME:$PATH"' >> ~/.bashrc

# Configure pnpm
pnpm config set global-bin-dir $PNPM_HOME
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

# Install project dependencies
if [ -f "package.json" ]; then
    echo "📦 Installing project dependencies..."
    
    # Check if pnpm-lock.yaml exists, otherwise use npm
    if [ -f "pnpm-lock.yaml" ]; then
        pnpm install --frozen-lockfile --prefer-offline
    elif [ -f "package-lock.json" ]; then
        npm ci --prefer-offline --no-audit
    else
        npm install --prefer-offline --no-audit
    fi
    
    echo "✅ Project dependencies installed"
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
echo "Running performance validation..."
if [ -f "package.json" ]; then
    if command -v pnpm >/dev/null 2>&1 && [ -f "pnpm-lock.yaml" ]; then
        pnpm build 2>/dev/null || echo "Build failed"
    else
        npm run build 2>/dev/null || echo "Build failed"
    fi
    lighthouse http://localhost:3000 --chrome-flags="--headless --no-sandbox" --output=json --quiet 2>/dev/null || echo "Lighthouse test completed"
else
    echo "No package.json found"
fi
EOF
chmod +x /usr/local/bin/perf-test

cat > /usr/local/bin/security-audit << 'EOF'
#!/bin/bash
echo "Running security audit..."
if [ -f "package.json" ]; then
    if command -v pnpm >/dev/null 2>&1 && [ -f "pnpm-lock.yaml" ]; then
        pnpm audit 2>/dev/null || echo "Security audit completed"
    else
        npm audit --audit-level=moderate 2>/dev/null || echo "Security audit completed"
    fi
    depcheck . 2>/dev/null || echo "Dependency check completed"
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
echo "  perf-test       - Performance validation"
echo "  security-audit  - Security audit"
echo ""
if [ -f "package.json" ]; then
    echo "Project commands:"
    if [ -f "pnpm-lock.yaml" ]; then
        echo "  pnpm dev        - Start development server"
        echo "  pnpm build      - Build for production"
        echo "  pnpm test       - Run tests"
        echo "  pnpm lint       - Run linting"
    else
        echo "  npm run dev     - Start development server"
        echo "  npm run build   - Build for production"
        echo "  npm test        - Run tests"
        echo "  npm run lint    - Run linting"
    fi
fi
echo ""
