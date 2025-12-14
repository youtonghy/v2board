#!/bin/bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export SKIP_GIT_SYNC=1

exec "${script_dir}/update.sh" --no-git "$@"

