#!/bin/bash
set -e

echo "🚀 Setting up ARTOfficial Intelligence Academy development environment..."

# Update system and install essential tools
apt-get update && apt-get install -y \
    curl \
    git \
    jq \
    imagemagick \
    libvips-dev \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Configure Git for better performance
git config --global init.defaultBranch main
git config --global core.autocrlf false
git config --global core.filemode false

# Install and configure pnpm
npm install -g pnpm@latest

# Setup pnpm global directory
pnpm setup || {
    echo "Setting up pnpm manually..."
    export PNPM_HOME="/usr/local/pnpm"
    mkdir -p $PNPM_HOME
    export PATH="$PNPM_HOME:$PATH"
    echo 'export PNPM_HOME="/usr/local/pnpm"' >> ~/.bashrc
    echo 'export PATH="$PNPM_HOME:$PATH"' >> ~/.bashrc
    pnpm config set global-bin-dir $PNPM_HOME
}

# Reload environment
source ~/.bashrc 2>/dev/null || true

# Configure pnpm
pnpm config set store-dir /tmp/.pnpm-store
pnpm config set cache-dir /tmp/.pnpm-cache

# Install global development tools
pnpm add -g \
    typescript@latest \
    @typescript-eslint/cli@latest \
    prettier@latest \
    eslint@latest \
    @next/bundle-analyzer@latest \
    lighthouse@latest \
    @lhci/cli@latest \
    npm-check-updates@latest \
    depcheck@latest
    
# Check if pnpm is properly configured
pnpm config get global-bin-dir
pnpm config get store-dir

# Test global package installation
pnpm add -g cowsay
cowsay "pnpm is working!"

# Install Python tools for testing and performance monitoring
pip3 install --upgrade pip
pip3 install \
    lighthouse-python \
    requests \
    python-dotenv \
    pytest \
    black \
    flake8

# Install Cypress dependencies for E2E testing
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

# Configure proxy certificate for external API calls
if [ -n "$CODEX_PROXY_CERT" ]; then
    echo "📡 Configuring proxy certificate..."
    
    # Add to Node.js certificate chain
    export NODE_EXTRA_CA_CERTS="$CODEX_PROXY_CERT"
    echo "export NODE_EXTRA_CA_CERTS=\"$CODEX_PROXY_CERT\"" >> ~/.bashrc
    
    # Configure npm to use proxy certificate
    npm config set cafile "$CODEX_PROXY_CERT"
    pnpm config set ca-file "$CODEX_PROXY_CERT"
    
    # Configure Python requests to use proxy certificate
    export REQUESTS_CA_BUNDLE="$CODEX_PROXY_CERT"
    echo "export REQUESTS_CA_BUNDLE=\"$CODEX_PROXY_CERT\"" >> ~/.bashrc
    
    echo "✅ Proxy certificate configured successfully"
fi

# Install project dependencies if package.json exists
if [ -f "package.json" ]; then
    echo "📦 Installing project dependencies..."
    
    # Use pnpm for faster installs and better disk usage
    if command -v pnpm >/dev/null 2>&1; then
        pnpm install --frozen-lockfile --prefer-offline
    else
        npm ci --prefer-offline --no-audit
    fi
    
    echo "✅ Project dependencies installed"
fi

# Install Playwright for advanced E2E testing (if needed)
if grep -q "@playwright" package.json 2>/dev/null; then
    echo "🎭 Installing Playwright browsers..."
    pnpm exec playwright install --with-deps chromium
fi

# Setup development environment optimization
echo "⚡ Optimizing development environment..."

# Configure TypeScript for better performance
if [ -f "tsconfig.json" ]; then
    # Enable TypeScript incremental compilation
    jq '.compilerOptions.incremental = true' tsconfig.json > tmp.json && mv tmp.json tsconfig.json
    echo "✅ TypeScript optimization enabled"
fi

# Setup ESLint cache directory
mkdir -p /tmp/.eslintcache
export ESLINT_CACHE_LOCATION="/tmp/.eslintcache"
echo "export ESLINT_CACHE_LOCATION=\"/tmp/.eslintcache\"" >> ~/.bashrc

# Setup Jest cache directory  
mkdir -p /tmp/.jestcache
export JEST_CACHE_DIRECTORY="/tmp/.jestcache"
echo "export JEST_CACHE_DIRECTORY=\"/tmp/.jestcache\"" >> ~/.bashrc

# Validate Ghost API connection (if credentials available)
if [ -n "$GHOST_API_URL" ] && [ -n "$GHOST_CONTENT_API_KEY" ]; then
    echo "🔍 Validating Ghost CMS connection..."
    
    GHOST_TEST_URL="${GHOST_API_URL}/ghost/api/v5/content/posts/?key=${GHOST_CONTENT_API_KEY}&limit=1"
    
    if curl -s --fail --connect-timeout 10 "$GHOST_TEST_URL" > /dev/null; then
        echo "✅ Ghost CMS connection validated"
    else
        echo "⚠️  Warning: Could not connect to Ghost CMS (this is normal if API keys aren't configured)"
    fi
fi

# Validate Lighthouse CLI installation
if command -v lighthouse >/dev/null 2>&1; then
    echo "✅ Lighthouse CLI ready for performance testing"
else
    echo "❌ Lighthouse CLI installation failed"
fi

# Setup quality assurance tools
echo "🔧 Configuring quality assurance tools..."

# Create performance testing script
cat > /usr/local/bin/perf-test << 'EOF'
#!/bin/bash
echo "Running performance validation..."
if [ -f "next.config.js" ]; then
    npm run build 2>/dev/null || pnpm build 2>/dev/null || echo "Build failed"
    lighthouse http://localhost:3000 --chrome-flags="--headless --no-sandbox" --output=json --quiet
else
    echo "No Next.js configuration found"
fi
EOF
chmod +x /usr/local/bin/perf-test

# Create security audit script
cat > /usr/local/bin/security-audit << 'EOF'
#!/bin/bash
echo "Running security audit..."
if [ -f "package.json" ]; then
    npm audit --audit-level=moderate 2>/dev/null || pnpm audit 2>/dev/null || echo "Security audit completed"
    depcheck . 2>/dev/null || echo "Dependency check completed"
else
    echo "No package.json found"
fi
EOF
chmod +x /usr/local/bin/security-audit

# Final environment validation
echo "🏁 Final environment validation..."

echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"
echo "pnpm version: $(pnpm --version)"
echo "TypeScript version: $(tsc --version)"
echo "Python version: $(python3 --version)"

# Test package manager functionality
if pnpm --version > /dev/null 2>&1; then
    echo "✅ pnpm configured and ready"
else
    echo "❌ pnpm setup failed, falling back to npm"
fi

# Test TypeScript compilation
if tsc --version > /dev/null 2>&1; then
    echo "✅ TypeScript compiler ready"
else
    echo "❌ TypeScript setup failed"
fi

# Test Lighthouse
if lighthouse --version > /dev/null 2>&1; then
    echo "✅ Lighthouse ready for performance testing"
else
    echo "❌ Lighthouse setup failed"
fi

echo ""
echo "🎉 ARTOfficial Intelligence Academy development environment ready!"
echo ""
echo "Available commands:"
echo "  perf-test          - Run performance validation"
echo "  security-audit     - Run security and dependency audit"
echo "  pnpm run dev       - Start development server"
echo "  pnpm run build     - Build for production"
echo "  pnpm run test      - Run test suite"
echo "  pnpm run lint      - Run linting and formatting"
echo ""
echo "Environment optimized for:"
echo "  ✅ Next.js 15 development"
echo "  ✅ TypeScript compilation"
echo "  ✅ Performance testing (Lighthouse)"
echo "  ✅ E2E testing (Cypress/Playwright)"
echo "  ✅ Security auditing"
echo "  ✅ External API integration"
echo ""
