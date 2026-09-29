#!/bin/sh
# Concatenate src/ fragments (in name order) into the single shipped file, then syntax-check the JS.
# OUT=path overrides the output (lets several agents build at once without clobbering games/rue.html).
set -e
cd "$(dirname "$0")"
OUT="${OUT:-games/rue.html}"
mkdir -p "$(dirname "$OUT")"
TMP="$(mktemp -d)"
cat src/* > "$TMP/rue.html"
cat src/*.js > "$TMP/check.mjs"
node --check "$TMP/check.mjs"
mv "$TMP/rue.html" "$OUT"
rm -rf "$TMP"
echo "built $OUT ($(wc -c < "$OUT") bytes)"
