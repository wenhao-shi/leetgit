#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-run}"
case "$MODE" in
  run|--build-only|--install|--verify|--debug|--logs|--telemetry) ;;
  *) echo "Usage: $0 [--build-only|--install|--verify|--debug|--logs|--telemetry]" >&2; exit 2 ;;
esac

LEETGIT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LEETGIT_BUILD="$LEETGIT_ROOT/build/safari"
LEETGIT_APP="$LEETGIT_BUILD/Build/Products/Debug/LeetGit.app"
cd "$LEETGIT_ROOT"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if [[ "$MODE" != --build-only ]]; then pkill -x LeetGit >/dev/null 2>&1 || true; fi

# Prepare before Xcode resolves resource references on a fresh checkout.
node scripts/prepare-safari.mjs
mkdir -p "$LEETGIT_BUILD"
if ! xcodebuild -project safari/LeetGit/LeetGit.xcodeproj -scheme LeetGit \
  -configuration Debug -derivedDataPath "$LEETGIT_BUILD" \
  CODE_SIGN_IDENTITY=- CODE_SIGN_STYLE=Manual DEVELOPMENT_TEAM= \
  build > "$LEETGIT_BUILD/build.log" 2>&1; then
  tail -n 70 "$LEETGIT_BUILD/build.log" >&2
  exit 1
fi
codesign --verify --deep --strict "$LEETGIT_APP"
echo "Built: $LEETGIT_APP"

if [[ "$MODE" == --install ]]; then
  LEETGIT_INSTALL="$HOME/Applications/LeetGit.app"
  if [[ -e "$LEETGIT_INSTALL" ]]; then
    LEETGIT_EXISTING_ID="$(/usr/libexec/PlistBuddy -c 'Print CFBundleIdentifier' "$LEETGIT_INSTALL/Contents/Info.plist")"
    if [[ "$LEETGIT_EXISTING_ID" != dev.local.leetgit ]]; then
      echo "Refusing to replace a different app at $LEETGIT_INSTALL" >&2
      exit 1
    fi
    rm -rf "$LEETGIT_INSTALL"
  fi
  mkdir -p "$HOME/Applications"
  ditto "$LEETGIT_APP" "$LEETGIT_INSTALL"
  codesign --verify --deep --strict "$LEETGIT_INSTALL"
  # Xcode registers its build product too. Keep Safari pointed at the installed copy.
  /System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -u "$LEETGIT_APP"
  /usr/bin/pluginkit -a "$LEETGIT_INSTALL/Contents/PlugIns/LeetGit Extension.appex"
  LEETGIT_APP="$LEETGIT_INSTALL"
  echo "Installed: $LEETGIT_APP"
fi

case "$MODE" in
  --build-only) ;;
  --debug) lldb -- "$LEETGIT_APP/Contents/MacOS/LeetGit" ;;
  --logs|--telemetry)
    open "$LEETGIT_APP"
    /usr/bin/log stream --info --style compact --predicate 'process == "LeetGit" OR process == "LeetGit Extension"'
    ;;
  --verify)
    open "$LEETGIT_APP"
    sleep 1
    pgrep -x LeetGit >/dev/null
    ;;
  *) open "$LEETGIT_APP" ;;
esac
