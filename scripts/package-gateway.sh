#!/usr/bin/env bash
# Rebuild the downloadable LightOS gateway bundle served from the website.
# Run after any change under gateway/.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p public/downloads
tar --exclude='tests' --exclude='__pycache__' --exclude='.env' --exclude='.env.nim' \
  --sort=name --owner=0 --group=0 --mtime='2026-01-01' \
  -czf public/downloads/lightos-gateway.tar.gz gateway
( cd public/downloads && sha256sum lightos-gateway.tar.gz > lightos-gateway.tar.gz.sha256 )
cat public/downloads/lightos-gateway.tar.gz.sha256
