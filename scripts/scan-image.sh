#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo 'Uso: bash scripts/scan-image.sh imagem:tag-ou-digest' >&2
  exit 2
fi

scan_cache_dir="${TRIVY_CACHE_DIR:-${RUNNER_TEMP:-/tmp}/natal-trivy-cache}"
mkdir -p "$scan_cache_dir"

# Versão e digest oficiais fixados; a base de vulnerabilidades é atualizada pelo Trivy.
# As credenciais são opcionais e servem para ler imagens privadas após a publicação.
docker run --rm \
  --volume /var/run/docker.sock:/var/run/docker.sock:ro \
  --volume "$scan_cache_dir:/tmp/trivy-cache" \
  --env TRIVY_USERNAME --env TRIVY_PASSWORD \
  aquasec/trivy:0.76.2@sha256:8f6bb947dbc528902e11f2f5be52f7b519f6a39d5d148f41166f2040499768fb \
  image --cache-dir /tmp/trivy-cache --scanners vuln --no-progress \
  --severity UNKNOWN,LOW,MEDIUM,HIGH,CRITICAL --exit-code 1 "$1"
