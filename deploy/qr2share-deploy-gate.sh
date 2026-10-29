#!/bin/bash
set -euo pipefail
# Install root-owned at /usr/local/sbin/qr2share-deploy-gate.
# The authorized key has a forced command; it cannot open a shell or forward ports.
if [[ ${SSH_ORIGINAL_COMMAND:-} =~ ^deploy\ ([0-9a-f]{40})$ ]]; then
  exec sudo -n /usr/local/sbin/qr2share-deploy "${BASH_REMATCH[1]}"
fi
printf 'Only deploy <40-character commit SHA> is permitted.\n' >&2
exit 64
