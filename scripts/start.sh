#!/usr/bin/env bash
set -euo pipefail
trap 'echo "" ; echo " [ERROR] Script failed at line $LINENO. See errors above." ; exit 1' ERR

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR/.."

echo ""
echo " ================================================"
echo "  Yazıcı — AI Study Coach"
echo " ================================================"
echo ""

# ── Detect package manager ────────────────────────────────────────────────────
detect_pkg_manager() {
  if   command -v apt-get      &>/dev/null; then echo "apt"
  elif command -v dnf          &>/dev/null; then echo "dnf"
  elif command -v yum          &>/dev/null; then echo "yum"
  elif command -v zypper       &>/dev/null; then echo "zypper"
  elif command -v pacman       &>/dev/null; then echo "pacman"
  elif command -v paru         &>/dev/null; then echo "paru"
  elif command -v yay          &>/dev/null; then echo "yay"
  elif command -v emerge       &>/dev/null; then echo "emerge"
  elif command -v apk          &>/dev/null; then echo "apk"
  elif command -v xbps-install &>/dev/null; then echo "xbps"
  elif command -v brew         &>/dev/null; then echo "brew"
  elif command -v nix-env      &>/dev/null; then echo "nix"
  else echo "unknown"
  fi
}

# ── Install Node.js via the right package manager ────────────────────────────
install_node() {
  local pm
  pm="$(detect_pkg_manager)"
  echo " [INFO] Detected package manager: $pm"
  echo " [INFO] Attempting to install Node.js automatically..."

  case "$pm" in
    apt)
      if command -v curl &>/dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - \
          && sudo apt-get install -y nodejs
      else
        sudo apt-get update -qq
        sudo apt-get install -y nodejs npm
      fi
      ;;
    dnf)
      if sudo dnf module list nodejs &>/dev/null 2>&1; then
        sudo dnf module install -y nodejs:lts/common 2>/dev/null \
          || sudo dnf install -y nodejs npm
      else
        sudo dnf install -y nodejs npm
      fi
      ;;
    yum)
      if command -v curl &>/dev/null; then
        curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
      fi
      sudo yum install -y nodejs npm
      ;;
    zypper)  sudo zypper install -y nodejs npm ;;
    pacman)  sudo pacman -Sy --noconfirm nodejs npm ;;
    paru|yay) $pm -Sy --noconfirm nodejs npm ;;
    emerge)  sudo emerge --ask=n net-libs/nodejs ;;
    apk)     sudo apk add --no-cache nodejs npm ;;
    xbps)    sudo xbps-install -Sy nodejs ;;
    brew)    brew install node ;;
    nix)     nix-env -iA nixpkgs.nodejs ;;
    *)
      echo ""
      echo " [ERROR] Could not detect your package manager."
      echo " Please install Node.js manually: https://nodejs.org  (LTS version)"
      echo ""
      exit 1
      ;;
  esac
}

# ── Install native build tools (needed for better-sqlite3) ───────────────────
install_build_tools() {
  local pm
  pm="$(detect_pkg_manager)"
  echo " [INFO] Installing build tools (python3, make, g++) for native modules..."

  case "$pm" in
    apt)
      sudo apt-get install -y python3 make g++ || true
      ;;
    dnf)
      sudo dnf install -y python3 make gcc-c++ || true
      ;;
    yum)
      sudo yum install -y python3 make gcc-c++ || true
      ;;
    zypper)
      sudo zypper install -y python3 make gcc-c++ || true
      ;;
    pacman)
      sudo pacman -Sy --noconfirm python make gcc || true
      ;;
    paru|yay)
      $pm -Sy --noconfirm python make gcc || true
      ;;
    emerge)
      sudo emerge --ask=n dev-lang/python sys-devel/make sys-devel/gcc || true
      ;;
    apk)
      sudo apk add --no-cache python3 make g++ || true
      ;;
    xbps)
      sudo xbps-install -Sy python3 make gcc || true
      ;;
    brew)
      # macOS has clang via Xcode CLT; python3 may need installing
      command -v python3 &>/dev/null || brew install python3 || true
      ;;
    nix)
      nix-env -iA nixpkgs.python3 nixpkgs.gnumake nixpkgs.gcc || true
      ;;
    *)
      echo " [WARN] Cannot install build tools automatically."
      echo "        If install fails, install python3, make, and g++ manually."
      ;;
  esac
}

# ── Check / install Node.js ───────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  echo " [WARN] Node.js is not installed."
  echo " Trying to install it (you may be prompted for your password)..."
  install_node

  if ! command -v node &>/dev/null; then
    echo ""
    echo " [ERROR] Node.js installation failed or node is not in PATH."
    echo " Please install it manually: https://nodejs.org  (LTS version)"
    echo ""
    exit 1
  fi
fi

NODE_VER=$(node -v)
NODE_MAJOR=$(echo "$NODE_VER" | sed 's/v\([0-9]*\).*/\1/')

if [ "$NODE_MAJOR" -lt 18 ]; then
  echo ""
  echo " [ERROR] Node.js $NODE_VER is too old. Version 18 or higher is required."
  echo " Update from: https://nodejs.org  (LTS version)"
  echo ""
  exit 1
fi

echo " Node.js $NODE_VER found."

# ── npm sanity check ──────────────────────────────────────────────────────────
if ! command -v npm &>/dev/null; then
  echo " [WARN] npm not found. Trying to install it..."
  pm="$(detect_pkg_manager)"
  case "$pm" in
    apt)     sudo apt-get install -y npm ;;
    dnf)     sudo dnf install -y npm ;;
    yum)     sudo yum install -y npm ;;
    zypper)  sudo zypper install -y npm ;;
    pacman)  sudo pacman -Sy --noconfirm npm ;;
    paru|yay) $pm -Sy --noconfirm npm ;;
    apk)     sudo apk add --no-cache npm ;;
    xbps)    sudo xbps-install -Sy npm ;;
    *)
      echo " [ERROR] Cannot install npm automatically. Please install it manually."
      exit 1
      ;;
  esac
fi

# ── Check for native build tools (better-sqlite3 needs them) ─────────────────
MISSING_BUILD_TOOLS=0
command -v python3 &>/dev/null || MISSING_BUILD_TOOLS=1
command -v make    &>/dev/null || MISSING_BUILD_TOOLS=1
# check for any C++ compiler
{ command -v g++ || command -v c++ || command -v clang++; } &>/dev/null \
  || MISSING_BUILD_TOOLS=1

if [ "$MISSING_BUILD_TOOLS" -eq 1 ]; then
  echo ""
  echo " [INFO] Build tools (python3/make/g++) not found."
  echo "        These are required to compile the SQLite native module."
  install_build_tools
fi

# ── Create data directory ─────────────────────────────────────────────────────
mkdir -p "$ROOT/data"

# ── Install dependencies ──────────────────────────────────────────────────────
npm_install() {
  local prefix="$1"
  local label="$2"
  echo ""
  echo " Installing $label dependencies (first run only)..."
  if npm install --prefix "$prefix"; then
    return 0
  fi
  echo " [WARN] Install failed, retrying with --legacy-peer-deps..."
  if npm install --prefix "$prefix" --legacy-peer-deps; then
    return 0
  fi
  echo ""
  echo " [ERROR] $label dependency install failed. See errors above."
  exit 1
}

if [ ! -d "$ROOT/server/node_modules" ]; then
  npm_install "$ROOT/server" "server"
fi

if [ ! -d "$ROOT/client/node_modules" ]; then
  npm_install "$ROOT/client" "client"
fi

# ── Build server ──────────────────────────────────────────────────────────────
echo ""
echo " Building server..."
if ! npm run build --prefix "$ROOT/server"; then
  echo ""
  echo " [ERROR] Server build failed. See errors above."
  exit 1
fi

# ── Build client ──────────────────────────────────────────────────────────────
echo ""
echo " Building client..."
if ! npm run build --prefix "$ROOT/client"; then
  echo ""
  echo " [ERROR] Client build failed. See errors above."
  exit 1
fi

echo ""
echo " Starting Yazıcı..."
echo ""

cd "$ROOT"

export PORT=3001
export DB_PATH="data/Yazıcı.db"
export CLIENT_DIST="client/dist"

# ── Kill any zombie process on port 3001 ──────────────────────────────────────
if command -v lsof &>/dev/null; then
  STALE_PID=$(lsof -ti :3001 2>/dev/null || true)
  if [ -n "$STALE_PID" ]; then
    echo " [INFO] Killing stale process on port 3001 (PID: $STALE_PID)..."
    kill -9 $STALE_PID 2>/dev/null || true
    sleep 1
  fi
fi

# ── Open browser (handles all DEs / distros / macOS) ─────────────────────────
open_browser() {
  local url="$1"
  # Hardened flags to avoid GPU crashes and GCM (deprecated endpoint) errors
  local flags="--disable-gpu --no-sandbox --disable-software-rasterizer --disable-dev-shm-usage --disable-extensions --mute-audio --no-first-run --no-default-browser-check --disable-background-networking --disable-sync --disable-default-apps --disable-component-update --disable-client-side-phishing-detection --disable-domain-reliability --no-pings"
  
  if   command -v xdg-open        &>/dev/null; then xdg-open        "$url"
  elif command -v gio              &>/dev/null; then gio open        "$url"
  elif command -v gnome-open       &>/dev/null; then gnome-open      "$url"
  elif command -v kde-open5        &>/dev/null; then kde-open5       "$url"
  elif command -v kde-open         &>/dev/null; then kde-open        "$url"
  elif command -v exo-open         &>/dev/null; then exo-open        "$url"
  elif command -v pcmanfm          &>/dev/null; then pcmanfm         "$url"
  elif command -v open             &>/dev/null; then open            "$url"
  elif command -v google-chrome    &>/dev/null; then google-chrome   $flags "$url" &
  elif command -v chromium         &>/dev/null; then chromium        $flags "$url" &
  elif command -v chromium-browser &>/dev/null; then chromium-browser $flags "$url" &
  elif command -v firefox          &>/dev/null; then firefox         --disable-gpu --no-sandbox "$url" &
  elif command -v microsoft-edge   &>/dev/null; then microsoft-edge  $flags "$url" &
  elif command -v brave-browser    &>/dev/null; then brave-browser   $flags "$url" &
  elif command -v flatpak          &>/dev/null; then
    flatpak run org.mozilla.firefox "$url" 2>/dev/null \
      || flatpak run com.google.Chrome "$url" 2>/dev/null \
      || echo " [INFO] Could not open browser automatically. Go to: $url"
  else
    echo " [INFO] Could not detect a browser opener. Please open manually: $url"
  fi
}

(sleep 2 && open_browser "http://localhost:3001") &

echo " ================================================"
echo "  Running at: http://localhost:3001"
echo "  Press Ctrl+C to stop."
echo " ================================================"
echo ""

node server/dist/index.mjs | npx pino-pretty
