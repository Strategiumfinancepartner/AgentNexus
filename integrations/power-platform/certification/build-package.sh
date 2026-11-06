#!/usr/bin/env bash
# Assemble the Microsoft certification package.
# Usage: build-package.sh <connector-solution.zip> <flow-solution.zip>
# Both zips must be untouched exports from Power Apps (Solutions > Export > Unmanaged).
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
work="$(mktemp -d)"
mkdir -p "$work/inner/PkgAssets" "$work/outer"
cp "$1" "$work/inner/PkgAssets/AgentNexusConnector.zip"
cp "$2" "$work/inner/PkgAssets/AgentNexusFlow.zip"
for z in "$work"/inner/PkgAssets/*.zip; do
  unzip -l "$z" | grep -q customizations.xml || { echo "Not an exported solution: $z"; exit 1; }
done
(cd "$work/inner" && zip -qr "$work/outer/AgentNexus.pdpkg.zip" PkgAssets)
cp "$here/intro.md" "$work/outer/intro.md"
(cd "$work/outer" && zip -q "$here/package.zip" intro.md AgentNexus.pdpkg.zip)
echo "Built $here/package.zip"
