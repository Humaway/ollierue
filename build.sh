#!/bin/sh
# Concatenate src/ fragments (in name order) into the single shipped file, then syntax-check the JS.
set -e
cd "$(dirname "$0")"
mkdir -p games
cat src/* > games/rue.html
cat src/*.js > "${TMPDIR:-/tmp}/rue-check.mjs"
node --check "${TMPDIR:-/tmp}/rue-check.mjs"
echo "built games/rue.html ($(wc -c < games/rue.html) bytes)"
